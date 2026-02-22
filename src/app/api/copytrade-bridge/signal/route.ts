import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { copytradeSupabase } from '@/lib/supabase-copytrade';

const ADMIN_EMAILS = new Set(['apmexplore@gmail.com', 'admin@arra.com']);

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const email = session?.user?.email?.toLowerCase() || '';
        if (!ADMIN_EMAILS.has(email)) {
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

        const { data, error } = await copytradeSupabase
            .from('ai_signal_store')
            .insert({
                pair: String(pair).toUpperCase(),
                type: String(type).toUpperCase(),
                entry_price: Number(entry_price),
                tp: Number(tp),
                sl: Number(sl),
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
