'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
    ArrowPathIcon,
    ArrowTrendingDownIcon,
    ArrowTrendingUpIcon,
    BoltIcon,
    CalculatorIcon,
    ChartBarIcon,
    CheckIcon,
    ChevronDownIcon,
    ClipboardDocumentCheckIcon,
    ClockIcon,
    CpuChipIcon,
    DocumentTextIcon,
    InformationCircleIcon,
    KeyIcon,
    LockClosedIcon,
    MagnifyingGlassIcon,
    ShieldCheckIcon,
    SignalIcon,
    SpeakerWaveIcon,
    SpeakerXMarkIcon,
    SparklesIcon,
} from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
import { usePicaDevice } from '@/context/PicaDeviceContext';
import { isAdminEmail, isAdminUser } from '@/lib/admin-access';
import PineScriptViewer from '@/components/arra-cronos/PineScriptViewer';
import type { CronosCandle, CronosForecast } from '@/components/arra-cronos/CronosChart';
import type {
    CronosTradePlan,
    CronosQuantMetrics,
    CronosMTFBias,
} from '@/lib/arra-cronos-engine';
import { getPipSpec, calculatePositionSizing } from '@/lib/arra-cronos-engine';

const CronosChart = dynamic(() => import('@/components/arra-cronos/CronosChart'), { ssr: false });
const TradingViewCronosChart = dynamic(() => import('@/components/arra-cronos/TradingViewCronosChart'), { ssr: false });

type Category = { id: string; name: string; pairs: { symbol: string; name: string }[] };
type Instrument = { symbol: string; name: string };

type MarketData = {
    symbol: string;
    name: string;
    feedSymbol: string;
    tvSymbol: string;
    timeframe: string;
    candles: CronosCandle[];
    currentPrice: number;
    latestBarClose: number;
    changePercent: number;
    source: string;
    updatedAt: string;
    freshnessSeconds: number;
    isFresh: boolean;
    count: number;
    volumeCoverage: number;
};

type ModelStatus = { available: boolean; model: string; status: string; device?: string; message: string };

type ForecastData = {
    forecast: CronosForecast[];
    direction: 'UP' | 'DOWN' | 'FLAT';
    action?: 'BUY' | 'SELL' | 'WAIT';
    currentPrice: number;
    targetPrice: number;
    tradePlan?: CronosTradePlan;
    metrics?: CronosQuantMetrics;
    mtfMatrix?: Record<string, CronosMTFBias>;
    confluenceScore?: number;
    confluenceSummary?: string;
    commentary?: string;
    inferenceMs: number;
    generatedAt: string;
    model: string;
    modelSource: string;
    historyBars: number;
};

const TIMEFRAMES = [
    { id: '15m', label: '15M' },
    { id: '1h', label: '1H' },
    { id: '4h', label: '4H' },
    { id: '1d', label: '1D' },
] as const;

type ChartMode = 'tradingview' | 'lightweight';

const CATEGORY_SHORT: Record<string, string> = {
    major: 'FOREX MAJOR',
    minor: 'FOREX CROSS',
    commodities: 'KOMODITAS',
    crypto: 'KRIPTO',
    indices: 'INDEKS',
};

function formatPrice(symbol: string, price: number) {
    const decimals =
        symbol.includes('JPY') ||
        symbol.includes('XAU') ||
        symbol.includes('XAG') ||
        (symbol.endsWith('USD') && !['EURUSD', 'GBPUSD', 'AUDUSD', 'NZDUSD'].includes(symbol))
            ? 2
            : price >= 100
            ? 2
            : 5;
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(price);
}

function calculateMetrics(candles: CronosCandle[]) {
    const closes = candles.map((candle) => candle.close);
    const ranges = candles
        .slice(1)
        .map((candle, index) =>
            Math.max(
                candle.high - candle.low,
                Math.abs(candle.high - closes[index]),
                Math.abs(candle.low - closes[index])
            )
        );
    const atrValues = ranges.slice(-14);
    const atr = atrValues.length ? atrValues.reduce((sum, value) => sum + value, 0) / atrValues.length : 0;
    const gains: number[] = [];
    const losses: number[] = [];
    for (let index = Math.max(1, closes.length - 14); index < closes.length; index += 1) {
        const delta = closes[index] - closes[index - 1];
        if (delta >= 0) gains.push(delta);
        else losses.push(-delta);
    }
    const averageGain = gains.length ? gains.reduce((sum, value) => sum + value, 0) / 14 : 0;
    const averageLoss = losses.length ? losses.reduce((sum, value) => sum + value, 0) / 14 : 0;
    const rsi = averageLoss === 0 ? (averageGain === 0 ? 50 : 100) : 100 - 100 / (1 + averageGain / averageLoss);
    const ema = (period: number) => {
        const alpha = 2 / (period + 1);
        const start = Math.max(0, closes.length - period * 3);
        const values = closes.slice(start);
        return values.slice(1).reduce((value, close) => alpha * close + (1 - alpha) * value, values[0] || 0);
    };
    return { atr, rsi, ema21: ema(21), ema55: ema(55) };
}

