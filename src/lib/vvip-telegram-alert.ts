import { createHash } from 'crypto';
import getTursoClient from './turso';
import { sendTelegramMessage } from './telegram';

type TradeDirection = 'BUY' | 'SELL';

interface NativeSignalLike {
    direction?: string;
    type?: string;
    entryPrice?: number;
    entry?: number;
    stopLoss?: number;
    sl?: number;
    takeProfit1?: number;
    tp?: number;
    confidence?: number;
}

interface NotifyVvipBestSignalParams {
    pair: string;
    timeframe: string;
    signal: NativeSignalLike | null;
    analysis?: string | null;
    marketPrice?: number;
    sourceUserId?: string;
}

export interface NotifyVvipBestSignalResult {
    triggered: boolean;
    sent: number;
    failed: number;
    reason:
    | 'disabled'
    | 'no_signal'
    | 'non_tradable'
    | 'incomplete_levels'
    | 'low_confidence'
    | 'low_rr'
    | 'db_unavailable'
    | 'no_vvip_recipients'
    | 'duplicate_signal'
    | 'cooldown_active'
    | 'sent'
    | 'send_failed';
    signalHash?: string;
}

const DEFAULT_MIN_CONFIDENCE = 80;
const DEFAULT_MIN_RR = 1.8;
const DEFAULT_COOLDOWN_MINUTES = 45;

function toFiniteNumber(value: unknown): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    return value;
}

function normalizeDirection(signal: NativeSignalLike | null): TradeDirection | null {
    const raw = String(signal?.direction || signal?.type || '').toUpperCase();
    if (raw === 'BUY' || raw === 'SELL') return raw;
    return null;
}

function normalizeConfidence(value: unknown): number | null {
    const numeric = toFiniteNumber(value);
    if (numeric === null) return null;
    if (numeric <= 1) return numeric * 100;
    return numeric;
}

function getEntry(signal: NativeSignalLike | null, marketPrice?: number): number | null {
    return toFiniteNumber(signal?.entryPrice)
        ?? toFiniteNumber(signal?.entry)
        ?? toFiniteNumber(marketPrice)
        ?? null;
}

function getStopLoss(signal: NativeSignalLike | null): number | null {
    return toFiniteNumber(signal?.stopLoss)
        ?? toFiniteNumber(signal?.sl)
        ?? null;
}

function getTakeProfit(signal: NativeSignalLike | null): number | null {
    return toFiniteNumber(signal?.takeProfit1)
        ?? toFiniteNumber(signal?.tp)
        ?? null;
}

function calculateRR(
    direction: TradeDirection,
    entry: number,
    stopLoss: number,
    takeProfit: number
): number | null {
    const risk = direction === 'BUY' ? entry - stopLoss : stopLoss - entry;
    const reward = direction === 'BUY' ? takeProfit - entry : entry - takeProfit;

    if (risk <= 0 || reward <= 0) return null;
    return reward / risk;
}

function getPriceDecimals(symbol: string, value: number): number {
    const upper = symbol.toUpperCase();
    if (upper.includes('JPY')) return 3;
    if (upper.includes('XAU') || upper.includes('XAG')) return 2;
    if (value >= 100) return 2;
    return 5;
}

function formatPrice(symbol: string, value: number): string {
    return value.toFixed(getPriceDecimals(symbol, value));
}

function parseEnvNumber(raw: string | undefined, fallback: number): number {
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
}

