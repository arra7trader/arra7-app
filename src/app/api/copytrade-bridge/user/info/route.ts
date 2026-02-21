import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { copytradeSupabase } from '@/lib/supabase-copytrade';

export async function GET(req: Request) {
    try {
        const session = await getServerSession();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const email = session.user.email;

        // Get or create user in ct_users (Supabase copytrade DB)
        let { data: ctUser, error } = await copytradeSupabase
            .from('ct_users')
            .select('id, license_key, copytrade_balance')
            .eq('email', email)
            .single();

        // If user doesn't exist in Supabase CT DB yet, create them
        if (!ctUser) {
            const { data: newUser, error: insertError } = await copytradeSupabase
                .from('ct_users')
                .insert({ email, name: session.user.name || '' })
                .select('id, license_key, copytrade_balance')
                .single();

            if (insertError) {
                console.error('[CT Info] Insert user error:', insertError);
                return NextResponse.json({ error: 'Failed to initialize CT user' }, { status: 500 });
            }
            ctUser = newUser;
        }

        // Check last EA connection by looking at recent trade logs
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        const { data: recentLog } = await copytradeSupabase
            .from('ai_trade_logs')
            .select('timestamp')
            .eq('user_id', ctUser.id)
            .gte('timestamp', fifteenMinutesAgo)
            .order('timestamp', { ascending: false })
            .limit(1);

        const isConnected = recentLog && recentLog.length > 0;
        const lastActive = recentLog && recentLog.length > 0 ? recentLog[0].timestamp : null;

        return NextResponse.json({
            success: true,
            licenseKey: ctUser.license_key,
            balance: ctUser.copytrade_balance || 0,
            isConnected,
            lastActive,
        });
    } catch (error: any) {
        console.error('[CT Info] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
