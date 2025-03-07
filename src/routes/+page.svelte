<script lang="ts">
	import { onMount } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import { marked } from '$lib/renderer';
	import { llms,type ChatMessage,type ChatRequest,type LLM } from '$lib/models';

	let messages: Array<ChatMessage> = $state([]);
	let newMessage = $state('');
	let loading = $state(false);
	let chatContainer: HTMLDivElement | null = null;
	let streamingMessage = $state('');
	let openLLMMenu = $state(true);
	let chosenLLM: LLM | undefined = $state(undefined);

	async function sendMessage() {
		if (!newMessage.trim()) return;

		const userMessage = {
			role: 'user',
			content: newMessage,
			timestamp: new Date()
		};
		messages = [...messages, userMessage];
		const userInput = newMessage;
		newMessage = '';

		loading = true;
		streamingMessage = '';

		try {
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					message: userInput,
					previousMessages: messages.filter((m) => m.role !== 'system'),
					model: chosenLLM
				} as ChatRequest)
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const reader = response.body?.getReader();
			if (!reader) {
				throw new Error('Response body is null');
			}
			const decoder = new TextDecoder();

			while (true) {
				const { done, value } = await reader.read();

				if (done) {
					break;
				}

				const chunk = decoder.decode(value);
				streamingMessage += chunk;

				if (chatContainer) {
					chatContainer.scrollTop = chatContainer.scrollHeight;
				}
			}

			messages = [
				...messages,
				{
					role: 'assistant',
					content: streamingMessage,
					timestamp: new Date()
				}
			];
		} catch (error) {
			console.error('Error calling AI service:', error);

			messages = [
				...messages,
				{
					role: 'system',
					content: 'Sorry, there was an error processing your request.',
					timestamp: new Date()
				}
			];
		} finally {
			loading = false;
			streamingMessage = '';
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			sendMessage();
		}
	}

	onMount(() => {
		messages = [
			{
				role: 'assistant',
				content: "Hello! I'm your AI assistant. How can I help you today?",
				timestamp: new Date()
			}
		];
	});
</script>

