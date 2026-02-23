import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { copytradeSupabase } from '@/lib/supabase-copytrade';
import { isAdminEmail } from '@/lib/admin-access';
import { normalizeBridgeOrderType, normalizeBridgePair } from '@/lib/copytrade-bridge-order-type';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const email = session?.user?.email?.toLowerCase() || '';
        if (!isAdminEmail(email)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { pair, type, entry_price, tp, sl } = body;

        if (!pair || !type || entry_price === undefined || tp === undefined || sl === undefined) {
            return NextResponse.json({ error: 'Missing required fields: pair, type, entry_price, tp, sl' }, { status: 400 });
        }
        if (![entry_price, tp, sl].every((value) => Number.isFinite(Number(value)))) {
            return NextResponse.json({ error: 'Invalid numeric value' }, { status: 400 });
        }
        const entryNum = Number(entry_price);
        const tpNum = Number(tp);
        const slNum = Number(sl);
        if (entryNum <= 0 || tpNum <= 0 || slNum <= 0) {
            return NextResponse.json({ error: 'entry_price, tp, dan sl harus lebih besar dari 0' }, { status: 400 });
        }

        const normalizedPair = normalizeBridgePair(pair);
        if (!normalizedPair) {
            return NextResponse.json({ error: 'Invalid pair format' }, { status: 400 });
        }

        const normalizedType = normalizeBridgeOrderType(type);
        if (!normalizedType) {
            return NextResponse.json(
                { error: 'Invalid order type. Use BUY, SELL, BUY LIMIT, SELL LIMIT, BUY STOP, or SELL STOP.' },
                { status: 400 },
            );
        }

        const { data, error } = await copytradeSupabase
            .from('ai_signal_store')
            .insert({
                pair: normalizedPair,
                type: normalizedType,
                entry_price: entryNum,
                tp: tpNum,
                sl: slNum,
            })
            .select('id')
            .single();

        if (error) {
            console.error('[CT Signal] Supabase error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, signalId: data.id });
    } catch (error) {
        console.error('[CT Signal] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