function escapeHtml(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function buildSignalHash(payload: {
    pair: string;
    timeframe: string;
    direction: TradeDirection;
    entry: number;
    stopLoss: number;
    takeProfit: number;
    confidence: number;
    rr: number;
}): string {
    const base = [
        payload.pair.toUpperCase(),
        payload.timeframe.toUpperCase(),
        payload.direction,
        payload.entry.toFixed(5),
        payload.stopLoss.toFixed(5),
        payload.takeProfit.toFixed(5),
        payload.confidence.toFixed(2),
        payload.rr.toFixed(3),
    ].join('|');
    return createHash('sha256').update(base).digest('hex');
}

async function getVvipRecipients(): Promise<string[]> {
    const turso = getTursoClient();
    if (!turso) return [];

    const result = await turso.execute({
        sql: `
            SELECT telegram_chat_id
            FROM users
            WHERE membership = 'VVIP'
              AND telegram_chat_id IS NOT NULL
              AND TRIM(telegram_chat_id) != ''
        `,
        args: [],
    });

    const uniqueIds = new Set<string>();
    for (const row of result.rows) {
        const chatId = String(row.telegram_chat_id || '').trim();
        if (chatId) uniqueIds.add(chatId);
    }
    return Array.from(uniqueIds);
}

async function ensureAlertLogTable(): Promise<void> {
    const turso = getTursoClient();
    if (!turso) return;

    await turso.execute(`
        CREATE TABLE IF NOT EXISTS vvip_signal_alert_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            signal_hash TEXT NOT NULL UNIQUE,
            symbol TEXT NOT NULL,
            timeframe TEXT NOT NULL,
            direction TEXT NOT NULL,
            confidence INTEGER,
            rr_ratio REAL,
            sent_count INTEGER DEFAULT 0,
            failed_count INTEGER DEFAULT 0,
            source_user_id TEXT,
            sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

async function signalAlreadySent(signalHash: string): Promise<boolean> {
    const turso = getTursoClient();
    if (!turso) return false;

    const result = await turso.execute({
        sql: 'SELECT id FROM vvip_signal_alert_logs WHERE signal_hash = ? LIMIT 1',
        args: [signalHash],
    });

    return result.rows.length > 0;
}

async function hasCooldownActive(params: {
    pair: string;
    timeframe: string;
    direction: TradeDirection;
    cooldownMinutes: number;
}): Promise<boolean> {
    const turso = getTursoClient();
    if (!turso) return false;

    const result = await turso.execute({
        sql: `
            SELECT sent_at
            FROM vvip_signal_alert_logs
            WHERE symbol = ?
              AND timeframe = ?
              AND direction = ?
            ORDER BY sent_at DESC
            LIMIT 1
        `,
        args: [params.pair.toUpperCase(), params.timeframe.toUpperCase(), params.direction],
    });

    if (result.rows.length === 0) return false;

    const lastSent = result.rows[0].sent_at ? new Date(String(result.rows[0].sent_at)) : null;
    if (!lastSent || Number.isNaN(lastSent.getTime())) return false;

    const diffMinutes = (Date.now() - lastSent.getTime()) / (1000 * 60);
    return diffMinutes < params.cooldownMinutes;
}

async function logAlertResult(params: {
    signalHash: string;
    pair: string;
    timeframe: string;
    direction: TradeDirection;
    confidence: number;
    rr: number;
    sent: number;
    failed: number;
    sourceUserId?: string;
}): Promise<void> {
    const turso = getTursoClient();
    if (!turso) return;

    try {
        await turso.execute({
            sql: `
                INSERT INTO vvip_signal_alert_logs (
                    signal_hash, symbol, timeframe, direction, confidence, rr_ratio,
                    sent_count, failed_count, source_user_id
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            args: [
                params.signalHash,
                params.pair.toUpperCase(),
                params.timeframe.toUpperCase(),
                params.direction,
                Math.round(params.confidence),
                Number(params.rr.toFixed(3)),
                params.sent,
                params.failed,
                params.sourceUserId || null,
            ],
        });
    } catch (error) {
        console.error('[VVIP ALERT] Failed to log alert result:', error);
    }
}

