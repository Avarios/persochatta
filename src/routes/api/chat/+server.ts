// src/routes/api/chat/+server.js
import { json } from '@sveltejs/kit';
import { BedrockRuntimeClient, InvokeModelCommand, InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import { AWS_ACCESS_KEY_ID,AWS_SECRET_ACCESS_KEY,AWS_DEFAULT_REGION } from '$env/static/private'

export async function POST({ request }) {
    const { message, previousMessages } = await request.json();
    
    // Initialize the Bedrock client
    const bedrockClient = new BedrockRuntimeClient({
        region: AWS_DEFAULT_REGION,
        credentials: {
            accessKeyId: AWS_ACCESS_KEY_ID,
            secretAccessKey: AWS_SECRET_ACCESS_KEY
        }
    });
    
    // Format the messages for the model
    const formattedMessages = previousMessages.map((msg: { role: any; content: any; }) => ({
        role: msg.role,
        content: msg.content
    }));
    
    // Add the new message
    formattedMessages.push({
        role: 'user',
        content: message
    });
    
    // Create the request payload
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
        // Create a ReadableStream
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    // Invoke the model with streaming
                    const command = new InvokeModelWithResponseStreamCommand(payload);
                    const response = await bedrockClient.send(command);
                    
                    // Process each chunk
                    if (!response.body) {
                        throw new Error('Response body is undefined');
                    }
                    for await (const chunk of response.body) {
                        if (chunk.chunk?.bytes) {
                            const decodedChunk = JSON.parse(new TextDecoder().decode(chunk.chunk.bytes));
                            
                            if (decodedChunk.type === 'content_block_delta' && decodedChunk.delta?.text) {
                                // Send the text chunk
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
        
        // Return the stream as response
        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }
        });
    } catch (error) {
        console.error('Error setting up Bedrock stream:', error);
        return json({ error: 'Failed to get response from AI service' }, { status: 500 });
    }
}