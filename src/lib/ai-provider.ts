import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, streamText } from 'ai';
import type { ModelMessage } from 'ai';

type ProviderName = 'google' | 'groq' | 'cerebras';

type ProviderEntry = {
    provider: ProviderName;
    modelId: string;
    apiKey: string;
    modelFactory?: any;
};

type CerebrasChatCompletionResponse = {
    message?: string;
    error?: { message?: string };
    choices?: Array<{ message?: { content?: unknown } }>;
};

const providerPool: ProviderEntry[] = [];

function splitCsv(value?: string): string[] {
    return (value || '')
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v.length > 0);
}

function collectKeys(baseVars: string[], numberedUntil = 20): string[] {
    const keys: string[] = [];
    for (const base of baseVars) {
        keys.push(...splitCsv(process.env[base]));
        for (let i = 2; i <= numberedUntil; i++) {
            const value = process.env[`${base}_${i}`];
            if (value && value.trim().length > 0) {
                keys.push(value.trim());
            }
        }
    }
    return Array.from(new Set(keys));
}

function uniqueModels(models: string[]): string[] {
    return Array.from(new Set(models.map((model) => model.trim()).filter(Boolean)));
}

function getProviderModels(provider: ProviderName, preferredModel?: string): string[] {
    if (provider === 'google') {
        return uniqueModels([preferredModel || 'gemini-2.5-flash', 'gemini-2.5-flash', 'gemini-flash-latest']);
    }
    if (provider === 'cerebras') {
        return uniqueModels([preferredModel || 'qwen-3.8-27b', 'qwen-3.8-27b', 'gpt-oss-120b']);
    }

    return uniqueModels([
        preferredModel || 'qwen/qwen3.8-27b',
        'qwen/qwen3.8-27b',
        'openai/gpt-oss-120b',
        'openai/gpt-oss-20b',
    ]);
}

function ensureProvidersInitialized() {
    if (providerPool.length > 0) {
        return;
    }

    // 1. Google Gemini (Primary high-performance free provider with zero payment blocks)
    const googleKeys = collectKeys(['GOOGLE_GENERATIVE_AI_API_KEY', 'GEMINI_API_KEY']);
    const googleModel = process.env.GOOGLE_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const googleEntries: ProviderEntry[] = [];

    for (const apiKey of googleKeys) {
        const googleFactory = createGoogleGenerativeAI({ apiKey });
        for (const modelId of getProviderModels('google', googleModel)) {
            googleEntries.push({
                provider: 'google',
                modelId,
                apiKey,
                modelFactory: googleFactory,
            });
        }
    }

    // 2. Groq (Fast open-source inference)
    const groqModel = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';
    const groqKeys = collectKeys(['GROQ_API_KEYS', 'GROQ_API_KEY']);
    const groqEntries: ProviderEntry[] = [];

    for (const apiKey of groqKeys) {
        const modelFactory = createOpenAI({
            baseURL: 'https://api.groq.com/openai/v1',
            apiKey,
        });

        for (const modelId of getProviderModels('groq', groqModel)) {
            groqEntries.push({
                provider: 'groq',
                modelId,
                apiKey,
                modelFactory,
            });
        }
    }

    // 3. Cerebras
    const cerebrasModel = process.env.CEREBRAS_MODEL || process.env.CELEBRAS_MODEL || 'qwen-3.8-27b';
    const cerebrasKeys = collectKeys([
        'CEREBRAS_API_KEYS', 'CEREBRAS_API_KEY', 'CELEBRAS_API_KEYS', 'CELEBRAS_API_KEY',
    ]);
    const cerebrasEntries: ProviderEntry[] = [];

    for (const apiKey of cerebrasKeys) {
        const modelFactory = createOpenAI({ baseURL: 'https://api.cerebras.ai/v1', apiKey });
        for (const modelId of getProviderModels('cerebras', cerebrasModel)) {
            cerebrasEntries.push({ provider: 'cerebras', modelId, apiKey, modelFactory });
        }
    }

    // Place Google Gemini first for top reliability & speed, then Groq, then Cerebras
    providerPool.push(...googleEntries, ...groqEntries, ...cerebrasEntries);

    if (providerPool.length === 0) {
        console.warn(
            '[AI Provider] No API keys found. Set GOOGLE_GENERATIVE_AI_API_KEY, GROQ_API_KEY, or CEREBRAS_API_KEY.',
        );
        return;
    }

    const googleCount = providerPool.filter((p) => p.provider === 'google').length;
    const groqCount = providerPool.filter((p) => p.provider === 'groq').length;
    const cerebrasCount = providerPool.filter((p) => p.provider === 'cerebras').length;
    console.log(`[AI Provider] Loaded ${providerPool.length} routes (Google=${googleCount}, Groq=${groqCount}, Cerebras=${cerebrasCount}).`);
}

