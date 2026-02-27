import {
  appendTelegramChatMessage,
  getTelegramChatHistory,
} from './turso';
import {
  FOREX_PAIRS,
  ForexPair,
  formatMarketDataForAI,
  getMarketData,
  Timeframe,
} from './market-data';
import { analyzeWithGroq } from './groq-ai';
import { parseSignalFromAnalysis } from './signal-tracker';
import { runAgentText } from './agent/core';
import {
  createAnalyzeForexTool,
  createAnalyzeStockTool,
  marketHoursTool,
  mlPredictionTool,
  newsTool,
  portfolioTool,
  priceTool,
  signalHistoryTool,
} from './agent/tools';

interface HandleTelegramVvipMessageParams {
  userId: string;
  chatId: string;
  text: string;
  firstName?: string;
}

const SIGNAL_INTENT_REGEX = /\b(signal|sinyal|analisa|analysis|setup)\b/i;
const SYMBOL_KEYS = Object.keys(FOREX_PAIRS).sort((a, b) => b.length - a.length);

function getMemoryLimit(): number {
  const value = Number(process.env.TELEGRAM_VVIP_CHAT_MEMORY ?? 12);
  if (!Number.isFinite(value) || value <= 0) return 12;
  return Math.min(20, Math.max(4, Math.floor(value)));
}

