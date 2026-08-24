import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { dispatch, eventValues, history, scheduled, update } from "../api";
import { getAccessToken } from "../auth.svelte";
import {
  event as eventFixture,
  scheduled as scheduledFixture,
} from "@klaxon/lib/fixtures/events";
import { runs } from "@klaxon/lib/fixtures/runs";

vi.mock("../auth.svelte", () => ({
  getAccessToken: vi.fn(async () => "test-token"),
}));

const mockGetAccessToken = vi.mocked(getAccessToken);

const API_URL = import.meta.env.MUCKROCK_DOCUMENTCLOUD_API;
const KLAXON_ID = import.meta.env.MUCKROCK_KLAXON_ID;

/**
 * Build the envelope the service worker sends back for a successful
 * `api/fetch` message. `swFetch` unwraps `data` into a Response-like object.
 */
function swReply(
  body: unknown,
  {
    status = 200,
    statusText = "OK",
  }: { status?: number; statusText?: string } = {},
) {
  return { ok: true, data: { status, statusText, body } };
}

/**
 * API calls are proxied through the service worker, so the boundary under
 * test is the `chrome.runtime.sendMessage` payload, not a `fetch` call.
 * Pull the FetchMessage off the first call and expose it as the URL +
 * RequestInit the caller asked the worker to fetch.
 */
function lastFetchCall(mock: ReturnType<typeof vi.fn>) {
  const [msg] = mock.mock.calls[0] as [
    { type: string; url: string; options: RequestInit },
  ];
  return { url: new URL(msg.url), init: msg.options, message: msg };
}

function stubChrome(sendMessage: ReturnType<typeof vi.fn>) {
  vi.stubGlobal("chrome", { runtime: { sendMessage } });
}

describe("history", () => {
  let sendMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sendMessage = vi.fn(async () => swReply(runs));
    stubChrome(sendMessage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests addon_runs filtered by addon and site, with bearer token", async () => {
    const site = "https://github.com/muckrock/klaxon";

    const result = await history({ site });

    expect(sendMessage).toHaveBeenCalledOnce();
    const { url, init, message } = lastFetchCall(sendMessage);
    expect(message.type).toBe("api/fetch");
    expect(url.pathname).toBe(new URL(`${API_URL}addon_runs/`).pathname);
    expect(url.searchParams.get("addon")).toBe(String(KLAXON_ID));
    expect(url.searchParams.get("site")).toBe(site);
    expect(init.credentials).toBe("omit");
    expect(init.headers).toMatchObject({
      Accept: "application/json",
      Authorization: "Bearer test-token",
    });
    expect(result.data).toEqual(runs);
    expect(result.error).toBeUndefined();
  });

  it("appends cursor and per_page when supplied", async () => {
    await history({
      site: "https://example.com",
      cursor: "abc123",
      per_page: 25,
    });

    const { url } = lastFetchCall(sendMessage);
    expect(url.searchParams.get("cursor")).toBe("abc123");
    expect(url.searchParams.get("per_page")).toBe("25");
  });

  it("omits cursor and per_page when not supplied", async () => {
    await history({ site: "https://example.com" });

    const { url } = lastFetchCall(sendMessage);
    expect(url.searchParams.has("cursor")).toBe(false);
    expect(url.searchParams.has("per_page")).toBe(false);
  });

  it("returns a 500 error when the worker fetch fails", async () => {
    sendMessage.mockResolvedValueOnce({ ok: false, error: "network down" });

    const result = await history({ site: "https://example.com" });

    expect(result.data).toBeUndefined();
    expect(result.error).toEqual({ status: 500, message: "API error" });
  });

  it("surfaces API error responses", async () => {
    sendMessage.mockResolvedValueOnce(
      swReply({ detail: "nope" }, { status: 401, statusText: "Unauthorized" }),
    );

    const result = await history({ site: "https://example.com" });

    expect(result.data).toBeUndefined();
    expect(result.error?.status).toBe(401);
    expect(result.error?.message).toBe("Unauthorized");
    expect(result.error?.errors).toEqual({ detail: "nope" });
  });

  it("preserves site URLs that contain their own query string", async () => {
    const site = "https://example.com/?x=1&y=2";

    await history({ site });

    const { url } = lastFetchCall(sendMessage);
    expect(url.searchParams.get("site")).toBe(site);
    expect(url.searchParams.has("y")).toBe(false);
  });
});

