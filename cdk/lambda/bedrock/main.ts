// src/lambda/chat.ts
import { Context, APIGatewayProxyEventV2 } from 'aws-lambda';
import { BedrockRuntimeClient, InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';

const bedrock = new BedrockRuntimeClient();

// Get environment variables with defaults
const {
  BEDROCK_MODEL_ID = 'anthropic.claude-3-5-sonnet-20240620-v1:0',
  MODEL_TEMPERATURE = '0.7',
  MODEL_TOP_P = '0.9',
  MODEL_MAX_TOKENS = '2000',
  SYSTEM_PROMPT = 'You are a helpful AI assistant.',
} = process.env;

interface ChatRequest {
  prompt: string;
  // Add optional parameters that can override the defaults
  temperature?: number;
  topP?: number;
  maxTokens?: number;
}

interface ModelParameters {
  temperature: number;
  topP: number;
  maxTokens: number;
}

// Validate and get model parameters
function getModelParameters(request: ChatRequest): ModelParameters {
  return {
    temperature: validateNumber(request.temperature, parseFloat(MODEL_TEMPERATURE), 0, 1),
    topP: validateNumber(request.topP, parseFloat(MODEL_TOP_P), 0, 1),
    maxTokens: validateNumber(request.maxTokens, parseInt(MODEL_MAX_TOKENS), 1, 4096),
  };
}

// Validate number within range
function validateNumber(value: number | undefined, defaultValue: number, min: number, max: number): number {
  if (value === undefined) return defaultValue;
  return Math.min(Math.max(value, min), max);
}

export const handler = awslambda.streamifyResponse(async (event: APIGatewayProxyEventV2, responseStream: awslambda.ResponseStream, context: Context) => {
  try {
    // Set response headers for streaming
    responseStream.setContentType('text/plain');

    // Parse the request body
    const body = JSON.parse(event.body || '{}') as ChatRequest;
    
    // Get model parameters
    const modelParams = getModelParameters(body);

    // Prepare the prompt with system context
    const fullPrompt = `${SYSTEM_PROMPT}\n\nHuman: ${body.prompt}\n\nAssistant:`;
    
    // Prepare the prompt for Claude
    const input = {
      modelId: BEDROCK_MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        prompt: fullPrompt,
        max_tokens_to_sample: modelParams.maxTokens,
        temperature: modelParams.temperature,
        top_p: modelParams.topP,
      }),
    };

    // Create the streaming command
    const command = new InvokeModelWithResponseStreamCommand(input);
    
    // Get the response stream
    const response = await bedrock.send(command);
    const stream = response.body;

    if (!stream) {
      throw new Error('No response stream received');
    }

    // Process the stream
    for await (const chunk of stream) {
      if (chunk.chunk?.bytes) {
        const chunkStr = new TextDecoder().decode(chunk.chunk.bytes);
        try {
          const parsed = JSON.parse(chunkStr);
          if (parsed.completion) {
            // Write each chunk to the response stream
            await responseStream.write(parsed.completion);
          }
        } catch (e) {
          console.error('Error parsing chunk:', e);
        }
      }
    }

    // End the stream
    await responseStream.end();

  } catch (error) {
    console.error('Error:', error);
    responseStream.write(JSON.stringify({ 
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }));
    await responseStream.end();
  }
});
