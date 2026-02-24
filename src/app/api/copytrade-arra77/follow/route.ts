import { NextRequest, NextResponse } from 'next/server';
import { requireCopytrade77SessionProfile } from '@/lib/copytrade77-session';
import { getCopytrade77AdminClient, isCopytrade77Configured } from '@/lib/supabase-copytrade77';
import { CT77_CONFIG } from '@/lib/copytrade77-config';

export const dynamic = 'force-dynamic';

type RiskMode = 'FIXED_LOT' | 'MULTIPLIER' | 'RISK_PERCENT';
type FollowStatus = 'ACTIVE' | 'PAUSED' | 'STOPPED';

function parseRiskMode(rawValue: unknown, fallback: RiskMode): RiskMode {
  const value = String(rawValue || '').trim().toUpperCase();
  if (value === 'MULTIPLIER') return 'MULTIPLIER';
  if (value === 'RISK_PERCENT') return 'RISK_PERCENT';
  if (value === 'FIXED_LOT') return 'FIXED_LOT';
  return fallback;
}

function parsePositiveNumber(rawValue: unknown, fallback: number): number {
  const value = Number(rawValue);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return value;
}

function parseMaxConcurrent(rawValue: unknown, fallback: number, oneTradeAtATime: boolean): number {
  if (oneTradeAtATime) return 1;
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return Math.max(1, Math.floor(fallback));
  return Math.max(1, Math.floor(parsed));
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
    const providerId = String(body?.providerId || '').trim();
    const fixedLot = Number(body?.fixedLot || 0.01);
    const oneTradeAtATime =
      typeof body?.oneTradeAtATime === 'boolean' ? body.oneTradeAtATime : CT77_CONFIG.oneTradeLock;
    const maxConcurrentPositions = parseMaxConcurrent(body?.maxConcurrentPositions, 3, oneTradeAtATime);

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
        max_concurrent_positions: maxConcurrentPositions,
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

export async function PATCH(request: NextRequest) {
  if (!isCopytrade77Configured()) {
    return NextResponse.json(
      { status: 'error', message: 'Copytrade ARRA77 belum dikonfigurasi.' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const followId = String(body?.followId || '').trim();
    if (!followId) {
      return NextResponse.json(
        { status: 'error', message: 'followId wajib diisi.' },
        { status: 400 }
      );
    }

    const { profile } = await requireCopytrade77SessionProfile();
    const supabase = getCopytrade77AdminClient().schema('copytrade77');

    const { data: currentFollow, error: currentError } = await supabase
      .from('follow_relations')
      .select('id,status,risk_mode,fixed_lot,lot_multiplier,risk_percent,one_trade_at_a_time,max_concurrent_positions')
      .eq('id', followId)
      .eq('follower_profile_id', profile.id)
      .maybeSingle();

    if (currentError) throw currentError;
    if (!currentFollow) {
      return NextResponse.json(
        { status: 'error', message: 'Follow relation tidak ditemukan untuk akun ini.' },
        { status: 404 }
      );
    }

    const action = String(body?.action || '').trim().toUpperCase();
    const statusFromBody = String(body?.status || '').trim().toUpperCase();

    let nextStatus = String(currentFollow.status || 'ACTIVE').toUpperCase() as FollowStatus;
    if (action === 'PAUSE') nextStatus = 'PAUSED';
    if (action === 'RESUME') nextStatus = 'ACTIVE';
    if (action === 'STOP') nextStatus = 'STOPPED';
    if (statusFromBody) {
      if (!['ACTIVE', 'PAUSED', 'STOPPED'].includes(statusFromBody)) {
        return NextResponse.json(
          { status: 'error', message: 'status tidak valid.' },
          { status: 400 }
        );
      }
      nextStatus = statusFromBody as FollowStatus;
    }

    const nextRiskMode = parseRiskMode(body?.riskMode, parseRiskMode(currentFollow.risk_mode, 'FIXED_LOT'));
    const nextFixedLot = parsePositiveNumber(body?.fixedLot, Number(currentFollow.fixed_lot || 0.01));
    const nextLotMultiplier = parsePositiveNumber(body?.lotMultiplier, Number(currentFollow.lot_multiplier || 1));
    const nextRiskPercent = parsePositiveNumber(body?.riskPercent, Number(currentFollow.risk_percent || 1));
    const nextOneTradeAtATime =
      typeof body?.oneTradeAtATime === 'boolean'
        ? body.oneTradeAtATime
        : Boolean(currentFollow.one_trade_at_a_time ?? CT77_CONFIG.oneTradeLock);
    const nextMaxConcurrent = parseMaxConcurrent(
      body?.maxConcurrentPositions,
      Number(currentFollow.max_concurrent_positions || 1),
      nextOneTradeAtATime
    );

    const updatePayload = {
      status: nextStatus,
      risk_mode: nextRiskMode,
      fixed_lot: nextFixedLot,
      lot_multiplier: nextLotMultiplier,
      risk_percent: nextRiskPercent,
      one_trade_at_a_time: nextOneTradeAtATime,
      max_concurrent_positions: nextMaxConcurrent,
    };

    const { data: updated, error: updateError } = await supabase
      .from('follow_relations')
      .update(updatePayload)
      .eq('id', followId)
      .eq('follower_profile_id', profile.id)
      .select('id,status,risk_mode,fixed_lot,lot_multiplier,risk_percent,one_trade_at_a_time,max_concurrent_positions,updated_at')
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      status: 'success',
      message: 'Follow settings berhasil diperbarui.',
      follow: {
        id: updated.id,
        status: updated.status,
        riskMode: updated.risk_mode,
        fixedLot: updated.fixed_lot,
        lotMultiplier: updated.lot_multiplier,
        riskPercent: updated.risk_percent,
        oneTradeAtATime: updated.one_trade_at_a_time,
        maxConcurrentPositions: updated.max_concurrent_positions,
        updatedAt: updated.updated_at,
      },
    });
  } catch (error: any) {
    const message = error?.message || 'Failed to update follow settings.';
    const status = message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ status: 'error', message }, { status });
  }
}
