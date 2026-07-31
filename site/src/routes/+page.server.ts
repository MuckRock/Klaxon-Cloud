import { error } from "@sveltejs/kit";
import { loadAll } from "@klaxon/lib/api";
import { klaxonApi } from "$lib/server/api";

// Alerts are fetched in full (loadAll exhausts the cursor) so the counts we show
// are exact. Changes are cursor-paginated with no total, so the dashboard shows
// one page of the most recent ones — same page size as /activity.
const ALERTS_PER_PAGE = 100;
const CHANGES_PER_PAGE = 25;

export function load(event) {
  // Signed-out visitors get the marketing page, which needs no API calls.
  if (!event.locals.session) return { alerts: null, changes: null };

  const api = klaxonApi(event);

  // Both promises are returned *unawaited* so SvelteKit streams them: the
  // greeting renders immediately and the stats and feed resolve in over the
  // same response.
  async function loadAlerts() {
    const { data, error: err } = await loadAll(api.scheduled, {
      per_page: ALERTS_PER_PAGE,
    });

    if (err) return error(err.status, err.message);

    return data?.results ?? [];
  }

  async function loadChanges() {
    const { data, error: err } = await api.history({
      per_page: CHANGES_PER_PAGE,
    });

    if (err) return error(err.status, err.message);

    return data;
  }

  return {
    alerts: loadAlerts(),
    changes: loadChanges(),
  };
}
