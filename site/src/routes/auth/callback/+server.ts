import { error, redirect, type RequestHandler } from '@sveltejs/kit';
import { completeLogin, safeReturnTo } from '$lib/server/auth';
import { clearPkce, readPkce } from '$lib/server/session';
import { USER_KEY, slimUser } from '$lib/user';

// OAuth redirect target. Verifies state against the PKCE cookie, exchanges the
// code for a session (auth tokens → httpOnly cookie), then hands the user
// payload to the client to stash in localStorage before navigating onward.
export const GET: RequestHandler = async ({ url, cookies }) => {
	const pkce = await readPkce(cookies);
	if (!pkce) redirect(302, '/auth/login');

	const oauthError = url.searchParams.get('error');
	if (oauthError) {
		clearPkce(cookies);
		error(400, `Authorization error: ${oauthError}`);
	}

	if (url.searchParams.get('state') !== pkce.state) {
		clearPkce(cookies);
		error(400, 'State mismatch');
	}

	const code = url.searchParams.get('code');
	if (!code) {
		clearPkce(cookies);
		error(400, 'No authorization code');
	}

	const userinfo = await completeLogin(cookies, code, pkce);
	clearPkce(cookies);

	// Re-validate even though beginLogin already sanitized it: the cookie is our
	// own, but this keeps the open-redirect guard local to where returnTo is used.
	const returnTo = safeReturnTo(pkce.returnTo);

	// Render a tiny handoff page: write the user payload to localStorage, then
	// navigate. Escape "<" so the JSON can't break out of the inline <script>.
	const escape = (value: string) => JSON.stringify(value).replace(/</g, '\\u003c');
	const userValue = escape(JSON.stringify(slimUser(userinfo)));
	// Encode for the noscript href too — returnTo is always a same-site path here,
	// but encoding prevents any quote from breaking out of the attribute.
	const returnToHref = returnTo.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
	const html = `<!doctype html>
<meta charset="utf-8" />
<title>Signing in…</title>
<script>
	try {
		localStorage.setItem(${escape(USER_KEY)}, ${userValue});
	} catch (e) {}
	location.replace(${escape(returnTo)});
</script>
<noscript>Signed in. <a href="${returnToHref}">Continue</a>.</noscript>`;

	return new Response(html, {
		headers: { 'content-type': 'text/html; charset=utf-8' }
	});
};
