
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import getTursoClient, { logActivity } from '@/lib/turso';
import { isAdmin } from '../route';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email || !isAdmin(session.user.email)) {
            return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { action, userIds, data } = body; // data: { membership: 'PRO', duration: 30 }

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return NextResponse.json({ status: 'error', message: 'No users selected' }, { status: 400 });
        }

        const turso = getTursoClient();
        if (!turso) {
            return NextResponse.json({ status: 'error', message: 'Database not configured' }, { status: 503 });
        }

        const { initDatabase } = await import('@/lib/turso');
        await initDatabase();

        let successCount = 0;
        let failCount = 0;

        if (action === 'delete') {
            for (const id of userIds) {
                try {
                    // Manual cascade if needed, or just delete user
                    // SQLite foreign keys might prevent deletion if ON DELETE CASCADE is not set and PRAGMA foreign_keys = ON
                    // We'll try deleting.
                    await turso.execute({
                        sql: 'DELETE FROM users WHERE id = ?',
                        args: [id]
                    });
                    successCount++;
                } catch (e) {
                    console.error(`Failed to delete user ${id}:`, e);
                    failCount++;
                }
            }
            await logActivity(session.user.email, 'BULK_DELETE', { count: successCount, failed: failCount, ids: userIds });

        } else if (action === 'upgrade') {
            const { membership, duration } = data || {};
            if (!membership) {
                return NextResponse.json({ status: 'error', message: 'Membership level required' }, { status: 400 });
            }

            const days = duration || 30;
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + days);

            for (const id of userIds) {
                try {
                    await turso.execute({
                        sql: 'UPDATE users SET membership = ?, membership_expires = ? WHERE id = ?',
                        args: [membership, expiresAt.toISOString(), id]
                    });
                    successCount++;
                } catch (e) {
                    console.error(`Failed to upgrade user ${id}:`, e);
                    failCount++;
                }
            }
            await logActivity(session.user.email, 'BULK_UPGRADE', { count: successCount, failed: failCount, membership, duration });
        } else {
            return NextResponse.json({ status: 'error', message: 'Invalid action' }, { status: 400 });
        }

        return NextResponse.json({
            status: 'success',
            message: `Processed ${successCount} users. Failed: ${failCount}`,
            details: { successCount, failCount }
        });

    } catch (error: any) {
        console.error('Bulk API error:', error);
        return NextResponse.json(
            { status: 'error', message: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
