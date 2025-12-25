import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import getTursoClient from '@/lib/turso';

// Get user's analysis history
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { status: 'error', message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const turso = getTursoClient();
        if (!turso) {
            return NextResponse.json({
                status: 'success',
                data: [],
                message: 'Database not configured',
            });
        }

        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type'); // 'forex' or 'stock'
        const limit = parseInt(searchParams.get('limit') || '20');

        let sql = 'SELECT id, type, symbol, timeframe, result, created_at FROM analysis_history WHERE user_id = ?';
        const args: (string | number)[] = [session.user.id];

        if (type) {
            sql += ' AND type = ?';
            args.push(type);
        }

        sql += ' ORDER BY created_at DESC LIMIT ?';
        args.push(limit);

        const result = await turso.execute({ sql, args });

        const history = result.rows.map(row => ({
            id: row.id,
            type: row.type,
            symbol: row.symbol,
            timeframe: row.timeframe,
            result: row.result,
            createdAt: row.created_at,
        }));

        return NextResponse.json({
            status: 'success',
            data: history,
        });

    } catch (error) {
        console.error('Get history error:', error);
        return NextResponse.json(
            { status: 'error', message: 'Failed to get history' },
            { status: 500 }
        );
    }
}

// Save analysis to history
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { status: 'error', message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const turso = getTursoClient();
        if (!turso) {
            return NextResponse.json({
                status: 'success',
                message: 'Database not configured, history not saved',
            });
        }

        const body = await request.json();
        const { type, symbol, timeframe, result } = body;

        if (!type || !symbol || !result) {
            return NextResponse.json(
                { status: 'error', message: 'Missing required fields' },
                { status: 400 }
            );
        }

        await turso.execute({
            sql: 'INSERT INTO analysis_history (user_id, type, symbol, timeframe, result) VALUES (?, ?, ?, ?, ?)',
            args: [session.user.id, type, symbol, timeframe || null, result],
        });

        // Keep only last 50 analyses per user to prevent database bloat
        await turso.execute({
            sql: `DELETE FROM analysis_history WHERE user_id = ? AND id NOT IN (
                SELECT id FROM analysis_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
            )`,
            args: [session.user.id, session.user.id],
        });

        return NextResponse.json({
            status: 'success',
            message: 'Analysis saved to history',
        });

    } catch (error) {
        console.error('Save history error:', error);
        return NextResponse.json(
            { status: 'error', message: 'Failed to save history' },
            { status: 500 }
        );
    }
}
