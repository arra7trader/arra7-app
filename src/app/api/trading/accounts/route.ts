
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import getTursoClient, { logActivity } from '@/lib/turso';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
        }

        const turso = getTursoClient();
        if (!turso) {
            return NextResponse.json({ status: 'error', message: 'Database not configured' }, { status: 503 });
        }

        const result = await turso.execute({
            sql: `
                SELECT 
                    a.id, a.name, a.broker, a.login, a.server, a.platform, a.connection_status, a.created_at,
                    s.is_active, s.risk_percent, s.fixed_lot, s.max_open_trades, s.pairs_allowed
                FROM trading_accounts a
                LEFT JOIN auto_trade_settings s ON a.id = s.account_id
                WHERE a.user_id = ?
                ORDER BY a.created_at DESC
            `,
            args: [session.user.id]
        });

        const accounts = result.rows.map(row => ({
            id: row.id,
            name: row.name,
            broker: row.broker,
            login: row.login,
            server: row.server,
            platform: row.platform,
            connectionStatus: row.connection_status,
            createdAt: row.created_at,
            settings: {
                isActive: row.is_active === 1,
                riskPercent: row.risk_percent,
                fixedLot: row.fixed_lot,
                maxOpenTrades: row.max_open_trades,
                pairsAllowed: row.pairs_allowed ? JSON.parse(row.pairs_allowed as string) : []
            }
        }));

        return NextResponse.json({ status: 'success', accounts });
    } catch (error) {
        console.error('GET accounts error:', error);
        return NextResponse.json({ status: 'error', message: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { action, id, name, broker, login, server, platform, settings } = body;

        const turso = getTursoClient();
        if (!turso) {
            return NextResponse.json({ status: 'error', message: 'Database not configured' }, { status: 503 });
        }

        if (action === 'create') {
            if (!name || !broker || !login || !server) {
                return NextResponse.json({ status: 'error', message: 'Missing required fields' }, { status: 400 });
            }

            const newId = randomUUID();
            const now = new Date().toISOString();

            // 1. Create Account
            await turso.execute({
                sql: `
                    INSERT INTO trading_accounts (id, user_id, name, broker, login, server, platform, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                args: [newId, session.user.id, name, broker, login, server, platform || 'MT5', now, now]
            });

            // 2. Create Default Settings
            await turso.execute({
                sql: `
                    INSERT INTO auto_trade_settings (account_id, is_active, risk_percent, fixed_lot, max_open_trades, pairs_allowed)
                    VALUES (?, 0, 1.0, 0.01, 3, ?)
                `,
                args: [newId, JSON.stringify(['XAUUSD', 'EURUSD', 'GBPUSD'])]
            });

            await logActivity(session.user.id, 'ADD_TRADING_ACCOUNT', { broker, login });

            return NextResponse.json({ status: 'success', message: 'Account added successfully', id: newId });

        } else if (action === 'update' && id) {
            // Update settings or connection details
            const updates: string[] = [];
            const args: any[] = [];
            const settingUpdates: string[] = [];
            const settingArgs: any[] = [];

            if (name) { updates.push('name = ?'); args.push(name); }
            if (login) { updates.push('login = ?'); args.push(login); }
            if (server) { updates.push('server = ?'); args.push(server); }

            if (updates.length > 0) {
                updates.push('updated_at = ?');
                args.push(new Date().toISOString());
                args.push(id);
                args.push(session.user.id); // Security check ownership

                await turso.execute({
                    sql: `UPDATE trading_accounts SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
                    args
                });
            }

            if (settings) {
                if (settings.isActive !== undefined) { settingUpdates.push('is_active = ?'); settingArgs.push(settings.isActive ? 1 : 0); }
                if (settings.riskPercent !== undefined) { settingUpdates.push('risk_percent = ?'); settingArgs.push(settings.riskPercent); }
                if (settings.fixedLot !== undefined) { settingUpdates.push('fixed_lot = ?'); settingArgs.push(settings.fixedLot); }
                if (settings.maxOpenTrades !== undefined) { settingUpdates.push('max_open_trades = ?'); settingArgs.push(settings.maxOpenTrades); }

                if (settingUpdates.length > 0) {
                    settingUpdates.push('updated_at = ?');
                    settingArgs.push(new Date().toISOString());
                    settingArgs.push(id);

                    await turso.execute({
                        sql: `UPDATE auto_trade_settings SET ${settingUpdates.join(', ')} WHERE account_id = ?`,
                        args: settingArgs
                    });
                }
            }

            return NextResponse.json({ status: 'success', message: 'Account updated successfully' });
        }

        return NextResponse.json({ status: 'error', message: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('POST accounts error:', error);
        return NextResponse.json({ status: 'error', message: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ status: 'error', message: 'ID required' }, { status: 400 });
        }

        const turso = getTursoClient();
        if (!turso) return NextResponse.json({ status: 'error' }, { status: 503 });

        // Verify ownership
        const check = await turso.execute({
            sql: 'SELECT id FROM trading_accounts WHERE id = ? AND user_id = ?',
            args: [id, session.user.id]
        });

        if (check.rows.length === 0) {
            return NextResponse.json({ status: 'error', message: 'Account not found' }, { status: 404 });
        }

        // Delete (Cascade should handle settings, but let's be safe)
        await turso.execute({ sql: 'DELETE FROM auto_trade_settings WHERE account_id = ?', args: [id] });
        await turso.execute({ sql: 'DELETE FROM trading_accounts WHERE id = ?', args: [id] });

        return NextResponse.json({ status: 'success', message: 'Account deleted' });

    } catch (error) {
        console.error('DELETE accounts error:', error);
        return NextResponse.json({ status: 'error', message: 'Internal server error' }, { status: 500 });
    }
}
