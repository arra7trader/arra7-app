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

        // Ensure database is initialized with all columns before querying
        const { initDatabase } = await import('@/lib/turso');
        await initDatabase();

        console.log('[ADMIN] Turso client connected, executing query...');

        // Query users with simple SELECT to handle varying column availability
        // Order by created_at DESC so newest users appear first
        const result = await turso.execute(`
            SELECT * FROM users ORDER BY created_at DESC, id DESC
        `);

        console.log('[ADMIN] Query result rows:', result.rows.length);

        // Safely map users with fallbacks for missing columns
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const users = result.rows.map((row: any) => ({
            id: row.id || '',
            email: row.email || '',
            name: row.name || '',
            membership: row.membership || 'BASIC',
            membershipExpires: row.membership_expires || null,
            createdAt: row.created_at || null,
            updatedAt: row.updated_at || null,
            todayUsage: 0, // Will be fetched separately if needed
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
        console.log('[ADMIN] POST - Starting membership update...');

        const session = await getServerSession(authOptions);

        if (!session?.user?.email || !isAdmin(session.user.email)) {
            return NextResponse.json(
                { status: 'error', message: 'Unauthorized' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { userId, membership, durationDays } = body;
        console.log('[ADMIN] POST - Updating user:', { userId, membership, durationDays });

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

        // Ensure database has all columns
        const { initDatabase } = await import('@/lib/turso');
        await initDatabase();

        // Calculate expiry date
        const days = durationDays || 30;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);

        console.log('[ADMIN] POST - Executing UPDATE query...');

        // Update membership - use simpler query that works with minimal columns
        await turso.execute({
            sql: `UPDATE users SET membership = ? WHERE id = ?`,
            args: [membership, userId],
        });

        // Try to update expires date separately (may fail if column doesn't exist)
        try {
            await turso.execute({
                sql: `UPDATE users SET membership_expires = ? WHERE id = ?`,
                args: [expiresAt.toISOString(), userId],
            });
            console.log('[ADMIN] POST - Updated membership_expires');
        } catch (expError) {
            console.log('[ADMIN] POST - Could not update membership_expires (column may not exist)');
        }

        console.log('[ADMIN] POST - Update successful!');

        return NextResponse.json({
            status: 'success',
            message: `User upgraded to ${membership} for ${days} days`,
            expiresAt: expiresAt.toISOString(),
        });

    } catch (error) {
        console.error('Admin update error:', error);
        return NextResponse.json(
            { status: 'error', message: 'Internal server error' },
            { status: 500 }
        );
    }
}
