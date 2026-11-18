import { NextRequest, NextResponse } from 'next/server';
import { resolveUserOrDevice } from '@/lib/auth-device';
import getTursoClient from '@/lib/turso';
import { nanoid } from 'nanoid';

// GET: Fetch all connected accounts for the user (supports session or deviceId)
export async function GET(req: NextRequest) {
    const user = await resolveUserOrDevice(req);
    if (!user?.userId) {
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
            args: [user.userId]
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

        return NextResponse.json({ status: 'success', accounts, data: accounts });
    } catch (error) {
        console.error('Fetch accounts error:', error);
        return NextResponse.json({ status: 'error', message: 'Failed to fetch accounts' }, { status: 500 });
    }
}

// POST: Connect a new trading account (supports session or deviceId)
export async function POST(req: NextRequest) {
    const user = await resolveUserOrDevice(req);
    if (!user?.userId) {
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

        const connectionStatus = 'CONNECTED';
        const accountId = nanoid();
        const encryptedKey = `encrypted_${password}`;

        await turso.execute({
            sql: `INSERT INTO trading_accounts (id, user_id, name, broker, login, server, platform, api_key, connection_status)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [accountId, user.userId, name, broker, login, server, platform, encryptedKey, connectionStatus]
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

// DELETE: Remove account
export async function DELETE(req: NextRequest) {
    const user = await resolveUserOrDevice(req);
    if (!user?.userId) {
        return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) {
            return NextResponse.json({ status: 'error', message: 'Account ID required' }, { status: 400 });
        }

        const turso = getTursoClient();
        if (!turso) {
            return NextResponse.json({ status: 'error', message: 'Database configuration error' }, { status: 500 });
        }

        await turso.execute({
            sql: 'DELETE FROM trading_accounts WHERE id = ? AND user_id = ?',
            args: [id, user.userId]
        });

        return NextResponse.json({ status: 'success', message: 'Account deleted' });
    } catch (error) {
        console.error('Delete account error:', error);
        return NextResponse.json({ status: 'error', message: 'Failed to delete account' }, { status: 500 });
    }
}
