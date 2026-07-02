import { error } from "@sveltejs/kit";
import { loadAll } from "@klaxon/lib/api";
import { klaxonApi } from "$lib/server/api";

export const trailingSlash = "always";

// A larger page keeps the number of round-trips down; loadAll follows the
// cursor until it collects everything (or hits its result cap).
const PER_PAGE = 100;

// The alerts view groups every watched page by domain, so the grouping is only
// correct with the complete set — a single page would silently drop domains
// whose alerts fall on later pages. loadAll exhausts the cursor for us.
export async function load(event) {
  const api = klaxonApi(event);

  const { data, error: err } = await loadAll(api.scheduled, {
    per_page: PER_PAGE,
  });

  if (err) return error(err.status, err.message);

  return {
    alerts: data,
  };
}
