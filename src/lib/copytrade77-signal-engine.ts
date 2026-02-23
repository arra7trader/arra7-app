import { analyzeWithGroq } from '@/lib/groq-ai';
import {
  FOREX_PAIRS,
  ForexPair,
  formatMarketDataForAI,
  getMarketData,
  Timeframe,
  TIMEFRAMES,
} from '@/lib/market-data';
import { parseSignalFromAnalysis } from '@/lib/signal-tracker';
import { CT77_CONFIG } from '@/lib/copytrade77-config';
import { getSystemAdminCopytradeProfileId } from '@/lib/copytrade77-profile';
import { getCopytrade77AdminClient } from '@/lib/supabase-copytrade77';

export interface NormalizedSignalInput {
  symbol: string;
  timeframe: string;
  side: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'BUY_LIMIT' | 'SELL_LIMIT' | 'BUY_STOP' | 'SELL_STOP';
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2?: number | null;
  takeProfit3?: number | null;
  confidence?: number | null;
}

export interface PublishSignalResult {
  signalId: string;
  queuedDispatches: number;
  providerId: string;
}

interface IdRow {
  id: string;
}

interface TerminalDispatchRow {
  id: string;
  follow_id: string;
}

interface TerminalConfigRow {
  id: string;
  follow_id: string | null;
  symbol: string | null;
  timeframe: string | null;
  status: string;
}

interface FollowConfigRow {
  id: string;
  provider_id: string;
  status: string;
  follower_profile_id: string | null;
  one_trade_at_a_time: boolean;
  max_concurrent_positions: number;
}

function timeframeToAiKey(input: string | null | undefined): Timeframe {
  const raw = String(input || 'M15').trim().toLowerCase();
  const map: Record<string, Timeframe> = {
    m1: '1m',
    '1m': '1m',
    m5: '5m',
    '5m': '5m',
    m15: '15m',
    '15m': '15m',
    m30: '30m',
    '30m': '30m',
    h1: '1h',
    '1h': '1h',
    h4: '4h',
    '4h': '4h',
    d1: '1d',
    '1d': '1d',
  };
  return map[raw] || '15m';
}

function timeframeToDisplay(input: Timeframe): string {
  const map: Record<Timeframe, string> = {
    '1m': 'M1',
    '5m': 'M5',
    '15m': 'M15',
    '30m': 'M30',
    '1h': 'H1',
    '4h': 'H4',
    '1d': 'D1',
  };
  return map[input];
}

