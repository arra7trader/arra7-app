import {
  FOREX_PAIRS,
  ForexPair,
  formatMarketDataForAI,
  getMarketData,
  PAIR_CATEGORIES,
  Timeframe,
} from './market-data';
import { analyzeWithGroq } from './groq-ai';
import { getTelebotUserProfile } from './turso';
import { calculateTelebotTradePlan, formatTelebotSetupStyle } from './telebot-trade-plan';
import {
  getLatestTelebotSignalExecution,
  getTelegramTrackedSignals,
  parseSignalFromAnalysis,
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
    '<i>Professional AI signal desk</i>',
    '',
    `Halo <b>${escapeHtml(firstName)}</b>, selamat datang.`,
    'Akses bot ini hanya terbuka untuk member yang sudah aktif dan telah di-approve.',
    '',
    '<b>Cara mulai</b>',
    `1. Aktivasi TELEBOT di <a href="${escapeHtml(telebotUrl)}">halaman pembayaran resmi</a>`,
    '2. Pastikan username Telegram Anda sudah di-approve admin',
    '3. Setelah approved, cukup kirim <code>/start</code> dan bot akan terhubung otomatis',
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
    '<i>Access granted</i>',
    '',
    `Halo <b>${escapeHtml(firstName)}</b>, akun Anda berhasil dikenali.`,
    'Akses TELEBOT sudah aktif dan akun Telegram Anda terhubung otomatis.',
    '',
    '<b>Menu Utama</b>',
    '- Signal: pilih pair dan timeframe',
    '- Live Status: pantau actual entry dan status setup',
    '- Balance: isi modal untuk sizing otomatis',
  ].join('\n');
}

export function buildActiveWelcomeMessage(firstName: string, accessLabel: string) {
  return [
    '<b>ARRA7 TELEBOT</b>',
    '<i>Professional AI signal desk</i>',
    '',
    `Halo <b>${escapeHtml(firstName)}</b>.`,
    `Status akses: <b>${escapeHtml(accessLabel)}</b>`,
    '',
    '<b>Menu Utama</b>',
    '- Signal: buka trade setup baru',
    '- Live Status: pantau actual entry dan progres setup',
    '- Balance / Risk Setup: atur modal dan risk profile',
  ].join('\n');
}

export function buildLockedAccessMessage(membership: string, detail?: string) {
  return [
    '<b>ARRA7 TELEBOT</b>',
    '<i>Access pending</i>',
    '',
    detail || 'Akun Anda sudah terhubung, namun akses TELEBOT belum aktif.',
    `Membership saat ini: <b>${escapeHtml(membership)}</b>`,
    'Silakan tunggu approval admin atau aktifkan paket TELEBOT di web ARRA7.',
  ].join('\n');
}

