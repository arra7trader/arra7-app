import { createOpenAI } from '@ai-sdk/openai';
import { generateText, ModelMessage, streamText } from 'ai';

type ProviderName = 'cerebras' | 'groq';

type ProviderEntry = {
    provider: ProviderName;
    modelId: string;
    apiKey: string;
    modelFactory?: ReturnType<typeof createOpenAI>;
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

function interleaveProviders(groups: ProviderEntry[][]): ProviderEntry[] {
    const result: ProviderEntry[] = [];
    const queues = groups.map((group) => [...group]).filter((group) => group.length > 0);

    while (queues.some((group) => group.length > 0)) {
        for (const group of queues) {
            const next = group.shift();
            if (next) {
                result.push(next);
            }
        }
    }

    return result;
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
    const cerebrasEntries: ProviderEntry[] = [];
    const groqEntries: ProviderEntry[] = [];

    for (const apiKey of cerebrasKeys) {
        const modelFactory = createOpenAI({
            baseURL: 'https://api.cerebras.ai/v1',
            apiKey,
        });

        for (const modelId of getProviderModels('cerebras', cerebrasModel)) {
            cerebrasEntries.push({
                provider: 'cerebras',
                modelId,
                apiKey,
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
            groqEntries.push({
                provider: 'groq',
                modelId,
                apiKey,
                modelFactory,
            });
        }
    }

    providerPool.push(...interleaveProviders([cerebrasEntries, groqEntries]));

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
    if (!selected.modelFactory) {
        throw new Error(`Model factory is not available for provider ${selected.provider}`);
    }
    return selected.modelFactory(selected.modelId);
}

function getProviderInfo(index: number) {
    const selected = providerPool[index % providerPool.length];
    return `${selected.provider}:${selected.modelId}`;
}

function getBalancedStartIndex(): number {
    const providers = Array.from(new Set(providerPool.map((entry) => entry.provider)));
    if (providers.length === 0) {
        return 0;
    }

    const chosenProvider = providers[Math.floor(Math.random() * providers.length)];
    const matchingIndexes = providerPool
        .map((entry, index) => ({ entry, index }))
        .filter(({ entry }) => entry.provider === chosenProvider)
        .map(({ index }) => index);

    if (matchingIndexes.length === 0) {
        return Math.floor(Math.random() * providerPool.length);
    }

    return matchingIndexes[Math.floor(Math.random() * matchingIndexes.length)];
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
    if (typeof content === 'string') {
        return content;
    }

    if (Array.isArray(content)) {
        return content
            .map((part) => {
                if (typeof part === 'string') return part;
                if (part && typeof part === 'object' && 'text' in part && typeof (part as { text?: unknown }).text === 'string') {
                    return String((part as { text: string }).text);
                }
                return '';
            })
            .filter(Boolean)
            .join('\n');
    }

    if (content && typeof content === 'object' && 'text' in content && typeof (content as { text?: unknown }).text === 'string') {
        return String((content as { text: string }).text);
    }

    return '';
}

function toOpenAICompatibleMessages(system: string | undefined, messages?: ModelMessage[]) {
    const normalized = (messages || [])
        .map((message) => {
            const role = String(message.role || 'user');
            const content = normalizeMessageContent(message.content);
            if (!content) return null;
            return {
                role,
                content,
            };
        })
        .filter(Boolean) as Array<{ role: string; content: string }>;

    if (system?.trim()) {
        normalized.unshift({
            role: 'system',
            content: system.trim(),
        });
    }

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
        headers: {
            Authorization: `Bearer ${params.apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: params.modelId,
            messages,
            temperature: params.temperature,
            max_completion_tokens: params.maxTokens,
        }),
    });

    const raw = await response.text();
    let parsed: any = null;
    try {
        parsed = JSON.parse(raw);
    } catch {
        parsed = null;
    }

    if (!response.ok) {
        const detail =
            parsed?.message ||
            parsed?.error?.message ||
            raw ||
            `Cerebras request failed with status ${response.status}`;
        throw new Error(String(detail));
    }

    const text = parsed?.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || text.trim().length === 0) {
        throw new Error('No analysis returned from Cerebras');
    }

    return { text };
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
    const startIndex = getBalancedStartIndex();

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
            const entry = providerPool[providerIndex % providerPool.length];
            if (entry.provider === 'cerebras') {
                throw new Error('Cerebras streaming is not supported by the current adapter');
            }
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
    const startIndex = getBalancedStartIndex();

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
            const entry = providerPool[providerIndex % providerPool.length];
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
