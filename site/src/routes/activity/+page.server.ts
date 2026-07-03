import { error } from "@sveltejs/kit";
import { klaxonApi } from "$lib/server/api";

export const trailingSlash = "always";

// One page of changes. The Prev/Next links carry the cursor in the URL, so
// `load` renders whichever page the reader navigated to — plain links without
// JS, client-side navigation with it.
const PER_PAGE = 25;

export function load(event) {
  const api = klaxonApi(event);
  const cursor = event.url.searchParams.get("cursor") ?? undefined;
  // Changes-only is the default; `?all=true` opts into every run.
  const showAll = event.url.searchParams.get("all") === "true";

  // Return the promise *unawaited* so SvelteKit streams it: the page shell
  // renders immediately and the list resolves in over the same response. Only
  // `showAll` (needed to render the toggle) is resolved synchronously.
  async function loadChanges() {
    const { data, error: err } = await api.history({
      changesOnly: !showAll,
      per_page: PER_PAGE,
      cursor,
    });

    if (err) {
      return error(err.status, err.message);
    }

    return data;
  }

  return {
    changes: loadChanges(),
    showAll,
  };
}
