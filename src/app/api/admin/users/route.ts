import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import getTursoClient from '@/lib/turso';

// Admin emails - add your admin email here
const ADMIN_EMAILS = [
    'apmexplore@gmail.com', // Add your email
];

export function isAdmin(email: string | null | undefined): boolean {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email.toLowerCase());
}

// GET all users
export async function GET(request: NextRequest) {
    try {
        console.log('[ADMIN] Starting GET users request...');

        const session = await getServerSession(authOptions);
        console.log('[ADMIN] Session:', session?.user?.email || 'No session');

        if (!session?.user?.email || !isAdmin(session.user.email)) {
            console.log('[ADMIN] Unauthorized access attempt');
            return NextResponse.json(
                { status: 'error', message: 'Unauthorized' },
                { status: 403 }
            );
        }

        // Debug environment variables
        console.log('[ADMIN] TURSO_DATABASE_URL configured:', !!process.env.TURSO_DATABASE_URL);
        console.log('[ADMIN] TURSO_AUTH_TOKEN configured:', !!process.env.TURSO_AUTH_TOKEN);

        const turso = getTursoClient();
        if (!turso) {
            console.log('[ADMIN] ERROR: Turso client is null - database not configured!');
            return NextResponse.json(
                {
                    status: 'error',
                    message: 'Database not configured. Please set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in Vercel environment variables.',
                    debug: {
                        hasTursoUrl: !!process.env.TURSO_DATABASE_URL,
                        hasTursoToken: !!process.env.TURSO_AUTH_TOKEN
                    }
                },
                { status: 503 }
            );
        }

        console.log('[ADMIN] Turso client connected, executing query...');

        const result = await turso.execute(`
            SELECT 
                u.id,
                u.email,
                u.name,
                u.membership,
                u.membership_expires,
                u.created_at,
                u.updated_at,
                COALESCE(q.count, 0) as today_usage
            FROM users u
            LEFT JOIN quota_usage q ON u.id = q.user_id AND q.date = date('now')
            ORDER BY u.created_at DESC
        `);

        console.log('[ADMIN] Query result rows:', result.rows.length);

        const users = result.rows.map(row => ({
            id: row.id,
            email: row.email,
            name: row.name,
            membership: row.membership || 'BASIC',
            membershipExpires: row.membership_expires,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            todayUsage: row.today_usage || 0,
        }));

        console.log('[ADMIN] Returning', users.length, 'users');

        return NextResponse.json({
            status: 'success',
            users,
            total: users.length,
            debug: {
                databaseConnected: true,
                queryExecuted: true
            }
        });

    } catch (error) {
        console.error('Admin users error:', error);
        return NextResponse.json(
            { status: 'error', message: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST - Update user membership
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email || !isAdmin(session.user.email)) {
            return NextResponse.json(
                { status: 'error', message: 'Unauthorized' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { userId, membership, durationDays } = body;

        if (!userId || !membership) {
            return NextResponse.json(
                { status: 'error', message: 'Missing userId or membership' },
                { status: 400 }
            );
        }

        if (!['BASIC', 'PRO', 'VVIP'].includes(membership)) {
            return NextResponse.json(
                { status: 'error', message: 'Invalid membership level' },
                { status: 400 }
            );
        }

        const turso = getTursoClient();
        if (!turso) {
            return NextResponse.json(
                { status: 'error', message: 'Database not configured' },
                { status: 503 }
            );
        }

        // Calculate expiry date
        const days = durationDays || 30;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);

        await turso.execute({
            sql: `UPDATE users SET 
                membership = ?,
                membership_expires = ?,
                updated_at = datetime('now')
                WHERE id = ?`,
            args: [membership, expiresAt.toISOString(), userId],
        });

        return NextResponse.json({
            status: 'success',
            message: `User upgraded to ${membership} for ${days} days`,
        });

    } catch (error) {
        console.error('Admin update error:', error);
        return NextResponse.json(
            { status: 'error', message: 'Internal server error' },
            { status: 500 }
        );
    }
}
