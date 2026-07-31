// Expose whether the request is authenticated. The user's display payload is
// kept in localStorage on the client, so it isn't part of server page data.
import { env } from "$env/dynamic/private";

// The accounts host is plain configuration, not a secret, so it's safe to hand
// to the client — the header links to the signed-in user's profile there. Read
// directly rather than through requireConfig() so an unconfigured deploy still
// renders the signed-out page.
const DEFAULT_ACCOUNTS_HOST = "https://accounts.muckrock.com/";

export function load({ locals }) {
  return {
    authenticated: !!locals.session,
    accountsHost: env.MUCKROCK_ACCOUNTS_HOST || DEFAULT_ACCOUNTS_HOST,
  };
}
