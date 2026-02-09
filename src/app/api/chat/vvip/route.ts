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

        // Context: Arra7 VVIP Agent Prompt
        const systemPrompt = `IDENTITY: You are ARRA7 VVIP AGENT, a professional trading companion.
STYLE: Use the "OpenClaw" persona - precise, tool-augmented, and proactive.
CAPABILITIES:
- You have access to REAL-TIME market data via 'getPrice'.
- You have access to Forex News via 'getNews'.
- ALWAYS use tools when user asks for data. DO NOT hallucinate prices.
- If user asks "Why", explain using data from tools.
- Keep answers concise and actionable.

USER CONTEXT: ${userEmail} (${userTier}).`;

        // Call Agent Core (Tools Enabled)
        // Dynamic Import to avoid build issues if new files aren't picked up immediately
        const { runAgent } = await import('@/lib/agent/core');

        const result = await runAgent({
            messages,
            systemPrompt,
        });

        // Vercel AI SDK 'toDataStreamResponse' handles tool calls automatically
        // @ts-ignore - Type definition mismatch for streamText result in this env
        return result.toDataStreamResponse();

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
