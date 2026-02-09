import { streamTextHybrid } from '@/lib/ai-provider';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { ANALYSIS_PROMPT } from '@/lib/analysis-prompt';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const userEmail = session?.user?.email || 'unknown';
        const userTier = session?.user?.tier || 'GUEST';

        // Strict VVIP Check
        console.log(`[VVIP Chat] User: ${userEmail} | Tier: ${userTier}`);

        // TEMPORARY BYPASS FOR DEBUGGING: Allow if clearly not production or if we want to test
        // In production, uncomment the check below:
        // if (userTier !== 'VVIP' && userTier !== 'VIP') { // Allow VIP for now?
        //     console.warn('[VVIP Chat] Unauthorized access attempt.');
        //     return NextResponse.json({ error: 'Akses khusus VVIP. Silakan upgrade membership Anda.' }, { status: 403 });
        // }

        // VALIDATE API KEYS
        // Check for ANY valid key (Groq or Google)
        const hasGroq = !!(process.env.GROQ_API_KEY || process.env.GROQ_API_KEYS);
        const hasGoogle = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;

        if (!hasGroq && !hasGoogle) {
            console.error('[VVIP Chat] CRITICAL: No AI API keys found.');
            return NextResponse.json({ error: 'Sistem AI sedang maintenance (Missing Configuration).' }, { status: 503 });
        }

        const body = await req.json();
        const { messages } = body;

        if (!messages || !Array.isArray(messages)) {
            console.error('[VVIP Chat] Invalid request body:', body);
            return NextResponse.json({ error: 'Format pesan tidak valid.' }, { status: 400 });
        }

        // Context: Arra7 VVIP System Prompt
        // Adapted for chat context
        const systemPrompt = ANALYSIS_PROMPT.replace('{market_data}',
            `USER CONTEXT: ${userEmail} (${userTier}).
            TUGAS: Bertindaklah sebagai konsultan trading profesional & personal (AI Companion).
            GAYA BICARA: Santai tapi sangat berwawasan, gunakan emoji yang relevan, suportif, dan tajam dalam analisa.
            INSTRUKSI:
            1. Jika user bertanya market, gunakan pengetahuan umum atau minta data spesifik jika perlu.
            2. Fokus pada psikologi trading dan manajemen risiko.
            3. Berikan jawaban yang singkat, padat, dan actionable kecuali diminta menjelaskan detail.
            4. Jangan berhalusinasi data harga jika tidak diberikan.`);

        // Call Hybrid AI Provider
        const result = await streamTextHybrid({
            system: systemPrompt,
            messages,
            temperature: 0.7, // Slightly creative for chat
            maxTokens: 1000,
        });

        return result.toTextStreamResponse();

    } catch (error: any) {
        console.error('[VVIP Chat] Unhandled Error:', error);

        // Detailed error for client (in dev) or generic in prod
        const errorMessage = error.message || 'Terjadi kesalahan internal pada server AI.';
        return NextResponse.json({
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? String(error) : undefined
        }, { status: 500 });
    }
}
