import type { LayoutServerLoad } from './$types';

// Expose whether the request is authenticated. The user's display payload is
// kept in localStorage on the client, so it isn't part of server page data.
export const load: LayoutServerLoad = ({ locals }) => {
	return { authenticated: !!locals.session };
};
