import { redirect, type Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import {
  handleErrorWithSentry,
  initCloudflareSentryHandle,
  sentryHandle,
} from "@sentry/sveltekit";
import { ensureFreshSession } from "$lib/server/auth";
import { readSession } from "$lib/server/session";
import { ENVIRONMENT, SENTRY_DSN, SENTRY_ENABLED } from "$lib/telemetry";

const appHandle: Handle = async ({ event, resolve }) => {
  event.locals.session = null;

  const session = await readSession(event.cookies);
  if (session) {
    const fresh = await ensureFreshSession(session, event.cookies);
    if (fresh) event.locals.session = fresh;
  }

  // Guard the authenticated app group. Routes under (app) require a session;
  // everyone else (marketing landing, auth endpoints) is public.
  if (event.route.id?.startsWith("/(app)") && !event.locals.session) {
    const returnTo = event.url.pathname + event.url.search;
    redirect(302, `/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  return resolve(event);
};

export const handle: Handle = SENTRY_ENABLED
  ? sequence(
      initCloudflareSentryHandle({
        dsn: SENTRY_DSN,
        environment: ENVIRONMENT,
        // Errors only — no perf/tracing spans by default. Turn up later once
        // we've seen how noisy the baseline is (see issue #110 discussion).
        tracesSampleRate: 0,
      }),
      sentryHandle(),
      appHandle,
    )
  : appHandle;

export const handleError = handleErrorWithSentry();