function formatAge(seconds: number) {
    if (seconds < 60) return `${seconds} dtk`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} mnt`;
    if (seconds < 86_400) return `${Math.floor(seconds / 3600)} jam`;
    return `${Math.floor(seconds / 86_400)} hari`;
}

// Audio synthesizer for pleasant trading signals using Web Audio API
function playSignalChime(type: 'BUY' | 'SELL') {
    if (typeof window === 'undefined') return;
    try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const now = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';

        if (type === 'BUY') {
            // Ascending major chord (C5 -> E5 -> G5)
            osc1.frequency.setValueAtTime(523.25, now);
            osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.18);
            osc2.frequency.setValueAtTime(659.25, now);
            osc2.frequency.exponentialRampToValueAtTime(1046.50, now + 0.18);
        } else {
            // Descending minor chord (A5 -> F5 -> D5)
            osc1.frequency.setValueAtTime(880.00, now);
            osc1.frequency.exponentialRampToValueAtTime(587.33, now + 0.18);
            osc2.frequency.setValueAtTime(698.46, now);
            osc2.frequency.exponentialRampToValueAtTime(440.00, now + 0.18);
        }

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.36);
        osc2.stop(now + 0.36);
    } catch {
        // Audio playback error or autoplay muted
    }
}

export default function ArraCronosPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('commodities');
    const [selectedSymbol, setSelectedSymbol] = useState('XAUUSD');
    const [timeframe, setTimeframe] = useState<(typeof TIMEFRAMES)[number]['id']>('1h');
    const [search, setSearch] = useState('');
    const [market, setMarket] = useState<MarketData | null>(null);
    const [forecast, setForecast] = useState<ForecastData | null>(null);
    const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isForecasting, setIsForecasting] = useState(false);
    const [marketError, setMarketError] = useState('');
    const [forecastError, setForecastError] = useState('');
    const [groqReview, setGroqReview] = useState('');
    const [groqReviewModel, setGroqReviewModel] = useState('');
    const [groqReviewError, setGroqReviewError] = useState('');
    const [isReviewingWithGroq, setIsReviewingWithGroq] = useState(false);
    const { data: session } = useSession();
    const { tier, openActivation, deviceId } = usePicaDevice();
    const [hasLocalUnlock, setHasLocalUnlock] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const local = localStorage.getItem('pica_arra_cronos_unlocked') === 'true';
            if (local) setHasLocalUnlock(true);
        }
    }, []);

    const isAdmin =
        isAdminUser(session?.user) ||
        isAdminEmail(session?.user?.email) ||
        session?.user?.isAdmin === true ||
        (session?.user as any)?.role === 'ADMIN' ||
        (session?.user as any)?.tier === 'ADMIN';

    const isUnlocked =
        isAdmin ||
        hasLocalUnlock ||
        tier === 'PRO' ||
        tier === 'VVIP' ||
        session?.user?.tier === 'PRO' ||
        session?.user?.tier === 'VVIP' ||
        (session?.user as any)?.plan === 'ARRA_CRONOS' ||
        (session?.user as any)?.plan === 'ALL_ACCESS';

    const [chartMode, setChartMode] = useState<ChartMode>('lightweight');
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [countdown, setCountdown] = useState(30);

    // Interactive Institutional Tools State
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [accountEquity, setAccountEquity] = useState<number>(1000);
    const [riskPercent, setRiskPercent] = useState<number>(1.0);
    const [copiedPlan, setCopiedPlan] = useState(false);
    const [activeTab, setActiveTab] = useState<'plan' | 'commentary' | 'calculator'>('plan');

    const visibleAssets = useMemo(() => {
        const list = categories.find((category) => category.id === selectedCategory)?.pairs || [];
        const query = search.trim().toLowerCase();
        return query
            ? list.filter((asset) => asset.symbol.toLowerCase().includes(query) || asset.name.toLowerCase().includes(query))
            : list;
    }, [categories, selectedCategory, search]);

    const activeAsset: Instrument | undefined = useMemo(
        () => categories.flatMap((category) => category.pairs).find((asset) => asset.symbol === selectedSymbol),
        [categories, selectedSymbol]
    );

    const activeRequestIdRef = useRef(0);
    const lastPlayedActionRef = useRef<string | null>(null);

    const loadStatus = useCallback(async () => {
        try {
            const response = await fetch('/api/arra-cronos/status', { cache: 'no-store' });
            const status = await response.json();
            setModelStatus(status);
        } catch {
            setModelStatus({
                available: false,
                model: 'ARRA Cronos Quant Scenarios',
                status: 'offline',
                message: 'Status model tidak bisa dibaca.',
            });
        }
    }, []);

    const runForecast = useCallback(
        async (sym: string, tf: string, reqId: number) => {
            setIsForecasting(true);
            setForecastError('');
            try {
                const response = await fetch('/api/arra-cronos/forecast', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ symbol: sym, timeframe: tf }),
                });
                const payload = await response.json();
                if (activeRequestIdRef.current === reqId) {
                    if (!response.ok) throw new Error(payload.error || 'Forecast model tidak tersedia.');
                    setForecast(payload);

                    // Trigger sound chime if signal changes
                    if (payload.action && payload.action !== 'WAIT' && soundEnabled) {
                        const signalKey = `${sym}_${payload.action}_${tf}`;
                        if (lastPlayedActionRef.current !== signalKey) {
                            playSignalChime(payload.action);
                            lastPlayedActionRef.current = signalKey;
                        }
                    }
                }
            } catch (error) {
                if (activeRequestIdRef.current === reqId) {
                    setForecastError(error instanceof Error ? error.message : 'Forecast model tidak tersedia.');
                }
            } finally {
                if (activeRequestIdRef.current === reqId) {
                    setIsForecasting(false);
                }
            }
        },
        [soundEnabled]
    );

    const handleSelectSymbol = useCallback(
        (sym: string) => {
            if (sym === selectedSymbol) return;
            setMarket(null);
            setForecast(null);
            setSelectedSymbol(sym);
        },
        [selectedSymbol]
    );

    const handleSelectCategory = useCallback(
        (catId: string) => {
            setSelectedCategory(catId);
            setSearch('');
            const cat = categories.find((c) => c.id === catId);
            if (cat && cat.pairs.length > 0) {
                const firstSym = cat.pairs[0].symbol;
                if (firstSym !== selectedSymbol) {
                    setMarket(null);
                    setForecast(null);
                    setSelectedSymbol(firstSym);
                }
            }
        },
        [categories, selectedSymbol]
    );

    const handleSelectTimeframe = useCallback(
        (tf: (typeof TIMEFRAMES)[number]['id']) => {
            if (tf === timeframe) return;
            setMarket(null);
            setForecast(null);
            setTimeframe(tf);
        },
        [timeframe]
    );

    const handleGroqReview = useCallback(async () => {
        setIsReviewingWithGroq(true);
        setGroqReviewError('');
        try {
            const response = await fetch('/api/arra-cronos/review', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(deviceId ? { 'x-device-id': deviceId } : {}),
                },
                body: JSON.stringify({ symbol: selectedSymbol, timeframe }),
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error || 'Review Groq belum tersedia.');
            setGroqReview(payload.review || 'Groq tidak mengembalikan ulasan.');
            setGroqReviewModel(payload.model || 'Groq');
        } catch (error) {
            setGroqReviewError(error instanceof Error ? error.message : 'Review Groq gagal diproses.');
        } finally {
            setIsReviewingWithGroq(false);
        }
    }, [deviceId, selectedSymbol, timeframe]);

    useEffect(() => {
        setGroqReview('');
        setGroqReviewError('');
    }, [selectedSymbol, timeframe]);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await loadStatus();
        const reqId = ++activeRequestIdRef.current;
        try {
            const response = await fetch(
                `/api/arra-cronos/market?symbol=${encodeURIComponent(selectedSymbol)}&timeframe=${timeframe}`,
                { cache: 'no-store' }
            );
            const payload = await response.json();
            if (response.ok && payload && !payload.error) {
                setMarket(payload);
                await runForecast(selectedSymbol, timeframe, reqId);
            }
        } catch {
            // ignore
        } finally {
            setIsRefreshing(false);
        }
    }, [selectedSymbol, timeframe, loadStatus, runForecast]);

    useEffect(() => {
        let live = true;
        fetch('/api/arra-cronos/catalog', { cache: 'no-store' })
            .then((response) => response.json())
            .then((payload) => {
                if (live) setCategories(payload.categories || []);
            })
            .catch(() => undefined);
        loadStatus();
        return () => {
            live = false;
        };
    }, [loadStatus]);

    useEffect(() => {
        const interval = window.setInterval(loadStatus, 60_000);
        return () => window.clearInterval(interval);
    }, [loadStatus]);

    // Single stable effect for fetching market & forecast with instant reset on symbol/timeframe switch
    useEffect(() => {
        if (!categories.length) return;
        let cancelled = false;
        const reqId = ++activeRequestIdRef.current;

        async function load() {
            setMarketError('');
            setIsLoading(true);

            try {
                const response = await fetch(
                    `/api/arra-cronos/market?symbol=${encodeURIComponent(selectedSymbol)}&timeframe=${timeframe}`,
                    { cache: 'no-store' }
                );
                const payload = await response.json();
                if (cancelled) return;
                if (!response.ok) throw new Error(payload.error || 'Data harga belum tersedia.');
                setMarket(payload);
                setIsLoading(false);

                // Auto calculate Kronos forecast for the newly selected pair
                runForecast(selectedSymbol, timeframe, reqId);
            } catch (error) {
                if (cancelled) return;
                const message = error instanceof Error ? error.message : 'Analisis gagal dimuat.';
                setMarketError(message);
                setIsLoading(false);
            }
        }

        load();

        const interval = window.setInterval(() => {
            fetch(`/api/arra-cronos/market?symbol=${encodeURIComponent(selectedSymbol)}&timeframe=${timeframe}`, {
                cache: 'no-store',
            })
                .then((r) => r.json())
                .then((payload) => {
                    if (!cancelled && payload && !payload.error) {
                        setMarket(payload);
                    }
                })
                .catch(() => undefined);
        }, 5 * 60_000);

        return () => {
            cancelled = true;
            window.clearInterval(interval);
        };
    }, [categories.length, selectedSymbol, timeframe, runForecast]);

    // Auto-refresh interval countdown (30s)
    useEffect(() => {
        setCountdown(30);
    }, [selectedSymbol, timeframe]);

    useEffect(() => {
        if (!autoRefresh) return;
        const timer = window.setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    handleRefresh();
                    return 30;
                }
                return prev - 1;
            });
        }, 1000);
        return () => window.clearInterval(timer);
    }, [autoRefresh, handleRefresh]);

    const metrics = useMemo(() => (market ? calculateMetrics(market.candles) : null), [market]);
    const currentPrice = market?.currentPrice || 0;
    const forecastBase = forecast?.currentPrice || market?.latestBarClose || currentPrice;
    const rawMove = forecast ? forecast.targetPrice - forecastBase : 0;
    const modelBias = forecast?.direction || null;

    // Resolve technical action & reference levels
    const action: 'BUY' | 'SELL' | 'WAIT' = forecast?.tradePlan?.action
        ? forecast.tradePlan.action
        : forecast && metrics
        ? Math.abs(rawMove) >= metrics.atr * 0.2
            ? rawMove > 0
                ? 'BUY'
                : 'SELL'
            : 'WAIT'
        : 'WAIT';

    const entry = action !== 'WAIT' ? (forecast?.tradePlan?.entryPrice || forecastBase) : null;
    const stop =
        action === 'BUY'
            ? (forecast?.tradePlan?.stopLoss || (metrics ? forecastBase - metrics.atr * 1.3 : null))
            : action === 'SELL'
            ? (forecast?.tradePlan?.stopLoss || (metrics ? forecastBase + metrics.atr * 1.3 : null))
            : null;
    const tp1 = action !== 'WAIT' ? (forecast?.tradePlan?.takeProfit1 || null) : null;
    const tp2 = action !== 'WAIT' ? (forecast?.tradePlan?.takeProfit2 || null) : null;
    const target = action !== 'WAIT' ? tp2 : null;
    const movePct = forecastBase && forecast ? (rawMove / forecastBase) * 100 : 0;

    const pipSpec = useMemo(() => getPipSpec(selectedSymbol), [selectedSymbol]);

    // Live position sizing calculation based on user input
    const liveSizing = useMemo(() => {
        if (!entry || !stop || !tp1 || !tp2) return null;
        return calculatePositionSizing(
            selectedSymbol,
            accountEquity,
            riskPercent,
            entry,
            stop,
            tp1,
            tp2
        );
    }, [selectedSymbol, accountEquity, riskPercent, entry, stop, tp1, tp2]);

    const upColor = 'text-emerald-300';
    const downColor = 'text-rose-300';
    const price = (value: number) => formatPrice(selectedSymbol, value);
    const selectedCategoryName = CATEGORY_SHORT[selectedCategory] || 'PASAR';

    // Copy formatted signal message to clipboard
    const handleCopySignal = useCallback(() => {
        if (!forecast || !entry || !stop || !tp2) return;
        const dateStr = new Date(forecast.generatedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
        const text = `🎯 *ARRA CRONOS SIGNAL · ${selectedSymbol}*
