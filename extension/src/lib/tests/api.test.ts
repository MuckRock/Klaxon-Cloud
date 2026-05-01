import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { dispatch, eventValues, history, scheduled, update } from "../api";
import {
  event as eventFixture,
  eventsList,
  scheduled as scheduledFixture,
} from "../../test/fixtures/events";
import { runs } from "../../test/fixtures/runs";

vi.mock("../auth.svelte", () => ({
  getAccessToken: vi.fn(async () => "test-token"),
}));

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
    const result = await history("https://github.com/muckrock/klaxon");

    expect(fetchMock).toHaveBeenCalledOnce();
    const { url, init } = lastFetchCall(fetchMock);
    expect(url.toString()).toBe(
      `${API_URL}addon_runs/?addon=${KLAXON_ID}&site=${encodeURI("https://github.com/muckrock/klaxon")}`,
    );
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

  it("requests addon_events with the expanded addon and bearer token", async () => {
    const result = await scheduled();

    expect(fetchMock).toHaveBeenCalledOnce();
    const { url, init } = lastFetchCall(fetchMock);
    expect(url.toString()).toBe(
      `${API_URL}addon_events/?expand=addon&addon=${KLAXON_ID}`,
    );
    expect(init.headers).toMatchObject({
      Accept: "application/json",
      Authorization: "Bearer test-token",
    });
    expect(result.data).toEqual(scheduledFixture);
  });

  it("appends cursor and per_page when supplied", async () => {
    await scheduled({ cursor: "next-page", per_page: 10 });

    const { url } = lastFetchCall(fetchMock);
    expect(url.searchParams.get("cursor")).toBe("next-page");
    expect(url.searchParams.get("per_page")).toBe("10");
  });

  it("uses an injected fetch over the global one", async () => {
    const injected = vi.fn(async () => jsonResponse(eventsList));

    const result = await scheduled({}, injected);

    expect(injected).toHaveBeenCalledOnce();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.data).toEqual(eventsList);
  });

  it("returns a 500 when fetch rejects", async () => {
    fetchMock.mockRejectedValueOnce(new Error("boom"));

    const result = await scheduled();

    expect(result.error?.status).toBe(500);
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
