import { NextRequest, NextResponse } from 'next/server';
import { requireCopytrade77Admin } from '@/lib/copytrade77-admin';
import { CT77_CONFIG } from '@/lib/copytrade77-config';
import { getOrCreateSystemProviderId, normalizeTradeSignal } from '@/lib/copytrade77-signal-engine';
import { FOREX_PAIRS, ForexPair, getMarketData, Timeframe, TIMEFRAMES } from '@/lib/market-data';
import { getCopytrade77AdminClient, isCopytrade77Configured } from '@/lib/supabase-copytrade77';

export const dynamic = 'force-dynamic';

type Side = 'BUY' | 'SELL';

type DispatchTarget = {
  terminalId: string;
  followId: string;
  terminalLabel: string | null;
};

function normalizeSymbol(input: string): string {
  return String(input || 'XAUUSD').trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || 'XAUUSD';
}

function normalizeTimeframe(input: string | null | undefined): string {
  const raw = String(input || 'M15').trim().toUpperCase().replace('PERIOD_', '');
  if (['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'].includes(raw)) return raw;
  return 'M15';
}

function timeframeToAiKey(input: string): Timeframe {
  const raw = normalizeTimeframe(input);
  const map: Record<string, Timeframe> = {
    M1: '1m',
    M5: '5m',
    M15: '15m',
    M30: '30m',
    H1: '1h',
    H4: '4h',
    D1: '1d',
  };
  return map[raw] || '15m';
}

function fallbackPrice(symbol: string): number {
  const s = normalizeSymbol(symbol);
  if (s.includes('XAU')) return 3000;
  if (s.includes('XAG')) return 35;
  if (s.endsWith('JPY')) return 150;
  return 1.1;
}

function getPipSize(symbol: string): number {
  const s = normalizeSymbol(symbol);
  if (s.includes('XAU') || s.includes('XAG') || s.includes('XPT') || s.includes('XPD')) return 0.1;
  if (s.endsWith('JPY')) return 0.01;
  return 0.0001;
}

async function getEntryPrice(params: {
  symbol: string;
  timeframe: string;
  providerId: string;
}): Promise<number> {
  const { symbol, timeframe, providerId } = params;
  const supabase = getCopytrade77AdminClient().schema('copytrade77');

  const pair = symbol as ForexPair;
  const tf = timeframeToAiKey(timeframe);
  if (pair in FOREX_PAIRS && tf in TIMEFRAMES) {
    try {
      const marketData = await getMarketData(pair, tf);
      const px = Number(marketData?.current_price || 0);
      if (!marketData.is_simulated && Number.isFinite(px) && px > 0) return px;
    } catch {
      // fallback handled below
    }
  }

  const recentRes = await supabase
    .from('signals')
    .select('entry_price')
    .eq('provider_id', providerId)
    .eq('symbol', symbol)
    .eq('timeframe', timeframe)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!recentRes.error && recentRes.data?.entry_price != null) {
    const px = Number(recentRes.data.entry_price);
    if (Number.isFinite(px) && px > 0) return px;
  }

  return fallbackPrice(symbol);
}

