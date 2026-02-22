import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import getTursoClient from '@/lib/turso';
import { isAdminEmail } from '@/lib/admin-access';

export const dynamic = 'force-dynamic';

// GET /api/admin/copytrade - Get all providers (pending + active + rejected)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!isAdminEmail(session?.user?.email)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const turso = getTursoClient();
        if (!turso) return NextResponse.json({ error: 'DB error' }, { status: 500 });

        const { searchParams } = new URL(request.url);
        const filter = searchParams.get('filter') || 'pending'; // pending | active | all

        let whereClause = '';
        if (filter === 'pending') whereClause = 'WHERE sp.is_approved = 0 AND sp.is_active = 0';
        else if (filter === 'active') whereClause = 'WHERE sp.is_active = 1 AND sp.is_approved = 1';
        else if (filter === 'rejected') whereClause = 'WHERE sp.is_active = 0 AND sp.is_approved = -1';

        const result = await turso.execute({
            sql: `SELECT sp.id, sp.display_name, sp.bio, sp.broker_name, sp.broker_account_id,
                         sp.subscription_fee, sp.profit_sharing_percent, sp.is_active, sp.is_approved,
                         sp.total_followers, sp.created_at, sp.updated_at,
                         u.name as user_name, u.email as user_email, u.membership as user_membership
                  FROM signal_providers sp
                  LEFT JOIN users u ON sp.user_id = u.id
                  ${whereClause}
                  ORDER BY sp.created_at DESC`,
            args: []
        });

        return NextResponse.json({
            providers: result.rows,
            total: result.rows.length
        });

    } catch (error) {
        console.error('[ADMIN] GET copytrade providers error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH /api/admin/copytrade - Approve or reject a provider
export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!isAdminEmail(session?.user?.email)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const turso = getTursoClient();
        if (!turso) return NextResponse.json({ error: 'DB error' }, { status: 500 });

        const body = await request.json();
        const { providerId, action } = body; // action: 'approve' | 'reject' | 'deactivate'

        if (!providerId || !['approve', 'reject', 'deactivate'].includes(action)) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        let isActive = 0;
        let isApproved = 0;

        if (action === 'approve') {
            isActive = 1;
            isApproved = 1;
        } else if (action === 'reject') {
            isActive = 0;
            isApproved = -1; // -1 = rejected
        } else if (action === 'deactivate') {
            isActive = 0;
            isApproved = 0; // back to pending
        }

        await turso.execute({
            sql: `UPDATE signal_providers 
                  SET is_active = ?, is_approved = ?, updated_at = CURRENT_TIMESTAMP 
                  WHERE id = ?`,
            args: [isActive, isApproved, providerId]
        });

        // Get provider name for response
        const providerResult = await turso.execute({
            sql: 'SELECT display_name FROM signal_providers WHERE id = ?',
            args: [providerId]
        });

        const providerName = providerResult.rows[0]?.display_name || 'Provider';

        const messages = {
            approve: `✅ ${providerName} berhasil di-approve dan sekarang aktif di marketplace`,
            reject: `❌ ${providerName} berhasil di-reject`,
            deactivate: `⏸️ ${providerName} dinonaktifkan sementara`
        };

        return NextResponse.json({
            success: true,
            message: messages[action as keyof typeof messages]
        });

    } catch (error) {
        console.error('[ADMIN] PATCH copytrade error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
