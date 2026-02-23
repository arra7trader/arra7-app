import { NextRequest, NextResponse } from 'next/server';
import { CT77_CONFIG } from '@/lib/copytrade77-config';
import { verifyBridgeRequest } from '@/lib/copytrade77-bridge-security';
import { getCopytrade77AdminClient, isCopytrade77Configured } from '@/lib/supabase-copytrade77';
import { generateAndQueueSignalForTerminal } from '@/lib/copytrade77-signal-engine';

export const dynamic = 'force-dynamic';

const DISPATCH_SELECT = `
  id,
  signal_id,
  follow_id,
  terminal_id,
  status,
  requested_at,
  signals!signal_dispatches_signal_id_fkey (
    id,
    provider_id,
    symbol,
    timeframe,
    side,
    order_type,
    entry_price,
    stop_loss,
    take_profit_1,
    take_profit_2,
    take_profit_3,
    valid_until
  )
`;

function errorJson(code: string, message: string, status = 400) {
  return NextResponse.json({ status: 'error', code, message }, { status });
}

type DispatchRow = {
  id: string;
  follow_id: string;
  signals: {
    id: string;
    provider_id: string;
    symbol: string;
    timeframe: string;
    side: 'BUY' | 'SELL';
    order_type: 'MARKET' | 'BUY_LIMIT' | 'SELL_LIMIT' | 'BUY_STOP' | 'SELL_STOP';
    entry_price: number;
    stop_loss: number;
    take_profit_1: number;
    take_profit_2: number | null;
    take_profit_3: number | null;
    valid_until: string | null;
  } | null;
};

type FollowRow = {
  id: string;
  status: string;
  follower_profile_id: string;
  one_trade_at_a_time: boolean;
  max_concurrent_positions: number;
};

type RawSignalRow = {
  id: unknown;
  provider_id: unknown;
  symbol: unknown;
  timeframe: unknown;
  side: unknown;
  order_type: unknown;
  entry_price: unknown;
  stop_loss: unknown;
  take_profit_1: unknown;
  take_profit_2: unknown;
  take_profit_3: unknown;
  valid_until: unknown;
};

type RawDispatchRow = {
  id: unknown;
  follow_id: unknown;
  signals: RawSignalRow | RawSignalRow[] | null;
};

type CopytradeSchemaClient = ReturnType<ReturnType<typeof getCopytrade77AdminClient>['schema']>;

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}

async function markDispatchExpired(supabase: CopytradeSchemaClient, dispatchId: string, message: string) {
  await supabase
    .from('signal_dispatches')
    .update({
      status: 'EXPIRED',
      error_message: message,
    })
    .eq('id', dispatchId)
    .eq('status', 'QUEUED');
}

async function markDispatchSkipped(
  supabase: CopytradeSchemaClient,
  dispatchId: string,
  skipReason: string,
  message: string
) {
  await supabase
    .from('signal_dispatches')
    .update({
      status: 'SKIPPED',
      skip_reason: skipReason,
      error_message: message,
    })
    .eq('id', dispatchId)
    .eq('status', 'QUEUED');
}

function isExpired(validUntil: string | null | undefined): boolean {
  if (!validUntil) return false;
  const dt = new Date(validUntil);
  return Number.isFinite(dt.getTime()) && dt.getTime() < Date.now();
}

