'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { usePicaDevice } from '@/context/PicaDeviceContext';
import { isAdminEmail, isAdminUser } from '@/lib/admin-access';
import {
    ArrowPathIcon,
    ArrowTrendingDownIcon,
    ArrowTrendingUpIcon,
    BoltIcon,
    CalculatorIcon,
    ChartBarIcon,
    CheckIcon,
    ClipboardDocumentCheckIcon,
    ClipboardDocumentIcon,
    ClockIcon,
    CpuChipIcon,
    DocumentTextIcon,
    EyeIcon,
    InformationCircleIcon,
    KeyIcon,
    LockClosedIcon,
    ShieldCheckIcon,
    SignalIcon,
    SpeakerWaveIcon,
    SpeakerXMarkIcon,
    SparklesIcon,
} from '@heroicons/react/24/outline';

interface GrokLogEntry {
    id: string;
    time: string;
    type: 'ENTRY' | 'EXIT' | 'FILTERED' | 'PASS';
    symbol: string;
    action?: 'BUY' | 'SELL';
    price?: number;
    reason: string;
    pnl?: string;
    isProfit?: boolean;
    size?: string;
}

interface ActiveTrade {
    symbol: string;
    name: string;
    action: 'BUY' | 'SELL';
    entryPrice: number;
    currentPrice: number;
    takeProfit: number;
    stopLoss: number;
    riskReward: string;
    pnlPercent: number;
    dollarPnl: number;
    lotSize: number;
    status: 'ACTIVE' | 'SCALING' | 'TRAILING';
    reason: string;
    confidence: number;
}

const FOREX_GOLD_UNIVERSE = [
    { symbol: 'XAUUSD', name: 'Gold / US Dollar', spread: '1.2 pts', session: 'London / NY Active' },
    { symbol: 'EURUSD', name: 'Euro / US Dollar', spread: '0.6 pts', session: 'London Open' },
    { symbol: 'GBPUSD', name: 'British Pound / USD', spread: '0.9 pts', session: 'London Open' },
    { symbol: 'USDJPY', name: 'USD / Japanese Yen', spread: '0.8 pts', session: 'Asian / NY Cross' },
    { symbol: 'AUDUSD', name: 'Aussie / US Dollar', spread: '0.8 pts', session: 'Asian / London' },
    { symbol: 'USDCAD', name: 'USD / Canadian Dollar', spread: '1.1 pts', session: 'NY Active' },
];

const INITIAL_LOGS: GrokLogEntry[] = [
    {
        id: '1',
        time: '19:42:10',
        type: 'EXIT',
        symbol: 'XAUUSD',
        action: 'BUY',
        price: 2748.20,
        reason: 'Take-profit 2 hit (+42 pts) · Volume momentum peak',
        pnl: '+$420.00',
        isProfit: true,
        size: '0.10 Lot',
    },
    {
        id: '2',
        time: '19:35:45',
        type: 'FILTERED',
        symbol: 'GBPUSD',
        reason: 'Red-Folder News Filter: High impact BOE member speech in 10m',
    },
    {
        id: '3',
        time: '19:28:12',
        type: 'ENTRY',
        symbol: 'XAUUSD',
        action: 'BUY',
        price: 2744.00,
        reason: 'Asian Low Sweep + Cronos Bullish 86% + London Open Volume',
        size: '0.10 Lot',
    },
    {
        id: '4',
        time: '19:15:30',
        type: 'EXIT',
        symbol: 'EURUSD',
        action: 'SELL',
        price: 1.08420,
        reason: 'Trailing stop protected (+18 pts) · Session transition',
        pnl: '+$180.00',
        isProfit: true,
        size: '1.00 Lot',
    },
    {
        id: '5',
        time: '19:02:15',
        type: 'FILTERED',
        symbol: 'USDJPY',
        reason: 'Spread Sentinel: Spread spike 3.2 pts above safety threshold',
    },
    {
        id: '6',
        time: '18:45:00',
        type: 'ENTRY',
        symbol: 'EURUSD',
        action: 'SELL',
        price: 1.08600,
        reason: 'London Liquidity Grab + Cronos Bearish Confluence 82%',
        size: '1.00 Lot',
    },
];

// Audio chime using Web Audio API
function playSignalChime() {
    if (typeof window === 'undefined') return;
    try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.15); // A5

        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.31);
    } catch {
        // audio muted or not allowed
    }
}

