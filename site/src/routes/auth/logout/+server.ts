import { redirect, type RequestHandler } from "@sveltejs/kit";
import { logoutUrl } from "$lib/server/auth";
import { clearSession } from "$lib/server/session";

// Sign out: clear the local session cookie, then bounce through Squarelet's
// end-session endpoint so the IdP session ends too. POST-only so a prefetch or
// cross-site link can't silently log users out.
export const POST: RequestHandler = async ({ locals, cookies }) => {
  const url = logoutUrl(locals.session);
  clearSession(cookies);
  redirect(302, url);
};
