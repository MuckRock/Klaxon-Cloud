import { describe, expect, it, vi } from 'vitest';

// safeReturnTo resolves against publicOrigin, so stub the config. (The rest of
// auth.ts isn't exercised here, but importing it pulls env in transitively.)
vi.mock('./env', () => ({
	requireConfig: () => ({ publicOrigin: 'https://klaxon.app' }),
	redirectUri: () => 'https://klaxon.app/auth/callback',
	sessionSecret: () => 'test-secret'
}));

import { safeReturnTo } from './auth';

describe('safeReturnTo', () => {
	it('keeps same-origin absolute paths, preserving query and hash', () => {
		expect(safeReturnTo('/alerts')).toBe('/alerts');
		expect(safeReturnTo('/activity?filter=all#top')).toBe('/activity?filter=all#top');
	});

	it('falls back to / for empty or missing input', () => {
		expect(safeReturnTo(undefined)).toBe('/');
		expect(safeReturnTo(null)).toBe('/');
		expect(safeReturnTo('')).toBe('/');
	});

	it('rejects off-origin redirects, including parser-trick bypasses', () => {
		// Protocol-relative and the backslash/whitespace variants the browser's
		// URL parser collapses back into `//host`.
		expect(safeReturnTo('//evil.com')).toBe('/');
		expect(safeReturnTo('/\\evil.com')).toBe('/');
		expect(safeReturnTo('/\t/evil.com')).toBe('/');
		// Absolute URLs and non-http schemes.
		expect(safeReturnTo('https://evil.com')).toBe('/');
		expect(safeReturnTo('https://klaxon.app.evil.com')).toBe('/');
		expect(safeReturnTo('javascript:alert(1)')).toBe('/');
	});
});
