import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { AI_MODELS, getAIProviderStats, hasAnyAIProviderConfigured } from '@/lib/ai-provider';

export async function GET() {
    const stats = getAIProviderStats();
    const results = {
        status: 'pending',
        message: '',
        latency: 0,
    };

    if (!hasAnyAIProviderConfigured()) {
        return NextResponse.json({
            timestamp: new Date().toISOString(),
            providers: {
                configured: false,
                ...stats,
            },
            test: {
                ...results,
                status: 'failed',
                message: 'No AI provider keys configured',
            },
        });
    }

    try {
        const start = Date.now();
        const response = await generateText({
            model: AI_MODELS.primary,
            prompt: 'Test connection. Reply with "OK".',
            maxOutputTokens: 10,
        });
        results.status = 'active';
        results.message = response.text;
        results.latency = Date.now() - start;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        results.status = 'failed';
        results.message = message;
        results.latency = 0;
    }

    return NextResponse.json({
        timestamp: new Date().toISOString(),
        providers: {
            configured: true,
            ...stats,
        },
        test: results,
    });
}
