import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { copytradeSupabase } from '@/lib/supabase-copytrade';

function normalizeUrl(value: unknown) {
    const text = String(value || '').trim();
    if (!text) return null;
    if (!/^https?:\/\//i.test(text)) return null;
    return text;
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const email = session?.user?.email?.toLowerCase() || '';
        if (!email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const orderId = String(body?.orderId || '').trim();
        if (!orderId) {
            return NextResponse.json({ error: 'orderId wajib diisi' }, { status: 400 });
        }

        const providerReference = String(body?.providerReference || '').trim();
        const proofSender = String(body?.proofSender || '').trim();
        const proofChannel = String(body?.proofChannel || '').trim();
        const proofNote = String(body?.proofNote || '').trim();
        const proofImageUrl = normalizeUrl(body?.proofImageUrl);
        const paidAmountRaw = Number(body?.paidAmountIdr);
        const paidAmountIdr = Number.isFinite(paidAmountRaw) && paidAmountRaw > 0 ? Math.round(paidAmountRaw) : null;

        if (!providerReference && !proofNote && !proofImageUrl) {
            return NextResponse.json(
                { error: 'Isi minimal salah satu: reference transaksi, catatan, atau link bukti gambar' },
                { status: 400 },
            );
        }

        const { data: topup, error: topupError } = await copytradeSupabase
            .from('ct_topups')
            .select('id, status, expires_at, order_id')
            .eq('order_id', orderId)
            .eq('email', email)
            .single();

        if (topupError?.code === '42P01') {
            return NextResponse.json(
                { error: 'Tabel ct_topups belum tersedia. Jalankan migrasi supabase-copytrade-schema.sql terlebih dahulu.' },
                { status: 503 },
            );
        }
        if (topupError || !topup) {
            return NextResponse.json({ error: 'Order topup tidak ditemukan' }, { status: 404 });
        }

        if (String(topup.status) === 'credited') {
            return NextResponse.json({ success: true, status: 'credited', message: 'Order sudah dikreditkan.' });
        }
        if (String(topup.status) === 'expired') {
            return NextResponse.json({ error: 'Order sudah expired. Buat order baru.' }, { status: 400 });
        }

        const expiresAt = topup.expires_at ? Date.parse(String(topup.expires_at)) : null;
        const now = new Date().toISOString();
        if (expiresAt && Number.isFinite(expiresAt) && Date.now() > expiresAt) {
            await copytradeSupabase.from('ct_topups').update({ status: 'expired' }).eq('id', topup.id);
            return NextResponse.json({ error: 'Order sudah expired. Buat order baru.' }, { status: 400 });
        }

        const { error: updateError } = await copytradeSupabase
            .from('ct_topups')
            .update({
                status: 'paid',
                provider_reference: providerReference || null,
                paid_amount_idr: paidAmountIdr,
                proof_sender: proofSender || null,
                proof_channel: proofChannel || null,
                proof_note: proofNote || null,
                proof_image_url: proofImageUrl,
                proof_submitted_at: now,
                paid_at: now,
                reviewed_by: null,
                reviewed_at: null,
                review_note: null,
            })
            .eq('id', topup.id);

        if (updateError) {
            if (/column .* does not exist/i.test(updateError.message || '')) {
                return NextResponse.json(
                    { error: 'Schema topup belum update. Jalankan ulang SQL setup terbaru.' },
                    { status: 503 },
                );
            }
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            status: 'paid',
            message: 'Bukti pembayaran terkirim. Tim admin akan verifikasi manual.',
        });
    } catch (error) {
        console.error('[CT Topup Submit] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
