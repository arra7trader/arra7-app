import { NextRequest, NextResponse } from 'next/server';
import { copytradeSupabase } from '@/lib/supabase-copytrade';
import { consumeRateLimit, getRequestIp, verifyBridgeSignature } from '@/lib/copytrade-bridge-security';
import { isUnlimitedCopytradeEmail, UNLIMITED_COPYTRADE_BALANCE } from '@/lib/copytrade-unlimited';

const EXECUTED_STATUSES = new Set(['SUCCESS', 'EXECUTED']);
const ALLOWED_STATUSES = new Set(['SUCCESS', 'EXECUTED', 'FAILED', 'REJECTED', 'SKIPPED']);

type TradeLogPayload = {
    licenseKey?: string;
    status?: string;
    profit?: number;
    pair?: string;
    clientTradeId?: string;
    note?: string;
};

export async function POST(request: NextRequest) {
    try {
        const ip = getRequestIp(request);
        const rate = consumeRateLimit(`ct-trade-log:${ip}`, 180, 60_000);
        if (!rate.allowed) {
            return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
        }

        const rawBody = await request.text();
        const signatureCheck = verifyBridgeSignature(request, rawBody);
        if (!signatureCheck.ok) {
            return NextResponse.json({ error: signatureCheck.reason }, { status: 401 });
        }

        let body: TradeLogPayload = {};
        try {
            body = JSON.parse(rawBody);
        } catch {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }

        const licenseKey = String(body.licenseKey || '').trim();
        const status = String(body.status || '').toUpperCase().trim();
        const profit = Number(body.profit || 0);
        const pair = body.pair ? String(body.pair).toUpperCase().trim() : null;
        const clientTradeId = body.clientTradeId ? String(body.clientTradeId).trim() : null;
        const note = body.note ? String(body.note).trim() : null;

        if (!licenseKey || !status) {
            return NextResponse.json({ error: 'licenseKey and status are required' }, { status: 400 });
        }
        if (!ALLOWED_STATUSES.has(status)) {
            return NextResponse.json({ error: `Invalid status: ${status}` }, { status: 400 });
        }
        if (!Number.isFinite(profit)) {
            return NextResponse.json({ error: 'Invalid profit value' }, { status: 400 });
        }

        const { data: user, error: userError } = await copytradeSupabase
            .from('ct_users')
            .select('id, email, copytrade_balance')
            .eq('license_key', licenseKey)
            .single();

        if (userError || !user) {
            return NextResponse.json({ error: 'Invalid license key' }, { status: 401 });
        }

        const shouldDebitCredit = EXECUTED_STATUSES.has(status);
        const balanceBefore = Number(user.copytrade_balance || 0);
        const unlimited = isUnlimitedCopytradeEmail(user.email);

        if (shouldDebitCredit && !unlimited && balanceBefore <= 0) {
            return NextResponse.json({ error: 'Insufficient bridge credits' }, { status: 402 });
        }

        let { data: insertedLog, error: logError } = await copytradeSupabase
            .from('ai_trade_logs')
            .insert({
                user_id: user.id,
                status,
                profit,
                pair,
                client_trade_id: clientTradeId,
                note,
            })
            .select('id')
            .single();

        // Backward compatibility if DB migration (new columns) not applied yet.
        if (logError && logError.code === 'PGRST204') {
            const fallbackInsert = await copytradeSupabase
                .from('ai_trade_logs')
                .insert({
                    user_id: user.id,
                    status,
                    profit,
                })
                .select('id')
                .single();

            insertedLog = fallbackInsert.data;
            logError = fallbackInsert.error;
        }

        if (logError || !insertedLog) {
            return NextResponse.json({ error: logError?.message || 'Failed to write trade log' }, { status: 500 });
        }

        let balanceAfter = balanceBefore;
        if (shouldDebitCredit && !unlimited) {
            balanceAfter = Math.max(0, balanceBefore - 1);
            const { error: balanceError } = await copytradeSupabase
                .from('ct_users')
                .update({ copytrade_balance: balanceAfter })
                .eq('id', user.id);

            if (balanceError) {
                return NextResponse.json({ error: balanceError.message }, { status: 500 });
            }

            const { error: ledgerError } = await copytradeSupabase
                .from('ct_ledger')
                .insert({
                    user_id: user.id,
                    order_id: insertedLog.id,
                    entry_type: 'trade_execution',
                    direction: 'debit',
                    amount: 1,
                    amount_idr: null,
                    balance_before: balanceBefore,
                    balance_after: balanceAfter,
                    actor_email: user.email || null,
                    note: `EA execution ${status}${pair ? ` ${pair}` : ''}`,
                });

            if (ledgerError && ledgerError.code !== '42P01') {
                return NextResponse.json({ error: ledgerError.message }, { status: 500 });
            }
        }

        return NextResponse.json({
            success: true,
            tradeLogId: insertedLog.id,
            balance: unlimited ? UNLIMITED_COPYTRADE_BALANCE : balanceAfter,
            unlimited,
        });
    } catch (error) {
        console.error('[CT TradeLog] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
