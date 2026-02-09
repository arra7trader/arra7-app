import { NextResponse } from 'next/server';
import getTursoClient from '@/lib/turso';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email required' }, { status: 400 });
        }

        const client = getTursoClient();
        if (!client) {
            return NextResponse.json({ error: 'Database configuration missing' }, { status: 503 });
        }

        const result = await client.execute({
            sql: "SELECT membership FROM users WHERE email = ?",
            args: [email]
        });

        if (result.rows.length === 0) {
            // User not found in DB, default to BASIC
            return NextResponse.json({ membership: 'BASIC' });
        }

        const membership = result.rows[0].membership;
        console.log(`Mobile Sync for ${email}: ${membership}`);

        return NextResponse.json({
            membership: membership
        });

    } catch (e) {
        console.error('Mobile Sync Error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
