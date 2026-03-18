'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLowBalancePopup } from '@/components/LowBalancePopup';
import {
    SparklesIcon,
    ChartIcon,
    RocketIcon,
    LightbulbIcon,
    DocumentIcon,
    ClockIcon,
    BellIcon,
    WarningIcon,
    LockIcon,
    XCircleIcon,
    ArrowRightIcon,
} from '@/components/PremiumIcons';

// Pair Categories with icons
const PAIR_CATEGORIES = [
    {
        id: 'major',
        name: 'Forex Major',
        icon: 'FX',
        pairs: [
            { value: 'EURUSD', label: 'EUR/USD' },
            { value: 'GBPUSD', label: 'GBP/USD' },
            { value: 'USDJPY', label: 'USD/JPY' },
            { value: 'USDCHF', label: 'USD/CHF' },
            { value: 'AUDUSD', label: 'AUD/USD' },
            { value: 'USDCAD', label: 'USD/CAD' },
            { value: 'NZDUSD', label: 'NZD/USD' },
        ],
    },
    {
        id: 'minor',
        name: 'Forex Minor',
        icon: 'MNR',
        pairs: [
            { value: 'EURGBP', label: 'EUR/GBP' },
            { value: 'EURJPY', label: 'EUR/JPY' },
            { value: 'GBPJPY', label: 'GBP/JPY' },
            { value: 'EURCHF', label: 'EUR/CHF' },
            { value: 'EURAUD', label: 'EUR/AUD' },
            { value: 'EURCAD', label: 'EUR/CAD' },
            { value: 'GBPCHF', label: 'GBP/CHF' },
            { value: 'GBPAUD', label: 'GBP/AUD' },
            { value: 'AUDJPY', label: 'AUD/JPY' },
            { value: 'CADJPY', label: 'CAD/JPY' },
            { value: 'CHFJPY', label: 'CHF/JPY' },
            { value: 'NZDJPY', label: 'NZD/JPY' },
            { value: 'AUDCAD', label: 'AUD/CAD' },
            { value: 'AUDCHF', label: 'AUD/CHF' },
            { value: 'AUDNZD', label: 'AUD/NZD' },
            { value: 'EURNZD', label: 'EUR/NZD' },
            { value: 'GBPCAD', label: 'GBP/CAD' },
            { value: 'GBPNZD', label: 'GBP/NZD' },
        ],
    },
    {
        id: 'commodities',
        name: 'Komoditas',
        icon: 'CMD',
        pairs: [
            { value: 'XAUUSD', label: 'XAU/USD (Gold)' },
            { value: 'XAGUSD', label: 'XAG/USD (Silver)' },
            { value: 'XPTUSD', label: 'XPT/USD (Platinum)' },
            { value: 'XPDUSD', label: 'XPD/USD (Palladium)' },
            { value: 'XTIUSD', label: 'WTI Oil' },
            { value: 'XBRUSD', label: 'Brent Oil' },
            { value: 'XNGUSD', label: 'Natural Gas' },
            { value: 'XCUUSD', label: 'Copper' },
        ],
    },
    {
        id: 'crypto',
        name: 'Crypto',
        icon: 'CRP',
        pairs: [
            { value: 'BTCUSD', label: 'BTC/USD' },
            { value: 'ETHUSD', label: 'ETH/USD' },
            { value: 'XRPUSD', label: 'XRP/USD' },
            { value: 'SOLUSD', label: 'SOL/USD' },
            { value: 'BNBUSD', label: 'BNB/USD' },
            { value: 'ADAUSD', label: 'ADA/USD' },
            { value: 'DOGEUSD', label: 'DOGE/USD' },
            { value: 'DOTUSD', label: 'DOT/USD' },
            { value: 'MATICUSD', label: 'MATIC/USD' },
            { value: 'LINKUSD', label: 'LINK/USD' },
            { value: 'AVAXUSD', label: 'AVAX/USD' },
            { value: 'LTCUSD', label: 'LTC/USD' },
        ],
    },
    {
        id: 'indices',
        name: 'Indices',
        icon: 'IDX',
        pairs: [
            { value: 'US30', label: 'US30 (Dow Jones)' },
            { value: 'US500', label: 'US500 (S&P 500)' },
            { value: 'USTEC', label: 'USTEC (Nasdaq)' },
            { value: 'DE40', label: 'DE40 (DAX)' },
            { value: 'UK100', label: 'UK100 (FTSE)' },
            { value: 'JP225', label: 'JP225 (Nikkei)' },
        ],
    },
];

const TIMEFRAMES = [
    { value: '1m', label: 'M1' },
    { value: '5m', label: 'M5' },
    { value: '15m', label: 'M15' },
    { value: '30m', label: 'M30' },
    { value: '1h', label: 'H1' },
    { value: '4h', label: 'H4' },
    { value: '1d', label: 'D1' },
];

interface MarketInfo {
    symbol: string;
    name: string;
    price: number;
    change: number;
    isRealtime: boolean;
    isSimulated?: boolean;
    timestamp?: string;
    dataSource?: string;
    freshnessSeconds?: number;
    lastCandleTime?: string | null;
}

interface QuotaStatus {
    membership: string;
    dailyLimit: number;
    used: number;
    remaining: number;
    canAnalyze: boolean;
    allowedTimeframes: string[];
}

interface TelegramLinkStatus {
    membership: string;
    isVvipActive: boolean;
    linked: boolean;
    telegramChatId: string | null;
    botUsername: string;
}

interface ParsedSignalData {
    type?: 'BUY' | 'SELL' | 'HOLD';
    direction?: 'BUY' | 'SELL' | 'HOLD';
    entryPrice?: number;
    entry?: number;
    stopLoss?: number;
    sl?: number;
    takeProfit1?: number;
    tp?: number;
    confidence?: number;
}

type DeepSectionKey =
    | 'marketStructure'
    | 'smcConfluence'
    | 'statisticalSignals'
    | 'momentumAssessment'
    | 'fibonacciMapping'
    | 'riskFactors';

interface DeepAnalystSections {
    executiveSummary: string;
    marketStructure: string;
    smcConfluence: string;
    statisticalSignals: string;
    momentumAssessment: string;
    fibonacciMapping: string;
    riskFactors: string;
}

interface ScenarioItem {
    name: string;
    tone: 'bull' | 'bear' | 'neutral';
    trigger: string;
    invalidation: string;
    target: string;
    note: string;
}

interface DeskSnapshot {
    regime: string;
    rr: string;
    riskBudget: string;
    conviction: string;
    entry: string;
    stop: string;
    target: string;
}

const DEEP_HEADINGS: Record<DeepSectionKey, string[]> = {
    marketStructure: ['market structure', 'struktur pasar'],
    smcConfluence: ['smc/ict confluence', 'smc/ict', 'order block', 'fvg'],
    statisticalSignals: ['statistical signals', 'statistik', 'z-score'],
    momentumAssessment: ['momentum assessment', 'momentum'],
    fibonacciMapping: ['fibonacci mapping', 'fibonacci'],
    riskFactors: ['risk factors', 'faktor risiko', 'risk'],
};

function cleanLine(line: string): string {
    return line
        .replace(/\*\*/g, '')
        .replace(/^[-*\u2022\d.)\s]+/, '')
        .trim();
}

