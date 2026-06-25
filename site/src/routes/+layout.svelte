<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import { loadUser, clearUser } from '$lib/user.svelte';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

	// Keep the cached user (localStorage) in sync with the server's view of the
	// session: hydrate it when authenticated, purge it on logout / expiry.
	$effect(() => {
		if (data.authenticated) loadUser();
		else clearUser();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app">
	<SiteHeader authenticated={data.authenticated ?? false} />
	<main>
		{@render children()}
	</main>
</div>

<style>
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	main {
		flex: 1;
		max-width: 64rem;
		width: 100%;
		margin: 0 auto;
		padding: 2rem 1.5rem;
	}
</style>