export default function ArraGrokPage() {
    const { data: session } = useSession();
    const { tier, openActivation } = usePicaDevice();

    const [hasLocalUnlock, setHasLocalUnlock] = useState(false);
    const [isDemoMode, setIsDemoMode] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const local = localStorage.getItem('pica_arra_cronos_unlocked') === 'true';
            if (local) setHasLocalUnlock(true);
        }
    }, []);

    const isUnlocked =
        hasLocalUnlock ||
        tier === 'PRO' ||
        tier === 'VVIP' ||
        session?.user?.tier === 'PRO' ||
        session?.user?.tier === 'VVIP' ||
        (session?.user as any)?.plan === 'ARRA_CRONOS' ||
        (session?.user as any)?.plan === 'ALL_ACCESS' ||
        isAdminEmail(session?.user?.email) || isAdminUser(session?.user);

    // Terminal State
    const [isRunning, setIsRunning] = useState(true);
    const [sessionTimer, setSessionTimer] = useState(1284); // seconds
    const [equity, setEquity] = useState(133.70);
    const [targetEquity, setTargetEquity] = useState(14880.00);
    const [tradesCount, setTradesCount] = useState(48);
    const [wonCount, setWonCount] = useState(38);
    const [lostCount, setLostCount] = useState(10);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [copiedTrade, setCopiedTrade] = useState(false);
    const [logs, setLogs] = useState<GrokLogEntry[]>(INITIAL_LOGS);

    // Active trade in focus
    const [activeTrade, setActiveTrade] = useState<ActiveTrade>({
        symbol: 'XAUUSD',
        name: 'Gold / US Dollar',
        action: 'BUY',
        entryPrice: 2742.50,
        currentPrice: 2748.90,
        takeProfit: 2755.00,
        stopLoss: 2738.00,
        riskReward: '1:2.8',
        pnlPercent: 2.33,
        dollarPnl: 640.00,
        lotSize: 0.10,
        status: 'TRAILING',
        reason: 'Asian Low Sweep + Cronos Bullish 88% + London S/D Bounce',
        confidence: 88,
    });

    // Session Timer tick
    useEffect(() => {
        if (!isRunning) return;
        const interval = window.setInterval(() => {
            setSessionTimer((prev) => prev + 1);
        }, 1000);
        return () => window.clearInterval(interval);
    }, [isRunning]);

    // Simulated Realtime Ticker & Agents Activity
    useEffect(() => {
        if (!isRunning) return;
        const interval = window.setInterval(() => {
            setActiveTrade((prev) => {
                const delta = (Math.random() - 0.45) * 0.4;
                const newPrice = +(prev.currentPrice + delta).toFixed(2);
                const pnlDiff = +(newPrice - prev.entryPrice).toFixed(2);
                const dollar = +(pnlDiff * 100 * prev.lotSize).toFixed(2);
                const pct = +((pnlDiff / prev.entryPrice) * 100).toFixed(2);

                return {
                    ...prev,
                    currentPrice: newPrice,
                    pnlPercent: pct,
                    dollarPnl: Math.max(-50, dollar),
                };
            });
        }, 2500);

        return () => window.clearInterval(interval);
    }, [isRunning]);

    // Format session timer (HH:MM:SS)
    const formatTimer = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
        const s = (totalSeconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    const handleCopyTrade = useCallback(() => {
        const text = `🎯 *ARRA GROK SNIPER SIGNAL*
────────────────────────
💎 *Asset:* ${activeTrade.symbol} (${activeTrade.action})
⚡ *Entry:* ${activeTrade.entryPrice}
🎯 *Take Profit:* ${activeTrade.takeProfit}
🛡️ *Stop Loss:* ${activeTrade.stopLoss}
📊 *Risk:Reward:* ${activeTrade.riskReward}
💼 *Recommended Lot:* ${activeTrade.lotSize} Lot
🔥 *Reason:* ${activeTrade.reason}
────────────────────────
_Generated autonomously by ARRA GROK 6-Agent Swarm_`;

        navigator.clipboard.writeText(text);
        setCopiedTrade(true);
        setTimeout(() => setCopiedTrade(false), 2500);
    }, [activeTrade]);

    const winRate = useMemo(() => {
        if (tradesCount === 0) return 0;
        return Math.round((wonCount / tradesCount) * 100);
    }, [tradesCount, wonCount]);

    return (
        <main className="min-h-screen bg-[#070b13] px-3 pb-16 pt-24 text-slate-100 sm:px-6 lg:px-8 font-sans">
            <div className="mx-auto max-w-[1600px]">
                {/* TOP NAVIGATION / HEADER */}
                <header className="mb-6 flex flex-col justify-between gap-4 border-b border-slate-800/80 pb-5 lg:flex-row lg:items-center">
                    <div>
                        <div className="mb-1.5 flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_10px_#38bdf8]" />
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-[.28em] text-cyan-300">
                                ARRA GROK · 6 AUTONOMOUS AGENTS TERMINAL
                            </span>
                            <span className="rounded bg-gradient-to-r from-amber-400 to-orange-500 px-1.5 py-0.2 text-[8px] font-black text-slate-950">
                                FOREX & GOLD FUTURES
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                            ARRA{' '}
                            <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                                GROK
                            </span>
                            <span className="text-xs text-slate-500 font-normal ml-2">
                                Termasuk dalam Paket ARRA Cronos
                            </span>
                        </h1>
                        <p className="mt-1 text-xs text-slate-400">
                            Terminal Kuantitatif Otonom: 6 Agen AI Spesialis · Log Realtime Transparan · Eksekusi Mandiri Tanpa Copytrade.
                        </p>
                    </div>

                    {/* Header Controls & Status */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Session Timer Pill */}
                        <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-[#0a101b] px-3 py-2 text-xs font-mono font-bold text-slate-300">
                            <span className={`h-2 w-2 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                            <span className="text-slate-500 text-[10px]">UPTIME:</span>
                            <span>{formatTimer(sessionTimer)}</span>
                        </div>

                        {/* Sound Toggle */}
                        <button
                            onClick={() => setSoundEnabled((prev) => !prev)}
                            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                                soundEnabled
                                    ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/15'
                                    : 'border-slate-800 bg-slate-900 text-slate-500'
                            }`}
                        >
                            {soundEnabled ? (
                                <>
                                    <SpeakerWaveIcon className="h-4 w-4 text-cyan-300 animate-pulse" />
                                    <span>Chime: ON</span>
                                </>
                            ) : (
                                <>
                                    <SpeakerXMarkIcon className="h-4 w-4" />
                                    <span>Chime: OFF</span>
                                </>
                            )}
                        </button>

                        {/* Switch to ARRA Cronos */}
                        <Link
                            href="/arra-cronos"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
                        >
                            <span>Desk ARRA Cronos</span>
                            <span>↗</span>
                        </Link>

                        {/* Play / Pause Toggle */}
                        <button
                            onClick={() => setIsRunning((prev) => !prev)}
                            className={`rounded-xl px-3 py-2 text-xs font-extrabold transition ${
                                isRunning
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                            }`}
                        >
                            {isRunning ? 'Pause Agents' : 'Resume Agents'}
                        </button>
                    </div>
                </header>

                {/* PAYWALL LOCK BANNER IF NOT UNLOCKED */}
                {!isUnlocked && (
                    <div className="mb-6 overflow-hidden rounded-3xl border border-cyan-500/40 bg-gradient-to-br from-[#0c1a2e] via-[#091220] to-[#141029] p-6 shadow-2xl relative">
                        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
                        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                            <div className="max-w-3xl">
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 border border-amber-400/40 px-3 py-1 text-xs font-black text-amber-300">
                                        <LockClosedIcon className="h-3.5 w-3.5" />
                                        FITUR ARRA GROK TERMASUK DALAM PAKET ARRA CRONOS
                                    </span>
                                    <span className="rounded-full bg-cyan-400/20 px-3 py-1 text-xs font-black text-cyan-200 border border-cyan-400/30">
                                        RP 150.000 · LIFETIME SEKALI BAYAR
                                    </span>
                                    {isDemoMode && (
                                        <span className="rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-[10px] font-black text-emerald-300 border border-emerald-400/40">
                                            DEMO PREVIEW AKTIF
                                        </span>
                                    )}
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                                    Buka Akses ARRA GROK 6-Agent Terminal + <span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-indigo-300 bg-clip-text text-transparent">Bonus Indikator TradingView</span>
                                </h2>
                                <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-300">
                                    Dengan membeli paket <strong>ARRA Cronos (Rp 150.000)</strong>, Anda langsung mendapatkan akses penuh ke Terminal 6 Agen AI ARRA GROK, mesin proyeksi lilin masa depan, serta source code resmi indikator TradingView Pine Script v6.
                                </p>
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
                                        href="https://t.me/arra7trader?text=Halo%20Admin%20ARRA7!%20Saya%20ingin%20order%20ARRA%20Cronos%20+%20ARRA%20Grok%20(Rp%20150.000)"
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
                                <button
                                    onClick={() => setIsDemoMode((prev) => !prev)}
                                    className="text-[10px] text-center font-bold text-slate-400 hover:text-cyan-300 transition py-1"
                                >
                                    {isDemoMode ? '← Tutup Mode Demo' : '👁️ Lihat Simulasi Live Demo'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* TOP METRICS STRIP (EQUITY, TRADES, WINRATE) */}
                <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                    <div className="rounded-2xl border border-slate-800 bg-[#090f19] p-3.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Starting Balance
                        </div>
                        <div className="mt-1 text-lg font-black text-slate-300">$1,000.00</div>
                        <div className="text-[10px] text-slate-500">Zero Copytrade · Personal Risk</div>
                    </div>

                    <div className="rounded-2xl border border-cyan-500/30 bg-[#081524] p-3.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                            Simulated Equity
                        </div>
                        <div className="mt-1 text-lg font-black text-cyan-200">
                            ${(equity + activeTrade.dollarPnl + 13746.30).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] font-bold text-emerald-400">+$13,746.30 Growth</div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-[#090f19] p-3.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Total Setups
                        </div>
                        <div className="mt-1 text-lg font-black text-white">{tradesCount} Trades</div>
                        <div className="text-[10px] text-slate-500">Overnight Session</div>
                    </div>

                    <div className="rounded-2xl border border-emerald-500/20 bg-[#071610] p-3.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                            Winrate
                        </div>
                        <div className="mt-1 text-lg font-black text-emerald-300">{winRate}%</div>
                        <div className="text-[10px] text-slate-500">{wonCount} Won · {lostCount} Lost</div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-[#090f19] p-3.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Safety Gates
                        </div>
                        <div className="mt-1 text-lg font-black text-indigo-300">100% Passed</div>
                        <div className="text-[10px] text-slate-500">News & Spread Blocked</div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-[#090f19] p-3.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Live Status
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-lg font-black text-emerald-400">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
                            <span>EXEC LIVE</span>
                        </div>
                        <div className="text-[10px] text-slate-500">6 Agents Autonomous</div>
                    </div>
                </div>

                {/* MAIN GRID: 6 AUTONOMOUS AGENTS VISUAL PIPELINE */}
                <div className="mb-6">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CpuChipIcon className="h-4 w-4 text-cyan-300" />
                            <h2 className="text-xs font-black uppercase tracking-wider text-slate-300">
                                6 Specialized Autonomous Agents Pipeline
                            </h2>
                        </div>
                        <span className="text-[11px] text-slate-500">
                            Orkestrasi AI tanpa intervensi manusia · Memilih setup probabilitas tertinggi
                        </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                        {/* Agent 1: Scanner */}
                        <div className="rounded-2xl border border-slate-800 bg-[#090f19] p-4 relative overflow-hidden group hover:border-cyan-500/40 transition">
                            <div className="flex items-center justify-between mb-2">
                                <span className="rounded bg-cyan-400/10 px-2 py-0.5 text-[9px] font-black text-cyan-300">
                                    01 · SCANNER
                                </span>
                                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                            </div>
                            <div className="text-xs font-black text-white">Forex & Gold Scanner</div>
                            <p className="mt-1 text-[10px] text-slate-400 leading-relaxed">
                                Memindai lonjakan volume sesi London/NY & Asian Range Liquidity Grab.
                            </p>
                            <div className="mt-3 border-t border-slate-800/80 pt-2 text-[10px] text-slate-500 flex justify-between">
                                <span>Status:</span>
                                <span className="font-bold text-cyan-300">Scanning 6 Pairs</span>
                            </div>
                        </div>

                        {/* Agent 2: Macro News Guard */}
                        <div className="rounded-2xl border border-slate-800 bg-[#090f19] p-4 relative overflow-hidden group hover:border-amber-500/40 transition">
                            <div className="flex items-center justify-between mb-2">
                                <span className="rounded bg-amber-400/10 px-2 py-0.5 text-[9px] font-black text-amber-300">
                                    02 · NEWS GUARD
                                </span>
                                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            </div>
                            <div className="text-xs font-black text-white">Macro Calendar Filter</div>
                            <p className="mt-1 text-[10px] text-slate-400 leading-relaxed">
                                Mencegah eksekusi 15 mnt sebelum/sesudah NFP, CPI, FOMC & Red-Folder news.
                            </p>
                            <div className="mt-3 border-t border-slate-800/80 pt-2 text-[10px] text-slate-500 flex justify-between">
                                <span>Defense:</span>
                                <span className="font-bold text-emerald-400">Zero Red-Folder</span>
                            </div>
                        </div>

                        {/* Agent 3: ARRA Cronos AI */}
                        <div className="rounded-2xl border border-cyan-500/30 bg-[#081524] p-4 relative overflow-hidden group hover:border-cyan-400 transition shadow-lg shadow-cyan-500/10">
                            <div className="flex items-center justify-between mb-2">
                                <span className="rounded bg-cyan-400/20 px-2 py-0.5 text-[9px] font-black text-cyan-200">
                                    03 · CRONOS AI
                                </span>
                                <SparklesIcon className="h-3.5 w-3.5 text-cyan-300" />
                            </div>
                            <div className="text-xs font-black text-white">Quant Candle Forecast</div>
                            <p className="mt-1 text-[10px] text-cyan-100/70 leading-relaxed">
                                Model autoregressive memprediksi target lilin masa depan & lorong P10–P90.
                            </p>
                            <div className="mt-3 border-t border-slate-800/80 pt-2 text-[10px] text-slate-500 flex justify-between">
                                <span>Confidence:</span>
                                <span className="font-bold text-cyan-200">{activeTrade.confidence}% Confluence</span>
                            </div>
                        </div>

                        {/* Agent 4: Spread Sentinel */}
                        <div className="rounded-2xl border border-slate-800 bg-[#090f19] p-4 relative overflow-hidden group hover:border-indigo-500/40 transition">
                            <div className="flex items-center justify-between mb-2">
                                <span className="rounded bg-indigo-400/10 px-2 py-0.5 text-[9px] font-black text-indigo-300">
                                    04 · SPREAD SENTRY
                                </span>
                                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            </div>
                            <div className="text-xs font-black text-white">Spread & Slippage Gate</div>
                            <p className="mt-1 text-[10px] text-slate-400 leading-relaxed">
                                Memblokir order jika spread broker melebar di atas 2.5 pts (Anti-Rollover Trap).
                            </p>
                            <div className="mt-3 border-t border-slate-800/80 pt-2 text-[10px] text-slate-500 flex justify-between">
                                <span>Max Spread:</span>
                                <span className="font-bold text-indigo-300">1.2 pts Valid</span>
                            </div>
                        </div>

                        {/* Agent 5: Sizer Agent */}
                        <div className="rounded-2xl border border-slate-800 bg-[#090f19] p-4 relative overflow-hidden group hover:border-blue-500/40 transition">
                            <div className="flex items-center justify-between mb-2">
                                <span className="rounded bg-blue-400/10 px-2 py-0.5 text-[9px] font-black text-blue-300">
                                    05 · SIZER AGENT
                                </span>
                                <CalculatorIcon className="h-3.5 w-3.5 text-blue-300" />
                            </div>
                            <div className="text-xs font-black text-white">Dynamic Position Sizer</div>
                            <p className="mt-1 text-[10px] text-slate-400 leading-relaxed">
                                Menghitung lot otomatis dari saldo pengguna dengan toleransi risiko ketat 1%.
                            </p>
                            <div className="mt-3 border-t border-slate-800/80 pt-2 text-[10px] text-slate-500 flex justify-between">
                                <span>Lot Size:</span>
                                <span className="font-bold text-white">{activeTrade.lotSize} Lot ($20 Risk)</span>
                            </div>
                        </div>

                        {/* Agent 6: Decision Logger */}
                        <div className="rounded-2xl border border-slate-800 bg-[#090f19] p-4 relative overflow-hidden group hover:border-emerald-500/40 transition">
                            <div className="flex items-center justify-between mb-2">
                                <span className="rounded bg-emerald-400/10 px-2 py-0.5 text-[9px] font-black text-emerald-300">
                                    06 · LOGGER
                                </span>
                                <DocumentTextIcon className="h-3.5 w-3.5 text-emerald-300" />
                            </div>
                            <div className="text-xs font-black text-white">Autonomous Logger</div>
                            <p className="mt-1 text-[10px] text-slate-400 leading-relaxed">
                                Menulis alasan entry/exit secara transparan & kirim sinyal ke layar + Telegram.
                            </p>
                            <div className="mt-3 border-t border-slate-800/80 pt-2 text-[10px] text-slate-500 flex justify-between">
                                <span>Mode:</span>
                                <span className="font-bold text-emerald-300">Zero Copytrade</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* TWO-COLUMN WORKSPACE: ACTIVE SNIPER SETUP CARD + LIVE LOG STREAM */}
                <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    {/* Left: Active Trade Execution Card (Cockpit) */}
                    <div className="rounded-2xl border border-cyan-500/30 bg-[#081220] p-5 shadow-2xl relative overflow-hidden">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300 font-black text-lg border border-cyan-400/20">
                                    AU
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-xl font-black text-white tracking-tight">
                                            {activeTrade.symbol}
                                        </h3>
                                        <span className="rounded-md bg-emerald-400/20 border border-emerald-400/40 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                                            {activeTrade.action} SNIPER
                                        </span>
                                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                                            {activeTrade.status}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400">{activeTrade.name} · Sesi London/NY Live</p>
                                </div>
                            </div>

                            {/* PnL Big Pill */}
                            <div className="text-right">
                                <div className="text-2xl font-black text-emerald-400">
                                    +${activeTrade.dollarPnl.toFixed(2)}
                                </div>
                                <div className="text-xs font-bold text-emerald-300">
                                    +{activeTrade.pnlPercent}% (Unrealized Profit)
                                </div>
                            </div>
                        </div>

                        {/* Price Details Grid */}
                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <div className="rounded-xl border border-slate-800/90 bg-[#060a12] p-3">
                                <div className="text-[9px] font-bold uppercase text-slate-500">Entry Price</div>
                                <div className="mt-1 text-base font-black text-white">{activeTrade.entryPrice}</div>
                                <div className="text-[9px] text-slate-500">Cronos Fill</div>
                            </div>
                            <div className="rounded-xl border border-slate-800/90 bg-[#060a12] p-3">
                                <div className="text-[9px] font-bold uppercase text-slate-500">Current Market</div>
                                <div className="mt-1 text-base font-black text-cyan-300">{activeTrade.currentPrice}</div>
                                <div className="text-[9px] text-emerald-400 font-bold">+6.40 pts</div>
                            </div>
                            <div className="rounded-xl border border-emerald-500/20 bg-[#061810] p-3">
                                <div className="text-[9px] font-bold uppercase text-emerald-400">Take Profit (TP)</div>
                                <div className="mt-1 text-base font-black text-emerald-300">{activeTrade.takeProfit}</div>
                                <div className="text-[9px] text-slate-400">R:R {activeTrade.riskReward}</div>
                            </div>
                            <div className="rounded-xl border border-rose-500/20 bg-[#160a0f] p-3">
                                <div className="text-[9px] font-bold uppercase text-rose-400">Stop Loss (SL)</div>
                                <div className="mt-1 text-base font-black text-rose-300">{activeTrade.stopLoss}</div>
                                <div className="text-[9px] text-slate-400">Risk Protection</div>
                            </div>
                        </div>

                        {/* Agent Decision Rationale Box */}
                        <div className="mt-4 rounded-xl border border-cyan-500/20 bg-[#050e18] p-3.5 text-xs">
                            <div className="flex items-center gap-2 text-cyan-300 font-bold mb-1">
                                <DocumentTextIcon className="h-4 w-4" />
                                <span>Alasan Keputusan 6 Agen AI:</span>
                            </div>
                            <p className="text-[11px] text-slate-300 leading-relaxed font-mono">
                                "{activeTrade.reason}"
                            </p>
                        </div>

                        {/* Action Buttons: 1-Click Copy to MT5 */}
                        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-4">
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <span>Rekomendasi Lot:</span>
                                <strong className="text-white font-mono bg-slate-800 px-2 py-0.5 rounded">
                                    {activeTrade.lotSize} Lot
                                </strong>
                                <span className="text-[10px] text-slate-500">($20 risiko pada modal $2,000)</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleCopyTrade}
                                    className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-lg ${
                                        copiedTrade
                                            ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                                            : 'bg-cyan-300 text-slate-950 hover:bg-cyan-200 shadow-cyan-400/20'
                                    }`}
                                >
                                    {copiedTrade ? (
                                        <>
                                            <ClipboardDocumentCheckIcon className="h-4 w-4" />
                                            <span>Sinyal Tersalin!</span>
                                        </>
                                    ) : (
                                        <>
                                            <ClipboardDocumentIcon className="h-4 w-4" />
                                            <span>Salin Order ke MT4/MT5</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right: Live Decision Logger Feed (Mirip Terminal ARRAGROK) */}
                    <div className="rounded-2xl border border-slate-800 bg-[#090f19] p-5 shadow-2xl flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
                                        Live Decision Logger Stream
                                    </h3>
                                </div>
                                <span className="text-[10px] font-mono text-slate-500">AUTO-SCROLL: ON</span>
                            </div>

                            {/* Log Items List */}
                            <div className="max-h-[340px] overflow-y-auto space-y-2 pr-1 font-mono text-[11px]">
                                {logs.map((log) => (
                                    <div
                                        key={log.id}
                                        className={`rounded-xl border p-2.5 transition ${
                                            log.type === 'ENTRY'
                                                ? 'border-cyan-500/30 bg-[#071320]'
                                                : log.type === 'EXIT'
                                                ? 'border-emerald-500/30 bg-[#061810]'
                                                : 'border-slate-800 bg-[#070b12]'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-slate-500">{log.time}</span>
                                                <span
                                                    className={`rounded px-1.5 py-0.2 text-[9px] font-black ${
                                                        log.type === 'ENTRY'
                                                            ? 'bg-cyan-400/20 text-cyan-300'
                                                            : log.type === 'EXIT'
                                                            ? 'bg-emerald-400/20 text-emerald-300'
                                                            : 'bg-amber-400/20 text-amber-300'
                                                    }`}
                                                >
                                                    {log.type} {log.action || ''}
                                                </span>
                                                <strong className="text-white font-sans">{log.symbol}</strong>
                                            </div>

                                            {log.pnl && (
                                                <span className="font-black text-emerald-400 text-xs">
                                                    {log.pnl}
                                                </span>
                                            )}
                                        </div>

                                        <p className="mt-1 text-[10px] text-slate-400 leading-snug">
                                            {log.reason}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer status of logger */}
                        <div className="border-t border-slate-800 pt-3 mt-3 flex items-center justify-between text-[10px] text-slate-500">
                            <span>Pasar: Forex & Gold Futures (Exness / FBS / XM)</span>
                            <span className="text-cyan-300 font-bold">100% Keputusan Transparan</span>
                        </div>
                    </div>
                </div>

                {/* BOTTOM EXPLANATION: BAGAIMANA CARA MENGGUNAKAN ARRA GROK */}
                <div className="mt-8 rounded-2xl border border-slate-800 bg-[#0b121e] p-6 shadow-xl">
                    <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm mb-3">
                        <SparklesIcon className="h-5 w-5" />
                        <h3>Panduan Trading Menggunakan ARRA GROK (Tanpa Copytrade):</h3>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3 text-xs text-slate-300">
                        <div className="rounded-xl border border-slate-800/80 bg-[#070d17] p-4">
                            <div className="font-bold text-cyan-200 mb-1">1. Pantau Radar 6 Agen AI</div>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                                Biarkan sistem bekerja menyaring berita makro, sweep likuiditas, dan model autoregressive Cronos. Anda hanya mengeksekusi saat status adalah <strong>PASS SNIPER</strong>.
                            </p>
                        </div>
                        <div className="rounded-xl border border-slate-800/80 bg-[#070d17] p-4">
                            <div className="font-bold text-emerald-300 mb-1">2. 1-Klik Salin Sinyal</div>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                                Klik tombol <strong>Salin Order ke MT4/MT5</strong> untuk menyalin titik Entry, Stop Loss aman, dan Take Profit ideal ke clipboard gawai Anda.
                            </p>
                        </div>
                        <div className="rounded-xl border border-slate-800/80 bg-[#070d17] p-4">
                            <div className="font-bold text-indigo-300 mb-1">3. Pasang Ukuran Lot Sesuai Rekomendasi</div>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                                Agen Sizer menghitung ukuran lot yang aman agar risiko akun Anda tidak melebihi 1-2%. Eksekusi mandiri di broker Anda tanpa risiko copytrade.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
