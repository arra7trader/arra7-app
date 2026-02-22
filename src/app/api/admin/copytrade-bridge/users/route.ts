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

        const { data: users, error } = await copytradeSupabase
            .from('ct_users')
            .select('id, email, name, license_key, copytrade_balance, created_at')
            .not('license_key', 'is', null)
            .order('copytrade_balance', { ascending: false })
            .limit(100);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, users });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const email = session?.user?.email?.toLowerCase() || '';
        if (!ADMIN_EMAILS.has(email)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { userId, amount } = body;

        if (!userId || typeof amount !== 'number') {
            return NextResponse.json({ error: 'userId and amount (number) required' }, { status: 400 });
        }

        // Get current balance first
        const { data: user } = await copytradeSupabase
            .from('ct_users')
            .select('copytrade_balance')
            .eq('id', userId)
            .single();

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const newBalance = Math.max(0, (user.copytrade_balance || 0) + amount);

        const { error } = await copytradeSupabase
            .from('ct_users')
            .update({ copytrade_balance: newBalance })
            .eq('id', userId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, newBalance });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
