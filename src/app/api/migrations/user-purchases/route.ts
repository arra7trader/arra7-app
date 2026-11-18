import { NextResponse } from 'next/server';
import getTursoClient from '@/lib/turso';

export const dynamic = 'force-dynamic';

// Migration: Create user_purchases table for standalone product purchases
export async function POST() {
    try {
        const turso = getTursoClient();
        if (!turso) {
            return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
        }

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

        await turso.execute(`
            CREATE INDEX IF NOT EXISTS idx_user_purchases_user_product
            ON user_purchases(user_id, product)
        `);

        return NextResponse.json({ 
            status: 'success', 
            message: 'user_purchases table created successfully' 
        });
    } catch (error: any) {
        console.error('Migration error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
