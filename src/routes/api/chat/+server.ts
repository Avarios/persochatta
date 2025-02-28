// src/routes/api/chat/+server.js
import { json } from '@sveltejs/kit';
import {
	BedrockRuntimeClient,
	InvokeModelWithResponseStreamCommand
} from '@aws-sdk/client-bedrock-runtime';
import { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION } from '$env/static/private';
import type { RequestHandler } from './$types';

const POST: RequestHandler = async ({ request }) => {
	const { message, previousMessages } = await request.json();
	const bedrockClient = new BedrockRuntimeClient({
		region: AWS_DEFAULT_REGION,
		credentials: {
			accessKeyId: AWS_ACCESS_KEY_ID,
			secretAccessKey: AWS_SECRET_ACCESS_KEY
		}
	});

	const formattedMessages = previousMessages.map((msg: { role: any; content: any }) => ({
		role: msg.role,
		content: msg.content
	}));

	formattedMessages.push({
		role: 'user',
		content: message
	});

    ///TODO: Change the modelId to the one you want to use
	const payload = {
		modelId: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
		contentType: 'application/json',
		accept: 'application/json',
		body: JSON.stringify({
			messages: formattedMessages,
			max_tokens: 4096,
			temperature: 0.7,
			anthropic_version: 'bedrock-2023-05-31'
		})
	};

	try {
		const stream = new ReadableStream({
			async start(controller) {
				try {
					const command = new InvokeModelWithResponseStreamCommand(payload);
					const response = await bedrockClient.send(command);
					if (!response.body) {
						throw new Error('Response body is undefined');
					}
					for await (const chunk of response.body) {
						if (chunk.chunk?.bytes) {
							const decodedChunk = JSON.parse(new TextDecoder().decode(chunk.chunk.bytes));

							if (decodedChunk.type === 'content_block_delta' && decodedChunk.delta?.text) {
								controller.enqueue(decodedChunk.delta.text);
							}
						}
					}

					controller.close();
				} catch (error) {
					console.error('Error streaming from Bedrock:', error);
					controller.error(error);
				}
			}
		});

		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive'
			}
		});
	} catch (error) {
		console.error('Error setting up Bedrock stream:', error);
		return json({ error: 'Failed to get response from AI service' }, { status: 500 });
	}
};

export { POST };