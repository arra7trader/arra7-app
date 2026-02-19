import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import getTursoClient from '@/lib/turso';

export const dynamic = 'force-dynamic';

// PATCH /api/copytrade/signals/[id] — Provider updates signal status
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const turso = getTursoClient();
        if (!turso) return NextResponse.json({ error: 'DB error' }, { status: 500 });

        const { id } = await params;
        const body = await request.json();
        const { status, resultPips } = body;

        const validStatuses = ['tp_hit', 'sl_hit', 'cancelled', 'active'];
        if (!status || !validStatuses.includes(status)) {
            return NextResponse.json({ error: 'Invalid status. Use: tp_hit | sl_hit | cancelled | active' }, { status: 400 });
        }

        // Verify the signal belongs to this user's provider profile
        const userResult = await turso.execute({
            sql: 'SELECT id FROM users WHERE email = ?',
            args: [session.user.email]
        });
        if (userResult.rows.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        const userId = userResult.rows[0].id as string;

        const signalCheck = await turso.execute({
            sql: `SELECT ps.id, ps.entry_price, ps.stop_loss, ps.take_profit, ps.action
                  FROM provider_signals ps
                  JOIN signal_providers sp ON ps.provider_id = sp.id
                  WHERE ps.id = ? AND sp.user_id = ?`,
            args: [id, userId]
        });

        if (signalCheck.rows.length === 0) {
            return NextResponse.json({ error: 'Signal not found or not authorized' }, { status: 404 });
        }

        const signal = signalCheck.rows[0];
        const isClosed = status !== 'active';

        // Auto-calculate result_pips if not provided
        let pips = resultPips ?? null;
        if (!pips && isClosed) {
            const entry = signal.entry_price as number;
            const sl = signal.stop_loss as number;
            const tp = signal.take_profit as number;
            const action = signal.action as string;

            if (status === 'tp_hit' && tp && entry) {
                pips = action === 'BUY' ? (tp - entry) * 10 : (entry - tp) * 10;
            } else if (status === 'sl_hit' && sl && entry) {
                pips = action === 'BUY' ? (sl - entry) * 10 : (entry - sl) * 10;
            }
        }

        await turso.execute({
            sql: `UPDATE provider_signals 
                  SET status = ?, result_pips = ?, closed_at = ${isClosed ? 'CURRENT_TIMESTAMP' : 'NULL'}
                  WHERE id = ?`,
            args: [status, pips, id]
        });

        // Update provider statistics if closed
        if (isClosed && status !== 'cancelled') {
            const providerResult = await turso.execute({
                sql: 'SELECT provider_id FROM provider_signals PS JOIN signal_providers SP ON PS.provider_id = SP.id WHERE PS.id = ?',
                args: [id]
            });

            if (providerResult.rows.length > 0) {
                const providerId = providerResult.rows[0].provider_id as string;
                const isWin = status === 'tp_hit';

                // Recalculate stats from all closed signals
                const statsResult = await turso.execute({
                    sql: `SELECT 
                            COUNT(*) as total,
                            SUM(CASE WHEN status = 'tp_hit' THEN 1 ELSE 0 END) as wins,
                            SUM(CASE WHEN status = 'sl_hit' THEN 1 ELSE 0 END) as losses
                          FROM provider_signals 
                          WHERE provider_id = ? AND status IN ('tp_hit', 'sl_hit')`,
                    args: [providerId]
                });

                if (statsResult.rows.length > 0) {
                    const total = statsResult.rows[0].total as number;
                    const wins = statsResult.rows[0].wins as number;
                    const losses = statsResult.rows[0].losses as number;
                    const winRate = total > 0 ? (wins / total) * 100 : 0;

                    await turso.execute({
                        sql: `UPDATE provider_statistics 
                              SET total_trades = ?, winning_trades = ?, losing_trades = ?,
                                  win_rate = ?, last_trade_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                              WHERE provider_id = ?`,
                        args: [total, wins, losses, winRate, providerId]
                    });
                }
            }
        }

        const statusLabels: Record<string, string> = {
            tp_hit: '✅ Take Profit tercapai!',
            sl_hit: '❌ Stop Loss kena',
            cancelled: '🚫 Sinyal dibatalkan',
            active: '🔄 Sinyal diaktifkan kembali'
        };

        return NextResponse.json({
            success: true,
            message: statusLabels[status],
            resultPips: pips
        });

    } catch (error) {
        console.error('[SIGNALS] PATCH error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
