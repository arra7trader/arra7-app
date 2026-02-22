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
        if (!isAdminEmail(email)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { userId, amount, reason } = body;

        if (!userId || typeof amount !== 'number' || !Number.isFinite(amount) || amount === 0) {
            return NextResponse.json({ error: 'userId dan amount number (non-zero) wajib diisi' }, { status: 400 });
        }
        if (!reason || String(reason).trim().length < 3) {
            return NextResponse.json({ error: 'reason wajib diisi (minimal 3 karakter)' }, { status: 400 });
        }

        // Get current balance first
        const { data: user } = await copytradeSupabase
            .from('ct_users')
            .select('email, copytrade_balance')
            .eq('id', userId)
            .single();

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const balanceBefore = Number(user.copytrade_balance || 0);
        const change = Number(amount);
        const newBalance = Math.max(0, balanceBefore + change);

        const { error } = await copytradeSupabase
            .from('ct_users')
            .update({ copytrade_balance: newBalance })
            .eq('id', userId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const { error: ledgerError } = await copytradeSupabase
            .from('ct_ledger')
            .insert({
                user_id: userId,
                order_id: null,
                entry_type: 'admin_adjustment',
                direction: change > 0 ? 'credit' : 'debit',
                amount: Math.abs(change),
                amount_idr: null,
                balance_before: balanceBefore,
                balance_after: newBalance,
                actor_email: email,
                note: `${String(reason).trim()} (target: ${user.email || '-'})`,
            });

        if (ledgerError && ledgerError.code !== '42P01') {
            return NextResponse.json({ error: ledgerError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, newBalance });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
