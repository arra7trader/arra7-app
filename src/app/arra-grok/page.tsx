'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { usePicaDevice } from '@/context/PicaDeviceContext';
import { isAdminEmail, isAdminUser } from '@/lib/admin-access';
import {
    ArrowPathIcon,
    BoltIcon,
    KeyIcon,
    LockClosedIcon,
    ArrowDownTrayIcon,
    InformationCircleIcon,
    CheckCircleIcon,
    SparklesIcon,
} from '@heroicons/react/24/outline';

interface LogItem {
    id: string;
    time: string;
    type: 'BIAS' | 'WAIT';
    symbol: string;
    reason: string;
    result: string;
}

interface MarketObservation {
    id: number;
    symbol: string;
    timeframe: string;
    barTime: string;
    analyzedAt: string;
    price: number;
    source: string;
    quoteMode: string;
    quoteAgeSeconds: number;
    feedFresh: boolean;
    marketOpen: boolean;
    action: 'BUY' | 'SELL' | 'WAIT';
    reason: string;
    alignmentScore: number;
    metrics: { rsi14: number; atr14: number; trendScore: number };
}

interface MarketAnalysis {
    symbol: string;
    name: string;
    bias: 'BULLISH' | 'BEARISH' | 'WAIT';
    current: number;
    rsi14: number | null;
    atr14: number | null;
    trendScore: number | null;
    alignmentScore: number | null;
    reason: string;
}

interface PairScan {
    symbol: string;
    name: string;
    currentPrice: number | null;
    changePercent: number | null;
    source: string | null;
    quoteAgeSeconds: number | null;
    quoteUpdatedAt: string | null;
    feedFresh: boolean;
    marketOpen: boolean;
    marketOpenReason: string | null;
    nextMarketOpenWib: string | null;
    bias: 'BULLISH' | 'BEARISH' | 'WAIT';
    action: 'BUY' | 'SELL' | 'WAIT';
    rsi14: number | null;
    atr14: number | null;
    trendScore: number | null;
    alignmentScore: number | null;
    confluenceSummary: string;
    reason: string;
    status: 'ANALYZED' | 'WAIT' | 'CLOSED' | 'INSUFFICIENT_HISTORY' | 'UNAVAILABLE';
}

type ArraGrokPair = 'BTCUSD' | 'XAUUSD' | 'EURUSD' | 'GBPUSD' | 'USDJPY';
const ARRA_GROK_PAIRS: ArraGrokPair[] = ['BTCUSD', 'XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY'];

function pairDecimals(pair: ArraGrokPair) {
    return pair === 'BTCUSD' ? 1 : pair === 'XAUUSD' ? 2 : pair === 'USDJPY' ? 3 : 5;
}

