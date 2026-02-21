import { NextResponse } from 'next/server';
import { copytradeSupabase } from '@/lib/supabase-copytrade';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { pair, type, entry_price, tp, sl } = body;

        if (!pair || !type || entry_price === undefined || tp === undefined || sl === undefined) {
            return NextResponse.json({ error: 'Missing required fields: pair, type, entry_price, tp, sl' }, { status: 400 });
        }

        const { data, error } = await copytradeSupabase
            .from('ai_signal_store')
            .insert({ pair, type, entry_price, tp, sl })
            .select('id')
            .single();

        if (error) {
            console.error('[CT Signal] Supabase error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, signalId: data.id });
    } catch (error: any) {
        console.error('[CT Signal] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
