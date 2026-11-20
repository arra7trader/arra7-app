import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, streamText } from 'ai';
import type { ModelMessage } from 'ai';

type ProviderName = 'google' | 'groq';

type ProviderEntry = {
    provider: ProviderName;
    modelId: string;
    apiKey: string;
    modelFactory?: any;
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

    // Place Google Gemini first for top reliability & speed, then Groq
    providerPool.push(...googleEntries, ...groqEntries);

    if (providerPool.length === 0) {
        console.warn(
            '[AI Provider] No API keys found. Set GOOGLE_GENERATIVE_AI_API_KEY or GROQ_API_KEY.',
        );
        return;
    }

    const googleCount = providerPool.filter((p) => p.provider === 'google').length;
    const groqCount = providerPool.filter((p) => p.provider === 'groq').length;
    console.log(`[AI Provider] Loaded ${providerPool.length} routes (Google=${googleCount}, Groq=${groqCount}).`);
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
    const groq = providerPool.filter((p) => p.provider === 'groq').length;
    return {
        total: providerPool.length,
        google,
        groq,
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
