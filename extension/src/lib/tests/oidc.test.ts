import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  base64UrlEncode,
  buildAuthorizeUrl,
  buildLoginUrl,
  buildSignupUrl,
  decodeJwtPayload,
  endpoints,
  exchangeOidcForJwt,
  hasJwtExpired,
  isValidStoredAuth,
  pkceChallenge,
  randomBase64Url,
  refreshJwt,
  sha256,
} from "../oidc.ts";

// Build a syntactically valid JWT with the given payload. The signature is
// a placeholder — these tests only exercise decode/expiry, never verification.
function makeJwt(payload: Record<string, unknown>): string {
  const b64url = (s: string) =>
    btoa(s).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  return `${header}.${body}.sig`;
}

describe("base64UrlEncode", () => {
  it("encodes bytes using the URL-safe alphabet without padding", () => {
    const bytes = new Uint8Array([0xfb, 0xff, 0xfe]);
    // Standard base64 would be "+//+", URL-safe drops + and / and the = pad.
    expect(base64UrlEncode(bytes)).toBe("-__-");
  });

  it("produces no padding characters", () => {
    const bytes = new Uint8Array([0x01]);
    expect(base64UrlEncode(bytes)).toBe("AQ");
  });
});

describe("randomBase64Url", () => {
  it("returns a string of the expected character length for a given byte count", () => {
    // 32 random bytes = ceil(32 / 3) * 4 = 44 chars, minus 1 padding = 43.
    expect(randomBase64Url(32)).toHaveLength(43);
  });

  it("returns different values on each call", () => {
    expect(randomBase64Url(16)).not.toBe(randomBase64Url(16));
  });
});

describe("pkceChallenge", () => {
  it("matches the RFC 7636 test vector", async () => {
    // RFC 7636 Appendix B: verifier → code_challenge (S256).
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const challenge = await pkceChallenge(verifier);
    expect(challenge).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });
});

describe("sha256", () => {
  it("produces the known digest for the empty string", async () => {
    const digest = await sha256("");
    const hex = Array.from(digest)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    expect(hex).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });
});

describe("decodeJwtPayload", () => {
  it("decodes a JWT's claims", () => {
    // Header: {"alg":"none"}; Payload: {"sub":"abc","nonce":"xyz"}; no signature.
    const jwt = "eyJhbGciOiJub25lIn0.eyJzdWIiOiJhYmMiLCJub25jZSI6Inh5eiJ9.";
    expect(decodeJwtPayload(jwt)).toEqual({ sub: "abc", nonce: "xyz" });
  });
});

describe("endpoints", () => {
  it("strips a trailing slash from the host", () => {
    expect(endpoints("https://dev.squarelet.com/").authorize).toBe(
      "https://dev.squarelet.com/openid/authorize",
    );
  });

  it("builds OIDC endpoints without trailing slashes (django-oidc-provider uses bare paths)", () => {
    const ep = endpoints("https://accounts.muckrock.com");
    expect(ep.authorize).toBe("https://accounts.muckrock.com/openid/authorize");
    expect(ep.token).toBe("https://accounts.muckrock.com/openid/token");
    expect(ep.userinfo).toBe("https://accounts.muckrock.com/openid/userinfo");
    expect(ep.endSession).toBe(
      "https://accounts.muckrock.com/openid/end-session",
    );
  });

  it("builds DRF endpoints with trailing slashes (Django APPEND_SLASH drops POST bodies)", () => {
    const ep = endpoints("https://accounts.muckrock.com");
    expect(ep.jwt).toBe("https://accounts.muckrock.com/api/jwt/");
    expect(ep.jwtRefresh).toBe("https://accounts.muckrock.com/api/refresh/");
  });

  it("builds the allauth login and signup endpoints with a trailing slash", () => {
    const ep = endpoints("https://dev.squarelet.com/");
    expect(ep.login).toBe("https://dev.squarelet.com/accounts/login/");
    expect(ep.signup).toBe("https://dev.squarelet.com/accounts/signup/");
  });
});