export function buildHelpMessage() {
  return [
    '<b>ARRA7 TELEBOT - Bantuan</b>',
    '',
    '<b>Navigasi</b>',
    '- Signal: pilih kategori, pair, lalu timeframe',
    '- Live Status: lihat status setup terakhir dan actual entry',
    '- Balance: isi modal untuk rekomendasi size',
    '- Risk Setup: atur risk % dan gaya setup',
    '- Hasil: lihat progres signal terbaru',
    '- Status: cek akses dan profil eksekusi',
    '',
    '<b>Perintah</b>',
    '<code>/start</code> tampilkan menu utama',
    '<code>/balance 1000</code> set balance modal',
    '<code>/risk 1</code> set risk per trade (%)',
    '<code>/setup standard</code> pilih setup mode',
    '<code>/entry 1932.50</code> simpan actual entry terakhir',
    '<code>/live</code> tampilkan live status setup terakhir',
    '<code>/status</code> cek status akses',
    '<code>/help</code> tampilkan bantuan',
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
    '<b>ARRA7 TELEBOT - Status</b>',
    '',
    `Akses      : <b>${escapeHtml(params.accessLabel)}</b>`,
    `Chat ID    : <code>${escapeHtml(params.chatId)}</code>`,
    params.balanceText ? `Balance    : <b>${escapeHtml(params.balanceText)}</b>` : null,
    params.riskText ? `Risk       : <b>${escapeHtml(params.riskText)}</b>` : null,
    params.setupText ? `Setup      : <b>${escapeHtml(params.setupText)}</b>` : null,
    showQuota ? `Kuota Hari : <b>${escapeHtml(formatQuota(params.remaining))}/${escapeHtml(formatQuota(params.limit))}</b>` : `Kuota Hari : <b>Unlimited</b>`,
    showQuota ? `Reset      : <b>${escapeHtml(params.resetText)}</b>` : `Reset      : <b>Tidak ada batas harian</b>`,
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

function hasValidSignalStructure(signal: {
  direction: 'BUY' | 'SELL' | 'HOLD';
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
}) {
  if (signal.direction === 'HOLD') return false;
  if (!(signal.entryPrice > 0) || !(signal.stopLoss > 0) || !(signal.takeProfit1 > 0)) return false;

  if (signal.direction === 'BUY' && !(signal.stopLoss < signal.entryPrice && signal.takeProfit1 > signal.entryPrice)) {
    return false;
  }

  if (signal.direction === 'SELL' && !(signal.stopLoss > signal.entryPrice && signal.takeProfit1 < signal.entryPrice)) {
    return false;
  }

  const risk = Math.abs(signal.entryPrice - signal.stopLoss);
  const reward = Math.abs(signal.takeProfit1 - signal.entryPrice);
  if (!(risk > 0) || !(reward > 0)) return false;

  return reward / risk >= 1.2;
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
      message: `Analisa ${symbol} ${timeframe.toUpperCase()} belum bisa diproses sekarang.`,
    };
  }

  const parsed = parseSignalFromAnalysis(ai.analysis, 'forex', symbol, timeframe);
  if (!parsed || parsed.direction === 'HOLD') {
    return {
      ok: false as const,
      message: `Belum ada setup valid untuk ${symbol} ${timeframe.toUpperCase()}. Coba pair atau timeframe lain.`,
    };
  }

  const currentPrice = marketData.current_price || 0;
  if (!(currentPrice > 0) || !hasValidSignalStructure(parsed)) {
    return {
      ok: false as const,
      message: `Setup ${symbol} ${timeframe.toUpperCase()} ditolak karena entry/SL/TP belum cukup valid. Coba pair atau timeframe lain.`,
    };
  }

  const entry = parsed.entryPrice;
  const stopLoss = parsed.stopLoss || 0;
  const takeProfit1 = parsed.takeProfit1 || 0;
  const orderType = inferOrderType(parsed.direction, currentPrice, entry, parsed.executionType);
  const rr = calculateRR(entry, stopLoss, takeProfit1);
  const confidence = typeof parsed.confidence === 'number' ? Math.round(parsed.confidence) : 72;
  const thesis = cleanSummary(ai.analysis);
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
      recommendedEntry: entry,
    });
  }

  const text = [
    '<b>ARRA7 TELEBOT | Trade Setup</b>',
    '',
    `Instrument : <b>${escapeHtml(symbol)}</b>`,
    `Timeframe  : <b>${escapeHtml(timeframe.toUpperCase())}</b>`,
    `Bias       : <b>${escapeHtml(parsed.direction)}</b>`,
    `Execution  : <b>${escapeHtml(orderType)}</b>`,
    '',
    '<b>Execution Plan</b>',
    `Current Price : <code>${escapeHtml(formatPrice(symbol, currentPrice))}</code>`,
    `Entry         : <code>${escapeHtml(formatPrice(symbol, entry))}</code>`,
    `Stop Loss     : <code>${escapeHtml(formatPrice(symbol, stopLoss))}</code>`,
    `Take Profit   : <code>${escapeHtml(formatPrice(symbol, takeProfit1))}</code>`,
    `Confidence    : <b>${escapeHtml(String(confidence))}%</b>`,
    rr ? `Risk/Reward  : <b>1:${escapeHtml(rr.toFixed(2))}</b>` : 'Risk/Reward  : <b>-</b>',
    '',
    '<b>Trade Plan</b>',
    profile ? `Balance       : <b>${escapeHtml(profile.balanceCurrency)} ${escapeHtml(Number(profile.balanceAmount || 0).toLocaleString('en-US', { maximumFractionDigits: 2 }))}</b>` : 'Balance       : <b>Belum diatur</b>',
    profile ? `Risk Profile  : <b>${escapeHtml(String(profile.riskPercent))}% | ${escapeHtml(formatTelebotSetupStyle(profile.setupStyle))}</b>` : 'Risk Profile  : <b>Gunakan menu Balance / Risk Setup</b>',
    tradePlan ? `Risk Amount   : <b>${escapeHtml(profile?.balanceCurrency || 'USD')} ${escapeHtml(tradePlan.riskAmount.toFixed(2))}</b>` : 'Risk Amount   : <b>-</b>',
    tradePlan ? `Lot / Size    : <b>${escapeHtml(String(tradePlan.recommendedLot))}</b>` : 'Lot / Size    : <b>Set balance dulu untuk sizing</b>',
    tradePlan && tradePlan.projectedProfit != null ? `Target Profit : <b>${escapeHtml(profile?.balanceCurrency || 'USD')} ${escapeHtml(tradePlan.projectedProfit.toFixed(2))}</b>` : 'Target Profit : <b>-</b>',
    tradePlan ? `Setup Style   : <b>${escapeHtml(tradePlan.setupLabel)}</b>` : 'Setup Style   : <b>-</b>',
    '',
    '<b>Market Thesis</b>',
    `${escapeHtml(thesis)}`,
    tradePlan ? '' : 'Tip: isi menu Balance dulu agar bot bisa hitung sizing dan risk plan.',
    tradePlan ? escapeHtml(tradePlan.sizingNote) : '',
    '',
    signalId ? `Reference ID : <code>#${signalId}</code>` : '',
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
}) {
  const orderType = params.executionType || inferOrderType(params.direction, params.currentPrice, params.entryPrice);

  if (params.direction === 'BUY') {
    if (params.currentPrice <= params.stopLoss) return { label: 'SL HIT', orderType };
    if (params.currentPrice >= params.takeProfit1) return { label: 'TP HIT', orderType };
    if (orderType === 'BUY LIMIT') return { label: params.currentPrice <= params.entryPrice ? 'TRIGGERED' : 'WAITING ENTRY', orderType };
    if (orderType === 'BUY STOP') return { label: params.currentPrice >= params.entryPrice ? 'TRIGGERED' : 'WAITING ENTRY', orderType };
    return { label: 'TRIGGERED', orderType };
  }

  if (params.direction === 'SELL') {
    if (params.currentPrice >= params.stopLoss) return { label: 'SL HIT', orderType };
    if (params.currentPrice <= params.takeProfit1) return { label: 'TP HIT', orderType };
    if (orderType === 'SELL LIMIT') return { label: params.currentPrice >= params.entryPrice ? 'TRIGGERED' : 'WAITING ENTRY', orderType };
    if (orderType === 'SELL STOP') return { label: params.currentPrice <= params.entryPrice ? 'TRIGGERED' : 'WAITING ENTRY', orderType };
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
      note || 'Belum ada setup yang dipantau.',
      'Silakan generate signal dulu dari menu Signal.',
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
    });
    const progress = calculateProgressPercent({
      direction: latest.direction,
      entryPrice: referenceEntry,
      stopLoss: latest.stopLoss,
      takeProfit1: latest.takeProfit1,
    }, currentPrice);

    return [
      '<b>ARRA7 TELEBOT - Live Status</b>',
      '',
      note || 'Status live setup terbaru Anda.',
      '',
      `Reference ID     : <code>#${latest.signalId}</code>`,
      `Instrument       : <b>${escapeHtml(latest.symbol)}</b>`,
      `Timeframe        : <b>${escapeHtml(String(latest.timeframe || '-').toUpperCase())}</b>`,
      `Execution Type   : <b>${escapeHtml(state.orderType)}</b>`,
      `Live Status      : <b>${escapeHtml(state.label)}</b>`,
      `Current Price    : <code>${escapeHtml(formatPrice(latest.symbol, currentPrice))}</code>`,
      `Recommended Entry: <code>${escapeHtml(formatPrice(latest.symbol, latest.recommendedEntry))}</code>`,
      `Actual Entry     : <code>${escapeHtml(formatPrice(latest.symbol, latest.actualEntry || 0))}</code>`,
      `SL / TP          : <code>${escapeHtml(formatPrice(latest.symbol, latest.stopLoss))}</code> / <code>${escapeHtml(formatPrice(latest.symbol, latest.takeProfit1))}</code>`,
      `Progress         : <code>${escapeHtml(buildProgressBar(progress))}</code>`,
      '',
      'Gunakan <code>/entry 1932.50</code> untuk menyimpan actual entry terbaru Anda.',
    ].join('\n');
  } catch {
    return [
      '<b>ARRA7 TELEBOT - Live Status</b>',
      '',
      'Data market live belum bisa diambil sekarang.',
      `Setup terakhir: <b>${escapeHtml(latest.symbol)}</b> ${escapeHtml(String(latest.timeframe || '-').toUpperCase())}`,
      'Coba refresh lagi beberapa saat lagi.',
    ].join('\n');
  }
}

