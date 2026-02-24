import Sidebar from './Sidebar.svelte';
import { mount, unmount } from 'svelte';
import { getCanonicalURL } from './url';
import { resolveTarget } from './selector';
import {
	resolveSelectionRect,
	collectVisibleElements,
	rankByOverlap,
	dominantSelectors
} from './geometry';

declare global {
	interface Window {
		_klaxonInject?: boolean;
	}
}

const DRAG_COLOR = 'rgba(255, 11, 58, 0.15)';
const DRAG_BORDER = 'rgba(255, 11, 58, 0.6)';
const SIDEBAR_WIDTH = '300px';
const HOST_ID = 'klaxon-host';
const STYLE_ID = 'klaxon-css-inject';
const MIN_DRAG_PX = 5;
const CANDIDATE_CLS = 'klaxon-selection-candidate';
const SELECTED_CLS = 'klaxon-selected';

(function () {
	if (window._klaxonInject === true) {
		alert('The Klaxon bookmarklet is already active on this page.');
		return;
	}
	window._klaxonInject = true;
	console.log('[klaxon booted]');

	// --- DOM scaffolding ---

	const host = document.createElement('div');
	host.id = HOST_ID;
	document.body.appendChild(host);

	const shadow = host.attachShadow({ mode: 'open' });
	const mountPoint = document.createElement('div');
	shadow.appendChild(mountPoint);

	const prevMarginRight = document.body.style.marginRight;
	document.body.style.marginRight = SIDEBAR_WIDTH;

	const highlightStyles = document.createElement('style');
	highlightStyles.id = STYLE_ID;
	highlightStyles.innerHTML =
		'body { cursor: crosshair !important; }\n' +
		'.' + CANDIDATE_CLS + ' { background-color: rgba(255, 11, 58, 0.3) !important; }\n' +
		'.' + SELECTED_CLS + ' { background-color: rgba(58, 255, 11, 0.3) !important; }\n';
	document.head.appendChild(highlightStyles);

	// --- Drag overlay ---

	const dragOverlay = document.createElement('div');
	dragOverlay.style.cssText =
		'position:fixed;pointer-events:none;z-index:2147483646;' +
		'background:' + DRAG_COLOR + ';border:2px solid ' + DRAG_BORDER + ';display:none;';
	document.body.appendChild(dragOverlay);

	// --- Highlight styling ---

	let isDragging = false;
	let dragStartX = 0;
	let dragStartY = 0;
	function clearClass(cls: string) {
		for (const el of document.querySelectorAll('.' + cls)) {
			el.classList.remove(cls);
		}
	}

	function setCandidate(selector: string) {
		const next = new Set(selector ? document.querySelectorAll(selector) : []);
		for (const el of document.querySelectorAll('.' + CANDIDATE_CLS)) {
			if (!next.has(el)) el.classList.remove(CANDIDATE_CLS);
		}
		for (const el of next) {
			el.classList.add(CANDIDATE_CLS);
		}
	}

	// --- Reactive state & Svelte mount ---

	let currentSelector = $state('');
	let currentMatchText = $state('');
	let lockedSelector = $state('');
	let lockedMatchText = $state('');

	const sidebar = mount(Sidebar, {
		target: mountPoint,
		props: {
			get selector() {
				return currentSelector;
			},
			get matchText() {
				return currentMatchText;
			},
			get lockedSelector() {
				return lockedSelector;
			},
			get lockedMatchText() {
				return lockedMatchText;
			},
			url: getCanonicalURL(),
			onClose: cleanup
		}
	});

	// --- Event handlers ---

	function onMouseMove(evt: MouseEvent) {
		if (!window._klaxonInject) return;
		if (isDragging) {
			const r = resolveSelectionRect(dragStartX, dragStartY, evt.clientX, evt.clientY);
			dragOverlay.style.left = r.x + 'px';
			dragOverlay.style.top = r.y + 'px';
			dragOverlay.style.width = r.width + 'px';
			dragOverlay.style.height = r.height + 'px';

			// Live highlight elements that pass selection criteria
			const elements = collectVisibleElements(document.body, host);
			const ranked = rankByOverlap(elements, r);
			const selArea = r.width * r.height;
			const selector = dominantSelectors(ranked, selArea);
			setCandidate(selector);
			currentSelector = selector;
			return;
		}
		const target = resolveTarget(evt, host);
		if (!target) return;
		currentSelector = target.selector;
		currentMatchText = target.matchText;
		setCandidate(target.selector);
	}

	function onMouseDown(evt: MouseEvent) {
		if (!window._klaxonInject) return;
		if (host.contains(evt.target as Node)) return;
		evt.preventDefault();
		isDragging = true;
		dragStartX = evt.clientX;
		dragStartY = evt.clientY;
		document.body.style.userSelect = 'none';
		dragOverlay.style.display = 'block';
		dragOverlay.style.left = evt.clientX + 'px';
		dragOverlay.style.top = evt.clientY + 'px';
		dragOverlay.style.width = '0px';
		dragOverlay.style.height = '0px';
	}

	function onMouseUp(evt: MouseEvent) {
		if (!isDragging) return;
		isDragging = false;
		dragOverlay.style.display = 'none';
		document.body.style.userSelect = '';

		const sel = resolveSelectionRect(dragStartX, dragStartY, evt.clientX, evt.clientY);
		if (sel.width < MIN_DRAG_PX && sel.height < MIN_DRAG_PX) {
			setCandidate('');
			return;
		}

		const elements = collectVisibleElements(document.body, host);
		const ranked = rankByOverlap(elements, sel);
		const selArea = sel.width * sel.height;
		const selector = dominantSelectors(ranked, selArea);
		setCandidate('');
		if (!selector) return;

		currentSelector = selector;
		const matched = document.querySelectorAll(selector);
		const texts = Array.from(matched).map(
			(m) => m.textContent?.trim().slice(0, 200) ?? ''
		);
		currentMatchText = texts.filter(Boolean).join(' | ');
		lockedSelector = selector;
		lockedMatchText = currentMatchText;
		clearClass(SELECTED_CLS);
		for (const el of matched) el.classList.add(SELECTED_CLS);
	}

	function onClick(evt: MouseEvent) {
		if (!window._klaxonInject) return;
		evt.preventDefault();
		const target = resolveTarget(evt, host);
		if (!target) return;
		currentSelector = target.selector;
		currentMatchText = target.matchText;
		lockedSelector = target.selector;
		lockedMatchText = target.matchText;
		setCandidate('');
		clearClass(SELECTED_CLS);
		for (const el of document.querySelectorAll(target.selector)) {
			el.classList.add(SELECTED_CLS);
		}
	}

	window.addEventListener('mousemove', onMouseMove);
	window.addEventListener('mousedown', onMouseDown);
	window.addEventListener('mouseup', onMouseUp);
	window.addEventListener('click', onClick);

	// --- Teardown ---

	function cleanup() {
		window.removeEventListener('mousemove', onMouseMove);
		window.removeEventListener('mousedown', onMouseDown);
		window.removeEventListener('mouseup', onMouseUp);
		window.removeEventListener('click', onClick);
		clearClass(CANDIDATE_CLS);
		clearClass(SELECTED_CLS);
		document.body.style.marginRight = prevMarginRight;
		highlightStyles.remove();
		dragOverlay.remove();
		unmount(sidebar);
		host.remove();
		window._klaxonInject = false;
		console.log('Closed Klaxon');
	}
})();
