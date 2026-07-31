import { error } from "@sveltejs/kit";
import { klaxonApi } from "$lib/server/api";

export const trailingSlash = "always";

// One page of this alert's changes, paged by cursor like /activity.
const PER_PAGE = 25;

export async function load(event) {
  const id = Number(event.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) error(404, "No such alert");

  const api = klaxonApi(event);

  // The alert itself is awaited: it's the page's heading, and a missing or
  // forbidden alert has to become the response status rather than a rendered
  // page. Its changes stream in behind it.
  const { data: alert, error: err } = await api.alert(id);

  if (err) error(err.status, err.message);
  if (!alert) error(404, "No such alert");

  const cursor = event.url.searchParams.get("cursor") ?? undefined;

  async function loadChanges() {
    const { data, error: changesErr } = await api.history({
      event: id,
      per_page: PER_PAGE,
      cursor,
    });

    if (changesErr) return error(changesErr.status, changesErr.message);

    return data;
  }

  return {
    alert,
    changes: loadChanges(),
  };
}
