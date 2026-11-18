import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { HERMES_MENTOR_SYSTEM_PROMPT } from '@/lib/hermes-mentor-prompt';
import { generateTextHybrid, hasAnyAIProviderConfigured } from '@/lib/ai-provider';

export async function POST(request: NextRequest) {
    try {
        // 1. Parse JSON body first so body parameters (message, deviceId, history) are readily available
        let body: any = {};
        try {
            body = await request.json();
        } catch {
            body = {};
        }

        const message = (body?.message || '').trim();
        const conversationHistory = body?.conversationHistory || [];

        if (!message) {
            return NextResponse.json({ error: 'Message required' }, { status: 400 });
        }

        // 2. Extract deviceId comprehensively from all possible channels
        const headerDeviceId = request.headers.get('x-pica-device-id');
        const cookieDeviceId = request.cookies.get('pica_device_id')?.value;
        const bodyDeviceId = body?.deviceId;
        const queryDeviceId = request.nextUrl.searchParams.get('deviceId');

        const deviceId = (headerDeviceId || bodyDeviceId || cookieDeviceId || queryDeviceId || '').trim();

        let userName = 'Trader';
        let membershipTier = 'GUEST';
        let userEmail = '';
        let userId = '';

        // 3. NextAuth Server Session check
        const session = await getServerSession(authOptions);
        const { isAdminEmail, isAdminUser } = await import('@/lib/admin-access');
        const isAdmin = Boolean(isAdminUser(session?.user)) || Boolean(isAdminEmail(session?.user?.email));

        if (session?.user) {
            userName = session.user.name || 'Trader';
            userEmail = session.user.email || '';
            userId = (session.user as any).id || '';
            if (isAdmin) {
                membershipTier = 'VVIP';
            } else {
                const sessTier = (session.user as any).tier || (session.user as any).membership;
                if (sessTier && sessTier !== 'BASIC') {
                    membershipTier = String(sessTier).toUpperCase();
                } else {
                    membershipTier = 'BASIC';
                }
            }
        } else {
            // Mobile auth Bearer token fallback
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
                                userName = (userRes.rows[0].name as string) || 'Trader';
                                membershipTier = (userRes.rows[0].membership as string) || 'BASIC';
                            }
                        } catch (e) {
                            console.error('DB fetch error for hermes-mentor:', e);
                        }
                    }
                }
            }
        }

        // 4. User DB lookup fallback if logged in
        if (userId && (membershipTier === 'BASIC' || membershipTier === 'GUEST')) {
            try {
                const { getUserMembership } = await import('@/lib/turso');
                const userMem = await getUserMembership(userId);
                if (userMem?.membership && userMem.membership !== 'BASIC') {
                    membershipTier = userMem.membership;
                }
            } catch (e) {
                console.warn('User membership check error:', e);
            }
        }

        // 5. Device license lookup via getDeviceStatus
        // This directly queries device_users table (supports VVIP keys generated in admin panel)
        if (deviceId) {
            try {
                const { getDeviceStatus } = await import('@/lib/license');
                const devStatus = await getDeviceStatus(deviceId);
                if (devStatus && !devStatus.isExpired && ['PRO', 'VVIP'].includes(devStatus.tier)) {
                    membershipTier = devStatus.tier;
                    if (userName === 'Trader') {
                        userName = `Trader (${devStatus.tier})`;
                    }
                }
            } catch (e) {
                console.warn('Device status check failed:', e);
            }
        }

        // 6. Check access: Hermes Mentor requires PRO/VVIP/HERMES_MENTOR or active purchase
        const hasAccess = await checkHermesMentorAccess(userId, userEmail, membershipTier, deviceId);
        if (!hasAccess) {
            return NextResponse.json({
                reply: '🔒 **Akses Hermes Mentor terkunci.**\n\nFitur ini khusus untuk member HERMES Mentor. Dapatkan AI Private Mentor untuk membimbing trading kamu secara personal.\n\n👉 [Aktifkan Hermes Mentor](/hermes-mentor)',
                locked: true,
            }, { status: 403 });
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
        if (userId || deviceId) {
            try {
                const { logActivity } = await import('@/lib/turso');
                await logActivity(userId || deviceId, 'HERMES_MENTOR_CHAT', {
                    message: message.substring(0, 80),
                    model: 'hybrid-ai-pool',
                    tier: membershipTier,
                });
            } catch {}
        }

        return NextResponse.json({ reply, tier: membershipTier });
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

async function checkHermesMentorAccess(userId: string, email: string, tier: string, deviceId?: string): Promise<boolean> {
    // 1. Admin always has access
    const { isAdminEmail, isAdminUser } = await import('@/lib/admin-access');
    if (isAdminEmail(email) || isAdminUser({ email, id: userId })) return true;

    // 2. PRO/VVIP members get full access
    const upperTier = (tier || '').toUpperCase();
    if (['PRO', 'VVIP', 'HERMES_MENTOR', 'LIFETIME', 'ALL_ACCESS', 'ADMIN'].includes(upperTier)) return true;

    // 3. Fallback direct device check from DB
    if (deviceId) {
        try {
            const { getDeviceStatus } = await import('@/lib/license');
            const dev = await getDeviceStatus(deviceId);
            if (dev && !dev.isExpired && (['PRO', 'VVIP'].includes(dev.tier) || dev.activeLicenseCode === 'MASTER-ADMIN-PASSKEY' || dev.activeLicenseCode === 'ADMIN-SESSION')) {
                return true;
            }
        } catch {}
    }

    // 4. Check user_purchases table for HERMES_MENTOR product (by userId or deviceId)
    if (userId || deviceId) {
        try {
            const getTursoClient = (await import('@/lib/turso')).default;
            const turso = getTursoClient();
            if (turso) {
                const result = await turso.execute({
                    sql: `SELECT id FROM user_purchases 
                          WHERE (user_id = ? OR user_id = ?) 
                          AND product = 'HERMES_MENTOR' 
                          AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`,
                    args: [userId || '', deviceId || ''],
                });
                if (result.rows.length > 0) return true;
            }
        } catch {}
    }

    return false;
}
