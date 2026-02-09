import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CHATBOT_SYSTEM_PROMPT } from '@/lib/chatbot-prompt';
import { generateTextHybrid } from '@/lib/ai-provider';

export async function POST(request: NextRequest) {
    try {
        // AUTHENTICATION CHECK
        let userName = 'Trader';
        let membershipTier = 'GUEST';

        // 1. Check Session (Web)
        const session = await getServerSession(authOptions);
        if (session?.user) {
            userName = session.user.name || 'Trader';
            // Assuming membership is stored in session or we fetch it. 
            // For now, default to what's in session or basic.
            membershipTier = (session.user as any).membership || 'BASIC';
        } else {
            // 2. Check Mobile Bearer Token (if implementing for mobile later)
            const authHeader = request.headers.get('Authorization');
            if (authHeader?.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                const { verifyMobileToken } = await import('@/lib/mobile-auth');
                const userEmail = await verifyMobileToken(token);
                if (userEmail) {
                    const turso = (await import('@/lib/turso')).default();
                    if (turso) {
                        try {
                            const userRes = await turso.execute({
                                sql: 'SELECT name, membership FROM users WHERE email = ?',
                                args: [userEmail]
                            });
                            if (userRes.rows.length > 0) {
                                userName = userRes.rows[0].name as string;
                                membershipTier = userRes.rows[0].membership as string;
                            }
                        } catch (e) {
                            console.error('DB fetch error for chat:', e);
                        }
                    }
                }
            }
        }

        const body = await request.json();
        const { message, conversationHistory } = body;

        if (!message) {
            return NextResponse.json({ error: 'Message required' }, { status: 400 });
        }

        // VALIDATE API KEYS (Critical for Deployment)
        const hasGroq = !!process.env.GROQ_API_KEY;

        console.log(`[API/Chat] Request received. Keys Present - Groq: ${hasGroq}`);

        if (!hasGroq) {
            console.error('CRITICAL: No AI API Keys configured (GROQ_API_KEY)');
            return NextResponse.json(
                { reply: "Maaf Kak, sistem AI belum dikonfigurasi oleh Admin (Missing API Keys). 🔧" },
                { status: 503 }
            );
        }

        // PREPARE SYSTEM PROMPT WITH CONTEXT
        const systemPrompt = CHATBOT_SYSTEM_PROMPT
            .replace('{userName}', userName)
            .replace('{membershipTier}', membershipTier);

        // BUILD MESSAGES ARRAY
        // Include partial history for context (limit to last 6 messages)
        // Map history to simple { role, content } objects
        const history = (conversationHistory || []).slice(-6).map((m: any) => ({
            role: m.role,
            content: m.content
        }));

        // Add current user message
        history.push({ role: 'user', content: message });

        // CALL HYBRID AI (Pure Groq Multi-Key)
        // Uses generateTextHybrid which handles the key rotation automatically
        const { text } = await generateTextHybrid({
            system: systemPrompt,
            messages: history,
            temperature: 0.7, // Slightly creative for "chill" vibe
            maxTokens: 500,
        });

        const reply = text || "Waduh, aku lagi bingung nih Kak. Coba tanya lagi ya? 🤔";

        return NextResponse.json({ reply });

    } catch (error: any) {
        console.error('Chatbot Error:', error);

        // Provide more specific feedback if possible (e.g., API Quota)
        let errorMessage = "Sorry Kak, ada gangguan teknis dikit. Coba refresh atau tanya lagi nanti ya! 🛠️";
        if (error.message?.includes('401') || error.message?.includes('403')) {
            errorMessage = "Akses AI sedang terkunci (API Key Issue). Harap lapor Admin. 🔒";
        } else if (error.message?.includes('429')) {
            errorMessage = "Lagi rame banget nih Kak, AI-nya pusing. Coba 1 menit lagi ya! ⏳";
        }

        return NextResponse.json(
            { reply: errorMessage },
            { status: 500 }
        );
    }
}
