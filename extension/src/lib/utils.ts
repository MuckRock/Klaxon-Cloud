import type { APIResponse, NumericRange } from "./types";

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

export function isErrorCode(status: number): status is NumericRange<400, 599> {
  return status >= 400 && status <= 599;
}

export function isRedirectCode(
  status: number,
): status is NumericRange<300, 308> {
  return status >= 300 && status <= 308;
}
