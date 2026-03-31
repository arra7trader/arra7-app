import { createOpenAI } from '@ai-sdk/openai';
import { generateText, ModelMessage, streamText } from 'ai';

type ProviderName = 'cerebras' | 'groq';

type ProviderEntry = {
    provider: ProviderName;
    modelId: string;
    modelFactory: ReturnType<typeof createOpenAI>;
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
    if (provider === 'groq') {
        return uniqueModels([
            preferredModel || 'llama-3.1-8b-instant',
            'llama-3.1-8b-instant',
            'llama-3.3-70b-versatile',
            'openai/gpt-oss-20b',
        ]);
    }

    return uniqueModels([
        preferredModel || 'llama3.1-8b',
        'llama3.1-8b',
    ]);
}

function ensureProvidersInitialized() {
    if (providerPool.length > 0) {
        return;
    }

    const cerebrasModel =
        process.env.CEREBRAS_MODEL ||
        process.env.CELEBRAS_MODEL ||
        'llama3.1-8b';
    const groqModel = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

    const cerebrasKeys = collectKeys([
        'CEREBRAS_API_KEYS',
        'CEREBRAS_API_KEY',
        // Accept common typo to reduce config mistakes.
        'CELEBRAS_API_KEYS',
        'CELEBRAS_API_KEY',
    ]);

    const groqKeys = collectKeys(['GROQ_API_KEYS', 'GROQ_API_KEY']);

    for (const apiKey of cerebrasKeys) {
        const modelFactory = createOpenAI({
            baseURL: 'https://api.cerebras.ai/v1',
            apiKey,
        });

        for (const modelId of getProviderModels('cerebras', cerebrasModel)) {
            providerPool.push({
                provider: 'cerebras',
                modelId,
                modelFactory,
            });
        }
    }

    for (const apiKey of groqKeys) {
        const modelFactory = createOpenAI({
            baseURL: 'https://api.groq.com/openai/v1',
            apiKey,
        });

        for (const modelId of getProviderModels('groq', groqModel)) {
            providerPool.push({
                provider: 'groq',
                modelId,
                modelFactory,
            });
        }
    }

    if (providerPool.length === 0) {
        console.warn(
            '[AI Provider] No API keys found. Set CEREBRAS_API_KEY or GROQ_API_KEY (and optional numbered variants).',
        );
        return;
    }

    const cerebrasCount = providerPool.filter((p) => p.provider === 'cerebras').length;
    const groqCount = providerPool.filter((p) => p.provider === 'groq').length;
    console.log(
        `[AI Provider] Loaded ${providerPool.length} keys (Cerebras=${cerebrasCount}, Groq=${groqCount}).`,
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
            : Math.floor(Math.random() * providerPool.length);
    const selected = providerPool[selectedIndex];
    return selected.modelFactory(selected.modelId);
}

function getProviderInfo(index: number) {
    const selected = providerPool[index % providerPool.length];
    return `${selected.provider}:${selected.modelId}`;
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

function isPermanentProviderError(message: string): boolean {
    const normalized = message.toLowerCase();
    return (
        normalized.includes('organization_restricted') ||
        normalized.includes('organization has been restricted') ||
        normalized.includes('invalid api key') ||
        normalized.includes('unauthorized') ||
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
    const cerebras = providerPool.filter((p) => p.provider === 'cerebras').length;
    const groq = providerPool.filter((p) => p.provider === 'groq').length;
    return {
        total: providerPool.length,
        cerebras,
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
    const maxAttempts = providerPool.length;
    const startIndex = Math.floor(Math.random() * providerPool.length);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (providerPool.length === 0) {
            break;
        }

        const providerIndex = (startIndex + attempt) % providerPool.length;
        const providerLabel = getProviderInfo(providerIndex);
        try {
            console.log(
                `[AI Provider] Stream attempt ${attempt + 1}/${maxAttempts} using ${providerLabel}`,
            );
            return await streamText({
                model: getPrimaryModel(providerIndex),
                system: params.system,
                messages: params.messages,
                maxOutputTokens: params.maxTokens,
                temperature: params.temperature,
            });
        } catch (error: unknown) {
            lastError = error;
            const message = getErrorMessage(error);
            console.error(
                `[AI Provider] Stream attempt ${attempt + 1} failed: ${message}`,
            );
            if (isPermanentProviderError(message) && providerPool.length > 0) {
                const removeIndex = providerIndex % providerPool.length;
                providerPool.splice(removeIndex, 1);
                console.warn(`[AI Provider] Removed provider from pool due to permanent error: ${providerLabel}`);
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
    const maxAttempts = providerPool.length;
    const startIndex = Math.floor(Math.random() * providerPool.length);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (providerPool.length === 0) {
            break;
        }

        const providerIndex = (startIndex + attempt) % providerPool.length;
        const providerLabel = getProviderInfo(providerIndex);
        try {
            console.log(
                `[AI Provider] Generate attempt ${attempt + 1}/${maxAttempts} using ${providerLabel}`,
            );
            if (params.prompt) {
                return await generateText({
                    model: getPrimaryModel(providerIndex),
                    system: params.system,
                    maxOutputTokens: params.maxTokens,
                    temperature: params.temperature,
                    prompt: params.prompt,
                });
            }

            return await generateText({
                model: getPrimaryModel(providerIndex),
                system: params.system,
                maxOutputTokens: params.maxTokens,
                temperature: params.temperature,
                messages: params.messages || [],
            });
        } catch (error: unknown) {
            lastError = error;
            const message = getErrorMessage(error);
            console.error(
                `[AI Provider] Generate attempt ${attempt + 1} failed: ${message}`,
            );
            if (isPermanentProviderError(message) && providerPool.length > 0) {
                const removeIndex = providerIndex % providerPool.length;
                providerPool.splice(removeIndex, 1);
                console.warn(`[AI Provider] Removed provider from pool due to permanent error: ${providerLabel}`);
            }
        }
    }

    if (lastError instanceof Error) {
        throw new Error(toPublicProviderError(lastError.message));
    }
    throw new Error('Semua AI provider gagal memproses analisa.');
}
