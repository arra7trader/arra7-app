import {
  CRYPTO,
  FOREX_PAIRS,
  ForexPair,
  formatMarketDataForAI,
  getMarketData,
  MarketData,
  PAIR_CATEGORIES,
  Timeframe,
} from './market-data';
import { analyzeWithGroq } from './groq-ai';
import { getTelebotUserProfile } from './turso';
import { calculateTelebotTradePlan, formatTelebotSetupStyle } from './telebot-trade-plan';
import {
  getLatestTelebotSignalExecution,
  getTelegramTrackedSignals,
  parseTelebotSignalFromAnalysis,
  recordTelegramSignalRequest,
  saveTelebotSignalExecution,
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

function formatQuota(limit: number) {
  return Number.isFinite(limit) ? String(limit) : 'Unlimited';
}

function getTelebotShortUrl() {
  const baseUrl = (process.env.NEXTAUTH_URL || 'https://arra7-app.vercel.app').replace(/\/$/, '');
  return `${baseUrl}/telebot`;
}

export function buildMainMenuKeyboard() {
  return {
    keyboard: [
      [{ text: 'Signal' }, { text: 'Live Status' }],
      [{ text: 'Balance' }, { text: 'Risk Setup' }],
      [{ text: 'Hasil' }, { text: 'Status' }],
      [{ text: 'Reset Balance' }, { text: 'Bantuan' }],
    ],
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

  rows.push([{ text: 'Back to Category', callback_data: 'sigmenu:categories' }]);
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
      [{ text: 'D1', callback_data: `sigtf:${categoryId}:${symbol}:1d` }],
      [
        { text: 'Back to Pair', callback_data: `sigcat:${categoryId}` },
        { text: 'View Hasil', callback_data: 'sigmenu:results' },
      ],
    ],
  };
}

export function buildIntroMessage(firstName: string) {
  const telebotUrl = getTelebotShortUrl();
  return [
    '<b>ARRA7 TELEBOT</b>',
    '<i>Private AI Execution Desk</i>',
    '',
    `Halo <b>${escapeHtml(firstName)}</b>, selamat datang.`,
    'Bot ini dirancang untuk trader yang ingin setup siap eksekusi, risk plan yang jelas, dan monitoring yang lebih rapi.',
    'Akses hanya terbuka untuk member aktif yang sudah di-approve.',
    '',
    '<b>Cara bergabung</b>',
    `1. Aktivasi TELEBOT di <a href="${escapeHtml(telebotUrl)}">halaman pembayaran resmi</a>`,
    '2. Pastikan username Telegram Anda sudah di-approve admin',
    '3. Setelah approved, cukup kirim <code>/start</code> dan desk Anda akan terhubung otomatis',
  ].join('\n');
}

export function buildGuestIntroKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: 'Aktivasi TELEBOT', url: getTelebotShortUrl() },
      ],
    ],
  };
}

export function buildApprovedWelcomeMessage(firstName: string) {
  return [
    '<b>ARRA7 TELEBOT</b>',
    '<i>Private AI Execution Desk</i>',
    '',
    `Selamat datang <b>${escapeHtml(firstName)}</b>.`,
    'Akses Anda sudah aktif dan private desk Anda siap digunakan.',
    '',
    '<b>Mulai dalam 3 langkah</b>',
    '1. Isi <b>Balance</b> agar sizing dan risk plan sesuai modal Anda.',
    '2. Buka <b>Signal</b> lalu pilih pair dan timeframe.',
    '3. Pantau <b>Live Status</b> untuk memonitor actual entry dan lifecycle setup.',
  ].join('\n');
}

export function buildActiveWelcomeMessage(firstName: string, accessLabel: string) {
  return [
    '<b>ARRA7 TELEBOT</b>',
    '<i>Private AI Execution Desk</i>',
    '',
    `Halo <b>${escapeHtml(firstName)}</b>.`,
    `Status akses: <b>${escapeHtml(accessLabel)}</b>`,
    '',
    '<b>Desk Workflow</b>',
    '- Signal: ambil setup siap eksekusi',
    '- Balance / Risk Setup: sesuaikan plan dengan modal Anda',
    '- Live Status: monitor lifecycle setup secara real-time',
  ].join('\n');
}

export function buildLockedAccessMessage(membership: string, detail?: string) {
  return [
    '<b>ARRA7 TELEBOT</b>',
    '<i>Private desk access pending</i>',
    '',
    detail || 'Akun Anda sudah terhubung, namun akses private desk Anda belum aktif.',
    `Membership saat ini: <b>${escapeHtml(membership)}</b>`,
    'Silakan tunggu approval admin atau aktifkan paket TELEBOT di web ARRA7 untuk membuka akses.',
  ].join('\n');
}

export function buildHelpMessage() {
  return [
    '<b>ARRA7 TELEBOT - Desk Guide</b>',
    '',
    '<b>Core Menu</b>',
    '- Signal: pilih kategori, pair, dan timeframe untuk membuka setup.',
    '- Balance: isi modal agar lot recommendation dan risk amount lebih relevan.',
    '- Live Status: monitor status setup, actual entry, dan update desk terbaru.',
    '- Hasil: lihat ringkasan track record desk Anda.',
    '',
    '<b>Quick Commands</b>',
    '<code>/balance 1000</code> set balance modal',
    '<code>/risk 1</code> set risk per trade (%)',
    '<code>/setup standard</code> pilih setup mode',
    '<code>/entry 1932.50</code> simpan actual entry terakhir',
    '<code>/live</code> tampilkan live status setup terakhir',
    '',
    'Akun TELEBOT akan terhubung otomatis berdasarkan username Telegram yang sudah di-approve admin.',
  ].join('\n');
}

export function buildStatusMessage(params: {
  accessLabel: string;
  chatId: string;
  remaining: number;
  limit: number;
  resetText: string;
  balanceText?: string;
  riskText?: string;
  setupText?: string;
}) {
  const showQuota = Number.isFinite(params.limit) && Number.isFinite(params.remaining);
  return [
    '<b>ARRA7 TELEBOT - Desk Status</b>',
    '',
    `Desk Access   : <b>${escapeHtml(params.accessLabel)}</b>`,
    `Desk ID       : <code>${escapeHtml(params.chatId)}</code>`,
    params.balanceText ? `Capital      : <b>${escapeHtml(params.balanceText)}</b>` : null,
    params.riskText ? `Risk Profile : <b>${escapeHtml(params.riskText)}</b>` : null,
    params.setupText ? `Setup Style  : <b>${escapeHtml(params.setupText)}</b>` : null,
    showQuota ? `Signal Flow   : <b>${escapeHtml(formatQuota(params.remaining))}/${escapeHtml(formatQuota(params.limit))}</b>` : `Signal Flow   : <b>Unlimited</b>`,
    showQuota ? `Reset Window  : <b>${escapeHtml(params.resetText)}</b>` : `Reset Window  : <b>Tidak ada batas harian</b>`,
  ].filter(Boolean).join('\n');
}