async function resolveTargets(params: {
  providerId: string;
  terminalId?: string;
}): Promise<{ targets: DispatchTarget[]; reason?: string }> {
  const { providerId, terminalId } = params;
  const supabase = getCopytrade77AdminClient().schema('copytrade77');

  async function ensureActiveFollowForProfile(profileId: string, targetProviderId: string): Promise<string> {
    const upsertRes = await supabase
      .from('follow_relations')
      .upsert(
        {
          follower_profile_id: profileId,
          provider_id: targetProviderId,
          status: 'ACTIVE',
          risk_mode: 'FIXED_LOT',
          fixed_lot: 0.01,
          one_trade_at_a_time: CT77_CONFIG.oneTradeLock,
          max_concurrent_positions: CT77_CONFIG.oneTradeLock ? 1 : 3,
        },
        { onConflict: 'follower_profile_id,provider_id' }
      )
      .select('id')
      .single();
    if (upsertRes.error || !upsertRes.data?.id) {
      throw upsertRes.error || new Error('FOLLOW_UPSERT_FAILED');
    }
    return String(upsertRes.data.id);
  }

  if (terminalId) {
    const terminalRes = await supabase
      .from('bridge_terminals')
      .select('id,terminal_label,profile_id,follow_id,status')
      .eq('id', terminalId)
      .maybeSingle();
    if (terminalRes.error) throw terminalRes.error;
    if (!terminalRes.data) return { targets: [], reason: 'TERMINAL_NOT_FOUND' };
    if (String(terminalRes.data.status || '').toUpperCase() === 'BLOCKED') return { targets: [], reason: 'TERMINAL_BLOCKED' };

    const profileId = String(terminalRes.data.profile_id || '');
    if (!profileId) return { targets: [], reason: 'TERMINAL_PROFILE_MISSING' };

    let resolvedFollowId = terminalRes.data.follow_id ? String(terminalRes.data.follow_id) : '';
    if (resolvedFollowId) {
      const followRes = await supabase
        .from('follow_relations')
        .select('id,provider_id,status')
        .eq('id', resolvedFollowId)
        .maybeSingle();
      if (followRes.error) throw followRes.error;

      const providerMismatch = !followRes.data || String(followRes.data.provider_id || '') !== providerId;
      const notActive = !!followRes.data && String(followRes.data.status || '') !== 'ACTIVE';

      if (providerMismatch || notActive) {
        resolvedFollowId = await ensureActiveFollowForProfile(profileId, providerId);
      }
    } else {
      resolvedFollowId = await ensureActiveFollowForProfile(profileId, providerId);
    }

    const bindRes = await supabase
      .from('bridge_terminals')
      .update({ follow_id: resolvedFollowId })
      .eq('id', String(terminalRes.data.id))
      .select('id')
      .single();
    if (bindRes.error) throw bindRes.error;

    return {
      targets: [
        {
          terminalId: String(terminalRes.data.id),
          followId: resolvedFollowId,
          terminalLabel: terminalRes.data.terminal_label ? String(terminalRes.data.terminal_label) : null,
        },
      ],
    };
  }

  const followRes = await supabase
    .from('follow_relations')
    .select('id')
    .eq('provider_id', providerId)
    .eq('status', 'ACTIVE');
  if (followRes.error) throw followRes.error;
  const followIds = (followRes.data || []).map((row) => String((row as { id: string }).id));
  if (followIds.length === 0) return { targets: [], reason: 'NO_ACTIVE_FOLLOW' };

  const terminalsRes = await supabase
    .from('bridge_terminals')
    .select('id,terminal_label,follow_id,status')
    .in('follow_id', followIds)
    .neq('status', 'BLOCKED')
    .limit(200);
  if (terminalsRes.error) throw terminalsRes.error;

  const targets = (terminalsRes.data || [])
    .filter((row) => row.follow_id)
    .map((row) => ({
      terminalId: String(row.id),
      followId: String(row.follow_id),
      terminalLabel: row.terminal_label ? String(row.terminal_label) : null,
    }));

  return { targets, reason: targets.length === 0 ? 'NO_TERMINAL_FOR_PROVIDER' : undefined };
}

