import { NextRequest, NextResponse } from 'next/server';
import { CT77_CONFIG } from '@/lib/copytrade77-config';
import { getCopytrade77PricingConfig } from '@/lib/copytrade77-pricing';
import { requireCopytrade77SessionProfile } from '@/lib/copytrade77-session';
import { getCopytrade77AdminClient, isCopytrade77Configured } from '@/lib/supabase-copytrade77';

export const dynamic = 'force-dynamic';

function calculateCredits(amountIdr: number, creditRateIdr: number): number {
  return Math.floor(amountIdr / creditRateIdr);
}

function getMinimumTopupIdr(creditRateIdr: number): number {
  return Math.max(CT77_CONFIG.minTopupIdr, creditRateIdr);
}

export async function GET() {
  if (!isCopytrade77Configured()) {
    return NextResponse.json(
      { status: 'error', message: 'Copytrade ARRA77 belum dikonfigurasi.' },
      { status: 503 }
    );
  }

  try {
    const { profile } = await requireCopytrade77SessionProfile();
    const supabase = getCopytrade77AdminClient().schema('copytrade77');
    const pricing = await getCopytrade77PricingConfig();
    const minTopupIdr = getMinimumTopupIdr(pricing.creditRateIdr);

    const { data: orders, error } = await supabase
      .from('topup_orders')
      .select('id,amount_idr,credit_amount,rate_idr_per_credit,payment_channel,status,proof_image_url,proof_note,admin_note,created_at,submitted_at,approved_at')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw error;

    return NextResponse.json({
      status: 'success',
      orders: orders || [],
      pricing: {
        creditRateIdr: pricing.creditRateIdr,
        minTopupIdr,
      },
    });
  } catch (error: any) {
    const message = error?.message || 'Failed to fetch topup history.';
    const status = message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ status: 'error', message }, { status });
  }
}

export async function POST(request: NextRequest) {
  if (!isCopytrade77Configured()) {
    return NextResponse.json(
      { status: 'error', message: 'Copytrade ARRA77 belum dikonfigurasi.' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const amountIdr = Number(body?.amountIdr || 0);
    const proofNote = body?.proofNote ? String(body.proofNote).trim() : null;
    const pricing = await getCopytrade77PricingConfig();
    const minTopupIdr = getMinimumTopupIdr(pricing.creditRateIdr);

    if (!Number.isFinite(amountIdr) || amountIdr < minTopupIdr) {
      return NextResponse.json(
        { status: 'error', message: `Nominal minimal Rp ${minTopupIdr.toLocaleString('id-ID')}.` },
        { status: 400 }
      );
    }

    const creditAmount = calculateCredits(amountIdr, pricing.creditRateIdr);
    if (creditAmount <= 0) {
      return NextResponse.json(
        { status: 'error', message: 'Nominal tidak valid untuk konversi credit.' },
        { status: 400 }
      );
    }

    const { profile } = await requireCopytrade77SessionProfile();
    const supabase = getCopytrade77AdminClient().schema('copytrade77');

    const { data, error } = await supabase
      .from('topup_orders')
      .insert({
        profile_id: profile.id,
        amount_idr: amountIdr,
        credit_amount: creditAmount,
        rate_idr_per_credit: pricing.creditRateIdr,
        payment_channel: 'QRIS_MANUAL',
        status: 'SUBMITTED',
        proof_note: proofNote,
        submitted_at: new Date().toISOString(),
      })
      .select('id,amount_idr,credit_amount,status,created_at')
      .single();

    if (error) throw error;

    return NextResponse.json({
      status: 'success',
      message: 'Topup berhasil dibuat. Silakan konfirmasi pembayaran via Telegram seperti flow pricing.',
      order: data,
    });
  } catch (error: any) {
    const message = error?.message || 'Failed to create topup order.';
    const status = message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ status: 'error', message }, { status });
  }
}
