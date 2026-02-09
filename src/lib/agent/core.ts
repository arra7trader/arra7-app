import { streamText, generateText, tool } from 'ai';
import { AI_MODELS } from '@/lib/ai-provider';
import { priceTool, newsTool } from './tools';

export interface AgentRequest {
    messages: any[];
    systemPrompt?: string;
}

/**
 * Core Agent Function
 * Uses the Vercel AI SDK 'tool' calling capabilities.
 * If the model supports tools (Llama 3.1 8B via Groq does), it will call them.
 */
export async function runAgent({ messages, systemPrompt }: AgentRequest) {

    // Define available tools
    const tools = {
        getPrice: priceTool,
        getNews: newsTool,
    };

    // Use Llama 3.1 8B (or 70B if configured in provider)
    // IMPORTANT: Ensure the model in ai-provider supports tool calling.
    // Groq Llama 3.1 models DO support tool calling.
    const model = AI_MODELS.groq;

    return await streamText({
        model,
        system: systemPrompt || 'You are OpenClaw-style Agent. Use tools to answer. Be concise.',
        messages,
        tools,
        // @ts-ignore - maxSteps is supported in newest SDK but types might lag
        maxSteps: 5, // Allow multi-step reasoning (Goal -> Tool -> Result -> Answer)
        // onStepFinish: (event) => console.log('Agent Step:', event.toolCalls),
    });
}
