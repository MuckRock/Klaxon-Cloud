import * as Sentry from "@sentry/sveltekit";
import { ENVIRONMENT, SENTRY_DSN, SENTRY_ENABLED } from "$lib/telemetry";

if (SENTRY_ENABLED) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    // Errors only for now — no tracing / replay.
    // Revisit once we understand baseline volume.
    tracesSampleRate: 0,
  });
}

export const handleError = Sentry.handleErrorWithSentry();
