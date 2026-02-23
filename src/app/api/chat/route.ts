import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CHATBOT_SYSTEM_PROMPT } from '@/lib/chatbot-prompt';
import { generateTextHybrid, hasAnyAIProviderConfigured } from '@/lib/ai-provider';

export async function POST(request: NextRequest) {
    try {
        let userName = 'Trader';
        let membershipTier = 'GUEST';

        const session = await getServerSession(authOptions);
        if (session?.user) {
            userName = session.user.name || 'Trader';
            membershipTier = (session.user as { membership?: string }).membership || 'BASIC';
        } else {
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
                                args: [userEmail],
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

        const hasProvider = hasAnyAIProviderConfigured();
        console.log(`[API/Chat] Request received. AI provider configured: ${hasProvider}`);

        if (!hasProvider) {
            console.error('CRITICAL: No AI provider keys configured.');
            return NextResponse.json(
                { reply: 'Maaf, sistem AI belum dikonfigurasi oleh Admin (Missing API Keys).' },
                { status: 503 },
            );
        }

        const systemPrompt = CHATBOT_SYSTEM_PROMPT
            .replace('{userName}', userName)
            .replace('{membershipTier}', membershipTier);

        const history = (conversationHistory || []).slice(-6).map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
        }));

        history.push({ role: 'user', content: message });

        const { text } = await generateTextHybrid({
            system: systemPrompt,
            messages: history,
            temperature: 0.7,
            maxTokens: 500,
        });

        const reply = text || 'Maaf, saya tidak menemukan jawaban. Coba pertanyaan lain.';

        if (session?.user?.id) {
            const { logActivity } = await import('@/lib/turso');
            await logActivity(session.user.id, 'ANALYSIS_CHAT', {
                message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
                model: 'hybrid-ai-pool',
            });
        }

        return NextResponse.json({ reply });
    } catch (error: unknown) {
        console.error('Chatbot Error:', error);

        let errorMessage = 'Maaf, ada gangguan teknis. Coba lagi beberapa saat.';
        const message = error instanceof Error ? error.message : '';
        if (message.includes('401') || message.includes('403')) {
            errorMessage = 'Akses AI terkunci (API key issue). Mohon cek konfigurasi admin.';
        } else if (message.includes('429')) {
            errorMessage = 'Server AI sedang sibuk. Coba lagi 1 menit.';
        }

        return NextResponse.json({ reply: errorMessage }, { status: 500 });
    }
}
