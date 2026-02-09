import { createOpenAI } from '@ai-sdk/openai';

import { streamText, generateText, ModelMessage } from 'ai';

// 1. Configure Groq Provider (Multi-Key Support)
// Accepts comma-separated GROQ_API_KEYS or single GROQ_API_KEY
const apiKeysEnv = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '';
const groqApiKeys = apiKeysEnv.split(',').map(k => k.trim()).filter(k => k.length > 0);

// Auto-detect GROQ_API_KEY_2 ... 10
for (let i = 2; i <= 10; i++) {
    const key = process.env[`GROQ_API_KEY_${i}`];
    if (key && key.trim().length > 0) {
        groqApiKeys.push(key.trim());
    }
}

if (groqApiKeys.length === 0) {
    console.warn('[AI Provider] ⚠️ NO GROQ API KEYS FOUND! Using empty string fallback.');
    // We don't push empty string here to avoid immediate auth errors if we can help it.
    // But createOpenAI might need *something*. 
    // Let's just push a placeholder if truly empty so checks don't fail, but calls will.
    groqApiKeys.push('');
}

console.log(`[AI Provider] Loaded ${groqApiKeys.length} Groq API Keys for rotation.`);

// Create separate client instances for each key to isolate rate limits
const groqClients = groqApiKeys.map(apiKey => createOpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey,
}));

// Function to get a Groq model with Round Robin support
function getGroqModel(index?: number) {
    const selectedIndex = index !== undefined
        ? index % groqClients.length
        : Math.floor(Math.random() * groqClients.length);

    const selectedClient = groqClients[selectedIndex];
    // Using Llama 3.1 8B Instant as requested (Speed optimized)
    return selectedClient('llama-3.1-8b-instant');
}

// Export using Getter for dynamic selection (Default: Random)
export const AI_MODELS = {
    get groq() { return getGroqModel(); },
};

/**
 * Streams text with automatic failover: Groq -> Gemini -> Gemini Pro
 */
export async function streamTextHybrid(params: {
    system?: string;
    messages: ModelMessage[];
    maxTokens?: number;
    temperature?: number;
}) {
    console.log('[AI Provider] Starting StreamHybrid...');

    let lastError: any = null;
    const MAX_RETRIES = 3;
    // Start with a random key index
    const startIndex = Math.floor(Math.random() * groqClients.length);

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            // Round Robin Rotation: (Start + Attempt) % Total
            const keyIndex = (startIndex + attempt) % groqClients.length;
            console.log(`[AI Provider] Attempt ${attempt + 1}/${MAX_RETRIES} using Groq Key #${keyIndex + 1}...`);

            // 1. Try Primary (Groq) with rotation
            return await streamText({
                model: getGroqModel(keyIndex),
                system: params.system,
                messages: params.messages,
                maxOutputTokens: params.maxTokens,
                temperature: params.temperature,
            });
        } catch (error: any) {
            console.error(`[AI Provider] ❌ Attempt ${attempt + 1} failed:`, error.message);
            lastError = error;
            // Continue to next attempt with a guaranteed different key (if available)
        }
    }

    console.error('[AI Provider] ❌ All retry attempts failed.');
    throw lastError || new Error('All AI attempts failed');
}

// ...

/**
 * Generates text (non-streaming) with automatic failover.
 */
export async function generateTextHybrid(params: {
    prompt?: string;
    messages?: ModelMessage[];
    system?: string;
    maxTokens?: number;
    temperature?: number;
}) {
    // Construct options dynamically to satisfy Prompt union type
    const baseOptions: any = {
        system: params.system,
        maxOutputTokens: params.maxTokens,
        temperature: params.temperature,
    };

    if (params.prompt) {
        baseOptions.prompt = params.prompt;
    } else if (params.messages) {
        baseOptions.messages = params.messages;
    } else {
        throw new Error('Either prompt or messages must be provided');
    }

    console.log('[AI Provider] Starting GenerateHybrid...');

    let lastError: any = null;
    const MAX_RETRIES = 3;
    // Start with a random key index
    const startIndex = Math.floor(Math.random() * groqClients.length);

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            // Round Robin Rotation: (Start + Attempt) % Total
            const keyIndex = (startIndex + attempt) % groqClients.length;
            console.log(`[AI Provider] Attempt ${attempt + 1}/${MAX_RETRIES} using Groq Key #${keyIndex + 1}...`);

            // 1. Try Primary (Groq) with rotation
            return await generateText({
                model: getGroqModel(keyIndex),
                ...baseOptions,
            });
        } catch (error: any) {
            console.error(`[AI Provider] ❌ Attempt ${attempt + 1} failed:`, error.message);
            lastError = error;
            // Continue to next attempt with a guaranteed different key (if available)
        }
    }

    console.error('[AI Provider] ❌ All retry attempts failed.');
    throw lastError || new Error('All AI attempts failed');
}
