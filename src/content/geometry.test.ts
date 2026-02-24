import { describe, it, expect, beforeEach } from 'vitest';
import {
	intersectionArea,
	resolveSelectionRect,
	rankByOverlap,
	dominantSelectors,
	collectVisibleElements
} from './geometry';

describe('intersectionArea', () => {
	it('returns 0 for rects side by side', () => {
		const a = { x: 0, y: 0, width: 10, height: 10 };
		const b = { x: 20, y: 0, width: 10, height: 10 };
		expect(intersectionArea(a, b)).toBe(0);
	});

	it('returns 0 for rects above and below', () => {
		const a = { x: 0, y: 0, width: 10, height: 10 };
		const b = { x: 0, y: 20, width: 10, height: 10 };
		expect(intersectionArea(a, b)).toBe(0);
	});

	it('returns inner area when one rect fully contains another', () => {
		const outer = { x: 0, y: 0, width: 100, height: 100 };
		const inner = { x: 10, y: 10, width: 20, height: 20 };
		expect(intersectionArea(outer, inner)).toBe(400);
	});

	it('returns correct area for partial corner overlap', () => {
		const a = { x: 0, y: 0, width: 10, height: 10 };
		const b = { x: 5, y: 5, width: 10, height: 10 };
		expect(intersectionArea(a, b)).toBe(25);
	});

	it('returns full area for identical rects', () => {
		const r = { x: 0, y: 0, width: 50, height: 50 };
		expect(intersectionArea(r, r)).toBe(2500);
	});

	it('returns 0 for rects that only touch edges', () => {
		const a = { x: 0, y: 0, width: 10, height: 10 };
		const b = { x: 10, y: 0, width: 10, height: 10 };
		expect(intersectionArea(a, b)).toBe(0);
	});

	it('returns 0 when one rect has zero width', () => {
		const a = { x: 0, y: 0, width: 0, height: 10 };
		const b = { x: 0, y: 0, width: 10, height: 10 };
		expect(intersectionArea(a, b)).toBe(0);
	});
});

describe('resolveSelectionRect', () => {
	it('handles top-left to bottom-right drag', () => {
		expect(resolveSelectionRect(10, 20, 100, 200)).toEqual({
			x: 10,
			y: 20,
			width: 90,
			height: 180
		});
	});

	it('handles bottom-right to top-left drag', () => {
		expect(resolveSelectionRect(100, 200, 10, 20)).toEqual({
			x: 10,
			y: 20,
			width: 90,
			height: 180
		});
	});

	it('handles zero-area single point', () => {
		expect(resolveSelectionRect(50, 50, 50, 50)).toEqual({
			x: 50,
			y: 50,
			width: 0,
			height: 0
		});
	});

	it('handles right-to-left horizontal drag', () => {
		expect(resolveSelectionRect(100, 50, 10, 50)).toEqual({
			x: 10,
			y: 50,
			width: 90,
			height: 0
		});
	});
});

describe('rankByOverlap', () => {
	it('returns empty array for empty element list', () => {
		const selection = { x: 0, y: 0, width: 100, height: 100 };
		expect(rankByOverlap([], selection)).toEqual([]);
	});

	it('returns empty array when all elements are outside selection', () => {
		const a = document.createElement('div');
		const b = document.createElement('div');
		const elements = [
			{ el: a, rect: { x: 200, y: 200, width: 10, height: 10 } },
			{ el: b, rect: { x: 300, y: 300, width: 10, height: 10 } }
		];
		const selection = { x: 0, y: 0, width: 50, height: 50 };
		expect(rankByOverlap(elements, selection)).toEqual([]);
	});

	it('returns single element fully inside selection', () => {
		const el = document.createElement('div');
		const elements = [{ el, rect: { x: 10, y: 10, width: 20, height: 20 } }];
		const selection = { x: 0, y: 0, width: 100, height: 100 };
		const result = rankByOverlap(elements, selection);
		expect(result).toHaveLength(1);
		expect(result[0].el).toBe(el);
		expect(result[0].area).toBe(400);
	});

	it('sorts elements descending by overlap area', () => {
		const small = document.createElement('div');
		const medium = document.createElement('div');
		const large = document.createElement('div');
		const elements = [
			{ el: small, rect: { x: 0, y: 0, width: 5, height: 10 } }, // area overlap: 50
			{ el: large, rect: { x: 0, y: 0, width: 20, height: 10 } }, // area overlap: 200
			{ el: medium, rect: { x: 0, y: 0, width: 10, height: 10 } } // area overlap: 100
		];
		const selection = { x: 0, y: 0, width: 100, height: 100 };
		const result = rankByOverlap(elements, selection);
		expect(result.map((r) => r.area)).toEqual([200, 100, 50]);
		expect(result.map((r) => r.el)).toEqual([large, medium, small]);
	});

	it('keeps elements with equal overlap', () => {
		const a = document.createElement('div');
		const b = document.createElement('div');
		const elements = [
			{ el: a, rect: { x: 0, y: 0, width: 10, height: 10 } },
			{ el: b, rect: { x: 20, y: 0, width: 10, height: 10 } }
		];
		const selection = { x: 0, y: 0, width: 100, height: 100 };
		const result = rankByOverlap(elements, selection);
		expect(result).toHaveLength(2);
		expect(result[0].area).toBe(100);
		expect(result[1].area).toBe(100);
	});
});

