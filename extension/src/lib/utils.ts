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
        errors: resp.json ? await resp.json() : null,
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
    response.data = resp.json ? await resp.json() : {};
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

export function getRunLabel(run: Run): string {
  if (run.data?.timestamp) {
    return (
      parseTimestamp(run.data.timestamp)?.toLocaleString() ?? run.data.timestamp
    );
  }
  if (isEvent(run.event)) return getSiteLabel(run.event);
  return run.addon.name;
}

export function getSiteLabel(event: Event): string {
  if (event.parameters.title) return event.parameters.title;
  try {
    const { pathname, search, hash } = new URL(event.parameters.site);
    return `${pathname}${search}${hash}`;
  } catch {
    return event.parameters.site;
  }
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