describe("buildAuthorizeUrl", () => {
  it("includes every parameter the OIDC PKCE flow requires", () => {
    const url = buildAuthorizeUrl({
      host: "https://dev.squarelet.com/",
      clientId: "muckrock-extension",
      scopes: "openid profile email",
      redirectUri: "https://abc.chromiumapp.org/",
      state: "S",
      nonce: "N",
      codeChallenge: "C",
    });
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe(
      "https://dev.squarelet.com/openid/authorize",
    );
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("client_id")).toBe("muckrock-extension");
    expect(parsed.searchParams.get("redirect_uri")).toBe(
      "https://abc.chromiumapp.org/",
    );
    expect(parsed.searchParams.get("scope")).toBe("openid profile email");
    expect(parsed.searchParams.get("state")).toBe("S");
    expect(parsed.searchParams.get("nonce")).toBe("N");
    expect(parsed.searchParams.get("code_challenge")).toBe("C");
    expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
  });

  it("does not include a client_secret", () => {
    const url = buildAuthorizeUrl({
      host: "https://dev.squarelet.com",
      clientId: "x",
      scopes: "openid",
      redirectUri: "https://abc.chromiumapp.org/",
      state: "s",
      nonce: "n",
      codeChallenge: "c",
    });
    expect(new URL(url).searchParams.has("client_secret")).toBe(false);
  });
});

describe.each([
  ["buildLoginUrl", buildLoginUrl, "/accounts/login/"],
  ["buildSignupUrl", buildSignupUrl, "/accounts/signup/"],
] as const)("%s", (_name, build, expectedPath) => {
  const authorizeUrl = buildAuthorizeUrl({
    host: "https://dev.squarelet.com",
    clientId: "muckrock-extension",
    scopes: "openid profile email",
    redirectUri: "https://abc.chromiumapp.org/",
    state: "S",
    nonce: "N",
    codeChallenge: "C",
  });

  it(`points at the ${expectedPath} page`, () => {
    const url = new URL(build("https://dev.squarelet.com", authorizeUrl));
    expect(url.origin + url.pathname).toBe(
      `https://dev.squarelet.com${expectedPath}`,
    );
  });

  it("carries the authorize URL as a same-host relative ?next= so the OIDC flow resumes after authenticating", () => {
    const next = new URL(
      build("https://dev.squarelet.com", authorizeUrl),
    ).searchParams.get("next");
    expect(next).not.toBeNull();
    // Relative path (no scheme/host) keeps allauth's safe-redirect check happy.
    expect(next!.startsWith("/openid/authorize?")).toBe(true);
    // Round-trips back to the full authorize URL when resolved against the host.
    expect(new URL(next!, "https://dev.squarelet.com").toString()).toBe(
      authorizeUrl,
    );
  });
});

describe("exchangeOidcForJwt", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs JSON { oidc_token } and returns the JWT pair with issued_at", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: "jwt-a", refresh_token: "jwt-r" }),
    });
    const before = Date.now();
    const result = await exchangeOidcForJwt(
      "https://x.test/api/jwt/",
      "oidc-access",
    );
    const after = Date.now();

    expect(globalThis.fetch).toHaveBeenCalledWith("https://x.test/api/jwt/", {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oidc_token: "oidc-access" }),
    });
    expect(result.access_token).toBe("jwt-a");
    expect(result.refresh_token).toBe("jwt-r");
    expect(result.issued_at).toBeGreaterThanOrEqual(before);
    expect(result.issued_at).toBeLessThanOrEqual(after);
  });

  it("throws with the response body on non-2xx", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => '{"error":"invalid token"}',
    });
    await expect(
      exchangeOidcForJwt("https://x.test/api/jwt/", "bad"),
    ).rejects.toThrow(/400.*invalid token/);
  });
});

