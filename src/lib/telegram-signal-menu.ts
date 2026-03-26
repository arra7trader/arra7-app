import {
  FOREX_PAIRS,
  ForexPair,
  formatMarketDataForAI,
  getMarketData,
  PAIR_CATEGORIES,
  Timeframe,
} from './market-data';
import { analyzeWithGroq } from './groq-ai';
import {
  getTelegramTrackedSignals,
  parseSignalFromAnalysis,
  recordTelegramSignalRequest,
  saveSignalWithId,
} from './signal-tracker';

export type PairCategoryId = (typeof PAIR_CATEGORIES)[number]['id'];

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildMainMenuKeyboard() {
  return {
    keyboard: [[{ text: 'Signal' }, { text: 'Hasil' }]],
    resize_keyboard: true,
    persistent: true,
  };
}

export function buildSignalCategoryKeyboard() {
  return {
    inline_keyboard: PAIR_CATEGORIES.map((category) => [
      {
        text: `${category.icon} ${category.name}`,
        callback_data: `sigcat:${category.id}`,
      },
    ]),
  };
}

export function buildPairKeyboard(categoryId: PairCategoryId) {
  const category = PAIR_CATEGORIES.find((item) => item.id === categoryId);
  if (!category) return { inline_keyboard: [] };

  const rows: Array<Array<{ text: string; callback_data: string }>> = [];
  for (let i = 0; i < category.pairs.length; i += 2) {
    rows.push(
      category.pairs.slice(i, i + 2).map((pair) => ({
        text: pair,
        callback_data: `sigpair:${categoryId}:${pair}`,
      }))
    );
  }
  rows.push([{ text: '⬅️ Kategori', callback_data: 'sigmenu:categories' }]);
  return { inline_keyboard: rows };
}

export function buildTimeframeKeyboard(categoryId: PairCategoryId, symbol: string) {
  return {
    inline_keyboard: [
      [
        { text: 'M1', callback_data: `sigtf:${categoryId}:${symbol}:1m` },
        { text: 'M5', callback_data: `sigtf:${categoryId}:${symbol}:5m` },
        { text: 'M15', callback_data: `sigtf:${categoryId}:${symbol}:15m` },
      ],
      [
        { text: 'M30', callback_data: `sigtf:${categoryId}:${symbol}:30m` },
        { text: 'H1', callback_data: `sigtf:${categoryId}:${symbol}:1h` },
        { text: 'H4', callback_data: `sigtf:${categoryId}:${symbol}:4h` },
      ],
      [
        { text: 'D1', callback_data: `sigtf:${categoryId}:${symbol}:1d` },
      ],
      [
        { text: '⬅️ Pair', callback_data: `sigcat:${categoryId}` },
        { text: '📊 Hasil', callback_data: 'sigmenu:results' },
      ],
    ],
  };
}

function cleanSummary(analysis: string | null | undefined): string {
  if (!analysis) return '-';
  const line = analysis
    .replace(/\r/g, '\n')
    .split('\n')
    .map((item) => item.trim())
    .find((item) => item.length > 0 && !item.startsWith('#'));

  return line ? line.slice(0, 200) : '-';
}