export async function POST(request: NextRequest) {
  if (!isCopytrade77Configured()) {
    return NextResponse.json(
      { status: 'error', message: 'Copytrade ARRA77 belum dikonfigurasi.' },
      { status: 503 }
    );
  }

  try {
    const { adminProfileId } = await requireCopytrade77Admin();
    const supabase = getCopytrade77AdminClient().schema('copytrade77');
    const body = await request.json().catch(() => ({}));

    const side: Side = String(body?.side || 'BUY').toUpperCase() === 'SELL' ? 'SELL' : 'BUY';
    const terminalId = body?.terminalId ? String(body.terminalId).trim() : '';
    const requestedProviderId = body?.providerId ? String(body.providerId).trim() : '';
    const symbolFromBody = body?.symbol ? normalizeSymbol(String(body.symbol)) : '';
    const timeframeFromBody = body?.timeframe ? normalizeTimeframe(String(body.timeframe)) : '';

    let providerId = requestedProviderId;
    if (!providerId && terminalId) {
      const terminalFollowRes = await supabase
        .from('bridge_terminals')
        .select('follow_id')
        .eq('id', terminalId)
        .maybeSingle();
      if (terminalFollowRes.error) throw terminalFollowRes.error;
      if (terminalFollowRes.data?.follow_id) {
        const followRes = await supabase
          .from('follow_relations')
          .select('provider_id')
          .eq('id', String(terminalFollowRes.data.follow_id))
          .maybeSingle();
        if (followRes.error) throw followRes.error;
        if (followRes.data?.provider_id) providerId = String(followRes.data.provider_id);
      }
    }

    if (!providerId) {
      providerId = await getOrCreateSystemProviderId();
    }

    const symbol = symbolFromBody || normalizeSymbol(CT77_CONFIG.autoAnalyzeSymbol || 'XAUUSD');
    const timeframe = timeframeFromBody || normalizeTimeframe(CT77_CONFIG.autoAnalyzeTimeframe || 'M15');
    const entryPrice = await getEntryPrice({ symbol, timeframe, providerId });
    const pipSize = getPipSize(symbol);
    const riskDistance = Math.max(CT77_CONFIG.minSlPips, 70) * pipSize;
    const rewardDistance = riskDistance * 1.8;

    const normalized = normalizeTradeSignal({
      symbol,
      timeframe,
      side,
      orderType: 'MARKET',
      entryPrice,
      stopLoss: side === 'BUY' ? entryPrice - riskDistance : entryPrice + riskDistance,
      takeProfit1: side === 'BUY' ? entryPrice + rewardDistance : entryPrice - rewardDistance,
      takeProfit2: side === 'BUY' ? entryPrice + rewardDistance * 1.35 : entryPrice - rewardDistance * 1.35,
      takeProfit3: side === 'BUY' ? entryPrice + rewardDistance * 1.8 : entryPrice - rewardDistance * 1.8,
      confidence: 88,
    });

    const targetResult = await resolveTargets({ providerId, terminalId: terminalId || undefined });
    if (targetResult.targets.length === 0) {
      return NextResponse.json(
        {
          status: 'error',
          message: `Target dispatch tidak ditemukan. Reason: ${targetResult.reason || 'UNKNOWN'}.`,
          providerId,
        },
        { status: 409 }
      );
    }

    const signalRes = await supabase
      .from('signals')
      .insert({
        provider_id: providerId,
        source: 'ADMIN_MANUAL',
        source_ref: terminalId ? 'admin_force_test_terminal' : 'admin_force_test_broadcast',
        symbol: normalized.symbol,
        timeframe: normalized.timeframe,
        side: normalized.side,
        order_type: normalized.orderType,
        entry_price: normalized.entryPrice,
        stop_loss: normalized.stopLoss,
        take_profit_1: normalized.takeProfit1,
        take_profit_2: normalized.takeProfit2 ?? null,
        take_profit_3: normalized.takeProfit3 ?? null,
        min_stop_distance_pips: CT77_CONFIG.minSlPips,
        confidence: normalized.confidence ?? null,
        raw_analysis: {
          forced_test_signal: true,
          requested_by: adminProfileId,
          requested_at: new Date().toISOString(),
          target_terminal_id: terminalId || null,
          note: 'Manual forced test signal from admin panel',
        },
        status: 'PUBLISHED',
        valid_from: new Date().toISOString(),
        valid_until: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
        created_by_profile_id: adminProfileId,
      })
      .select('id')
      .single();

    if (signalRes.error || !signalRes.data?.id) {
      throw signalRes.error || new Error('SIGNAL_INSERT_FAILED');
    }

    const signalId = String(signalRes.data.id);

    const dispatchRows = targetResult.targets.map((target) => ({
      signal_id: signalId,
      follow_id: target.followId,
      terminal_id: target.terminalId,
      status: 'QUEUED',
      requested_at: new Date().toISOString(),
    }));

    const dispatchRes = await supabase.from('signal_dispatches').insert(dispatchRows).select('id,terminal_id');
    if (dispatchRes.error) throw dispatchRes.error;

    return NextResponse.json({
      status: 'success',
      message: `Force test signal ${side} berhasil di-queue ke ${dispatchRows.length} terminal.`,
      signalId,
      providerId,
      queuedDispatches: dispatchRows.length,
      dispatches: dispatchRes.data || [],
      targets: targetResult.targets,
    });
  } catch (error: any) {
    const message = error?.message || 'Failed to force test signal.';
    const status = message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ status: 'error', message }, { status });
  }
}