describe("refreshJwt", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs { refresh } and normalizes { access, refresh } to long-name fields", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access: "new-a", refresh: "new-r" }),
    });
    const result = await refreshJwt(
      "https://x.test/api/refresh/",
      "old-refresh",
    );

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://x.test/api/refresh/",
      {
        method: "POST",
        credentials: "omit",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: "old-refresh" }),
      },
    );
    expect(result.access_token).toBe("new-a");
    expect(result.refresh_token).toBe("new-r");
    expect(typeof result.issued_at).toBe("number");
  });

  it("throws on non-2xx", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => '{"detail":"Token is invalid or expired"}',
    });
    await expect(
      refreshJwt("https://x.test/api/refresh/", "expired"),
    ).rejects.toThrow(/401/);
  });
});

describe("hasJwtExpired", () => {
  const now = () => Math.floor(Date.now() / 1000);

  it("returns false for a fresh JWT well beyond the buffer", () => {
    const jwt = makeJwt({ exp: now() + 600 }); // 10 min out
    expect(hasJwtExpired(jwt)).toBe(false);
  });

  it("returns true for a JWT whose exp is in the past", () => {
    const jwt = makeJwt({ exp: now() - 60 });
    expect(hasJwtExpired(jwt)).toBe(true);
  });

  it("returns true when the buffer pushes the cutoff past now", () => {
    // exp 20s out, default buffer 30s → cutoff is 10s in the past → expired
    const jwt = makeJwt({ exp: now() + 20 });
    expect(hasJwtExpired(jwt)).toBe(true);
  });

  it("respects a custom bufferSeconds argument", () => {
    const jwt = makeJwt({ exp: now() + 20 });
    expect(hasJwtExpired(jwt, 5)).toBe(false);
  });

  it("returns true when the exp claim is missing", () => {
    const jwt = makeJwt({ sub: "abc" });
    expect(hasJwtExpired(jwt)).toBe(true);
  });

  it("returns true on a malformed JWT", () => {
    expect(hasJwtExpired("not.a.jwt")).toBe(true);
    expect(hasJwtExpired("only-one-segment")).toBe(true);
  });
});

describe("isValidStoredAuth", () => {
  const valid = {
    oidc: {
      access_token: "a",
      refresh_token: "r",
      token_type: "Bearer",
      id_token: "i",
      expires_in: 3600,
      issued_at: 1,
    },
    jwt: { access_token: "ja", refresh_token: "jr", issued_at: 2 },
    userinfo: { sub: "u", uuid: "u", name: "n" },
  };

  it("returns true for a record with all three slots populated", () => {
    expect(isValidStoredAuth(valid)).toBe(true);
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["empty object", {}],
    ["string", "muckrock_auth"],
    ["number", 42],
  ])("returns false for %s", (_label, value) => {
    expect(isValidStoredAuth(value)).toBe(false);
  });

  it("returns false when oidc is missing", () => {
    const { oidc: _oidc, ...partial } = valid;
    expect(isValidStoredAuth(partial)).toBe(false);
  });

  it("returns false when jwt is missing", () => {
    const { jwt: _jwt, ...partial } = valid;
    expect(isValidStoredAuth(partial)).toBe(false);
  });

  it("returns false when userinfo is missing", () => {
    const { userinfo: _userinfo, ...partial } = valid;
    expect(isValidStoredAuth(partial)).toBe(false);
  });

  it("rejects the legacy {auth, userinfo} shape so readStored can clear it", () => {
    const legacy = { auth: valid.oidc, userinfo: valid.userinfo };
    expect(isValidStoredAuth(legacy)).toBe(false);
  });

  it("returns false when a slot is present but falsy", () => {
    expect(isValidStoredAuth({ ...valid, jwt: null })).toBe(false);
    expect(isValidStoredAuth({ ...valid, oidc: undefined })).toBe(false);
  });
});
