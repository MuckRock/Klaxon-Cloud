import type { APIResponse, Event, NumericRange, Page, Run } from "./types";

/**
 * Handle what comes back from the API and return either data or errors.
 *
 * Two generic types are passed through:
 *
 * - T is data from the API
 * - E is an error coming back from the API
 *
 * @param resp The fetch response from the API. If this is missing, fetch
 * threw an error and we should send a 500 to the user because the API is
 * probably down.
 */
export async function getApiResponse<T, E = unknown>(
  resp?: Response | void,
): Promise<APIResponse<T, E>> {
  const response: APIResponse<T, E> = {};

  if (!resp) {
    response.error = {
      status: 500,
      message: "API error",
    };

    return response;
  }

  if (isErrorCode(resp.status)) {
    try {
      response.error = {
        status: resp.status,
        message: resp.statusText,
        errors: resp.json ? ((await resp.json()) as E) : undefined,
      };
    } catch (error) {
      console.warn(error);
      // if we fail parsing the error's JSON,
      // just return the status
      response.error = {
        status: resp.status,
        message: resp.statusText,
        errors: undefined,
      };
    }

    return response;
  }

  // everything worked

  if (resp.status === 204) {
    // deletes return nothing
    return {};
  }

  try {
    // redactions return an empty 200 response
    response.data = resp.json ? ((await resp.json()) as T) : ({} as T);
  } catch (e) {
    if (e instanceof SyntaxError) {
      response.error = {
        status: 500,
        message: "The API returned invalid JSON",
      };
    } else {
      response.error = {
        status: 500,
        message: String(e),
      };
    }
  }
  return response;
}

export function emptyPage<T>(): Page<T> {
  return {
    next: null,
    previous: null,
    results: [],
  };
}

export function getRelativeTime(date: Date): string {
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const seconds = (date.getTime() - Date.now()) / 1000;

  const divisions: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.34524, "week"],
    [12, "month"],
    [Infinity, "year"],
  ];

  let value = seconds;
  for (const [amount, unit] of divisions) {
    if (Math.abs(value) < amount) {
      return rtf.format(Math.round(value), unit);
    }
    value /= amount;
  }
  return rtf.format(Math.round(value), "year");
}

export function formatTime(date: Date | string): string {
  return new Date(date).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function getRunLabel(run?: Run): string | null {
  if (!run) return null;
  if (isEvent(run.event)) return getSiteLabel(run.event);
  return run.addon.name;
}

export function getRunTime(run?: Run): Date | null {
  if (!run) return null;
  if (run.data?.timestamp) {
    // Our API returns timestamps in YYYYMMDDHHMMSS format
    const date = parseTimestamp(run.data.timestamp);
    if (date) return date;
    // Data in unexpected format, try to parse into a Date
    try {
      return new Date(run.data.timestamp);
    } catch {
      // Failed to parse the date, return null
      return null;
    }
  }
  // Fallback to date the run was created
  try {
    return new Date(run.created_at);
  } catch {
    return null;
  }
}

export function getSite(event?: Event | null | number): string | null {
  if (!event || !isEvent(event)) return null;
  try {
    const { pathname, search, hash } = new URL(event.parameters.site);
    return `${pathname}${search}${hash}`;
  } catch {
    return event.parameters.site;
  }
}

export function getSiteLabel(event?: Event | null | number): string | null {
  if (!event || !isEvent(event)) return null;
  if (event.parameters.title) return event.parameters.title;
  return getSite(event);
}

/** The selector value that means "watch the whole page". */
export const WHOLE_PAGE_SELECTOR = "*";

/**
 * Identifies Klaxon's requests in Squarelet/DocumentCloud logs and our own
 * observability. Note: browser `fetch` strips User-Agent as a forbidden
 * header, so this only takes effect in server/Worker contexts.
 */
export const USER_AGENT =
  "Klaxon-Cloud (+https://github.com/MuckRock/Klaxon-Cloud)";

/**
 * Whether an alert watches the whole page rather than a specific region.
 *
 * Whole-page alerts are saved with the "*" selector — the value the Add-On's
 * `soup.select("*")` expects (an empty selector throws on the backend). We also
 * treat an empty/whitespace selector as whole-page so alerts saved before "*"
 * was standardized still read correctly.
 */
export function isWholePage(selector: string | null | undefined): boolean {
  const trimmed = selector?.trim();
  return !trimmed || trimmed === WHOLE_PAGE_SELECTOR;
}

export function isErrorCode(status: number): status is NumericRange<400, 599> {
  return status >= 400 && status <= 599;
}

export function isRedirectCode(
  status: number,
): status is NumericRange<300, 308> {
  return status >= 300 && status <= 308;
}

export function isEvent(
  event: Event | number | null | undefined,
): event is Event {
  return Boolean(event) && typeof event === "object";
}

/**
 * Parse a compact `YYYYMMDDHHMMSS` timestamp (e.g. "20260609192941")
 * into a Date. Returns null if the string isn't 14 digits or the parts
 * don't form a real date.
 */
export function parseTimestamp(timestamp: string): Date | null {
  if (!/^\d{14}$/.test(timestamp)) return null;

  const year = Number(timestamp.slice(0, 4));
  const month = Number(timestamp.slice(4, 6)) - 1; // Date months are 0-indexed
  const day = Number(timestamp.slice(6, 8));
  const hours = Number(timestamp.slice(8, 10));
  const minutes = Number(timestamp.slice(10, 12));
  const seconds = Number(timestamp.slice(12, 14));

  const date = new Date(Date.UTC(year, month, day, hours, minutes, seconds));

  // reject values that rolled over (e.g. month 13 → next year)
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month) {
    return null;
  }

  return date;
}
