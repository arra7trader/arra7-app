import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { copytradeSupabase } from '@/lib/supabase-copytrade';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '30');

        // Get current user's ct_user record
        const { data: ctUser } = await copytradeSupabase
            .from('ct_users')
            .select('id')
            .eq('email', session.user.email)
            .single();

        if (!ctUser) {
            return NextResponse.json({ success: true, logs: [] });
        }

        const { data: logs, error } = await copytradeSupabase
            .from('ai_trade_logs')
            .select('id, status, profit, timestamp')
            .eq('user_id', ctUser.id)
            .order('timestamp', { ascending: false })
            .limit(limit);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, logs: logs || [] });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