function getPrimaryModel(index?: number) {
    ensureProvidersInitialized();
    if (providerPool.length === 0) {
        throw new Error('No AI provider keys configured');
    }

    const selectedIndex =
        index !== undefined
            ? index % providerPool.length
            : 0;
    const selected = providerPool[selectedIndex];
    if (!selected.modelFactory) {
        throw new Error(`Model factory is not available for provider ${selected.provider}`);
    }
    return selected.modelFactory(selected.modelId);
}

function getProviderInfo(entry: ProviderEntry): string {
    return `${entry.provider}:${entry.modelId}`;
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    return 'unknown error';
}

function normalizeMessageContent(content: unknown): string {
    if (typeof content === 'string') return content;
    if (!Array.isArray(content)) return '';
    return content.map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part && typeof part.text === 'string') return part.text;
        return '';
    }).filter(Boolean).join('\n');
}

function toOpenAICompatibleMessages(system: string | undefined, messages?: ModelMessage[]) {
    const normalized = (messages || [])
        .map((message) => ({ role: String(message.role || 'user'), content: normalizeMessageContent(message.content) }))
        .filter((message) => message.content.length > 0);
    if (system?.trim()) normalized.unshift({ role: 'system', content: system.trim() });
    return normalized;
}

async function generateTextWithCerebras(params: {
    apiKey: string;
    modelId: string;
    system?: string;
    messages?: ModelMessage[];
    prompt?: string;
    maxTokens?: number;
    temperature?: number;
}) {
    const messages = params.prompt
        ? toOpenAICompatibleMessages(params.system, [{ role: 'user', content: params.prompt } as ModelMessage])
        : toOpenAICompatibleMessages(params.system, params.messages);
    const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${params.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: params.modelId, messages, temperature: params.temperature, max_completion_tokens: params.maxTokens }),
    });
    const raw = await response.text();
    let parsed: CerebrasChatCompletionResponse | null = null;
    try { parsed = JSON.parse(raw) as CerebrasChatCompletionResponse; } catch { parsed = null; }
    if (!response.ok) throw new Error(String(parsed?.message || parsed?.error?.message || raw || `Cerebras request failed with status ${response.status}`));
    const text = parsed?.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || !text.trim()) throw new Error('No analysis returned from Cerebras');
    return { text };
}

function isPermanentProviderError(message: string): boolean {
    const normalized = message.toLowerCase();
    return (
        normalized.includes('organization_restricted') ||
        normalized.includes('organization has been restricted') ||
        normalized.includes('invalid api key') ||
        normalized.includes('unauthorized') ||
        normalized.includes('payment required') ||
        normalized.includes('payment_required') ||
        normalized.includes('insufficient_quota') ||
        normalized.includes('"code":"quota"') ||
        normalized.includes('not found') ||
        normalized.includes('404') ||
        normalized.includes('model_not_found') ||
        normalized.includes('does not exist')
    );
}

function toPublicProviderError(message: string): string {
    const normalized = message.toLowerCase();

    if (
        normalized === 'not found' ||
        normalized.includes('404') ||
        normalized.includes('model_not_found') ||
        normalized.includes('does not exist')
    ) {
        return 'AI model untuk analisa market tidak ditemukan di environment production. Periksa konfigurasi model AI di Vercel.';
    }

    if (normalized.includes('invalid api key') || normalized.includes('unauthorized')) {
        return 'AI provider key tidak valid atau belum aktif di environment production.';
    }

    if (normalized.includes('no ai provider keys configured')) {
        return 'AI provider belum dikonfigurasi di environment production.';
    }

    return message;
}

export function hasAnyAIProviderConfigured(): boolean {
    ensureProvidersInitialized();
    return providerPool.length > 0;
}

