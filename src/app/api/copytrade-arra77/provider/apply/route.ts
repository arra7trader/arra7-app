import { NextRequest, NextResponse } from 'next/server';
import { requireCopytrade77SessionProfile } from '@/lib/copytrade77-session';
import { getCopytrade77AdminClient, isCopytrade77Configured } from '@/lib/supabase-copytrade77';
import { CT77_CONFIG } from '@/lib/copytrade77-config';

export const dynamic = 'force-dynamic';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 50);
}

export async function POST(request: NextRequest) {
  if (!isCopytrade77Configured()) {
    return NextResponse.json(
      { status: 'error', message: 'Copytrade ARRA77 belum dikonfigurasi.' },
      { status: 503 }
    );
  }

  try {
    const { profile } = await requireCopytrade77SessionProfile();
    const body = await request.json();
    const displayName = String(body?.displayName || '').trim();
    const bio = body?.bio ? String(body.bio).trim() : null;
    const riskLevel = body?.riskLevel ? String(body.riskLevel).trim().toUpperCase() : 'MEDIUM';

    if (!displayName) {
      return NextResponse.json(
        { status: 'error', message: 'displayName wajib diisi.' },
        { status: 400 }
      );
    }

    const slugBase = slugify(displayName) || `provider-${Date.now()}`;
    const slug = `${slugBase}-${profile.id.slice(0, 6)}`;
    const supabase = getCopytrade77AdminClient().schema('copytrade77');

    const { data: providerRow, error: providerError } = await supabase.from('providers').upsert(
      {
        profile_id: profile.id,
        display_name: displayName,
        slug,
        bio,
        risk_level: ['LOW', 'MEDIUM', 'HIGH'].includes(riskLevel) ? riskLevel : 'MEDIUM',
        status: 'PENDING',
      },
      { onConflict: 'profile_id' }
    ).select('id').single();

    if (providerError || !providerRow?.id) throw providerError || new Error('PROVIDER_UPSERT_FAILED');
    const providerId = String(providerRow.id);

    const { error: cleanupChallengeTradesError } = await supabase
      .from('provider_challenge_trades')
      .delete()
      .eq('provider_id', providerId);
    if (cleanupChallengeTradesError) throw cleanupChallengeTradesError;

    const { error: challengeError } = await supabase.from('provider_challenges').upsert(
      {
        provider_id: providerId,
        status: 'IN_PROGRESS',
        target_trades: CT77_CONFIG.providerChallengeTargetTrades,
        min_win_rate_pct: CT77_CONFIG.providerChallengeMinWinRatePct,
        total_trades: 0,
        wins: 0,
        losses: 0,
        breakeven_count: 0,
        win_rate_pct: 0,
        started_at: new Date().toISOString(),
        completed_at: null,
        last_trade_at: null,
        notes: null,
      },
      { onConflict: 'provider_id' }
    );
    if (challengeError) throw challengeError;

    return NextResponse.json({
      status: 'success',
      message: `Pengajuan provider diterima. Mulai challenge ${CT77_CONFIG.providerChallengeTargetTrades} trade demo (minimal winrate ${CT77_CONFIG.providerChallengeMinWinRatePct}%).`,
    });
  } catch (error: any) {
    const message =
      error?.code === '42P01'
        ? 'Schema challenge provider belum terpasang. Jalankan SQL update copytrade_arra77_schema.sql.'
        : error?.message || 'Failed to submit provider application.';
    const status = message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ status: 'error', message }, { status });
  }
}