function normalizeSymbol(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function getPipSize(symbol: string): number {
  const s = normalizeSymbol(symbol);
  if (s.includes('XAU') || s.includes('XAG') || s.includes('XPT') || s.includes('XPD')) return 0.1;
  if (s.endsWith('JPY')) return 0.01;
  if (s.startsWith('US') || s.endsWith('USD') === false) return 0.1;
  return 0.0001;
}

function priceDecimals(symbol: string): number {
  const s = normalizeSymbol(symbol);
  if (s.includes('XAU') || s.includes('XAG') || s.includes('XPT') || s.includes('XPD')) return 2;
  if (s.endsWith('JPY')) return 3;
  if (s.startsWith('US')) return 2;
  return 5;
}

function roundPrice(v: number, decimals: number): number {
  const p = Math.pow(10, decimals);
  return Math.round(v * p) / p;
}

export function normalizeTradeSignal(input: {
  symbol: string;
  timeframe: string;
  side: 'BUY' | 'SELL';
  orderType?: string | null;
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2?: number | null;
  takeProfit3?: number | null;
  confidence?: number | null;
}): NormalizedSignalInput {
  const symbol = normalizeSymbol(input.symbol);
  const decimals = priceDecimals(symbol);
  const pipSize = getPipSize(symbol);
  const minDistance = CT77_CONFIG.minSlPips * pipSize;

  const entry = Number(input.entryPrice);
  let sl = Number(input.stopLoss);
  let tp1 = Number(input.takeProfit1);
  let tp2 = input.takeProfit2 != null ? Number(input.takeProfit2) : null;
  let tp3 = input.takeProfit3 != null ? Number(input.takeProfit3) : null;

  if (!Number.isFinite(entry) || entry <= 0) {
    throw new Error('INVALID_ENTRY_PRICE');
  }

  const side = input.side;
  if (side !== 'BUY' && side !== 'SELL') {
    throw new Error('INVALID_SIDE');
  }

  const rrBase = Math.max(minDistance, Math.abs(entry - (Number.isFinite(sl) ? sl : entry)) || minDistance);

  if (!Number.isFinite(sl) || sl <= 0) {
    sl = side === 'BUY' ? entry - minDistance : entry + minDistance;
  }

  if (side === 'BUY') {
    if (sl >= entry || Math.abs(entry - sl) < minDistance) {
      sl = entry - minDistance;
    }
  } else {
    if (sl <= entry || Math.abs(entry - sl) < minDistance) {
      sl = entry + minDistance;
    }
  }

  if (!Number.isFinite(tp1) || tp1 <= 0) {
    tp1 = side === 'BUY' ? entry + rrBase * 1.5 : entry - rrBase * 1.5;
  }

  if (side === 'BUY' && tp1 <= entry) {
    tp1 = entry + rrBase * 1.5;
  }
  if (side === 'SELL' && tp1 >= entry) {
    tp1 = entry - rrBase * 1.5;
  }

  if (tp2 == null || !Number.isFinite(tp2)) {
    tp2 = side === 'BUY' ? entry + rrBase * 2.2 : entry - rrBase * 2.2;
  }
  if (tp3 == null || !Number.isFinite(tp3)) {
    tp3 = side === 'BUY' ? entry + rrBase * 3.0 : entry - rrBase * 3.0;
  }

  if (side === 'BUY') {
    if (tp2 <= entry) tp2 = entry + rrBase * 2.2;
    if (tp3 <= entry) tp3 = entry + rrBase * 3.0;
  } else {
    if (tp2 >= entry) tp2 = entry - rrBase * 2.2;
    if (tp3 >= entry) tp3 = entry - rrBase * 3.0;
  }

  let orderType: NormalizedSignalInput['orderType'] = 'MARKET';
  const inputOrderType = String(input.orderType || 'MARKET').toUpperCase();
  if (['MARKET', 'BUY_LIMIT', 'SELL_LIMIT', 'BUY_STOP', 'SELL_STOP'].includes(inputOrderType)) {
    orderType = inputOrderType as NormalizedSignalInput['orderType'];
  }

  return {
    symbol,
    timeframe: input.timeframe,
    side,
    orderType,
    entryPrice: roundPrice(entry, decimals),
    stopLoss: roundPrice(sl, decimals),
    takeProfit1: roundPrice(tp1, decimals),
    takeProfit2: roundPrice(Number(tp2), decimals),
    takeProfit3: roundPrice(Number(tp3), decimals),
    confidence: input.confidence ?? null,
  };
}

export async function getOrCreateSystemProviderId(): Promise<string> {
  const supabase = getCopytrade77AdminClient().schema('copytrade77');
  const adminProfileId = await getSystemAdminCopytradeProfileId();
  const slug = 'arra77-system-ai';

  const existing = await supabase
    .from('providers')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (existing.error) throw existing.error;
  if (existing.data?.id) return String(existing.data.id);

  const created = await supabase
    .from('providers')
    .insert({
      profile_id: adminProfileId,
      display_name: 'ARRA77 System AI',
      slug,
      bio: 'System provider untuk signal otomatis dari AI analisa ARRA7.',
      status: 'APPROVED',
      risk_level: 'MEDIUM',
      approved_by_profile_id: adminProfileId,
      approved_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (created.error || !created.data?.id) {
    throw created.error || new Error('SYSTEM_PROVIDER_CREATE_FAILED');
  }

  return String(created.data.id);
}

export async function publishSignalAndQueue(params: {
  providerId: string;
  signal: NormalizedSignalInput;
  source?: 'ARRA_AI' | 'PROVIDER_MANUAL' | 'ADMIN_MANUAL';
  sourceRef?: string | null;
  rawAnalysis?: Record<string, unknown>;
  createdByProfileId?: string | null;
}): Promise<PublishSignalResult> {
  const supabase = getCopytrade77AdminClient().schema('copytrade77');

  const signalRes = await supabase
    .from('signals')
    .insert({
      provider_id: params.providerId,
      source: params.source || 'ARRA_AI',
      source_ref: params.sourceRef || null,
      symbol: params.signal.symbol,
      timeframe: params.signal.timeframe,
      side: params.signal.side,
      order_type: params.signal.orderType,
      entry_price: params.signal.entryPrice,
      stop_loss: params.signal.stopLoss,
      take_profit_1: params.signal.takeProfit1,
      take_profit_2: params.signal.takeProfit2 ?? null,
      take_profit_3: params.signal.takeProfit3 ?? null,
      min_stop_distance_pips: CT77_CONFIG.minSlPips,
      confidence: params.signal.confidence ?? null,
      raw_analysis: params.rawAnalysis || {},
      status: 'PUBLISHED',
      valid_from: new Date().toISOString(),
      valid_until: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      created_by_profile_id: params.createdByProfileId || null,
    })
    .select('id')
    .single();

  if (signalRes.error || !signalRes.data?.id) {
    throw signalRes.error || new Error('SIGNAL_INSERT_FAILED');
  }

  const signalId = String(signalRes.data.id);

  const followRes = await supabase
    .from('follow_relations')
    .select('id')
    .eq('provider_id', params.providerId)
    .eq('status', 'ACTIVE');
  if (followRes.error) throw followRes.error;

  const followIds = (followRes.data || []).map((row) => String((row as IdRow).id));
  if (followIds.length === 0) {
    return { signalId, queuedDispatches: 0, providerId: params.providerId };
  }

  const terminalRes = await supabase
    .from('bridge_terminals')
    .select('id,follow_id')
    .in('follow_id', followIds)
    .neq('status', 'BLOCKED');
  if (terminalRes.error) throw terminalRes.error;

  const dispatchRows = (terminalRes.data || []).map((terminal) => {
    const terminalRow = terminal as TerminalDispatchRow;
    return {
      signal_id: signalId,
      follow_id: terminalRow.follow_id,
      terminal_id: terminalRow.id,
      status: 'QUEUED',
      requested_at: new Date().toISOString(),
    };
  });

  if (dispatchRows.length > 0) {
    const insertDispatch = await supabase
      .from('signal_dispatches')
      .insert(dispatchRows)
      .select('id');
    if (insertDispatch.error) throw insertDispatch.error;
  }

  return { signalId, queuedDispatches: dispatchRows.length, providerId: params.providerId };
}

export async function queueLatestProviderSignalForTerminal(params: {
  terminalId: string;
  followId: string;
  providerId: string;
  symbol: string;
  timeframe: string;
  cooldownSeconds?: number;
}): Promise<{ queued: boolean; signalId?: string }> {
  const supabase = getCopytrade77AdminClient().schema('copytrade77');
  const cooldownSeconds = params.cooldownSeconds ?? 120;
  const since = new Date(Date.now() - cooldownSeconds * 1000).toISOString();

  const recentSignalRes = await supabase
    .from('signals')
    .select('id,created_at,status')
    .eq('provider_id', params.providerId)
    .eq('symbol', params.symbol)
    .eq('timeframe', params.timeframe)
    .eq('status', 'PUBLISHED')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentSignalRes.error) throw recentSignalRes.error;
  const signalId = recentSignalRes.data?.id ? String(recentSignalRes.data.id) : null;
  if (!signalId) return { queued: false };

  const existingDispatch = await supabase
    .from('signal_dispatches')
    .select('id')
    .eq('signal_id', signalId)
    .eq('terminal_id', params.terminalId)
    .maybeSingle();

  if (existingDispatch.error) throw existingDispatch.error;
  if (existingDispatch.data?.id) {
    return { queued: true, signalId };
  }

  const dispatchInsert = await supabase
    .from('signal_dispatches')
    .insert({
      signal_id: signalId,
      follow_id: params.followId,
      terminal_id: params.terminalId,
      status: 'QUEUED',
      requested_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (dispatchInsert.error) throw dispatchInsert.error;
  return { queued: true, signalId };
}

export async function hasRecentPublishedSignal(params: {
  providerId: string;
  symbol: string;
  timeframe: string;
  withinSeconds?: number;
}): Promise<{ exists: boolean; signalId?: string }> {
  const supabase = getCopytrade77AdminClient().schema('copytrade77');
  const since = new Date(Date.now() - (params.withinSeconds ?? 120) * 1000).toISOString();

  const res = await supabase
    .from('signals')
    .select('id')
    .eq('provider_id', params.providerId)
    .eq('symbol', params.symbol)
    .eq('timeframe', params.timeframe)
    .eq('status', 'PUBLISHED')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (res.error) throw res.error;
  if (!res.data?.id) return { exists: false };
  return { exists: true, signalId: String(res.data.id) };
}

export async function generateAndQueueSignalForTerminal(terminalId: string): Promise<{
  generated: boolean;
  reason: string;
  signalId?: string;
}> {
  const supabase = getCopytrade77AdminClient().schema('copytrade77');

  const terminalRes = await supabase
    .from('bridge_terminals')
    .select('id,follow_id,symbol,timeframe,status')
    .eq('id', terminalId)
    .maybeSingle();
  if (terminalRes.error) throw terminalRes.error;
  if (!terminalRes.data) return { generated: false, reason: 'terminal_not_found' };

  const terminal = terminalRes.data as TerminalConfigRow;
  if (!terminal.follow_id) return { generated: false, reason: 'no_follow_relation' };

  const followRes = await supabase
    .from('follow_relations')
    .select('id,provider_id,status,follower_profile_id,one_trade_at_a_time,max_concurrent_positions')
    .eq('id', terminal.follow_id)
    .maybeSingle();
  if (followRes.error) throw followRes.error;
  if (!followRes.data || followRes.data.status !== 'ACTIVE') {
    return { generated: false, reason: 'follow_not_active' };
  }

  const follow = followRes.data as FollowConfigRow;
  if (!follow.follower_profile_id) {
    return { generated: false, reason: 'missing_follower_profile' };
  }

  const walletRes = await supabase
    .from('wallets')
    .select('balance_credits')
    .eq('profile_id', follow.follower_profile_id)
    .maybeSingle();
  if (walletRes.error) throw walletRes.error;

  const balanceCredits = Number(walletRes.data?.balance_credits || 0);
  if (balanceCredits < CT77_CONFIG.signalCostCredits) {
    return { generated: false, reason: 'insufficient_credits' };
  }

  const openPosRes = await supabase
    .from('positions')
    .select('id')
    .eq('follower_profile_id', follow.follower_profile_id)
    .eq('status', 'OPEN')
    .limit(20);
  if (openPosRes.error) throw openPosRes.error;

  const openPositions = (openPosRes.data || []).length;
  const oneTradeAtATime = Boolean(follow.one_trade_at_a_time ?? true);
  const maxConcurrentPositions = Math.max(1, Number(follow.max_concurrent_positions ?? 1));
  if (oneTradeAtATime && openPositions > 0) {
    return { generated: false, reason: 'one_trade_lock_active' };
  }
  if (!oneTradeAtATime && openPositions >= maxConcurrentPositions) {
    return { generated: false, reason: 'max_concurrent_positions_reached' };
  }

  const providerId = String(follow.provider_id);
  const symbol = normalizeSymbol(String(terminal.symbol || 'XAUUSD'));
  const aiTimeframe = timeframeToAiKey(String(terminal.timeframe || 'M15'));
  const timeframe = timeframeToDisplay(aiTimeframe);

  const existingQueue = await queueLatestProviderSignalForTerminal({
    terminalId,
    followId: String(follow.id),
    providerId,
    symbol,
    timeframe,
    cooldownSeconds: 120,
  });
  if (existingQueue.queued) {
    return {
      generated: false,
      reason: 'reused_recent_signal',
      signalId: existingQueue.signalId,
    };
  }

  const symbolKey = symbol as ForexPair;
  if (!(symbolKey in FOREX_PAIRS) || !(aiTimeframe in TIMEFRAMES)) {
    return { generated: false, reason: 'unsupported_symbol_or_timeframe' };
  }

  const marketData = await getMarketData(symbolKey, aiTimeframe);
  if (marketData.is_simulated) {
    return { generated: false, reason: 'market_data_unavailable' };
  }

  const formatted = formatMarketDataForAI(marketData, aiTimeframe);
  const aiResult = await analyzeWithGroq(formatted, undefined, {});
  if (!aiResult.success || !aiResult.analysis) {
    return { generated: false, reason: 'ai_generation_failed' };
  }

  const parsed = parseSignalFromAnalysis(aiResult.analysis, 'forex', symbol, aiTimeframe);
  if (!parsed || parsed.direction === 'HOLD') {
    return { generated: false, reason: 'analysis_no_trade_signal' };
  }

  const normalized = normalizeTradeSignal({
    symbol,
    timeframe,
    side: parsed.direction === 'BUY' ? 'BUY' : 'SELL',
    orderType: 'MARKET',
    entryPrice: Number(parsed.entryPrice || marketData.current_price),
    stopLoss: Number(parsed.stopLoss || 0),
    takeProfit1: Number(parsed.takeProfit1 || 0),
    takeProfit2: parsed.takeProfit2 || null,
    confidence: parsed.confidence || null,
  });

  const adminProfileId = await getSystemAdminCopytradeProfileId();
  const published = await publishSignalAndQueue({
    providerId,
    signal: normalized,
    source: 'ARRA_AI',
    sourceRef: 'bridge_auto_generate',
    rawAnalysis: {
      rawAnalysis: aiResult.analysis,
      marketPrice: marketData.current_price,
      symbol,
      timeframe: aiTimeframe,
    },
    createdByProfileId: adminProfileId,
  });

  return {
    generated: true,
    reason: 'generated_new_signal',
    signalId: published.signalId,
  };
}
