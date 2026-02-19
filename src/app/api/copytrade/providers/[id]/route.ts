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
            sql: `SELECT sp.*, ps.total_trades, ps.winning_trades, ps.losing_trades,
                         ps.win_rate, ps.total_profit_usd, ps.total_loss_usd, ps.net_profit_usd,
                         ps.max_drawdown, ps.sharpe_ratio, ps.avg_trade_duration_hours,
                         ps.best_pair, ps.avg_profit_per_trade, ps.avg_loss_per_trade,
                         ps.last_trade_at, u.name as user_name, u.image as user_image
                  FROM signal_providers sp
                  LEFT JOIN provider_statistics ps ON sp.id = ps.provider_id
                  LEFT JOIN users u ON sp.user_id = u.id
                  WHERE sp.id = ?`,
            args: [id]
        });

        if (providerResult.rows.length === 0) {
            return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
        }

        const provider = providerResult.rows[0];

        // Get recent closed trades for this provider
        const tradesResult = await turso.execute({
            sql: `SELECT cp.symbol, cp.position_type, cp.entry_price, cp.exit_price,
                         cp.lot_size, cp.profit_loss, cp.status, cp.opened_at, cp.closed_at
                  FROM copied_positions cp
                  INNER JOIN copy_relationships cr ON cp.copy_relationship_id = cr.id
                  WHERE cr.provider_id = ? AND cp.status = 'closed'
                  ORDER BY cp.closed_at DESC
                  LIMIT 20`,
            args: [id]
        });

        return NextResponse.json({
            provider,
            recentTrades: tradesResult.rows
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
