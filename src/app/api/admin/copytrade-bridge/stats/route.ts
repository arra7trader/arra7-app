import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { copytradeSupabase } from '@/lib/supabase-copytrade';

const ADMIN_EMAILS = new Set(['apmexplore@gmail.com', 'admin@arra.com']);

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const email = session?.user?.email?.toLowerCase() || '';
        if (!ADMIN_EMAILS.has(email)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const [totalUsersRes, activeUsersRes, totalSignalsRes] = await Promise.all([
            copytradeSupabase
                .from('ct_users')
                .select('id', { count: 'exact', head: true })
                .not('license_key', 'is', null),
            copytradeSupabase
                .from('ai_trade_logs')
                .select('user_id', { count: 'exact', head: true })
                .gte('timestamp', new Date(Date.now() - 15 * 60 * 1000).toISOString()),
            copytradeSupabase
                .from('ai_signal_store')
                .select('id', { count: 'exact', head: true }),
        ]);

        return NextResponse.json({
            success: true,
            totalUsers: totalUsersRes.count ?? 0,
            activeUsers: activeUsersRes.count ?? 0,
            totalSignals: totalSignalsRes.count ?? 0,
        });
    } catch (error) {
        console.error('[Admin CT Stats] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
