import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ cookies, fetch, request }) => {
	const { prompt, modelId } = (await request.json()) as { prompt: string; modelId: number };
	console.log(prompt,modelId);
	
	const response = await fetch('http://localhost:5000/api/v1/invoke', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ prompt, modelId })
	});

	// Create a new ReadableStream
	const stream = new ReadableStream({
		async start(controller) {
			const reader = response?.body?.getReader();

			if (!reader) {
				return new Error('no data fetched');
			}
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				controller.enqueue(value);
			}

			controller.close();
		}
	});

	// Return the stream as the response
	return new Response(stream, {
		headers: {
			'Content-Type': 'text/plain',
			'Transfer-Encoding': 'chunked'
		}
	});
};




