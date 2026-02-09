import { NextRequest, NextResponse } from 'next/server';
import getTursoClient from '@/lib/turso';

// Get AI performance stats
export async function GET(request: NextRequest) {
    try {
        const turso = getTursoClient();
        if (!turso) {
            return NextResponse.json({
                status: 'success',
                data: getMockStats(),
            });
        }

        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || 'all'; // all, 7d, 30d
        const type = searchParams.get('type'); // forex, stock

        let dateFilter = '';
        if (period === '7d') {
            dateFilter = "AND created_at >= datetime('now', '-7 days')";
        } else if (period === '30d') {
            dateFilter = "AND created_at >= datetime('now', '-30 days')";
        }

        let typeFilter = '';
        if (type) {
            typeFilter = `AND type = '${type}'`;
        }

        // Get overall stats
        const statsResult = await turso.execute({
            sql: `SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'TP_HIT' THEN 1 ELSE 0 END) as tp_hit,
                SUM(CASE WHEN status = 'SL_HIT' THEN 1 ELSE 0 END) as sl_hit,
                SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
                AVG(CASE WHEN status IN ('TP_HIT', 'SL_HIT') THEN 
                    CASE WHEN status = 'TP_HIT' THEN 1.0 ELSE 0.0 END 
                END) * 100 as win_rate,
                AVG(confidence) as avg_confidence
            FROM ai_signals WHERE 1=1 ${dateFilter} ${typeFilter}`,
            args: [],
        });

        // Get stats by symbol
        const bySymbolResult = await turso.execute({
            sql: `SELECT 
                symbol,
                type,
                COUNT(*) as total,
                SUM(CASE WHEN status = 'TP_HIT' THEN 1 ELSE 0 END) as tp_hit,
                ROUND(AVG(CASE WHEN status IN ('TP_HIT', 'SL_HIT') THEN 
                    CASE WHEN status = 'TP_HIT' THEN 1.0 ELSE 0.0 END 
                END) * 100, 1) as win_rate
            FROM ai_signals 
            WHERE status IN ('TP_HIT', 'SL_HIT') ${dateFilter} ${typeFilter}
            GROUP BY symbol, type
            ORDER BY win_rate DESC, total DESC
            LIMIT 10`,
            args: [],
        });

        // Get recent signals
        const recentResult = await turso.execute({
            sql: `SELECT 
                id, type, symbol, timeframe, direction, 
                entry_price, stop_loss, take_profit_1, 
                confidence, status, created_at, verified_at
            FROM ai_signals 
            WHERE 1=1 ${typeFilter}
            ORDER BY created_at DESC
            LIMIT 20`,
            args: [],
        });

        // Get daily stats for chart
        const dailyResult = await turso.execute({
            sql: `SELECT 
                DATE(created_at) as date,
                COUNT(*) as total,
                SUM(CASE WHEN status = 'TP_HIT' THEN 1 ELSE 0 END) as tp_hit,
                SUM(CASE WHEN status = 'SL_HIT' THEN 1 ELSE 0 END) as sl_hit
            FROM ai_signals 
            WHERE created_at >= datetime('now', '-30 days')
            GROUP BY DATE(created_at)
            ORDER BY date DESC`,
            args: [],
        });

        const stats = statsResult.rows[0] || {};

        return NextResponse.json({
            status: 'success',
            data: {
                overall: {
                    total: Number(stats.total || 0),
                    tpHit: Number(stats.tp_hit || 0),
                    slHit: Number(stats.sl_hit || 0),
                    pending: Number(stats.pending || 0),
                    winRate: Number(stats.win_rate || 0).toFixed(1),
                    avgConfidence: Number(stats.avg_confidence || 0).toFixed(0),
                },
                bySymbol: bySymbolResult.rows.map(row => ({
                    symbol: row.symbol,
                    type: row.type,
                    total: Number(row.total),
                    tpHit: Number(row.tp_hit),
                    winRate: Number(row.win_rate),
                })),
                recentSignals: recentResult.rows.map(row => ({
                    id: row.id,
                    type: row.type,
                    symbol: row.symbol,
                    timeframe: row.timeframe,
                    direction: row.direction,
                    entryPrice: row.entry_price,
                    stopLoss: row.stop_loss,
                    takeProfit: row.take_profit_1,
                    confidence: row.confidence,
                    status: row.status,
                    createdAt: row.created_at,
                    verifiedAt: row.verified_at,
                })),
                dailyStats: dailyResult.rows.map(row => ({
                    date: row.date,
                    total: Number(row.total),
                    tpHit: Number(row.tp_hit),
                    slHit: Number(row.sl_hit),
                })),
            },
        });

    } catch (error) {
        console.error('Get performance error:', error);
        return NextResponse.json(
            { status: 'error', message: 'Failed to get performance data' },
            { status: 500 }
        );
    }
}

function getMockStats() {
    return {
        overall: {
            total: 0,
            tpHit: 0,
            slHit: 0,
            pending: 0,
            winRate: '0',
            avgConfidence: '0',
        },
        bySymbol: [],
        recentSignals: [],
        dailyStats: [],
    };
}
