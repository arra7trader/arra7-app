import { NextResponse } from 'next/server';
import { copytradeSupabase } from '@/lib/supabase-copytrade';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { licenseKey, status, profit } = body;

        if (!licenseKey || !status) {
            return NextResponse.json({ error: 'licenseKey and status are required' }, { status: 400 });
        }

        // Find user by license key
        const { data: user, error: userError } = await copytradeSupabase
            .from('ct_users')
            .select('id, copytrade_balance')
            .eq('license_key', licenseKey)
            .single();

        if (userError || !user) {
            return NextResponse.json({ error: 'Invalid license key' }, { status: 401 });
        }

        // Insert the trade log
        const { error: logError } = await copytradeSupabase
            .from('ai_trade_logs')
            .insert({
                user_id: user.id,
                status,
                profit: profit || 0,
            });

        if (logError) {
            console.error('[CT TradeLog] Insert error:', logError);
            return NextResponse.json({ error: logError.message }, { status: 500 });
        }

        // Deduct 1 credit from balance on successful trade
        let newBalance = user.copytrade_balance;
        if (status === 'SUCCESS' || status === 'EXECUTED') {
            newBalance = Math.max(0, user.copytrade_balance - 1);
            const { error: updateError } = await copytradeSupabase
                .from('ct_users')
                .update({ copytrade_balance: newBalance })
                .eq('id', user.id);

            if (updateError) {
                console.error('[CT TradeLog] Balance update error:', updateError);
            }
        }

        return NextResponse.json({ success: true, balance: newBalance });
    } catch (error: any) {
        console.error('[CT TradeLog] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
