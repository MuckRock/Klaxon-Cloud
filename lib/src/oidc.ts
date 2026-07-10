// Pure OIDC/PKCE/OAuth helpers
import type {
  JwtTokenResponse,
  OidcTokenResponse,
  StoredAuth,
  UserInfoResponse,
} from "./types";
import { USER_AGENT } from "./utils";

export function base64UrlEncode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function randomBase64Url(length: number): string {
  const buf = new Uint8Array(length);
  crypto.getRandomValues(buf);
  return base64UrlEncode(buf);
}

export async function sha256(input: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return new Uint8Array(digest);
}

export async function pkceChallenge(verifier: string): Promise<string> {
  return base64UrlEncode(await sha256(verifier));
}

export function decodeJwtPayload(jwt: string): Record<string, unknown> {
  const [, payload] = jwt.split(".");
  const b64 = payload.replaceAll("-", "+").replaceAll("_", "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  return JSON.parse(atob(padded));
}

export interface OidcEndpoints {
  authorize: string;
  token: string;
  userinfo: string;
  endSession: string;
  jwt: string;
  jwtRefresh: string;
  login: string;
  signup: string;
}

export function endpoints(host: string): OidcEndpoints {
  const base = host.replace(/\/$/, "");
  return {
    authorize: `${base}/openid/authorize`,
    token: `${base}/openid/token`,
    userinfo: `${base}/openid/userinfo`,
    endSession: `${base}/openid/end-session`,
    jwt: `${base}/api/jwt/`,
    jwtRefresh: `${base}/api/refresh/`,
    login: `${base}/accounts/login/`,
    signup: `${base}/accounts/signup/`,
  };
}

interface AuthorizeUrlParams {
  host: string;
  clientId: string;
  scopes: string;
  redirectUri: string;
  state: string;
  nonce: string;
  codeChallenge: string;
}

export function buildAuthorizeUrl({
  host,
  clientId,
  scopes,
  redirectUri,
  state,
  nonce,
  codeChallenge,
}: AuthorizeUrlParams): string {
  const url = new URL(endpoints(host).authorize);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  }).toString();
  return url.toString();
}

// Front the OIDC authorize URL with an allauth account page (login or signup).
// We never hand the bare /openid/authorize URL to launchWebAuthFlow: on
// production Squarelet an unauthenticated user is bounced to login via a
// redirect chain the auth window can't follow ("Authorization page could not
// be loaded"). Starting at a real account page avoids that, and allauth resumes
// the OIDC handshake by following the same-host-relative `?next=` once the user
// is authenticated.
function buildAccountUrl(endpoint: string, authorizeUrl: string): string {
  const authorize = new URL(authorizeUrl);
  const url = new URL(endpoint);
  url.searchParams.set("next", authorize.pathname + authorize.search);
  url.searchParams.set("intent", "klaxon-cloud");
  return url.toString();
}

export function buildLoginUrl(host: string, authorizeUrl: string): string {
  return buildAccountUrl(endpoints(host).login, authorizeUrl);
}

export function buildSignupUrl(host: string, authorizeUrl: string): string {
  return buildAccountUrl(endpoints(host).signup, authorizeUrl);
}

export async function getAuthToken(
  url: string,
  params: URLSearchParams,
): Promise<OidcTokenResponse> {
  const tokenResp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: params,
  });
  if (!tokenResp.ok) {
    throw new Error(
      `Token exchange failed: ${tokenResp.status} ${await tokenResp.text()}`,
    );
  }
  const tokenData: OidcTokenResponse = {
    ...((await tokenResp.json()) as Omit<OidcTokenResponse, "issued_at">),
    issued_at: Date.now(),
  };
  return tokenData as OidcTokenResponse;
}

export async function getUserInfo(
  url: string,
  token: string,
): Promise<UserInfoResponse> {
  const userResp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": USER_AGENT,
    },
  });
  if (!userResp.ok) {
    throw new Error(
      `Failed to fetch user data: ${userResp.status} ${await userResp.text()}`,
    );
  }
  const user = {
    ...((await userResp.json()) as Omit<UserInfoResponse, "issued_at">),
    issued_at: Date.now(),
  };
  return user;
}

/**
 * Exchange a Squarelet OIDC token for a JWT to access DocumentCloud
 */
export async function exchangeOidcForJwt(
  url: string,
  oidcAccessToken: string,
): Promise<JwtTokenResponse> {
  const resp = await fetch(url, {
    method: "POST",
    // Don't send Squarelet's session cookie even if one is present — this is a
    // public token-exchange endpoint and SessionAuthentication on the server
    // side would otherwise trigger DRF's CSRF Origin check against
    // chrome-extension:// (which isn't in CSRF_TRUSTED_ORIGINS).
    credentials: "omit",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify({ oidc_token: oidcAccessToken }),
  });
  if (!resp.ok) {
    throw new Error(`JWT exchange failed: ${resp.status} ${await resp.text()}`);
  }
  return {
    ...((await resp.json()) as Omit<JwtTokenResponse, "issued_at">),
    issued_at: Date.now(),
  };
}

/**
 * Refresh an access token
 */
export async function refreshJwt(
  url: string,
  refreshToken: string,
): Promise<JwtTokenResponse> {
  const resp = await fetch(url, {
    method: "POST",
    credentials: "omit", // see exchangeOidcForJwt
    headers: {
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify({ refresh: refreshToken }),
  });
  if (!resp.ok) {
    throw new Error(`JWT refresh failed: ${resp.status} ${await resp.text()}`);
  }
  const { access, refresh } = (await resp.json()) as {
    access: string;
    refresh: string;
  };
  return {
    access_token: access,
    refresh_token: refresh,
    issued_at: Date.now(),
  };
}

export function hasTokenExpired(tokenObj: OidcTokenResponse): boolean {
  // issuedAt is in milliseconds, expiresIn is in seconds, so normalize to milliseconds
  // apply a 300 second buffer so that we're agressive about refreshing our tokens
  const expiresAt = tokenObj.issued_at + (tokenObj.expires_in - 300) * 1000;
  return Date.now() >= expiresAt;
}

// JWT lifetime is 300s, so this only buffers a few seconds by default —
// enough to dodge clock skew without consuming much of the access window.
export function hasJwtExpired(token: string, bufferSeconds = 30): boolean {
  try {
    const { exp } = decodeJwtPayload(token) as { exp?: number };
    if (typeof exp !== "number") return true;
    return Date.now() >= (exp - bufferSeconds) * 1000;
  } catch {
    return true;
  }
}

// Shape guard for the StoredAuth record. Used by readStored() to drop
// legacy `{auth, userinfo}` records (and any other partial/corrupt state)
// so the service worker only ever sees the three-slot shape it expects.
export function isValidStoredAuth(value: unknown): value is StoredAuth {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return Boolean(v.oidc) && Boolean(v.jwt) && Boolean(v.userinfo);
}
