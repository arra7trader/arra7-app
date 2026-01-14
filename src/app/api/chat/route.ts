import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CHATBOT_SYSTEM_PROMPT } from '@/lib/chatbot-prompt';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const MODEL = 'llama-3.3-70b-versatile'; // Fast & capable model

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

        if (!GROQ_API_KEY) {
            return NextResponse.json(
                { reply: "Maaf Kak, sistem AI-nya lagi *maintenance* sebentar. Coba lagi nanti ya! 🙏" },
                { status: 503 }
            );
        }

        // PREPARE SYSTEM PROMPT WITH CONTEXT
        const systemPrompt = CHATBOT_SYSTEM_PROMPT
            .replace('{userName}', userName)
            .replace('{membershipTier}', membershipTier);

        // BUILD MESSAGES ARRAY
        // Include partial history for context (limit to last 4-6 messages to save tokens)
        const messages = [
            { role: 'system', content: systemPrompt },
            ...(conversationHistory || []).slice(-6), // Last 6 turns
            { role: 'user', content: message }
        ];

        // CALL GROQ API
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: MODEL,
                messages: messages,
                temperature: 0.7, // Slightly creative for "chill" vibe
                max_tokens: 500,
            }),
        });

        if (!response.ok) {
            throw new Error(`Groq API Error: ${response.status}`);
        }

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content || "Waduh, aku lagi bingung nih Kak. Coba tanya lagi ya? 🤔";

        return NextResponse.json({ reply });

    } catch (error) {
        console.error('Chatbot Error:', error);
        return NextResponse.json(
            { reply: "Sorry Kak, ada gangguan teknis dikit. Coba refresh atau tanya lagi nanti ya! 🛠️" },
            { status: 500 }
        );
    }
}