export function buildBalanceKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '$100', callback_data: 'tele:balance:100' },
        { text: '$500', callback_data: 'tele:balance:500' },
        { text: '$1000', callback_data: 'tele:balance:1000' },
      ],
      [
        { text: '$2500', callback_data: 'tele:balance:2500' },
        { text: '$5000', callback_data: 'tele:balance:5000' },
      ],
      [{ text: 'Reset Balance', callback_data: 'tele:resetbalance' }],
    ],
  };
}

export async function buildBalanceMessage(userId: string, note?: string) {
  const profile = await getTelebotUserProfile(userId);
  const balanceText = profile
    ? `${profile.balanceCurrency} ${Number(profile.balanceAmount || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
    : 'USD 0';

  return [
    '<b>ARRA7 TELEBOT - Balance</b>',
    '',
    note || 'Set modal Anda agar bot bisa memberikan rekomendasi sizing yang relevan.',
    '',
    `Balance Saat Ini : <b>${escapeHtml(balanceText)}</b>`,
    `Risk per Trade   : <b>${escapeHtml(String(profile?.riskPercent ?? 1))}%</b>`,
    `Setup Mode       : <b>${escapeHtml(formatTelebotSetupStyle(profile?.setupStyle || 'standard'))}</b>`,
    '',
    '<b>Cara Pakai</b>',
    '- Gunakan tombol cepat di bawah',
    '- Atau ketik <code>/balance 1000</code>',
  ].join('\n');
}

export function buildRiskSetupKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: 'Risk 0.5%', callback_data: 'tele:risk:0.5' },
        { text: 'Risk 1%', callback_data: 'tele:risk:1' },
        { text: 'Risk 2%', callback_data: 'tele:risk:2' },
      ],
      [
        { text: 'Conservative', callback_data: 'tele:setup:conservative' },
        { text: 'Standard', callback_data: 'tele:setup:standard' },
        { text: 'Aggressive', callback_data: 'tele:setup:aggressive' },
      ],
    ],
  };
}

export async function buildRiskSetupMessage(userId: string, note?: string) {
  const profile = await getTelebotUserProfile(userId);
  return [
    '<b>ARRA7 TELEBOT - Risk Setup</b>',
    '',
    note || 'Atur risk profile agar rekomendasi lot mengikuti gaya trading Anda.',
    '',
    `Risk per Trade : <b>${escapeHtml(String(profile?.riskPercent ?? 1))}%</b>`,
    `Setup Mode     : <b>${escapeHtml(formatTelebotSetupStyle(profile?.setupStyle || 'standard'))}</b>`,
    '',
    '<b>Catatan</b>',
    '- Conservative: lebih selektif, sizing tetap disiplin',
    '- Standard: default harian',
    '- Aggressive: untuk trader yang siap volatilitas lebih tinggi',
    '',
    'Atau ketik <code>/risk 1</code> dan <code>/setup standard</code>',
  ].join('\n');
}

function cleanSummary(analysis: string | null | undefined): string {
  if (!analysis) return '-';
  const line = analysis
    .replace(/\r/g, '\n')
    .split('\n')
    .map((item) => item.trim())
    .find((item) => item.length > 0 && !item.startsWith('#'));

  return line ? line.slice(0, 220) : '-';
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

function formatTimestamp(value: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatPremiumTimestamp(value: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getSetupGrade(confidence: number, rr: number | null, orderType: string) {
  if (confidence >= 86 && (rr ?? 0) >= 1.8) {
    return 'A-Grade Setup | High Probability';
  }
  if (confidence >= 76 && (rr ?? 0) >= 1.4) {
    return orderType.includes('STOP')
      ? 'B-Grade Setup | Wait for Trigger'
      : 'B-Grade Setup | Structured Opportunity';
  }
  return orderType.includes('STOP') || orderType.includes('LIMIT')
    ? 'Selective Setup | Wait for Trigger'
    : 'Selective Setup | Active Monitoring';
}

function buildInvalidationNote(params: {
  direction: 'BUY' | 'SELL' | 'HOLD';
  orderType: string;
  stopLoss: number;
  symbol: string;
}) {
  const sl = formatPrice(params.symbol, params.stopLoss);
  if (params.orderType.includes('LIMIT') || params.orderType.includes('STOP')) {
    return `Batalkan setup jika struktur patah sebelum trigger atau harga menembus area invalidasi ${sl}.`;
  }
  return `Setup batal bila harga menembus level invalidasi ${sl}. Disiplin exit tanpa averaging.`;
}

function formatExecutionStatus(orderType: string) {
  if (orderType.includes('LIMIT') || orderType.includes('STOP')) return 'WAIT FOR TRIGGER';
  return 'ACTIVE MONITORING';
}

function getTimeframeExpiryMs(timeframe: string | null | undefined) {
  const value = String(timeframe || '').toLowerCase();
  if (value === '1m') return 30 * 60 * 1000;
  if (value === '5m') return 2 * 60 * 60 * 1000;
  if (value === '15m') return 6 * 60 * 60 * 1000;
  if (value === '30m') return 12 * 60 * 60 * 1000;
  if (value === '1h') return 24 * 60 * 60 * 1000;
  if (value === '4h') return 72 * 60 * 60 * 1000;
  return 7 * 24 * 60 * 60 * 1000;
}

function inferOrderType(
  direction: 'BUY' | 'SELL' | 'HOLD',
  currentPrice: number,
  entryPrice: number,
  preferredExecutionType?: 'INSTANT' | 'LIMIT' | 'STOP'
): string {
  if (!(currentPrice > 0) || !(entryPrice > 0) || direction === 'HOLD') return 'WAIT';

  if (preferredExecutionType === 'INSTANT') {
    return direction === 'BUY' ? 'BUY NOW' : 'SELL NOW';
  }

  if (preferredExecutionType === 'LIMIT') {
    return direction === 'BUY' ? 'BUY LIMIT' : 'SELL LIMIT';
  }

  if (preferredExecutionType === 'STOP') {
    return direction === 'BUY' ? 'BUY STOP' : 'SELL STOP';
  }

  if (direction === 'BUY') {
    return entryPrice > currentPrice ? 'BUY STOP' : 'BUY LIMIT';
  }

  return entryPrice < currentPrice ? 'SELL STOP' : 'SELL LIMIT';
}

function getExecutionValidationProfile(symbol: string, currentPrice: number) {
  const profile = getTelebotPipProfile(symbol);
  const benchmarkDistance = profile.distanceType === 'percent'
    ? currentPrice * profile.benchmarkDistance
    : profile.benchmarkDistance;

  return {
    benchmarkDistance,
    instantTolerance: Math.max(benchmarkDistance * 0.04, currentPrice * 0.00015),
    minPendingGap: Math.max(benchmarkDistance * 0.06, currentPrice * 0.0002),
    maxPendingGap: Math.max(benchmarkDistance * 1.5, currentPrice * 0.02),
  };
}

function resolveExecutionType(params: {
  direction: 'BUY' | 'SELL' | 'HOLD';
  currentPrice: number;
  entryPrice: number;
  symbol: string;
  preferredExecutionType?: 'INSTANT' | 'LIMIT' | 'STOP';
}): { ok: true; executionType: 'INSTANT' | 'LIMIT' | 'STOP'; orderType: string } | { ok: false; reason: string } {
  if (!(params.currentPrice > 0) || !(params.entryPrice > 0) || params.direction === 'HOLD') {
    return { ok: false, reason: 'harga market atau entry tidak valid untuk menentukan execution type' };
  }

  const gap = Math.abs(params.entryPrice - params.currentPrice);
  const profile = getExecutionValidationProfile(params.symbol, params.currentPrice);
  const structuralExecutionType = gap <= profile.instantTolerance
    ? 'INSTANT'
    : params.direction === 'BUY'
      ? (params.entryPrice > params.currentPrice ? 'STOP' : 'LIMIT')
      : (params.entryPrice < params.currentPrice ? 'STOP' : 'LIMIT');
  const preferredExecutionType = params.preferredExecutionType;

  if (preferredExecutionType === 'LIMIT') {
    const limitIsStructurallyValid =
      params.direction === 'BUY'
        ? params.entryPrice <= params.currentPrice
        : params.entryPrice >= params.currentPrice;

    if (!limitIsStructurallyValid) {
      return { ok: false, reason: 'LIMIT tidak valid karena posisi entry tidak sesuai struktur retracement' };
    }

    if (gap > profile.maxPendingGap) {
      return { ok: false, reason: 'LIMIT tidak valid karena entry terlalu jauh dari current price' };
    }

    return {
      ok: true,
      executionType: 'LIMIT',
      orderType: params.direction === 'BUY' ? 'BUY LIMIT' : 'SELL LIMIT',
    };
  }

  if (preferredExecutionType === 'STOP') {
    const stopIsStructurallyValid =
      params.direction === 'BUY'
        ? params.entryPrice >= params.currentPrice
        : params.entryPrice <= params.currentPrice;

    if (!stopIsStructurallyValid) {
      return { ok: false, reason: 'STOP tidak valid karena posisi entry tidak sesuai struktur breakout' };
    }

    if (gap > profile.maxPendingGap) {
      return { ok: false, reason: 'STOP tidak valid karena entry terlalu jauh dari current price' };
    }

    return {
      ok: true,
      executionType: 'STOP',
      orderType: params.direction === 'BUY' ? 'BUY STOP' : 'SELL STOP',
    };
  }

  if (preferredExecutionType === 'INSTANT') {
    if (gap <= profile.instantTolerance) {
      return {
        ok: true,
        executionType: 'INSTANT',
        orderType: params.direction === 'BUY' ? 'BUY NOW' : 'SELL NOW',
      };
    }
  }

  if (gap > profile.maxPendingGap) {
    const invalidType = preferredExecutionType || structuralExecutionType;
    return { ok: false, reason: `${invalidType} tidak valid karena entry terlalu jauh dari current price` };
  }

  const executionType = structuralExecutionType;

  if (executionType === 'INSTANT') {
    if (gap > profile.instantTolerance) {
      return { ok: false, reason: 'setup INSTANT tidak valid karena entry terlalu jauh dari current price' };
    }
    return {
      ok: true,
      executionType,
      orderType: params.direction === 'BUY' ? 'BUY NOW' : 'SELL NOW',
    };
  }

  if (executionType === 'LIMIT') {
    return {
      ok: true,
      executionType,
      orderType: params.direction === 'BUY' ? 'BUY LIMIT' : 'SELL LIMIT',
    };
  }

  return {
    ok: true,
    executionType,
    orderType: params.direction === 'BUY' ? 'BUY STOP' : 'SELL STOP',
  };
}

type SignalValidationResult = {
  ok: boolean;
  reason?: string;
};

function getTelebotPipProfile(symbol: string) {
  const normalized = symbol.toUpperCase();
  const isCrypto = Object.prototype.hasOwnProperty.call(CRYPTO, normalized);

  if (normalized.includes('XAU') || normalized.includes('GOLD') || normalized.includes('XAG') || normalized.includes('SILVER')) {
    return {
      distanceType: 'price' as const,
      benchmarkDistance: 7,
      label: '70 pips benchmark',
    };
  }

  if (normalized.endsWith('JPY') && normalized.length === 6) {
    return {
      distanceType: 'price' as const,
      benchmarkDistance: 0.5,
      label: '50 pips benchmark',
    };
  }

  if (isCrypto || normalized.includes('BTC')) {
    return {
      distanceType: 'percent' as const,
      benchmarkDistance: 0.008,
      label: '0.8% benchmark',
    };
  }

  if (normalized.includes('ETH') || normalized.includes('SOL') || normalized.includes('CRYPTO')) {
    return {
      distanceType: 'percent' as const,
      benchmarkDistance: 0.012,
      label: '1.2% benchmark',
    };
  }

  if (/^[A-Z]{6}$/.test(normalized)) {
    return {
      distanceType: 'price' as const,
      benchmarkDistance: 0.005,
      label: '50 pips benchmark',
    };
  }

  if (normalized.includes('NAS')) {
    return {
      distanceType: 'price' as const,
      benchmarkDistance: 100,
      label: '100 points benchmark',
    };
  }

  if (normalized.includes('US30')) {
    return {
      distanceType: 'price' as const,
      benchmarkDistance: 150,
      label: '150 points benchmark',
    };
  }

  if (normalized.includes('SPX')) {
    return {
      distanceType: 'price' as const,
      benchmarkDistance: 15,
      label: '15 points benchmark',
    };
  }

  if (normalized.includes('WTI') || normalized.includes('BRENT')) {
    return {
      distanceType: 'price' as const,
      benchmarkDistance: 1.5,
      label: '1.5 points benchmark',
    };
  }

  return {
    distanceType: 'percent' as const,
    benchmarkDistance: 0.01,
    label: '1.0% benchmark',
  };
}

function normalizeSignalToBenchmark(params: {
  direction: 'BUY' | 'SELL' | 'HOLD';
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  symbol: string;
  executionType?: 'INSTANT' | 'LIMIT' | 'STOP';
}) {
  if (params.direction === 'HOLD' || !(params.entryPrice > 0)) return null;

  const profile = getTelebotPipProfile(params.symbol);
  const benchmarkDistance = profile.distanceType === 'percent'
    ? params.entryPrice * profile.benchmarkDistance
    : profile.benchmarkDistance;

  const isValidStop = params.direction === 'BUY'
    ? params.stopLoss > 0 && params.stopLoss < params.entryPrice
    : params.stopLoss > params.entryPrice;
  const isValidTarget = params.direction === 'BUY'
    ? params.takeProfit1 > params.entryPrice
    : params.takeProfit1 > 0 && params.takeProfit1 < params.entryPrice;

  const parsedRisk = isValidStop ? Math.abs(params.entryPrice - params.stopLoss) : 0;
  const parsedReward = isValidTarget ? Math.abs(params.takeProfit1 - params.entryPrice) : 0;
  const parsedRR = parsedRisk > 0 && parsedReward > 0 ? parsedReward / parsedRisk : null;

  const shouldResetToBenchmark =
    !(parsedRisk > 0) ||
    !(parsedReward > 0) ||
    parsedRisk < benchmarkDistance * 0.6 ||
    parsedRisk > benchmarkDistance * 1.6 ||
    parsedReward < benchmarkDistance * 0.6 ||
    parsedReward > benchmarkDistance * 1.6 ||
    (parsedRR !== null && (parsedRR < 0.85 || parsedRR > 1.2));

  const finalDistance = shouldResetToBenchmark ? benchmarkDistance : parsedRisk;
  return {
    stopLoss: params.direction === 'BUY'
      ? params.entryPrice - finalDistance
      : params.entryPrice + finalDistance,
    takeProfit1: params.direction === 'BUY'
      ? params.entryPrice + finalDistance
      : params.entryPrice - finalDistance,
    benchmarkLabel: profile.label,
    usedBenchmark: shouldResetToBenchmark,
  };
}

function validateSignalStructure(params: {
  direction: 'BUY' | 'SELL' | 'HOLD';
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  currentPrice: number;
  symbol: string;
  executionType?: 'INSTANT' | 'LIMIT' | 'STOP';
}): SignalValidationResult {
  if (params.direction === 'HOLD') return { ok: false, reason: 'arah setup belum cukup jelas' };
  if (!(params.entryPrice > 0) || !(params.stopLoss > 0) || !(params.takeProfit1 > 0)) {
    return { ok: false, reason: 'entry, stop loss, atau take profit belum terbaca lengkap' };
  }

  if (params.direction === 'BUY' && !(params.stopLoss < params.entryPrice && params.takeProfit1 > params.entryPrice)) {
    return { ok: false, reason: 'struktur BUY tidak valid' };
  }

  if (params.direction === 'SELL' && !(params.stopLoss > params.entryPrice && params.takeProfit1 < params.entryPrice)) {
    return { ok: false, reason: 'struktur SELL tidak valid' };
  }

  const execution = resolveExecutionType({
    direction: params.direction,
    currentPrice: params.currentPrice,
    entryPrice: params.entryPrice,
    symbol: params.symbol,
    preferredExecutionType: params.executionType,
  });
  if (!execution.ok) {
    return { ok: false, reason: execution.reason };
  }

  return { ok: true };
}

function calculateRR(entry: number, stopLoss: number, takeProfit: number) {
  const risk = Math.abs(entry - stopLoss);
  const reward = Math.abs(takeProfit - entry);
  if (!(risk > 0) || !(reward > 0)) return null;
  return reward / risk;
}

function buildProgressBar(progress: number | null) {
  if (progress === null) return '[--------]';
  const normalized = Math.max(0, Math.min(100, Math.round(Math.abs(progress))));
  const filled = Math.max(0, Math.min(8, Math.round(normalized / 12.5)));
  return `[${'#'.repeat(filled)}${'-'.repeat(8 - filled)}]`;
}

const TELEBOT_RETRY_GUIDANCE = `
=== TELEBOT EXECUTION FILTER ===
Return exactly one actionable setup that is still executable near current market structure.
- Work harder to find the best clean setup before giving up.
- Do not default to BUY NOW / SELL NOW unless the entry is genuinely very near market and no cleaner pending setup exists.
- If retracement setup is valid, prefer BUY LIMIT / SELL LIMIT.
- If breakout setup is valid, prefer BUY STOP / SELL STOP.
- If your first pending entry would be too far from current price, refine the setup and search again for a nearer valid entry.
- Do not hallucinate entry, SL, or TP. If no clean setup exists after checking momentum, retracement, and breakout, return WAIT with a short natural Indonesian reason.
=== END TELEBOT EXECUTION FILTER ===`;

const TELEBOT_PENDING_PRIORITY_GUIDANCE = `
=== TELEBOT PENDING PRIORITY ===
Before returning WAIT, you must check these in order:
1. nearest valid retracement setup -> LIMIT
2. nearest valid breakout setup -> STOP
3. only if both are not clean, then consider INSTANT
4. only if all three are not clean, return WAIT

Do not give up early. If the first idea is too far, search again for a closer pending setup that still has valid structure.
=== END TELEBOT PENDING PRIORITY ===`;

const TELEBOT_PRIMARY_GUIDANCE = `
=== TELEBOT PRIMARY SIGNAL RULES ===
You are preparing a private execution-desk setup, not a generic bullish opinion.
- Return BUY or SELL only if entry, SL, TP, and execution type are all explicit and consistent.
- Prefer the cleanest executable setup near current structure.
- INSTANT is allowed only when current price is already sitting very near the planned entry and pending setup is not cleaner.
- If a LIMIT or STOP setup is cleaner, use that instead of forcing INSTANT.
- Never invent a direction from general bullish / bearish commentary without an explicit action call.
=== END TELEBOT PRIMARY SIGNAL RULES ===`;

const TELEBOT_NO_SIGNAL_GUIDANCE = `
=== TELEBOT NO SIGNAL RESPONSE ===
If there is still no clean setup after checking momentum, retracement, and breakout:
- return WAIT
- explain it in natural everyday Indonesian
- keep it short and clear
- mention that market is still nanggung / belum enak / belum rapi if appropriate
- do not force a fake signal
=== END TELEBOT NO SIGNAL RESPONSE ===`;

function shouldRetryTelebotSignal(reason: string) {
  const normalized = reason.toLowerCase();
  return (
    normalized.includes('belum ada setup valid') ||
    normalized.includes('belum cukup jelas') ||
    normalized.includes('belum terbaca') ||
    normalized.includes('terlalu jauh') ||
    normalized.includes('tidak valid')
  );
}

function buildTelebotNoSignalMessage(symbol: string, timeframe: string) {
  return `Untuk ${symbol} ${timeframe.toUpperCase()} sekarang belum ada setup yang bener-bener enak. Marketnya masih nanggung, jadi lebih aman tunggu dulu sampai entry yang rapi muncul.`;
}

function isGoldSymbol(symbol: string) {
  const normalized = symbol.toUpperCase();
  return normalized.includes('XAU') || normalized.includes('GOLD');
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function buildForcedPendingFallbackSignal(params: {
  symbol: string;
  timeframe: string;
  marketData: MarketData;
}): {
  parsed: {
    direction: 'BUY' | 'SELL';
    executionType: 'LIMIT' | 'STOP';
    entryPrice: number;
    stopLoss: number;
    takeProfit1: number;
    confidence: number;
  };
  executionDecision: { ok: true; executionType: 'LIMIT' | 'STOP'; orderType: string };
  analysis: string;
} | null {
  const symbol = params.symbol.toUpperCase();
  const candles = params.marketData.candles.slice(-5);
  const currentPrice = params.marketData.current_price || 0;
  if (!(currentPrice > 0) || candles.length < 3) return null;

  const recentHigh = Math.max(...candles.map((c) => c.high));
  const recentLow = Math.min(...candles.map((c) => c.low));
  const range = Math.max(recentHigh - recentLow, 0.8);
  const firstOpen = candles[0]?.open || currentPrice;
  const lastClose = candles[candles.length - 1]?.close || currentPrice;
  const bullishCount = candles.filter((c) => c.close >= c.open).length;
  const bearishCount = candles.length - bullishCount;
  const direction: 'BUY' | 'SELL' =
    lastClose > firstOpen || bullishCount >= bearishCount ? 'BUY' : 'SELL';

  const pipProfile = getTelebotPipProfile(symbol);
  const benchmarkDistance = pipProfile.distanceType === 'percent'
    ? currentPrice * pipProfile.benchmarkDistance
    : pipProfile.benchmarkDistance;
  const offsetFloor = isGoldSymbol(symbol) ? 0.8 : Math.max(benchmarkDistance * 0.12, currentPrice * 0.0002);
  const offsetCeiling = isGoldSymbol(symbol) ? 2.4 : Math.max(benchmarkDistance * 0.45, currentPrice * 0.008);
  const pendingOffset = clampNumber(range * 0.18, offsetFloor, offsetCeiling);
  const positionInRange = clampNumber((currentPrice - recentLow) / range, 0, 1);

  let executionType: 'LIMIT' | 'STOP';
  let entryPrice: number;

  if (direction === 'BUY') {
    const preferStop = positionInRange >= 0.62;
    executionType = preferStop ? 'STOP' : 'LIMIT';
    entryPrice = preferStop
      ? Math.max(currentPrice + pendingOffset, recentHigh + 0.2)
      : currentPrice - pendingOffset;
  } else {
    const preferStop = positionInRange <= 0.38;
    executionType = preferStop ? 'STOP' : 'LIMIT';
    entryPrice = preferStop
      ? Math.min(currentPrice - pendingOffset, recentLow - 0.2)
      : currentPrice + pendingOffset;
  }

  const stopLoss = direction === 'BUY' ? entryPrice - benchmarkDistance : entryPrice + benchmarkDistance;
  const takeProfit1 = direction === 'BUY' ? entryPrice + benchmarkDistance : entryPrice - benchmarkDistance;
  const orderType =
    direction === 'BUY'
      ? executionType === 'LIMIT' ? 'BUY LIMIT' : 'BUY STOP'
      : executionType === 'LIMIT' ? 'SELL LIMIT' : 'SELL STOP';
  const trendLabel = direction === 'BUY' ? 'bullish' : 'bearish';
  const benchmarkText = isGoldSymbol(symbol)
    ? 'SL/TP 1:1 sebesar 70 pips'
    : `SL/TP 1:1 mengikuti benchmark ${pipProfile.label}`;
  const analysis = `Fallback pending setup digunakan karena AI belum memberi setup utama yang cukup rapi. Struktur 5 candle terakhir masih ${trendLabel}, sehingga desk menyiapkan ${orderType} terdekat dengan ${benchmarkText} agar tetap ada order yang bisa dipantau.`;

  return {
    parsed: {
      direction,
      executionType,
      entryPrice,
      stopLoss,
      takeProfit1,
      confidence: 74,
    },
    executionDecision: {
      ok: true,
      executionType,
      orderType,
    },
    analysis,
  };
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
  const currentPrice = marketData.current_price || 0;
  const analysisAttempts = [
    `${formatted}\n\n${TELEBOT_PRIMARY_GUIDANCE}`,
    `${formatted}\n\n${TELEBOT_PRIMARY_GUIDANCE}\n\n${TELEBOT_RETRY_GUIDANCE}`,
    `${formatted}\n\n${TELEBOT_PRIMARY_GUIDANCE}\n\n${TELEBOT_RETRY_GUIDANCE}\n\n${TELEBOT_PENDING_PRIORITY_GUIDANCE}`,
    `${formatted}\n\n${TELEBOT_PRIMARY_GUIDANCE}\n\n${TELEBOT_RETRY_GUIDANCE}\n\n${TELEBOT_PENDING_PRIORITY_GUIDANCE}\n\n${TELEBOT_NO_SIGNAL_GUIDANCE}`,
  ];
  let selectedAnalysis: string | null = null;
  let parsed: ReturnType<typeof parseTelebotSignalFromAnalysis> = null;
  let entry = 0;
  let stopLoss = 0;
  let takeProfit1 = 0;
  let confidence = 72;
  let executionDecision: ReturnType<typeof resolveExecutionType> | null = null;
  let lastFailureMessage = `Belum ada setup valid untuk ${symbol} ${timeframe.toUpperCase()}. Coba pair atau timeframe lain.`;

  for (let attemptIndex = 0; attemptIndex < analysisAttempts.length; attemptIndex++) {
    const ai = await analyzeWithGroq(analysisAttempts[attemptIndex]);

    if (!ai.success || !ai.analysis) {
      lastFailureMessage = `Analisa ${symbol} ${timeframe.toUpperCase()} sedang dicoba ulang untuk cari setup yang lebih valid.`;
      if (attemptIndex < analysisAttempts.length - 1) continue;
      break;
    }

    const attemptParsed = parseTelebotSignalFromAnalysis(ai.analysis, 'forex', symbol, timeframe);
    if (!attemptParsed || attemptParsed.direction === 'HOLD') {
      lastFailureMessage = buildTelebotNoSignalMessage(symbol, timeframe);
      if (attemptIndex < analysisAttempts.length - 1) continue;
      break;
    }

    const normalizedLevels = normalizeSignalToBenchmark({
      direction: attemptParsed.direction,
      entryPrice: attemptParsed.entryPrice,
      stopLoss: attemptParsed.stopLoss,
      takeProfit1: attemptParsed.takeProfit1,
      symbol,
      executionType: attemptParsed.executionType,
    });
    if (!normalizedLevels) {
      lastFailureMessage = buildTelebotNoSignalMessage(symbol, timeframe);
      if (attemptIndex < analysisAttempts.length - 1) continue;
      break;
    }

    attemptParsed.stopLoss = normalizedLevels.stopLoss;
    attemptParsed.takeProfit1 = normalizedLevels.takeProfit1;

    const validation = !(currentPrice > 0)
      ? { ok: false, reason: 'harga market tidak tersedia' }
      : validateSignalStructure({
          direction: attemptParsed.direction,
          entryPrice: attemptParsed.entryPrice,
          stopLoss: attemptParsed.stopLoss,
          takeProfit1: attemptParsed.takeProfit1,
          currentPrice,
          symbol,
          executionType: attemptParsed.executionType,
        });
    if (!validation.ok) {
      lastFailureMessage = `Setup ${symbol} ${timeframe.toUpperCase()} ditolak: ${validation.reason || 'entry/SL/TP belum cukup valid'}.`;
      if (attemptIndex < analysisAttempts.length - 1 && shouldRetryTelebotSignal(validation.reason || '')) continue;
      break;
    }

    const attemptEntry = attemptParsed.entryPrice;
    const attemptStopLoss = attemptParsed.stopLoss || 0;
    const attemptTakeProfit1 = attemptParsed.takeProfit1 || 0;
    const attemptExecutionDecision = resolveExecutionType({
      direction: attemptParsed.direction,
      currentPrice,
      entryPrice: attemptEntry,
      symbol,
      preferredExecutionType: attemptParsed.executionType,
    });
    if (!attemptExecutionDecision.ok) {
      lastFailureMessage = `Setup ${symbol} ${timeframe.toUpperCase()} ditolak: ${attemptExecutionDecision.reason}.`;
      if (attemptIndex < analysisAttempts.length - 1 && shouldRetryTelebotSignal(attemptExecutionDecision.reason)) continue;
      break;
    }

    selectedAnalysis = ai.analysis;
    parsed = attemptParsed;
    entry = attemptEntry;
    stopLoss = attemptStopLoss;
    takeProfit1 = attemptTakeProfit1;
    confidence = typeof attemptParsed.confidence === 'number' ? Math.round(attemptParsed.confidence) : 72;
    executionDecision = attemptExecutionDecision;
    break;
  }

  if (!selectedAnalysis || !parsed || !executionDecision || !executionDecision.ok) {
    const forcedPendingFallback = buildForcedPendingFallbackSignal({
      symbol,
      timeframe,
      marketData,
    });

    if (forcedPendingFallback) {
      selectedAnalysis = forcedPendingFallback.analysis;
      parsed = {
        type: 'forex',
        symbol,
        timeframe,
        direction: forcedPendingFallback.parsed.direction,
        executionType: forcedPendingFallback.parsed.executionType,
        entryPrice: forcedPendingFallback.parsed.entryPrice,
        stopLoss: forcedPendingFallback.parsed.stopLoss,
        takeProfit1: forcedPendingFallback.parsed.takeProfit1,
        confidence: forcedPendingFallback.parsed.confidence,
      };
      entry = forcedPendingFallback.parsed.entryPrice;
      stopLoss = forcedPendingFallback.parsed.stopLoss;
      takeProfit1 = forcedPendingFallback.parsed.takeProfit1;
      confidence = forcedPendingFallback.parsed.confidence;
      executionDecision = forcedPendingFallback.executionDecision;
    }
  }

  if (!selectedAnalysis || !parsed || !executionDecision || !executionDecision.ok) {
    return {
      ok: false as const,
      message: lastFailureMessage,
    };
  }

  const orderType = executionDecision.orderType;
  const rr = calculateRR(entry, stopLoss, takeProfit1);
  const setupGrade = getSetupGrade(confidence, rr, orderType);
  const invalidationNote = buildInvalidationNote({
    direction: parsed.direction,
    orderType,
    stopLoss,
    symbol,
  });
  const thesis = cleanSummary(selectedAnalysis);
  const profile = await getTelebotUserProfile(params.userId);
  const tradePlan = profile
    ? calculateTelebotTradePlan({
        symbol,
        entryPrice: entry,
        stopLoss,
        takeProfit1,
        balanceAmount: profile.balanceAmount,
        riskPercent: profile.riskPercent,
        setupStyle: profile.setupStyle,
      })
    : null;

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
    await saveTelebotSignalExecution({
      userId: params.userId,
      chatId: params.chatId,
      signalId,
      symbol,
      timeframe,
      executionType: orderType,
      setupGrade,
      invalidationNote,
      recommendedEntry: entry,
    });
  }

  const text = [
    '<b>ARRA7 TELEBOT | Private AI Execution Desk</b>',
    '<i>Decision-ready trade briefing</i>',
    '',
    '<b>Desk View</b>',
    `Instrument      : <b>${escapeHtml(symbol)}</b>`,
    `Timeframe       : <b>${escapeHtml(timeframe.toUpperCase())}</b>`,
    `Bias            : <b>${escapeHtml(parsed.direction)}</b>`,
    `Execution Type  : <b>${escapeHtml(orderType)}</b>`,
    `Setup Grade     : <b>${escapeHtml(setupGrade)}</b>`,
    `Desk Status     : <b>${escapeHtml(formatExecutionStatus(orderType))}</b>`,
    '',
    '<b>Execution Brief</b>',
    `Current Price    : <code>${escapeHtml(formatPrice(symbol, currentPrice))}</code>`,
    `Entry            : <code>${escapeHtml(formatPrice(symbol, entry))}</code>`,
    `Stop Loss        : <code>${escapeHtml(formatPrice(symbol, stopLoss))}</code>`,
    `Take Profit      : <code>${escapeHtml(formatPrice(symbol, takeProfit1))}</code>`,
    rr ? `Risk / Reward    : <b>1:${escapeHtml(rr.toFixed(2))}</b>` : 'Risk / Reward    : <b>-</b>',
    `Confidence       : <b>${escapeHtml(String(confidence))}%</b>`,
    `Invalidation     : <i>${escapeHtml(invalidationNote)}</i>`,
    '',
    '<b>Risk Desk</b>',
    profile ? `Capital          : <b>${escapeHtml(profile.balanceCurrency)} ${escapeHtml(Number(profile.balanceAmount || 0).toLocaleString('en-US', { maximumFractionDigits: 2 }))}</b>` : 'Capital          : <b>Belum diatur</b>',
    profile ? `Risk Profile     : <b>${escapeHtml(String(profile.riskPercent))}% | ${escapeHtml(formatTelebotSetupStyle(profile.setupStyle))}</b>` : 'Risk Profile     : <b>Gunakan menu Balance / Risk Setup</b>',
    tradePlan ? `Risk Amount      : <b>${escapeHtml(profile?.balanceCurrency || 'USD')} ${escapeHtml(tradePlan.riskAmount.toFixed(2))}</b>` : 'Risk Amount      : <b>-</b>',
    tradePlan ? `Lot Recommendation: <b>${escapeHtml(String(tradePlan.recommendedLot))}</b>` : 'Lot Recommendation: <b>Isi balance untuk sizing</b>',
    tradePlan && tradePlan.projectedProfit != null ? `Target Projection : <b>${escapeHtml(profile?.balanceCurrency || 'USD')} ${escapeHtml(tradePlan.projectedProfit.toFixed(2))}</b>` : 'Target Projection : <b>-</b>',
    '',
    '<b>Desk Thesis</b>',
    `${escapeHtml(thesis)}`,
    tradePlan ? escapeHtml(tradePlan.sizingNote) : 'Isi menu Balance agar desk bisa menghitung sizing dan risk amount yang lebih presisi.',
    '',
    signalId ? `Reference ID    : <code>#${signalId}</code>` : '',
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

function evaluateExecutionLiveState(params: {
  direction: 'BUY' | 'SELL' | 'HOLD';
  currentPrice: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  executionType?: string | null;
  timeframe?: string | null;
  createdAt?: string | null;
}) {
  const orderType = params.executionType || inferOrderType(params.direction, params.currentPrice, params.entryPrice);
  const now = Date.now();
  const createdAt = params.createdAt ? new Date(params.createdAt).getTime() : now;
  const expired = Number.isFinite(createdAt) && now - createdAt > getTimeframeExpiryMs(params.timeframe);

  const isTriggered = (() => {
    if (orderType === 'BUY LIMIT') return params.currentPrice <= params.entryPrice;
    if (orderType === 'BUY STOP') return params.currentPrice >= params.entryPrice;
    if (orderType === 'SELL LIMIT') return params.currentPrice >= params.entryPrice;
    if (orderType === 'SELL STOP') return params.currentPrice <= params.entryPrice;
    return true;
  })();

  if (params.direction === 'BUY') {
    if (params.currentPrice <= params.stopLoss) return { label: 'SL HIT', orderType };
    if (params.currentPrice >= params.takeProfit1) return { label: 'TP HIT', orderType };
    if (!isTriggered) return { label: expired ? 'EXPIRED' : 'WAITING ENTRY', orderType };
    if (params.currentPrice > params.entryPrice) return { label: 'IN PROFIT', orderType };
    return { label: 'TRIGGERED', orderType };
  }

  if (params.direction === 'SELL') {
    if (params.currentPrice >= params.stopLoss) return { label: 'SL HIT', orderType };
    if (params.currentPrice <= params.takeProfit1) return { label: 'TP HIT', orderType };
    if (!isTriggered) return { label: expired ? 'EXPIRED' : 'WAITING ENTRY', orderType };
    if (params.currentPrice < params.entryPrice) return { label: 'IN PROFIT', orderType };
    return { label: 'TRIGGERED', orderType };
  }

  return { label: 'WATCHING', orderType };
}

export function buildLiveStatusKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: 'Refresh Live Status', callback_data: 'tele:live' },
        { text: 'Use Recommended Entry', callback_data: 'tele:useentry' },
      ],
    ],
  };
}

