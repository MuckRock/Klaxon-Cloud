import { error } from "@sveltejs/kit";
import { klaxonApi } from "$lib/server/api";

export const trailingSlash = "always";

export async function load(event) {
  const api = klaxonApi(event);

  const { data, error: err } = await api.history({ changesOnly: true });

  if (err) {
    return error(err.status, err.message);
  }

  return {
    changes: data,
  };
}