function formatPrice(symbol: string, value: number): string {
  if (!(value > 0)) return '-';
  const abs = Math.abs(value);
  let digits = 2;
  if (abs < 1) digits = 5;
  else if (abs < 100) digits = 4;
  if (symbol.endsWith('JPY')) digits = 3;
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

function inferOrderType(direction: 'BUY' | 'SELL' | 'HOLD', currentPrice: number, entryPrice: number): string {
  if (!(currentPrice > 0) || !(entryPrice > 0) || direction === 'HOLD') return 'WAIT';
  const diffRatio = Math.abs(currentPrice - entryPrice) / entryPrice;
  const isInstant = diffRatio <= 0.0008;

  if (direction === 'BUY') {
    if (isInstant) return 'BUY NOW';
    return entryPrice > currentPrice ? 'BUY STOP' : 'BUY LIMIT';
  }

  if (isInstant) return 'SELL NOW';
  return entryPrice < currentPrice ? 'SELL STOP' : 'SELL LIMIT';
}

function calculateRR(entry: number, stopLoss: number, takeProfit: number) {
  const risk = Math.abs(entry - stopLoss);
  const reward = Math.abs(takeProfit - entry);
  if (!(risk > 0) || !(reward > 0)) return null;
  return reward / risk;
}

export async function generateTelegramSignal(params: {
  userId: string;
  chatId: string;
  symbol: string;
  timeframe: string;
}) {
  const symbol = params.symbol.toUpperCase();
  const timeframe = params.timeframe as Timeframe;

  const marketData = await getMarketData(symbol as ForexPair, timeframe);
  const formatted = formatMarketDataForAI(marketData, timeframe);
  const ai = await analyzeWithGroq(formatted);

  if (!ai.success || !ai.analysis) {
    return {
      ok: false as const,
      message: `Analisa ${symbol} ${timeframe.toUpperCase()} belum bisa diproses sekarang.`
    };
  }

  const parsed = parseSignalFromAnalysis(ai.analysis, 'forex', symbol, timeframe);
  if (!parsed || parsed.direction === 'HOLD') {
    return {
      ok: false as const,
      message: `Belum ada setup valid untuk ${symbol} ${timeframe.toUpperCase()}. Coba pair atau timeframe lain.`
    };
  }

  const currentPrice = marketData.current_price || 0;
  const entry = parsed.entryPrice || currentPrice;
  const stopLoss = parsed.stopLoss || 0;
  const takeProfit1 = parsed.takeProfit1 || 0;
  const orderType = inferOrderType(parsed.direction, currentPrice, entry);
  const rr = calculateRR(entry, stopLoss, takeProfit1);
  const confidence = typeof parsed.confidence === 'number' ? Math.round(parsed.confidence) : 72;
  const thesis = cleanSummary(ai.analysis);

  const signalId = await saveSignalWithId({
    type: 'forex',
    symbol,
    timeframe,
    direction: parsed.direction,
    entryPrice: entry,
    stopLoss,
    takeProfit1,
    takeProfit2: parsed.takeProfit2,
    confidence,
  });

  if (signalId) {
    await recordTelegramSignalRequest(params.userId, params.chatId, signalId, symbol, timeframe);
  }

  const text = [
    `📡 <b>SIGNAL ${escapeHtml(symbol)} ${escapeHtml(timeframe.toUpperCase())}</b>`,
    '',
    `Bias: <b>${escapeHtml(parsed.direction)}</b>`,
    `Eksekusi: <b>${escapeHtml(orderType)}</b>`,
    `Harga sekarang: <code>${escapeHtml(formatPrice(symbol, currentPrice))}</code>`,
    `Area entry: <code>${escapeHtml(formatPrice(symbol, entry))}</code>`,
    `Stop loss: <code>${escapeHtml(formatPrice(symbol, stopLoss))}</code>`,
    `Take profit: <code>${escapeHtml(formatPrice(symbol, takeProfit1))}</code>`,
    `Confidence: <b>${escapeHtml(String(confidence))}%</b>`,
    rr ? `Risk/Reward: <b>1:${escapeHtml(rr.toFixed(2))}</b>` : `Risk/Reward: <b>-</b>`,
    '',
    `Alasan: ${escapeHtml(thesis)}`,
    signalId ? `ID Signal: <code>#${signalId}</code>` : '',
  ].filter(Boolean).join('\n');

  return {
    ok: true as const,
    text,
    signalId,
  };
}

function calculateProgressPercent(signal: {
  direction: 'BUY' | 'SELL' | 'HOLD';
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
}, currentPrice: number) {
  if (!(currentPrice > 0)) return null;

  if (signal.direction === 'BUY') {
    if (currentPrice >= signal.entryPrice) {
      const target = signal.takeProfit1 - signal.entryPrice;
      if (!(target > 0)) return null;
      return Math.min(100, Math.max(0, ((currentPrice - signal.entryPrice) / target) * 100));
    }
    const risk = signal.entryPrice - signal.stopLoss;
    if (!(risk > 0)) return null;
    return -Math.min(100, Math.max(0, ((signal.entryPrice - currentPrice) / risk) * 100));
  }

  if (signal.direction === 'SELL') {
    if (currentPrice <= signal.entryPrice) {
      const target = signal.entryPrice - signal.takeProfit1;
      if (!(target > 0)) return null;
      return Math.min(100, Math.max(0, ((signal.entryPrice - currentPrice) / target) * 100));
    }
    const risk = signal.stopLoss - signal.entryPrice;
    if (!(risk > 0)) return null;
    return -Math.min(100, Math.max(0, ((currentPrice - signal.entryPrice) / risk) * 100));
  }

  return null;
}

export async function buildTelegramResultsSummary(userId: string) {
  const rows = await getTelegramTrackedSignals(userId, 8);
  if (rows.length === 0) {
    return 'Belum ada hasil signal. Tekan menu Signal lalu pilih pair dan timeframe terlebih dahulu.';
  }

  const lines = ['📈 <b>HASIL SIGNAL TERBARU</b>', ''];

  for (const row of rows) {
    let statusLabel = row.status;
    if (row.status === 'PENDING') {
      try {
        const live = await getMarketData(row.symbol as ForexPair, (row.timeframe || '1h') as Timeframe);
        const progress = calculateProgressPercent(row, live.current_price || 0);
        if (progress !== null) {
          statusLabel = progress >= 0
            ? `ACTIVE +${progress.toFixed(0)}% ke TP`
            : `ACTIVE ${progress.toFixed(0)}% ke SL`;
        } else {
          statusLabel = 'ACTIVE';
        }
      } catch {
        statusLabel = 'ACTIVE';
      }
    } else if (row.status === 'TP_HIT') {
      statusLabel = `TP HIT ${row.pipsResult != null ? `(+${row.pipsResult.toFixed(1)} pips)` : ''}`;
    } else if (row.status === 'SL_HIT') {
      statusLabel = `SL HIT ${row.pipsResult != null ? `(${row.pipsResult.toFixed(1)} pips)` : ''}`;
    }

    lines.push(
      `#${row.signalId} ${escapeHtml(row.symbol)} ${escapeHtml(String(row.timeframe || '-').toUpperCase())}`,
      `${escapeHtml(row.direction)} | ${escapeHtml(statusLabel)}`,
      `Entry <code>${escapeHtml(formatPrice(row.symbol, row.entryPrice))}</code> | TP <code>${escapeHtml(formatPrice(row.symbol, row.takeProfit1))}</code> | SL <code>${escapeHtml(formatPrice(row.symbol, row.stopLoss))}</code>`,
      ''
    );
  }

  return lines.join('\n');
}

export function parseSignalCallback(data: string):
  | { type: 'categories' }
  | { type: 'category'; categoryId: PairCategoryId }
  | { type: 'pair'; categoryId: PairCategoryId; symbol: string }
  | { type: 'timeframe'; categoryId: PairCategoryId; symbol: string; timeframe: string }
  | { type: 'results' }
  | null {
  if (data === 'sigmenu:categories') return { type: 'categories' };
  if (data === 'sigmenu:results') return { type: 'results' };

  const categoryMatch = data.match(/^sigcat:([a-z]+)$/i);
  if (categoryMatch) {
    return { type: 'category', categoryId: categoryMatch[1] as PairCategoryId };
  }

  const pairMatch = data.match(/^sigpair:([a-z]+):([A-Z0-9]+)$/i);
  if (pairMatch) {
    return {
      type: 'pair',
      categoryId: pairMatch[1] as PairCategoryId,
      symbol: pairMatch[2].toUpperCase(),
    };
  }

  const tfMatch = data.match(/^sigtf:([a-z]+):([A-Z0-9]+):([0-9a-z]+)$/i);
  if (tfMatch) {
    return {
      type: 'timeframe',
      categoryId: tfMatch[1] as PairCategoryId,
      symbol: tfMatch[2].toUpperCase(),
      timeframe: tfMatch[3].toLowerCase(),
    };
  }

  return null;
}

export function isSupportedSignalPair(symbol: string) {
  return !!FOREX_PAIRS[symbol as keyof typeof FOREX_PAIRS];
}

export function findSignalPairCategory(symbol: string): PairCategoryId | null {
  const category = PAIR_CATEGORIES.find((item) => item.pairs.includes(symbol));
  return category ? category.id : null;
}
