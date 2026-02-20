
import { NextRequest, NextResponse } from 'next/server';
import getTursoClient from '@/lib/turso';

export const dynamic = 'force-dynamic';

// GET /api/copytrade/providers/[id] - Get full provider profile + stats + recent trades
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const turso = getTursoClient();
        if (!turso) {
            return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
        }

        const { id } = await params;

        // Get provider with statistics
        const providerResult = await turso.execute({
            sql: `SELECT sp.*, 
                         u.name as user_name, u.image as user_image,
                         u.stats_win_rate, u.stats_profit_factor, u.stats_max_drawdown,
                         u.stats_total_pips, u.stats_active_since, u.stats_risk_score
                  FROM signal_providers sp
                  JOIN users u ON sp.user_id = u.id
                  WHERE sp.id = ?`,
            args: [id]
        });

        if (providerResult.rows.length === 0) {
            return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
        }

        const provider = providerResult.rows[0];

        // Get recent closed signals for this provider (Provider's own history)
        const tradesResult = await turso.execute({
            sql: `SELECT id, pair as symbol, action as position_type, entry_price, 
                         result_pips, closed_at, status,
                         (result_pips * 10) as profit_loss -- Estimated Profit
                  FROM provider_signals 
                  WHERE provider_id = ? AND status IN ('tp_hit', 'sl_hit', 'manually_closed')
                  ORDER BY closed_at DESC
                  LIMIT 20`,
            args: [id]
        });

        // Get Daily Stats history
        const dailyStatsResult = await turso.execute({
            sql: `SELECT date, daily_pips, daily_profit_usd, balance_snapshot 
                  FROM provider_daily_stats 
                  WHERE provider_id = ? 
                  ORDER BY date ASC`,
            args: [provider.user_id]
        });

        return NextResponse.json({
            provider,
            recentTrades: tradesResult.rows,
            dailyStats: dailyStatsResult.rows
        });

    } catch (error) {
        console.error('[COPYTRADE] GET provider detail error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH /api/copytrade/providers/[id] - Update provider's own settings
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { getServerSession } = await import('next-auth');
        const { authOptions } = await import('@/lib/auth');
        const turso = getTursoClient();
        if (!turso) return NextResponse.json({ error: 'DB error' }, { status: 500 });

        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        const body = await request.json();
        const { bio, subscriptionFee, profitSharingPercent } = body;

        // Verify ownership
        const check = await turso.execute({
            sql: `SELECT sp.id FROM signal_providers sp
                  INNER JOIN users u ON sp.user_id = u.id
                  WHERE sp.id = ? AND u.email = ?`,
            args: [id, session.user.email]
        });

        if (check.rows.length === 0) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

        await turso.execute({
            sql: `UPDATE signal_providers SET bio = ?, subscription_fee = ?, profit_sharing_percent = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            args: [bio, subscriptionFee, profitSharingPercent, id]
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[COPYTRADE] PATCH provider error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
