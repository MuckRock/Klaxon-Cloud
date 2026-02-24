<script lang="ts">
	interface Props {
		selector: string;
		matchText: string;
		lockedSelector: string;
		lockedMatchText: string;
		url: string;
		onClose: () => void;
	}

	let { selector, matchText, lockedSelector, lockedMatchText, url, onClose }: Props = $props();
</script>

<div class="sidebar">
	<div class="header">
		<h2>Klaxon</h2>
		<button onclick={onClose} aria-label="Close">&times;</button>
	</div>

	<div class="body">
		<label>
			Page URL
			<input type="text" readonly value={url} />
		</label>

		{#if lockedSelector}
			<div class="locked-section">
				<label>
					Locked Selector
					<input type="text" readonly value={lockedSelector} />
				</label>

				{#if lockedMatchText}
					<div class="match-text">
						<strong>Matched text:</strong>
						<p>{lockedMatchText}</p>
					</div>
				{/if}
			</div>
		{/if}

		<label>
			{lockedSelector ? 'Hovered Selector' : 'CSS Selector'}
			<input type="text" readonly value={selector} />
		</label>

		{#if matchText}
			<div class="match-text">
				<strong>Hovered text:</strong>
				<p>{matchText}</p>
			</div>
		{/if}

		{#if !lockedSelector}
			<p class="hint">Click an element on the page to lock the selection.</p>
		{/if}
	</div>
</div>

<style>
	.sidebar {
		position: fixed;
		top: 0;
		right: 0;
		width: 300px;
		height: 100vh;
		background: #fff;
		border-left: 2px solid #ccc;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		font-size: 14px;
		color: #333;
		z-index: 2147483647;
		display: flex;
		flex-direction: column;
		box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 16px;
		border-bottom: 1px solid #eee;
		background: #f8f8f8;
	}

	h2 {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
	}

	.header button {
		background: none;
		border: none;
		font-size: 24px;
		cursor: pointer;
		color: #666;
		padding: 0 4px;
		line-height: 1;
	}

	.header button:hover {
		color: #000;
	}

	.body {
		padding: 16px;
		overflow-y: auto;
		flex: 1;
	}

	label {
		display: block;
		margin-bottom: 12px;
		font-weight: 500;
		font-size: 12px;
		color: #666;
	}

	input {
		display: block;
		width: 100%;
		margin-top: 4px;
		padding: 6px 8px;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 13px;
		font-family: monospace;
		background: #f9f9f9;
		box-sizing: border-box;
	}

	.match-text {
		margin-bottom: 12px;
	}

	.match-text strong {
		font-size: 12px;
		color: #666;
	}

	.match-text p {
		margin: 4px 0 0;
		padding: 8px;
		background: #f0f7ff;
		border-radius: 4px;
		font-size: 13px;
		line-height: 1.4;
		max-height: 200px;
		overflow-y: auto;
	}

	.locked-section {
		padding: 12px;
		margin-bottom: 12px;
		background: #f0fff0;
		border: 1px solid #b2dfb2;
		border-radius: 6px;
	}

	.locked-section label {
		margin-bottom: 8px;
	}

	.locked-section .match-text {
		margin-bottom: 0;
	}

	.hint {
		color: #999;
		font-size: 12px;
		font-style: italic;
	}
</style>
