import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { dispatch, eventValues, history, scheduled, update } from "../api";
import { getAccessToken } from "../auth.svelte";
import {
  event as eventFixture,
  scheduled as scheduledFixture,
} from "../../test/fixtures/events";
import { runs } from "../../test/fixtures/runs";

vi.mock("../auth.svelte", () => ({
  getAccessToken: vi.fn(async () => "test-token"),
}));

const mockGetAccessToken = vi.mocked(getAccessToken);

const API_URL = import.meta.env.MUCKROCK_DOCUMENTCLOUD_API;
const KLAXON_ID = import.meta.env.MUCKROCK_KLAXON_ID;

function jsonResponse(body: unknown, init: ResponseInit = { status: 200 }) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function lastFetchCall(mock: ReturnType<typeof vi.fn>) {
  const [url, init] = mock.mock.calls[0] as [URL, RequestInit];
  return { url, init };
}

describe("history", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async () => jsonResponse(runs));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests addon_runs filtered by addon and site, with bearer token", async () => {
    const site = "https://github.com/muckrock/klaxon";

    const result = await history(site);

    expect(fetchMock).toHaveBeenCalledOnce();
    const { url, init } = lastFetchCall(fetchMock);
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
    await history("https://example.com", { cursor: "abc123", per_page: 25 });

    const { url } = lastFetchCall(fetchMock);
    expect(url.searchParams.get("cursor")).toBe("abc123");
    expect(url.searchParams.get("per_page")).toBe("25");
  });

  it("omits cursor and per_page when not supplied", async () => {
    await history("https://example.com");

    const { url } = lastFetchCall(fetchMock);
    expect(url.searchParams.has("cursor")).toBe(false);
    expect(url.searchParams.has("per_page")).toBe(false);
  });

  it("returns a 500 error when fetch throws", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("network down"));

    const result = await history("https://example.com");

    expect(result.data).toBeUndefined();
    expect(result.error).toEqual({ status: 500, message: "API error" });
  });

  it("surfaces API error responses", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { detail: "nope" },
        { status: 401, statusText: "Unauthorized" },
      ),
    );

    const result = await history("https://example.com");

    expect(result.data).toBeUndefined();
    expect(result.error?.status).toBe(401);
    expect(result.error?.message).toBe("Unauthorized");
    expect(result.error?.errors).toEqual({ detail: "nope" });
  });

  it("preserves site URLs that contain their own query string", async () => {
    const site = "https://example.com/?x=1&y=2";

    await history(site);

    const { url } = lastFetchCall(fetchMock);
    expect(url.searchParams.get("site")).toBe(site);
    expect(url.searchParams.has("y")).toBe(false);
  });
});

describe("scheduled", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async () => jsonResponse(scheduledFixture));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests addon_events filtered by addon and site, with bearer token", async () => {
    const site = "https://example.com";

    const result = await scheduled(site);

    expect(fetchMock).toHaveBeenCalledOnce();
    const { url, init } = lastFetchCall(fetchMock);
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
    await scheduled("https://example.com", {
      cursor: "next-page",
      per_page: 10,
    });

    const { url } = lastFetchCall(fetchMock);
    expect(url.searchParams.get("cursor")).toBe("next-page");
    expect(url.searchParams.get("per_page")).toBe("10");
  });

  it("returns a 500 when fetch rejects", async () => {
    fetchMock.mockRejectedValueOnce(new Error("boom"));

    const result = await scheduled("https://example.com");

    expect(result.error?.status).toBe(500);
  });

  it("preserves site URLs that contain their own query string", async () => {
    const site = "https://example.com/?x=1&y=2";

    await scheduled(site);

    const { url } = lastFetchCall(fetchMock);
    expect(url.searchParams.get("site")).toBe(site);
    expect(url.searchParams.has("y")).toBe(false);
  });
});

