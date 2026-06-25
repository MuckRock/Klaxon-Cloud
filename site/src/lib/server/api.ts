// The web app's transport layer for the DocumentCloud add-on API. Mirrors the
// extension's api.ts, but fetches server-side (no CORS proxy needed) with the
// session's DocumentCloud JWT. Request shaping comes from the shared
// @klaxon/lib/api builders.
import type { RequestEvent } from '@sveltejs/kit';
import {
	eventPayload,
	eventsCreateUrl,
	eventsUrl,
	eventUrl,
	runsUrl,
	type EventQuery,
	type RunQuery
} from '@klaxon/lib/api';
import { getApiResponse } from '@klaxon/lib/utils';
import type {
	AddOnSchedule,
	APIResponse,
	Event,
	KlaxonParams,
	Page,
	Run,
	ValidationError
} from '@klaxon/lib/types';
import { requireConfig } from './env';

/** A Klaxon API client bound to one request's session + fetch. */
export interface KlaxonApi {
	history(query: RunQuery): Promise<APIResponse<Page<Run>, unknown>>;
	scheduled(query: EventQuery): Promise<APIResponse<Page<Event>, unknown>>;
	dispatch(
		schedule: AddOnSchedule,
		parameters: KlaxonParams
	): Promise<APIResponse<Event, ValidationError>>;
	update(
		eventId: number,
		schedule: AddOnSchedule,
		parameters: Partial<KlaxonParams>
	): Promise<APIResponse<Event, ValidationError>>;
}

const UNAUTHENTICATED = { error: { status: 401, message: 'Not authenticated' } } as const;

/**
 * Build a Klaxon API client for the current request. Reads the DocumentCloud
 * JWT from `locals.session` (already refreshed in hooks) and uses the event's
 * `fetch` so SvelteKit can track the dependency.
 */
export function klaxonApi(event: RequestEvent): KlaxonApi {
	const { apiUrl, klaxonId } = requireConfig();
	const token = event.locals.session?.jwt.access_token ?? null;

	// Don't send cookies — the bearer token is the only credential, and a
	// session cookie would trip DRF's CSRF origin check (see oidc helpers).
	async function send(url: URL, init: RequestInit = {}): Promise<Response | void> {
		if (!token) return undefined;
		try {
			return await event.fetch(url, {
				...init,
				credentials: 'omit',
				headers: {
					Accept: 'application/json',
					Authorization: `Bearer ${token}`,
					...init.headers
				}
			});
		} catch (err) {
			console.warn('[klaxon] API fetch failed:', err);
			return undefined; // getApiResponse maps this to a 500
		}
	}

	async function writeEvent(
		url: URL,
		method: 'POST' | 'PATCH',
		schedule: AddOnSchedule,
		parameters: Partial<KlaxonParams>
	): Promise<APIResponse<Event, ValidationError>> {
		if (!token) return UNAUTHENTICATED;
		const resp = await send(url, {
			method,
			body: JSON.stringify(eventPayload(klaxonId, schedule, parameters)),
			headers: { 'Content-type': 'application/json' }
		});
		return getApiResponse<Event, ValidationError>(resp);
	}

	return {
		async history(query) {
			if (!token) return UNAUTHENTICATED;
			return getApiResponse<Page<Run>>(await send(runsUrl(apiUrl, klaxonId, query)));
		},
		async scheduled(query) {
			if (!token) return UNAUTHENTICATED;
			return getApiResponse<Page<Event>>(await send(eventsUrl(apiUrl, klaxonId, query)));
		},
		dispatch(schedule, parameters) {
			return writeEvent(eventsCreateUrl(apiUrl), 'POST', schedule, parameters);
		},
		update(eventId, schedule, parameters) {
			return writeEvent(eventUrl(apiUrl, eventId), 'PATCH', schedule, parameters);
		}
	};
}