async function getQueuedDispatches(supabase: CopytradeSchemaClient, terminalId: string): Promise<DispatchRow[]> {
  const { data, error } = await supabase
    .from('signal_dispatches')
    .select(DISPATCH_SELECT)
    .eq('terminal_id', terminalId)
    .eq('status', 'QUEUED')
    .order('requested_at', { ascending: true })
    .limit(20);

  if (error) throw error;
  return (data || []).map((row) => {
    const typedRow = row as RawDispatchRow;
    const signalRaw = Array.isArray(typedRow.signals) ? typedRow.signals[0] || null : typedRow.signals || null;
    return {
      id: String(typedRow.id),
      follow_id: String(typedRow.follow_id),
      signals: signalRaw
        ? {
            id: String(signalRaw.id),
            provider_id: String(signalRaw.provider_id),
            symbol: String(signalRaw.symbol),
            timeframe: String(signalRaw.timeframe),
            side: String(signalRaw.side).toUpperCase() === 'BUY' ? 'BUY' : 'SELL',
            order_type: String(signalRaw.order_type || 'MARKET').toUpperCase(),
            entry_price: Number(signalRaw.entry_price),
            stop_loss: Number(signalRaw.stop_loss),
            take_profit_1: Number(signalRaw.take_profit_1),
            take_profit_2: signalRaw.take_profit_2 != null ? Number(signalRaw.take_profit_2) : null,
            take_profit_3: signalRaw.take_profit_3 != null ? Number(signalRaw.take_profit_3) : null,
            valid_until: signalRaw.valid_until ? String(signalRaw.valid_until) : null,
          }
        : null,
    } as DispatchRow;
  });
}

