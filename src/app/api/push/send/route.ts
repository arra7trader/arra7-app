import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import getTursoClient from '@/lib/turso';
import webpush from 'web-push';

const ADMIN_EMAILS = ['apmexplore@gmail.com'];

// Configure web-push
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';

if (vapidPrivateKey) {
    webpush.setVapidDetails(
        'mailto:apmexplore@gmail.com',
        vapidPublicKey,
        vapidPrivateKey
    );
}

// POST: Send push notification (Admin only)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        // Check admin
        if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
            return NextResponse.json({ status: 'error', message: 'Admin only' }, { status: 403 });
        }

        const { title, body, url, target } = await request.json();

        if (!title || !body) {
            return NextResponse.json({ status: 'error', message: 'Title and body required' }, { status: 400 });
        }

        const turso = getTursoClient();
        if (!turso) {
            return NextResponse.json({ status: 'error', message: 'Database not configured' }, { status: 500 });
        }

        // Get all subscriptions
        let query = 'SELECT * FROM push_subscriptions';
        const args: any[] = [];

        // Filter by target if specified
        if (target && target !== 'all') {
            // Could filter by membership type here
        }

        const result = await turso.execute({ sql: query, args });
        const subscriptions = result.rows;

        if (subscriptions.length === 0) {
            return NextResponse.json({
                status: 'success',
                message: 'No subscribers to notify',
                sent: 0
            });
        }

        // Send notifications
        const payload = JSON.stringify({
            title,
            body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            url: url || '/',
            timestamp: Date.now()
        });

        let sent = 0;
        let failed = 0;

        for (const sub of subscriptions) {
            try {
                const pushSubscription = {
                    endpoint: sub.endpoint as string,
                    keys: {
                        p256dh: sub.p256dh as string,
                        auth: sub.auth as string
                    }
                };

                await webpush.sendNotification(pushSubscription, payload);
                sent++;
            } catch (error: any) {
                failed++;
                // Remove invalid subscriptions
                if (error.statusCode === 410 || error.statusCode === 404) {
                    await turso.execute({
                        sql: 'DELETE FROM push_subscriptions WHERE endpoint = ?',
                        args: [sub.endpoint as string]
                    });
                }
            }
        }

        // Log notification
        await turso.execute(`
            CREATE TABLE IF NOT EXISTS notification_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                body TEXT NOT NULL,
                sent_count INTEGER DEFAULT 0,
                failed_count INTEGER DEFAULT 0,
                sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await turso.execute({
            sql: 'INSERT INTO notification_logs (title, body, sent_count, failed_count) VALUES (?, ?, ?, ?)',
            args: [title, body, sent, failed]
        });

        return NextResponse.json({
            status: 'success',
            message: `Notification sent to ${sent} subscribers`,
            sent,
            failed
        });

    } catch (error) {
        console.error('Send notification error:', error);
        return NextResponse.json({ status: 'error', message: 'Failed to send' }, { status: 500 });
    }
}

// GET: Get notification stats (Admin only)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
            return NextResponse.json({ status: 'error', message: 'Admin only' }, { status: 403 });
        }

        const turso = getTursoClient();
        if (!turso) {
            return NextResponse.json({ status: 'error', message: 'Database not configured' }, { status: 500 });
        }

        // Get subscriber count
        let subscriberCount = 0;
        try {
            const countResult = await turso.execute('SELECT COUNT(*) as count FROM push_subscriptions');
            subscriberCount = (countResult.rows[0]?.count as number) || 0;
        } catch {
            // Table might not exist yet
        }

        // Get recent notifications
        let recentNotifications: any[] = [];
        try {
            const logsResult = await turso.execute(
                'SELECT * FROM notification_logs ORDER BY sent_at DESC LIMIT 10'
            );
            recentNotifications = logsResult.rows;
        } catch {
            // Table might not exist yet
        }

        return NextResponse.json({
            status: 'success',
            subscriberCount,
            recentNotifications,
            vapidConfigured: !!vapidPrivateKey
        });

    } catch (error) {
        console.error('Get notification stats error:', error);
        return NextResponse.json({ status: 'error' }, { status: 500 });
    }
}
