
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import getTursoClient from '@/lib/turso';
import { isAdmin } from '../users/route';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email || !isAdmin(session.user.email)) {
            return NextResponse.json(
                { status: 'error', message: 'Unauthorized' },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const limit = parseInt(searchParams.get('limit') || '50');

        const turso = getTursoClient();
        if (!turso) {
            return NextResponse.json(
                { status: 'error', message: 'Database not configured' },
                { status: 503 }
            );
        }

        let query = 'SELECT * FROM activity_logs';
        const args: any[] = [];

        if (userId) {
            query += ' WHERE user_id = ?';
            args.push(userId);
        }

        query += ' ORDER BY created_at DESC LIMIT ?';
        args.push(limit);

        const result = await turso.execute({ sql: query, args });

        const logs = result.rows.map(row => ({
            id: row.id,
            userId: row.user_id,
            action: row.action,
            details: row.details ? JSON.parse(row.details as string) : null,
            ip: row.ip_address,
            createdAt: row.created_at
        }));

        return NextResponse.json({ status: 'success', logs });

    } catch (error) {
        console.error('Activity logs error:', error);
        return NextResponse.json(
            { status: 'error', message: 'Internal server error' },
            { status: 500 }
        );
    }
}
