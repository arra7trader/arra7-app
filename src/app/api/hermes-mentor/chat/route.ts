import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { HERMES_MENTOR_SYSTEM_PROMPT } from '@/lib/hermes-mentor-prompt';
import { generateTextHybrid, hasAnyAIProviderConfigured } from '@/lib/ai-provider';

export async function POST(request: NextRequest) {
    try {
        let userName = 'Trader';
        let membershipTier = 'GUEST';
        let userEmail = '';
        let userId = '';

        const session = await getServerSession(authOptions);
        if (session?.user) {
            userName = session.user.name || 'Trader';
            userEmail = session.user.email || '';
            userId = (session.user as any).id || '';
            membershipTier = (session.user as { membership?: string }).membership || 'BASIC';
        } else {
            // Mobile auth fallback
            const authHeader = request.headers.get('Authorization');
            if (authHeader?.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                const { verifyMobileToken } = await import('@/lib/mobile-auth');
                const email = await verifyMobileToken(token);
                if (email) {
                    userEmail = email;
                    const turso = (await import('@/lib/turso')).default();
                    if (turso) {
                        try {
                            const userRes = await turso.execute({
                                sql: 'SELECT id, name, membership FROM users WHERE email = ?',
                                args: [email],
                            });
                            if (userRes.rows.length > 0) {
                                userId = userRes.rows[0].id as string;
                                userName = userRes.rows[0].name as string;
                                membershipTier = userRes.rows[0].membership as string;
                            }
                        } catch (e) {
                            console.error('DB fetch error for hermes-mentor:', e);
                        }
                    }
                }
            }
        }

        // Check device-based license key activation
        const deviceId = request.headers.get('x-pica-device-id');
        if (deviceId && (membershipTier === 'BASIC' || !membershipTier || membershipTier === 'GUEST')) {
            try {
                const { getUserMembership } = await import('@/lib/turso');
                const devMem = await getUserMembership(deviceId);
                if (devMem?.membership && devMem.membership !== 'BASIC') {
                    membershipTier = devMem.membership;
                }
            } catch (e) {
                console.warn('Device membership check error:', e);
            }
        }

        // Check access: Hermes Mentor requires HERMES_MENTOR tier or higher
        const hasAccess = await checkHermesMentorAccess(userId, userEmail, membershipTier);
        if (!hasAccess) {
            return NextResponse.json({
                reply: '🔒 **Akses Hermes Mentor terkunci.**\n\nFitur ini khusus untuk member HERMES Mentor. Dapatkan AI Private Mentor untuk membimbing trading kamu secara personal.\n\n👉 [Aktifkan Hermes Mentor](/hermes-mentor)',
                locked: true,
            }, { status: 403 });
        }

        const body = await request.json();
        const { message, conversationHistory } = body;

        if (!message) {
            return NextResponse.json({ error: 'Message required' }, { status: 400 });
        }

        const hasProvider = hasAnyAIProviderConfigured();
        if (!hasProvider) {
            return NextResponse.json(
                { reply: 'Maaf, sistem AI belum dikonfigurasi oleh Admin.' },
                { status: 503 },
            );
        }

        const systemPrompt = HERMES_MENTOR_SYSTEM_PROMPT
            .replace('{userName}', userName)
            .replace('{membershipTier}', membershipTier);

        // Hermes gets deeper conversation history (up to 20 messages for context)
        const history = (conversationHistory || []).slice(-20).map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
        }));

        history.push({ role: 'user', content: message });

        // Hermes uses higher token limit for deeper responses
        const { text } = await generateTextHybrid({
            system: systemPrompt,
            messages: history,
            temperature: 0.75,
            maxTokens: 1500,
        });

        const reply = text || 'Maaf, saya sedang mengalami gangguan. Coba lagi ya.';

        // Log activity
        if (userId) {
            const { logActivity } = await import('@/lib/turso');
            await logActivity(userId, 'HERMES_MENTOR_CHAT', {
                message: message.substring(0, 80),
                model: 'hybrid-ai-pool',
            });
        }

        return NextResponse.json({ reply });
    } catch (error: unknown) {
        console.error('Hermes Mentor Error:', error);

        let errorMessage = 'Maaf, ada gangguan teknis. Coba lagi beberapa saat.';
        const message = error instanceof Error ? error.message : '';
        if (message.includes('429')) {
            errorMessage = 'Server AI sedang sibuk. Coba lagi 1 menit ya 🙏';
        }

        return NextResponse.json({ reply: errorMessage }, { status: 500 });
    }
}

async function checkHermesMentorAccess(userId: string, email: string, tier: string): Promise<boolean> {
    // Admin always has access
    const { isAdminEmail } = await import('@/lib/admin-access');
    if (isAdminEmail(email)) return true;

    // PRO/VVIP members get access
    const upperTier = (tier || '').toUpperCase();
    if (['PRO', 'VVIP', 'HERMES_MENTOR', 'LIFETIME', 'ALL_ACCESS'].includes(upperTier)) return true;

    // Check if user purchased Hermes Mentor specifically
    if (!userId) return false;

    try {
        const getTursoClient = (await import('@/lib/turso')).default;
        const turso = getTursoClient();
        if (!turso) return false;

        const result = await turso.execute({
            sql: `SELECT id FROM user_purchases 
                  WHERE user_id = ? AND product = 'HERMES_MENTOR' 
                  AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`,
            args: [userId],
        });

        return result.rows.length > 0;
    } catch {
        // If table doesn't exist yet, check tier only
        return false;
    }
}