export async function buildTelegramResultsSummary(userId: string) {
  const rows = await getTelegramTrackedSignals(userId, 8);
  if (rows.length === 0) {
    return [
      '<b>ARRA7 TELEBOT | Hasil</b>',
      '',
      'Belum ada signal yang tercatat.',
      'Silakan buka menu Signal lalu pilih pair dan timeframe untuk memulai.',
    ].join('\n');
  }

  const lines = [
    '<b>ARRA7 TELEBOT | Signal Results</b>',
    '<i>Ringkasan performa signal terbaru</i>',
    '',
  ];

  for (const row of rows) {
    let statusLabel = row.status;
    let progressValue: number | null = null;

    if (row.status === 'PENDING') {
      try {
        const live = await getMarketData(row.symbol as ForexPair, (row.timeframe || '1h') as Timeframe);
        const progress = calculateProgressPercent(row, live.current_price || 0);
        progressValue = progress;
        if (progress !== null) {
          statusLabel = progress >= 0
            ? `ACTIVE | ${progress.toFixed(0)}% to TP`
            : `ACTIVE | ${Math.abs(progress).toFixed(0)}% to SL`;
        } else {
          statusLabel = 'ACTIVE';
        }
      } catch {
        statusLabel = 'ACTIVE';
      }
    } else if (row.status === 'TP_HIT') {
      statusLabel = row.pipsResult != null ? `TP HIT | +${row.pipsResult.toFixed(1)} pips` : 'TP HIT';
      progressValue = 100;
    } else if (row.status === 'SL_HIT') {
      statusLabel = row.pipsResult != null ? `SL HIT | ${row.pipsResult.toFixed(1)} pips` : 'SL HIT';
      progressValue = 100;
    }

    lines.push(
      `<b>#${row.signalId} | ${escapeHtml(row.symbol)} ${escapeHtml(String(row.timeframe || '-').toUpperCase())}</b>`,
      `Direction : <b>${escapeHtml(row.direction)}</b>`,
      `Status    : <b>${escapeHtml(statusLabel)}</b>`,
      `Progress  : <code>${escapeHtml(buildProgressBar(progressValue))}</code>`,
      `Entry     : <code>${escapeHtml(formatPrice(row.symbol, row.entryPrice))}</code>`,
      `TP / SL   : <code>${escapeHtml(formatPrice(row.symbol, row.takeProfit1))}</code> / <code>${escapeHtml(formatPrice(row.symbol, row.stopLoss))}</code>`,
      `Issued At : <b>${escapeHtml(formatTimestamp(row.createdAt))}</b>`,
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
