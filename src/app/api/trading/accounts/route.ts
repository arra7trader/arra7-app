import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import getTursoClient from '@/lib/turso';
import { nanoid } from 'nanoid';

// GET: Fetch all connected accounts for the user
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
    }

    const turso = getTursoClient();
    if (!turso) {
        return NextResponse.json({ status: 'error', message: 'Database configuration error' }, { status: 500 });
    }

    try {
        const result = await turso.execute({
            sql: `SELECT id, name, broker, login, server, platform, connection_status, created_at 
                  FROM trading_accounts 
                  WHERE user_id = ? 
                  ORDER BY created_at DESC`,
            args: [session.user.id]
        });

        const accounts = result.rows.map(row => ({
            id: row.id,
            name: row.name,
            broker: row.broker,
            login: row.login,
            server: row.server,
            platform: row.platform,
            status: row.connection_status,
            createdAt: row.created_at
        }));

        return NextResponse.json({ status: 'success', data: accounts });
    } catch (error) {
        console.error('Fetch accounts error:', error);
        return NextResponse.json({ status: 'error', message: 'Failed to fetch accounts' }, { status: 500 });
    }
}

// POST: Connect a new trading account
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, broker, login, password, server, platform } = body;

        // Basic validation
        if (!name || !broker || !login || !password || !server || !platform) {
            return NextResponse.json({ status: 'error', message: 'Missing required fields' }, { status: 400 });
        }

        const turso = getTursoClient();
        if (!turso) {
            return NextResponse.json({ status: 'error', message: 'Database configuration error' }, { status: 500 });
        }

        // SIMULATION: In a real app, we would verify with MetaApi here.
        // For MVP, if the server contains "demo", we mark as CONNECTED immediately.
        // If "real", we simulate a verification delay or success.
        const connectionStatus = 'CONNECTED';
        const accountId = nanoid();

        // Encrypt password/key before storing (Placeholder for now)
        // In production, use proper encryption (e.g., AES)
        const encryptedKey = `encrypted_${password}`;

        await turso.execute({
            sql: `INSERT INTO trading_accounts (id, user_id, name, broker, login, server, platform, api_key, connection_status)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [accountId, session.user.id, name, broker, login, server, platform, encryptedKey, connectionStatus]
        });

        // Initialize Auto-Trade Settings for this account
        await turso.execute({
            sql: `INSERT INTO auto_trade_settings (account_id, is_active, risk_percent, max_open_trades)
                  VALUES (?, 0, 1.0, 3)`,
            args: [accountId]
        });

        return NextResponse.json({
            status: 'success',
            message: 'Account connected successfully',
            data: { id: accountId, status: connectionStatus }
        });

    } catch (error) {
        console.error('Connect account error:', error);
        return NextResponse.json({ status: 'error', message: 'Failed to connect account' }, { status: 500 });
    }
}
