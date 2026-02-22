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
        const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';
        const sourceUserId = typeof body?.sourceUserId === 'string' ? body.sourceUserId.trim() : '';
        const targetEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
        const targetName = typeof body?.name === 'string' ? body.name.trim() : '';
        const amount = Number(body?.amount);
        const reason = String(body?.reason || '').trim();

        if (!userId && !targetEmail) {
            return NextResponse.json({ error: 'userId atau email wajib diisi' }, { status: 400 });
        }
        if (!Number.isFinite(amount) || amount === 0) {
            return NextResponse.json({ error: 'amount number (non-zero) wajib diisi' }, { status: 400 });
        }
        if (reason.length < 3) {
            return NextResponse.json({ error: 'reason wajib diisi (minimal 3 karakter)' }, { status: 400 });
        }

        let bridgeUser:
            | { id: string; email: string | null; copytrade_balance: number | null }
            | null = null;

        if (userId) {
            const { data, error } = await copytradeSupabase
                .from('ct_users')
                .select('id, email, copytrade_balance')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 });
            }
            bridgeUser = data;
        }

        if (!bridgeUser && targetEmail) {
            const { data, error } = await copytradeSupabase
                .from('ct_users')
                .select('id, email, copytrade_balance')
                .eq('email', targetEmail)
                .maybeSingle();

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 });
            }
            bridgeUser = data;
        }

        if (!bridgeUser) {
            if (!targetEmail) {
                return NextResponse.json(
                    { error: 'Bridge user belum ada. Sertakan email agar auto-create user copytrade.' },
                    { status: 404 },
                );
            }

            const insertPayload: { id?: string; email: string; name: string } = {
                email: targetEmail,
                name: targetName || targetEmail.split('@')[0] || '',
            };
            const preferredId = sourceUserId || userId;
            if (preferredId) {
                insertPayload.id = preferredId;
            }

            const { data: insertedUser, error: insertError } = await copytradeSupabase
                .from('ct_users')
                .insert(insertPayload)
                .select('id, email, copytrade_balance')
                .single();

            if (insertError) {
                // Guard for race condition (other request inserted same email first)
                const { data: fallbackUser, error: fallbackError } = await copytradeSupabase
                    .from('ct_users')
                    .select('id, email, copytrade_balance')
                    .eq('email', targetEmail)
                    .maybeSingle();

                if (fallbackError || !fallbackUser) {
                    return NextResponse.json({ error: insertError.message }, { status: 500 });
                }

                bridgeUser = fallbackUser;
            } else {
                bridgeUser = insertedUser;
            }
        }

        if (!bridgeUser) {
            return NextResponse.json({ error: 'Bridge user tidak ditemukan' }, { status: 404 });
        }

        const balanceBefore = Number(bridgeUser.copytrade_balance || 0);
        const change = Number(amount);
        const newBalance = Math.max(0, balanceBefore + change);

        const { error } = await copytradeSupabase
            .from('ct_users')
            .update({ copytrade_balance: newBalance })
            .eq('id', bridgeUser.id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const { error: ledgerError } = await copytradeSupabase
            .from('ct_ledger')
            .insert({
                user_id: bridgeUser.id,
                order_id: null,
                entry_type: 'admin_adjustment',
                direction: change > 0 ? 'credit' : 'debit',
                amount: Math.abs(change),
                amount_idr: null,
                balance_before: balanceBefore,
                balance_after: newBalance,
                actor_email: email,
                note: `${reason} (target: ${bridgeUser.email || targetEmail || '-'})`,
            });

        if (ledgerError && ledgerError.code !== '42P01') {
            return NextResponse.json({ error: ledgerError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, bridgeUserId: bridgeUser.id, newBalance });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