────────────────────────
⚡ *Action:* ${action} @ ${price(entry)}
🎯 *Take Profit 2:* ${price(tp2)} (${forecast.tradePlan?.expectedMovePips || ''} ${pipSpec.unitName})
💰 *Take Profit 1:* ${tp1 ? price(tp1) : '—'}
🛡️ *Stop Loss:* ${price(stop)} (${forecast.tradePlan?.riskPips || ''} ${pipSpec.unitName})
📊 *Risk:Reward:* 1:${forecast.tradePlan?.riskRewardRatio || '2.0'}
📐 *Alignment index:* ${forecast.metrics?.alignmentScore ?? 0}/100 · ${forecast.confluenceSummary || 'Konfluensi belum tersedia'}
💼 *Lot ilustratif:* ${liveSizing?.lotSize ?? forecast.tradePlan?.recommendedLot ?? '—'} ($${liveSizing?.dollarRisk ?? forecast.tradePlan?.dollarRisk ?? '—'} risiko estimasi @ $${accountEquity})
⏰ *Timeframe:* ${timeframe.toUpperCase()} (${dateStr} WIB)
────────────────────────
_Generated by ARRA Cronos Quant Engine_`;

        navigator.clipboard.writeText(text);
        setCopiedPlan(true);
        setTimeout(() => setCopiedPlan(false), 2500);
    }, [forecast, entry, stop, tp1, tp2, action, selectedSymbol, pipSpec.unitName, liveSizing, accountEquity, timeframe]);

    return (
        <main className="min-h-screen bg-[#F2F2EE] px-3 pb-12 pt-24 text-slate-800 sm:px-6 lg:px-8 font-sans selection:bg-cyan-200">
            <div className="mx-auto max-w-6xl">
                {/* Header Section */}
                <header className="mb-5 flex flex-col justify-between gap-4 border-b border-[#DCDCD5] pb-5 sm:flex-row sm:items-end">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.28em] text-cyan-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_14px_#67e8f9]" />
                            PICA QUANT · MULTI-ASSET DESK
                        </div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-[38px]">
                            ARRA{' '}
                            <span className="bg-gradient-to-r from-cyan-700 via-blue-700 to-indigo-700 bg-clip-text text-transparent">
                                Cronos
                            </span>
                        </h1>
                        <p className="mt-1 text-sm text-slate-600">
                            ARRA Cronos · analisis teknikal multi-timeframe dari data OHLCV.
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                            <Link
                                href="/arra-grok"
                                className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-800 hover:bg-emerald-100 transition"
                            >
                                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                                <span>BUKA TERMINAL ARRA GROK · ANALISIS PASAR &rarr;</span>
                            </Link>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Audio Chime Toggle */}
                        <button
                            onClick={() => setSoundEnabled((prev) => !prev)}
                            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                                soundEnabled
                                    ? 'border-cyan-300 bg-cyan-50 text-cyan-800 hover:bg-cyan-100'
                                    : 'border-slate-300 bg-white text-slate-500 hover:text-slate-700'
                            }`}
                            title={soundEnabled ? 'Matikan nada sinyal' : 'Nyalakan nada sinyal'}
                        >
                            {soundEnabled ? (
                                <>
                                    <SpeakerWaveIcon className="h-4 w-4 text-cyan-700 animate-pulse" />
                                    <span>Sound: ON</span>
                                </>
                            ) : (
                                <>
                                    <SpeakerXMarkIcon className="h-4 w-4" />
                                    <span>Sound: OFF</span>
                                </>
                            )}
                        </button>

                        {/* Model Status Pill */}
                        <div
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-bold ${
                                modelStatus?.available
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                    : 'border-amber-200 bg-amber-50 text-amber-800'
                            }`}
                        >
                            <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                    modelStatus?.available ? 'bg-emerald-300 shadow-[0_0_8px_#34d399]' : 'bg-amber-300'
                                }`}
                            />
                            {modelStatus?.available ? 'QUANT ENGINE ACTIVE' : 'ENGINE OFFLINE'}
                        </div>

                        {/* TradingView Source */}
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] font-bold text-blue-800">
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                            </svg>
                            TradingView Live
                        </div>

                        {/* Auto-Refresh Toggle */}
                        <button
                            onClick={() => setAutoRefresh((prev) => !prev)}
                            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                                autoRefresh
                                    ? 'border-cyan-300 bg-cyan-50 text-cyan-800 hover:bg-cyan-100'
                                    : 'border-slate-300 bg-white text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <span
                                className={`h-2 w-2 rounded-full ${
                                    autoRefresh ? 'bg-cyan-300 shadow-[0_0_8px_#67e8f9] animate-pulse' : 'bg-slate-600'
                                }`}
                            />
                            {autoRefresh ? `Auto: ${countdown}s` : 'Auto: OFF'}
                        </button>

                        {/* Refresh Button */}
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing || isLoading}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-cyan-400/40 hover:text-cyan-800 disabled:opacity-50"
                        >
                            <ArrowPathIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
                        </button>
                    </div>
                </header>

                {/* INSTITUTIONAL PAYWALL LOCK BANNER (Harga Rp 150.000 + Bonus Indikator TradingView) */}
                {!isUnlocked && (
                    <div className="mb-6 overflow-hidden rounded-3xl border border-cyan-500/40 bg-gradient-to-br from-[#0c192d] via-[#091220] to-[#141029] p-6 shadow-2xl relative">
                        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
                        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                            <div className="max-w-3xl">
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 border border-amber-400/40 px-3 py-1 text-xs font-black text-amber-300">
                                        <LockClosedIcon className="h-3.5 w-3.5" />
                                        FITUR ARRA CRONOS TERKUNCI
                                    </span>
                                    <span className="rounded-full bg-cyan-400/20 px-3 py-1 text-xs font-black text-cyan-200 border border-cyan-400/30">
                                        DISKON SPESIAL 70% · RP 150.000
                                    </span>
                                    <span className="text-[11px] text-slate-400 line-through">
                                        Rp 499.000
                                    </span>
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                                    Buka Akses ARRA Cronos Analysis Desk + <span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-indigo-300 bg-clip-text text-transparent">Bonus Indikator TradingView</span>
                                </h2>
                                <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-300">
                                    Dapatkan akses ke analisis teknikal multi-timeframe ARRA Cronos, skenario berbasis ATR, kalkulator risiko ilustratif, <strong>ARRA GROK market terminal (Forex, Gold Futures, dan Bitcoin)</strong>, serta bonus source code indikator TradingView Pine Script v6.
                                </p>
                                <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-semibold text-slate-300">
                                    <div className="rounded-xl border border-slate-800 bg-[#060b13]/80 p-2">
                                        <span className="text-cyan-300">🎯 Proyeksi Masa Depan</span>
                                        <p className="text-[10px] text-slate-500 mt-0.5">Skenario ATR; bukan probabilitas terkalibrasi.</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-800 bg-[#060b13]/80 p-2">
                                        <span className="text-emerald-300">🎁 Bonus Pine Script v6</span>
                                        <p className="text-[10px] text-slate-500">Pasang di TradingView sendiri.</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-800 bg-[#060b13]/80 p-2">
                                        <span className="text-indigo-300">⚡ Sinyal BUY/SELL & SL/TP</span>
                                        <p className="text-[10px] text-slate-500">Target otomatis berbasis ATR.</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-800 bg-[#060b13]/80 p-2">
                                        <span className="text-amber-300">👑 Sekali Bayar Selamanya</span>
                                        <p className="text-[10px] text-slate-500">Tanpa langganan bulanan.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 min-w-[240px]">
                                <Link
                                    href="/payment/checkout?plan=ARRA_CRONOS"
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 px-6 py-3.5 text-xs sm:text-sm font-black text-slate-950 shadow-xl shadow-cyan-500/25 hover:opacity-95 transition transform hover:scale-[1.02]"
                                >
                                    <BoltIcon className="h-4 w-4" />
                                    <span>ORDER SEKARANG — RP 150.000</span>
                                </Link>
                                <div className="flex items-center gap-2">
                                    <a
                                        href="https://t.me/arra7trader?text=Halo%20Admin%20ARRA7!%20Saya%20ingin%20order%20ARRA%20Cronos%20(Rp%20150.000)%20+%20Bonus%20Indikator%20TradingView"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-[11px] font-bold text-slate-200 hover:bg-slate-800 transition"
                                    >
                                        <span>💬 Chat Admin</span>
                                    </a>
                                    <button
                                        onClick={openActivation}
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-[11px] font-bold text-slate-200 hover:bg-slate-800 transition"
                                    >
                                        <KeyIcon className="h-3.5 w-3.5 text-amber-300" />
                                        <span>Aktivasi Kode</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Grok-style terminal window; the locked state previews the layout behind its access banner. */}
                <div className={`mx-auto max-w-6xl overflow-hidden rounded-2xl sm:rounded-3xl border border-[#DCDCD5] bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.04)] ${!isUnlocked ? 'pointer-events-none opacity-40 blur-[1px]' : ''}`}>
                    <div className="flex items-center justify-between border-b border-[#ECECE6] bg-[#F7F7F4] px-4 py-3 sm:px-6">
                        <div className="flex items-center gap-2">
                            <span className="inline-block h-3 w-3 rounded-full border border-[#E0443E] bg-[#FF5F56] shadow-xs" />
                            <span className="inline-block h-3 w-3 rounded-full border border-[#DEA123] bg-[#FFBD2E] shadow-xs" />
                            <span className="inline-block h-3 w-3 rounded-full border border-[#1AAB29] bg-[#27C93F] shadow-xs" />
                        </div>
                        <div className="hidden sm:block text-[11px] font-mono font-medium text-slate-500">
                            arra-cronos://multi-asset-analysis
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-slate-500">
                            <span className={`h-1.5 w-1.5 rounded-full ${market && !marketError ? 'animate-pulse bg-emerald-500' : 'bg-amber-500'}`} />
                            {market && !marketError ? 'MARKET FEED' : 'WAITING FOR FEED'}
                        </div>
                    </div>
                    <div className="grid items-start gap-0 bg-[#FCFCFA] xl:grid-cols-[260px_minmax(0,1fr)]">
                    {/* Left Sidebar: Market Universe */}
                    <aside className="overflow-hidden rounded-2xl border border-[#ECECE6] bg-white">
                        <div className="border-b border-[#ECECE6] p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <div>
                                    <div className="text-[10px] font-bold uppercase tracking-[.2em] text-slate-500">
                                        Market Universe
                                    </div>
                                    <div className="mt-1 text-sm font-bold text-slate-800">Pilih Instrumen</div>
                                </div>
                                <ChevronDownIcon className="h-4 w-4 text-slate-500" />
                            </div>
                            <div className="flex items-center gap-2 rounded-xl border border-[#ECECE6] bg-[#F7F7F4] px-3 py-2.5">
                                <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-slate-500" />
                                <input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Cari simbol / market"
                                    className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-500"
                                />
                            </div>
                        </div>

                        {/* Category Filter */}
                        <nav
                            className="flex gap-1 overflow-x-auto border-b border-[#ECECE6] p-2 xl:flex-col xl:overflow-visible"
                            aria-label="Kelas aset"
                        >
                            {categories.map((category) => (
                                <button
                                    key={category.id}
                                    onClick={() => handleSelectCategory(category.id)}
                                    className={`whitespace-nowrap rounded-lg px-2.5 py-2 text-left text-[10px] font-bold tracking-wide transition ${
                                        selectedCategory === category.id
                                            ? 'bg-cyan-50 text-cyan-800 ring-1 ring-inset ring-cyan-300/20'
                                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                                    }`}
                                >
                                    {CATEGORY_SHORT[category.id] || category.name.toUpperCase()}{' '}
                                    <span className="ml-1 text-slate-500">{category.pairs.length}</span>
                                </button>
                            ))}
                        </nav>

                        {/* Asset List */}
                        <div className="max-h-[440px] overflow-y-auto p-2">
                            {visibleAssets.map((asset) => {
                                const selected = selectedSymbol === asset.symbol;
                                return (
                                    <button
                                        key={asset.symbol}
                                        onClick={() => handleSelectSymbol(asset.symbol)}
                                        className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition ${
                                            selected
                                                ? 'bg-cyan-50 ring-1 ring-inset ring-cyan-300/25'
                                                : 'hover:bg-slate-100'
                                        }`}
                                    >
                                        <span className="min-w-0">
                                            <span className={`block text-xs font-bold ${selected ? 'text-slate-900' : 'text-slate-500'}`}>
                                                {asset.symbol}
                                            </span>
                                            <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                                                {asset.name}
                                            </span>
                                        </span>
                                        <span
                                            className={`ml-2 h-1.5 w-1.5 shrink-0 rounded-full ${
                                                selected ? 'bg-cyan-300 shadow-[0_0_8px_#38bdf8]' : 'bg-slate-700'
                                            }`}
                                        />
                                    </button>
                                );
                            })}
                            {visibleAssets.length === 0 && (
                                <div className="px-3 py-8 text-center text-xs text-slate-500">
                                    Market tidak ditemukan.
                                </div>
                            )}
                        </div>
                        <div className="border-t border-[#ECECE6] px-4 py-3 text-[10px] text-slate-500">
                            {visibleAssets.length} instrumen · {selectedCategoryName}
                        </div>
                    </aside>

                    {/* Main Workspace Section */}
                    <section className="min-w-0 space-y-4">
                        {/* Top KPI Cards (4 Cards) */}
                        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                            {/* Card 1: Active Instrument */}
                            <div className="rounded-2xl border border-[#ECECE6] bg-white p-4 sm:col-span-2 2xl:col-span-1">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <div className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-500">
                                            Instrumen Aktif
                                        </div>
                                        <div className="mt-1 text-xl font-extrabold text-slate-900">
                                            {activeAsset?.symbol || selectedSymbol}
                                        </div>
                                        <div className="text-[11px] text-slate-500">{activeAsset?.name}</div>
                                    </div>
                                    <span className="rounded-lg border border-slate-300 bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-500">
                                        {selectedCategoryName}
                                    </span>
                                </div>
                                <div className="mt-4 flex items-end justify-between gap-2">
                                    <div className="text-[25px] font-bold tracking-tight text-slate-900">
                                        {market ? price(currentPrice) : '—'}
                                    </div>
                                    <div
                                        className={`pb-1 text-xs font-bold ${
                                            market && market.changePercent >= 0 ? upColor : downColor
                                        }`}
                                    >
                                        {market
                                            ? `${market.changePercent >= 0 ? '+' : ''}${market.changePercent.toFixed(2)}%`
                                            : 'Menunggu feed'}
                                    </div>
                                </div>
                                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                                    <span className="flex items-center gap-1.5">
                                        <SignalIcon className="h-3.5 w-3.5 text-cyan-400" />
                                        {market?.source || 'Sumber harga'}
                                    </span>
                                    <span>1 pt = {pipSpec.pipSize} {pipSpec.unitName}</span>
                                </div>
                            </div>

                            {/* Card 2: Technical Direction & Alignment */}
                            <div className="rounded-2xl border border-[#ECECE6] bg-white p-4">
                                <div className="mb-2 flex items-center justify-between">
                                    <div className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-500">
                                        Bias & Indeks Keselarasan
                                    </div>
                                    {forecast?.metrics && (
                                        <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                                            forecast.metrics.volatilityRegime === 'EXPANSION'
                                                ? 'bg-amber-400/10 text-amber-700 border border-amber-400/20'
                                                : forecast.metrics.volatilityRegime === 'COMPRESSION'
                                                ? 'bg-blue-400/10 text-blue-700 border border-blue-400/20'
                                                : 'bg-slate-800 text-slate-500'
                                        }`}>
                                            {forecast.metrics.volatilityRegime}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    {modelBias === 'UP' ? (
                                        <ArrowTrendingUpIcon className="h-8 w-8 text-emerald-700" />
                                    ) : modelBias === 'DOWN' ? (
                                        <ArrowTrendingDownIcon className="h-8 w-8 text-rose-700" />
                                    ) : (
                                        <BoltIcon className="h-8 w-8 text-slate-500" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div
                                            className={`text-xl font-black ${
                                                modelBias === 'UP' ? upColor : modelBias === 'DOWN' ? downColor : 'text-slate-500'
                                            }`}
                                        >
                                            {modelBias || (isForecasting ? 'MENGHITUNG…' : modelStatus?.available ? 'SIAP' : 'OFFLINE')}
                                        </div>
                                        {/* Heuristic alignment index; not win probability. */}
                                        {forecast?.metrics && (
                                            <div className="mt-1.5">
                                                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                                                    <span>Indeks alignment · bukan peluang menang</span>
                                                    <span className="text-cyan-700">{forecast.metrics.alignmentScore}/100</span>
                                                </div>
                                                <div className="mt-1 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-700 ${
                                                            forecast.metrics.alignmentScore >= 75
                                                                ? 'bg-gradient-to-r from-cyan-400 to-emerald-400'
                                                                : 'bg-gradient-to-r from-blue-400 to-cyan-400'
                                                        }`}
                                                        style={{ width: `${forecast.metrics.alignmentScore}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Card 3: Target & Expected Move */}
                            <div className="rounded-2xl border border-[#ECECE6] bg-white p-4">
                                <div className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-slate-500">
                                    Forecast Target (TP2)
                                </div>
                                <div className="text-xl font-extrabold text-slate-900">
                                    {forecast ? price(forecast.targetPrice) : '—'}
                                </div>
                                <div
                                    className={`mt-1 text-[11px] font-bold ${
                                        rawMove >= 0 ? 'text-emerald-700' : 'text-rose-700'
                                    }`}
                                >
                                    {forecast ? (
                                        <>
                                            {rawMove >= 0 ? '+' : ''}
                                            {price(rawMove)} · {movePct >= 0 ? '+' : ''}
                                            {movePct.toFixed(2)}%
                                            {forecast.tradePlan?.expectedMovePips != null && (
                                                <span className="ml-1 text-slate-500">
                                                    ({forecast.tradePlan.expectedMovePips} {pipSpec.unitName})
                                                </span>
                                            )}
                                        </>
                                    ) : isForecasting ? (
                                        'Menghitung target…'
                                    ) : (
                                        'Siap dihitung'
                                    )}
                                </div>
                                <div className="mt-2 text-[10px] text-slate-500">
                                    TP1: {tp1 ? price(tp1) : '—'} · TP2: {tp2 ? price(tp2) : '—'}
                                </div>
                            </div>

                            {/* Card 4: Action Layer & Risk-Reward */}
                            <div className="rounded-2xl border border-[#ECECE6] bg-white p-4">
                                <div className="mb-2 flex items-center justify-between">
                                    <div className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-500">
                                        Action & Setup
                                    </div>
                                    {forecast?.tradePlan && (
                                        <span className="rounded-md bg-cyan-400/10 px-1.5 py-0.5 text-[9px] font-bold text-cyan-700 border border-cyan-400/20">
                                            R:R 1:{forecast.tradePlan.riskRewardRatio}
                                        </span>
                                    )}
                                </div>
                                <div
                                    className={`text-xl font-black ${
                                        action === 'BUY'
                                            ? upColor
                                            : action === 'SELL'
                                            ? downColor
                                            : 'text-amber-800'
                                    }`}
                                >
                                    {action}
                                </div>
                                <div className="mt-1 text-[10px] leading-relaxed text-slate-500">
                                    {action === 'BUY'
                                        ? 'Bullish impulse setup terkonfirmasi'
                                        : action === 'SELL'
                                        ? 'Bearish expansion setup terkonfirmasi'
                                        : 'Sideways / Menunggu konfirmasi breakout'}
                                </div>
                                {liveSizing && action !== 'WAIT' && (
                                    <div className="mt-2 flex items-center justify-between border-t border-[#ECECE6] pt-1 text-[10px]">
                                        <span className="text-slate-500">Rec. Lot:</span>
                                        <span className="font-bold text-cyan-800">{liveSizing.lotSize} Lot</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Multi-Timeframe (MTF) Confluence Radar */}
                        {forecast?.mtfMatrix && (
                            <div className="rounded-2xl border border-[#ECECE6] bg-white p-3.5">
                                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <SparklesIcon className="h-4 w-4 text-cyan-700" />
                                        <span className="text-[10px] font-bold uppercase tracking-[.2em] text-slate-500">
                                            Multi-Timeframe Alignment Radar
                                        </span>
                                    </div>
                                    <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-0.5 text-[10px] font-bold text-cyan-800">
                                        {forecast.confluenceSummary || `${forecast.confluenceScore}% Confluence`}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    {TIMEFRAMES.map((item) => {
                                        const mtf = forecast.mtfMatrix?.[item.id];
                                        const isCurrent = timeframe === item.id;
                                        const dir = mtf?.direction || 'FLAT';
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => handleSelectTimeframe(item.id)}
                                                className={`group flex items-center justify-between rounded-xl border p-2.5 text-left transition ${
                                                    isCurrent
                                                        ? 'border-cyan-400/40 bg-cyan-400/10 ring-1 ring-cyan-400/20'
                                                        : 'border-[#ECECE6] bg-[#F7F7F4] hover:border-slate-300 hover:bg-slate-100'
                                                }`}
                                            >
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs font-black text-slate-900">{item.label}</span>
                                                        {isCurrent && (
                                                            <span className="rounded bg-cyan-300 px-1 py-0.2 text-[8px] font-black text-slate-900">
                                                                ACTIVE
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="mt-0.5 text-[9px] text-slate-500">{mtf?.label || 'Timeframe'}</div>
                                                </div>
                                                <div className="text-right">
                                                    <span
                                                        className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-extrabold ${
                                                            dir === 'UP'
                                                                ? 'bg-emerald-400/15 text-emerald-700'
                                                                : dir === 'DOWN'
                                                                ? 'bg-rose-400/15 text-rose-700'
                                                                : 'bg-slate-800 text-slate-500'
                                                        }`}
                                                    >
                                                        {dir}
                                                    </span>
                                                    <div className="mt-0.5 text-[9px] font-bold text-slate-500">
                                                        {mtf ? `${mtf.changePercent >= 0 ? '+' : ''}${mtf.changePercent}%` : '—'}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Chart Indicator Guidance Banner */}
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cyan-400/20 bg-[#F7F7F4] px-3.5 py-2 text-xs text-slate-500">
                            <div className="flex items-center gap-2">
                                <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-cyan-400/20 text-cyan-700 font-bold text-[11px]">
                                    💡
                                </span>
                                <span>
                                    <strong>Indikator ARRA Cronos:</strong> Mode <strong className="text-cyan-700">Quant Canvas</strong> menampilkan lilin masa depan & lorong volatilitas ARRA Cronos langsung pada chart. Mode <strong className="text-slate-900">TradingView</strong> menampilkan feed realtime live + bonus Pine Script v6 resmi.
                                </span>
                            </div>
                            <span className="text-[11px] text-amber-700 font-bold">
                                Harga: Rp 150.000 Sekali Bayar
                            </span>
                        </div>

                        {/* Chart Area */}
                        <div className="overflow-hidden rounded-2xl border border-[#ECECE6] bg-white">
                            {/* Chart Header Bar */}
                            <div className="flex flex-col justify-between gap-4 border-b border-[#ECECE6] px-4 py-3 sm:flex-row sm:items-center sm:px-5">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-800">
                                        <ChartBarIcon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-sm font-extrabold text-slate-900">
                                                {selectedSymbol} <span className="text-slate-700">/</span>{' '}
                                                {chartMode === 'tradingview' ? 'TradingView + ARRA Cronos Indikator' : 'Lightweight Quant Canvas'}
                                            </h2>
                                            {market && (
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                                        market.isFresh
                                                            ? 'bg-emerald-300/10 text-emerald-700'
                                                            : 'bg-amber-300/10 text-amber-800'
                                                    }`}
                                                >
                                                    {market.isFresh ? 'DATA FRESH' : `DATA ${formatAge(market.freshnessSeconds)} LALU`}
                                                </span>
                                            )}
                                            {market && (
                                                <span className="rounded-full bg-blue-400/10 px-2 py-0.5 text-[9px] font-bold text-blue-700">
                                                    {market.source}
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-1 text-[10px] text-slate-500">
                                            Feed: TradingView
                                            {market
                                                ? ` · ${market.tvSymbol || market.feedSymbol} · ${market.count} candle historis`
                                                : ' · realtime feed'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* Chart Mode Toggle */}
                                    <div className="flex items-center gap-1 rounded-xl border border-[#ECECE6] bg-[#F7F7F4] p-1">
                                        <button
                                            onClick={() => setChartMode('tradingview')}
                                            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition ${
                                                chartMode === 'tradingview'
                                                    ? 'bg-cyan-500/20 text-cyan-800 shadow ring-1 ring-cyan-400/40'
                                                    : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                            title="TradingView Realtime + Indikator ARRA Cronos"
                                        >
                                            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                            </svg>
                                            <span>TradingView + Indikator</span>
                                        </button>
                                        <button
                                            onClick={() => setChartMode('lightweight')}
                                            className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition ${
                                                chartMode === 'lightweight'
                                                    ? 'bg-slate-700 text-slate-900 shadow ring-1 ring-slate-500'
                                                    : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                            title="Quant Engine (Future Candles & Volatility Corridor)"
                                        >
                                            <span>Quant Canvas</span>
                                        </button>
                                    </div>

                                    {/* Timeframe Selector */}
                                    <div className="flex items-center gap-1 rounded-xl border border-[#ECECE6] bg-[#F7F7F4] p-1">
                                        {TIMEFRAMES.map((item) => (
                                            <button
                                                key={item.id}
                                                onClick={() => handleSelectTimeframe(item.id)}
                                                className={`rounded-lg px-3 py-1.5 text-[10px] font-bold transition ${
                                                    timeframe === item.id
                                                        ? 'bg-slate-700 text-slate-900 shadow'
                                                        : 'text-slate-500 hover:text-slate-700'
                                                }`}
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Chart Display Area */}
                            <div className="relative bg-white">
                                {/* TradingView Mode */}
                                {chartMode === 'tradingview' && market && !marketError && (
                                    <TradingViewCronosChart
                                        key={`tv_${selectedSymbol}_${timeframe}`}
                                        symbol={selectedSymbol}
                                        tvSymbol={market.tvSymbol || `OANDA:${selectedSymbol}`}
                                        timeframe={timeframe}
                                        forecast={forecast?.forecast || []}
                                        action={action}
                                        entry={entry}
                                        stop={stop}
                                        target={target}
                                        takeProfit1={tp1}
                                        takeProfit2={tp2}
                                        riskRewardRatio={forecast?.tradePlan?.riskRewardRatio}
                                        alignmentScore={forecast?.metrics?.alignmentScore}
                                        metrics={forecast?.metrics}
                                        tradePlan={forecast?.tradePlan}
                                        confluenceScore={forecast?.confluenceScore}
                                        confluenceSummary={forecast?.confluenceSummary}
                                        direction={forecast?.direction}
                                        pipSpec={pipSpec}
                                        isUnlocked={isUnlocked}
                                        formatPrice={(value) => formatPrice(selectedSymbol, value)}
                                    />
                                )}

                                {/* Lightweight Charts Mode (with Quant Envelope) */}
                                {chartMode === 'lightweight' && market && !marketError && (
                                    <CronosChart
                                        symbol={selectedSymbol}
                                        timeframe={timeframe}
                                        candles={market.candles}
                                        forecast={forecast?.forecast || []}
                                        action={action}
                                        entry={entry}
                                        stop={stop}
                                        target={target}
                                        takeProfit1={tp1}
                                        takeProfit2={tp2}
                                        formatPrice={(value) => formatPrice(selectedSymbol, value)}
                                    />
                                )}

                                {(isLoading || (!market && !marketError)) && (
                                    <div className="flex h-[390px] items-center justify-center text-xs text-slate-500 sm:h-[485px]">
                                        <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin text-cyan-700" />
                                        Mengambil candle realtime dari TradingView…
                                    </div>
                                )}

                                {marketError && (
                                    <div className="flex h-[390px] flex-col items-center justify-center px-6 text-center sm:h-[485px]">
                                        <SignalIcon className="mb-3 h-8 w-8 text-amber-700" />
                                        <div className="text-sm font-bold text-slate-700">Data chart tidak tersedia</div>
                                        <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-500">
                                            {marketError}
                                        </p>
                                        <button
                                            onClick={handleRefresh}
                                            className="mt-4 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-500"
                                        >
                                            Coba lagi
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Bottom Chart Indicator Stats Bar */}
                            <div className="grid grid-cols-2 border-t border-[#ECECE6] md:grid-cols-4">
                                <div className="border-b border-r border-[#ECECE6] px-4 py-3 md:border-b-0">
                                    <div className="text-[9px] font-bold uppercase tracking-[.16em] text-slate-500">
                                        RSI (14)
                                    </div>
                                    <div className="mt-1 text-sm font-bold text-slate-700">
                                        {metrics ? metrics.rsi.toFixed(1) : '—'}{' '}
                                        <span className="ml-1 text-[9px] font-medium text-slate-500">
                                            {metrics
                                                ? metrics.rsi > 70
                                                    ? 'OVERBOUGHT'
                                                    : metrics.rsi < 30
                                                    ? 'OVERSOLD'
                                                    : 'NEUTRAL'
                                                : ''}
                                        </span>
                                    </div>
                                </div>
                                <div className="border-b border-[#ECECE6] px-4 py-3 md:border-b-0 md:border-r">
                                    <div className="text-[9px] font-bold uppercase tracking-[.16em] text-slate-500">
                                        ATR (14)
                                    </div>
                                    <div className="mt-1 text-sm font-bold text-slate-700">
                                        {metrics ? price(metrics.atr) : '—'}{' '}
                                        <span className="ml-1 text-[9px] font-medium text-slate-500">VOLATILITAS</span>
                                    </div>
                                </div>
                                <div className="border-r border-[#ECECE6] px-4 py-3">
                                    <div className="text-[9px] font-bold uppercase tracking-[.16em] text-slate-500">
                                        EMA TREND
                                    </div>
                                    <div className="mt-1 text-sm font-bold text-slate-700">
                                        {metrics && market ? (
                                            metrics.ema21 > metrics.ema55 ? (
                                                <span className="text-emerald-700">BULLISH</span>
                                            ) : metrics.ema21 < metrics.ema55 ? (
                                                <span className="text-rose-700">BEARISH</span>
                                            ) : (
                                                'FLAT'
                                            )
                                        ) : (
                                            '—'
                                        )}{' '}
                                        <span className="ml-1 text-[9px] font-medium text-slate-500">21 / 55</span>
                                    </div>
                                </div>
                                <div className="px-4 py-3">
                                    <div className="text-[9px] font-bold uppercase tracking-[.16em] text-slate-500">
                                        CANDLE TERBARU
                                    </div>
                                    <div className="mt-1 text-sm font-bold text-slate-700">
                                        {market ? formatAge(market.freshnessSeconds) : '—'}{' '}
                                        <span className="ml-1 text-[9px] font-medium text-slate-500">LALU</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Institutional Workspace (Tabs: Trade Plan, AI Commentary, Lot Calculator) */}
                        <div className="rounded-2xl border border-[#ECECE6] bg-white overflow-hidden">
                            {/* Tab Switcher */}
                            <div className="flex border-b border-[#ECECE6] bg-[#F7F7F4] px-4 pt-2">
                                <button
                                    onClick={() => setActiveTab('plan')}
                                    className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-extrabold transition ${
                                        activeTab === 'plan'
                                            ? 'border-cyan-400 text-cyan-800'
                                            : 'border-transparent text-slate-500 hover:text-slate-500'
                                    }`}
                                >
                                    <ShieldCheckIcon className="h-4 w-4" />
                                    <span>Rencana Eksekusi (Trade Plan)</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('commentary')}
                                    className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-extrabold transition ${
                                        activeTab === 'commentary'
                                            ? 'border-cyan-400 text-cyan-800'
                                            : 'border-transparent text-slate-500 hover:text-slate-500'
                                    }`}
                                >
                                    <DocumentTextIcon className="h-4 w-4" />
                                    <span>Analisis Quant & Logika</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('calculator')}
                                    className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-extrabold transition ${
                                        activeTab === 'calculator'
                                            ? 'border-cyan-400 text-cyan-800'
                                            : 'border-transparent text-slate-500 hover:text-slate-500'
                                    }`}
                                >
                                    <CalculatorIcon className="h-4 w-4" />
                                    <span>Kalkulator Lot & Risiko</span>
                                </button>
                            </div>

                            {/* Tab 1: Trade Plan */}
                            {activeTab === 'plan' && (
                                <div className="p-4 sm:p-6 space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div>
                                            <h3 className="text-base font-extrabold text-slate-900">
                                                Level Harga & Parameter Setup
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Berdasarkan aturan teknikal lokal dan skenario ATR ilustratif.
                                            </p>
                                        </div>

                                        <button
                                            onClick={handleCopySignal}
                                            disabled={!forecast || action === 'WAIT'}
                                            className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-3.5 py-2 text-xs font-bold text-cyan-800 transition hover:bg-cyan-400/20 disabled:opacity-40"
                                        >
                                            {copiedPlan ? (
                                                <>
                                                    <CheckIcon className="h-4 w-4 text-emerald-400" />
                                                    <span>Tersalin ke Clipboard!</span>
                                                </>
                                            ) : (
                                                <>
                                                    <ClipboardDocumentCheckIcon className="h-4 w-4" />
                                                    <span>Salin Signal Card</span>
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* Price Targets Grid */}
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                        <div className="rounded-xl border border-[#ECECE6] bg-[#F7F7F4] p-3.5">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                Entry Level
                                            </div>
                                            <div className="mt-1.5 text-lg font-black text-cyan-800">
                                                {entry ? price(entry) : '—'}
                                            </div>
                                            <div className="mt-1 text-[10px] text-slate-500">Harga acuan eksekusi</div>
                                        </div>

                                        <div className="rounded-xl border border-rose-500/20 bg-rose-500/[.03] p-3.5">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700/70">
                                                Stop Loss (SL)
                                            </div>
                                            <div className="mt-1.5 text-lg font-black text-rose-700">
                                                {stop ? price(stop) : '—'}
                                            </div>
                                            <div className="mt-1 text-[10px] text-rose-700/60">
                                                {forecast?.tradePlan?.riskPips != null
                                                    ? `${forecast.tradePlan.riskPips} ${pipSpec.unitName} risiko`
                                                    : '1.35x ATR buffer'}
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[.03] p-3.5">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700/70">
                                                Take Profit 1 (TP1)
                                            </div>
                                            <div className="mt-1.5 text-lg font-black text-emerald-700">
                                                {tp1 ? price(tp1) : '—'}
                                            </div>
                                            <div className="mt-1 text-[10px] text-emerald-700/60">Konservatif (55% move)</div>
                                        </div>

                                        <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/[.06] p-3.5">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                                                Take Profit 2 (Full Target)
                                            </div>
                                            <div className="mt-1.5 text-lg font-black text-emerald-800">
                                                {tp2 ? price(tp2) : '—'}
                                            </div>
                                            <div className="mt-1 text-[10px] text-emerald-700/70">
                                                {forecast?.tradePlan?.expectedMovePips != null
                                                    ? `+${forecast.tradePlan.expectedMovePips} ${pipSpec.unitName} target`
                                                    : 'Target skenario teknikal'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Advice Box */}
                                    <div className="rounded-xl border border-[#ECECE6] bg-[#F7F7F4] p-3.5 text-xs text-slate-500 flex items-start gap-3">
                                        <InformationCircleIcon className="h-5 w-5 text-cyan-700 shrink-0 mt-0.5" />
                                        <div className="leading-relaxed">
                                            <span className="font-bold text-slate-700">Kondisi Invalidation: </span>
                                            {forecast?.tradePlan?.invalidationReason ||
                                                'Setup ini gugur jika harga menembus level Stop Loss pada penutupan candle.'}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab 2: AI Commentary & Logic */}
                            {activeTab === 'commentary' && (
                                <div className="p-4 sm:p-6 space-y-4">
                                    <div>
                                        <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                                            <CpuChipIcon className="h-5 w-5 text-cyan-700" />
                                            <span>Analisis teknikal ARRA Cronos</span>
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Skor teknikal lokal tetap menjadi sumber sinyal. Groq hanya memberi ulasan sekunder atas snapshot pasar.
                                        </p>
                                    </div>

                                    <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/[.03] p-4 text-xs leading-relaxed text-slate-500">
                                        {forecast?.commentary ||
                                            'Pilih instrumen dan jalankan kalkulasi untuk membaca ringkasan skenario teknikal.'}
                                    </div>

                                    <div className="rounded-xl border border-[#ECECE6] bg-[#F7F7F4] p-4">
                                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                                            <div>
                                                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                                                    <SparklesIcon className="h-4 w-4 text-cyan-700" />
                                                    Review sekunder Groq
                                                </h4>
                                                <p className="mt-1 text-[11px] text-slate-500">
                                                    Dipanggil saat tombol ditekan; tidak mengubah sinyal dan tidak mengirim order broker.
                                                </p>
                                            </div>
                                            <button
                                                onClick={handleGroqReview}
                                                disabled={isReviewingWithGroq || isLoading || !forecast}
                                                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3.5 py-2 text-xs font-bold text-cyan-800 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {isReviewingWithGroq ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <SparklesIcon className="h-4 w-4" />}
                                                {isReviewingWithGroq ? 'Meninjau…' : 'Minta review Groq'}
                                            </button>
                                        </div>
                                        {groqReviewError && <p className="mt-3 text-xs font-medium text-rose-700">{groqReviewError}</p>}
                                        {groqReview && (
                                            <div className="mt-3 rounded-lg border border-[#ECECE6] bg-white p-3 text-xs leading-relaxed text-slate-500">
                                                <div className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-cyan-700">{groqReviewModel} · opini sekunder</div>
                                                {groqReview}
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-2">
                                        <div className="rounded-xl bg-[#F7F7F4] p-3">
                                            <div className="text-[10px] font-bold text-slate-500">WAKTU ANALISIS</div>
                                            <div className="mt-1 text-sm font-bold text-slate-700">
                                                {forecast ? `${(forecast.inferenceMs / 1000).toFixed(2)}s` : '—'}
                                            </div>
                                        </div>
                                        <div className="rounded-xl bg-[#F7F7F4] p-3">
                                            <div className="text-[10px] font-bold text-slate-500">HISTORICAL CONTEXT</div>
                                            <div className="mt-1 text-sm font-bold text-slate-700">
                                                {forecast ? `${forecast.historyBars} bars` : '—'}
                                            </div>
                                        </div>
                                        <div className="rounded-xl bg-[#F7F7F4] p-3">
                                            <div className="text-[10px] font-bold text-slate-500">ENGINE METHOD</div>
                                            <div className="mt-1 text-sm font-bold text-slate-700">
                                                {forecast?.model || 'ARRA Cronos Quant Scenarios'}
                                            </div>
                                        </div>
                                        <div className="rounded-xl bg-[#F7F7F4] p-3">
                                        <div className="text-[10px] font-bold text-slate-500">INDEKS ALIGNMENT</div>
                                            <div className="mt-1 text-sm font-bold text-cyan-700">
                                                {forecast?.metrics ? `${forecast.metrics.alignmentScore}/100` : '—'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab 3: Interactive Lot & Risk Calculator */}
                            {activeTab === 'calculator' && (
                                <div className="p-4 sm:p-6 space-y-4">
                                    <div>
                                        <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                                            <CalculatorIcon className="h-5 w-5 text-cyan-700" />
                                            <span>Kalkulator Manajemen Risiko & Lot Size</span>
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Hitung ukuran lot ideal berdasarkan modal akun dan persentase risiko terukur.
                                        </p>
                                    </div>

                                    {/* Calculator Inputs */}
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div className="rounded-xl border border-[#ECECE6] bg-[#F7F7F4] p-4">
                                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                                                Modal Akun Trading ($ USD)
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-slate-500">$</span>
                                                <input
                                                    type="number"
                                                    min="10"
                                                    step="50"
                                                    value={accountEquity}
                                                    onChange={(e) => setAccountEquity(Math.max(10, Number(e.target.value)))}
                                                    className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:border-cyan-400"
                                                />
                                            </div>
                                            <div className="mt-2 flex gap-1.5">
                                                {[500, 1000, 5000, 10000].map((val) => (
                                                    <button
                                                        key={val}
                                                        onClick={() => setAccountEquity(val)}
                                                        className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                                                    >
                                                        ${val}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-[#ECECE6] bg-[#F7F7F4] p-4">
                                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                                                Batas Risiko per Trade (%)
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    min="0.25"
                                                    max="5"
                                                    step="0.25"
                                                    value={riskPercent}
                                                    onChange={(e) => setRiskPercent(Math.max(0.1, Math.min(10, Number(e.target.value))))}
                                                    className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:border-cyan-400"
                                                />
                                                <span className="text-sm font-bold text-slate-500">%</span>
                                            </div>
                                            <div className="mt-2 flex gap-1.5">
                                                {[0.5, 1.0, 1.5, 2.0].map((val) => (
                                                    <button
                                                        key={val}
                                                        onClick={() => setRiskPercent(val)}
                                                        className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                                                    >
                                                        {val}%
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Calculations Result */}
                                    {liveSizing && (
                                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-2">
                                            <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/[.04] p-3.5">
                                                <div className="text-[10px] font-bold uppercase text-cyan-700">
                                                Ukuran Lot Ilustratif
                                                </div>
                                                <div className="mt-1 text-xl font-black text-cyan-800">
                                                    {liveSizing.lotSize} Lot
                                                </div>
                                                <div className="mt-0.5 text-[10px] text-slate-500">Estimasi saja; spesifikasi broker belum diketahui.</div>
                                            </div>

                                            <div className="rounded-xl border border-rose-500/20 bg-rose-500/[.03] p-3.5">
                                                <div className="text-[10px] font-bold uppercase text-rose-700">
                                                    Risiko Estimasi ($)
                                                </div>
                                                <div className="mt-1 text-xl font-black text-rose-700">
                                                    -${liveSizing.dollarRisk}
                                                </div>
                                                <div className="mt-0.5 text-[10px] text-slate-500">
                                                    {riskPercent}% dari modal ${accountEquity}
                                                </div>
                                            </div>

                                            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[.03] p-3.5">
                                                <div className="text-[10px] font-bold uppercase text-emerald-700">
                                                    Estimasi Skenario TP1
                                                </div>
                                                <div className="mt-1 text-xl font-black text-emerald-700">
                                                    +${liveSizing.dollarProfit1}
                                                </div>
                                                <div className="mt-0.5 text-[10px] text-slate-500">
                                                    +{liveSizing.tp1Pips} {pipSpec.unitName}
                                                </div>
                                            </div>

                                            <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/[.06] p-3.5">
                                                <div className="text-[10px] font-bold uppercase text-emerald-800">
                                                    Estimasi Skenario TP2
                                                </div>
                                                <div className="mt-1 text-xl font-black text-emerald-800">
                                                    +${liveSizing.dollarProfit2}
                                                </div>
                                                <div className="mt-0.5 text-[10px] text-slate-500">
                                                    +{liveSizing.tp2Pips} {pipSpec.unitName}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Official Pine Script Viewer (Disertakan sebagai Bonus Rp 150.000) */}
                        <PineScriptViewer isUnlocked={isUnlocked} />

                        {/* Bottom Banner */}
                        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-[#ECECE6] bg-white px-4 py-4 sm:flex-row sm:items-center sm:px-5">
                            <div>
                                <div className="text-xs font-bold text-slate-700">
                                    ARRA Cronos · TradingView Realtime & Multi-Timeframe Quant Engine
                                </div>
                                <p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-slate-500">
                                    Chart realtime menggunakan TradingView Advanced Chart. Proyeksi lokal memakai skenario ATR
                                    dengan koridor volatilitas yang tidak terkalibrasi. Tersedia juga Pine Script indikator
                                    untuk berjalan langsung di TradingView.
                                </p>
                            </div>
                            <div className="flex shrink-0 gap-2">
                                <Link
                                    href="/indicators/arra-cronos"
                                    className="rounded-xl border border-cyan-300/25 bg-cyan-50 px-3.5 py-2.5 text-[10px] font-bold text-cyan-800 transition hover:bg-cyan-300/15"
                                >
                                    Lihat Indikator Pine
                                </Link>
                                <button
                                    onClick={() => runForecast(selectedSymbol, timeframe, ++activeRequestIdRef.current)}
                                    disabled={isForecasting}
                                    className="rounded-xl bg-cyan-200 px-3.5 py-2.5 text-[10px] font-extrabold text-slate-900 transition hover:bg-white disabled:opacity-50"
                                >
                                    {isForecasting ? 'Menghitung…' : 'Hitung Ulang Forecast'}
                                </button>
                            </div>
                        </div>
                    </section>
                    </div>
                </div>

                <footer className="mt-5 flex flex-col gap-2 text-[9px] leading-relaxed text-slate-700 sm:flex-row sm:justify-between">
                    <span>
                        Data harga berasal dari TradingView Scanner API, Binance Spot & Yahoo Finance. Analisis lokal
                        memakai indikator teknikal dan keselarasan multi-timeframe.
                    </span>
                    <span>
                        Forecast berbasis kuantitatif · Dispersi volatilitas bukan garansi kepastian profit · Terapkan money
                        management bijak.
                    </span>
                </footer>
            </div>
        </main>
    );
}
