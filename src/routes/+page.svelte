<script lang="ts">
	import { onMount } from 'svelte';

	import Header from '$lib/components/Header.svelte';
	import { marked } from '$lib/renderer';

	let messages: Array<{ role: string; content: string; timestamp: Date }> = [];
	let newMessage = '';
	let loading = false;
	let chatContainer: HTMLDivElement | null = null;
    let streamingMessage = '';


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
					previousMessages: messages.filter(m => m.role !== 'system')
				})
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

			messages = [...messages, {
				role: 'assistant',
				content: streamingMessage,
				timestamp: new Date()
			}];
			
		} catch (error) {
			console.error('Error calling AI service:', error);

			messages = [...messages, {
				role: 'system',
				content: 'Sorry, there was an error processing your request.',
				timestamp: new Date()
			}];
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

	function formatMessage(content: string) {
		return marked(content);
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
	<Header />
	
    <main class="flex-1 overflow-hidden flex flex-col max-w-6xl mx-auto w-full">
		<div 
			bind:this={chatContainer} 
			class="flex-1 overflow-y-auto py-4 px-6"
		>
			{#each messages as message}
				<div class="mb-6">
					<!-- Message header with avatar -->
					<div class="flex items-center mb-2">
						<div class="w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0 {message.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}">
							{message.role === 'user' ? 'U' : 'AI'}
						</div>
						<div class="font-medium text-gray-900">
							{message.role === 'user' ? 'You' : 'Assistant'}
						</div>
						<div class="text-xs text-gray-500 ml-2">
							{message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
						</div>
					</div>
					
					<div class="pl-11">
						<div class="{message.role === 'user' ? 'bg-blue-50 border-blue-100' : 'bg-purple-50 border-purple-100'} border rounded-lg p-4 shadow-sm">
							<div class="prose prose-blue max-w-none">
								{@html formatMessage(message.content)}
							</div>
						</div>
					</div>
				</div>
			{/each}
			

			{#if loading && streamingMessage}
				<div class="mb-6">
					<div class="flex items-center mb-2">
						<div class="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-3 flex-shrink-0">
							AI
						</div>
						<div class="font-medium text-gray-900">Assistant</div>
						<div class="text-xs text-gray-500 ml-2">
							{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
						</div>
					</div>
					<div class="pl-11">
						<div class="bg-purple-50 border border-purple-100 rounded-lg p-4 shadow-sm">
							<div class="prose prose-blue max-w-none">
								{@html formatMessage(streamingMessage)}
							</div>
						</div>
					</div>
				</div>
			{:else if loading}
				<div class="mb-6">
					<div class="flex items-center mb-2">
						<div class="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-3 flex-shrink-0">
							AI
						</div>
						<div class="font-medium text-gray-900">Assistant</div>
					</div>
					<div class="pl-11">
						<div class="bg-purple-50 border border-purple-100 rounded-lg p-4 shadow-sm">
							<div class="inline-flex items-center">
								<div class="h-2 w-2 bg-purple-600 rounded-full mr-1 animate-pulse"></div>
								<div class="h-2 w-2 bg-purple-600 rounded-full mr-1 animate-pulse delay-150"></div>
								<div class="h-2 w-2 bg-purple-600 rounded-full animate-pulse delay-300"></div>
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>
		
		<div class="border-t border-gray-200 bg-white p-4 sticky bottom-0">
			<div class="max-w-4xl mx-auto">
				<form on:submit|preventDefault={sendMessage} class="relative">
					<textarea
						bind:value={newMessage}
						on:keydown={handleKeydown}
						placeholder="Message the AI assistant..."
						class="w-full border border-gray-300 rounded-lg py-3 pl-4 pr-16 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
						rows="3"
					></textarea>
					<button 
						type="submit" 
						class="absolute bottom-3 right-3 bg-purple-600 text-white rounded-full p-2 hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						disabled={loading || !newMessage.trim()}
						aria-label="Send message"
					>
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
							<path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
						</svg>
					</button>
				</form>
				<div class="mt-2 text-xs text-gray-500 text-center">
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
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
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