// Pure OIDC/PKCE helpers. No chrome.* or fetch — just crypto + string math.

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
}

export function endpoints(host: string): OidcEndpoints {
  const base = host.replace(/\/$/, "");
  return {
    authorize: `${base}/openid/authorize`,
    token: `${base}/openid/token`,
    userinfo: `${base}/openid/userinfo`,
    endSession: `${base}/openid/end-session`,
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
