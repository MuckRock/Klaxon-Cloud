import { selectorForElement } from './selector';

export interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}

/** Area of the overlap between two rectangles, or 0 if they don't overlap. */
export function intersectionArea(a: Rect, b: Rect): number {
	const overlapX = Math.max(
		0,
		Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
	);
	const overlapY = Math.max(
		0,
		Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
	);
	return overlapX * overlapY;
}

/** Normalize drag start/end into a proper Rect (handles any drag direction). */
export function resolveSelectionRect(
	startX: number,
	startY: number,
	endX: number,
	endY: number
): Rect {
	return {
		x: Math.min(startX, endX),
		y: Math.min(startY, endY),
		width: Math.abs(endX - startX),
		height: Math.abs(endY - startY)
	};
}

/** Sort elements descending by overlap area, filtering out zero-overlap. */
export function rankByOverlap(
	elements: { el: Element; rect: Rect }[],
	selection: Rect
): { el: Element; area: number }[] {
	return elements
		.map(({ el, rect }) => ({ el, area: intersectionArea(rect, selection) }))
		.filter(({ area }) => area > 0)
		.sort((a, b) => b.area - a.area);
}

/**
 * Comma-joined CSS selectors for elements whose overlap is ≥10% of the
 * selection area. Capped at 5 selectors.
 */
export function dominantSelectors(
	ranked: { el: Element; area: number }[],
	selectionArea: number
): string {
	if (selectionArea === 0) return '';
	const threshold = selectionArea * 0.1;
	return ranked
		.filter(({ area }) => area >= threshold)
		.slice(0, 5)
		.map(({ el }) => selectorForElement(el))
		.join(', ');
}

/** All elements under root excluding the host subtree, each with its bounding rect. */
export function collectVisibleElements(
	root: Element,
	host: Element
): { el: Element; rect: Rect }[] {
	const all = root.querySelectorAll('*');
	const result: { el: Element; rect: Rect }[] = [];
	for (const el of all) {
		if (el === host || host.contains(el)) continue;
		const r = el.getBoundingClientRect();
		result.push({ el, rect: { x: r.x, y: r.y, width: r.width, height: r.height } });
	}
	return result;
}
