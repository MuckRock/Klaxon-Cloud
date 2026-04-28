// Pure OIDC/PKCE helpers. No chrome.* or fetch — just crypto + string math.
// Shipped as an ES module so the service worker can import it and so tests in
// src/ can exercise the same functions.

/** @param {Uint8Array} bytes */
export function base64UrlEncode(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

/** @param {number} length */
export function randomBase64Url(length) {
  const buf = new Uint8Array(length);
  crypto.getRandomValues(buf);
  return base64UrlEncode(buf);
}

/** @param {string} input */
export async function sha256(input) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return new Uint8Array(digest);
}

/** @param {string} verifier */
export async function pkceChallenge(verifier) {
  return base64UrlEncode(await sha256(verifier));
}

/** @param {string} jwt */
export function decodeJwtPayload(jwt) {
  const [, payload] = jwt.split(".");
  const b64 = payload.replaceAll("-", "+").replaceAll("_", "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  return JSON.parse(atob(padded));
}

/** @param {string} host */
export function endpoints(host) {
  const base = host.replace(/\/$/, "");
  return {
    authorize: `${base}/openid/authorize`,
    token: `${base}/openid/token`,
    userinfo: `${base}/openid/userinfo`,
    endSession: `${base}/openid/end-session`,
  };
}

/**
 * @param {{
 *   host: string,
 *   clientId: string,
 *   scopes: string,
 *   redirectUri: string,
 *   state: string,
 *   nonce: string,
 *   codeChallenge: string,
 * }} params
 */
export function buildAuthorizeUrl({
  host,
  clientId,
  scopes,
  redirectUri,
  state,
  nonce,
  codeChallenge,
}) {
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
