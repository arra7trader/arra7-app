
import { NextRequest, NextResponse } from 'next/server';
import getTursoClient from '@/lib/turso';

export const dynamic = 'force-dynamic';

// GET: Bridge Polls for Pending Trades
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const apiKey = searchParams.get('api_key'); // We use the ID as a simple key for now

        if (!apiKey) {
            return NextResponse.json({ status: 'error', message: 'API Key required' }, { status: 401 });
        }

        const turso = getTursoClient();
        if (!turso) return NextResponse.json({ status: 'error' }, { status: 503 });

        // 1. Validate Account
        const accountRes = await turso.execute({
            sql: 'SELECT id, user_id FROM trading_accounts WHERE id = ?',
            args: [apiKey]
        });

        if (accountRes.rows.length === 0) {
            return NextResponse.json({ status: 'error', message: 'Invalid API Key' }, { status: 401 });
        }

        const accountId = accountRes.rows[0].id as string;

        // 2. Update Connection Status (Heartbeat)
        await turso.execute({
            sql: "UPDATE trading_accounts SET connection_status = 'CONNECTED', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            args: [accountId]
        });

        // 3. Fetch Pending Signals for this Account
        // In a real scenario, smart-predictor would insert into trade_logs with status 'QUEUED'
        const tradesRes = await turso.execute({
            sql: `
                SELECT id, symbol, action, lot_size, sl, tp 
                FROM trade_logs 
                WHERE account_id = ? AND status = 'QUEUED'
                LIMIT 5
            `,
            args: [accountId]
        });

        const trades = tradesRes.rows.map(row => ({
            id: row.id,
            symbol: row.symbol,
            action: row.action,
            lotSize: row.lot_size,
            sl: row.sl,
            tp: row.tp
        }));

        return NextResponse.json({ status: 'success', trades });

    } catch (error) {
        console.error('Bridge Poll Error:', error);
        return NextResponse.json({ status: 'error', message: 'Internal Error' }, { status: 500 });
    }
}

// POST: Bridge Updates Trade Status
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { apiKey, tradeId, mtTicket, openPrice, status, errorMessage } = body;

        if (!apiKey || !tradeId || !status) {
            return NextResponse.json({ status: 'error', message: 'Missing fields' }, { status: 400 });
        }

        const turso = getTursoClient();
        if (!turso) return NextResponse.json({ status: 'error' }, { status: 503 });

        // Validate Account
        const accountRes = await turso.execute({
            sql: 'SELECT id FROM trading_accounts WHERE id = ?',
            args: [apiKey]
        });
        if (accountRes.rows.length === 0) return NextResponse.json({ status: 'error', message: 'Invalid Key' }, { status: 401 });

        // Update Trade Log
        const updates: string[] = ['status = ?'];
        const args: any[] = [status];

        if (mtTicket) { updates.push('mt_ticket = ?'); args.push(mtTicket); }
        if (openPrice) { updates.push('open_price = ?'); args.push(openPrice); }
        if (errorMessage) { updates.push('error_message = ?'); args.push(errorMessage); }

        updates.push('executed_at = CURRENT_TIMESTAMP');
        args.push(tradeId);

        await turso.execute({
            sql: `UPDATE trade_logs SET ${updates.join(', ')} WHERE id = ?`,
            args
        });

        return NextResponse.json({ status: 'success' });

    } catch (error) {
        console.error('Bridge Update Error:', error);
        return NextResponse.json({ status: 'error', message: 'Internal Error' }, { status: 500 });
    }
}
