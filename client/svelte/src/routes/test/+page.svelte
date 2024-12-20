<script lang="ts">
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';
	import { renderer } from '$lib/customRenderer';
	import type { PageData } from './$types';
	import 'highlight.js/styles/stackoverflow-dark.css';
	import paste from '$lib/images/paste.png';
	let { data }: { data: PageData } = $props();

	type Message = {
		id: number;
		text: string;
		isOwn: boolean;
		timestamp: Date;
	};

	const models = [
		{ id: 0, name: 'Haiku' },
		{ id: 1, name: 'Sonnet 3.5' }
	];

	let selectedItem = $state(models[0]);

	const messages = $state<Message[]>([
		{
			id: 1,
			isOwn: false,
			text: 'THIS IS A TEXT',
			timestamp: new Date()
		}
	]);
	let chatWindow: HTMLDivElement;

	let messageInput = $state('');
	let isStreaming = $state(false);

	marked.setOptions({
		breaks: true,
		gfm: true,
		renderer
	});

	function renderMarkdown(content: string) {
		try {
			const htmlContent = marked(content) as string;
			return DOMPurify.sanitize(htmlContent);
		} catch (error) {
			console.error('Markdown parsing error:', error);
			return content;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey && !isStreaming) {
			event.preventDefault();
		}
	}
</script>

<div class="flex h-screen flex-col bg-gray-100">
	<header class="bg-indigo-600 p-4 shadow-lg">
		<h1 class="text-center text-2xl font-bold tracking-wide text-white">ADF Chatter</h1>
	</header>
	<div class="border-spacing-5 border-r-2 border-slate-950 bg-slate-500 p-2">
		<select bind:value={selectedItem}>
			{#each models as item}
				<option value={item}>{item.name}</option>
			{/each}
		</select>
	</div>

	<div bind:this={chatWindow} class="flex flex-1">
		{#each messages as message (message.id)}
			<div class="flex flex-col {message.isOwn ? 'items-end' : 'items-start'}">
				<span class="mb-1 text-xs text-gray-500">
					{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
				</span>
				<div class="flex {message.isOwn ? 'justify-end' : 'justify-start'} max-w-[70%]">
					<div
						class="rounded-lg p-3 {message.isOwn
							? 'rounded-tr-none bg-indigo-500 text-white'
							: 'rounded-tl-none bg-white text-gray-800 shadow'}"
					>
						<pre
							class="theme-stackoverflow-dark shadow-3xl relative mb-6 max-w-full overflow-hidden text-sm">
						<span class="hljs mb-0 block min-h-full overflow-auto p-4">
							<code class="relative block w-full">
								
								<span class="block">
									<button
											aria-label="copy"
											class="copy-btn absolute top-2 right-2 z-10 flex rounded-full bg-gray-700 p-2 text-white hover:bg-gray-600">
									<svg
												xmlns="http://www.w3.org/2000/svg"
												height="16px"
												viewBox="0 -960 960 960"
												width="16px"
												fill="#e8eaed"
												><path
													d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h167q11-35 43-57.5t70-22.5q40 0 71.5 22.5T594-840h166q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560h-80v120H280v-120h-80v560Zm280-560q17 0 28.5-11.5T520-800q0-17-11.5-28.5T480-840q-17 0-28.5 11.5T440-800q0 17 11.5 28.5T480-760Z"
												/></svg
											>
								</button>	
									'TEST'
								
								</span>
							</code>
						</span>
					</pre>
						{#if message === messages[messages.length - 1] && isStreaming}
							<span class="ml-2 inline-block">
								<div class="typing-indicator">
									<span></span>
									<span></span>
									<span></span>
								</div>
							</span>
						{/if}
					</div>
				</div>
			</div>
		{/each}
	</div>

	<div class="bg-white p-4 shadow-lg">
		<div class="flex space-x-2">
			<input
				type="text"
				bind:value={messageInput}
				onkeydown={handleKeydown}
				disabled={isStreaming}
				placeholder="Type a message..."
				class="flex-1 rounded-full border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
			/>
			<button
				disabled={isStreaming}
				class="rounded-full bg-indigo-600 px-6 py-2 text-white transition-colors {isStreaming
					? 'cursor-not-allowed opacity-50'
					: 'hover:bg-indigo-700'}"
			>
				{isStreaming ? 'Processing...' : 'Send'}
			</button>
		</div>
	</div>
</div>

<style>
	:global(html, body) {
		height: 100%;
		margin: 0;
	}

	.typing-indicator {
		display: inline-flex;
		align-items: center;
		gap: 2px;
	}

	.typing-indicator span {
		width: 4px;
		height: 4px;
		background-color: currentColor;
		border-radius: 50%;
		animation: bounce 1.4s infinite ease-in-out;
	}

	.typing-indicator span:nth-child(1) {
		animation-delay: -0.32s;
	}
	.typing-indicator span:nth-child(2) {
		animation-delay: -0.16s;
	}

	@keyframes bounce {
		0%,
		80%,
		100% {
			transform: scale(0);
		}
		40% {
			transform: scale(1);
		}
	}

	/* Markdown Styles */
	:global(.markdown-content p) {
		margin-bottom: 0.5em;
	}

	:global(.markdown-content code) {
		background-color: rgba(0, 0, 0, 0.1);
		padding: 0.2em 0.4em;
		border-radius: 3px;
		font-family: monospace;
	}

	:global(.markdown-content pre) {
		background-color: rgba(0, 0, 0, 0.1);
		padding: 0.5em;
		border-radius: 4px;
		overflow-x: auto;
		margin: 0.5em 0;
	}

	:global(.markdown-content ul, .markdown-content ol) {
		padding-left: 1.5em;
		margin: 0.5em 0;
	}

	:global(.markdown-content li) {
		margin: 0.2em 0;
	}

	:global(.markdown-content strong) {
		font-weight: bold;
	}

	:global(.markdown-content em) {
		font-style: italic;
	}
</style>
