import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { copytradeSupabase } from '@/lib/supabase-copytrade';
import { isAdminEmail } from '@/lib/admin-access';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const email = session?.user?.email?.toLowerCase() || '';
        if (!isAdminEmail(email)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const [totalUsersRes, activeUsersRes, totalSignalsRes, pendingTopupsRes, submittedTopupsRes, creditedTopupsRes] = await Promise.all([
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
            copytradeSupabase
                .from('ct_topups')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'pending'),
            copytradeSupabase
                .from('ct_topups')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'paid'),
            copytradeSupabase
                .from('ct_topups')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'credited'),
        ]);

        const nonIgnorableErrors = [
            totalUsersRes.error,
            activeUsersRes.error,
            totalSignalsRes.error,
        ].filter(Boolean);
        if (nonIgnorableErrors.length > 0) {
            return NextResponse.json({ error: nonIgnorableErrors[0]?.message || 'Stats query failed' }, { status: 500 });
        }

        const pendingTopupCount = pendingTopupsRes.error?.code === '42P01' ? 0 : (pendingTopupsRes.count ?? 0);
        const submittedTopupCount = submittedTopupsRes.error?.code === '42P01' ? 0 : (submittedTopupsRes.count ?? 0);
        const creditedTopupCount = creditedTopupsRes.error?.code === '42P01' ? 0 : (creditedTopupsRes.count ?? 0);

        return NextResponse.json({
            success: true,
            totalUsers: totalUsersRes.count ?? 0,
            activeUsers: activeUsersRes.count ?? 0,
            totalSignals: totalSignalsRes.count ?? 0,
            pendingTopups: pendingTopupCount,
            submittedTopups: submittedTopupCount,
            creditedTopups: creditedTopupCount,
        });
    } catch (error) {
        console.error('[Admin CT Stats] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
