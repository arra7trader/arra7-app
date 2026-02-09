import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { AI_MODELS } from '@/lib/ai-provider';

export async function GET() {
    const results = {
        groq: { status: 'pending', message: '', latency: 0 },
    };

    // Test Groq
    try {
        const start = Date.now();
        const response = await generateText({
            model: AI_MODELS.groq,
            prompt: 'Test connection. Reply with "OK".',
            maxOutputTokens: 10,
        });
        results.groq = {
            status: 'active',
            message: response.text,
            latency: Date.now() - start
        };
    } catch (error: any) {
        results.groq = {
            status: 'failed',
            message: error.message,
            latency: 0
        };
    }

    return NextResponse.json({
        timestamp: new Date().toISOString(),
        providers: results
    });
}
