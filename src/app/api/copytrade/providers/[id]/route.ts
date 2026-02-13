import { NextRequest, NextResponse } from 'next/server';
import getTursoClient from '@/lib/turso';

// GET /api/copytrade/providers/[id] - Get provider details with statistics
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const turso = getTursoClient();
        if (!turso) {
            return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
        }
        const providerId = params.id;

        // Get provider with statistics
        const result = await turso.execute({
            sql: `SELECT sp.*, ps.*, u.name as user_name, u.image as user_image
                  FROM signal_providers sp
                  LEFT JOIN provider_statistics ps ON sp.id = ps.provider_id
                  LEFT JOIN users u ON sp.user_id = u.id
                  WHERE sp.id = ?`,
            args: [providerId]
        });

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
        }

        const provider = result.rows[0];

        // Get recent trades (last 20)
        const tradesResult = await turso.execute({
            sql: `SELECT * FROM copied_positions
                  WHERE copy_relationship_id IN (
                      SELECT id FROM copy_relationships WHERE provider_id = ?
                  )
                  ORDER BY opened_at DESC
                  LIMIT 20`,
            args: [providerId]
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
