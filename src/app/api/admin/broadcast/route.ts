
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import getTursoClient, { logActivity } from '@/lib/turso';
import { isAdmin } from '../users/route';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email || !isAdmin(session.user.email)) {
            return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { title, message, target, channels } = body; // target: 'ALL', 'VVIP', etc. channels: ['IN_APP', 'TELEGRAM']

        if (!title || !message) {
            return NextResponse.json({ status: 'error', message: 'Title and message are required' }, { status: 400 });
        }

        const turso = getTursoClient();
        if (!turso) {
            return NextResponse.json({ status: 'error', message: 'Database not configured' }, { status: 503 });
        }

        const { initDatabase } = await import('@/lib/turso');
        await initDatabase();

        // 1. Save to DB
        const result = await turso.execute({
            sql: `INSERT INTO broadcasts (title, message, target, channels, author, sent_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`,
            args: [title, message, target, JSON.stringify(channels), session.user.email]
        });

        const broadcastId = result.lastInsertRowid?.toString() || '0';

        // 2. Handle Telegram Sending
        let telegramResult = null;
        if (channels.includes('TELEGRAM')) {
            // Need to fetch Telegram Token/ChatID from ENV or Settings
            // For now, assuming ENV vars are primary, but admin settings override
            const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
            const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || '@arrareborn';

            if (BOT_TOKEN && CHANNEL_ID) {
                try {
                    const telegramMsg = `📢 *${title}*\n\n${message}\n\n_Sent via ARRA7 Admin_`;
                    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: CHANNEL_ID,
                            text: telegramMsg,
                            parse_mode: 'Markdown'
                        })
                    });
                    const tgData = await tgRes.json();
                    telegramResult = tgData.ok ? 'Sent' : `Failed: ${tgData.description}`;
                } catch (e: any) {
                    telegramResult = `Error: ${e.message}`;
                    console.error('Telegram send error:', e);
                }
            } else {
                telegramResult = 'Skipped (Missing Config)';
            }
        }

        // 3. Log Activity
        await logActivity(session.user.email, 'BROADCAST_SENT', {
            broadcastId: broadcastId.toString(),
            title,
            target,
            channels,
            telegramResult
        });

        return NextResponse.json({
            status: 'success',
            message: 'Broadcast sent successfully',
            details: {
                dbSaved: true,
                telegramStatus: telegramResult
            }
        });

    } catch (error: any) {
        console.error('Broadcast API error:', error);
        return NextResponse.json(
            { status: 'error', message: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
