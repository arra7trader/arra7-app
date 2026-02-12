import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import getTursoClient, { logActivity } from '@/lib/turso';
import { randomUUID } from 'crypto';

// Admin emails - add your admin email here
const ADMIN_EMAILS = [
    'apmexplore@gmail.com', // Add your email
];

export const dynamic = 'force-dynamic';

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

        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];

        // Try to get today's FOREX usage data
        const forexUsageMap: Record<string, number> = {};
        try {
            const usageResult = await turso.execute({
                sql: `SELECT user_id, count FROM quota_usage WHERE date = ?`,
                args: [today],
            });
            usageResult.rows.forEach((row: any) => {
                forexUsageMap[row.user_id as string] = row.count as number;
            });
            console.log('[ADMIN] Forex usage data loaded for', Object.keys(forexUsageMap).length, 'users');
        } catch (usageError) {
            console.log('[ADMIN] Could not load forex usage data:', usageError);
        }

        // Try to get today's STOCK usage data
        const stockUsageMap: Record<string, number> = {};
        try {
            const stockUsageResult = await turso.execute({
                sql: `SELECT user_id, count FROM stock_quota_usage WHERE date = ?`,
                args: [today],
            });
            stockUsageResult.rows.forEach((row: any) => {
                stockUsageMap[row.user_id as string] = row.count as number;
            });
            console.log('[ADMIN] Stock usage data loaded for', Object.keys(stockUsageMap).length, 'users');
        } catch (stockUsageError) {
            console.log('[ADMIN] Could not load stock usage data:', stockUsageError);
        }

        // Safely map users with fallbacks for missing columns
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const users = [];
        const expiredUserIds: string[] = [];
        const now = new Date();

        for (const row of result.rows) {
            const forexUsage = forexUsageMap[row.id as string] || 0;
            const stockUsage = stockUsageMap[row.id as string] || 0;

            let membership = (row.membership as string) || 'BASIC';
            const membershipExpires = row.membership_expires ? new Date(row.membership_expires as string) : null;

            // Check for expiration
            // Ignore admins (they usually have no expiry, but just in case)
            if (membership !== 'BASIC' && membership !== 'ADMIN' && membershipExpires && membershipExpires < now) {
                console.log(`[ADMIN] User ${row.email} expired at ${membershipExpires.toISOString()}. Marking for downgrade.`);
                membership = 'BASIC';
                expiredUserIds.push(row.id as string);
            }

            users.push({
                id: row.id || '',
                email: row.email || '',
                name: row.name || '',
                membership: membership,
                membershipExpires: row.membership_expires || null,
                createdAt: row.created_at || null,
                updatedAt: row.updated_at || null,
                todayUsage: forexUsage + stockUsage, // Combined usage
                forexUsage,
                stockUsage,
                // Geo-location data
                lastLoginIp: row.last_login_ip || null,
                lastLoginCountry: row.last_login_country || null,
                lastLoginCity: row.last_login_city || null,
                lastLoginAt: row.last_login_at || null,
                downloadedApk: row.downloaded_apk === 1,
            });
        }

        // Auto-downgrade expired users in background (await to ensure consistency)
        if (expiredUserIds.length > 0) {
            try {
                // SQLite doesn't support array parameters easily in IN clause with standard binding
                // We'll construct the query manually carefully or loop
                // For safety and simplicity with small batches, loop is fine, or one query with mapped placeholders
                const placeholders = expiredUserIds.map(() => '?').join(',');
                await turso.execute({
                    sql: `UPDATE users SET membership = 'BASIC' WHERE id IN (${placeholders})`,
                    args: expiredUserIds
                });
                console.log(`[ADMIN] Auto-downgraded ${expiredUserIds.length} expired users.`);

                // Optional: Log activity for bulk downgrade? 
                // Might be too noisy if 100 people expire. Let's skip valid activity log for now to keep it clean, 
                // or log a single system event if we had a system user. 
            } catch (downgradeError) {
                console.error('[ADMIN] Failed to auto-downgrade users:', downgradeError);
            }
        }

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

// POST - Create or Update user
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
        const { action, userId, email, name, membership, durationDays } = body;

        const turso = getTursoClient();
        if (!turso) {
            return NextResponse.json(
                { status: 'error', message: 'Database not configured' },
                { status: 503 }
            );
        }

        // Database Init
        const { initDatabase } = await import('@/lib/turso');
        await initDatabase();

        // Handle Actions
        if (action === 'create') {
            if (!email) {
                return NextResponse.json({ status: 'error', message: 'Email is required' }, { status: 400 });
            }

            // Check if email exists
            const existing = await turso.execute({
                sql: 'SELECT id FROM users WHERE email = ?',
                args: [email]
            });

            if (existing.rows.length > 0) {
                return NextResponse.json({ status: 'error', message: 'Email already exists' }, { status: 400 });
            }

            const newId = crypto.randomUUID();
            const now = new Date().toISOString();

            // Calculate membership expiry if provided
            let expiresAt = null;
            if (membership && membership !== 'BASIC') {
                const d = new Date();
                d.setDate(d.getDate() + (durationDays || 30));
                expiresAt = d.toISOString();
            }

            await turso.execute({
                sql: `INSERT INTO users (id, email, name, membership, membership_expires, created_at, updated_at)
                      VALUES (?, ?, ?, ?, ?, ?, ?)`,
                args: [newId, email, name || '', membership || 'BASIC', expiresAt, now, now]
            });

            await logActivity(newId, 'REGISTER_ADMIN', { message: 'User created by admin', admin: session.user.email });

            return NextResponse.json({ status: 'success', message: 'User created successfully', userId: newId });

        } else if (action === 'update' || (userId && membership)) {
            // Update logic (merges existing membership update logic)
            const targetId = userId || body.id; // Handle both
            if (!targetId) {
                return NextResponse.json({ status: 'error', message: 'User ID is required for update' }, { status: 400 });
            }

            // Build dynamic update query
            const updates: string[] = [];
            const args: any[] = [];

            if (email) {
                updates.push('email = ?');
                args.push(email);
            }
            if (name !== undefined) {
                updates.push('name = ?');
                args.push(name);
            }
            if (membership) {
                updates.push('membership = ?');
                args.push(membership);

                // If updating membership, also update expiry if it wasn't there or if we want to extend
                // BUT, if it's a simple profile edit, we might not want to reset expiry unless specified.
                // The legacy logic set expiry when membership changed.
                // Let's assume if 'membership' is passed, we check if we need to update expiry.
                if (membership !== 'BASIC' && durationDays) {
                    const d = new Date();
                    d.setDate(d.getDate() + durationDays);
                    updates.push('membership_expires = ?');
                    args.push(d.toISOString());
                } else if (membership === 'BASIC') {
                    updates.push('membership_expires = ?');
                    args.push(null);
                }
            }

            // updates.push('updated_at = ?');
            // args.push(new Date().toISOString());

            if (updates.length === 0) {
                return NextResponse.json({ status: 'success', message: 'No changes detected' });
            }

            args.push(targetId);

            await turso.execute({
                sql: `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
                args: args
            });

            await logActivity(targetId, 'UPDATE_ADMIN', {
                message: 'User updated by admin',
                admin: session.user.email,
                updates: updates.map(u => u.split(' =')[0])
            });

            return NextResponse.json({ status: 'success', message: 'User updated successfully' });
        } else {
            return NextResponse.json({ status: 'error', message: 'Invalid action' }, { status: 400 });
        }

    } catch (error: any) {
        console.error('Admin POST error:', error);
        return NextResponse.json(
            { status: 'error', message: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
