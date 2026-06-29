// Server-side OIDC + PKCE against MuckRock Accounts (Squarelet), reusing the
// pure helpers from @klaxon/lib/oidc. Mirrors the extension's background worker
// flow, but executed in the SvelteKit server (browser JS can't reach Squarelet
// or DocumentCloud directly — those endpoints send no CORS headers).
import type { Cookies } from '@sveltejs/kit';
import {
	buildAuthorizeUrl,
	buildLoginUrl,
	buildSignupUrl,
	decodeJwtPayload,
	endpoints,
	exchangeOidcForJwt,
	getAuthToken,
	getUserInfo,
	hasJwtExpired,
	pkceChallenge,
	randomBase64Url,
	refreshJwt
} from '@klaxon/lib/oidc';
import type { UserInfoResponse } from '@klaxon/lib/types';
import { requireConfig, redirectUri } from './env';
import {
	clearSession,
	writeSession,
	writePkce,
	type PkceState,
	type SessionTokens
} from './session';

/**
 * Sanitize a post-login redirect target. Resolve it against our own origin with
 * the same WHATWG URL parser the browser uses to navigate, then keep it only if
 * it stays on that origin. This rejects absolute URLs and every protocol-
 * relative trick (`//host`, the `/\host` backslash variant, and embedded
 * tab/newline like `/\t/host` that the parser strips back into `//host`) that a
 * naive prefix check would miss — so a crafted `?returnTo=` can't become an
 * open redirect once the authenticated flow completes.
 */
export function safeReturnTo(returnTo: string | null | undefined): string {
	if (!returnTo) return '/';
	const origin = requireConfig().publicOrigin.replace(/\/$/, '');
	try {
		const url = new URL(returnTo, origin);
		if (url.origin !== new URL(origin).origin) return '/';
		return url.pathname + url.search + url.hash;
	} catch {
		return '/';
	}
}

/**
 * Begin sign-in: generate PKCE + state, stash them in a short-lived cookie, and
 * return the URL to redirect the browser to. `action: "create"` opens the
 * signup page first; both resume the same OIDC handshake.
 */
export async function beginLogin(
	cookies: Cookies,
	returnTo: string,
	action: 'login' | 'create' = 'login'
): Promise<string> {
	const { accountsHost, clientId, scopes } = requireConfig();
	const verifier = randomBase64Url(64);
	const challenge = await pkceChallenge(verifier);
	const state = randomBase64Url(32);
	const nonce = randomBase64Url(16);

	const authorizeUrl = buildAuthorizeUrl({
		host: accountsHost,
		clientId,
		scopes,
		redirectUri: redirectUri(),
		state,
		nonce,
		codeChallenge: challenge
	});

	await writePkce(cookies, { state, nonce, verifier, returnTo: safeReturnTo(returnTo) });

	return action === 'create'
		? buildSignupUrl(accountsHost, authorizeUrl)
		: buildLoginUrl(accountsHost, authorizeUrl);
}

/**
 * Complete sign-in from the OAuth callback: exchange the code for OIDC tokens,
 * verify the id token, mint a DocumentCloud JWT, then seal the auth cookie.
 * Returns the userinfo so the caller can hand it to the client (it's stored in
 * localStorage, not the cookie). Throws on any validation failure.
 */
export async function completeLogin(
	cookies: Cookies,
	code: string,
	pkce: PkceState
): Promise<UserInfoResponse> {
	const { accountsHost, clientId } = requireConfig();
	const ep = endpoints(accountsHost);

	const oidc = await getAuthToken(
		ep.token,
		new URLSearchParams({
			intent: 'klaxon-cloud',
			grant_type: 'authorization_code',
			code,
			redirect_uri: redirectUri(),
			client_id: clientId,
			code_verifier: pkce.verifier
		})
	);

	const idPayload = decodeJwtPayload(oidc.id_token);
	if (idPayload.nonce !== pkce.nonce) throw new Error('ID token nonce mismatch');
	if (idPayload.aud !== clientId) throw new Error('ID token audience mismatch');

	// Userinfo and JWT exchange are both gated only on the OIDC access token.
	const [userinfo, jwt] = await Promise.all([
		getUserInfo(ep.userinfo, oidc.access_token),
		exchangeOidcForJwt(ep.jwt, oidc.access_token)
	]);

	await writeSession(cookies, { oidc, jwt });
	return userinfo;
}

/**
 * Refresh an expired session in place. Two tiers, mirroring the extension:
 *   1. Refresh the DocumentCloud JWT directly (cheapest; OIDC token stays put).
 *   2. Fall back to refreshing the OIDC token, then re-mint the JWT.
 * On total failure the session cookie is cleared and null is returned.
 */
async function refreshSession(
	session: SessionTokens,
	cookies: Cookies
): Promise<SessionTokens | null> {
	const { accountsHost, clientId } = requireConfig();
	const ep = endpoints(accountsHost);

	try {
		const jwt = await refreshJwt(ep.jwtRefresh, session.jwt.refresh_token);
		const fresh: SessionTokens = { ...session, jwt };
		await writeSession(cookies, fresh);
		return fresh;
	} catch (err) {
		console.warn('[klaxon] JWT refresh failed:', err);
	}

	try {
		const oidc = await getAuthToken(
			ep.token,
			new URLSearchParams({
				grant_type: 'refresh_token',
				refresh_token: session.oidc.refresh_token,
				client_id: clientId
			})
		);
		const jwt = await exchangeOidcForJwt(ep.jwt, oidc.access_token);
		const fresh: SessionTokens = { oidc, jwt };
		await writeSession(cookies, fresh);
		return fresh;
	} catch (err) {
		console.warn('[klaxon] OIDC refresh failed:', err);
		clearSession(cookies);
		return null;
	}
}

// Dedupe concurrent refreshes within a single isolate so multiple in-flight
// requests share one network round-trip. (Cloudflare spreads load across
// isolates, so this only dedupes locally; that's acceptable — Squarelet rotates
// refresh tokens and the last cookie write wins.)
const refreshes = new Map<string, Promise<SessionTokens | null>>();

/**
 * Return a session whose DocumentCloud JWT is valid, refreshing if needed.
 * Returns null if the session can't be refreshed (the caller is signed out).
 */
export async function ensureFreshSession(
	session: SessionTokens,
	cookies: Cookies
): Promise<SessionTokens | null> {
	if (!hasJwtExpired(session.jwt.access_token)) return session;

	const fkey = session.jwt.refresh_token;
	let inflight = refreshes.get(fkey);
	if (!inflight) {
		inflight = refreshSession(session, cookies).finally(() => refreshes.delete(fkey));
		refreshes.set(fkey, inflight);
	}
	return inflight;
}

/** The Squarelet end-session URL for logging out, with a post-logout redirect home. */
export function logoutUrl(session: SessionTokens | null): string {
	const { accountsHost, publicOrigin } = requireConfig();
	const url = new URL(endpoints(accountsHost).endSession);
	if (session?.oidc.id_token) {
		url.searchParams.set('id_token_hint', session.oidc.id_token);
	}
	url.searchParams.set('post_logout_redirect_uri', publicOrigin.replace(/\/$/, '') + '/');
	return url.toString();
}
