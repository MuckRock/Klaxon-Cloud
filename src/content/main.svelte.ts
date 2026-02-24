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

const HOVER_COLOR = 'rgba(255, 11, 58, 0.3)';
const SAVED_COLOR = 'rgba(58, 255, 11, 0.3)';
const DRAG_COLOR = 'rgba(255, 11, 58, 0.15)';
const DRAG_BORDER = 'rgba(255, 11, 58, 0.6)';
const SIDEBAR_WIDTH = '300px';
const HOST_ID = 'klaxon-host';
const STYLE_ID = 'klaxon-css-inject';
const MIN_DRAG_PX = 5;

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
	document.head.appendChild(highlightStyles);

	// --- Drag overlay ---

	const dragOverlay = document.createElement('div');
	dragOverlay.style.cssText =
		'position:fixed;pointer-events:none;z-index:2147483646;' +
		'background:' + DRAG_COLOR + ';border:2px solid ' + DRAG_BORDER + ';display:none;';
	document.body.appendChild(dragOverlay);

	// --- Highlight styling ---

	let savedSelector = '';
	let isDragging = false;
	let dragStartX = 0;
	let dragStartY = 0;

	function updateHighlight(selector: string) {
		let css = selector + ' { background-color: ' + HOVER_COLOR + '; }\n';
		if (savedSelector) {
			css += savedSelector + ' { background-color: ' + SAVED_COLOR + '; }\n';
		}
		highlightStyles.innerHTML = css;
	}

	// --- Reactive state & Svelte mount ---

	let currentSelector = $state('');
	let currentMatchText = $state('');

	const sidebar = mount(Sidebar, {
		target: mountPoint,
		props: {
			get selector() {
				return currentSelector;
			},
			get matchText() {
				return currentMatchText;
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
			return;
		}
		const target = resolveTarget(evt, host);
		if (!target) return;
		currentSelector = target.selector;
		currentMatchText = target.matchText;
		updateHighlight(target.selector);
	}

	function onMouseDown(evt: MouseEvent) {
		if (!window._klaxonInject) return;
		if (host.contains(evt.target as Node)) return;
		isDragging = true;
		dragStartX = evt.clientX;
		dragStartY = evt.clientY;
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

		const sel = resolveSelectionRect(dragStartX, dragStartY, evt.clientX, evt.clientY);
		if (sel.width < MIN_DRAG_PX && sel.height < MIN_DRAG_PX) return;

		const elements = collectVisibleElements(document.body, host);
		const ranked = rankByOverlap(elements, sel);
		const selArea = sel.width * sel.height;
		const selector = dominantSelectors(ranked, selArea);
		if (!selector) return;

		savedSelector = selector;
		currentSelector = selector;
		const matched = document.querySelectorAll(selector);
		const texts = Array.from(matched).map(
			(m) => m.textContent?.trim().slice(0, 200) ?? ''
		);
		currentMatchText = texts.filter(Boolean).join(' | ');
		updateHighlight(selector);
	}

	function onClick(evt: MouseEvent) {
		if (!window._klaxonInject) return;
		evt.preventDefault();
		const target = resolveTarget(evt, host);
		if (!target) return;
		savedSelector = target.selector;
		currentSelector = target.selector;
		currentMatchText = target.matchText;
		updateHighlight(target.selector);
	}

	window.addEventListener('mousemove', onMouseMove);
	window.addEventListener('mousedown', onMouseDown);
	window.addEventListener('mouseup', onMouseUp);
	window.addEventListener('click', onClick);

	// --- Teardown ---

	function cleanup() {
		window.removeEventListener('mousemove', onMouseMove);
		window.removeEventListener('click', onClick);
		document.body.style.marginRight = prevMarginRight;
		highlightStyles.remove();
		unmount(sidebar);
		host.remove();
		window._klaxonInject = false;
		console.log('Closed Klaxon');
	}
})();
