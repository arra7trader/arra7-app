import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { copytradeSupabase } from '@/lib/supabase-copytrade';
import { isAdminEmail } from '@/lib/admin-access';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!isAdminEmail(session?.user?.email)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') || 50), 1), 200);
        const status = String(request.nextUrl.searchParams.get('status') || '').toLowerCase();

        let query = copytradeSupabase
            .from('ct_topups')
            .select('id, user_id, order_id, email, plan_id, credits, amount_idr, paid_amount_idr, status, payment_provider, provider_reference, proof_sender, proof_channel, proof_note, proof_image_url, proof_submitted_at, reviewed_by, reviewed_at, review_note, created_at, paid_at, credited_at, expires_at')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (status) {
            query = query.eq('status', status);
        }

        let { data, error } = await query;
        if (error && /column .* does not exist/i.test(error.message || '')) {
            const fallback = await copytradeSupabase
                .from('ct_topups')
                .select('id, order_id, email, plan_id, credits, amount_idr, status, payment_provider, provider_reference, created_at, paid_at, credited_at, expires_at')
                .order('created_at', { ascending: false })
                .limit(limit);
            data = fallback.data as typeof data;
            error = fallback.error;
        }
        if (error?.code === '42P01') {
            return NextResponse.json({ success: true, topups: [], migrationRequired: true });
        }
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, topups: data || [] });
    } catch (error) {
        console.error('[Admin CT Topups] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const adminEmail = session?.user?.email?.toLowerCase() || '';
        if (!isAdminEmail(adminEmail)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const orderId = String(body?.orderId || '').trim();
        const action = String(body?.action || '').trim().toLowerCase();
        const reason = String(body?.reason || '').trim();
        if (!orderId || (action !== 'approve' && action !== 'reject')) {
            return NextResponse.json({ error: 'orderId dan action approve/reject wajib diisi' }, { status: 400 });
        }

        let { data: topup, error: topupError } = await copytradeSupabase
            .from('ct_topups')
            .select('id, user_id, order_id, email, status, credits, amount_idr, paid_amount_idr, provider_reference')
            .eq('order_id', orderId)
            .single();

        if (topupError && /column .* does not exist/i.test(topupError.message || '')) {
            const fallback = await copytradeSupabase
                .from('ct_topups')
                .select('id, user_id, order_id, email, status, credits, amount_idr, provider_reference')
                .eq('order_id', orderId)
                .single();
            topup = fallback.data as typeof topup;
            topupError = fallback.error;
        }

        if (topupError?.code === '42P01') {
            return NextResponse.json(
                { error: 'Tabel ct_topups belum tersedia. Jalankan migrasi supabase-copytrade-schema.sql terlebih dahulu.' },
                { status: 503 },
            );
        }
        if (topupError || !topup) {
            return NextResponse.json({ error: 'Order topup tidak ditemukan' }, { status: 404 });
        }

        const now = new Date().toISOString();
        if (action === 'reject') {
            if (reason.length < 3) {
                return NextResponse.json({ error: 'Reason reject minimal 3 karakter' }, { status: 400 });
            }
            const { error: rejectError } = await copytradeSupabase
                .from('ct_topups')
                .update({
                    status: 'failed',
                    reviewed_by: adminEmail,
                    reviewed_at: now,
                    review_note: reason,
                })
                .eq('id', topup.id)
                .neq('status', 'credited');

            if (rejectError) {
                if (/column .* does not exist/i.test(rejectError.message || '')) {
                    return NextResponse.json({ error: 'Schema topup belum update. Jalankan ulang SQL setup terbaru.' }, { status: 503 });
                }
                return NextResponse.json({ error: rejectError.message }, { status: 500 });
            }
            return NextResponse.json({ success: true, status: 'failed' });
        }

        if (topup.status === 'credited') {
            return NextResponse.json({ success: true, status: 'credited', message: 'Order sudah credited sebelumnya.' });
        }
        if (topup.status !== 'paid' && topup.status !== 'pending') {
            return NextResponse.json({ error: 'Order tidak bisa di-approve pada status saat ini' }, { status: 400 });
        }

        const { data: existingLedger, error: ledgerLookupError } = await copytradeSupabase
            .from('ct_ledger')
            .select('id')
            .eq('order_id', topup.order_id)
            .eq('entry_type', 'topup_qris')
            .limit(1)
            .maybeSingle();

        if (ledgerLookupError && ledgerLookupError.code !== '42P01') {
            return NextResponse.json({ error: ledgerLookupError.message }, { status: 500 });
        }

        if (existingLedger) {
            await copytradeSupabase
                .from('ct_topups')
                .update({
                    status: 'credited',
                    credited_at: now,
                    reviewed_by: adminEmail,
                    reviewed_at: now,
                    review_note: reason || 'Auto-sync from existing ledger entry',
                })
                .eq('id', topup.id);

            return NextResponse.json({ success: true, status: 'credited', message: 'Order sudah memiliki ledger topup.' });
        }

        const { data: user, error: userError } = await copytradeSupabase
            .from('ct_users')
            .select('copytrade_balance')
            .eq('id', topup.user_id)
            .single();

        if (userError || !user) {
            return NextResponse.json({ error: userError?.message || 'Bridge user tidak ditemukan' }, { status: 500 });
        }

        const creditsToAdd = Number(topup.credits || 0);
        const balanceBefore = Number(user.copytrade_balance || 0);
        const balanceAfter = balanceBefore + creditsToAdd;

        const { error: balanceError } = await copytradeSupabase
            .from('ct_users')
            .update({ copytrade_balance: balanceAfter })
            .eq('id', topup.user_id);
        if (balanceError) {
            return NextResponse.json({ error: balanceError.message }, { status: 500 });
        }

        const ledgerNote = reason
            ? `Manual topup approval: ${reason}`
            : `Manual topup approval (${topup.provider_reference || '-'})`;
        const { error: ledgerError } = await copytradeSupabase
            .from('ct_ledger')
            .insert({
                user_id: topup.user_id,
                order_id: topup.order_id,
                entry_type: 'topup_qris',
                direction: 'credit',
                amount: creditsToAdd,
                amount_idr: Number(topup.paid_amount_idr || topup.amount_idr || 0),
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                actor_email: adminEmail,
                note: ledgerNote,
            });

        if (ledgerError && ledgerError.code !== '42P01' && ledgerError.code !== '23505') {
            return NextResponse.json({ error: ledgerError.message }, { status: 500 });
        }

        const { error: updateTopupError } = await copytradeSupabase
            .from('ct_topups')
            .update({
                status: 'credited',
                credited_at: now,
                reviewed_by: adminEmail,
                reviewed_at: now,
                review_note: reason || null,
            })
            .eq('id', topup.id);

        if (updateTopupError) {
            if (/column .* does not exist/i.test(updateTopupError.message || '')) {
                return NextResponse.json({ error: 'Schema topup belum update. Jalankan ulang SQL setup terbaru.' }, { status: 503 });
            }
            return NextResponse.json({ error: updateTopupError.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            status: 'credited',
            newBalance: balanceAfter,
            message: `Topup ${topup.order_id} berhasil di-approve.`,
        });
    } catch (error) {
        console.error('[Admin CT Topups PATCH] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
