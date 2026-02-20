import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import getTursoClient from '@/lib/turso';
import { nanoid } from 'nanoid';

// POST /api/copytrade/follow - Follow a signal provider
export async function POST(request: NextRequest) {
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
        const { providerId, allocatedCapital, riskMultiplier, maxDrawdownPercent } = body;

        // Validate inputs
        if (!providerId) {
            return NextResponse.json({ error: 'Provider ID is required' }, { status: 400 });
        }

        // Get user
        const userResult = await turso.execute({
            sql: 'SELECT id, membership FROM users WHERE email = ?',
            args: [session.user.email]
        });

        if (userResult.rows.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const userId = userResult.rows[0].id as string;
        const membership = userResult.rows[0].membership as string;

        // Check provider exists and is active
        const providerResult = await turso.execute({
            sql: 'SELECT * FROM signal_providers WHERE id = ? AND is_active = 1 AND is_approved = 1',
            args: [providerId]
        });

        if (providerResult.rows.length === 0) {
            return NextResponse.json({ error: 'Provider not found or not active' }, { status: 404 });
        }

        // Check membership limits
        const existingFollowsResult = await turso.execute({
            sql: 'SELECT COUNT(*) as count FROM copy_relationships WHERE follower_user_id = ? AND status = ?',
            args: [userId, 'active']
        });

        const currentFollows = Number(existingFollowsResult.rows[0].count);

        let maxFollows = 1; // BASIC
        if (membership === 'PRO') maxFollows = 3;
        if (membership === 'VVIP') maxFollows = 999;

        if (currentFollows >= maxFollows) {
            return NextResponse.json({
                error: `Your ${membership} membership allows maximum ${maxFollows} active providers. Upgrade to follow more.`
            }, { status: 403 });
        }

        // Check if already following
        const existingRelationship = await turso.execute({
            sql: 'SELECT id FROM copy_relationships WHERE follower_user_id = ? AND provider_id = ? AND status = ?',
            args: [userId, providerId, 'active']
        });

        if (existingRelationship.rows.length > 0) {
            return NextResponse.json({ error: 'You are already following this provider' }, { status: 400 });
        }

        // Create copy relationship
        const relationshipId = nanoid();
        await turso.execute({
            sql: `INSERT INTO copy_relationships 
                  (id, follower_user_id, provider_id, allocated_capital, risk_multiplier, max_drawdown_percent, status)
                  VALUES (?, ?, ?, ?, ?, ?, 'active')`,
            args: [relationshipId, userId, providerId, allocatedCapital, riskMultiplier, maxDrawdownPercent]
        });

        // Update provider follower count
        await turso.execute({
            sql: 'UPDATE signal_providers SET total_followers = total_followers + 1 WHERE id = ?',
            args: [providerId]
        });

        return NextResponse.json({
            success: true,
            relationshipId,
            message: 'Successfully started following provider'
        });

    } catch (error) {
        console.error('[COPYTRADE] POST follow error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