function parseDeepAnalystSections(rawAnalysis: string | null): DeepAnalystSections {
    const fallback: DeepAnalystSections = {
        executiveSummary: 'Ruang analyst privat siap dipakai. Jalankan analisa untuk memuat thesis VVIP terbaru.',
        marketStructure: 'Belum ada snapshot struktur market pada sesi ini.',
        smcConfluence: 'Belum ada data orderflow SMC/ICT untuk pair dan timeframe aktif.',
        statisticalSignals: 'Model statistik belum menghasilkan pembacaan sinyal.',
        momentumAssessment: 'Momentum desk menunggu trigger terukur dari analisa baru.',
        fibonacciMapping: 'Zona Fibonacci belum dihitung pada sesi ini.',
        riskFactors: 'Risk map belum tersedia sebelum analisa dijalankan.',
    };

    if (!rawAnalysis) return fallback;

    const lines = rawAnalysis
        .replace(/\r/g, '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

    if (lines.length === 0) return fallback;

    const headingEntries = Object.entries(DEEP_HEADINGS) as Array<[DeepSectionKey, string[]]>;
    const isHeadingLine = (line: string) => {
        const normalized = line.toLowerCase();
        return headingEntries.some(([, labels]) => labels.some((label) => normalized.includes(label)));
    };

    const summaryLines: string[] = [];
    for (const line of lines) {
        if (isHeadingLine(line)) break;
        const cleaned = cleanLine(line);
        if (!cleaned) continue;
        if (cleaned.toLowerCase().includes('arra quantum strategic')) continue;
        if (cleaned.startsWith('\u2501') || /^[\-=*_]{3,}$/.test(cleaned)) continue;
        summaryLines.push(cleaned);
        if (summaryLines.length >= 3) break;
    }

    const result: DeepAnalystSections = {
        ...fallback,
        executiveSummary: summaryLines.length > 0 ? summaryLines.join(' ') : fallback.executiveSummary,
    };

    for (const [key, labels] of headingEntries) {
        const startIndex = lines.findIndex((line) => {
            const normalized = line.toLowerCase();
            return labels.some((label) => normalized.includes(label));
        });

        if (startIndex < 0) continue;

        const content: string[] = [];
        for (let i = startIndex + 1; i < lines.length; i++) {
            if (isHeadingLine(lines[i])) break;
            const cleaned = cleanLine(lines[i]);
            if (cleaned) content.push(cleaned);
        }

        if (content.length > 0) {
            result[key] = content.join(' ');
        }
    }

    return result;
}

function formatPrice(value: number | null | undefined, symbol = ''): string {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return '-';
    const upper = symbol.toUpperCase();
    const decimals = upper.includes('XAU') || upper.includes('XAG') ? 2 : upper.includes('JPY') ? 3 : value >= 100 ? 2 : 5;
    return value.toFixed(decimals);
}

function isPlaceholderInsight(value: string | null | undefined): boolean {
    if (!value) return true;
    const normalized = value.trim().toLowerCase();
    return normalized === '' || normalized === '-' || normalized === 'n/a' || normalized === 'na' || normalized === 'none';
}

function withFallbackInsight(primary: string, fallback: string): string {
    return isPlaceholderInsight(primary) ? fallback : primary;
}

function buildScenarioMatrix(
    signal: ParsedSignalData | null,
    marketInfo: MarketInfo | null
): ScenarioItem[] {
    const symbol = marketInfo?.symbol || 'XAUUSD';
    const price = marketInfo?.price || 0;
    const directionRaw = String(signal?.direction || signal?.type || '').toUpperCase();

    const entry = (signal?.entryPrice || signal?.entry || price) || price;
    const sl = (signal?.stopLoss || signal?.sl || 0) || 0;
    const tp1 = (signal?.takeProfit1 || signal?.tp || 0) || 0;
    const unit = entry > 0 ? entry * (symbol.toUpperCase().includes('XAU') ? 0.003 : 0.0015) : 1;

    if (entry <= 0) {
        return [
            {
                name: 'Base Case',
                tone: 'neutral',
                trigger: 'Jalankan analisa untuk mendapatkan trigger harga valid.',
                invalidation: 'Belum tersedia sebelum analisa berjalan.',
                target: 'Menunggu data',
                note: 'Scenario matrix otomatis akan terisi dari hasil analisa terbaru.',
            },
            {
                name: 'Bull Case',
                tone: 'bull',
                trigger: 'Menunggu konfirmasi momentum dari output AI.',
                invalidation: 'Belum tersedia.',
                target: 'Menunggu data',
                note: 'Digunakan saat validasi arah bullish sudah terkonfirmasi.',
            },
            {
                name: 'Bear Case',
                tone: 'bear',
                trigger: 'Menunggu konfirmasi tekanan jual dari output AI.',
                invalidation: 'Belum tersedia.',
                target: 'Menunggu data',
                note: 'Digunakan saat validasi arah bearish sudah terkonfirmasi.',
            },
        ];
    }

    if (directionRaw === 'BUY') {
        return [
            {
                name: 'Base Case',
                tone: 'bull',
                trigger: `Harga bertahan di atas ${formatPrice(entry, symbol)}`,
                invalidation: `Tutup candle di bawah ${formatPrice(sl || (entry - unit), symbol)}`,
                target: formatPrice(tp1 || (entry + unit * 1.5), symbol),
                note: 'Momentum naik tetap sehat, pullback dangkal.',
            },
            {
                name: 'Bull Case',
                tone: 'bull',
                trigger: `Breakout kuat di atas ${formatPrice(tp1 || (entry + unit), symbol)}`,
                invalidation: `Reclaim gagal dan turun di bawah ${formatPrice(entry, symbol)}`,
                target: formatPrice((tp1 || (entry + unit)) + unit * 1.2, symbol),
                note: 'Trend extension, cocok untuk add-on konservatif.',
            },
            {
                name: 'Bear Case',
                tone: 'bear',
                trigger: `Break di bawah ${formatPrice(sl || (entry - unit), symbol)}`,
                invalidation: `Kembali stabil di atas ${formatPrice(entry, symbol)}`,
                target: formatPrice((sl || (entry - unit)) - unit * 0.8, symbol),
                note: 'Skenario batal; fokus proteksi modal.',
            },
        ];
    }

    if (directionRaw === 'SELL') {
        return [
            {
                name: 'Base Case',
                tone: 'bear',
                trigger: `Harga tertahan di bawah ${formatPrice(entry, symbol)}`,
                invalidation: `Tutup candle di atas ${formatPrice(sl || (entry + unit), symbol)}`,
                target: formatPrice(tp1 || (entry - unit * 1.5), symbol),
                note: 'Tekanan jual dominan, rebound lemah.',
            },
            {
                name: 'Bear Case',
                tone: 'bear',
                trigger: `Breakdown kuat di bawah ${formatPrice(tp1 || (entry - unit), symbol)}`,
                invalidation: `Recover di atas ${formatPrice(entry, symbol)}`,
                target: formatPrice((tp1 || (entry - unit)) - unit * 1.2, symbol),
                note: 'Trend continuation, cocok scale-out bertahap.',
            },
            {
                name: 'Bull Case',
                tone: 'bull',
                trigger: `Break di atas ${formatPrice(sl || (entry + unit), symbol)}`,
                invalidation: `Kembali gagal di bawah ${formatPrice(entry, symbol)}`,
                target: formatPrice((sl || (entry + unit)) + unit * 0.8, symbol),
                note: 'Skenario berlawanan; stop and reassess.',
            },
        ];
    }

    return [
        {
            name: 'Wait Mode',
            tone: 'neutral',
            trigger: `Tunggu break valid dari area ${formatPrice(entry - unit * 0.4, symbol)} - ${formatPrice(entry + unit * 0.4, symbol)}`,
            invalidation: `Noise tinggi tanpa arah jelas`,
            target: `Konfirmasi ulang di sekitar ${formatPrice(entry, symbol)}`,
            note: 'Belum ada edge kuat, disiplin no-trade.',
        },
        {
            name: 'Bull Trigger',
            tone: 'bull',
            trigger: `Close H1 di atas ${formatPrice(entry + unit * 0.7, symbol)}`,
            invalidation: `Gagal hold di atas trigger`,
            target: formatPrice(entry + unit * 1.6, symbol),
            note: 'Aktif jika konfirmasi momentum masuk.',
        },
        {
            name: 'Bear Trigger',
            tone: 'bear',
            trigger: `Close H1 di bawah ${formatPrice(entry - unit * 0.7, symbol)}`,
            invalidation: `Gagal hold di bawah trigger`,
            target: formatPrice(entry - unit * 1.6, symbol),
            note: 'Aktif jika tekanan jual konsisten.',
        },
    ];
}

function buildDeepAnalystNarrative(
    sections: DeepAnalystSections,
    signal: ParsedSignalData | null,
    marketInfo: MarketInfo | null
): DeepAnalystSections {
    const symbol = marketInfo?.symbol || 'market';
    const direction = String(signal?.direction || signal?.type || 'WAIT').toUpperCase();
    const entry = signal?.entryPrice || signal?.entry || marketInfo?.price || 0;
    const sl = signal?.stopLoss || signal?.sl || 0;
    const tp = signal?.takeProfit1 || signal?.tp || 0;
    const confidence = typeof signal?.confidence === 'number' && Number.isFinite(signal.confidence)
        ? Math.round(signal.confidence)
        : null;
    const entryLabel = formatPrice(entry, symbol);
    const slLabel = formatPrice(sl, symbol);
    const tpLabel = formatPrice(tp, symbol);

    const directionalBias = direction === 'BUY'
        ? 'bias bullish masih dominan selama area support dipertahankan.'
        : direction === 'SELL'
            ? 'tekanan bearish masih unggul selama resistance tidak ditembus.'
            : 'kondisi netral dan memerlukan konfirmasi breakout sebelum entry.';

    const structureFallback = `Snapshot ${symbol}: harga referensi di sekitar ${entryLabel !== '-' ? entryLabel : 'zona utama'}, ${directionalBias}`;
    const smcFallback = direction === 'WAIT'
        ? 'Order block dan liquidity sweep belum valid, fokus menunggu displacement candle konfirmasi.'
        : `Konfirmasi orderflow diarahkan pada area entry ${entryLabel !== '-' ? entryLabel : 'utama'} dengan invalidasi ${slLabel !== '-' ? slLabel : 'dinamis'}.`;
    const statsFallback = confidence !== null
        ? `Skor probabilitas model saat ini ${confidence}/100, gunakan hanya saat struktur dan momentum searah.`
        : 'Skor probabilitas belum tersedia, jalankan analisa untuk memuat pembacaan statistik terbaru.';
    const momentumFallback = direction === 'BUY'
        ? 'Momentum naik valid jika candle close bertahan di atas area trigger.'
        : direction === 'SELL'
            ? 'Momentum turun valid jika rejection berulang terjadi di area resistance intraday.'
            : 'Momentum belum matang, prioritas observasi volume dan impuls breakout.';
    const fibFallback = tpLabel !== '-'
        ? `Proyeksi Fibonacci diarahkan menuju target ${tpLabel} dengan area pullback pada entry ${entryLabel !== '-' ? entryLabel : 'utama'}.`
        : 'Mapping Fibonacci belum lengkap karena target harga belum terbaca.';
    const riskFallback = slLabel !== '-'
        ? `Risk control: invalidasi utama berada di ${slLabel}, disiplin cut-loss wajib sebelum scale-in lanjutan.`
        : 'Risk control belum valid karena level stop-loss belum tersedia.';

    return {
        executiveSummary: withFallbackInsight(
            sections.executiveSummary,
            `Desk privat VVIP aktif untuk ${symbol}. Jalankan analisa untuk memuat thesis multi-layer terbaru.`
        ),
        marketStructure: withFallbackInsight(sections.marketStructure, structureFallback),
        smcConfluence: withFallbackInsight(sections.smcConfluence, smcFallback),
        statisticalSignals: withFallbackInsight(sections.statisticalSignals, statsFallback),
        momentumAssessment: withFallbackInsight(sections.momentumAssessment, momentumFallback),
        fibonacciMapping: withFallbackInsight(sections.fibonacciMapping, fibFallback),
        riskFactors: withFallbackInsight(sections.riskFactors, riskFallback),
    };
}

function buildDeskSnapshot(
    signal: ParsedSignalData | null,
    marketInfo: MarketInfo | null
): DeskSnapshot {
    const symbol = marketInfo?.symbol || 'XAUUSD';
    const direction = String(signal?.direction || signal?.type || 'WAIT').toUpperCase();
    const entry = signal?.entryPrice || signal?.entry || marketInfo?.price || 0;
    const sl = signal?.stopLoss || signal?.sl || 0;
    const tp = signal?.takeProfit1 || signal?.tp || 0;
    const confidence = typeof signal?.confidence === 'number' && Number.isFinite(signal.confidence)
        ? signal.confidence
        : null;

    const riskDistance = entry > 0 && sl > 0 ? Math.abs(entry - sl) : 0;
    const rewardDistance = entry > 0 && tp > 0
        ? (direction === 'SELL' ? (entry - tp) : direction === 'BUY' ? (tp - entry) : Math.abs(tp - entry))
        : 0;
    const rr = riskDistance > 0 && rewardDistance > 0 ? `${(rewardDistance / riskDistance).toFixed(2)}R` : 'N/A';
    const riskBudget = entry > 0 && sl > 0
        ? `${((Math.abs(entry - sl) / entry) * 100).toFixed(2)}%`
        : 'N/A';
    const conviction = confidence !== null ? `${Math.round(confidence)}/100` : 'Pending';

    const regime = direction === 'BUY'
        ? 'Risk-On Bull Regime'
        : direction === 'SELL'
            ? 'Risk-Off Bear Regime'
            : 'Compression / Wait';

    return {
        regime,
        rr,
        riskBudget,
        conviction,
        entry: formatPrice(entry, symbol),
        stop: formatPrice(sl, symbol),
        target: formatPrice(tp, symbol),
    };
}

export default function AnalisaMarketPage() {
    const { data: session, status } = useSession();
    const t = useTranslations('analisaMarket');
    const router = useRouter();
    const telegramBotUsername = 'arra7trade_bot';

    const { openPopup } = useLowBalancePopup();

    const [selectedCategory, setSelectedCategory] = useState('commodities');
    const [selectedPair, setSelectedPair] = useState('XAUUSD');
    const [selectedTimeframe, setSelectedTimeframe] = useState('1h');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [rawAnalysis, setRawAnalysis] = useState<string | null>(null);
    const [parsedSignal, setParsedSignal] = useState<ParsedSignalData | null>(null);
    const [marketInfo, setMarketInfo] = useState<MarketInfo | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [newsHtml, setNewsHtml] = useState<string>('');
    const [quotaStatus, setQuotaStatus] = useState<QuotaStatus | null>(null);
    const [cooldownEndTime, setCooldownEndTime] = useState<number | null>(null); // Store end timestamp
    const [lastQuotaCharged, setLastQuotaCharged] = useState<boolean | null>(null);
    const [lastAnalyzeAt, setLastAnalyzeAt] = useState<string | null>(null);
    const [journalAutoSaved, setJournalAutoSaved] = useState<boolean | null>(null);
    const [telegramStatus, setTelegramStatus] = useState<TelegramLinkStatus | null>(null);
    const [telegramLinkCode, setTelegramLinkCode] = useState<string | null>(null);
    const [telegramCodeExpiresAt, setTelegramCodeExpiresAt] = useState<string | null>(null);
    const [telegramLoading, setTelegramLoading] = useState(false);
    const [telegramGenerating, setTelegramGenerating] = useState(false);
    const [telegramError, setTelegramError] = useState<string | null>(null);
    const [telegramCopiedTarget, setTelegramCopiedTarget] = useState<'chatId' | 'linkCode' | 'linkCommand' | null>(null);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login?callbackUrl=/analisa-market');
        }
    }, [status, router]);

    useEffect(() => {
        fetchNews();
        fetchQuota();
        fetchTelegramLinkStatus();
        trackLocation();
    }, []);

    // Timestamp-based Countdown Timer (works even when tab is inactive)
    useEffect(() => {
        if (!cooldownEndTime) return;

        const updateCountdown = () => {
            const now = Date.now();
            const remaining = Math.max(0, Math.ceil((cooldownEndTime - now) / 1000));

            if (remaining === 0) {
                setCooldownEndTime(null);
            }
        };

        // Update immediately
        updateCountdown();

        // Update every second
        const timer = setInterval(updateCountdown, 1000);
        return () => clearInterval(timer);
    }, [cooldownEndTime]);

    // Calculate current cooldown seconds for display
    const cooldownSeconds = cooldownEndTime
        ? Math.max(0, Math.ceil((cooldownEndTime - Date.now()) / 1000))
        : 0;

    const formatCooldown = (seconds: number) => {
        if (seconds >= 86400) {
            // For 1 day or more, show days + hours
            const days = Math.floor(seconds / 86400);
            const hours = Math.floor((seconds % 86400) / 3600);
            return `${days}d ${hours}h`;
        } else if (seconds >= 3600) {
            // For 1 hour or more, show hours + minutes
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${hours}h ${minutes}m`;
        } else {
            // Less than 1 hour, show minutes + seconds
            const m = Math.floor(seconds / 60);
            const s = seconds % 60;
            return `${m}m ${s}s`;
        }
    };

    const trackLocation = async () => {
        try {
            await fetch('/api/location', { method: 'POST' });
        } catch {
            // Silent fail
        }
    };

    const fetchQuota = async () => {
        try {
            const res = await fetch('/api/user/quota');
            const data = await res.json();
            if (data.status === 'success') {
                setQuotaStatus(data.quota);
            }
        } catch (err) {
            console.error('Quota fetch error:', err);
        }
    };

    const fetchTelegramLinkStatus = async () => {
        setTelegramLoading(true);
        setTelegramError(null);
        try {
            const res = await fetch('/api/user/telegram/link-status', { cache: 'no-store' });
            const data = await res.json();
            if (!res.ok || !data?.ok) {
                setTelegramError(data?.message || 'Gagal mengambil status Telegram bot.');
                return;
            }

            setTelegramStatus({
                membership: String(data.membership || 'BASIC'),
                isVvipActive: Boolean(data.isVvipActive),
                linked: Boolean(data.linked),
                telegramChatId: data.telegramChatId || null,
                botUsername: String(data.botUsername || 'arra7trader_bot'),
            });
        } catch (err) {
            console.error('Telegram status fetch error:', err);
            setTelegramError('Gagal mengambil status Telegram bot.');
        } finally {
            setTelegramLoading(false);
        }
    };

    const handleGenerateTelegramCode = async () => {
        setTelegramGenerating(true);
        setTelegramError(null);
        try {
            const res = await fetch('/api/user/telegram/link-code', {
                method: 'POST',
            });
            const data = await res.json();
            if (!res.ok || !data?.ok) {
                setTelegramError(data?.message || 'Gagal membuat kode link.');
                return;
            }

            setTelegramLinkCode(String(data.code));
            setTelegramCodeExpiresAt(String(data.expiresAt));
            await fetchTelegramLinkStatus();
        } catch (err) {
            console.error('Generate telegram code error:', err);
            setTelegramError('Gagal membuat kode link.');
        } finally {
            setTelegramGenerating(false);
        }
    };

    const handleCopyTelegramText = async (
        value: string,
        target: 'chatId' | 'linkCode' | 'linkCommand'
    ) => {
        if (!value) return;
        try {
            await navigator.clipboard.writeText(value);
            setTelegramCopiedTarget(target);
            window.setTimeout(() => {
                setTelegramCopiedTarget((prev) => (prev === target ? null : prev));
            }, 1800);
        } catch (err) {
            console.error('Copy telegram text error:', err);
            setTelegramError('Gagal menyalin teks. Coba copy manual.');
        }
    };

    const currentCategory = PAIR_CATEGORIES.find(c => c.id === selectedCategory);
    const currentPairs = currentCategory?.pairs || [];

    const fetchNews = async () => {
        try {
            const res = await fetch('/api/news');
            const data = await res.json();
            if (data.status === 'success') {
                setNewsHtml(data.html);
            }
        } catch (err) {
            console.error('News fetch error:', err);
        }
    };

    const handleCategoryChange = (categoryId: string) => {
        setSelectedCategory(categoryId);
        const category = PAIR_CATEGORIES.find(c => c.id === categoryId);
        if (category && category.pairs.length > 0) {
            setSelectedPair(category.pairs[0].value);
        }
    };

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        setError(null);
        setAnalysisResult(null);
        setRawAnalysis(null);
        setParsedSignal(null);
        setJournalAutoSaved(null);

        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pair: selectedPair,
                    timeframe: selectedTimeframe,
                    broker: 'swissquote' // Swissquote Bank (real-time, no auth)
                }),
            });

            const data = await response.json();

            if (data.status === 'success') {
                setAnalysisResult(data.result);
                setRawAnalysis(typeof data.rawAnalysis === 'string' ? data.rawAnalysis : null);
                setParsedSignal(data.parsedSignal && typeof data.parsedSignal === 'object' ? data.parsedSignal as ParsedSignalData : null);
                setMarketInfo(data.marketInfo);
                if (data.quotaStatus) {
                    setQuotaStatus(data.quotaStatus);
                } else {
                    fetchQuota();
                }
                if (typeof data.quotaCharged === 'boolean') {
                    setLastQuotaCharged(data.quotaCharged);
                }
                if (typeof data.timestamp === 'string') {
                    setLastAnalyzeAt(data.timestamp);
                }
                if (typeof data.journalAutoSaved === 'boolean') {
                    setJournalAutoSaved(data.journalAutoSaved);
                }
            } else {
                if (data.waitTimeSeconds) {
                    // Set cooldown end time based on server's wait time
                    setCooldownEndTime(Date.now() + (data.waitTimeSeconds * 1000));
                    setError(null);
                } else {
                    const message = data.message || 'Analysis failed';
                    setError(message);

                    // Check for Quota or Feature Limits (Status 403)
                    if (response.status === 403) {
                        openPopup();
                        // If it's a specific quota message, we can override to be cleaner
                        if (message.includes('Quota') || message.includes('Limit') || message.includes('habis')) {
                            setError("Daily Limit Reached");
                        }
                    }
                }

                if (data.quotaStatus) {
                    setQuotaStatus(data.quotaStatus);
                }
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const isUnlimitedQuota = quotaStatus?.dailyLimit === -1 || quotaStatus?.dailyLimit === null;
    const dailyLimitLabel = isUnlimitedQuota ? 'Unlimited' : String(quotaStatus?.dailyLimit ?? '-');
    const usedLabel = isUnlimitedQuota ? 'Unlimited' : String(quotaStatus?.used ?? '-');
    const remainingLabel = isUnlimitedQuota ? 'Unlimited' : String(quotaStatus?.remaining ?? '-');
    const usedPercentage = isUnlimitedQuota
        ? 0
        : Math.min(100, Math.max(0, ((quotaStatus?.used ?? 0) / Math.max(1, quotaStatus?.dailyLimit ?? 1)) * 100));
    const allowedTimeframes = quotaStatus?.allowedTimeframes?.length
        ? quotaStatus.allowedTimeframes.map((tf) => tf.toUpperCase())
        : [];
    const lastChargeLabel = lastQuotaCharged === null
        ? 'Belum ada analisa'
        : lastQuotaCharged
            ? 'Kuota terpotong'
            : 'WAIT/SKIP - kuota aman';
    const lastChargeClass = lastQuotaCharged === null
        ? 'text-[var(--text-muted)]'
        : lastQuotaCharged
            ? 'text-amber-600'
            : 'text-emerald-600';
    const isVvipUser = (quotaStatus?.membership || '').toUpperCase() === 'VVIP';
    const isSessionVvip = (session?.user?.tier || '').toUpperCase() === 'VVIP';
    const directionBadge = String(parsedSignal?.direction || parsedSignal?.type || 'WAIT').toUpperCase();
    const confidenceText = typeof parsedSignal?.confidence === 'number' && Number.isFinite(parsedSignal.confidence)
        ? `${Math.round(parsedSignal.confidence)}%`
        : 'N/A';
    const deepSections = useMemo(
        () => buildDeepAnalystNarrative(
            parseDeepAnalystSections(rawAnalysis),
            parsedSignal,
            marketInfo
        ),
        [rawAnalysis, parsedSignal, marketInfo]
    );
    const scenarioMatrix = useMemo(
        () => buildScenarioMatrix(parsedSignal, marketInfo),
        [parsedSignal, marketInfo]
    );
    const deskSnapshot = useMemo(
        () => buildDeskSnapshot(parsedSignal, marketInfo),
        [parsedSignal, marketInfo]
    );
    const vvipAlias = session?.user?.name
        ? session.user.name.split(' ')[0]
        : 'VVIP Member';

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
                <div className="w-10 h-10 border-2 border-[var(--accent-blue)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!session) {
        return null;
    }

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pt-36">
            <div className="container-wide section-padding pt-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                >
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                                <SparklesIcon className="text-white" size="lg" />
                            </div>
                            <div>
                                <h1 className="text-2xl lg:text-3xl font-bold text-[var(--text-primary)]">{t('title')}</h1>
                                <p className="text-sm text-[var(--text-secondary)]">
                                    {t('welcome')}, <span className="text-[var(--text-primary)] font-medium">{session.user?.name}</span>
                                </p>
                            </div>
                        </div>

                        <div className="w-full">
                            <div className="rounded-md border border-[var(--border-light)] bg-[var(--bg-primary)] p-4 shadow-[0_10px_25px_rgba(0,0,0,0.04)]">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Info Akun & Kuota</p>
                                        <p className="text-sm font-semibold text-[var(--text-primary)]">Status akses analisa market</p>
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded-md font-semibold ${quotaStatus?.membership === 'VVIP'
                                        ? 'bg-amber-100 text-amber-700'
                                        : quotaStatus?.membership === 'PRO'
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                                        }`}>
                                        {quotaStatus?.membership || 'BASIC'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                                    <div className="rounded-md border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2">
                                        <p className="text-xs text-[var(--text-muted)]">Limit Harian</p>
                                        <p className="text-sm font-semibold text-[var(--text-primary)]">{dailyLimitLabel}</p>
                                    </div>
                                    <div className="rounded-md border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2">
                                        <p className="text-xs text-[var(--text-muted)]">Terpakai</p>
                                        <p className="text-sm font-semibold text-[var(--text-primary)]">{usedLabel}</p>
                                    </div>
                                    <div className="rounded-md border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2">
                                        <p className="text-xs text-[var(--text-muted)]">Sisa Hari Ini</p>
                                        <p className="text-sm font-semibold text-[var(--text-primary)]">{remainingLabel}</p>
                                    </div>
                                </div>

                                {!isUnlimitedQuota && (
                                    <div className="mb-3">
                                        <div className="h-2 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
                                            <div
                                                className={`h-full transition-all ${usedPercentage >= 90 ? 'bg-red-500' : 'bg-[var(--accent-blue)]'}`}
                                                style={{ width: `${usedPercentage}%` }}
                                            />
                                        </div>
                                        <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                                            Penggunaan hari ini: {usedPercentage.toFixed(0)}%
                                        </p>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <div className="rounded-md border border-[var(--border-light)] px-3 py-2">
                                        <p className="text-xs text-[var(--text-muted)]">Nama</p>
                                        <p className="font-medium text-[var(--text-primary)] truncate">{session.user?.name || '-'}</p>
                                    </div>
                                    <div className="rounded-md border border-[var(--border-light)] px-3 py-2">
                                        <p className="text-xs text-[var(--text-muted)]">Email</p>
                                        <p className="font-medium text-[var(--text-primary)] truncate">{session.user?.email || '-'}</p>
                                    </div>
                                </div>

                                <div className="mt-3 rounded-md border border-[var(--border-light)] px-3 py-2">
                                    <p className="text-xs text-[var(--text-muted)] mb-2">Timeframe Allow</p>
                                    {allowedTimeframes.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5">
                                            {allowedTimeframes.map((tf) => (
                                                <span key={tf} className="px-2 py-0.5 rounded-md bg-[var(--bg-secondary)] text-[11px] font-semibold text-[var(--text-primary)]">
                                                    {tf}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm font-medium text-[var(--text-primary)]">-</p>
                                    )}
                                </div>

                                <div className="mt-3 rounded-md border border-[var(--border-light)] px-3 py-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <p className="text-xs text-[var(--text-muted)]">Telegram VVIP Bot</p>
                                            <p className="text-sm font-semibold text-[var(--text-primary)]">Chat langsung untuk signal dan analisa</p>
                                        </div>
                                        <span className={`text-[11px] px-2 py-0.5 rounded-md font-semibold ${telegramStatus?.linked
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                                            }`}>
                                            {telegramStatus?.linked ? 'Linked' : 'Not Linked'}
                                        </span>
                                    </div>

                                    {telegramLoading ? (
                                        <p className="mt-2 text-xs text-[var(--text-muted)]">Memuat status bot...</p>
                                    ) : (
                                        <div className="mt-2 space-y-2">
                                            {!isSessionVvip || !telegramStatus?.isVvipActive ? (
                                                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
                                                    Fitur ini khusus VVIP aktif. Upgrade/aktifkan VVIP untuk menghubungkan bot.
                                                </p>
                                            ) : (
                                                <>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-xs text-[var(--text-secondary)]">
                                                            Bot: @{telegramBotUsername}
                                                        </p>
                                                        <a
                                                            href={`https://t.me/${telegramBotUsername}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="shrink-0 px-2 py-1 rounded-md bg-[#229ED9] text-white text-[11px] font-semibold hover:bg-[#1e8fc6] transition-colors"
                                                        >
                                                            Buka Bot
                                                        </a>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-xs text-[var(--text-secondary)] truncate">
                                                            Chat ID: {telegramStatus?.telegramChatId || 'Belum terhubung'}
                                                        </p>
                                                        {!!telegramStatus?.telegramChatId && (
                                                            <button
                                                                onClick={() => handleCopyTelegramText(telegramStatus?.telegramChatId ?? '', 'chatId')}
                                                                className="shrink-0 px-2 py-1 rounded-md border border-[var(--border-light)] bg-[var(--bg-primary)] text-[11px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                                                            >
                                                                {telegramCopiedTarget === 'chatId' ? 'Tersalin' : 'Copy'}
                                                            </button>
                                                        )}
                                                    </div>
                                                    {telegramLinkCode && (
                                                        <div className="rounded-md bg-[var(--bg-secondary)] border border-[var(--border-light)] px-2 py-2">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div>
                                                                    <p className="text-xs text-[var(--text-muted)]">Kode Link Aktif</p>
                                                                    <p className="text-sm font-mono font-semibold text-[var(--text-primary)]">{telegramLinkCode}</p>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleCopyTelegramText(telegramLinkCode, 'linkCode')}
                                                                    className="shrink-0 px-2 py-1 rounded-md border border-[var(--border-light)] bg-[var(--bg-primary)] text-[11px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-primary)]/80 transition-colors"
                                                                >
                                                                    {telegramCopiedTarget === 'linkCode' ? 'Tersalin' : 'Copy Kode'}
                                                                </button>
                                                            </div>
                                                            <div className="mt-1 flex items-center justify-between gap-2">
                                                                <p className="text-xs text-[var(--text-secondary)]">
                                                                    Kirim ke bot: <span className="font-mono">/link {telegramLinkCode}</span>
                                                                </p>
                                                                <button
                                                                    onClick={() => handleCopyTelegramText(`/link ${telegramLinkCode}`, 'linkCommand')}
                                                                    className="shrink-0 px-2 py-1 rounded-md border border-[var(--border-light)] bg-[var(--bg-primary)] text-[11px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-primary)]/80 transition-colors"
                                                                >
                                                                    {telegramCopiedTarget === 'linkCommand' ? 'Tersalin' : 'Copy /link'}
                                                                </button>
                                                            </div>
                                                            <p className="text-xs text-[var(--text-muted)] mt-1">
                                                                Expired: {telegramCodeExpiresAt ? new Date(telegramCodeExpiresAt).toLocaleTimeString('id-ID') : '-'}
                                                            </p>
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={handleGenerateTelegramCode}
                                                        disabled={telegramGenerating}
                                                        className={`w-full py-2 rounded-md text-xs font-semibold transition-colors ${telegramGenerating
                                                            ? 'bg-gray-200 text-[var(--text-secondary)] cursor-not-allowed'
                                                            : 'bg-[var(--accent-blue)] text-white hover:bg-blue-600'
                                                            }`}
                                                    >
                                                        {telegramGenerating
                                                            ? 'Membuat kode...'
                                                            : telegramStatus?.linked
                                                                ? 'Regenerate Kode Link'
                                                                : 'Generate Kode Link'}
                                                    </button>
                                                </>
                                            )}

                                            {telegramError && (
                                                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-1.5">
                                                    {telegramError}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-3 pt-3 border-t border-[var(--border-light)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs">
                                    <span className="text-[var(--text-secondary)]">
                                        Status analisa terakhir{lastAnalyzeAt ? ` (${new Date(lastAnalyzeAt).toLocaleTimeString('id-ID')})` : ''}:
                                    </span>
                                    <span className={`font-semibold ${lastChargeClass}`}>{lastChargeLabel}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Panel - Controls */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="lg:col-span-1 space-y-4"
                    >
                        {/* Category Tabs */}
                        <div className="bg-[var(--bg-primary)] rounded-2xl p-4 border border-[var(--border-light)]">
                            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                                <DocumentIcon size="sm" /> Kategori
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {PAIR_CATEGORIES.map((category) => (
                                    <button
                                        key={category.id}
                                        onClick={() => handleCategoryChange(category.id)}
                                        className={`
                                            flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
                                            ${selectedCategory === category.id
                                                ? 'bg-[var(--accent-blue)] text-white'
                                                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                                            }
                                        `}
                                    >
                                        <span>{category.icon}</span>
                                        <span className="hidden sm:inline">{category.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Pair Selection Grid */}
                        <div className="bg-[var(--bg-primary)] rounded-2xl p-4 border border-[var(--border-light)]">
                            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                                <span>{currentCategory?.icon}</span> {currentCategory?.name} Pairs
                                <span className="text-xs text-[var(--text-muted)]">({currentPairs.length})</span>
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2 max-h-[280px] overflow-y-auto pr-1">
                                {currentPairs.map((pair) => (
                                    <button
                                        key={pair.value}
                                        onClick={() => setSelectedPair(pair.value)}
                                        className={`
                                            px-3 py-2 rounded-lg text-xs font-medium transition-all text-left truncate
                                            ${selectedPair === pair.value
                                                ? 'bg-[var(--accent-blue)] text-white'
                                                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                                            }
                                        `}
                                        title={pair.label}
                                    >
                                        {pair.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Timeframe Selection */}
                        <div className="bg-[var(--bg-primary)] rounded-2xl p-4 border border-[var(--border-light)]">
                            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                                <ClockIcon size="sm" /> Timeframe
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {TIMEFRAMES.map((tf) => (
                                    <button
                                        key={tf.value}
                                        onClick={() => setSelectedTimeframe(tf.value)}
                                        className={`
                                            px-4 py-2 rounded-lg text-sm font-medium transition-all
                                            ${selectedTimeframe === tf.value
                                                ? 'bg-[var(--accent-blue)] text-white'
                                                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                                            }
                                        `}
                                    >
                                        {tf.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Selected Pair Display */}
                        <div className="bg-[var(--bg-primary)] rounded-2xl p-4 border border-[var(--border-light)]">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm text-[var(--text-secondary)]">Trading:</span>
                                <span className="text-lg font-bold gradient-text">{selectedPair}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-[var(--text-secondary)]">Timeframe:</span>
                                <span className="text-[var(--text-primary)] font-medium">{selectedTimeframe.toUpperCase()}</span>
                            </div>
                        </div>

                        {/* Quota Status */}
                        {quotaStatus && (
                            <div className={`rounded-2xl p-4 border ${quotaStatus.membership === 'VVIP'
                                ? 'bg-amber-50 border-amber-200'
                                : quotaStatus.membership === 'PRO'
                                    ? 'bg-blue-50 border-blue-200'
                                    : 'bg-[var(--bg-primary)] border-[var(--border-light)]'
                                }`}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-[var(--text-secondary)] flex items-center gap-1"><ChartIcon size="sm" /> Quota Hari Ini</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${quotaStatus.membership === 'VVIP'
                                        ? 'bg-amber-100 text-amber-700'
                                        : quotaStatus.membership === 'PRO'
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                                        }`}>
                                        {quotaStatus.membership}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all ${quotaStatus.remaining === 0
                                                ? 'bg-red-500'
                                                : quotaStatus.membership === 'VVIP'
                                                    ? 'bg-amber-500'
                                                    : 'bg-[var(--accent-blue)]'
                                                }`}
                                            style={{
                                                width: (quotaStatus.dailyLimit === -1 || quotaStatus.dailyLimit === null)
                                                    ? '100%'
                                                    : `${Math.min(100, (quotaStatus.used / (quotaStatus.dailyLimit || 1)) * 100)}%`
                                            }}
                                        />
                                    </div>
                                    <span className="text-sm font-mono text-[var(--text-primary)]">
                                        {(quotaStatus.dailyLimit === -1 || quotaStatus.dailyLimit === null)
                                            ? 'UNLIMITED'
                                            : `${quotaStatus.used}/${quotaStatus.dailyLimit}`
                                        }
                                    </span>
                                </div>
                                {quotaStatus.membership === 'BASIC' && quotaStatus.remaining <= 1 && (
                                    <a
                                        href="/pricing"
                                        className="mt-3 block text-center text-xs text-[var(--accent-blue)] hover:underline"
                                    >
                                        <LightbulbIcon className="inline" size="sm" /> Upgrade untuk lebih banyak analisa
                                    </a>
                                )}
                            </div>
                        )}

                        {/* AI Prediction Widget (Hidden temporarily)
                        <div className="mb-4">
                            <AiPrediction symbol={selectedPair} />
                        </div>
                        */}

                        {/* Analyze Button */}
                        <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Link
                                href="/journal"
                                className="inline-flex items-center justify-center rounded-lg border border-[var(--border-light)] bg-[var(--bg-primary)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                            >
                                Buka Trade Journal
                            </Link>
                            <Link
                                href="/copytrade-arra77"
                                className="inline-flex items-center justify-center rounded-lg border border-[var(--border-light)] bg-[var(--bg-primary)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                            >
                                Trade Actual Per Akun
                            </Link>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleAnalyze}
                            disabled={isAnalyzing || cooldownSeconds > 0}
                            className={`
                                w-full py-4 rounded-xl font-semibold text-lg transition-all
                                ${isAnalyzing || cooldownSeconds > 0
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'btn-primary'
                                }
                            `}
                        >
                            {isAnalyzing ? (
                                <span className="flex items-center justify-center gap-3">
                                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                    Analyzing...
                                </span>
                            ) : cooldownSeconds > 0 ? (
                                <span className="flex items-center justify-center gap-2 text-[var(--text-secondary)]">
                                    <ClockIcon size="md" />
                                    Cooldown: {formatCooldown(cooldownSeconds)}
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <RocketIcon size="md" /> Analisa Market
                                </span>
                            )}
                        </motion.button>
                        {journalAutoSaved === true && (
                            <p className="mt-2 text-xs text-emerald-700">
                                Sinyal BUY/SELL otomatis tersimpan ke jurnal.
                            </p>
                        )}

                        {/* Market Info */}
                        {marketInfo && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-[var(--bg-primary)] rounded-2xl p-4 border border-[var(--border-light)]"
                            >
                                <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-2"><ChartIcon size="sm" /> Market Info</h3>

                                {/* Simulated Data Warning */}
                                {marketInfo.isSimulated && (
                                    <div className="bg-red-50 border-l-4 border-red-500 p-3 mb-3 rounded">
                                        <div className="flex items-start gap-2">
                                            <WarningIcon size="sm" className="text-red-600 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-xs font-semibold text-red-800">Data Simulasi</p>
                                                <p className="text-xs text-red-600 mt-1">API gagal. Data ini adalah simulasi untuk demo saja. Jangan gunakan untuk trading!</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Delayed Data Warning */}
                                {!marketInfo.isRealtime && !marketInfo.isSimulated && (
                                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 mb-3 rounded">
                                        <div className="flex items-start gap-2">
                                            <ClockIcon size="sm" className="text-yellow-600 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-xs font-semibold text-yellow-800">Data Delayed</p>
                                                <p className="text-xs text-yellow-700 mt-1">
                                                    Data sudah {marketInfo.freshnessSeconds ? Math.floor(marketInfo.freshnessSeconds / 60) : '?'} menit yang lalu.
                                                    {' '}Gunakan dengan hati-hati untuk trading.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-[var(--text-secondary)]">Symbol</span>
                                        <span className="font-medium text-[var(--text-primary)]">{marketInfo.symbol}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[var(--text-secondary)]">Price</span>
                                        <span className="font-mono font-medium text-[var(--text-primary)]">{marketInfo.price.toFixed(5)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[var(--text-secondary)]">Change</span>
                                        <span className={`font-medium ${marketInfo.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {marketInfo.change >= 0 ? '+' : ''}{marketInfo.change.toFixed(4)}%
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[var(--text-secondary)]">Status</span>
                                        <span className={`text-xs px-2 py-0.5 rounded font-semibold ${marketInfo.isSimulated
                                            ? 'bg-red-100 text-red-700'
                                            : marketInfo.isRealtime
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {marketInfo.isSimulated ? 'SIMULATED' : marketInfo.isRealtime ? 'LIVE' : 'DELAYED'}
                                        </span>
                                    </div>
                                    {marketInfo.dataSource && (
                                        <div className="flex justify-between items-center pt-2 border-t border-[var(--border-light)]">
                                            <span className="text-[var(--text-secondary)] text-xs">Source</span>
                                            <span className="text-xs text-[var(--text-muted)] font-mono">{marketInfo.dataSource}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center pt-2 mt-2 border-t border-[var(--border-light)]">
                                        <span className="text-[var(--text-secondary)] text-xs">Last Update</span>
                                        <span className="text-xs text-[var(--text-muted)]">
                                            {marketInfo.lastCandleTime
                                                ? new Date(marketInfo.lastCandleTime).toLocaleTimeString('id-ID')
                                                : new Date().toLocaleTimeString('id-ID')}
                                            {marketInfo.freshnessSeconds !== undefined && marketInfo.freshnessSeconds > 0 && (
                                                <span className="ml-1 text-[var(--text-muted)]">
                                                    ({marketInfo.freshnessSeconds < 60
                                                        ? `${marketInfo.freshnessSeconds}s`
                                                        : `${Math.floor(marketInfo.freshnessSeconds / 60)}m`} ago)
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* News */}
                        <div className="bg-[var(--bg-primary)] rounded-2xl p-4 border border-[var(--border-light)]">
                            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                                <BellIcon size="sm" /> Economic News
                            </h3>
                            <div
                                className="text-sm space-y-1 max-h-32 overflow-y-auto text-[var(--text-secondary)]"
                                dangerouslySetInnerHTML={{ __html: newsHtml || 'Loading...' }}
                            />
                        </div>
                    </motion.div>

                    {/* Right Panel - Analysis Result */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="lg:col-span-2"
                    >
                        {isVvipUser && (
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.18 }}
                                className="mb-5 space-y-4"
                            >
                                <div className="rounded-3xl border border-[var(--border-light)] bg-gradient-to-br from-white via-sky-50/35 to-amber-50/45 p-5 text-[var(--text-primary)] shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <p className="text-[11px] uppercase tracking-[0.22em] text-sky-700 font-semibold">VVIP Exclusive Desk</p>
                                            <h3 className="text-2xl font-semibold text-[var(--text-primary)]">Deep Analyst Room</h3>
                                            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)] max-w-2xl">
                                                {deepSections.executiveSummary}
                                            </p>
                                            <p className="mt-2 text-xs text-[var(--text-secondary)]">
                                                User: {vvipAlias} | Update: {lastAnalyzeAt ? new Date(lastAnalyzeAt).toLocaleTimeString('id-ID') : 'Belum ada analisa'}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-100 border border-amber-200 text-amber-700 font-semibold">
                                                LSTM Core
                                            </span>
                                            <span className="text-[11px] px-2.5 py-1 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-light)] text-[var(--text-secondary)] font-semibold">
                                                {selectedPair} / {selectedTimeframe.toUpperCase()}
                                            </span>
                                            <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold border ${directionBadge === 'BUY'
                                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                : directionBadge === 'SELL'
                                                    ? 'bg-rose-100 text-rose-700 border-rose-200'
                                                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-light)]'
                                                }`}>
                                                {directionBadge}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 xl:grid-cols-4 gap-2">
                                        <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-3 py-2">
                                            <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Keyakinan Model</p>
                                            <p className="text-sm font-semibold text-[var(--text-primary)]">{deskSnapshot.conviction}</p>
                                        </div>
                                        <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-3 py-2">
                                            <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Bias Utama</p>
                                            <p className="text-sm font-semibold text-[var(--text-primary)]">{directionBadge}</p>
                                        </div>
                                        <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-3 py-2">
                                            <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Rasio R:R</p>
                                            <p className="text-sm font-semibold text-[var(--text-primary)]">{deskSnapshot.rr}</p>
                                        </div>
                                        <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-3 py-2">
                                            <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Risiko Setup</p>
                                            <p className="text-sm font-semibold text-[var(--text-primary)]">{deskSnapshot.riskBudget}</p>
                                        </div>
                                    </div>

                                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2">
                                            <p className="text-[10px] uppercase tracking-wider text-sky-700">Zona Entry</p>
                                            <p className="text-sm font-semibold text-[var(--text-primary)]">{deskSnapshot.entry}</p>
                                        </div>
                                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
                                            <p className="text-[10px] uppercase tracking-wider text-rose-700">Invalidasi</p>
                                            <p className="text-sm font-semibold text-[var(--text-primary)]">{deskSnapshot.stop}</p>
                                        </div>
                                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                                            <p className="text-[10px] uppercase tracking-wider text-emerald-700">Target 1</p>
                                            <p className="text-sm font-semibold text-[var(--text-primary)]">{deskSnapshot.target}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                                    <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-primary)] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
                                        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Struktur Market</h4>
                                        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{deepSections.marketStructure}</p>
                                    </div>
                                    <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-primary)] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
                                        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Konfluensi SMC / ICT</h4>
                                        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{deepSections.smcConfluence}</p>
                                    </div>
                                    <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-primary)] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
                                        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Statistik & Momentum</h4>
                                        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{deepSections.statisticalSignals}</p>
                                        <p className="text-sm leading-relaxed text-[var(--text-secondary)] mt-2">{deepSections.momentumAssessment}</p>
                                    </div>
                                    <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-primary)] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
                                        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Fibonacci & Faktor Risiko</h4>
                                        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{deepSections.fibonacciMapping}</p>
                                        <p className="text-sm leading-relaxed text-[var(--text-secondary)] mt-2">{deepSections.riskFactors}</p>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-primary)] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                        <h4 className="text-sm font-semibold text-[var(--text-primary)]">Skenario Trading</h4>
                                        <span className="text-[11px] px-2 py-1 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-semibold">
                                            Confidence: {confidenceText}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                                        {scenarioMatrix.map((scenario) => (
                                            <div
                                                key={scenario.name}
                                                className={`rounded-xl border px-3 py-3 shadow-sm ${scenario.tone === 'bull'
                                                    ? 'border-emerald-200 bg-emerald-50/80'
                                                    : scenario.tone === 'bear'
                                                        ? 'border-rose-200 bg-rose-50/80'
                                                        : 'border-[var(--border-light)] bg-[var(--bg-secondary)]/90'
                                                    }`}
                                            >
                                                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1">{scenario.name}</p>
                                                <p className="text-xs text-[var(--text-secondary)]"><span className="font-semibold text-[var(--text-primary)]">Trigger:</span> {scenario.trigger}</p>
                                                <p className="text-xs text-[var(--text-secondary)] mt-1"><span className="font-semibold text-[var(--text-primary)]">Invalidasi:</span> {scenario.invalidation}</p>
                                                <p className="text-xs text-[var(--text-secondary)] mt-1"><span className="font-semibold text-[var(--text-primary)]">Target:</span> {scenario.target}</p>
                                                <p className="text-xs text-[var(--text-secondary)] mt-2 italic">{scenario.note}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        <div className="bg-[var(--bg-primary)] rounded-2xl p-6 border border-[var(--border-light)] min-h-[600px]">
                            <AnimatePresence mode="wait">
                                {error ? (
                                    <motion.div
                                        key="error"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex flex-col items-center justify-center h-full py-10 px-4"
                                    >
                                        {/* Trigger Premium UI for Limits, Quota, or Locks/Upgrades */}
                                        {error.includes("Limit") || error.includes("Quota") || error.includes("Locked") || error.includes("Upgrade") || error.includes("paket") ? (
                                            <>
                                                {/* BLURRED MOCKUP BACKGROUND */}
                                                <div className="absolute inset-0 filter blur-md opacity-50 select-none pointer-events-none bg-[var(--bg-primary)] p-6 overflow-hidden">
                                                    <div className="h-8 w-3/4 bg-gray-200 rounded mb-4"></div>
                                                    <div className="flex gap-2 mb-6">
                                                        <div className="h-6 w-20 bg-blue-100 rounded-full"></div>
                                                        <div className="h-6 w-16 bg-[var(--bg-secondary)] rounded-full"></div>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div className="h-4 w-full bg-[var(--bg-secondary)] rounded"></div>
                                                        <div className="h-4 w-5/6 bg-[var(--bg-secondary)] rounded"></div>
                                                        <div className="h-4 w-full bg-[var(--bg-secondary)] rounded"></div>
                                                        <div className="h-32 w-full bg-[var(--bg-secondary)] rounded my-4 border border-[var(--border-light)]"></div>
                                                        <div className="h-4 w-4/5 bg-[var(--bg-secondary)] rounded"></div>
                                                        <div className="h-4 w-full bg-[var(--bg-secondary)] rounded"></div>
                                                    </div>
                                                </div>

                                                {/* PREMIUM OVERLAY CARD */}
                                                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 bg-[var(--bg-primary)]/60 backdrop-blur-sm">
                                                    <div className="bg-gradient-to-br from-white to-red-50 border border-red-100 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center transform transition-all hover:scale-105 duration-300">
                                                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-100 to-red-50 flex items-center justify-center mx-auto mb-6 shadow-inner ring-4 ring-white">
                                                            <LockIcon size="xl" className="text-red-600" />
                                                        </div>

                                                        {/* Dynamic Title & Message */}
                                                        {error.includes("Timeframe") ? (
                                                            <>
                                                                <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Timeframe Locked</h3>
                                                                <p className="text-[var(--text-secondary)] mb-8 leading-relaxed">
                                                                    Timeframe ini khusus untuk member PRO/VVIP.
                                                                    <br />Upgrade sekarang untuk akses ke semua timeframe.
                                                                </p>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Daily Quota Reached</h3>
                                                                <p className="text-[var(--text-secondary)] mb-8 leading-relaxed">
                                                                    Anda telah mencapai batas <span className="font-semibold text-red-500">1x Analisa Harian</span>.
                                                                    <br />Upgrade ke PRO untuk membuka akses unlimited dan sinyal AI akurasi tinggi.
                                                                </p>
                                                            </>
                                                        )}

                                                        <div className="space-y-4">
                                                            <button
                                                                onClick={() => router.push('/pricing')}
                                                                className="w-full py-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold text-lg rounded-xl shadow-lg shadow-red-500/30 transition-all flex items-center justify-center gap-2 group"
                                                            >
                                                                <span>Buka Akses Premium</span>
                                                                <ArrowRightIcon size="sm" className="group-hover:translate-x-1 transition-transform" />
                                                            </button>
                                                            <button
                                                                onClick={() => setError(null)}
                                                                className="text-sm font-medium text-gray-400 hover:text-[var(--text-secondary)] transition-colors"
                                                            >
                                                                Kembali
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                                                    <XCircleIcon size="lg" className="text-red-500" />
                                                </div>
                                                <p className="text-red-600 text-center mb-4">{error}</p>
                                                <button
                                                    onClick={() => setError(null)}
                                                    className="px-4 py-2 rounded-lg bg-[var(--bg-secondary)] text-sm hover:bg-[var(--bg-tertiary)] transition-colors"
                                                >
                                                    Dismiss
                                                </button>
                                            </>
                                        )}
                                    </motion.div>
                                ) : isAnalyzing ? (
                                    <motion.div
                                        key="loading"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex flex-col items-center justify-center h-full py-20"
                                    >
                                        <div className="relative w-20 h-20 mb-6">
                                            <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
                                            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[var(--accent-blue)] animate-spin" />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <SparklesIcon size="lg" className="text-[var(--accent-blue)]" />
                                            </div>
                                        </div>
                                        <p className="text-[var(--text-secondary)] animate-pulse">ARRA Quantum Strategist is analyzing...</p>
                                        <p className="text-[var(--text-muted)] text-sm mt-2">Analyzing <span className="text-[var(--text-primary)] font-medium">{selectedPair}</span> on <span className="text-[var(--text-primary)]">{selectedTimeframe}</span></p>
                                    </motion.div>
                                ) : analysisResult ? (
                                    <motion.div
                                        key="result"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="analysis-result-light"
                                        dangerouslySetInnerHTML={{ __html: analysisResult }}
                                    />
                                ) : (
                                    <motion.div
                                        key="empty"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex flex-col items-center justify-center h-full py-20"
                                    >
                                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center mb-6">
                                            <ChartIcon size="xl" className="text-[var(--accent-blue)]" />
                                        </div>
                                        <h3 className="text-xl font-semibold mb-2 text-[var(--text-primary)]">Ready to Analyze</h3>
                                        <p className="text-[var(--text-secondary)] text-center max-w-md">
                                            Pilih kategori, pair, dan timeframe. Lalu klik <strong className="text-[var(--accent-blue)]">&quot;Analisa Market&quot;</strong> untuk mendapatkan insights dari AI.
                                        </p>
                                        <div className="mt-6 flex flex-wrap gap-2 justify-center">
                                            {PAIR_CATEGORIES.map(cat => (
                                                <span key={cat.id} className="text-xs px-3 py-1 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                                                    {cat.icon} {cat.pairs.length} pairs
                                                </span>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div >
                </div >
            </div >

            {/* Analysis Result Styles - Light Theme */}
            < style jsx global > {`
                .analysis-result-light .analysis-container {
                    color: #1d1d1f;
                }
                
                .analysis-result-light .analysis-header {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #1d1d1f;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 1rem;
                    padding-bottom: 0.75rem;
                    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
                }
                
                .analysis-result-light .meta-row {
                    display: flex;
                    gap: 0.5rem;
                    margin-bottom: 0.75rem;
                }
                
                .analysis-result-light .badge {
                    padding: 0.25rem 0.75rem;
                    border-radius: 9999px;
                    font-size: 0.75rem;
                    font-weight: 600;
                }
                
                .analysis-result-light .badge.pair {
                    background: rgba(0, 113, 227, 0.1);
                    border: 1px solid rgba(0, 113, 227, 0.2);
                    color: #0071e3;
                }
                
                .analysis-result-light .badge.tf {
                    background: rgba(0, 0, 0, 0.05);
                    border: 1px solid rgba(0, 0, 0, 0.08);
                    color: #86868b;
                }
                
                .analysis-result-light .tech-row {
                    color: #86868b;
                    margin-bottom: 0.5rem;
                }
                
                .analysis-result-light .risk-badge {
                    display: inline-block;
                    padding: 0.25rem 0.75rem;
                    border-radius: 0.5rem;
                    font-size: 0.75rem;
                    font-weight: 700;
                    margin-bottom: 1rem;
                }
                
                .analysis-result-light .risk-badge.risk-LOW,
                .analysis-result-light .risk-badge.risk-low {
                    background: rgba(34, 197, 94, 0.1);
                    color: #16a34a;
                    border: 1px solid rgba(34, 197, 94, 0.2);
                }
                
                .analysis-result-light .risk-badge.risk-MID,
                .analysis-result-light .risk-badge.risk-mid {
                    background: rgba(245, 158, 11, 0.1);
                    color: #d97706;
                    border: 1px solid rgba(245, 158, 11, 0.2);
                }
                
                .analysis-result-light .risk-badge.risk-HIGH,
                .analysis-result-light .risk-badge.risk-high {
                    background: rgba(239, 68, 68, 0.1);
                    color: #dc2626;
                    border: 1px solid rgba(239, 68, 68, 0.2);
                }
                
                .analysis-result-light .section-divider {
                    height: 1px;
                    background: rgba(0, 0, 0, 0.08);
                    margin: 1.5rem 0;
                }
                
                .analysis-result-light .signal-box {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1rem;
                    border-radius: 0.75rem;
                    margin-bottom: 1rem;
                }
                
                .analysis-result-light .signal-box.signal-buy {
                    background: rgba(34, 197, 94, 0.08);
                    border: 1px solid rgba(34, 197, 94, 0.2);
                }
                
                .analysis-result-light .signal-box.signal-sell {
                    background: rgba(239, 68, 68, 0.08);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                }
                
                .analysis-result-light .signal-type {
                    font-size: 1.5rem;
                    font-weight: 800;
                }
                
                .analysis-result-light .signal-box.signal-buy .signal-type { color: #16a34a; }
                .analysis-result-light .signal-box.signal-sell .signal-type { color: #dc2626; }
                
                .analysis-result-light .trade-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.5rem 0;
                    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
                }
                
                .analysis-result-light .trade-row .label {
                    color: #86868b;
                    font-size: 0.875rem;
                }
                
                .analysis-result-light .trade-row .value {
                    font-family: 'SF Mono', monospace;
                    font-weight: 600;
                    color: #1d1d1f;
                }
                
                .analysis-result-light .trade-row.sl .value { color: #dc2626; }
                .analysis-result-light .trade-row.tp .value { color: #16a34a; }
                .analysis-result-light .trade-row .value.entry { color: #0071e3; }
                
                .analysis-result-light .analysis-section {
                    margin-top: 1.5rem;
                    padding: 1rem;
                    background: rgba(0, 0, 0, 0.02);
                    border-radius: 0.75rem;
                    border: 1px solid rgba(0, 0, 0, 0.05);
                }
                
                .analysis-result-light .analysis-text {
                    color: #86868b;
                    line-height: 1.6;
                    font-size: 0.9rem;
                }
            `}</style >
        </div >
    );
}