describe("dispatch", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async () => jsonResponse(eventFixture, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
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

    expect(fetchMock).toHaveBeenCalledOnce();
    const { url, init } = lastFetchCall(fetchMock);
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
    const cases: Array<
      ["disabled" | "hourly" | "daily" | "weekly" | "upload", number]
    > = [
      ["disabled", 0],
      ["hourly", 1],
      ["daily", 2],
      ["weekly", 3],
      ["upload", 4],
    ];

    for (const [schedule, expected] of cases) {
      fetchMock.mockClear();
      await dispatch(schedule, { site: "https://x.test", selector: "#x" });
      const body = JSON.parse(lastFetchCall(fetchMock).init.body as string);
      expect(body.event).toBe(expected);
    }
  });

  it("returns validation errors from the API", async () => {
    const errors = { site: ["This field is required."] };
    fetchMock.mockResolvedValueOnce(
      jsonResponse(errors, { status: 400, statusText: "Bad Request" }),
    );

    const result = await dispatch("hourly", {
      site: "",
      selector: "#main",
    });

    expect(result.data).toBeUndefined();
    expect(result.error?.status).toBe(400);
    expect(result.error?.errors).toEqual(errors);
  });

  it("returns a 500 when fetch rejects", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));

    const result = await dispatch("hourly", {
      site: "https://x.test",
      selector: "#x",
    });

    expect(result.error?.status).toBe(500);
  });
});

describe("update", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async () => jsonResponse(eventFixture));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("PUTs to the event-specific endpoint with the rebuilt payload", async () => {
    const params = { selector: "#new-selector" };

    const result = await update(533, "weekly", params);

    expect(fetchMock).toHaveBeenCalledOnce();
    const { url, init } = lastFetchCall(fetchMock);
    expect(url.toString()).toBe(`${API_URL}addon_events/533/`);
    expect(init.method).toBe("PUT");
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

    const body = JSON.parse(lastFetchCall(fetchMock).init.body as string);
    expect(body.event).toBe(0);
  });

  it("returns validation errors from the API", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { selector: ["Invalid selector."] },
        { status: 400, statusText: "Bad Request" },
      ),
    );

    const result = await update(533, "daily", { selector: "" });

    expect(result.error?.status).toBe(400);
    expect(result.error?.errors).toEqual({ selector: ["Invalid selector."] });
  });

  it("treats a 204 No Content as success with no body", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    const result = await update(533, "disabled", {});

    expect(result.data).toBeUndefined();
    expect(result.error).toBeUndefined();
  });
});

describe("when the access token is missing", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    mockGetAccessToken.mockResolvedValueOnce(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function expectAuthError(result: { data?: unknown; error?: unknown }) {
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.data).toBeUndefined();
    expect(result.error).toEqual({ status: 401, message: "Not authenticated" });
  }

  it("history returns a 401 error without calling fetch", async () => {
    expectAuthError(await history("https://example.com"));
  });

  it("scheduled returns a 401 error without calling fetch", async () => {
    expectAuthError(await scheduled("https://example.com"));
  });

  it("dispatch returns a 401 error without calling fetch", async () => {
    expectAuthError(
      await dispatch("daily", {
        site: "https://example.com",
        selector: "#main",
      }),
    );
  });

  it("update returns a 401 error without calling fetch", async () => {
    expectAuthError(await update(533, "disabled", {}));
  });
});

describe("when getAccessToken throws", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    mockGetAccessToken.mockRejectedValueOnce(
      new Error("no reply from service worker"),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function expectAuthError(result: { data?: unknown; error?: unknown }) {
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.data).toBeUndefined();
    expect(result.error).toEqual({ status: 401, message: "Not authenticated" });
  }

  it("history returns a 401 error without calling fetch", async () => {
    expectAuthError(await history("https://example.com"));
  });

  it("scheduled returns a 401 error without calling fetch", async () => {
    expectAuthError(await scheduled("https://example.com"));
  });

  it("dispatch returns a 401 error without calling fetch", async () => {
    expectAuthError(
      await dispatch("daily", {
        site: "https://example.com",
        selector: "#main",
      }),
    );
  });

  it("update returns a 401 error without calling fetch", async () => {
    expectAuthError(await update(533, "disabled", {}));
  });
});