describe("scheduled", () => {
  let sendMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sendMessage = vi.fn(async () => swReply(scheduledFixture));
    stubChrome(sendMessage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests addon_events filtered by addon and site, with bearer token", async () => {
    const site = "https://example.com";

    const result = await scheduled({ site });

    expect(sendMessage).toHaveBeenCalledOnce();
    const { url, init } = lastFetchCall(sendMessage);
    expect(url.pathname).toBe(new URL(`${API_URL}addon_events/`).pathname);
    expect(url.searchParams.get("expand")).toBe("addon");
    expect(url.searchParams.get("addon")).toBe(String(KLAXON_ID));
    expect(url.searchParams.get("site")).toBe(site);
    expect(init.headers).toMatchObject({
      Accept: "application/json",
      Authorization: "Bearer test-token",
    });
    expect(result.data).toEqual(scheduledFixture);
  });

  it("appends cursor and per_page when supplied", async () => {
    await scheduled({
      site: "https://example.com",
      cursor: "next-page",
      per_page: 10,
    });

    const { url } = lastFetchCall(sendMessage);
    expect(url.searchParams.get("cursor")).toBe("next-page");
    expect(url.searchParams.get("per_page")).toBe("10");
  });

  it("returns a 500 when the worker fetch fails", async () => {
    sendMessage.mockResolvedValueOnce({ ok: false, error: "boom" });

    const result = await scheduled({ site: "https://example.com" });

    expect(result.error?.status).toBe(500);
  });

  it("preserves site URLs that contain their own query string", async () => {
    const site = "https://example.com/?x=1&y=2";

    await scheduled({ site });

    const { url } = lastFetchCall(sendMessage);
    expect(url.searchParams.get("site")).toBe(site);
    expect(url.searchParams.has("y")).toBe(false);
  });
});

describe("dispatch", () => {
  let sendMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sendMessage = vi.fn(async () => swReply(eventFixture, { status: 201 }));
    stubChrome(sendMessage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs an AddOnPayload built from the schedule and parameters", async () => {
    const params = {
      site: "https://example.com",
      selector: "#main",
      filter_selector: "a",
    };

    const result = await dispatch("daily", params);

    expect(sendMessage).toHaveBeenCalledOnce();
    const { url, init } = lastFetchCall(sendMessage);
    expect(url.toString()).toBe(`${API_URL}addon_events/`);
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Accept: "application/json",
      Authorization: "Bearer test-token",
      "Content-type": "application/json",
    });
    expect(JSON.parse(init.body as string)).toEqual({
      addon: Number(KLAXON_ID),
      event: eventValues.daily,
      parameters: params,
    });
    expect(result.data).toEqual(eventFixture);
  });

  it("maps each schedule to its numeric event value", async () => {
    const cases: Array<["disabled" | "hourly" | "daily" | "weekly", number]> = [
      ["disabled", 0],
      ["hourly", 1],
      ["daily", 2],
      ["weekly", 3],
    ];

    for (const [schedule, expected] of cases) {
      sendMessage.mockClear();
      await dispatch(schedule, { site: "https://x.test", selector: "#x" });
      const body = JSON.parse(lastFetchCall(sendMessage).init.body as string);
      expect(body.event).toBe(expected);
    }
  });

  it("returns validation errors from the API", async () => {
    const errors = { site: ["This field is required."] };
    sendMessage.mockResolvedValueOnce(
      swReply(errors, { status: 400, statusText: "Bad Request" }),
    );

    const result = await dispatch("hourly", {
      site: "",
      selector: "#main",
    });

    expect(result.data).toBeUndefined();
    expect(result.error?.status).toBe(400);
    expect(result.error?.errors).toEqual(errors);
  });

  it("returns a 500 when the worker fetch fails", async () => {
    sendMessage.mockResolvedValueOnce({ ok: false, error: "offline" });

    const result = await dispatch("hourly", {
      site: "https://x.test",
      selector: "#x",
    });

    expect(result.error?.status).toBe(500);
  });

  // The API types `slack_webhook` as a URI, so a form left blank has to omit
  // the key rather than POST an empty string the backend rejects.
  it("omits an unset slack_webhook instead of sending an empty string", async () => {
    await dispatch("daily", {
      site: "https://example.com",
      selector: "#main",
      slack_webhook: "",
    });

    const { init } = lastFetchCall(sendMessage);
    expect(init.body as string).not.toContain("slack_webhook");
    expect(JSON.parse(init.body as string).parameters).toEqual({
      site: "https://example.com",
      selector: "#main",
    });
  });

  it("POSTs a slack_webhook that is a real URL", async () => {
    const webhook = "https://hooks.slack.com/services/T000/B000/XXXX";
    await dispatch("daily", {
      site: "https://example.com",
      selector: "#main",
      slack_webhook: webhook,
    });

    const body = JSON.parse(lastFetchCall(sendMessage).init.body as string);
    expect(body.parameters.slack_webhook).toBe(webhook);
  });
});