describe('dominantSelectors', () => {
	it('returns empty string for empty ranked list', () => {
		expect(dominantSelectors([], 10000)).toBe('');
	});

	it('returns selector for single dominant element', () => {
		const el = document.createElement('div');
		el.id = 'main';
		const ranked = [{ el, area: 5000 }];
		expect(dominantSelectors(ranked, 10000)).toBe('div#main');
	});

	it('returns comma-joined selectors for multiple dominant elements', () => {
		const a = document.createElement('div');
		a.id = 'a';
		const b = document.createElement('div');
		b.id = 'b';
		const ranked = [
			{ el: a, area: 5000 },
			{ el: b, area: 3000 }
		];
		expect(dominantSelectors(ranked, 10000)).toBe('div#a, div#b');
	});

	it('filters out elements below 10% threshold', () => {
		const big = document.createElement('p');
		big.id = 'big';
		const tiny = document.createElement('span');
		tiny.className = 'tiny';
		const ranked = [
			{ el: big, area: 5000 },
			{ el: tiny, area: 500 }
		];
		expect(dominantSelectors(ranked, 10000)).toBe('p#big');
	});

	it('caps at 5 selectors', () => {
		const elements = Array.from({ length: 7 }, (_, i) => {
			const el = document.createElement('div');
			el.id = `el${i}`;
			return { el, area: 2000 };
		});
		const result = dominantSelectors(elements, 10000);
		expect(result.split(', ')).toHaveLength(5);
	});

	it('returns empty string when selection area is zero', () => {
		const el = document.createElement('div');
		el.id = 'test';
		const ranked = [{ el, area: 100 }];
		expect(dominantSelectors(ranked, 0)).toBe('');
	});
});

describe('collectVisibleElements', () => {
	let host: HTMLDivElement;

	beforeEach(() => {
		document.body.innerHTML = '';
		host = document.createElement('div');
		host.id = 'klaxon-host';
		document.body.appendChild(host);
	});

	it('excludes elements inside host', () => {
		const hostChild = document.createElement('span');
		host.appendChild(hostChild);

		const content = document.createElement('div');
		content.id = 'content';
		document.body.appendChild(content);

		const result = collectVisibleElements(document.body, host);
		const els = result.map((r) => r.el);
		expect(els).toContain(content);
		expect(els).not.toContain(hostChild);
		expect(els).not.toContain(host);
	});

	it('returns empty array when body only has host', () => {
		const result = collectVisibleElements(document.body, host);
		expect(result).toEqual([]);
	});

	it('includes nested elements', () => {
		const outer = document.createElement('div');
		const inner = document.createElement('p');
		const leaf = document.createElement('span');
		inner.appendChild(leaf);
		outer.appendChild(inner);
		document.body.appendChild(outer);

		const result = collectVisibleElements(document.body, host);
		const els = result.map((r) => r.el);
		expect(els).toContain(outer);
		expect(els).toContain(inner);
		expect(els).toContain(leaf);
	});
});
