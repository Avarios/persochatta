<script lang="ts">
	let { children = null } = $props();
</script>

<header class="border-b border-gray-200 bg-white px-6 py-4">
	<div class="mx-auto flex max-w-6xl items-center justify-between">
		<div class="flex items-center space-x-4">			
			<h1 class="text-xl font-semibold text-gray-800">AI Assistant</h1>
            {#if children}
				{@render children()}
			{/if}
		</div>
	</div>
</header>
