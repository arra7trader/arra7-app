import { NextRequest, NextResponse } from 'next/server';
import { CT77_CONFIG } from '@/lib/copytrade77-config';
import { verifyBridgeRequest } from '@/lib/copytrade77-bridge-security';
import { getCopytrade77AdminClient, isCopytrade77Configured } from '@/lib/supabase-copytrade77';

export const dynamic = 'force-dynamic';

type ChallengeStatus = 'IN_PROGRESS' | 'PASSED' | 'FAILED';

function errorJson(code: string, message: string, status = 400) {
  return NextResponse.json({ status: 'error', code, message }, { status });
}

function toNullableNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toSafeIso(value: unknown): string {
  const input = String(value || '').trim();
  if (!input) return new Date().toISOString();
  const parsed = new Date(input);
  if (!Number.isFinite(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

function normalizeResult(rawResult: unknown, pipsResult: number | null, pnlValue: number | null): 'WIN' | 'LOSS' | 'BE' {
  const normalized = String(rawResult || '')
    .trim()
    .toUpperCase();
  if (normalized === 'WIN') return 'WIN';
  if (normalized === 'LOSS') return 'LOSS';
  if (normalized === 'BE' || normalized === 'BREAKEVEN' || normalized === 'BREAK_EVEN') return 'BE';

  const basis = (pnlValue ?? 0) !== 0 ? pnlValue : pipsResult;
  if ((basis ?? 0) > 0) return 'WIN';
  if ((basis ?? 0) < 0) return 'LOSS';
  return 'BE';
}

function countTrades(rows: Array<{ result: string | null }>) {
  const totalTrades = rows.length;
  const wins = rows.filter((row) => String(row.result || '').toUpperCase() === 'WIN').length;
  const losses = rows.filter((row) => String(row.result || '').toUpperCase() === 'LOSS').length;
  const breakevenCount = rows.filter((row) => String(row.result || '').toUpperCase() === 'BE').length;
  const winRatePct = totalTrades > 0 ? Number(((wins / totalTrades) * 100).toFixed(2)) : 0;
  return { totalTrades, wins, losses, breakevenCount, winRatePct };
}

export async function POST(request: NextRequest) {
  if (!isCopytrade77Configured()) {
    return errorJson('NOT_CONFIGURED', 'Copytrade ARRA77 belum dikonfigurasi.', 503);
  }

  try {
    const rawBody = await request.text();
    const body = rawBody ? JSON.parse(rawBody) : {};
    const auth = await verifyBridgeRequest(request, rawBody);
    const supabase = getCopytrade77AdminClient().schema('copytrade77');

    const externalTradeId = String(
      body?.externalTradeId ?? body?.tradeId ?? body?.ticket ?? body?.positionTicket ?? ''
    ).trim();
    if (!externalTradeId) {
      return errorJson('INVALID_PAYLOAD', 'externalTradeId/tradeId/ticket wajib diisi.', 400);
    }

    const symbol = String(body?.symbol || 'XAUUSD')
      .trim()
      .toUpperCase();
    const sideRaw = String(body?.side || '')
      .trim()
      .toUpperCase();
    const side = sideRaw === 'BUY' || sideRaw === 'SELL' ? sideRaw : null;
    const volumeLots = toNullableNumber(body?.volumeLots ?? body?.volume);
    const entryPrice = toNullableNumber(body?.entryPrice ?? body?.openPrice);
    const closePrice = toNullableNumber(body?.closePrice);
    const pipsResult = toNullableNumber(body?.pipsResult ?? body?.pips);
    const pnlValue = toNullableNumber(body?.pnlValue ?? body?.profit);
    const openedAt = body?.openedAt ? toSafeIso(body.openedAt) : null;
    const closedAt = toSafeIso(body?.closedAt);
    const result = normalizeResult(body?.result, pipsResult, pnlValue);

    const { data: provider, error: providerError } = await supabase
      .from('providers')
      .select('id,status,display_name')
      .eq('profile_id', auth.profileId)
      .maybeSingle();
    if (providerError) throw providerError;
    if (!provider?.id) {
      return errorJson('PROVIDER_NOT_FOUND', 'Provider belum terdaftar untuk profile terminal ini.', 404);
    }

    const providerId = String(provider.id);
    const providerStatus = String(provider.status || '').toUpperCase();
    if (providerStatus !== 'PENDING') {
      return NextResponse.json({
        status: 'ok',
        skipped: 'PROVIDER_NOT_PENDING',
        providerStatus,
        providerId,
      });
    }

    let challengeId = '';
    let challengeTargetTrades = Math.max(1, Number(CT77_CONFIG.providerChallengeTargetTrades || 50));
    let challengeMinWinRate = Number(CT77_CONFIG.providerChallengeMinWinRatePct || 60);

    const { data: existingChallenge, error: existingChallengeError } = await supabase
      .from('provider_challenges')
      .select('id,status,target_trades,min_win_rate_pct')
      .eq('provider_id', providerId)
      .maybeSingle();
    if (existingChallengeError) throw existingChallengeError;

    if (!existingChallenge?.id) {
      const { data: createdChallenge, error: createChallengeError } = await supabase
        .from('provider_challenges')
        .insert({
          provider_id: providerId,
          status: 'IN_PROGRESS',
          target_trades: challengeTargetTrades,
          min_win_rate_pct: challengeMinWinRate,
        })
        .select('id,status,target_trades,min_win_rate_pct')
        .single();
      if (createChallengeError || !createdChallenge?.id) {
        throw createChallengeError || new Error('CHALLENGE_CREATE_FAILED');
      }
      challengeId = String(createdChallenge.id);
      challengeTargetTrades = Number(createdChallenge.target_trades || challengeTargetTrades);
      challengeMinWinRate = Number(createdChallenge.min_win_rate_pct || challengeMinWinRate);
    } else {
      challengeId = String(existingChallenge.id);
      challengeTargetTrades = Number(existingChallenge.target_trades || challengeTargetTrades);
      challengeMinWinRate = Number(existingChallenge.min_win_rate_pct || challengeMinWinRate);
      if (String(existingChallenge.status || '').toUpperCase() !== 'IN_PROGRESS') {
        return NextResponse.json({
          status: 'ok',
          skipped: 'CHALLENGE_COMPLETED',
          providerId,
          challenge: {
            id: challengeId,
            status: existingChallenge.status,
            targetTrades: challengeTargetTrades,
            minWinRatePct: challengeMinWinRate,
          },
        });
      }
    }

    const { error: tradeUpsertError } = await supabase
      .from('provider_challenge_trades')
      .upsert(
        {
          challenge_id: challengeId,
          provider_id: providerId,
          terminal_id: auth.terminalId,
          external_trade_id: externalTradeId,
          symbol,
          side,
          volume_lots: volumeLots,
          entry_price: entryPrice,
          close_price: closePrice,
          opened_at: openedAt,
          closed_at: closedAt,
          pips_result: pipsResult,
          pnl_value: pnlValue,
          result,
          raw_payload: body || {},
        },
        { onConflict: 'provider_id,external_trade_id' }
      );
    if (tradeUpsertError) throw tradeUpsertError;

    const { data: tradeRows, error: tradeRowsError } = await supabase
      .from('provider_challenge_trades')
      .select('result')
      .eq('provider_id', providerId);
    if (tradeRowsError) throw tradeRowsError;

    const totals = countTrades((tradeRows || []) as Array<{ result: string | null }>);
    const isCompleted = totals.totalTrades >= challengeTargetTrades;
    const isPassed = isCompleted && totals.winRatePct >= challengeMinWinRate;
    const challengeStatus: ChallengeStatus = isCompleted ? (isPassed ? 'PASSED' : 'FAILED') : 'IN_PROGRESS';
    const completedAt = isCompleted ? new Date().toISOString() : null;

    const { error: challengeUpdateError } = await supabase
      .from('provider_challenges')
      .update({
        status: challengeStatus,
        target_trades: challengeTargetTrades,
        min_win_rate_pct: challengeMinWinRate,
        total_trades: totals.totalTrades,
        wins: totals.wins,
        losses: totals.losses,
        breakeven_count: totals.breakevenCount,
        win_rate_pct: totals.winRatePct,
        last_trade_at: closedAt,
        completed_at: completedAt,
        notes: isCompleted
          ? isPassed
            ? 'Auto-approved: challenge passed.'
            : 'Auto-rejected: challenge failed.'
          : null,
      })
      .eq('id', challengeId);
    if (challengeUpdateError) throw challengeUpdateError;

    let nextProviderStatus = providerStatus;
    if (isCompleted) {
      nextProviderStatus = isPassed ? 'APPROVED' : 'REJECTED';
      const providerUpdatePayload: Record<string, unknown> = isPassed
        ? {
            status: 'APPROVED',
            approved_at: new Date().toISOString(),
            approved_by_profile_id: null,
          }
        : {
            status: 'REJECTED',
            approved_at: null,
            approved_by_profile_id: null,
          };

      const { error: providerUpdateError } = await supabase
        .from('providers')
        .update(providerUpdatePayload)
        .eq('id', providerId)
        .eq('status', 'PENDING');
      if (providerUpdateError) throw providerUpdateError;
    }

    return NextResponse.json({
      status: 'ok',
      providerId,
      providerStatus: nextProviderStatus,
      challenge: {
        id: challengeId,
        status: challengeStatus,
        targetTrades: challengeTargetTrades,
        minWinRatePct: challengeMinWinRate,
        totalTrades: totals.totalTrades,
        wins: totals.wins,
        losses: totals.losses,
        breakevenCount: totals.breakevenCount,
        winRatePct: totals.winRatePct,
      },
    });
  } catch (error: any) {
    const message = error?.message || 'Challenge trade ingestion failed';
    if (error?.code === '42P01') {
      return errorJson('SCHEMA_NOT_READY', 'Schema provider challenge belum terpasang di database.', 500);
    }
    if (
      [
        'MISSING_X_ARRA_KEY',
        'MISSING_X_ARRA_TS',
        'MISSING_X_ARRA_NONCE',
        'MISSING_X_ARRA_SIGN',
        'INVALID_TIMESTAMP',
        'TIMESTAMP_SKEW',
        'INVALID_SIGNATURE',
        'TERMINAL_NOT_FOUND',
        'REPLAY_BLOCKED',
      ].includes(message)
    ) {
      return errorJson(message, message, 401);
    }
    if (message.startsWith('Unexpected token')) {
      return errorJson('INVALID_PAYLOAD', 'Invalid JSON payload', 400);
    }
    return errorJson('INTERNAL_ERROR', message, 500);
  }
}
