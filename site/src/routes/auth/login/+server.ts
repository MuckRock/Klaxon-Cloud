import { redirect, type RequestHandler } from '@sveltejs/kit';
import { beginLogin } from '$lib/server/auth';

// Initiate sign-in. `?create=1` opens the signup page first; `?returnTo=` is
// where to land after a successful callback (defaults to the alerts dashboard).
export const GET: RequestHandler = async ({ url, cookies }) => {
	const returnTo = url.searchParams.get('returnTo') || '/';
	const action = url.searchParams.get('create') ? 'create' : 'login';
	const start = await beginLogin(cookies, returnTo, action);
	redirect(302, start);
};
