import { NextResponse } from 'next/server';
import getTursoClient from '@/lib/turso';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const turso = getTursoClient();
        if (!turso) {
            return NextResponse.json({ totalProviders: 0, totalFollowers: 0, totalTrades: 0 });
        }

        const [providers, followers, trades] = await Promise.all([
            turso.execute(`SELECT COUNT(*) as count FROM signal_providers WHERE is_active = 1 AND is_approved = 1`),
            turso.execute(`SELECT COUNT(*) as count FROM copy_relationships WHERE status = 'active'`),
            turso.execute(`SELECT COALESCE(SUM(total_trades), 0) as count FROM provider_statistics`),
        ]);

        return NextResponse.json({
            totalProviders: Number(providers.rows[0]?.count ?? 0),
            totalFollowers: Number(followers.rows[0]?.count ?? 0),
            totalTrades: Number(trades.rows[0]?.count ?? 0),
        });
    } catch (error) {
        console.error('[COPYTRADE] stats error:', error);
        return NextResponse.json({ totalProviders: 0, totalFollowers: 0, totalTrades: 0 });
    }
}
