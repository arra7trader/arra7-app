import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserMembership } from '@/lib/turso';
import { broadcastSignalToSubscribers } from '@/lib/telegram';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify Admin Access
        const adminCheck = await getUserMembership(session.user.id);
        // Allow VVIP for testing purposes, but ideally only ADMIN
        if (adminCheck.membership !== 'ADMIN' && adminCheck.membership !== 'VVIP') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { message } = body;

        if (!message || typeof message !== 'string') {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        const stats = await broadcastSignalToSubscribers(message);

        return NextResponse.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('[ADMIN] Broadcast error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