export async function buildLiveStatusMessage(userId: string, note?: string) {
  const latest = await getLatestTelebotSignalExecution(userId);
  if (!latest) {
    return [
      '<b>ARRA7 TELEBOT - Live Status</b>',
      '',
      note || 'Belum ada setup yang sedang dipantau oleh desk Anda.',
      'Buka menu Signal untuk membuat setup pertama Anda.',
    ].join('\n');
  }

  try {
    const currentPrice = (await getMarketData(latest.symbol as ForexPair, (latest.timeframe || '1h') as Timeframe)).current_price || 0;
    const referenceEntry = latest.actualEntry || latest.recommendedEntry;
    const state = evaluateExecutionLiveState({
      direction: latest.direction,
      currentPrice,
      entryPrice: referenceEntry,
      stopLoss: latest.stopLoss,
      takeProfit1: latest.takeProfit1,
      executionType: latest.executionType,
      timeframe: latest.timeframe,
      createdAt: latest.createdAt,
    });
    const progress = calculateProgressPercent({
      direction: latest.direction,
      entryPrice: referenceEntry,
      stopLoss: latest.stopLoss,
      takeProfit1: latest.takeProfit1,
    }, currentPrice);

    const entrySource = latest.actualEntry ? 'Trader actual entry' : 'Desk recommended entry';
    return [
      '<b>ARRA7 TELEBOT - Live Status</b>',
      '<i>Private desk monitoring</i>',
      '',
      note || 'Status live setup terbaru Anda.',
      '',
      `Reference ID      : <code>#${latest.signalId}</code>`,
      `Instrument        : <b>${escapeHtml(latest.symbol)}</b>`,
      `Timeframe         : <b>${escapeHtml(String(latest.timeframe || '-').toUpperCase())}</b>`,
      `Execution Type    : <b>${escapeHtml(state.orderType)}</b>`,
      latest.setupGrade ? `Setup Grade       : <b>${escapeHtml(latest.setupGrade)}</b>` : null,
      `Lifecycle Status  : <b>${escapeHtml(state.label)}</b>`,
      `Current Price     : <code>${escapeHtml(formatPrice(latest.symbol, currentPrice))}</code>`,
      `Recommended Entry : <code>${escapeHtml(formatPrice(latest.symbol, latest.recommendedEntry))}</code>`,
      `Actual Entry      : <code>${escapeHtml(formatPrice(latest.symbol, latest.actualEntry || 0))}</code>`,
      `Entry Source      : <b>${escapeHtml(entrySource)}</b>`,
      `SL / TP           : <code>${escapeHtml(formatPrice(latest.symbol, latest.stopLoss))}</code> / <code>${escapeHtml(formatPrice(latest.symbol, latest.takeProfit1))}</code>`,
      `Progress          : <code>${escapeHtml(buildProgressBar(progress))}</code>`,
      latest.invalidationNote ? `Invalidation      : <i>${escapeHtml(latest.invalidationNote)}</i>` : null,
      `Updated At        : <b>${escapeHtml(formatPremiumTimestamp(latest.updatedAt || new Date().toISOString()))}</b>`,
      '',
      'Gunakan <code>/entry 1932.50</code> jika actual entry Anda berbeda dari desk recommendation.',
    ].filter(Boolean).join('\n');
  } catch {
    return [
      '<b>ARRA7 TELEBOT - Live Status</b>',
      '',
      'Data market live belum bisa diambil sekarang.',
      `Setup terakhir: <b>${escapeHtml(latest.symbol)}</b> ${escapeHtml(String(latest.timeframe || '-').toUpperCase())}`,
      latest.invalidationNote ? `Invalidation: <i>${escapeHtml(latest.invalidationNote)}</i>` : null,
      'Coba refresh lagi beberapa saat lagi.',
    ].filter(Boolean).join('\n');
  }
}

