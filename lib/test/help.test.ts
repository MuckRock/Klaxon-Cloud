import { describe, it, expect } from "vitest";
import {
  HELP_FAQ_URL,
  HELP_GUIDE_URL,
  SUPPORT_EMAIL,
  SUPPORT_SUBJECT,
  supportBody,
  supportMailto,
} from "../src/help";

const user = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  username: "ada",
  uuid: "0d1f2e3d-4c5b-6a79-8899-aabbccddeeff",
};

describe("help URLs", () => {
  it("anchors the FAQ inside the guide page", () => {
    expect(HELP_FAQ_URL.startsWith(`${HELP_GUIDE_URL}#`)).toBe(true);
  });
});

describe("supportBody", () => {
  it("includes the client and every known account detail", () => {
    const body = supportBody({ user, client: "Web app" });

    expect(body).toContain("Klaxon: Web app");
    expect(body).toContain("Name: Ada Lovelace");
    expect(body).toContain("Email: ada@example.com");
    expect(body).toContain("Username: ada");
    expect(body).toContain(`Account ID: ${user.uuid}`);
  });

  it("leaves the user room to write above the details", () => {
    const [prompt, ...rest] = supportBody({ user }).split("\n");

    expect(prompt).not.toBe("");
    expect(rest.slice(0, 2)).toEqual(["", ""]);
  });

  it("says so when nobody is signed in", () => {
    expect(supportBody({ client: "Web app" })).toContain("Signed in: no");
  });

  it("treats a user with no identifying fields as signed out", () => {
    expect(supportBody({ user: { name: "", email: null } })).toContain(
      "Signed in: no",
    );
  });

  it("appends extra details and drops the empty ones", () => {
    const body = supportBody({
      user,
      details: { Page: "https://klaxon.muckrock.com/alerts/", Browser: "" },
    });

    expect(body).toContain("Page: https://klaxon.muckrock.com/alerts/");
    expect(body).not.toContain("Browser:");
  });
});

describe("supportMailto", () => {
  it("addresses support with the tagged subject and the body", () => {
    const url = new URL(supportMailto({ user, client: "Web app" }));

    expect(url.protocol).toBe("mailto:");
    expect(url.pathname).toBe(SUPPORT_EMAIL);
    expect(url.searchParams.get("subject")).toBe(SUPPORT_SUBJECT);
    expect(url.searchParams.get("body")).toBe(
      supportBody({ user, client: "Web app" }),
    );
  });

  it("encodes spaces as %20, not + — mail clients paste the + literally", () => {
    const mailto = supportMailto({ client: "Web app" });

    expect(mailto).toContain("subject=%5BKlaxon%20Cloud%5D");
    expect(mailto).not.toContain("+");
  });

  it("works with no context at all", () => {
    expect(supportMailto()).toContain(`mailto:${SUPPORT_EMAIL}?subject=`);
  });
});
