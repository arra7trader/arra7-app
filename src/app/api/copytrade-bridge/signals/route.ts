import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { copytradeSupabase } from '@/lib/supabase-copytrade';
import { normalizeBridgeOrderType } from '@/lib/copytrade-bridge-order-type';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '20');

        // Get recent signals — visible to all authenticated users
        const { data: signals, error } = await copytradeSupabase
            .from('ai_signal_store')
            .select('id, pair, type, entry_price, tp, sl, created_at')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const normalizedSignals = (signals || []).map((signal) => ({
            ...signal,
            pair: String(signal.pair || '').toUpperCase().trim(),
            type: normalizeBridgeOrderType(signal.type) || String(signal.type || '').toUpperCase().trim(),
        }));

        return NextResponse.json({ success: true, signals: normalizedSignals });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