export function getAIProviderStats() {
    ensureProvidersInitialized();
    const google = providerPool.filter((p) => p.provider === 'google').length;
    const cerebras = providerPool.filter((p) => p.provider === 'cerebras').length;
    const groq = providerPool.filter((p) => p.provider === 'groq').length;
    return {
        total: providerPool.length,
        google,
        groq,
        cerebras,
    };
}

// Keep backward compatibility for existing imports.
export const AI_MODELS = {
    get groq() {
        return getPrimaryModel();
    },
    get primary() {
        return getPrimaryModel();
    },
};

export async function streamTextHybrid(params: {
    system?: string;
    messages: ModelMessage[];
    maxTokens?: number;
    temperature?: number;
}) {
    ensureProvidersInitialized();
    if (providerPool.length === 0) {
        throw new Error('No AI provider keys configured');
    }

    let lastError: unknown = null;
    const candidates = [...providerPool];

    for (let attempt = 0; attempt < candidates.length; attempt++) {
        const entry = candidates[attempt];
        const providerLabel = getProviderInfo(entry);

        try {
            console.log(
                `[AI Provider] Stream attempt ${attempt + 1}/${candidates.length} using ${providerLabel}`,
            );

            return await streamText({
                model: entry.modelFactory(entry.modelId),
                system: params.system,
                messages: params.messages,
                maxOutputTokens: params.maxTokens,
                temperature: params.temperature,
            });
        } catch (error: unknown) {
            lastError = error;
            const message = getErrorMessage(error);
            console.error(
                `[AI Provider] Stream attempt ${attempt + 1} failed (${providerLabel}): ${message}`,
            );

            if (isPermanentProviderError(message)) {
                const idx = providerPool.findIndex((p) => p.apiKey === entry.apiKey && p.modelId === entry.modelId);
                if (idx !== -1) {
                    providerPool.splice(idx, 1);
                    console.warn(`[AI Provider] Removed failed route from global pool: ${providerLabel}`);
                }
            }
        }
    }

    if (lastError instanceof Error) {
        throw new Error(toPublicProviderError(lastError.message));
    }
    throw new Error('Semua AI provider gagal memproses analisa.');
}

export async function generateTextHybrid(params: {
    prompt?: string;
    messages?: ModelMessage[];
    system?: string;
    maxTokens?: number;
    temperature?: number;
}) {
    if (!params.prompt && !params.messages) {
        throw new Error('Either prompt or messages must be provided');
    }

    ensureProvidersInitialized();
    if (providerPool.length === 0) {
        throw new Error('No AI provider keys configured');
    }

    let lastError: unknown = null;
    const candidates = [...providerPool];

    for (let attempt = 0; attempt < candidates.length; attempt++) {
        const entry = candidates[attempt];
        const providerLabel = getProviderInfo(entry);

        try {
            console.log(
                `[AI Provider] Generate attempt ${attempt + 1}/${candidates.length} using ${providerLabel}`,
            );

            if (entry.provider === 'cerebras') {
                return await generateTextWithCerebras({
                    apiKey: entry.apiKey,
                    modelId: entry.modelId,
                    system: params.system,
                    messages: params.messages,
                    prompt: params.prompt,
                    maxTokens: params.maxTokens,
                    temperature: params.temperature,
                });
            }

            if (params.prompt) {
                return await generateText({
                    model: entry.modelFactory(entry.modelId),
                    system: params.system,
                    maxOutputTokens: params.maxTokens,
                    temperature: params.temperature,
                    prompt: params.prompt,
                });
            }

            return await generateText({
                model: entry.modelFactory(entry.modelId),
                system: params.system,
                maxOutputTokens: params.maxTokens,
                temperature: params.temperature,
                messages: params.messages || [],
            });
        } catch (error: unknown) {
            lastError = error;
            const message = getErrorMessage(error);
            console.error(
                `[AI Provider] Generate attempt ${attempt + 1} failed (${providerLabel}): ${message}`,
            );

            if (isPermanentProviderError(message)) {
                const idx = providerPool.findIndex((p) => p.apiKey === entry.apiKey && p.modelId === entry.modelId);
                if (idx !== -1) {
                    providerPool.splice(idx, 1);
                    console.warn(`[AI Provider] Removed failed route from global pool: ${providerLabel}`);
                }
            }
        }
    }

    if (lastError instanceof Error) {
        throw new Error(toPublicProviderError(lastError.message));
    }
    throw new Error('Semua AI provider gagal memproses analisa.');
}
