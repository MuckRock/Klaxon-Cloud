import Sidebar from './Sidebar.svelte';
import { mount, unmount } from 'svelte';

declare global {
	interface Window {
		_klaxonInject?: boolean;
	}
}

(function () {
	if (window._klaxonInject === true) {
		alert('The Klaxon bookmarklet is already active on this page.');
		return;
	}
	window._klaxonInject = true;
	console.log('[klaxon booted]');

	// Create shadow DOM container for style isolation
	const host = document.createElement('div');
	host.id = 'klaxon-host';
	document.body.appendChild(host);
	const shadow = host.attachShadow({ mode: 'open' });

	// Create a mount point inside the shadow root
	const mountPoint = document.createElement('div');
	shadow.appendChild(mountPoint);

	// Shrink the page to make room for the sidebar
	const prevMarginRight = document.body.style.marginRight;
	document.body.style.marginRight = '300px';

	// Inject a highlight stylesheet into the main document (not shadow DOM,
	// since we need to style elements on the host page)
	const highlightStyles = document.createElement('style');
	highlightStyles.id = 'klaxon-css-inject';
	document.head.appendChild(highlightStyles);

	function getCanonicalURL(): string {
		try {
			const og = document.querySelector("meta[property='og:url']")?.getAttribute('content');
			if (og) return og;
		} catch (_) {
			/* ignore */
		}
		try {
			const linkRel = document.querySelector("link[rel='canonical']")?.getAttribute('href');
			if (linkRel) return linkRel;
		} catch (_) {
			/* ignore */
		}
		return window.location.href;
	}

	function cssPath(el: Element): string[] {
		const path: string[] = [];
		let current: Element | null = el;
		while (current && current.nodeName.toLowerCase() !== 'body') {
			const name = current.nodeName.toLowerCase();
			const id = current.id ? '#' + current.id : '';
			const cls = current.className ? '.' + current.className.replace(/\s+/g, '.') : '';
			path.unshift(name + id + cls);
			current = current.parentElement;
		}
		return path;
	}

	let savedSelector = '';

	function updateHighlight(selector: string) {
		let css = selector + ' { background-color: rgba(255, 11, 58, 0.3); }\n';
		if (savedSelector) {
			css += savedSelector + ' { background-color: rgba(58, 255, 11, 0.3); }\n';
		}
		highlightStyles.innerHTML = css;
	}

	// State passed to the Svelte component
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

	function onMouseMove(evt: MouseEvent) {
		if (!window._klaxonInject) return;
		const el = document.elementFromPoint(evt.clientX, evt.clientY);
		if (!el || host.contains(el)) return;
		const path = cssPath(el);
		const selector = path[path.length - 1];
		if (selector) {
			currentSelector = selector;
			const matched = document.querySelector(selector);
			currentMatchText = matched?.textContent?.trim().slice(0, 200) ?? '';
			updateHighlight(selector);
		}
	}

	function onClick(evt: MouseEvent) {
		if (!window._klaxonInject) return;
		evt.preventDefault();
		const el = document.elementFromPoint(evt.clientX, evt.clientY);
		if (!el || host.contains(el)) return;
		const path = cssPath(el);
		savedSelector = path[path.length - 1] ?? '';
		currentSelector = savedSelector;
		const matched = document.querySelector(savedSelector);
		currentMatchText = matched?.textContent?.trim().slice(0, 200) ?? '';
		updateHighlight(savedSelector);
	}

	window.addEventListener('mousemove', onMouseMove);
	window.addEventListener('click', onClick);

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
