import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, streamText } from 'ai';
import type { ModelMessage } from 'ai';

type ProviderName = 'google' | 'freepi' | 'groq';

type ProviderEntry = {
    provider: ProviderName;
    modelId: string;
    apiKey: string;
    modelFactory: (id: string) => any;
};

const providerPool: ProviderEntry[] = [];

// Built-in 24/7 free token fallback for FreePI
const DEFAULT_FREEPI_TOKEN =
    'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI0ZTE2MjAzZi01YzAxLTQ2MjktOTYxYy03ZWIyYTgwOTQ2MmQiLCJpYXQiOjE3OTQxNjAxMjcsImV4cCI6MTgwMTkzNjEyN30.FfUozRrBrNkySF8cCRD1QwRAxvCu-pagG8Onh9o8nlc';

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
        return uniqueModels([
            preferredModel || 'gemini-2.5-flash',
            'gemini-2.5-flash',
            'gemini-flash-latest',
        ]);
    }

    if (provider === 'freepi') {
        return uniqueModels([
            preferredModel || 'glm-5.3-flash',
            'glm-5.3-flash',
            'deepseek-v4.1-flash',
            'particle',
            'qwen-2.5-72b-instruct',
        ]);
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

    // 1. Google Gemini (Primary high-performance free provider)
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
                modelFactory: (id: string) => googleFactory(id),
            });
        }
    }

    // 2. FreePI (High-reliability zero-cost OpenAI-compatible secondary backup)
    const freepiKeys = collectKeys(['FREEPI_API_KEY', 'FREEPI_API_KEYS']);
    if (freepiKeys.length === 0) {
        freepiKeys.push(DEFAULT_FREEPI_TOKEN);
    }
    const freepiModel = process.env.FREEPI_MODEL || 'glm-5.3-flash';
    const freepiEntries: ProviderEntry[] = [];

    for (const apiKey of freepiKeys) {
        const freepiClient = createOpenAI({
            baseURL: 'https://api.freepi.ai/v1',
            apiKey,
        });

        for (const modelId of getProviderModels('freepi', freepiModel)) {
            freepiEntries.push({
                provider: 'freepi',
                modelId,
                apiKey,
                modelFactory: (id: string) => freepiClient.chat(id),
            });
        }
    }

    // 3. Groq (Legacy open-source fallback pool)
    const groqModel = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';
    const groqKeys = collectKeys(['GROQ_API_KEYS', 'GROQ_API_KEY']);
    const groqEntries: ProviderEntry[] = [];

    for (const apiKey of groqKeys) {
        const groqClient = createOpenAI({
            baseURL: 'https://api.groq.com/openai/v1',
            apiKey,
        });

        for (const modelId of getProviderModels('groq', groqModel)) {
            groqEntries.push({
                provider: 'groq',
                modelId,
                apiKey,
                modelFactory: (id: string) => groqClient.chat(id),
            });
        }
    }

    // Pool priority: Google Gemini (Primary) -> FreePI (Secondary backup) -> Groq (Tertiary)
    providerPool.push(...googleEntries, ...freepiEntries, ...groqEntries);

    if (providerPool.length === 0) {
        console.warn(
            '[AI Provider] No AI provider keys configured.',
        );
        return;
    }

    const googleCount = providerPool.filter((p) => p.provider === 'google').length;
    const freepiCount = providerPool.filter((p) => p.provider === 'freepi').length;
    const groqCount = providerPool.filter((p) => p.provider === 'groq').length;
    console.log(
        `[AI Provider] Loaded ${providerPool.length} routes (Google=${googleCount}, FreePI=${freepiCount}, Groq=${groqCount}).`,
    );
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
    const freepi = providerPool.filter((p) => p.provider === 'freepi').length;
    const groq = providerPool.filter((p) => p.provider === 'groq').length;
    return {
        total: providerPool.length,
        google,
        freepi,
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
