import type { StoredAuth, UserInfoResponse } from "@klaxon/lib/types";

// base64url-encode a JSON object (Node side). Matches what decodeJwtPayload in
// src/lib/oidc.ts expects: it converts -/_ back to +// and re-pads before atob.
function b64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

// A structurally-valid JWT (header.payload.sig) carrying the given claims. The
// signature is a dummy — nothing in the extension verifies it; the SW only
// decodes the payload to read `exp` (hasJwtExpired).
function fakeJwt(claims: Record<string, unknown>): string {
  return `${b64url({ alg: "none", typ: "JWT" })}.${b64url(claims)}.sig`;
}

const DEFAULT_USER: UserInfoResponse = {
  sub: "1020",
  uuid: "00000000-0000-0000-0000-000000000000",
  name: "Ada Lovelace",
  nickname: "ada",
  preferred_username: "ada",
  updated_at: "2026-01-01T00:00:00Z",
  picture: "",
  bio: "",
  email: "ada@example.com",
  email_verified: true,
  use_autologin: false,
  organizations: [],
};

/**
 * A valid signed-in StoredAuth record for `chrome.storage.local["muckrock_auth"]`.
 *
 * The DC JWT's `exp` is set an hour out so `hasJwtExpired` is false and the
 * service worker returns it directly from `auth/token` — no network refresh
 * (which would hang against the mocked-out Squarelet host).
 */
export function makeStoredAuth(
  user: Partial<UserInfoResponse> = {},
): StoredAuth {
  const now = Date.now();
  const exp = Math.floor(now / 1000) + 3600;
  const userinfo: UserInfoResponse = { ...DEFAULT_USER, ...user };

  return {
    oidc: {
      access_token: "test-oidc-access-token",
      refresh_token: "test-oidc-refresh-token",
      token_type: "Bearer",
      id_token: fakeJwt({ sub: userinfo.sub, aud: "test-client", exp }),
      expires_in: 3600,
      issued_at: now,
    },
    jwt: {
      access_token: fakeJwt({ sub: userinfo.sub, exp }),
      refresh_token: "test-jwt-refresh-token",
      issued_at: now,
    },
    userinfo,
  };
}
