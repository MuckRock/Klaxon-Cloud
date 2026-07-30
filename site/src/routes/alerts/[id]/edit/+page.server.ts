import { error, fail, redirect } from "@sveltejs/kit";
import { schedules } from "@klaxon/lib/api";
import type {
  AddOnSchedule,
  KlaxonParams,
  ValidationError,
} from "@klaxon/lib/types";
import { klaxonApi } from "$lib/server/api";

export const trailingSlash = "always";

function alertId(raw: string | undefined): number {
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id <= 0) error(404, "No such alert");
  return id;
}

export async function load(event) {
  const id = alertId(event.params.id);
  const api = klaxonApi(event);

  const { data: alert, error: err } = await api.alert(id);

  if (err) error(err.status, err.message);
  if (!alert) error(404, "No such alert");

  return { alert };
}

export const actions = {
  default: async (event) => {
    const id = alertId(event.params.id);
    const api = klaxonApi(event);
    const form = await event.request.formData();

    const schedule = String(form.get("schedule") ?? "");
    const title = String(form.get("title") ?? "").trim();
    const slackWebhook = String(form.get("slack_webhook") ?? "").trim();

    // Echoed back on failure so the form re-renders what was typed. Every
    // failure returns this one shape, so the page sees a single `errors` map
    // rather than a union of per-branch shapes.
    const values = { schedule, title, slack_webhook: slackWebhook };
    const invalid = (errors: ValidationError, status = 400, message?: string) =>
      fail(status, { values, errors, message });

    if (!schedules.includes(schedule as AddOnSchedule)) {
      return invalid({ schedule: ["Choose how often Klaxon should check."] });
    }

    if (slackWebhook && !URL.canParse(slackWebhook)) {
      return invalid({
        slack_webhook: ["Enter a full URL, or leave this empty."],
      });
    }

    // `parameters` is a JSON blob the API replaces wholesale, so re-read the
    // alert and spread its existing values: `site`, `selector` and
    // `filter_selector` are only editable in the extension's picker and would
    // otherwise be dropped by this PATCH.
    const { data: alert, error: readErr } = await api.alert(id);

    if (readErr) error(readErr.status, readErr.message);
    if (!alert) error(404, "No such alert");

    // Empty means "cleared", not "unchanged" — both fields are optional, so
    // omit them rather than writing empty strings the extension would render.
    const parameters: KlaxonParams = {
      ...alert.parameters,
      title: title || undefined,
      slack_webhook: slackWebhook || undefined,
    };

    const { error: writeErr } = await api.update(
      id,
      schedule as AddOnSchedule,
      parameters,
    );

    if (writeErr) {
      // The API returns per-field messages for a rejected payload; fall back to
      // a form-level message when it doesn't.
      return invalid(
        writeErr.errors ?? {},
        writeErr.status,
        writeErr.message || "Couldn’t save this alert. Try again.",
      );
    }

    redirect(303, `/alerts/${id}/`);
  },
};
