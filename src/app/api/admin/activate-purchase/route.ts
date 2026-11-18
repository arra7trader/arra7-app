import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminEmail } from '@/lib/admin-access';
import getTursoClient from '@/lib/turso';

export const dynamic = 'force-dynamic';

// POST - Admin activates Hermes Mentor for a user after payment confirmation
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email || !isAdminEmail(session.user.email)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const turso = getTursoClient();
        if (!turso) {
            return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
        }

        const body = await request.json();
        const { userEmail, product, price, notes } = body;

        if (!userEmail || !product) {
            return NextResponse.json({ error: 'userEmail and product are required' }, { status: 400 });
        }

        // Find user by email
        const userResult = await turso.execute({
            sql: 'SELECT id, name FROM users WHERE email = ?',
            args: [userEmail],
        });

        if (userResult.rows.length === 0) {
            return NextResponse.json({ error: `User with email ${userEmail} not found` }, { status: 404 });
        }

        const userId = userResult.rows[0].id as string;
        const userName = userResult.rows[0].name as string;

        // Ensure table exists
        await turso.execute(`
            CREATE TABLE IF NOT EXISTS user_purchases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                product TEXT NOT NULL,
                price INTEGER NOT NULL,
                currency TEXT DEFAULT 'IDR',
                status TEXT DEFAULT 'ACTIVE',
                purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME,
                notes TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        // Check if already purchased
        const existing = await turso.execute({
            sql: 'SELECT id FROM user_purchases WHERE user_id = ? AND product = ? AND status = ?',
            args: [userId, product, 'ACTIVE'],
        });

        if (existing.rows.length > 0) {
            return NextResponse.json({ 
                status: 'already_active',
                message: `${userName} already has active ${product}` 
            });
        }

        // Insert purchase record
        await turso.execute({
            sql: 'INSERT INTO user_purchases (user_id, product, price, notes) VALUES (?, ?, ?, ?)',
            args: [userId, product, price || 49000, notes || `Activated by admin ${session.user.email}`],
        });

        return NextResponse.json({
            status: 'success',
            message: `${product} activated for ${userName} (${userEmail})`,
        });
    } catch (error: any) {
        console.error('Activate purchase error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// GET - Admin lists all purchases
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email || !isAdminEmail(session.user.email)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const turso = getTursoClient();
        if (!turso) {
            return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
        }

        // Ensure table exists first
        await turso.execute(`
            CREATE TABLE IF NOT EXISTS user_purchases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                product TEXT NOT NULL,
                price INTEGER NOT NULL,
                currency TEXT DEFAULT 'IDR',
                status TEXT DEFAULT 'ACTIVE',
                purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME,
                notes TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        const product = request.nextUrl.searchParams.get('product') || 'HERMES_MENTOR';

        const result = await turso.execute({
            sql: `SELECT p.*, u.email, u.name 
                  FROM user_purchases p 
                  JOIN users u ON p.user_id = u.id 
                  WHERE p.product = ? 
                  ORDER BY p.purchased_at DESC`,
            args: [product],
        });

        return NextResponse.json({
            status: 'success',
            purchases: result.rows,
            total: result.rows.length,
        });
    } catch (error: any) {
        console.error('List purchases error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