export default function ArraGrokPage() {
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
        Boolean(isAdminUser(session?.user)) ||
        Boolean(isAdminEmail(session?.user?.email)) ||
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

    // Terminal Engine State
    const [isRunning, setIsRunning] = useState(true);
    const [seconds, setSeconds] = useState(0);
    const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('');

    // Active pair selection; market hours are determined by the server's exchange calendar.
    const [selectedPair, setSelectedPair] = useState<ArraGrokPair>('BTCUSD');
    const [marketOpen, setMarketOpen] = useState<boolean | null>(null);
    const [marketOpenReason, setMarketOpenReason] = useState('');
    const [nextMarketOpenWib, setNextMarketOpenWib] = useState('');

    const [marketAnalysis, setMarketAnalysis] = useState<MarketAnalysis>({
        symbol: '$BTCUSD',
        name: 'Bitcoin / US Dollar',
        bias: 'WAIT',
        current: 0,
        rsi14: null,
        atr14: null,
        trendScore: null,
        alignmentScore: null,
        reason: 'Menunggu feed dan analisis pasar.',
    });
    const [hasFeed, setHasFeed] = useState(false);
    const [feedError, setFeedError] = useState('');
    const [feedSource, setFeedSource] = useState('');
    const [feedIsFresh, setFeedIsFresh] = useState<boolean | null>(null);
    const [groqReview, setGroqReview] = useState('');
    const [groqReviewError, setGroqReviewError] = useState('');
    const [groqReviewModel, setGroqReviewModel] = useState('');
    const [isReviewingWithGroq, setIsReviewingWithGroq] = useState(false);
    const scanInFlight = useRef(false);
    const observationFetchTimes = useRef<Record<string, number>>({});
    const [pairScans, setPairScans] = useState<PairScan[]>([]);
    const [activeScanIndex, setActiveScanIndex] = useState(0);
    const [scanUpdatedAt, setScanUpdatedAt] = useState('');
    const [scanError, setScanError] = useState('');
    const hasCurrentBias = isRunning && hasFeed && feedIsFresh === true && marketAnalysis.bias !== 'WAIT';

    const handleToggleFeed = () => {
        if (isRunning) {
            setFeedIsFresh(false);
            setMarketAnalysis((previous) => ({
                ...previous,
                bias: 'WAIT',
                reason: 'Pembaruan feed dijeda. Bias menunggu feed segar.',
            }));
            setIsRunning(false);
            return;
        }
        setIsRunning(true);
    };

    const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
    const [logHistory, setLogHistory] = useState<LogItem[]>([]);
    const [marketObservations, setMarketObservations] = useState<MarketObservation[]>([]);
    const observationViewsByPair = useRef<Record<string, { observations: MarketObservation[]; logs: LogItem[] }>>({});

    const selectedPairRef = useRef(selectedPair);
    selectedPairRef.current = selectedPair;

    const fetchMarketObservations = useCallback(async (symbol: ArraGrokPair) => {
        if (Date.now() - (observationFetchTimes.current[symbol] || 0) < 60_000) return;
        observationFetchTimes.current[symbol] = Date.now();
        try {
            const response = await fetch(`/api/arra-grok/observations?symbol=${symbol}`, {
                cache: 'no-store',
                headers: deviceId ? { 'x-device-id': deviceId } : {},
            });
            const payload = await response.json();
            if (response.ok && Array.isArray(payload.observations)) {
                const observations = payload.observations as MarketObservation[];
                const logs: LogItem[] = observations.map((observation) => ({
                    id: String(observation.id),
                    time: new Intl.DateTimeFormat('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit',
                        timeZone: 'Asia/Jakarta',
                    }).format(new Date(observation.analyzedAt)),
                    type: observation.action === 'WAIT' ? 'WAIT' : 'BIAS',
                    symbol: `$${observation.symbol}`,
                    reason: `${observation.reason} · ${observation.source} · ${observation.quoteAgeSeconds}s · ${observation.timeframe}`,
                    result: observation.action === 'WAIT'
                        ? `WAIT · $${observation.price} · RSI ${observation.metrics.rsi14} · align ${observation.alignmentScore}/100`
                        : `${observation.action === 'BUY' ? 'BULLISH' : 'BEARISH'} · $${observation.price} · RSI ${observation.metrics.rsi14} · align ${observation.alignmentScore}/100`,
                }));
                observationViewsByPair.current[symbol] = { observations, logs };
                if (symbol !== selectedPairRef.current) return;
                setMarketObservations(observations);
                setLogHistory(logs);
            }
        } catch {
            delete observationFetchTimes.current[symbol];
            // Keep the most recently loaded observations visible when the history service is unavailable.
        }
    }, [deviceId]);

    const handleGroqReview = useCallback(async () => {
        setIsReviewingWithGroq(true);
        setGroqReviewError('');
        try {
            const response = await fetch('/api/arra-grok/review', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(deviceId ? { 'x-device-id': deviceId } : {}),
                },
                body: JSON.stringify({ symbol: selectedPair }),
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
    }, [deviceId, selectedPair]);

    // Format current clock HH:MM:SS WIB
    const formattedClock = useMemo(() => {
        const d = new Date();
        const hh = d.getHours().toString().padStart(2, '0');
        const mm = d.getMinutes().toString().padStart(2, '0');
        const ss = d.getSeconds().toString().padStart(2, '0');
        return `${hh}:${mm}:${ss}`;
    }, [seconds]);

    const fetchPairScans = useCallback(async () => {
        if (!isRunning || scanInFlight.current) return;
        scanInFlight.current = true;
        try {
            const response = await fetch('/api/arra-grok/scan', {
                cache: 'no-store',
                signal: AbortSignal.timeout(25_000),
                headers: deviceId ? { 'x-device-id': deviceId } : {},
            });
            const payload = await response.json();
            if (!response.ok || !Array.isArray(payload.scans)) {
                throw new Error(payload.error || 'Pemindaian pair belum tersedia.');
            }
            setPairScans(payload.scans as PairScan[]);
            setScanUpdatedAt(payload.scannedAt || new Date().toISOString());
            setScanError('');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Pemindaian otomatis gagal.';
            setPairScans([]);
            setScanError(message);
            setFeedError(message);
            setFeedIsFresh(false);
            setMarketAnalysis((previous) => ({ ...previous, bias: 'WAIT', reason: `Scan terbaru gagal; ${message}` }));
        } finally {
            scanInFlight.current = false;
        }
    }, [deviceId, isRunning]);

    useEffect(() => {
        const scan = pairScans.find((item) => item.symbol === selectedPair);
        if (!scan) return;
        setHasFeed(scan.currentPrice !== null);
        setFeedError('');
        setFeedSource(scan.source || '');
        setFeedIsFresh(scan.feedFresh);
        setLastRefreshedAt(scan.quoteUpdatedAt ? new Intl.DateTimeFormat('id-ID', {
            hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta',
        }).format(new Date(scan.quoteUpdatedAt)) : '');
        setMarketOpen(scan.marketOpen);
        setMarketOpenReason(scan.marketOpenReason || '');
        setNextMarketOpenWib(scan.nextMarketOpenWib || '');
        setMarketAnalysis({
            symbol: `$${scan.symbol}`,
            name: scan.name,
            bias: scan.bias,
            current: scan.currentPrice ?? 0,
            rsi14: scan.rsi14,
            atr14: scan.atr14,
            trendScore: scan.trendScore,
            alignmentScore: scan.alignmentScore,
            reason: scan.reason,
        });
        setTerminalLogs(pairScans.map((item) => `${item.symbol.padEnd(6)} ${item.bias.padEnd(8)} · ${item.reason}`));
    }, [pairScans, selectedPair]);

    useEffect(() => {
        if (!isUnlocked || !isRunning || pairScans.length !== ARRA_GROK_PAIRS.length) return;
        const activePair = pairScans[activeScanIndex]?.symbol as ArraGrokPair | undefined;
        if (activePair && ARRA_GROK_PAIRS.includes(activePair)) setSelectedPair(activePair);
    }, [activeScanIndex, isUnlocked, isRunning, pairScans]);

    useEffect(() => {
        if (!isUnlocked || !isRunning) return;
        void fetchPairScans();
        const interval = window.setInterval(fetchPairScans, 15_000);
        return () => window.clearInterval(interval);
    }, [isUnlocked, isRunning, fetchPairScans]);

    useEffect(() => {
        if (!isUnlocked || pairScans.length < 2) {
            setActiveScanIndex(0);
            return;
        }
        if (!isRunning) return;
        setActiveScanIndex(0);
        const interval = window.setInterval(() => {
            setActiveScanIndex((current) => (current + 1) % pairScans.length);
        }, 3_000);
        return () => window.clearInterval(interval);
    }, [isUnlocked, isRunning, pairScans.length]);

    useEffect(() => {
        if (!isUnlocked) return;
        const cached = observationViewsByPair.current[selectedPair];
        setMarketObservations(cached?.observations || []);
        setLogHistory(cached?.logs || []);
        void fetchMarketObservations(selectedPair);
        const interval = window.setInterval(() => void fetchMarketObservations(selectedPair), 60_000);
        return () => window.clearInterval(interval);
    }, [isUnlocked, fetchMarketObservations, selectedPair]);

    // Clock timer (every 1 second)
    useEffect(() => {
        if (!isRunning || !isUnlocked) return;
        const interval = window.setInterval(() => {
            setSeconds((prev) => prev + 1);
        }, 1000);
        return () => window.clearInterval(interval);
    }, [isRunning, isUnlocked]);

    // Download audit log text file
    const handleDownloadLog = () => {
        const header = `=== ARRA GROK MARKET OBSERVATIONS ===\nDate: ${new Date().toLocaleString('id-ID')}\nPair: ${selectedPair} (${selectedPair === 'BTCUSD' ? '24/7 Crypto' : selectedPair === 'XAUUSD' ? 'Gold Futures' : 'Forex'})\nMarket Data: ${feedSource || 'unavailable'} · ${feedIsFresh ? 'fresh' : 'stale/unavailable'}\nNo simulated trades, fills, or broker orders are recorded.\n\n--- MARKET ANALYSIS SNAPSHOTS ---\n`;
        const body = logHistory.map((l) => `[${l.time}] ${l.type.padEnd(8)} ${l.symbol.padEnd(9)} ${l.result.padEnd(12)} Reason: ${l.reason}`).join('\n');
        const blob = new Blob([header + body], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `arra-grok-${selectedPair}-log-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <main className="min-h-screen bg-[#F2F2EE] px-3 pb-16 pt-24 text-slate-800 sm:px-6 lg:px-8 font-sans selection:bg-cyan-200">
            {/* PAYWALL LOCK MODAL/CONTAINER IF NOT UNLOCKED */}
            {!isUnlocked && (
                <div className="mx-auto max-w-4xl mb-8 overflow-hidden rounded-3xl border border-cyan-500/40 bg-gradient-to-br from-[#0c1a2e] via-[#091220] to-[#141029] p-6 sm:p-8 shadow-2xl relative text-white">
                    <div className="absolute right-0 top-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
                    <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="max-w-2xl">
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 border border-amber-400/40 px-3 py-1 text-xs font-black text-amber-300">
                                    <LockClosedIcon className="h-3.5 w-3.5" />
                                    TERMINAL ARRA GROK TERKUNCI
                                </span>
                                <span className="rounded-full bg-cyan-400/20 px-3 py-1 text-xs font-black text-cyan-200 border border-cyan-400/30">
                                    RP 150.000 · LIFETIME SEKALI BAYAR
                                </span>
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                                Buka Terminal ARRA GROK + <span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-indigo-300 bg-clip-text text-transparent">Bonus Indikator TradingView</span>
                            </h2>
                            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-300">
                                Fitur <strong>ARRA GROK</strong> tersedia dalam paket <strong>ARRA Cronos (Rp 150.000)</strong>. Terminal memindai lima pair dan menampilkan analisis teknikal pasar aktual; tidak ada sizing posisi, simulasi transaksi, atau order broker otomatis.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 min-w-[220px]">
                            <Link
                                href="/payment/checkout?plan=ARRA_CRONOS"
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 px-6 py-3.5 text-xs sm:text-sm font-black text-slate-950 shadow-xl shadow-cyan-500/25 hover:opacity-95 transition transform hover:scale-[1.02]"
                            >
                                <BoltIcon className="h-4 w-4" />
                                <span>ORDER SEKARANG — RP 150.000</span>
                            </Link>
                            <button
                                onClick={openActivation}
                                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-[11px] font-bold text-slate-200 hover:bg-slate-800 transition"
                            >
                                <KeyIcon className="h-3.5 w-3.5 text-amber-300" />
                                <span>Aktivasi Kode Lisensi</span>
                            </button>
                            <a
                                href="https://t.me/arra7trader?text=Halo%20Admin%20ARRA7!%20Saya%20ingin%20order%20ARRA%20Cronos%20+%20ARRA%20Grok%20(Rp%20150.000)"
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-[11px] font-bold text-slate-200 hover:bg-slate-800 transition"
                            >
                                <span>💬 Chat Admin Telegram</span>
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* TOP NOTICE BANNER: 24/7 BTC vs WEEKEND FOREX */}
            {selectedPair === 'BTCUSD' ? (
                <div className="mx-auto max-w-6xl mb-4 rounded-2xl border border-emerald-300 bg-emerald-50/90 p-4 shadow-sm font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-950">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white font-bold">
                            <CheckCircleIcon className="h-4.5 w-4.5" />
                        </span>
                        <div>
                            <span className="font-black uppercase tracking-wide flex items-center gap-2">
                                <span>PASAR KRIPTO BUKA 24/7 (BITCOIN)</span>
                                <span className="rounded bg-emerald-200 text-emerald-900 px-1.5 py-0.2 text-[9px] font-bold">
                                    TANPA LIBUR WEEKEND
                                </span>
                            </span>
                            <div className="text-[11px] text-emerald-800 mt-0.5">
                                Pasar <strong>$BTCUSD</strong> tersedia 24/7. Terminal membaca harga dan candle pasar aktual untuk tinjauan teknikal; tidak ada transaksi simulasi atau order broker.
                            </div>
                        </div>
                    </div>

                </div>
            ) : marketOpen === false ? (
                <div className="mx-auto max-w-6xl mb-4 rounded-2xl border border-amber-300 bg-amber-50/90 p-4 shadow-sm font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-amber-950 font-bold">
                            <InformationCircleIcon className="h-4 w-4" />
                        </span>
                        <div>
                            <span className="font-black uppercase tracking-wide">PASAR EMAS &amp; FOREX TUTUP (AKHIR PEKAN)</span>
                            <div className="text-[11px] text-amber-800 mt-0.5">{marketOpenReason || `Pasar ${selectedPair} sedang tutup.`} {nextMarketOpenWib ? `Perkiraan buka ${nextMarketOpenWib}.` : ''} Pair ini tetap dipindai, dan bias ditahan di WAIT sampai sesi aktif.</div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="mx-auto max-w-6xl mb-4 flex items-center justify-between rounded-2xl border border-cyan-200 bg-cyan-50/90 p-3 font-mono text-[11px] text-cyan-900">
                    <span>AUTO ROTASI · ${selectedPair} · ${marketAnalysis.current ? marketAnalysis.current.toFixed(pairDecimals(selectedPair)) : 'menunggu feed'} · {feedIsFresh ? 'kuotasi segar' : 'feed menunggu'}</span>
                    <span className="font-bold">{activeScanIndex + 1}/5</span>
                </div>
            )}

            {/* RETRO-MODERN MAC WINDOW TERMINAL FRAME */}
            <div className={`mx-auto max-w-6xl overflow-hidden rounded-2xl sm:rounded-3xl border border-[#DCDCD5] bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.04)] transition-all ${!isUnlocked ? 'pointer-events-none opacity-40 blur-[1px]' : ''}`}>
                {/* 1. RETRO-MODERN MAC WINDOW TITLE BAR */}
                <div className="flex items-center justify-between border-b border-[#ECECE6] bg-[#F7F7F4] px-4 py-3 sm:px-6 select-none">
                    {/* Traffic Light Window Controls */}
                    <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-[#FF5F56] border border-[#E0443E] inline-block shadow-xs" />
                        <span className="h-3 w-3 rounded-full bg-[#FFBD2E] border border-[#DEA123] inline-block shadow-xs" />
                        <span className="h-3 w-3 rounded-full bg-[#27C93F] border border-[#1AAB29] inline-block shadow-xs" />
                    </div>

                    {/* Window Title Subtitle */}
                    <div className="hidden sm:block text-[11px] font-mono text-slate-500 font-medium">
                        ARRA GROK — auto scan &amp; analysis · 5 markets
                    </div>

                    {/* Right Tag */}
                    <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-slate-400 hidden xs:inline">@ARRA7_GROK</span>
                        {isRunning ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                                <span>AUTO · ${selectedPair} · {activeScanIndex + 1}/5</span>
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/60 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                <span>SCAN DIJEDA · ${selectedPair}</span>
                            </span>
                        )}
                    </div>
                </div>

                {/* 2. TERMINAL HEADER: AVATAR, TITLE, PAIR SWITCHER */}
                <div className="border-b border-[#ECECE6] px-5 sm:px-7 py-5 bg-white">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        {/* Left: Avatar + Title & Status */}
                        <div className="flex items-start gap-4">
                            {/* ARRA Grok Bot Avatar (Silver Chrome Sphere with Oval Eyes) */}
                            <div className="h-14 w-14 shrink-0 rounded-full bg-gradient-to-b from-[#FFFFFF] via-[#F0F0EE] to-[#E2E2DC] border border-[#D5D5CE] shadow-[0_4px_10px_rgba(0,0,0,0.06),inset_0_2px_4px_rgba(255,255,255,0.9)] flex items-center justify-center gap-1.5">
                                <span className="h-4 w-1.5 rounded-full bg-slate-900" />
                                <span className="h-4 w-1.5 rounded-full bg-slate-900" />
                            </div>

                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-2xl sm:text-[26px] font-black text-slate-900 tracking-tight font-sans">
                                        ARRA GROK
                                    </h1>
                                    <span className="rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-800">
                                        v1.0 Quant
                                    </span>

                                    <span className="rounded-xl border border-cyan-300 bg-cyan-50 px-2.5 py-1 text-[10px] font-mono font-black text-cyan-800">AUTO · {selectedPair} · {activeScanIndex + 1}/5</span>
                                </div>

                                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-mono">
                                    <span className="flex items-center gap-1.5 text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                                        <span className={`h-2 w-2 rounded-full ${feedIsFresh ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                                        <span>{!isRunning ? 'FEED DIJEDA' : feedIsFresh ? 'FEED TERBARU' : feedError ? 'FEED TERPUTUS' : 'MENUNGGU FEED'} · {formattedClock} WIB</span>
                                    </span>
                                    <span className="rounded bg-[#E3F4EB] text-[#1E774A] border border-[#C5E8D4] px-2 py-0.5 text-[10px] font-bold">
                                        BIAS · {hasCurrentBias ? marketAnalysis.bias : 'WAIT'} {marketAnalysis.symbol}
                                    </span>
                                </div>
                                <div className="mt-1 text-[11px] font-mono text-slate-400 italic">
                                    {marketOpen === false
                                        ? `${marketOpenReason || `sesi ${selectedPair} tutup`} · bias ditahan${nextMarketOpenWib ? ` sampai ${nextMarketOpenWib}` : ''}`
                                        : 'analisis otomatis lima pair · tanpa order broker'}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* 3. TERMINAL TWO-COLUMN LAYOUT */}
                <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] bg-[#FCFCFA]">
                    {/* LEFT COLUMN: ANALYSIS WORKFLOW MODULES */}
                    <aside className="border-r border-[#ECECE6] p-4 space-y-2 bg-[#FAF9F6]">
                        <div className="flex items-center justify-between pb-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                            <span>WORKFLOW</span>
                            <span className={feedIsFresh ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                                {feedIsFresh ? 'feed segar' : feedError ? 'feed terputus' : 'menunggu feed'}
                            </span>
                        </div>

                        {/* MODULE 1: SCANNER */}
                        <div className="rounded-xl border border-slate-200/80 p-2.5 bg-white shadow-xs">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-5 w-5 items-center justify-center rounded bg-[#D97706] text-white text-[9px] font-bold">
                                        II
                                    </span>
                                    <span className="text-xs font-black tracking-wide text-slate-800 font-mono">
                                        SCANNER
                                    </span>
                                </div>
                                <span className="rounded bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.2 text-[9px] font-mono font-bold">
                                    SCAN
                                </span>
                            </div>
                            <div className="mt-1 text-[10px] text-slate-500 font-mono">
                                BTC 24/7 + Gold &amp; Forex
                            </div>
                            <div className="mt-0.5 text-[9px] text-slate-400 italic">
                                quotes from the market feed
                            </div>
                            <div className="mt-1 text-[9px] font-mono font-bold text-slate-700 truncate">
                                {marketAnalysis.symbol} · {marketAnalysis.current ? `$${marketAnalysis.current.toFixed(pairDecimals(selectedPair))}` : 'harga menunggu feed'}
                            </div>
                        </div>

                        {/* MODULE 2: MARKET GUARD */}
                        <div className="relative rounded-xl border border-slate-200/80 p-2.5 bg-white shadow-xs">
                            <span className="absolute -right-1 -top-1.5 rotate-[-8deg] rounded border border-rose-500 bg-white/95 px-1.5 py-0.2 text-[8px] font-mono font-black text-rose-600 shadow-xs">
                                {marketOpen === false ? 'MARKET CLOSED' : !hasFeed ? 'NO FEED' : !feedIsFresh ? 'NO LIVE QUOTE' : 'LIVE FEED'}
                            </span>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-5 w-5 items-center justify-center rounded bg-rose-600 text-white text-[9px] font-bold">
                                        ▲
                                    </span>
                                    <span className="text-xs font-black tracking-wide text-slate-800 font-mono">
                                        MARKET GUARD
                                    </span>
                                </div>
                                <span className="rounded bg-rose-100 text-rose-800 border border-rose-300 px-1.5 py-0.2 text-[9px] font-mono font-bold">
                                    {!hasFeed ? 'NO FEED' : marketOpen === false ? 'CLOSED' : !feedIsFresh ? 'NO LIVE QUOTE' : 'OPEN'}
                                </span>
                            </div>
                            <div className="mt-1 text-[10px] text-slate-500 font-mono">
                                market-hours check
                            </div>
                            <div className="mt-0.5 text-[9px] text-slate-400 italic">
                                news and spread checks are not connected
                            </div>
                            <div className="mt-1 text-[9px] font-mono font-bold text-slate-700 truncate">
                                {marketAnalysis.bias === 'WAIT' ? 'bias belum terbentuk' : `bias ${marketAnalysis.bias} · ${marketAnalysis.symbol}`}
                            </div>
                        </div>

                        {/* MODULE 3: ANALYSIS */}
                        <div className="rounded-xl border border-slate-200/80 p-2.5 bg-white shadow-xs">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-5 w-5 items-center justify-center rounded bg-indigo-600 text-white text-[9px] font-bold">
                                        ◆
                                    </span>
                                    <span className="text-xs font-black tracking-wide text-slate-800 font-mono">
                                        ANALYSIS
                                    </span>
                                </div>
                                <span className="rounded bg-cyan-100 text-cyan-800 border border-cyan-300 px-1.5 py-0.2 text-[9px] font-mono font-bold">
                                    PRICE DATA
                                </span>
                            </div>
                            <div className="mt-1 text-[10px] text-slate-500 font-mono">
                                indikator dari candle aktual
                            </div>
                            <div className="mt-0.5 text-[9px] text-slate-400 italic">
                                tanpa sizing atau P/L virtual
                            </div>
                            <div className="mt-1 text-[9px] font-mono font-bold text-slate-700">
                                {marketAnalysis.bias} · {feedSource || 'menunggu feed'}
                            </div>
                        </div>

                        {/* MODULE 4: BIAS STATUS */}
                        <div className="rounded-xl border border-slate-200/80 p-2.5 bg-white shadow-xs">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-white text-[9px] font-bold">
                                        II
                                    </span>
                                    <span className="text-xs font-black tracking-wide text-slate-800 font-mono">
                                        BIAS STATUS
                                    </span>
                                </div>
                                <span className="rounded bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.2 text-[9px] font-mono font-bold">
                                    NO BROKER
                                </span>
                            </div>
                            <div className="mt-1 text-[10px] text-slate-500 font-mono">
                                no broker connection
                            </div>
                            <div className="mt-0.5 text-[9px] text-slate-400 italic">
                                market analysis only
                            </div>
                            <div className="mt-1 text-[9px] font-mono font-bold text-emerald-700">
                                {marketAnalysis.bias} {marketAnalysis.symbol} · analysis only
                            </div>
                        </div>

                        {/* MODULE 5: LOGGER */}
                        <div className="rounded-xl border border-slate-200/80 p-2.5 bg-white shadow-xs">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-700 text-white text-[9px] font-bold">
                                        II
                                    </span>
                                    <span className="text-xs font-black tracking-wide text-slate-800 font-mono">
                                        LOGGER
                                    </span>
                                </div>
                                <span className="rounded bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.2 text-[9px] font-mono font-bold">
                                    SNAPSHOT
                                </span>
                            </div>
                            <div className="mt-1 text-[10px] text-slate-500 font-mono">
                                in-memory snapshots for this session
                            </div>
                            <div className="mt-0.5 text-[9px] text-slate-400 italic">
                                no executed trade history
                            </div>
                            <div className="mt-1 text-[9px] font-mono font-bold text-slate-700">
                                {terminalLogs.length} current log lines · {marketAnalysis.symbol}
                            </div>
                        </div>

                        {/* MODULE 6: STORED OBSERVATIONS */}
                        <div className="rounded-xl border border-slate-200/80 p-2.5 bg-white shadow-xs">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-600 text-white text-[9px] font-bold">
                                        💧
                                    </span>
                                    <span className="text-xs font-black tracking-wide text-slate-800 font-mono">
                                        OBSERVATIONS
                                    </span>
                                </div>
                                <span className="rounded bg-blue-100 text-blue-800 border border-blue-300 px-1.5 py-0.2 text-[9px] font-mono font-bold">
                                    REAL DATA
                                </span>
                            </div>
                            <div className="mt-1 text-[10px] text-slate-500 font-mono">
                                snapshots tersimpan
                            </div>
                            <div className="mt-0.5 text-[9px] text-slate-400 italic">
                                tanpa transaksi virtual
                            </div>
                            <div className="mt-1 text-[9px] font-mono font-bold text-blue-700">
                                {marketObservations.length} snapshot
                            </div>
                        </div>

                        {/* SESSION JOURNAL */}
                        <div className="rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-xs">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-5 w-5 items-center justify-center rounded bg-slate-900 text-white text-[9px] font-bold">
                                        Y
                                    </span>
                                    <span className="text-xs font-black tracking-wide text-slate-800 font-mono">
                                        YOU
                                    </span>
                                </div>
                                <span className="rounded bg-slate-100 text-slate-700 border border-slate-300 px-1.5 py-0.2 text-[9px] font-mono font-bold">
                                    READING
                                </span>
                            </div>
                            <div className="mt-1 text-[10px] text-slate-500 font-mono">
                                reads the log in the morning
                            </div>
                            <div className="mt-0.5 text-[9px] text-slate-400 italic">
                                stopped asking, started reading
                            </div>
                            <div className="mt-1 text-[9px] font-mono font-bold text-slate-700">
                                {logHistory.length} market snapshots logged
                            </div>
                        </div>
                    </aside>

                    {/* RIGHT MAIN AREA: FLOW, BIAS, FEED LOG, AND HISTORY */}
                    <div className="p-4 sm:p-5 space-y-4">
                        {/* 1. UPPER SECTION: LIVE FLOW PIPELINE */}
                        <div className="rounded-2xl border border-[#ECECE6] bg-white p-4 shadow-xs">
                            <div className="flex items-center justify-between pb-3 text-[10px] font-mono font-bold text-slate-400">
                                <span>ANALYSIS FLOW · SCAN &rarr; MARKET CHECK &rarr; ANALYSIS &rarr; LOG</span>
                                <span className="flex items-center gap-1.5">
                                    <span className={`h-1.5 w-1.5 rounded-full ${feedIsFresh ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                                    <span>{feedIsFresh ? `${feedSource} · diperbarui ${lastRefreshedAt || 'baru saja'} WIB` : feedError || 'menunggu feed pasar'}</span>
                                </span>
                            </div>

                            {/* Every pair is scanned automatically; the detailed panel follows the active scan. */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
                                {pairScans.map((scan, index) => {
                                    const isVisuallyScanning = isRunning && pairScans.length === 5 && index === activeScanIndex;
                                    const biasClass = scan.bias === 'BULLISH'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : scan.bias === 'BEARISH'
                                            ? 'bg-rose-50 text-rose-700'
                                            : 'bg-amber-50 text-amber-700';
                                    const dotClass = scan.status === 'ANALYZED' && scan.feedFresh
                                        ? 'bg-emerald-500'
                                        : scan.status === 'UNAVAILABLE' || scan.status === 'INSUFFICIENT_HISTORY'
                                            ? 'bg-slate-400'
                                            : 'bg-amber-500';
                                    return (
                                        <div key={scan.symbol} title={scan.reason} className={`arra-scan-card relative overflow-hidden rounded-xl border bg-[#FBFBFA] p-2 font-mono text-left transition-all duration-300 ${isVisuallyScanning ? 'arra-scan-card-active border-cyan-500 shadow-[0_0_0_2px_rgba(6,182,212,0.14),0_8px_24px_rgba(8,145,178,0.14)]' : 'border-slate-200/90'}`}>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-black text-slate-900">${scan.symbol}</span>
                                                <span className="flex items-center gap-1.5">
                                                    {isVisuallyScanning && <span className="text-[8px] font-black tracking-wide text-cyan-700">SCAN {index + 1}/5</span>}
                                                    <span className={`h-1.5 w-1.5 rounded-full ${isVisuallyScanning ? 'bg-cyan-500 animate-pulse' : dotClass}`} />
                                                </span>
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-700 mt-0.5">
                                                {scan.currentPrice === null ? '—' : `$${scan.currentPrice.toFixed(pairDecimals(scan.symbol as ArraGrokPair))}`}
                                                {scan.changePercent !== null && (
                                                    <span className={`ml-1 text-[9px] ${scan.changePercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {scan.changePercent >= 0 ? '+' : ''}{scan.changePercent.toFixed(2)}%
                                                    </span>
                                                )}
                                            </div>
                                            <div className={`mt-1 inline-flex rounded px-1.5 py-0.5 text-[9px] font-black ${biasClass}`}>
                                                {scan.status === 'CLOSED' ? 'CLOSED · WAIT' : scan.bias}
                                            </div>
                                            <div className="mt-1 text-[9px] text-slate-600">{scan.alignmentScore === null ? 'Alignment —' : `Align ${scan.alignmentScore}/100`} · RSI {scan.rsi14?.toFixed(1) ?? '—'} · Trend {scan.trendScore ?? '—'}</div>
                                            <div className="mt-1 text-[9px] font-semibold text-slate-600">{scan.confluenceSummary}</div>
                                            <div className="mt-1 line-clamp-2 min-h-6 text-[9px] leading-3 text-slate-500">{scan.reason}</div>
                                        </div>
                                    );
                                })}
                                {!pairScans.length && (
                                    <div className="col-span-full rounded-xl border border-dashed border-slate-300 p-3 text-center text-[10px] text-slate-500">
                                        {scanError || 'Memindai BTCUSD, XAUUSD, EURUSD, GBPUSD, dan USDJPY otomatis…'}
                                    </div>
                                )}
                            </div>
                            <div className="mb-4 flex items-center justify-between text-[9px] font-mono text-slate-400">
                                <span>{pairScans.length}/5 pair · sorotan bergerak = indikator visual · hasil scan diperbarui tiap 15 detik</span>
                                <span>{scanError || (scanUpdatedAt ? `Scan ${new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' }).format(new Date(scanUpdatedAt))} WIB` : 'menunggu scan pertama')}</span>
                            </div>

                            {/* SVG Flow Curve Diagram */}
                            <div className="relative rounded-2xl border border-slate-100 bg-[#FAF9F5] p-4 py-6 overflow-hidden">
                                <div className="flex items-center justify-between max-w-lg mx-auto relative">
                                    {/* Left Circle Node: SENTRY GUARD */}
                                    <div className="flex flex-col items-center gap-1.5 z-10">
                                        <div className="h-16 w-16 rounded-full border-2 border-rose-400 bg-white shadow-md flex items-center justify-center relative">
                                            <span className="h-20 w-20 rounded-full border border-rose-300/40 absolute animate-ping" />
                                            <span className="text-rose-600 text-lg font-black">▲</span>
                                        </div>
                                        <div className="text-[10px] font-mono font-bold text-slate-700">MARKET STATUS</div>
                                        <div className="text-[9px] font-mono text-slate-400">
                                            {!hasFeed ? 'MENUNGGU FEED' : selectedPair === 'BTCUSD' ? 'PASAR 24/7' : marketOpen === false ? 'PASAR TUTUP' : 'SESI PASAR'}
                                        </div>
                                    </div>

                                    {/* Middle Connecting Arc with Green Spline and LIVE Percentage */}
                                    <div className="flex-1 px-4 flex flex-col items-center">
                                        <div className="text-[11px] font-mono text-emerald-600 font-black mb-1 transition-all">
                                            {marketAnalysis.bias}
                                        </div>
                                        {/* Visual SVG green curved line */}
                                        <svg className="w-full h-8 overflow-visible" viewBox="0 0 100 24" fill="none">
                                            <path
                                                d="M 5,20 C 35,5 65,18 95,6"
                                                stroke={feedIsFresh ? '#10B981' : '#94A3B8'}
                                                strokeWidth="2.5"
                                                strokeLinecap="round"
                                            />
                                            <circle cx="95" cy="6" r="3.5" fill={feedIsFresh ? '#10B981' : '#94A3B8'} className={feedIsFresh ? 'animate-ping' : ''} />
                                        </svg>
                                        <div className="text-[9px] font-mono text-slate-400 mt-1">
                                            {marketAnalysis.bias === 'WAIT' ? 'menunggu konfirmasi analisis' : 'pembacaan indikator aktual'}
                                        </div>
                                    </div>

                                    {/* Right Circle Node: BIAS */}
                                    <div className="flex flex-col items-center gap-1.5 z-10">
                                        <div className="h-16 w-16 rounded-full border-2 border-emerald-500 bg-white shadow-md flex items-center justify-center relative">
                                            <span className="h-20 w-20 rounded-full border border-emerald-400/40 absolute animate-ping" />
                                            <span className="text-emerald-600 text-sm font-black">II</span>
                                        </div>
                                        <div className="text-[10px] font-mono font-bold text-slate-700">MARKET BIAS</div>
                                        <div className="text-[9px] font-mono text-emerald-700 font-bold">
                                            TIDAK TERHUBUNG
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 4 Summary Metric Cards */}
                            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                                <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                                        <span className="text-rose-500">▲</span> ASSETS SCANNED
                                    </div>
                                    <div className="text-base font-black text-slate-800 mt-0.5">{pairScans.length}</div>
                                    <div className="text-[9px] text-slate-400">instrumen dari feed</div>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                                        <span className="text-amber-600">■</span> LOGGER
                                    </div>
                                    <div className="text-base font-black text-slate-800 mt-0.5">{terminalLogs.length}</div>
                                    <div className="text-[9px] text-slate-400">baris feed / sinyal</div>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                                        <span className="text-blue-600">💧</span> FEED STATUS
                                    </div>
                                    <div className="text-base font-black text-slate-800 mt-0.5">{feedIsFresh ? 'SEGAR' : 'STALE'}</div>
                                    <div className="text-[9px] text-slate-400">status data {feedSource || '—'}</div>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                                        <span className="text-cyan-700">◆</span> ALIGNMENT
                                    </div>
                                    <div className="text-base font-black text-slate-800 mt-0.5">{marketAnalysis.alignmentScore ?? '—'}<span className="text-[10px]"> / 100</span></div>
                                    <div className="text-[9px] text-slate-400">indikator, bukan probabilitas</div>
                                </div>
                            </div>
                        </div>

                        {/* 2. MIDDLE SECTION: MARKET BIAS AND OBSERVATIONS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Left: Active Trade Details & Start vs Now */}
                            <div className="rounded-2xl border border-[#ECECE6] bg-white p-4 font-mono shadow-xs">
                                <div>
                                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                                        <span>ANALISIS PASAR · SNAPSHOT AKTUAL</span>
                                        <span className="rounded px-1.5 py-0.2 text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                            {selectedPair === 'BTCUSD' ? 'PASAR 24/7' : marketOpen === false ? 'PASAR TUTUP · ANALISIS SAJA' : 'ANALISIS SAJA · TANPA BROKER'}
                                        </span>
                                    </div>

                                    <div className="mt-2 flex items-baseline justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl font-black text-slate-900">{marketAnalysis.symbol}</span>
                                            <span className="rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.2 text-[10px] font-bold">
                                                {marketAnalysis.bias}
                                            </span>
                                            {selectedPair === 'BTCUSD' && (
                                                <span className="rounded bg-emerald-500 text-white px-1.5 py-0.2 text-[9px] font-bold">
                                                    24/7
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-sm font-black text-slate-500">{feedIsFresh ? 'FEED OK' : 'FEED TIDAK SEGAR'}</span>
                                    </div>

                                    <div className="mt-3 space-y-1 text-xs border-t border-slate-100 pt-2.5">
                                        <div className="flex justify-between">
                                        <span className="text-slate-400">harga feed:</span>
                                            <span className="font-bold text-emerald-600 transition-all">{marketAnalysis.current ? marketAnalysis.current.toFixed(pairDecimals(selectedPair)) : '—'}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-y border-slate-100 py-2">
                                            <span className="text-slate-400">RSI 14: <strong className="text-slate-700">{marketAnalysis.rsi14 ?? '—'}</strong></span>
                                            <span className="text-slate-400">ATR 14: <strong className="text-slate-700">{marketAnalysis.atr14?.toFixed(pairDecimals(selectedPair)) ?? '—'}</strong></span>
                                            <span className="text-slate-400">Trend: <strong className="text-slate-700">{marketAnalysis.trendScore ?? '—'}/100</strong></span>
                                            <span className="text-slate-400">Alignment: <strong className="text-slate-700">{marketAnalysis.alignmentScore ?? '—'}/100</strong></span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">sumber feed:</span>
                                            <span className="font-bold text-slate-800">{feedSource || '—'}</span>
                                        </div>
                                        <div className="pt-1 text-[11px] text-slate-600 leading-snug">
                                            <span className="text-slate-400">reason: </span>
                                            {hasFeed && !feedIsFresh ? 'Feed tidak segar; bias ditahan.' : marketAnalysis.reason}
                                        </div>
                                        <div className="text-[11px] text-slate-400">
                                            {marketAnalysis.bias === 'WAIT' ? 'Data/konfirmasi belum memadai; menunggu observasi berikutnya.' : 'Bias teknikal dari candle pasar teramati; bukan instruksi transaksi.'}
                                        </div>
                                    </div>
                                </div>

                            </div>

                            {/* Right: Market data and analysis output */}
                            <div className="rounded-2xl border border-slate-800 bg-[#0F172A] p-4 font-mono shadow-xs flex flex-col justify-between text-white">
                                <div>
                                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 border-b border-slate-800 pb-2 mb-3">
                                    <span className="text-emerald-400">$ market-analysis</span>
                                        <span className={`flex items-center gap-1.5 text-xs ${feedIsFresh ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            <span className={`h-1.5 w-1.5 rounded-full ${feedIsFresh && isRunning ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                                            <span>{terminalLogs.length} feed lines · session only</span>
                                        </span>
                                    </div>

                                    {/* Terminal code stream container */}
                                    <div className="max-h-[280px] overflow-y-auto space-y-1.5 text-[11px] leading-relaxed text-slate-300 pr-1">
                                        {terminalLogs.map((line, idx) => (
                                            <div key={idx} className={line.includes('ENTER') || line.includes('EXIT') ? 'text-white font-bold' : 'text-slate-400 pl-3'}>
                                                {line}
                                            </div>
                                        ))}
                                        <div className="flex items-center gap-1 text-emerald-400 animate-pulse pt-1">
                                            <span>█</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                                    <span className="flex items-center gap-1 text-emerald-400 font-bold">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                        <span>{feedIsFresh ? 'Feed dan sinyal terbaru' : feedError || 'Feed belum tersedia'}</span>
                                    </span>
                                    <span className="text-emerald-400 font-mono">ARRA7 Proprietary</span>
                                </div>
                            </div>
                        </div>

                        <section className="rounded-2xl border border-cyan-200 bg-white p-4 font-mono shadow-xs">
                            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                                <div>
                                    <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
                                        <SparklesIcon className="h-4 w-4 text-cyan-700" />
                                        REVIEW TAMBAHAN GROQ · {selectedPair}
                                    </h3>
                                    <p className="mt-1 text-[11px] text-slate-500">
                                        Diproses saat diminta dari data live dan indikator ARRA GROK. Tidak mengubah sinyal atau mengirim order.
                                    </p>
                                </div>
                                <button
                                    onClick={handleGroqReview}
                                    disabled={isReviewingWithGroq || !hasFeed}
                                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-50 px-3.5 py-2 text-xs font-bold text-cyan-800 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isReviewingWithGroq ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <SparklesIcon className="h-4 w-4" />}
                                    {isReviewingWithGroq ? 'Meninjau…' : 'Minta review Groq'}
                                </button>
                            </div>
                            {groqReviewError && <p className="mt-3 text-xs font-medium text-rose-700">{groqReviewError}</p>}
                            {groqReview && (
                                <div className="mt-3 rounded-xl border border-slate-200 bg-[#F7F7F4] p-3 text-xs leading-relaxed text-slate-700">
                                    <div className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-cyan-800">{groqReviewModel} · opini sekunder</div>
                                    {groqReview}
                                </div>
                            )}
                        </section>

                        {/* 3. BOTTOM SECTION: LOG TABLE (reading the log) */}
                        <div className="rounded-2xl border border-[#ECECE6] bg-white p-4 font-mono shadow-xs">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-[10px] font-bold text-slate-400">
                                        <span>RIWAYAT OBSERVASI · {marketObservations.length} SNAPSHOT</span>
                                        <span>candle pasar aktual · tanpa transaksi simulasi</span>
                            </div>

                            <div className="divide-y divide-slate-100 text-xs">
                                {logHistory.map((item) => (
                                    <div key={item.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-slate-400 text-[11px]">{item.time}</span>
                                            <span
                                                className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                                                    item.type === 'BIAS'
                                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                                        : 'bg-blue-100 text-blue-800 border border-blue-300'
                                                }`}
                                            >
                                                {item.type}
                                            </span>
                                            <span className="font-black text-slate-800">{item.symbol}</span>
                                            <span className="text-[11px] text-slate-500 hidden md:inline">
                                                reason: {item.reason}
                                            </span>
                                        </div>
                                        <div className="text-right sm:self-auto self-end font-bold">
                                            <span className="text-slate-700">
                                                {item.result}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {logHistory.length === 0 && (
                                    <div className="py-5 text-center text-[11px] text-slate-500">
                                        Belum ada snapshot tersimpan untuk {selectedPair}. Analisis tercatat saat feed member aktif.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Bottom Utility Controls */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    onClick={handleToggleFeed}
                                    className="rounded-xl border border-slate-300 bg-white hover:bg-slate-100 px-3 py-1.5 text-xs font-mono font-bold text-slate-700 transition cursor-pointer"
                                >
                                    {isRunning ? 'Pause Feed Updates' : 'Resume Feed Updates'}
                                </button>
                                <button
                                    onClick={handleDownloadLog}
                                    className="rounded-xl border border-slate-300 bg-white hover:bg-slate-100 px-3 py-1.5 text-xs font-mono font-bold text-slate-600 transition flex items-center gap-1 cursor-pointer"
                                >
                                    <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                                    <span>Unduh Log</span>
                                </button>
                                <button
                                    onClick={fetchPairScans}
                                    className="rounded-xl border border-cyan-300 bg-cyan-50 hover:bg-cyan-100 px-3 py-1.5 text-xs font-mono font-bold text-cyan-800 transition flex items-center gap-1 cursor-pointer"
                                >
                                    <ArrowPathIcon className="h-3.5 w-3.5" />
                                    <span>Refresh Feed</span>
                                </button>
                            </div>

                            <Link
                                href="/arra-cronos"
                                className="text-xs font-mono font-bold text-cyan-700 hover:text-cyan-900 flex items-center gap-1"
                            >
                                <span>Lihat Chart ARRA Cronos &rarr;</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
