import {
  BedrockRuntimeClient,
  InvokeModelWithResponseStreamCommand,
} from "@aws-sdk/client-bedrock-runtime";

const models = [
  "anthropic.claude-3-haiku-20240307-v1:0",
  "anthropic.claude-3-5-sonnet-20240620-v1:0",
];

export const invokeModel = async (
  prompt: string,
  modelId: number,
  onMessage: (message: string) => void
): Promise<void> => {
  const client = new BedrockRuntimeClient({
    region: process.env.AWS_REGION,
  });

  // Prepare the payload for the model.
  const payload = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: prompt }],
      },
    ],
  };
  // anthropic.claude-3-5-sonnet-20240620-v1:0
  // anthropic.claude-3-haiku-20240307-v1:0
  //
  const command = new InvokeModelWithResponseStreamCommand({
    contentType: "application/json",
    body: JSON.stringify(payload),
    modelId: models[modelId],
  });
  const apiResponse = await client.send(command);

  if (apiResponse?.body) {
    for await (const item of apiResponse.body) {
      const chunk = JSON.parse(new TextDecoder().decode(item.chunk?.bytes));
      if (chunk.type === "content_block_delta") {
        onMessage(chunk.delta.text);
      }
    }
  }
};
