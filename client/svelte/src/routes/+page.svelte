<script lang="ts">
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';
	import { renderer } from '$lib/customRenderer';
	import type { PageData } from './$types';
	import 'highlight.js/styles/stackoverflow-dark.css'
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

	const messages = $state<Message[]>([]);
	let chatWindow: HTMLDivElement;

	let messageInput = $state('');
	let isStreaming = $state(false);
	let currentStreamedMessage = $state('');

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

	async function sendMessage() {
		if (messageInput.trim()) {
			messages.push({
				id: messages.length + 1,
				text: messageInput,
				isOwn: true,
				timestamp: new Date()
			});

			isStreaming = true;

			try {
				const response = await fetch('/api/chat/', {
					method: 'POST',
					credentials: 'same-origin',
					body: JSON.stringify({ prompt: messageInput, modelId: selectedItem.id })
				});
				const reader = response?.body?.getReader();
				if (!reader) {
					console.log('ERR');
					return;
				}

				messages.push({
					id: messages.length + 1,
					text: '',
					isOwn: false,
					timestamp: new Date()
				});

				while (true) {
					const { done, value } = await reader.read();
					if (done) {
						messages[messages.length - 1].text = currentStreamedMessage;
						currentStreamedMessage = '';
						break;
					}
					const chunk = new TextDecoder().decode(value);
					currentStreamedMessage += chunk;
					messages[messages.length - 1].text = currentStreamedMessage;
					chatWindow.scrollTop = chatWindow.scrollHeight;
				}
			} catch (error) {
				console.error('Error:', error);
				messages.push({
					id: messages.length + 1,
					text: 'Sorry, there was an error processing your message.',
					isOwn: false,
					timestamp: new Date()
				});
			} finally {
				isStreaming = false;
				messageInput = '';
			}
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey && !isStreaming) {
			event.preventDefault();
			sendMessage();
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

	<div bind:this={chatWindow} class="flex-1 space-y-4 overflow-y-auto p-4">
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
						{#if message.isOwn}
							{message.text}
						{:else if isStreaming}
							{message.text}
						{:else}
							{@html renderMarkdown(message.text)}
						{/if}
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
				onclick={sendMessage}
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