describe("update", () => {
  let sendMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sendMessage = vi.fn(async () => swReply(eventFixture));
    stubChrome(sendMessage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("PATCHes the event-specific endpoint with the rebuilt payload", async () => {
    const params = { selector: "#new-selector" };

    const result = await update(533, "weekly", params);

    expect(sendMessage).toHaveBeenCalledOnce();
    const { url, init } = lastFetchCall(sendMessage);
    expect(url.pathname).toBe(new URL(`${API_URL}addon_events/533/`).pathname);
    expect(url.searchParams.get("expand")).toBe("addon");
    expect(init.method).toBe("PATCH");
    expect(init.headers).toMatchObject({
      Accept: "application/json",
      Authorization: "Bearer test-token",
      "Content-type": "application/json",
    });
    expect(JSON.parse(init.body as string)).toEqual({
      addon: Number(KLAXON_ID),
      event: eventValues.weekly,
      parameters: params,
    });
    expect(result.data).toEqual(eventFixture);
  });

  it("treats schedule=disabled as event 0 (cancel)", async () => {
    await update(533, "disabled", {});

    const body = JSON.parse(lastFetchCall(sendMessage).init.body as string);
    expect(body.event).toBe(0);
  });

  it("returns validation errors from the API", async () => {
    sendMessage.mockResolvedValueOnce(
      swReply(
        { selector: ["Invalid selector."] },
        { status: 400, statusText: "Bad Request" },
      ),
    );

    const result = await update(533, "daily", { selector: "" });

    expect(result.error?.status).toBe(400);
    expect(result.error?.errors).toEqual({ selector: ["Invalid selector."] });
  });

  it("treats a 204 No Content as success with no body", async () => {
    sendMessage.mockResolvedValueOnce(
      swReply(null, { status: 204, statusText: "No Content" }),
    );

    const result = await update(533, "disabled", {});

    expect(result.data).toBeUndefined();
    expect(result.error).toBeUndefined();
  });

  // Edits spread the alert's stored parameters, so a blank webhook saved by an
  // older build would otherwise be PATCHed straight back at the API.
  it("drops a blank slack_webhook carried in from the stored alert", async () => {
    await update(533, "weekly", {
      site: "https://example.com",
      selector: "#main",
      slack_webhook: "",
    });

    const { init } = lastFetchCall(sendMessage);
    expect(init.body as string).not.toContain("slack_webhook");
  });

  it("PATCHes a slack_webhook the user actually set", async () => {
    const webhook = "https://hooks.slack.com/services/T000/B000/XXXX";
    await update(533, "weekly", {
      site: "https://example.com",
      selector: "#main",
      slack_webhook: webhook,
    });

    const body = JSON.parse(lastFetchCall(sendMessage).init.body as string);
    expect(body.parameters.slack_webhook).toBe(webhook);
  });
});

describe("when the access token is missing", () => {
  let sendMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sendMessage = vi.fn();
    stubChrome(sendMessage);
    mockGetAccessToken.mockResolvedValueOnce(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function expectAuthError(result: { data?: unknown; error?: unknown }) {
    expect(sendMessage).not.toHaveBeenCalled();
    expect(result.data).toBeUndefined();
    expect(result.error).toEqual({ status: 401, message: "Not authenticated" });
  }

  it("history returns a 401 error without calling the worker", async () => {
    expectAuthError(await history({ site: "https://example.com" }));
  });

  it("scheduled returns a 401 error without calling the worker", async () => {
    expectAuthError(await scheduled({ site: "https://example.com" }));
  });

  it("dispatch returns a 401 error without calling the worker", async () => {
    expectAuthError(
      await dispatch("daily", {
        site: "https://example.com",
        selector: "#main",
      }),
    );
  });

  it("update returns a 401 error without calling the worker", async () => {
    expectAuthError(await update(533, "disabled", {}));
  });
});

describe("when getAccessToken throws", () => {
  let sendMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sendMessage = vi.fn();
    stubChrome(sendMessage);
    mockGetAccessToken.mockRejectedValueOnce(
      new Error("no reply from service worker"),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function expectAuthError(result: { data?: unknown; error?: unknown }) {
    expect(sendMessage).not.toHaveBeenCalled();
    expect(result.data).toBeUndefined();
    expect(result.error).toEqual({ status: 401, message: "Not authenticated" });
  }

  it("history returns a 401 error without calling the worker", async () => {
    expectAuthError(await history({ site: "https://example.com" }));
  });

  it("scheduled returns a 401 error without calling the worker", async () => {
    expectAuthError(await scheduled({ site: "https://example.com" }));
  });

  it("dispatch returns a 401 error without calling the worker", async () => {
    expectAuthError(
      await dispatch("daily", {
        site: "https://example.com",
        selector: "#main",
      }),
    );
  });

  it("update returns a 401 error without calling the worker", async () => {
    expectAuthError(await update(533, "disabled", {}));
  });
});
