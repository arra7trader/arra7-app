import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { copytradeSupabase } from '@/lib/supabase-copytrade';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const orderId = request.nextUrl.searchParams.get('orderId');
        if (!orderId) {
            return NextResponse.json({ error: 'orderId wajib diisi' }, { status: 400 });
        }

        let { data: topup, error } = await copytradeSupabase
            .from('ct_topups')
            .select('order_id, plan_id, credits, amount_idr, paid_amount_idr, status, payment_provider, provider_reference, proof_sender, proof_channel, proof_note, proof_image_url, proof_submitted_at, reviewed_by, reviewed_at, review_note, qris_image_url, expires_at, paid_at, credited_at, created_at')
            .eq('order_id', orderId)
            .eq('email', session.user.email.toLowerCase())
            .single();

        if (error && /column .* does not exist/i.test(error.message || '')) {
            const fallback = await copytradeSupabase
                .from('ct_topups')
                .select('order_id, plan_id, credits, amount_idr, status, payment_provider, provider_reference, qris_image_url, expires_at, paid_at, credited_at, created_at')
                .eq('order_id', orderId)
                .eq('email', session.user.email.toLowerCase())
                .single();
            topup = fallback.data as typeof topup;
            error = fallback.error;
        }

        if (error?.code === '42P01') {
            return NextResponse.json(
                { error: 'Tabel ct_topups belum tersedia. Jalankan migrasi supabase-copytrade-schema.sql terlebih dahulu.' },
                { status: 503 },
            );
        }

        if (error || !topup) {
            return NextResponse.json({ error: 'Order topup tidak ditemukan' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            order: {
                orderId: topup.order_id,
                planId: topup.plan_id,
                credits: Number(topup.credits || 0),
                amountIdr: Number(topup.amount_idr || 0),
                paidAmountIdr: topup.paid_amount_idr !== null ? Number(topup.paid_amount_idr || 0) : null,
                status: topup.status,
                paymentProvider: topup.payment_provider,
                providerReference: topup.provider_reference || null,
                proofSender: topup.proof_sender || null,
                proofChannel: topup.proof_channel || null,
                proofNote: topup.proof_note || null,
                proofImageUrl: topup.proof_image_url || null,
                proofSubmittedAt: topup.proof_submitted_at || null,
                reviewedBy: topup.reviewed_by || null,
                reviewedAt: topup.reviewed_at || null,
                reviewNote: topup.review_note || null,
                qrisImageUrl: topup.qris_image_url || '/qris-payment.jpg',
                expiresAt: topup.expires_at,
                paidAt: topup.paid_at,
                creditedAt: topup.credited_at,
                createdAt: topup.created_at,
            },
        });
    } catch (error) {
        console.error('[CT Topup Status] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
