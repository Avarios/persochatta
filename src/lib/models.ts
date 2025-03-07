type LLM = {
	awsName: string;
	display: string;
};

type ChatRequest = {
	message: string;
	previousMessages: Array<ChatMessage>;
	model: LLM;
};

type ChatMessage = { role: string; content: string; timestamp: Date };

const llms: Array<LLM> = [
	//{ awsName: 'meta.llama3-3-70b-instruct-v1:0', display: 'LLama 3.3' },
	{ awsName: 'anthropic.claude-3-5-sonnet-20240620-v1:0', display: 'Claude 3.5' },
	//{ awsName: 'us.amazon.nova-pro-v1:0', display: 'Amazon Nova Pro' },
	{ awsName: 'anthropic.claude-3-haiku-20240307-v1:0', display: 'Claude Haiku' }
];

export { llms, type LLM, type ChatRequest, type ChatMessage };