async function getFollowMap(supabase: CopytradeSchemaClient, followIds: string[]): Promise<Map<string, FollowRow>> {
  if (followIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('follow_relations')
    .select('id,status,follower_profile_id,one_trade_at_a_time,max_concurrent_positions')
    .in('id', followIds);

  if (error) throw error;
  return new Map((data || []).map((row) => [String((row as FollowRow).id), row as FollowRow]));
}

async function getWalletMap(
  supabase: CopytradeSchemaClient,
  followerProfileIds: string[]
): Promise<Map<string, number>> {
  if (followerProfileIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('wallets')
    .select('profile_id,balance_credits')
    .in('profile_id', followerProfileIds);

  if (error) throw error;
  return new Map(
    (data || []).map((row) => {
      const typed = row as { profile_id: string; balance_credits: number };
      return [String(typed.profile_id), Number(typed.balance_credits || 0)];
    })
  );
}

async function getOpenPositionCountMap(
  supabase: CopytradeSchemaClient,
  followerProfileIds: string[]
): Promise<Map<string, number>> {
  if (followerProfileIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('positions')
    .select('follower_profile_id')
    .in('follower_profile_id', followerProfileIds)
    .eq('status', 'OPEN')
    .limit(500);

  if (error) throw error;

  const map = new Map<string, number>();
  for (const row of data || []) {
    const profileId = String((row as { follower_profile_id: string }).follower_profile_id);
    map.set(profileId, (map.get(profileId) || 0) + 1);
  }
  return map;
}

async function pickExecutableDispatch(supabase: CopytradeSchemaClient, terminalId: string): Promise<{
  dispatchRow: DispatchRow | null;
  followRow: FollowRow | null;
  holdReason: string | null;
}> {
  const queuedDispatches = await getQueuedDispatches(supabase, terminalId);
  if (queuedDispatches.length === 0) {
    return { dispatchRow: null, followRow: null, holdReason: null };
  }

  const followIds = Array.from(
    new Set(
      queuedDispatches
        .map((row) => String(row.follow_id || ''))
        .filter(Boolean)
    )
  );
  const followMap = await getFollowMap(supabase, followIds);

  const followerProfileIds = Array.from(
    new Set(
      Array.from(followMap.values())
        .map((follow) => String(follow.follower_profile_id || ''))
        .filter(Boolean)
    )
  );
  const walletMap = await getWalletMap(supabase, followerProfileIds);
  const openCountMap = await getOpenPositionCountMap(supabase, followerProfileIds);

  for (const dispatch of queuedDispatches) {
    const signal = dispatch.signals;
    if (!signal) {
      await markDispatchSkipped(supabase, dispatch.id, 'SIGNAL_NOT_FOUND', 'Signal payload missing.');
      continue;
    }

    if (isExpired(signal.valid_until)) {
      await markDispatchExpired(supabase, dispatch.id, 'Signal expired before dispatch.');
      continue;
    }

    const follow = followMap.get(String(dispatch.follow_id));
    if (!follow || String(follow.status || '') !== 'ACTIVE') {
      await markDispatchSkipped(supabase, dispatch.id, 'FOLLOW_NOT_ACTIVE', 'Follow relation not active.');
      continue;
    }

    const followerProfileId = String(follow.follower_profile_id || '');
    if (!followerProfileId) {
      await markDispatchSkipped(
        supabase,
        dispatch.id,
        'FOLLOWER_PROFILE_MISSING',
        'Follower profile is missing on follow relation.'
      );
      continue;
    }

    const balanceCredits = walletMap.get(followerProfileId) || 0;
    if (balanceCredits < CT77_CONFIG.signalCostCredits) {
      return { dispatchRow: null, followRow: follow, holdReason: 'INSUFFICIENT_CREDITS' };
    }

    const openPositions = openCountMap.get(followerProfileId) || 0;
    const oneTradeAtATime = Boolean(follow.one_trade_at_a_time ?? true);
    const maxConcurrentPositions = Math.max(1, Number(follow.max_concurrent_positions ?? 1));
    if (oneTradeAtATime && openPositions > 0) {
      return { dispatchRow: null, followRow: follow, holdReason: 'ONE_TRADE_LOCK_ACTIVE' };
    }
    if (!oneTradeAtATime && openPositions >= maxConcurrentPositions) {
      return { dispatchRow: null, followRow: follow, holdReason: 'MAX_CONCURRENT_POSITIONS_REACHED' };
    }

    return { dispatchRow: dispatch, followRow: follow, holdReason: null };
  }

  return { dispatchRow: null, followRow: null, holdReason: null };
}

export async function GET(request: NextRequest) {
  if (!isCopytrade77Configured()) {
    return errorJson('NOT_CONFIGURED', 'Copytrade ARRA77 belum dikonfigurasi.', 503);
  }

  try {
    const auth = await verifyBridgeRequest(request, '');
    const supabase = getCopytrade77AdminClient().schema('copytrade77');

    await supabase
      .from('bridge_terminals')
      .update({
        status: 'ONLINE',
        last_heartbeat_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('id', auth.terminalId);

    let generation: {
      generated: boolean;
      reason: string;
      signalId?: string;
    } | null = null;

    let selected = await pickExecutableDispatch(supabase, auth.terminalId);

    if (!selected.dispatchRow && !selected.holdReason) {
      generation = await generateAndQueueSignalForTerminal(auth.terminalId);
      selected = await pickExecutableDispatch(supabase, auth.terminalId);
    }

    if (!selected.dispatchRow) {
      const fallbackReason = selected.holdReason || generation?.reason || 'NO_SIGNAL_AVAILABLE';
      return NextResponse.json({
        status: 'ok',
        hasSignal: false,
        reason: fallbackReason,
        generation,
      });
    }

    const follow = selected.followRow;
    const signal = selected.dispatchRow.signals;
    if (!signal) {
      return NextResponse.json({ status: 'ok', hasSignal: false });
    }

    await supabase
      .from('signal_dispatches')
      .update({
        status: 'SENT',
        sent_at: new Date().toISOString(),
      })
      .eq('id', selected.dispatchRow.id)
      .eq('status', 'QUEUED');

    return NextResponse.json({
      status: 'ok',
      hasSignal: true,
      dispatch: {
        dispatchId: selected.dispatchRow.id,
        signalId: signal.id,
        providerId: signal.provider_id,
        symbol: signal.symbol,
        timeframe: signal.timeframe,
        side: signal.side,
        orderType: signal.order_type,
        entryPrice: signal.entry_price,
        stopLoss: signal.stop_loss,
        takeProfit1: signal.take_profit_1,
        takeProfit2: signal.take_profit_2,
        takeProfit3: signal.take_profit_3,
        expiresAt: signal.valid_until,
        creditCost: CT77_CONFIG.signalCostCredits,
        risk: {
          oneTradeAtATime: Boolean(follow?.one_trade_at_a_time ?? true),
          maxConcurrentPositions: Number(follow?.max_concurrent_positions ?? 1),
        },
      },
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error, 'Signal polling failed');
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
    return errorJson('INTERNAL_ERROR', message, 500);
  }
}
