import { describe, it, expect } from "vitest";
import {
  base64UrlEncode,
  buildAuthorizeUrl,
  decodeJwtPayload,
  endpoints,
  pkceChallenge,
  randomBase64Url,
  sha256,
} from "../oidc.ts";

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

  it("builds all four endpoints from a host", () => {
    const ep = endpoints("https://accounts.muckrock.com");
    expect(ep).toEqual({
      authorize: "https://accounts.muckrock.com/openid/authorize",
      token: "https://accounts.muckrock.com/openid/token",
      userinfo: "https://accounts.muckrock.com/openid/userinfo",
      endSession: "https://accounts.muckrock.com/openid/end-session",
    });
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