<div class="flex h-screen flex-col bg-gray-50">
	<Header>
		<div class="relative">
			<button
				id="dropdownHoverButton"
				data-dropdown-toggle="dropdownHover"
				data-dropdown-trigger="hover"
				onclick={() => {
					openLLMMenu = !openLLMMenu;
				}}
				class="inline-flex items-center rounded-lg bg-purple-400 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-purple-800 focus:outline-none focus:ring-4 focus:ring-blue-300"
				type="button"
			>
				{chosenLLM ? chosenLLM.display : "Choose LLM"} 
				<svg
					class="ms-3 h-2.5 w-2.5"
					aria-hidden="true"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 10 6"
				>
					<path
						stroke="currentColor"
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="m1 1 4 4 4-4"
					/>
				</svg>
			</button>

			<!-- Dropdown menu now positioned relative to the parent div -->
			<div
				id="dropdownHover"
				class="absolute left-0 top-full z-10 mt-1 w-44 divide-y divide-gray-100 rounded-lg bg-white shadow-sm dark:bg-gray-700"
				class:hidden={openLLMMenu ? 'hidden' : ''}
			>
				<ul
					class="py-2 text-sm text-gray-700 dark:text-gray-200"
					aria-labelledby="dropdownHoverButton"
				>
					{#each llms as llm}
						<li>
							<button
								onclick={() => {
									chosenLLM = llm;
									openLLMMenu = !openLLMMenu;
								}}
								class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white w-full"
							>
								{llm.display}
							</button>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	</Header>

	<main class="mx-auto flex w-full max-w-6xl flex-1 flex-col overflow-hidden">
		<div bind:this={chatContainer} class="flex-1 overflow-y-auto px-6 py-4">
			{#each messages as message}
				<div class="mb-6">
					<!-- Message header with avatar -->
					<div class="mb-2 flex items-center">
						<div
							class="mr-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full {message.role ===
							'user'
								? 'bg-blue-100 text-blue-600'
								: 'bg-purple-100 text-purple-600'}"
						>
							{message.role === 'user' ? 'U' : 'AI'}
						</div>
						<div class="font-medium text-gray-900">
							{message.role === 'user' ? 'You' : 'Assistant'}
						</div>
						<div class="ml-2 text-xs text-gray-500">
							{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
						</div>
					</div>

					<div class="pl-11">
						<div
							class="{message.role === 'user'
								? 'border-blue-100 bg-blue-50'
								: 'border-purple-100 bg-purple-50'} rounded-lg border p-4 shadow-sm"
						>
							<div class="prose prose-blue max-w-none">
								{@html marked(message.content)}
							</div>
						</div>
					</div>
				</div>
			{/each}

			{#if loading && streamingMessage}
				<div class="mb-6">
					<div class="mb-2 flex items-center">
						<div
							class="mr-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600"
						>
							AI
						</div>
						<div class="font-medium text-gray-900">Assistant</div>
						<div class="ml-2 text-xs text-gray-500">
							{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
						</div>
					</div>
					<div class="pl-11">
						<div class="rounded-lg border border-purple-100 bg-purple-50 p-4 shadow-sm">
							<div class="prose prose-blue max-w-none">
								{@html marked(streamingMessage)}
							</div>
						</div>
					</div>
				</div>
			{:else if loading}
				<div class="mb-6">
					<div class="mb-2 flex items-center">
						<div
							class="mr-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600"
						>
							AI
						</div>
						<div class="font-medium text-gray-900">Assistant</div>
					</div>
					<div class="pl-11">
						<div class="rounded-lg border border-purple-100 bg-purple-50 p-4 shadow-sm">
							<div class="inline-flex items-center">
								<div class="mr-1 h-2 w-2 animate-pulse rounded-full bg-purple-600"></div>
								<div class="mr-1 h-2 w-2 animate-pulse rounded-full bg-purple-600 delay-150"></div>
								<div class="h-2 w-2 animate-pulse rounded-full bg-purple-600 delay-300"></div>
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<div class="sticky bottom-0 border-t border-gray-200 bg-white p-4">
			<div class="mx-auto max-w-4xl">
				<form onsubmit={sendMessage} class="relative">
					<textarea
						bind:value={newMessage}
						onkeydown={handleKeydown}
						placeholder="Message the AI assistant..."
						class="w-full resize-none rounded-lg border border-gray-300 py-3 pl-4 pr-16 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
						rows="3"
					></textarea>
					<button
						type="submit"
						class="absolute bottom-3 right-3 rounded-full bg-purple-600 p-2 text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
						disabled={(loading || !newMessage.trim()) && chosenLLM !== null }
						aria-label="Send message"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="currentColor"
							class="h-5 w-5"
						>
							<path
								d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z"
							/>
						</svg>
					</button>
				</form>
				<div class="mt-2 text-center text-xs text-gray-500">
					AI responses are generated by Amazon Bedrock
				</div>
			</div>
		</div>
	</main>
</div>

<style>
	:global(.code-block) {
		margin: 1.5em 0;
		border-radius: 0.5rem;
		overflow: hidden;
		box-shadow:
			0 4px 6px -1px rgba(0, 0, 0, 0.1),
			0 2px 4px -1px rgba(0, 0, 0, 0.06);
	}

	:global(.code-header) {
		background-color: #343a46;
		padding: 0.5rem 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		color: #e2e8f0;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.8rem;
	}

	:global(.code-language) {
		text-transform: uppercase;
		font-weight: 600;
		letter-spacing: 0.025em;
	}

	:global(.prose pre) {
		background-color: #282c34;
		margin: 0;
		padding: 1em;
		overflow-x: auto;
	}

	:global(.prose code) {
		padding: 0.2em 0.4em;
		border-radius: 0.25rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.9em;
		background-color: rgba(209, 213, 219, 0.2);
		color: #24292e;
	}

	:global(.prose pre code) {
		padding: 0;
		background-color: transparent;
		color: #abb2bf;
		font-size: 0.9em;
		line-height: 1.6;
	}

	:global(.hljs-keyword),
	:global(.hljs-tag) {
		color: #c678dd;
	}

	:global(.hljs-string) {
		color: #98c379;
	}

	:global(.hljs-number) {
		color: #d19a66;
	}

	:global(.hljs-comment) {
		color: #7f848e;
		font-style: italic;
	}

	:global(.hljs-function),
	:global(.hljs-title.function_) {
		color: #61afef;
	}

	:global(.hljs-variable),
	:global(.hljs-attr) {
		color: #e06c75;
	}

	:global(.hljs-operator) {
		color: #56b6c2;
	}

	:global(.hljs-title.class_) {
		color: #e5c07b;
	}
</style>