function buildMessage(payload: {
    pair: string;
    timeframe: string;
    direction: TradeDirection;
    entry: number;
    stopLoss: number;
    takeProfit: number;
    confidence: number;
    rr: number;
    analysis?: string | null;
}): string {
    const pair = escapeHtml(payload.pair.toUpperCase());
    const timeframe = escapeHtml(payload.timeframe.toUpperCase());
    const direction = escapeHtml(payload.direction);
    const note = payload.analysis
        ? payload.analysis
            .replace(/\r/g, ' ')
            .replace(/\n+/g, ' ')
            .slice(0, 140)
            .trim()
        : 'Best setup terdeteksi dari engine analisa ARRA7.';

    return [
        '<b>VVIP BEST SIGNAL</b>',
        `<b>${pair} - ${timeframe}</b>`,
        '',
        `Arah: <b>${direction}</b>`,
        `Entry: <code>${formatPrice(payload.pair, payload.entry)}</code>`,
        `SL: <code>${formatPrice(payload.pair, payload.stopLoss)}</code>`,
        `TP1: <code>${formatPrice(payload.pair, payload.takeProfit)}</code>`,
        '',
        `Confidence: <b>${Math.round(payload.confidence)}%</b>`,
        `R:R: <b>${payload.rr.toFixed(2)}R</b>`,
        '',
        `Thesis: ${escapeHtml(note)}`,
        `<i>${escapeHtml(new Date().toLocaleString('id-ID'))}</i>`,
    ].join('\n');
}
export async function notifyVvipBestSignal(
    params: NotifyVvipBestSignalParams
): Promise<NotifyVvipBestSignalResult> {
    const enabled = process.env.VVIP_BEST_SIGNAL_ALERT_ENABLED !== 'false';
    if (!enabled) {
        return { triggered: false, sent: 0, failed: 0, reason: 'disabled' };
    }

    const direction = normalizeDirection(params.signal);
    if (!params.signal) return { triggered: false, sent: 0, failed: 0, reason: 'no_signal' };
    if (!direction) return { triggered: false, sent: 0, failed: 0, reason: 'non_tradable' };

    const entry = getEntry(params.signal, params.marketPrice);
    const stopLoss = getStopLoss(params.signal);
    const takeProfit = getTakeProfit(params.signal);
    const confidence = normalizeConfidence(params.signal.confidence);

    if (entry === null || stopLoss === null || takeProfit === null || confidence === null) {
        return { triggered: false, sent: 0, failed: 0, reason: 'incomplete_levels' };
    }

    const rr = calculateRR(direction, entry, stopLoss, takeProfit);
    if (rr === null) {
        return { triggered: false, sent: 0, failed: 0, reason: 'incomplete_levels' };
    }

    const minConfidence = parseEnvNumber(process.env.VVIP_BEST_SIGNAL_MIN_CONFIDENCE, DEFAULT_MIN_CONFIDENCE);
    const minRr = parseEnvNumber(process.env.VVIP_BEST_SIGNAL_MIN_RR, DEFAULT_MIN_RR);
    const cooldownMinutes = parseEnvNumber(process.env.VVIP_BEST_SIGNAL_COOLDOWN_MINUTES, DEFAULT_COOLDOWN_MINUTES);

    if (confidence < minConfidence) {
        return { triggered: false, sent: 0, failed: 0, reason: 'low_confidence' };
    }
    if (rr < minRr) {
        return { triggered: false, sent: 0, failed: 0, reason: 'low_rr' };
    }

    const turso = getTursoClient();
    if (!turso) {
        return { triggered: false, sent: 0, failed: 0, reason: 'db_unavailable' };
    }

    try {
        await ensureAlertLogTable();
    } catch (tableError) {
        console.error('[VVIP ALERT] Failed to ensure alert log table:', tableError);
        return { triggered: false, sent: 0, failed: 0, reason: 'db_unavailable' };
    }

    const signalHash = buildSignalHash({
        pair: params.pair,
        timeframe: params.timeframe,
        direction,
        entry,
        stopLoss,
        takeProfit,
        confidence,
        rr,
    });

    const exists = await signalAlreadySent(signalHash);
    if (exists) {
        return { triggered: false, sent: 0, failed: 0, reason: 'duplicate_signal', signalHash };
    }

    const cooldownActive = await hasCooldownActive({
        pair: params.pair,
        timeframe: params.timeframe,
        direction,
        cooldownMinutes,
    });
    if (cooldownActive) {
        return { triggered: false, sent: 0, failed: 0, reason: 'cooldown_active', signalHash };
    }

    const recipients = await getVvipRecipients();
    if (recipients.length === 0) {
        return { triggered: false, sent: 0, failed: 0, reason: 'no_vvip_recipients', signalHash };
    }

    const message = buildMessage({
        pair: params.pair,
        timeframe: params.timeframe,
        direction,
        entry,
        stopLoss,
        takeProfit,
        confidence,
        rr,
        analysis: params.analysis,
    });

    let sent = 0;
    let failed = 0;
    for (const chatId of recipients) {
        const result = await sendTelegramMessage(message, 'HTML', chatId);
        if (result.success) sent += 1;
        else failed += 1;
    }

    await logAlertResult({
        signalHash,
        pair: params.pair,
        timeframe: params.timeframe,
        direction,
        confidence,
        rr,
        sent,
        failed,
        sourceUserId: params.sourceUserId,
    });

    if (sent > 0) {
        return { triggered: true, sent, failed, reason: 'sent', signalHash };
    }
    return { triggered: false, sent, failed, reason: 'send_failed', signalHash };
}
