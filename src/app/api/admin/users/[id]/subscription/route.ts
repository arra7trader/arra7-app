
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateUserSubscription, getUserMembership } from '@/lib/turso';

export const dynamic = 'force-dynamic';

// PATCH /api/admin/users/[id]/subscription
// Updates user subscription status and details
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify Admin Access
        const adminCheck = await getUserMembership(session.user.id);
        if (adminCheck.membership !== 'ADMIN' && adminCheck.membership !== 'VVIP') {
            // VVIP allowed for testing, strictly should be ADMIN
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const { status, telegramChatId, durationDays } = body;

        if (!['free', 'active', 'expired'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const success = await updateUserSubscription(id, status, telegramChatId, durationDays);

        if (!success) {
            return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('[ADMIN] Update subscription error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
