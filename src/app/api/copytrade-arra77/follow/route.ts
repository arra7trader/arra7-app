import { NextRequest, NextResponse } from 'next/server';
import { requireCopytrade77SessionProfile } from '@/lib/copytrade77-session';
import { getCopytrade77AdminClient, isCopytrade77Configured } from '@/lib/supabase-copytrade77';
import { CT77_CONFIG } from '@/lib/copytrade77-config';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!isCopytrade77Configured()) {
    return NextResponse.json(
      { status: 'error', message: 'Copytrade ARRA77 belum dikonfigurasi.' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const providerId = String(body?.providerId || '').trim();
    const fixedLot = Number(body?.fixedLot || 0.01);
    const oneTradeAtATime = body?.oneTradeAtATime !== false;

    if (!providerId) {
      return NextResponse.json(
        { status: 'error', message: 'providerId wajib diisi.' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(fixedLot) || fixedLot <= 0) {
      return NextResponse.json(
        { status: 'error', message: 'fixedLot tidak valid.' },
        { status: 400 }
      );
    }

    const { profile } = await requireCopytrade77SessionProfile();
    const supabase = getCopytrade77AdminClient().schema('copytrade77');

    const { data: provider, error: providerError } = await supabase
      .from('providers')
      .select('id,status')
      .eq('id', providerId)
      .maybeSingle();

    if (providerError) throw providerError;
    if (!provider || provider.status !== 'APPROVED') {
      return NextResponse.json(
        { status: 'error', message: 'Provider belum tersedia untuk di-follow.' },
        { status: 400 }
      );
    }

    const { error: followError } = await supabase.from('follow_relations').upsert(
      {
        follower_profile_id: profile.id,
        provider_id: providerId,
        status: 'ACTIVE',
        risk_mode: 'FIXED_LOT',
        fixed_lot: fixedLot,
        one_trade_at_a_time: oneTradeAtATime,
        max_concurrent_positions: CT77_CONFIG.oneTradeLock ? 1 : 3,
      },
      { onConflict: 'follower_profile_id,provider_id' }
    );

    if (followError) throw followError;

    return NextResponse.json({
      status: 'success',
      message: 'Provider berhasil di-follow.',
    });
  } catch (error: any) {
    const message = error?.message || 'Failed to follow provider.';
    const status = message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ status: 'error', message }, { status });
  }
}