function normalizeTimeframe(tf: string): string {
  const map: Record<string, string> = {
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
  return map[tf.toLowerCase()] || '1h';
}

function extractTimeframe(text: string): string {
  const lower = text.toLowerCase();
  const patterns: Array<{ regex: RegExp; tf: string }> = [
    { regex: /\b(?:tf|timeframe)\s*[:=]?\s*m1\b|\b1m\b|\bm1\b/i, tf: '1m' },
    { regex: /\b(?:tf|timeframe)\s*[:=]?\s*m5\b|\b5m\b|\bm5\b/i, tf: '5m' },
    { regex: /\b(?:tf|timeframe)\s*[:=]?\s*m15\b|\b15m\b|\bm15\b/i, tf: '15m' },
    { regex: /\b(?:tf|timeframe)\s*[:=]?\s*m30\b|\b30m\b|\bm30\b/i, tf: '30m' },
    { regex: /\b(?:tf|timeframe)\s*[:=]?\s*h1\b|\b1h\b|\bh1\b/i, tf: '1h' },
    { regex: /\b(?:tf|timeframe)\s*[:=]?\s*h4\b|\b4h\b|\bh4\b/i, tf: '4h' },
    { regex: /\b(?:tf|timeframe)\s*[:=]?\s*d1\b|\b1d\b|\bd1\b/i, tf: '1d' },
  ];

  for (const item of patterns) {
    if (item.regex.test(lower)) return item.tf;
  }
  return '1h';
}

function extractSymbol(text: string): string | null {
  const upper = text.toUpperCase();

  for (const symbol of SYMBOL_KEYS) {
    if (upper.includes(symbol)) return symbol;
  }

  const slashPair = upper.match(/\b([A-Z]{3})\s*\/\s*([A-Z]{3})\b/);
  if (slashPair) {
    const merged = `${slashPair[1]}${slashPair[2]}`;
    if (FOREX_PAIRS[merged as keyof typeof FOREX_PAIRS]) return merged;
  }

  const aliasMap: Record<string, string> = {
    GOLD: 'XAUUSD',
    XAU: 'XAUUSD',
    SILVER: 'XAGUSD',
    XAG: 'XAGUSD',
    BITCOIN: 'BTCUSD',
    BTC: 'BTCUSD',
    ETH: 'ETHUSD',
    NASDAQ: 'USTEC',
    DOW: 'US30',
    SP500: 'US500',
  };

  for (const [alias, symbol] of Object.entries(aliasMap)) {
    const regex = new RegExp(`\\b${alias}\\b`, 'i');
    if (regex.test(upper)) return symbol;
  }

  return null;
}

function cleanSummary(analysis: string | null | undefined): string {
  if (!analysis) return '-';
  const line = analysis
    .replace(/\r/g, '\n')
    .split('\n')
    .map((item) => item.trim())
    .find((item) => item.length > 0 && !item.startsWith('#'));

  if (!line) return '-';
  return line.slice(0, 160);
}

function formatSignalPrice(value: number): string {
  if (!(value > 0)) return '-';
  const abs = Math.abs(value);
  let maxDecimals = 2;
  if (abs < 1) maxDecimals = 5;
  else if (abs < 100) maxDecimals = 4;

  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
}

function inferExecutionType(
  direction: 'BUY' | 'SELL' | 'HOLD',
  currentPrice: number,
  entryPrice: number
): string {
  if (!(currentPrice > 0) || !(entryPrice > 0) || direction === 'HOLD') {
    return 'WAIT / NO TRADE';
  }

  // Treat as market execution if entry is very close to current price.
  const diffRatio = Math.abs(currentPrice - entryPrice) / entryPrice;
  const isNearMarket = diffRatio <= 0.0008; // 0.08%

  if (direction === 'BUY') {
    if (isNearMarket) return 'MARKET BUY (Instant)';
    return entryPrice > currentPrice ? 'BUY STOP (Pending)' : 'BUY LIMIT (Pending)';
  }

  if (isNearMarket) return 'MARKET SELL (Instant)';
  return entryPrice < currentPrice ? 'SELL STOP (Pending)' : 'SELL LIMIT (Pending)';
}

async function buildDirectSignalReply(userId: string, rawText: string): Promise<string> {
  const symbol = extractSymbol(rawText) || 'XAUUSD';
  const timeframe = normalizeTimeframe(extractTimeframe(rawText));

  try {
    const marketData = await getMarketData(symbol as ForexPair, timeframe as Timeframe);
    const formatted = formatMarketDataForAI(marketData, timeframe);
    const ai = await analyzeWithGroq(formatted);

    if (!ai.success || !ai.analysis) {
      return `Maaf, analisa ${symbol} ${timeframe.toUpperCase()} belum bisa diproses sekarang. Coba ulang 1-2 menit lagi.`;
    }

    const parsed = parseSignalFromAnalysis(ai.analysis, 'forex', symbol, timeframe);
    const direction = parsed?.direction || 'HOLD';
    const entry = parsed?.entryPrice ?? 0;
    const sl = parsed?.stopLoss ?? 0;
    const tp = parsed?.takeProfit1 ?? 0;
    const currentPrice = marketData?.current_price ?? 0;
    const executionType = inferExecutionType(direction, currentPrice, entry);
    const confidence = typeof parsed?.confidence === 'number'
      ? `${Math.round(parsed.confidence)}%`
      : 'N/A';

    const summary = cleanSummary(ai.analysis);

    return [
      `Signal ${symbol} ${timeframe.toUpperCase()}`,
      `Direction: ${direction}`,
      `Current Price: ${formatSignalPrice(currentPrice)}`,
      `Order Type: ${executionType}`,
      `Entry: ${formatSignalPrice(entry)}`,
      `SL: ${formatSignalPrice(sl)}`,
      `TP1: ${formatSignalPrice(tp)}`,
      `Confidence: ${confidence}`,
      `Thesis: ${summary}`,
      '',
      'Catatan: jika Order Type = Pending, pasang pending order di level Entry.',
      '',
      'Bila mau, saya bisa lanjutkan dengan skenario alternatif (bull/base/bear) dan risk map.',
    ].join('\n');
  } catch (error) {
    console.error('[TELEGRAM_VVIP_CHAT] direct signal error:', error);
    return `Maaf, analisa ${symbol} belum tersedia saat ini. Silakan coba lagi sebentar lagi.`;
  }
}

function buildSystemPrompt(firstName?: string): string {
  const userLabel = firstName?.trim() ? firstName.trim() : 'Trader';
  return [
    'Kamu adalah ARRA7 VVIP Telegram Analyst.',
    `Nama user: ${userLabel}.`,
    'Gunakan Bahasa Indonesia profesional namun natural.',
    'Jawaban harus ringkas, jelas, actionable, dan tidak bertele-tele.',
    'Saat user meminta analisa/signal, gunakan tools dan berikan format: Direction, Current Price, Order Type (Market/Pending), Entry, SL, TP, Confidence, dan Thesis singkat.',
    'Jangan mengarang harga/data.',
    'Selalu tutup jawaban dengan 1 pertanyaan lanjutan singkat.',
  ].join(' ');
}

export async function handleTelegramVvipMessage({
  userId,
  chatId,
  text,
  firstName,
}: HandleTelegramVvipMessageParams): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return 'Tolong kirim pertanyaan yang ingin Anda analisa.';

  const memoryLimit = getMemoryLimit();
  await appendTelegramChatMessage({
    userId,
    chatId,
    role: 'user',
    content: trimmed,
    keepLast: Math.max(memoryLimit * 2, 24),
  });

  let reply = '';
  if (SIGNAL_INTENT_REGEX.test(trimmed)) {
    reply = await buildDirectSignalReply(userId, trimmed);
  } else {
    try {
      const history = await getTelegramChatHistory(userId, chatId, memoryLimit);
      const messages = history.map((item) => ({
        role: item.role,
        content: item.content,
      }));

      const tools = {
        getPrice: priceTool,
        getNews: newsTool,
        analyzeForex: createAnalyzeForexTool(userId, { skipQuota: true }),
        analyzeStock: createAnalyzeStockTool(userId, { skipQuota: true }),
        getMLPrediction: mlPredictionTool,
        getSignalHistory: signalHistoryTool,
        getPortfolio: portfolioTool,
        getMarketHours: marketHoursTool,
      };

      reply = await runAgentText({
        userId,
        messages,
        systemPrompt: buildSystemPrompt(firstName),
        toolOverrides: tools,
      });

      if (!reply || !reply.trim()) {
        reply = 'Maaf, saya belum dapat respons yang valid. Silakan ulangi pertanyaan Anda.';
      }
    } catch (error) {
      console.error('[TELEGRAM_VVIP_CHAT] agent error:', error);
      reply = 'Sistem AI sedang sibuk. Coba ulangi 1 menit lagi.';
    }
  }

  await appendTelegramChatMessage({
    userId,
    chatId,
    role: 'assistant',
    content: reply,
    keepLast: Math.max(memoryLimit * 2, 24),
  });

  return reply;
}
