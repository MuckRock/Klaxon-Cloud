// The edit action's job is to change schedule/site/title/slack_webhook
// *without* disturbing `selector`/`filter_selector`, which only the extension's
// picker can set and which this PATCH would otherwise drop (the API replaces
// `parameters` wholesale). These tests pin that down, plus the validation that
// keeps a bad payload from reaching the API at all.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { isRedirect } from "@sveltejs/kit";
import type { Event } from "@klaxon/lib/types";

const alert = vi.fn();
const update = vi.fn();

vi.mock("$lib/server/api", () => ({
  klaxonApi: () => ({ alert, update }),
}));

const { actions } = await import("./+page.server");

// A weekly alert (event 3) watching one region of a page, with both optional
// fields already set.
const existing = {
  id: 7,
  event: 3,
  parameters: {
    site: "https://example.com/docket",
    selector: "#main .docket",
    filter_selector: ".ads",
    title: "Docket",
    slack_webhook: "https://hooks.slack.com/services/T/B/C",
  },
} as unknown as Event;

function submit(fields: Record<string, string>) {
  const body = new FormData();
  // The form always posts a `site` and a `selector`, so default both to what the
  // alert already holds; the tests about those two pass their own.
  const posted = {
    site: existing.parameters.site,
    selector: existing.parameters.selector,
    ...fields,
  };
  for (const [key, value] of Object.entries(posted)) body.set(key, value);

  return {
    params: { id: "7" },
    request: new Request("http://localhost/alerts/7/edit/", {
      method: "POST",
      body,
    }),
  };
}

/** Run the action, returning either its ActionFailure or the thrown redirect. */
async function run(event: ReturnType<typeof submit>) {
  try {
    // The action's real event carries far more than the action reads.
    return await actions.default(event as never);
  } catch (err) {
    if (isRedirect(err)) return err;
    throw err;
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  alert.mockResolvedValue({ data: existing });
  update.mockResolvedValue({ data: existing });
});

describe("edit alert action", () => {
  it("preserves the picker's selectors while changing the schedule", async () => {
    const result = await run(
      submit({ schedule: "daily", title: "Docket", slack_webhook: "" }),
    );

    expect(update).toHaveBeenCalledWith(7, "daily", {
      site: "https://example.com/docket",
      selector: "#main .docket",
      filter_selector: ".ads",
      title: "Docket",
      slack_webhook: undefined,
    });
    expect(isRedirect(result)).toBe(true);
  });

  it("redirects back to the alert on success", async () => {
    const result = await run(submit({ schedule: "weekly", title: "Docket" }));

    expect(isRedirect(result) && result.location).toBe("/alerts/7/");
  });

  it("points the alert at a new URL, keeping the picker's selectors", async () => {
    await run(
      submit({ schedule: "weekly", site: "https://example.com/other-docket" }),
    );

    expect(update).toHaveBeenCalledWith(
      7,
      "weekly",
      expect.objectContaining({
        site: "https://example.com/other-docket",
        selector: "#main .docket",
        filter_selector: ".ads",
      }),
    );
  });

  it("trims surrounding whitespace off the URL", async () => {
    await run(
      submit({ schedule: "weekly", site: "  https://example.com/docket  " }),
    );

    expect(update).toHaveBeenCalledWith(
      7,
      "weekly",
      expect.objectContaining({ site: "https://example.com/docket" }),
    );
  });

  it("rejects an empty URL without calling the API", async () => {
    const result = await run(submit({ schedule: "weekly", site: "  " }));

    expect(update).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: 400,
      data: { errors: { site: expect.any(Array) } },
    });
  });

  it("rejects a URL that isn't a full address", async () => {
    const result = await run(
      submit({ schedule: "weekly", site: "example.com" }),
    );

    expect(update).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: 400,
      data: { errors: { site: expect.any(Array) } },
    });
  });

  it("rejects a URL that isn't fetchable over http", async () => {
    // `URL.canParse` accepts any scheme, but the add-on can only fetch http(s).
    const result = await run(
      submit({ schedule: "weekly", site: "javascript:alert(1)" }),
    );

    expect(update).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: 400,
      data: { errors: { site: expect.any(Array) } },
    });
  });

  it("saves a hand-edited selector, keeping the filter the picker recorded", async () => {
    await run(submit({ schedule: "weekly", selector: "#main table.results" }));

    expect(update).toHaveBeenCalledWith(
      7,
      "weekly",
      expect.objectContaining({
        selector: "#main table.results",
        filter_selector: ".ads",
      }),
    );
  });

  it("trims surrounding whitespace off the selector", async () => {
    await run(submit({ schedule: "weekly", selector: "  #main .docket  " }));

    expect(update).toHaveBeenCalledWith(
      7,
      "weekly",
      expect.objectContaining({ selector: "#main .docket" }),
    );
  });

  it("reads a cleared selector as watching the whole page", async () => {
    // Empty is what the textarea posts for "the entire page", but the Add-On's
    // `soup.select` throws on it — `*` is the value that means the same thing.
    await run(submit({ schedule: "weekly", selector: "   " }));

    expect(update).toHaveBeenCalledWith(
      7,
      "weekly",
      expect.objectContaining({ selector: "*" }),
    );
  });

  it("clears optional fields submitted empty rather than writing blanks", async () => {
    await run(submit({ schedule: "weekly", title: "  ", slack_webhook: "" }));

    expect(update).toHaveBeenCalledWith(
      7,
      "weekly",
      expect.objectContaining({ title: undefined, slack_webhook: undefined }),
    );
  });

  it("trims surrounding whitespace off the title", async () => {
    await run(submit({ schedule: "weekly", title: "  Docket  " }));

    expect(update).toHaveBeenCalledWith(
      7,
      "weekly",
      expect.objectContaining({ title: "Docket" }),
    );
  });

  it("accepts disabling the alert", async () => {
    await run(submit({ schedule: "disabled", title: "Docket" }));

    expect(update).toHaveBeenCalledWith(
      7,
      "disabled",
      expect.objectContaining({ selector: "#main .docket" }),
    );
  });

  it("rejects an unknown schedule without calling the API", async () => {
    const result = await run(submit({ schedule: "fortnightly" }));

    expect(update).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: 400,
      data: { errors: { schedule: expect.any(Array) } },
    });
  });

  it("rejects a malformed slack webhook without calling the API", async () => {
    const result = await run(
      submit({ schedule: "weekly", slack_webhook: "not-a-url" }),
    );

    expect(update).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: 400,
      data: { errors: { slack_webhook: expect.any(Array) } },
    });
  });

  it("echoes the submitted values back on failure so the form repopulates", async () => {
    const result = await run(
      submit({ schedule: "bogus", title: "Docket", slack_webhook: "" }),
    );

    expect(result).toMatchObject({
      data: { values: { schedule: "bogus", title: "Docket" } },
    });
  });

  it("surfaces the API's per-field validation errors", async () => {
    update.mockResolvedValue({
      error: {
        status: 400,
        message: "Bad Request",
        errors: { slack_webhook: ["Enter a valid URL."] },
      },
    });

    const result = await run(submit({ schedule: "weekly", title: "Docket" }));

    expect(result).toMatchObject({
      status: 400,
      data: { errors: { slack_webhook: ["Enter a valid URL."] } },
    });
  });

  it("falls back to a form-level message when the API sends no field errors", async () => {
    update.mockResolvedValue({ error: { status: 500, message: "" } });

    const result = await run(submit({ schedule: "weekly", title: "Docket" }));

    expect(result).toMatchObject({
      status: 500,
      data: { message: "Couldn’t save this alert. Try again." },
    });
  });
});
