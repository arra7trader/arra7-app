import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import getTursoClient from '@/lib/turso';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const turso = getTursoClient();
        if (!turso) throw new Error('Database not configured');

        // Fetch balance
        const userRes = await turso.execute({
            sql: 'SELECT koin_balance FROM users WHERE id = ?',
            args: [session.user.id]
        });

        const balance = userRes.rows.length > 0 ? Number(userRes.rows[0].koin_balance || 0) : 0;

        // Fetch trx history
        const trxRes = await turso.execute({
            sql: 'SELECT * FROM trx_coins WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
            args: [session.user.id]
        });

        return NextResponse.json({
            balance,
            transactions: trxRes.rows
        });

    } catch (error) {
        console.error('Wallet Balance API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
