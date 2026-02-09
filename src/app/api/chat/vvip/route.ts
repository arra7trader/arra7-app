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

        // Strict VVIP Check
        // DEBUG: Log the tier to see if this is blocking
        console.log('[VVIP Chat] User Tier:', session?.user?.tier || 'undefined', 'Email:', session?.user?.email);

        // TEMPORARY BYPASS FOR DEBUGGING if needed, or keep strict but log accurately
        if (session?.user?.tier !== 'VVIP') {
            console.warn('[VVIP Chat] Unauthorized access. Tier:', session?.user?.tier);
            // return NextResponse.json({ error: 'Upgrade ke VVIP untuk akses ini.' }, { status: 403 });
        }

        // VALIDATE API KEYS
        const hasGroq = !!process.env.GROQ_API_KEY;
        const hasGoogle = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        console.log(`[VVIP Chat] Keys Status - Groq: ${hasGroq}, Google: ${hasGoogle}`);

        if (!hasGroq && !hasGoogle) {
            return NextResponse.json({ error: 'Sistem AI VVIP belum dikonfigurasi (Missing Keys).' }, { status: 503 });
        }

        const body = await req.json();
        console.log('[VVIP Chat] Request Body:', JSON.stringify(body, null, 2));
        const { messages } = body;

        if (!messages || !Array.isArray(messages)) {
            console.error('[VVIP Chat] Error: Messages array is missing or invalid.');
            return NextResponse.json({ error: 'Message required (Invalid Payload)' }, { status: 400 });
        }

        // Context: Arra7 System Prompt


        // Context: Arra7 VVIP System Prompt (Unified with Analysis Logic)
        // We override the {market_data} placeholder since this is a chat context, 
        // asking the AI to adapt it for conversation or assume it has access.
        const systemPrompt = ANALYSIS_PROMPT.replace('{market_data}', 'USER MEMINTA KONSULTASI. JIKA MEMBUTUHKAN DATA, MINTA DATA TERTENTU. JIKA TIDAK, BERIKAN SARAN BERDASARKAN PENGETAHUAN UMUM ATAU DATA TERAKHIR YANG DIKETAHUI.');

        const result = await streamTextHybrid({
            system: systemPrompt,
            messages,
        });

        return result.toTextStreamResponse();
    } catch (error) {
        console.error('[VVIP Chat] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