export async function buildTelegramResultsSummary(userId: string) {
  const rows = await getTelegramTrackedSignals(userId, 5);
  if (rows.length === 0) {
    return [
      '<b>ARRA7 TELEBOT | Desk Results</b>',
      '',
      'Belum ada setup yang tercatat pada desk Anda.',
      'Buka menu Signal lalu pilih pair dan timeframe untuk memulai track record pertama.',
    ].join('\n');
  }

  let closedInProfit = 0;
  let invalidated = 0;
  let activeDesk = 0;
  let waitingEntry = 0;

  const lines = [
    '<b>ARRA7 TELEBOT | Desk Results</b>',
    '<i>Private execution track record</i>',
    '',
  ];

  for (const row of rows) {
    let statusLabel = row.status;
    let progressValue: number | null = null;
    let summaryBucket: 'profit' | 'invalidated' | 'active' | 'waiting' = 'active';

    if (row.status === 'PENDING') {
      try {
        const live = await getMarketData(row.symbol as ForexPair, (row.timeframe || '1h') as Timeframe);
        const state = evaluateExecutionLiveState({
          direction: row.direction,
          currentPrice: live.current_price || 0,
          entryPrice: row.entryPrice,
          stopLoss: row.stopLoss,
          takeProfit1: row.takeProfit1,
          executionType: row.executionType,
          timeframe: row.timeframe,
          createdAt: row.createdAt,
        });
        const progress = calculateProgressPercent(row, live.current_price || 0);
        progressValue = progress;
        if (state.label === 'WAITING ENTRY') {
          statusLabel = 'WAITING ENTRY';
          summaryBucket = 'waiting';
        } else if (state.label === 'TP HIT') {
          statusLabel = 'TARGET REACHED';
          summaryBucket = 'profit';
          progressValue = 100;
        } else if (state.label === 'SL HIT') {
          statusLabel = 'INVALIDATED';
          summaryBucket = 'invalidated';
          progressValue = 100;
        } else if (state.label === 'EXPIRED') {
          statusLabel = 'EXPIRED | setup invalidated';
          summaryBucket = 'invalidated';
        } else if (state.label === 'IN PROFIT') {
          statusLabel = progress !== null ? `IN PROFIT | ${progress.toFixed(0)}% to target` : 'IN PROFIT';
          summaryBucket = 'active';
        } else if (state.label === 'TRIGGERED') {
          statusLabel = 'TRIGGERED | desk monitoring';
          summaryBucket = 'active';
        } else {
          statusLabel = state.label;
        }
      } catch {
        statusLabel = 'ACTIVE | desk monitoring';
      }
    } else if (row.status === 'TP_HIT') {
      statusLabel = row.pipsResult != null ? `TARGET REACHED | +${row.pipsResult.toFixed(1)} pips` : 'TARGET REACHED';
      progressValue = 100;
      summaryBucket = 'profit';
    } else if (row.status === 'SL_HIT') {
      statusLabel = row.pipsResult != null ? `INVALIDATED | ${row.pipsResult.toFixed(1)} pips` : 'INVALIDATED';
      progressValue = 100;
      summaryBucket = 'invalidated';
    }

    if (summaryBucket === 'profit') closedInProfit += 1;
    if (summaryBucket === 'invalidated') invalidated += 1;
    if (summaryBucket === 'active') activeDesk += 1;
    if (summaryBucket === 'waiting') waitingEntry += 1;

    const rowLines = [
      `<b>#${row.signalId} | ${escapeHtml(row.symbol)} ${escapeHtml(String(row.timeframe || '-').toUpperCase())}</b>`,
      row.setupGrade ? `Setup Grade : <b>${escapeHtml(row.setupGrade)}</b>` : null,
      row.executionType ? `Execution   : <b>${escapeHtml(row.executionType)}</b>` : null,
      `Status      : <b>${escapeHtml(statusLabel)}</b>`,
      `Progress    : <code>${escapeHtml(buildProgressBar(progressValue))}</code>`,
      `Entry       : <code>${escapeHtml(formatPrice(row.symbol, row.entryPrice))}</code>`,
      `TP / SL     : <code>${escapeHtml(formatPrice(row.symbol, row.takeProfit1))}</code> / <code>${escapeHtml(formatPrice(row.symbol, row.stopLoss))}</code>`,
      `Issued At   : <b>${escapeHtml(formatTimestamp(row.createdAt))}</b>`,
      ''
    ].filter(Boolean) as string[];

    lines.push(...rowLines);
  }

  lines.splice(3, 0,
    `<b>Desk Summary</b>`,
    `Closed in profit : <b>${closedInProfit}</b>`,
    `Invalidated      : <b>${invalidated}</b>`,
    `Active desk      : <b>${activeDesk}</b>`,
    `Waiting entry    : <b>${waitingEntry}</b>`,
    ''
  );

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
