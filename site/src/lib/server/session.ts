// Encrypted, httpOnly session cookies. The session payload (OIDC tokens + the
// DocumentCloud JWT + userinfo) and the short-lived PKCE state are each sealed
// as an encrypted JWE (A256GCM) so nothing sensitive is readable client-side.
import { EncryptJWT, jwtDecrypt } from 'jose';
import { dev } from '$app/environment';
import type { Cookies } from '@sveltejs/kit';
import type { StoredAuth } from '@klaxon/lib/types';
import { sessionSecret } from './env';

// The session cookie stores only authentication material — the OIDC tokens and
// the DocumentCloud JWT. The user's display payload (name/email/avatar) is not
// here; it's kept in localStorage on the client (see lib/user.ts).
export type SessionTokens = Pick<StoredAuth, 'oidc' | 'jwt'>;

const SESSION_COOKIE = 'klaxon_session';
const PKCE_COOKIE = 'klaxon_pkce';

const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days; the inner JWT refreshes silently
const PKCE_MAX_AGE = 60 * 10; // 10 minutes — just long enough to complete sign-in

// Browsers cap a single cookie at ~4 KB. The sealed tokens (several JWTs) can
// approach that, so we split across `klaxon_session.0`, `klaxon_session.1`, …
// and reassemble on read. 3500 leaves headroom for the cookie name + attributes
// within the 4 KB budget.
const CHUNK_SIZE = 3500;

/** Transient state carried from login initiation to the OAuth callback. */
export interface PkceState {
	state: string;
	nonce: string;
	verifier: string;
	returnTo: string;
}

function cookieOptions(maxAge: number) {
	return {
		path: '/',
		httpOnly: true,
		sameSite: 'lax' as const,
		secure: !dev,
		maxAge
	};
}

// Derive a stable 32-byte key from the configured secret, regardless of how the
// secret is encoded (A256GCM needs exactly 256 bits).
async function key(): Promise<Uint8Array> {
	const secret = sessionSecret();
	if (!secret) throw new Error('MUCKROCK_SESSION_SECRET is not configured');
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
	return new Uint8Array(digest);
}

async function seal(payload: Record<string, unknown>, maxAge: number): Promise<string> {
	return new EncryptJWT(payload)
		.setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
		.setIssuedAt()
		.setExpirationTime(`${maxAge}s`)
		.encrypt(await key());
}

async function unseal<T>(token: string): Promise<T | null> {
	try {
		const { payload } = await jwtDecrypt(token, await key());
		return payload as T;
	} catch {
		// Tampered, expired, or sealed with a rotated secret — treat as no value.
		return null;
	}
}

// Split a sealed string across numbered chunk cookies, clearing any stale
// higher-index chunks left over from a previously larger session.
function setChunked(cookies: Cookies, name: string, value: string, maxAge: number): void {
	const options = cookieOptions(maxAge);
	const chunks: string[] = [];
	for (let i = 0; i < value.length; i += CHUNK_SIZE) {
		chunks.push(value.slice(i, i + CHUNK_SIZE));
	}
	for (const { name: cookieName } of chunks.length ? cookies.getAll() : []) {
		const idx = chunkIndex(cookieName, name);
		if (idx !== null && idx >= chunks.length) cookies.delete(cookieName, { path: '/' });
	}
	chunks.forEach((chunk, i) => cookies.set(`${name}.${i}`, chunk, options));
}

// Reassemble a chunked cookie, or null if no chunks are present.
function getChunked(cookies: Cookies, name: string): string | null {
	const parts = cookies
		.getAll()
		.map(({ name: cookieName, value }) => ({ idx: chunkIndex(cookieName, name), value }))
		.filter((p): p is { idx: number; value: string } => p.idx !== null)
		.sort((a, b) => a.idx - b.idx);
	return parts.length ? parts.map((p) => p.value).join('') : null;
}

function deleteChunked(cookies: Cookies, name: string): void {
	for (const { name: cookieName } of cookies.getAll()) {
		if (chunkIndex(cookieName, name) !== null) cookies.delete(cookieName, { path: '/' });
	}
}

// The numeric suffix of a `${name}.N` chunk cookie, or null if it isn't one.
function chunkIndex(cookieName: string, name: string): number | null {
	if (!cookieName.startsWith(`${name}.`)) return null;
	const idx = Number(cookieName.slice(name.length + 1));
	return Number.isInteger(idx) ? idx : null;
}

export async function writeSession(cookies: Cookies, tokens: SessionTokens): Promise<void> {
	const token = await seal({ tokens } as Record<string, unknown>, SESSION_MAX_AGE);
	setChunked(cookies, SESSION_COOKIE, token, SESSION_MAX_AGE);
}

export async function readSession(cookies: Cookies): Promise<SessionTokens | null> {
	if (!sessionSecret()) return null;
	const token = getChunked(cookies, SESSION_COOKIE);
	if (!token) return null;
	const payload = await unseal<{ tokens: SessionTokens }>(token);
	return payload?.tokens ?? null;
}

export function clearSession(cookies: Cookies): void {
	deleteChunked(cookies, SESSION_COOKIE);
}

export async function writePkce(cookies: Cookies, state: PkceState): Promise<void> {
	const token = await seal(state as unknown as Record<string, unknown>, PKCE_MAX_AGE);
	cookies.set(PKCE_COOKIE, token, cookieOptions(PKCE_MAX_AGE));
}

export async function readPkce(cookies: Cookies): Promise<PkceState | null> {
	const token = cookies.get(PKCE_COOKIE);
	if (!token) return null;
	return unseal<PkceState>(token);
}

export function clearPkce(cookies: Cookies): void {
	cookies.delete(PKCE_COOKIE, { path: '/' });
}
