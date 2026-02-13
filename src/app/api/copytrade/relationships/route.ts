import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import getTursoClient from '@/lib/turso';

// GET /api/copytrade/relationships - Get user's copy relationships
export async function GET(request: NextRequest) {
    try {
        const turso = getTursoClient();
        if (!turso) {
            return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
        }
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userResult = await turso.execute({
            sql: 'SELECT id FROM users WHERE email = ?',
            args: [session.user.email]
        });

        if (userResult.rows.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const userId = userResult.rows[0].id as string;

        // Get all relationships with provider details
        const result = await turso.execute({
            sql: `SELECT cr.*, sp.display_name, sp.subscription_fee, sp.profit_sharing_percent,
                         ps.win_rate, ps.total_profit_usd, ps.max_drawdown
                  FROM copy_relationships cr
                  LEFT JOIN signal_providers sp ON cr.provider_id = sp.id
                  LEFT JOIN provider_statistics ps ON sp.id = ps.provider_id
                  WHERE cr.follower_user_id = ?
                  ORDER BY cr.created_at DESC`,
            args: [userId]
        });

        // Get total P&L for each relationship
        const relationships = [];
        for (const row of result.rows) {
            const plResult = await turso.execute({
                sql: `SELECT SUM(profit_loss) as total_pl 
                      FROM copied_positions 
                      WHERE copy_relationship_id = ? AND status = 'closed'`,
                args: [row.id]
            });

            relationships.push({
                ...row,
                total_profit_loss: plResult.rows[0]?.total_pl || 0
            });
        }

        return NextResponse.json({ relationships });

    } catch (error) {
        console.error('[COPYTRADE] GET relationships error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH /api/copytrade/relationships - Update relationship status (pause/resume/stop)
export async function PATCH(request: NextRequest) {
    try {
        const turso = getTursoClient();
        if (!turso) {
            return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
        }
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { relationshipId, status } = body;

        if (!['active', 'paused', 'stopped'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const userResult = await turso.execute({
            sql: 'SELECT id FROM users WHERE email = ?',
            args: [session.user.email]
        });

        const userId = userResult.rows[0].id as string;

        // Verify ownership
        const relationshipResult = await turso.execute({
            sql: 'SELECT * FROM copy_relationships WHERE id = ? AND follower_user_id = ?',
            args: [relationshipId, userId]
        });

        if (relationshipResult.rows.length === 0) {
            return NextResponse.json({ error: 'Relationship not found' }, { status: 404 });
        }

        // Update status
        await turso.execute({
            sql: `UPDATE copy_relationships 
                  SET status = ?, ended_at = ?, updated_at = CURRENT_TIMESTAMP 
                  WHERE id = ?`,
            args: [status, status === 'stopped' ? new Date().toISOString() : null, relationshipId]
        });

        // If stopped, decrement provider follower count
        if (status === 'stopped') {
            const providerId = relationshipResult.rows[0].provider_id;
            await turso.execute({
                sql: 'UPDATE signal_providers SET total_followers = total_followers - 1 WHERE id = ?',
                args: [providerId]
            });
        }

        return NextResponse.json({ success: true, message: `Relationship ${status}` });

    } catch (error) {
        console.error('[COPYTRADE] PATCH relationships error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
