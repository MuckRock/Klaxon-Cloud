import { redirect, type Handle } from '@sveltejs/kit';
import { ensureFreshSession } from '$lib/server/auth';
import { readSession } from '$lib/server/session';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.session = null;

	const session = await readSession(event.cookies);
	if (session) {
		const fresh = await ensureFreshSession(session, event.cookies);
		if (fresh) event.locals.session = fresh;
	}

	// Guard the authenticated app group. Routes under (app) require a session;
	// everyone else (marketing landing, auth endpoints) is public.
	if (event.route.id?.startsWith('/(app)') && !event.locals.session) {
		const returnTo = event.url.pathname + event.url.search;
		redirect(302, `/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
	}

	return resolve(event);
};
