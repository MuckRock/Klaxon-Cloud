import type { APIError } from "./types";
import type { Canvas } from "./canvas.svelte";
import { getRouter } from "./router.svelte";
import { getToaster } from "./toaster.svelte";

type Router = ReturnType<typeof getRouter>;
type Toaster = ReturnType<typeof getToaster>;

/**
 * Shared error tail for saving an alert: log the raw error and surface its
 * message as a toast. The caller decides what to do next (stay on the form,
 * navigate back, etc.) — only the logging + toast are shared.
 */
export function reportSaveError(toaster: Toaster, error: APIError<unknown>) {
  console.error("Save alert failed:", error);
  toaster.error(error.message ?? "Failed to save alert.");
}

/**
 * Shared success tail for saving an alert: clear the picker selection, show a
 * success toast, and land on the changes list. Used by both SaveAlert (the
 * authenticated path) and SignIn (after the sign-in interstitial completes the
 * deferred save), so the two stay in sync. Each caller resolves its contexts at
 * component init and passes the instances in.
 */
export function completeSave(ctx: {
  canvas: Canvas;
  toaster: Toaster;
  router: Router;
}) {
  ctx.canvas.clearSelection();
  ctx.toaster.success("Alert saved successfully!");
  // The save is done — dump history so Back can't return to the form and
  // resubmit it.
  ctx.router.navigate("listAlerts", undefined, { reset: true });
}
