const { STSClient, AssumeRoleCommand } = require('@aws-sdk/client-sts');
const { BedrockRuntimeClient, InvokeModelWithResponseStreamCommand } = require('@aws-sdk/client-bedrock-runtime');

async function getTemporaryCredentials() {
    const stsClient = new STSClient({ region: 'us-west-2' });
    const command = new AssumeRoleCommand({
        RoleArn: 'arn:aws:iam::your-account-id:role/YourRoleName',
        RoleSessionName: 'YourSessionName'
    });

    const response = await stsClient.send(command);
    return {
        accessKeyId: response.Credentials.AccessKeyId,
        secretAccessKey: response.Credentials.SecretAccessKey,
        sessionToken: response.Credentials.SessionToken
    };
}

async function callBedrock() {
    const tempCredentials = await getTemporaryCredentials();
    const bedrockClient = new BedrockRuntimeClient({
        region: 'us-west-2',
        credentials: tempCredentials
    });

    const payload = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1000,
        messages: [
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: 'Your prompt here'
                    }
                ]
            }
        ],
        temperature: 0.7
    };

    const command = new InvokeModelWithResponseStreamCommand({
        contentType: 'application/json',
        body: JSON.stringify(payload),
        modelId: 'your-model-id'
    });

    const response = await bedrockClient.send(command);
    const decodedResponseBody = new TextDecoder().decode(response.body);

    console.log(decodedResponseBody);
}

callBedrock().catch(console.error);
