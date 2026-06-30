import { error, redirect } from "@sveltejs/kit";
import { klaxonApi } from "$lib/server/api";

export const trailingSlash = "always";

export async function load(event) {
  const api = klaxonApi(event);

  // get alerts for all sites
  const { data, error: err } = await api.scheduled({});

  if (err) {
    return error(err.status, err.message);
  }

  return {
    alerts: data,
  };
}
