import { streamText, generateText, tool } from 'ai';
import { AI_MODELS } from '@/lib/ai-provider';
import {
    priceTool,
    newsTool,
    createAnalyzeForexTool,
    createAnalyzeStockTool,
    mlPredictionTool,
    signalHistoryTool,
    portfolioTool,
    marketHoursTool,
} from './tools';

export interface AgentRequest {
    messages: any[];
    systemPrompt?: string;
    userId: string;
}

/**
 * Core Agent Function (OpenClaw-Inspired)
 * Uses the Vercel AI SDK 'tool' calling capabilities with 8 tools.
 * Supports multi-step reasoning (maxSteps: 8) for chaining tools.
 */
export async function runAgent({ messages, systemPrompt, userId }: AgentRequest) {

    // Define all 8 available tools
    // Define all 8 available tools
    const tools = {
        getPrice: priceTool,
        getNews: newsTool,
        analyzeForex: createAnalyzeForexTool(userId),
        analyzeStock: createAnalyzeStockTool(userId),
        getMLPrediction: mlPredictionTool,
        getSignalHistory: signalHistoryTool,
        getPortfolio: portfolioTool,
        getMarketHours: marketHoursTool,
    };

    // Use Llama 3.1 8B Instant (supports tool calling via Groq)
    const model = AI_MODELS.groq;

    return await streamText({
        model,
        system: systemPrompt || 'You are ARRA7 Private Intelligence. Use tools to answer. Be concise and proactive.',
        messages,
        tools,
        // @ts-ignore - maxSteps is supported in newest SDK
        maxSteps: 8, // Increased from 5 → 8 for multi-tool chaining (OpenClaw-style)
        onStepFinish: (event) => {
            // Log tool activity for debugging
            if (event.toolCalls && event.toolCalls.length > 0) {
                console.log('[Agent] Step complete. Tools called:', event.toolCalls.map((tc: any) => tc.toolName).join(', '));
            }
        },
    });
}
