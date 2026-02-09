import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import getTursoClient from '@/lib/turso';

const ADMIN_EMAILS = ['apmexplore@gmail.com'];

// Public VAPID key (can be exposed)
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

// POST: Subscribe to push notifications
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
        }

        const { subscription } = await request.json();

        if (!subscription) {
            return NextResponse.json({ status: 'error', message: 'No subscription data' }, { status: 400 });
        }

        const turso = getTursoClient();
        if (!turso) {
            return NextResponse.json({ status: 'error', message: 'Database not configured' }, { status: 500 });
        }

        // Create push_subscriptions table if not exists
        await turso.execute(`
            CREATE TABLE IF NOT EXISTS push_subscriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                endpoint TEXT NOT NULL UNIQUE,
                p256dh TEXT NOT NULL,
                auth TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Save subscription
        await turso.execute({
            sql: `INSERT OR REPLACE INTO push_subscriptions (user_id, endpoint, p256dh, auth)
                  VALUES (?, ?, ?, ?)`,
            args: [
                session.user.id,
                subscription.endpoint,
                subscription.keys.p256dh,
                subscription.keys.auth
            ]
        });

        return NextResponse.json({
            status: 'success',
            message: 'Subscribed to notifications'
        });

    } catch (error) {
        console.error('Push subscribe error:', error);
        return NextResponse.json({ status: 'error', message: 'Failed to subscribe' }, { status: 500 });
    }
}

// DELETE: Unsubscribe from push notifications
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
        }

        const { endpoint } = await request.json();

        const turso = getTursoClient();
        if (!turso) {
            return NextResponse.json({ status: 'error', message: 'Database not configured' }, { status: 500 });
        }

        await turso.execute({
            sql: 'DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?',
            args: [session.user.id, endpoint]
        });

        return NextResponse.json({
            status: 'success',
            message: 'Unsubscribed from notifications'
        });

    } catch (error) {
        console.error('Push unsubscribe error:', error);
        return NextResponse.json({ status: 'error', message: 'Failed to unsubscribe' }, { status: 500 });
    }
}

// GET: Get VAPID public key and subscription status
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        return NextResponse.json({
            status: 'success',
            vapidPublicKey: VAPID_PUBLIC_KEY,
            isLoggedIn: !!session?.user?.id
        });

    } catch (error) {
        console.error('Push config error:', error);
        return NextResponse.json({ status: 'error' }, { status: 500 });
    }
}
