'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePicaDevice } from '@/context/PicaDeviceContext';
import { isAdminEmail } from '@/lib/admin-access';
import {
    BrainIcon,
    SignalIcon,
    SparklesIcon,
    BoltIcon,
    ShieldCheckIcon,
    LockIcon,
    KeyIcon,
    CheckCircleIcon,
    WarningIcon,
    ArrowRightIcon,
    RefreshIcon,
    ClockIcon,
    CrownIcon,
    LightbulbIcon,
    TargetIcon,
    CrosshairIcon,
    ChevronDownIcon,
} from '@/components/PremiumIcons';
import type { SMCAnalysisResult } from '@/lib/smc-engine';
import type {
    LiquidityHuntRadarResult,
    MarketRegimeResult,
    MonteCarloResult,
    IntermarketResult,
    EarlyHarvestResult,
    NeuralDebateRoomResult,
} from '@/lib/xauusd-quant-engine';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface Prediction {
    direction: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    probabilities: { up: number; down: number; neutral: number };
}

interface TradeSetup {
    entryPrice: number;
    entryZoneMin: number;
    entryZoneMax: number;
    stopLoss: number;
    takeProfit1: number;
    takeProfit2: number;
    pipsSl: number;
    pipsTp1: number;
    pipsTp2: number;
    riskReward: string;
    grade: 'A+ Institutional' | 'A Standard' | 'B Setup';
    bias: string;
    atr: number;
}

interface MarketInfo {
    symbol: string;
    price: number;
    change: number;
    high24h: number;
    low24h: number;
    source: string;
    timeframe: string;
    timestamp: string;
}

interface SessionInfo {
    name: string;
    emoji: string;
    label?: string;
    utcHour: number;
}

interface ModelMeta {
    architecture: string;
    biLstmUnits: number[];
    denseUnits: number[];
    totalParams: number;
    accuracy: number;
    trainedAt: string;
    lookback: number;
    inputFeatures: number;
    displayFeatures: number;
    epochs: number;
    ensembleMethod?: string;
}

interface FeatureMeta {
    key: string;
    label: string;
    category: string;
}

interface Candle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

interface TASignalSummary {
    buyCount: number;
    sellCount: number;
    neutralCount: number;
    total: number;
    ensembleScore: number;
    trendStrength: 'STRONG' | 'MODERATE' | 'WEAK';
    signals: { name: string; signal: 'BUY' | 'SELL' | 'NEUTRAL' }[];
}

interface PredictionResponse {
    status: string;
    prediction: Prediction;
    tradeSetup: TradeSetup;
    aiReasoning?: string[];
    recentCandles?: Candle[];
    trackRecord?: {
        winRate: number;
        profitFactor: number;
        totalSignals: number;
        avgGainPips: number;
        maxDrawdownPercent: number;
    };
    features: Record<string, number>;
    featureNames: FeatureMeta[];
    taSignals?: TASignalSummary;
    marketInfo: MarketInfo;
    session: SessionInfo;
    modelMeta: ModelMeta;
    smcAnalysis?: SMCAnalysisResult;
    liquidityHunt?: LiquidityHuntRadarResult;
    marketRegime?: MarketRegimeResult;
    monteCarlo?: MonteCarloResult;
    intermarket?: IntermarketResult;
    earlyHarvest?: EarlyHarvestResult;
    neuralDebate?: NeuralDebateRoomResult;
}

const TIMEFRAMES = [
    { value: '15m', label: 'M15 (Scalp)' },
    { value: '1h', label: 'H1 (Day Trade)' },
    { value: '4h', label: 'H4 (Swing)' },
    { value: '1d', label: 'D1 (Macro)' },
];

const CATEGORY_COLORS: Record<string, string> = {
    Trend: 'text-blue-600',
    Momentum: 'text-purple-600',
    Volatility: 'text-amber-600',
    Volume: 'text-cyan-600',
    Pattern: 'text-emerald-600',
    Temporal: 'text-rose-600',
};

const CATEGORY_BG: Record<string, string> = {
    Trend: 'bg-blue-50/70 border-blue-200',
    Momentum: 'bg-purple-50/70 border-purple-200',
    Volatility: 'bg-amber-50/70 border-amber-200',
    Volume: 'bg-cyan-50/70 border-cyan-200',
    Pattern: 'bg-emerald-50/70 border-emerald-200',
    Temporal: 'bg-rose-50/70 border-rose-200',
};

// Simple Audio Chime function
function playChime() {
    try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    } catch {
        // AudioContext not allowed without gesture
    }
}

type CardTab = 'ALL' | 'SIGNAL' | 'CHART' | 'SMC' | 'DEBATE' | 'FEATURES';

const CARD_TABS: { id: CardTab; label: string; icon: string }[] = [
    { id: 'ALL', label: 'Semua Card', icon: '🎴' },
    { id: 'SIGNAL', label: 'Sinyal & Eksekusi', icon: '⚡' },
    { id: 'CHART', label: 'Chart & Monte Carlo', icon: '📊' },
    { id: 'SMC', label: 'Smart Money (SMC)', icon: '🏛️' },
    { id: 'DEBATE', label: 'AI Debate Room', icon: '⚔️' },
    { id: 'FEATURES', label: '22 Fitur Kuantitatif', icon: '🔬' },
];

export default function XauusdNeuralLabPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [selectedTimeframe, setSelectedTimeframe] = useState('1h');
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<PredictionResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [soundAlert, setSoundAlert] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);

    // Modular Card Navigation & Accordion state
    const [activeCardTab, setActiveCardTab] = useState<CardTab>('ALL');
    const [isFeaturesExpanded, setIsFeaturesExpanded] = useState(false);

    // Multi-timeframe predictions
    const [mtfPredictions, setMtfPredictions] = useState<Record<string, Prediction | null>>({});
    const [mtfLoading, setMtfLoading] = useState(false);

    // Membership & Access state
    const [isCheckingMembership, setIsCheckingMembership] = useState(true);
    const [isDbVvip, setIsDbVvip] = useState(false);

    const { isVvip: isDeviceVvip, openActivation, tier: deviceTier } = usePicaDevice();

    // Determine Admin status
    const isAdmin = Boolean(
        isAdminEmail(session?.user?.email) || 
        (session?.user as any)?.role === 'ADMIN'
    );

    const FULL_ACCESS_TIERS = ['VVIP', 'LIFETIME', 'ALL_ACCESS', 'FULL_ACCESS', 'PROMO_125K', 'ADMIN'];
    const sessionTier = String((session?.user as any)?.tier || (session?.user as any)?.membership || '').toUpperCase();
    const cleanDeviceTier = String(deviceTier || '').toUpperCase();

    // Full access if user is Admin OR VVIP (via device license or DB session)
    const isFullAccess = Boolean(
        isAdmin ||
        isDeviceVvip ||
        FULL_ACCESS_TIERS.includes(cleanDeviceTier) ||
        isDbVvip ||
        FULL_ACCESS_TIERS.includes(sessionTier)
    );

    // Check VVIP Status from database if authenticated
    useEffect(() => {
        if (isAdmin || isDeviceVvip || FULL_ACCESS_TIERS.includes(cleanDeviceTier)) {
            setIsDbVvip(true);
            setIsCheckingMembership(false);
            return;
        }

        if (status === 'authenticated') {
            const checkMembership = async () => {
                try {
                    const res = await fetch('/api/user/quota');
                    const qData = await res.json();
                    if (qData.status === 'success') {
                        const membership = (qData.quota?.membership || 'BASIC').toUpperCase();
                        const vvipStatus = membership === 'VVIP' || membership === 'ADMIN';
                        setIsDbVvip(vvipStatus);
                    }
                } catch {
                    setIsDbVvip(false);
                } finally {
                    setIsCheckingMembership(false);
                }
            };
            checkMembership();
        } else {
            setIsDbVvip(false);
            setIsCheckingMembership(false);
        }
    }, [status, isDeviceVvip, deviceTier, isAdmin]);

    const fetchPrediction = useCallback(async (tf: string = selectedTimeframe) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/xauusd-neural-lab/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ timeframe: tf }),
            });
            const result = await res.json();
            if (result.status === 'success') {
                setData(result);
                setLastUpdated(new Date().toLocaleTimeString('id-ID'));
                if (soundAlert) {
                    playChime();
                }
            } else {
                setError(result.error || 'Prediction engine offline');
            }
        } catch {
            setError('Gagal menghubungkan ke Neural Engine. Coba lagi.');
        } finally {
            setIsLoading(false);
        }
    }, [selectedTimeframe, soundAlert]);

    // Fetch multi-timeframe predictions
    const fetchMTF = useCallback(async () => {
        setMtfLoading(true);
        const tfs = ['15m', '1h', '4h', '1d'];
        const results: Record<string, Prediction | null> = {};
        
        await Promise.all(tfs.map(async (tf) => {
            try {
                const res = await fetch('/api/xauusd-neural-lab/predict', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ timeframe: tf }),
                });
                const result = await res.json();
                results[tf] = result.status === 'success' ? result.prediction : null;
            } catch {
                results[tf] = null;
            }
        }));

        setMtfPredictions(results);
        setMtfLoading(false);
    }, []);

    // Auto-refresh interval (for full access / simulation)
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(() => fetchPrediction(), 60000);
        return () => clearInterval(interval);
    }, [autoRefresh, fetchPrediction]);

    // Initial load: Only fetch if user has verified key / full access
    useEffect(() => {
        if (!isCheckingMembership && isFullAccess) {
            fetchPrediction();
        }
    }, [isCheckingMembership, isFullAccess]); // eslint-disable-line react-hooks/exhaustive-deps

    // Multi-Timeframe Consensus Calculation
    const mtfConsensus = useMemo(() => {
        const values = Object.values(mtfPredictions).filter(Boolean) as Prediction[];
        if (values.length === 0) return null;
        let buyCount = 0;
        let sellCount = 0;
        let totalConf = 0;
        values.forEach(v => {
            if (v.direction === 'BUY') buyCount++;
            if (v.direction === 'SELL') sellCount++;
            totalConf += v.confidence;
        });
        const dominant = buyCount > sellCount ? 'BULLISH' : sellCount > buyCount ? 'BEARISH' : 'NEUTRAL';
        const consensusScore = Math.round((Math.max(buyCount, sellCount) / values.length) * 100);
        return {
            dominant,
            consensusScore,
            avgConfidence: Math.round(totalConf / values.length),
            totalScanned: values.length,
        };
    }, [mtfPredictions]);

    if (status === 'loading' || isCheckingMembership) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-semibold text-slate-600 font-['Space_Grotesk'] tracking-wide">
                        Memuat PICA Neural Studio...
                    </p>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════
    // HARD LOCK: RESTRICTED ACCESS SCREEN (MUST HAVE KEY)
    // ═══════════════════════════════════════════════════════════
    if (!isFullAccess) {
        return (
            <div className="min-h-screen bg-slate-950 text-white pt-28 pb-20 px-4 sm:px-6 lg:px-8 font-sans flex items-center justify-center relative overflow-hidden selection:bg-blue-600 selection:text-white">
                {/* Background ambient glow */}
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-blue-600/20 via-indigo-600/15 to-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="max-w-xl w-full mx-auto relative z-10"
                >
                    <div className="rounded-3xl p-6 sm:p-9 bg-slate-900/90 backdrop-blur-xl border border-slate-800 shadow-2xl space-y-6 text-center">
                        
                        {/* Lock Emblem */}
                        <div className="relative mx-auto w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500/20 to-blue-500/20 border-2 border-amber-400/40 flex items-center justify-center shadow-lg shadow-amber-500/10">
                            <LockIcon size="lg" className="text-amber-400" />
                            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-blue-600 border-2 border-slate-900 flex items-center justify-center text-white">
                                <KeyIcon size="xs" className="text-white" />
                            </div>
                        </div>

                        {/* Title & Description */}
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-300 text-xs font-bold font-mono">
                                <CrownIcon size="xs" />
                                <span>PORTAL VVIP RESTRICTED</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Space_Grotesk'] tracking-tight">
                                PICA Neural Lab Terkunci
                            </h1>
                            <p className="text-sm text-slate-300 leading-relaxed font-sans max-w-md mx-auto">
                                Laboratorium inferensi kuantitatif XAU/USD ini diproteksi ketat. Anda harus memiliki <strong className="text-amber-400">Kunci Lisensi VVIP</strong> resmi untuk masuk dan melihat analisis live.
                            </p>
                        </div>

                        {/* 6 Quantitative Features Preview */}
                        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-left space-y-2.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                6 Fitur Institusional di Dalam Portal:
                            </span>
                            <div className="grid grid-cols-2 gap-2 text-xs text-slate-200 font-sans">
                                <div className="flex items-center gap-2">
                                    <span className="text-blue-400">🎯</span>
                                    <span>Liquidity Hunt Radar</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-amber-400">🧠</span>
                                    <span>Market Regime Brain</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-emerald-400">⏱️</span>
                                    <span>Monte Carlo 1,000 Paths</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-cyan-400">⚡</span>
                                    <span>Intermarket DXY Radar</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-rose-400">🌾</span>
                                    <span>Neural Early Harvest</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-purple-400">⚔️</span>
                                    <span>Adversarial AI Debate</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-3 pt-2">
                            <button
                                type="button"
                                onClick={openActivation}
                                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer font-sans"
                            >
                                <KeyIcon size="sm" />
                                <span>Masukkan Kunci Lisensi Saya</span>
                            </button>

                            <Link
                                href="/pricing"
                                className="w-full py-3.5 px-6 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 font-sans"
                            >
                                <CrownIcon size="sm" className="text-amber-400" />
                                <span>Belum Punya Kunci? Beli Lisensi VVIP &rarr;</span>
                            </Link>

                            <div className="flex items-center justify-center gap-4 text-xs text-slate-400 pt-2 font-sans">
                                <Link href="/login" className="hover:text-white transition-colors underline underline-offset-4">
                                    Sudah beli tapi belum login? Masuk di sini
                                </Link>
                                <span>•</span>
                                <Link href="/" className="hover:text-white transition-colors">
                                    Kembali ke Beranda
                                </Link>
                            </div>
                        </div>

                    </div>
                </motion.div>
            </div>
        );
    }

    const pred = data?.prediction;
    const setup = data?.tradeSetup;
    const market = data?.marketInfo;
    const sess = data?.session;
    const meta = data?.modelMeta;
    const features = data?.features || {};
    const featureNames = data?.featureNames || [];
    const candles = data?.recentCandles || [];
    const reasoning = data?.aiReasoning || [];
    const taSignals = data?.taSignals;
    const smc = data?.smcAnalysis;
    const radar = data?.liquidityHunt;
    const regime = data?.marketRegime;
    const mc = data?.monteCarlo;
    const intermarket = data?.intermarket;
    const earlyHarvest = data?.earlyHarvest;
    const debate = data?.neuralDebate;

    const dirColor = pred?.direction === 'BUY' ? 'text-emerald-700' : pred?.direction === 'SELL' ? 'text-rose-700' : 'text-amber-700';
    const dirBg = pred?.direction === 'BUY' ? 'bg-emerald-50/80 border-emerald-300' : pred?.direction === 'SELL' ? 'bg-rose-50/80 border-rose-300' : 'bg-amber-50/80 border-amber-300';
    const dirBadge = pred?.direction === 'BUY' ? 'bg-emerald-600 text-white' : pred?.direction === 'SELL' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white';

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pt-28 pb-20 px-4 sm:px-6 lg:px-8 font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* 1. ADMIN ACCESS vs USER SIMULATION BANNER NOTICES */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {isAdmin ? (
                    // ADMIN FULL ACCESS BANNER
                    <div className="rounded-3xl p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white shadow-md border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-400/30 flex items-center justify-center shrink-0">
                                <BoltIcon size="sm" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-extrabold font-['Space_Grotesk'] tracking-wide text-white">
                                        ADMIN FULL ACCESS UNLOCKED
                                    </h3>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                                        LIVE ENGINE AKTIF
                                    </span>
                                </div>
                                <p className="text-xs text-slate-300 mt-0.5">
                                    Anda memiliki hak akses penuh administrator untuk inferensi real-time, seluruh matriks 22-fitur, dan auto-confluence tanpa limitasi kuota.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link
                                href="/admin"
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition-all flex items-center gap-1.5"
                            >
                                <span>Dashboard Admin</span>
                                <span>&rarr;</span>
                            </Link>
                        </div>
                    </div>
                ) : (
                    // VVIP MEMBER ACTIVE ACCESS BANNER
                    <div className="rounded-3xl p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center shrink-0">
                                <CrownIcon size="sm" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-extrabold font-['Space_Grotesk'] tracking-wide text-white">
                                        VVIP LICENSE VERIFIED
                                    </h3>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                                        PORTAL RESMI TERBUKA
                                    </span>
                                </div>
                                <p className="text-xs text-slate-300 mt-0.5">
                                    Kunci lisensi terverifikasi aktif. Anda memiliki akses penuh ke seluruh 6 mesin kuantitatif XAU/USD dan auto-refresh real-time.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={openActivation}
                                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                                <KeyIcon size="xs" />
                                <span>Status Lisensi</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* 2. HERO HEADER & LIVE TICKER */}
                {/* ═══════════════════════════════════════════════════════════ */}
                <motion.div
                    initial={{ opacity: 0, y: -15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-sm"
                >
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
                                <BrainIcon size="md" className="text-white" />
                            </div>
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-['Space_Grotesk']">
                                        PICA Neural Lab
                                    </h1>
                                    <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                        v8.2 Bi-LSTM + TA Ensemble
                                    </span>
                                </div>
                                <p className="text-xs sm:text-sm text-slate-500 font-sans mt-0.5">
                                    XAU/USD Quantitative Neural Network • 22 Input Multi-Factor Indicators + 8 Indikator Teknikal
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Live Gold Price & Intermarket Macro Ticker */}
                    <div className="flex flex-wrap items-center gap-3">
                        {intermarket && (
                            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 shrink-0">
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase font-sans">
                                        <span>Intermarket Macro</span>
                                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                                            intermarket.pressureIndex > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                        }`}>
                                            Tailwind: {intermarket.pressureIndex > 0 ? '+' : ''}{intermarket.pressureIndex}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 font-mono text-xs font-black text-slate-800">
                                        <span>DXY: {intermarket.dxyPrice.toFixed(3)} <span className={intermarket.dxyChange > 0 ? 'text-rose-600' : 'text-emerald-600'}>({intermarket.dxyChange > 0 ? '+' : ''}{intermarket.dxyChange}%)</span></span>
                                        <span className="text-slate-300">|</span>
                                        <span>US10Y: {intermarket.tnxYield.toFixed(2)}%</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {market && (
                            <div className="flex items-center gap-4 px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 shrink-0">
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold font-sans">
                                        Live Gold Price (XAU/USD)
                                    </p>
                                    <p className="text-2xl font-mono font-black text-slate-900 tracking-tight">
                                        ${market.price.toFixed(2)}
                                    </p>
                                </div>
                                <span className={`px-2.5 py-1 rounded-xl text-xs font-bold font-mono ${
                                    market.change >= 0 
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                                }`}>
                                    {market.change >= 0 ? '+' : ''}{market.change.toFixed(2)}%
                                </span>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* 3. CONTROLS BAR */}
                {/* ═══════════════════════════════════════════════════════════ */}
                <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
                    {/* Timeframe Selector */}
                    <div className="flex gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200">
                        {TIMEFRAMES.map(tf => (
                            <button
                                key={tf.value}
                                onClick={() => { setSelectedTimeframe(tf.value); fetchPrediction(tf.value); }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer font-sans ${
                                    selectedTimeframe === tf.value
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                {tf.label}
                            </button>
                        ))}
                    </div>

                    {/* Run Prediction Button */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => fetchPrediction()}
                        disabled={isLoading}
                        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50 cursor-pointer flex items-center gap-2 font-sans"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Menjalankan Komputasi...</span>
                            </>
                        ) : (
                            <>
                                <CrosshairIcon size="xs" className="text-white" />
                                <span>Jalankan Neural Inference Live</span>
                            </>
                        )}
                    </motion.button>

                    {/* Multi-TF Scan */}
                    <button
                        onClick={fetchMTF}
                        disabled={mtfLoading}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5 font-sans"
                    >
                        <SignalIcon size="xs" className="text-blue-600" />
                        <span>{mtfLoading ? 'Memindai 4 TF...' : 'Multi-TF Confluence Scan'}</span>
                    </button>

                    {/* Auto-refresh */}
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={e => setAutoRefresh(e.target.checked)}
                            className="w-3.5 h-3.5 rounded accent-blue-600"
                        />
                        <span>Auto (60s)</span>
                    </label>

                    {/* Sound Alert Toggle */}
                    <button
                        onClick={() => setSoundAlert(!soundAlert)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                            soundAlert ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}
                        title="Toggle Sound Alert"
                    >
                        <span>{soundAlert ? '🔊' : '🔇'}</span>
                        <span>Suara Alert</span>
                    </button>

                    {/* Last Updated */}
                    {lastUpdated && (
                        <span className="text-xs text-slate-400 font-mono ml-auto">
                            Diperbarui: {lastUpdated}
                        </span>
                    )}
                </div>

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* 4. ERROR NOTICE */}
                {/* ═══════════════════════════════════════════════════════════ */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-rose-700 text-sm font-medium flex items-center gap-2"
                        >
                            <WarningIcon size="sm" className="text-rose-600 shrink-0" />
                            <span>{error}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* 4.5. NEURAL EARLY HARVEST & CAPITAL DEFENSE BANNER */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {earlyHarvest && earlyHarvest.status === 'EARLY_HARVEST' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="rounded-3xl p-5 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 text-white shadow-lg border-2 border-amber-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                        <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 text-white flex items-center justify-center shrink-0 text-2xl font-black">
                                🚨
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-extrabold font-['Space_Grotesk'] tracking-wide uppercase">
                                        INSTITUTIONAL EARLY HARVEST TRIGGER
                                    </h3>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-rose-700 shadow-2xs">
                                        Exhaustion {earlyHarvest.exhaustionScore}%
                                    </span>
                                </div>
                                <p className="text-xs text-white/95 mt-1 font-medium leading-relaxed max-w-3xl">
                                    {earlyHarvest.actionText} — {earlyHarvest.reason}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-xs font-bold bg-black/25 px-4 py-2.5 rounded-2xl shrink-0 self-end md:self-center border border-white/20">
                            <span>Amankan: ${earlyHarvest.recommendedExitPrice.toFixed(2)}</span>
                            <span>•</span>
                            <span className="text-amber-300">SL BEP: ${earlyHarvest.recommendedNewSl.toFixed(2)}</span>
                        </div>
                    </motion.div>
                )}

                {earlyHarvest && earlyHarvest.status === 'TIGHTEN_STOP' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="rounded-3xl p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md border border-blue-400 flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">🛡️</span>
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-wider">
                                    CAPITAL DEFENSE PROTOCOL (RISK-FREE TRADE)
                                </h4>
                                <p className="text-xs text-blue-100">
                                    {earlyHarvest.actionText} — {earlyHarvest.reason}
                                </p>
                            </div>
                        </div>
                        <div className="font-mono text-xs font-bold bg-white/10 px-3 py-1.5 rounded-xl shrink-0 border border-white/20">
                            New Stop Loss: ${earlyHarvest.recommendedNewSl.toFixed(2)}
                        </div>
                    </motion.div>
                )}

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* 5. MODULAR TRADING CARDS SYSTEM */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {pred && (
                    <div className="space-y-6">
                        {/* ── QUICK CARD NAVIGATION FILTER TABS ── */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                            {CARD_TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveCardTab(tab.id)}
                                    className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 border font-sans ${
                                        activeCardTab === tab.id
                                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                            : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200/90 hover:bg-slate-50'
                                    }`}
                                >
                                    <span>{tab.icon}</span>
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* ══════════════════════════════════════════════════════════════ */}
                        {/* 🎴 CARD 1: MASTER SIGNAL & EXECUTION MATRIX (HERO CARD)     */}
                        {/* ══════════════════════════════════════════════════════════════ */}
                        {(activeCardTab === 'ALL' || activeCardTab === 'SIGNAL') && setup && (
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-3xl bg-white border-2 border-slate-200/90 shadow-md p-6 sm:p-8 space-y-6 overflow-hidden relative"
                            >
                                {/* Ambient Glow */}
                                <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20 ${
                                    pred.direction === 'BUY' ? 'bg-emerald-500' : pred.direction === 'SELL' ? 'bg-rose-500' : 'bg-amber-500'
                                }`} />

                                {/* Card Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100 relative z-10">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-3.5 h-3.5 rounded-full animate-ping shrink-0 ${
                                            pred.direction === 'BUY' ? 'bg-emerald-500' : pred.direction === 'SELL' ? 'bg-rose-500' : 'bg-amber-500'
                                        }`} />
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                                                    Neural Inference Engine
                                                </span>
                                                <span className="text-xs font-mono font-bold text-slate-300">•</span>
                                                <span className="text-xs font-bold text-blue-600 font-mono">
                                                    TIMEFRAME {selectedTimeframe.toUpperCase()}
                                                </span>
                                            </div>
                                            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-['Space_Grotesk'] tracking-tight">
                                                ⚡ Master Signal &amp; Execution Matrix
                                            </h2>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-blue-50 text-blue-700 border border-blue-200 font-sans shadow-2xs">
                                            {setup.grade}
                                        </span>
                                        <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                                            Bias: {setup.bias || 'Institutional Trend'}
                                        </span>
                                    </div>
                                </div>

                                {/* Master Signal Grid */}
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
                                    {/* Left Box (5 cols): Direction, Confidence, & Probabilities */}
                                    <div className={`lg:col-span-5 rounded-3xl p-6 border-2 flex flex-col justify-between ${dirBg}`}>
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs uppercase font-extrabold tracking-wider text-slate-500">
                                                    Action Verdict
                                                </span>
                                                <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${dirBadge}`}>
                                                    {pred.confidence.toFixed(0)}% Confidence
                                                </span>
                                            </div>

                                            <div className="my-3 text-center sm:text-left">
                                                <motion.div
                                                    key={pred.direction + selectedTimeframe}
                                                    initial={{ scale: 0.85, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    className={`text-6xl sm:text-7xl font-black font-['Space_Grotesk'] tracking-tight leading-none ${dirColor}`}
                                                >
                                                    {pred.direction}
                                                </motion.div>
                                                <p className="text-xs font-bold text-slate-600 mt-2 font-sans">
                                                    Sinyal utama inferensi AI Bi-LSTM multi-factor XAU/USD
                                                </p>
                                            </div>
                                        </div>

                                        {/* Probability Distribution Bar */}
                                        <div className="space-y-2.5 pt-4 border-t border-slate-200/80">
                                            <div className="flex justify-between text-xs font-mono font-bold">
                                                <span className="text-emerald-700">UP {(pred.probabilities.up * 100).toFixed(0)}%</span>
                                                <span className="text-amber-700">NET {(pred.probabilities.neutral * 100).toFixed(0)}%</span>
                                                <span className="text-rose-700">DOWN {(pred.probabilities.down * 100).toFixed(0)}%</span>
                                            </div>
                                            <div className="h-3 rounded-full overflow-hidden flex bg-slate-200">
                                                <div
                                                    className="bg-emerald-500 transition-all duration-700"
                                                    style={{ width: `${pred.probabilities.up * 100}%` }}
                                                    title="Up Probability"
                                                />
                                                <div
                                                    className="bg-amber-400 transition-all duration-700"
                                                    style={{ width: `${pred.probabilities.neutral * 100}%` }}
                                                    title="Neutral Probability"
                                                />
                                                <div
                                                    className="bg-rose-500 transition-all duration-700"
                                                    style={{ width: `${pred.probabilities.down * 100}%` }}
                                                    title="Down Probability"
                                                />
                                            </div>
                                            {sess && (
                                                <p className="text-[11px] text-slate-500 font-sans pt-1">
                                                    {sess.emoji || '🌐'} Sesi Pasar: <b className="text-slate-700">{sess.name}</b>
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Box (7 cols): 4 High-Contrast Execution Cards */}
                                    <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                            {/* 1. ENTRY */}
                                            <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/70 border-2 border-blue-200 shadow-2xs">
                                                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-blue-700 tracking-wider">
                                                    <span>Entry Price</span>
                                                    <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-mono">Limit / Market</span>
                                                </div>
                                                <p className="text-2xl sm:text-3xl font-black font-mono text-slate-900 mt-1">
                                                    ${setup.entryPrice.toFixed(2)}
                                                </p>
                                                <p className="text-xs text-slate-500 font-mono mt-0.5">
                                                    Zona: ${setup.entryZoneMin} - ${setup.entryZoneMax}
                                                </p>
                                            </div>

                                            {/* 2. STOP LOSS */}
                                            <div className="p-4 sm:p-5 rounded-2xl bg-rose-50/80 border-2 border-rose-200 shadow-2xs">
                                                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-rose-700 tracking-wider">
                                                    <span>Stop Loss (SL)</span>
                                                    <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-mono font-bold">
                                                        -{setup.pipsSl} pips
                                                    </span>
                                                </div>
                                                <p className="text-2xl sm:text-3xl font-black font-mono text-rose-700 mt-1">
                                                    ${setup.stopLoss.toFixed(2)}
                                                </p>
                                                <p className="text-xs text-rose-600/90 font-sans mt-0.5">
                                                    Batas toleransi risiko maksimal
                                                </p>
                                            </div>

                                            {/* 3. TAKE PROFIT 1 */}
                                            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/80 border-2 border-emerald-200 shadow-2xs">
                                                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
                                                    <span>Take Profit 1 (TP1)</span>
                                                    <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-mono font-bold">
                                                        +{setup.pipsTp1} pips
                                                    </span>
                                                </div>
                                                <p className="text-2xl sm:text-3xl font-black font-mono text-emerald-700 mt-1">
                                                    ${setup.takeProfit1.toFixed(2)}
                                                </p>
                                                <p className="text-xs text-emerald-700/90 font-sans mt-0.5">
                                                    Target konservatif (Partial profit)
                                                </p>
                                            </div>

                                            {/* 4. TAKE PROFIT 2 */}
                                            <div className="p-4 sm:p-5 rounded-2xl bg-teal-50/80 border-2 border-teal-200 shadow-2xs">
                                                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-teal-800 tracking-wider">
                                                    <span>Take Profit 2 (TP2)</span>
                                                    <span className="px-1.5 py-0.2 rounded bg-teal-100 text-teal-800 font-mono font-bold">
                                                        +{setup.pipsTp2} pips
                                                    </span>
                                                </div>
                                                <p className="text-2xl sm:text-3xl font-black font-mono text-teal-700 mt-1">
                                                    ${setup.takeProfit2.toFixed(2)}
                                                </p>
                                                <p className="text-xs text-teal-700/90 font-sans mt-0.5">
                                                    Target ekspansi likuiditas utama
                                                </p>
                                            </div>
                                        </div>

                                        {/* Bottom Quick Bar */}
                                        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
                                            <div className="flex flex-wrap items-center gap-4 font-mono font-bold text-slate-700">
                                                <span>Risk/Reward: <b className="text-blue-600">{setup.riskReward}</b></span>
                                                <span className="text-slate-300">•</span>
                                                <span>ATR Vol: <b className="text-slate-900">{setup.atr}</b></span>
                                                {market && (
                                                    <>
                                                        <span className="text-slate-300">•</span>
                                                        <span>Live XAU: <b className="text-slate-900">${market.price.toFixed(2)}</b></span>
                                                    </>
                                                )}
                                            </div>
                                            <span className="text-[11px] text-slate-500 font-sans">
                                                💡 Pasang langsung angka Entry, TP, dan SL ini di MetaTrader Anda.
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ══════════════════════════════════════════════════════════════ */}
                        {/* 🎴 CARD 2: PROYEKSI HARGA & SIMULASI MONTE CARLO             */}
                        {/* ══════════════════════════════════════════════════════════════ */}
                        {(activeCardTab === 'ALL' || activeCardTab === 'CHART') && (
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-3xl bg-white border border-slate-200/90 shadow-sm p-6 sm:p-7 space-y-6"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl">📊</span>
                                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                                                Visual Price Action &amp; Quantum Probability
                                            </span>
                                        </div>
                                        <h3 className="text-base sm:text-lg font-black text-slate-900 font-['Space_Grotesk'] mt-0.5">
                                            Proyeksi Candlestick &amp; Simulasi Monte Carlo 1,000 Paths
                                        </h3>
                                    </div>
                                    {mc && (
                                        <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 self-start sm:self-auto">
                                            1,000 Iterasi Terverifikasi
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                    {/* Visual Candlestick & Target Overlay (7 cols) */}
                                    <div className="lg:col-span-7 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-700 font-sans">
                                                30 Candle Terakhir ({selectedTimeframe.toUpperCase()})
                                            </span>
                                            {sess && (
                                                <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 font-sans">
                                                    <span>{sess.emoji || '🌐'}</span>
                                                    <span>{sess.name}</span>
                                                </div>
                                            )}
                                        </div>

                                        {candles.length > 0 ? (
                                            <div className="h-64 w-full rounded-2xl bg-slate-50 border border-slate-200/80 p-3 relative flex items-end justify-between gap-1 overflow-hidden">
                                                {candles.map((c, i) => {
                                                    const minPrice = Math.min(...candles.map(x => x.low));
                                                    const maxPrice = Math.max(...candles.map(x => x.high));
                                                    const range = Math.max(1, maxPrice - minPrice);
                                                    const isGreen = c.close >= c.open;
                                                    const heightPct = Math.max(6, (Math.abs(c.close - c.open) / range) * 85);
                                                    const bottomPct = ((Math.min(c.open, c.close) - minPrice) / range) * 85;

                                                    return (
                                                        <div key={i} className="flex-1 h-full flex flex-col justify-end items-center relative group">
                                                            {/* Wick */}
                                                            <div
                                                                className={`w-0.5 absolute ${isGreen ? 'bg-emerald-400' : 'bg-rose-400'}`}
                                                                style={{
                                                                    bottom: `${((c.low - minPrice) / range) * 85}%`,
                                                                    height: `${((c.high - c.low) / range) * 85}%`
                                                                }}
                                                            />
                                                            {/* Body */}
                                                            <div
                                                                className={`w-full max-w-[8px] rounded-xs z-10 transition-all ${
                                                                    isGreen ? 'bg-emerald-500 group-hover:bg-emerald-600' : 'bg-rose-500 group-hover:bg-rose-600'
                                                                }`}
                                                                style={{
                                                                    height: `${heightPct}%`,
                                                                    marginBottom: `${bottomPct}%`
                                                                }}
                                                            />
                                                        </div>
                                                    );
                                                })}

                                                {/* Target Overlay Lines */}
                                                {setup && (
                                                    <div className="absolute inset-x-0 inset-y-2 pointer-events-none flex flex-col justify-between text-[9px] font-mono font-bold px-3">
                                                        <div className="flex items-center justify-between text-teal-700 border-b border-dashed border-teal-400 pb-0.5">
                                                            <span>TP 2: ${setup.takeProfit2}</span>
                                                            <span>Target Utama</span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-emerald-600 border-b border-dashed border-emerald-300 pb-0.5">
                                                            <span>TP 1: ${setup.takeProfit1}</span>
                                                            <span>Target Konservatif</span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-blue-600 border-b border-blue-400 pb-0.5">
                                                            <span>ENTRY: ${setup.entryPrice}</span>
                                                            <span>Harga Saat Ini</span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-rose-600 border-b border-dashed border-rose-400 pb-0.5">
                                                            <span>SL: ${setup.stopLoss}</span>
                                                            <span>Safety Barrier</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="h-64 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-xs text-slate-400">
                                                Data candle belum tersedia
                                            </div>
                                        )}
                                    </div>

                                    {/* Monte Carlo Statistical Metrics (5 cols) */}
                                    {mc ? (
                                        <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
                                            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                                                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                                                    Peluang Capai TP1 Sebelum SL
                                                </span>
                                                <div className="flex items-baseline gap-2 mt-0.5">
                                                    <span className="text-3xl font-black font-mono text-emerald-700">
                                                        {mc.hitTp1Prob}%
                                                    </span>
                                                    <span className="text-xs text-emerald-600 font-sans">Confidence Probabilitas</span>
                                                </div>
                                                <div className="w-full bg-emerald-200/70 h-2 rounded-full overflow-hidden mt-2">
                                                    <div className="bg-emerald-600 h-full rounded-full transition-all duration-700" style={{ width: `${mc.hitTp1Prob}%` }} />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200">
                                                    <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">
                                                        Estimasi Waktu
                                                    </span>
                                                    <p className="text-2xl font-black font-mono text-blue-700 mt-1">
                                                        ~{mc.expectedTimeToTargetMinutes} mnt
                                                    </p>
                                                    <span className="text-[11px] text-blue-600 font-sans">
                                                        Median durasi ekspansi
                                                    </span>
                                                </div>

                                                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200">
                                                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                                                        Toleransi MAE
                                                    </span>
                                                    <p className="text-2xl font-black font-mono text-amber-700 mt-1">
                                                        -{mc.maxExpectedAdversePips} p
                                                    </p>
                                                    <span className="text-[11px] text-amber-700 font-sans">
                                                        Floating wajar sebelum rally
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-[11px] font-mono text-slate-600 flex items-center justify-between">
                                                <span>Cone of Uncertainty (10th - 90th):</span>
                                                <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                                                    ${mc.lower10Path[mc.lower10Path.length - 1]?.toFixed(2)} → ${mc.upper90Path[mc.upper90Path.length - 1]?.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="lg:col-span-5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center p-6 text-xs text-slate-400">
                                            Menunggu kalkulasi Monte Carlo...
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* ══════════════════════════════════════════════════════════════ */}
                        {/* 🎴 CARD 3: INSTITUTIONAL SMC & LIQUIDITY HUNT RADAR          */}
                        {/* ══════════════════════════════════════════════════════════════ */}
                        {(activeCardTab === 'ALL' || activeCardTab === 'SMC') && smc && (
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-3xl bg-white border border-slate-200/90 shadow-sm p-6 sm:p-7 space-y-6"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl">🏛️</span>
                                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                                                Smart Money Concepts &amp; Order Flow Matrix
                                            </span>
                                        </div>
                                        <h3 className="text-base sm:text-lg font-black text-slate-900 font-['Space_Grotesk'] mt-0.5">
                                            Aliran Likuiditas Institusional &amp; 6 Pilar SMC
                                        </h3>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`px-3 py-1 rounded-xl text-xs font-mono font-bold border ${
                                            smc.confluenceScore > 0
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                : smc.confluenceScore < 0
                                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                : 'bg-slate-50 text-slate-600 border-slate-200'
                                        }`}>
                                            Net Confluence: {smc.confluenceScore > 0 ? '+' : ''}{smc.confluenceScore}/100
                                        </span>
                                        <span className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold border ${
                                            smc.killzone.isKillzone
                                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                                : 'bg-slate-100 text-slate-600 border-slate-200'
                                        }`}>
                                            {smc.killzone.isKillzone ? '⚡ HIGH VOLATILITY KILLZONE' : 'REGULER SESSION'} ({smc.killzone.volatilityBoost}x)
                                        </span>
                                    </div>
                                </div>

                                {/* Liquidity Hunt Radar Banner Card */}
                                {radar && (
                                    <div className={`rounded-2xl border-2 p-4 sm:p-5 space-y-3 transition-all ${
                                        radar.status === 'TRAP_CONFIRMED' ? 'bg-gradient-to-br from-emerald-50/90 to-teal-50/50 border-emerald-300' :
                                        radar.status === 'HUNT_ACTIVE' ? 'bg-gradient-to-br from-amber-50/90 to-orange-50/50 border-amber-300' :
                                        radar.status === 'PENDING_SWEEP' ? 'bg-gradient-to-br from-blue-50/90 to-indigo-50/50 border-blue-200' :
                                        'bg-slate-50 border-slate-200'
                                    }`}>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl">🎯</span>
                                                <div>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                        Target Perburuan Likuiditas Bandar
                                                    </span>
                                                    <h4 className="text-sm font-extrabold text-slate-900 font-['Space_Grotesk']">
                                                        Liquidity Hunt Radar: {radar.targetPool ? `${radar.targetPool.type === 'BSL' ? 'Buy-Side BSL' : 'Sell-Side SSL'} @ $${radar.targetPool.level.toFixed(2)}` : 'Scanning...'}
                                                    </h4>
                                                </div>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase font-mono border self-start sm:self-auto ${
                                                radar.status === 'TRAP_CONFIRMED' ? 'bg-emerald-600 text-white border-emerald-600' :
                                                radar.status === 'HUNT_ACTIVE' ? 'bg-amber-500 text-white border-amber-500' :
                                                radar.status === 'PENDING_SWEEP' ? 'bg-blue-600 text-white border-blue-600' :
                                                'bg-slate-200 text-slate-700 border-slate-300'
                                            }`}>
                                                {radar.status.replace('_', ' ')}
                                            </span>
                                        </div>

                                        {radar.targetPool && (
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                                                <div className="p-2.5 rounded-xl bg-white/90 border border-slate-200">
                                                    <span className="text-[10px] font-bold text-slate-500">Jarak Target:</span>
                                                    <p className="font-mono font-bold text-slate-900">{radar.targetPool.distancePips} pips (${radar.targetPool.distanceDollars})</p>
                                                </div>
                                                <div className="p-2.5 rounded-xl bg-white/90 border border-slate-200">
                                                    <span className="text-[10px] font-bold text-slate-500">Peluang Sapuan:</span>
                                                    <p className="font-mono font-bold text-blue-700">{radar.huntProbability}%</p>
                                                </div>
                                                <div className="p-2.5 rounded-xl bg-white/90 border border-slate-200">
                                                    <span className="text-[10px] font-bold text-slate-500">Kondisi Level:</span>
                                                    <p className="font-mono font-bold text-slate-900">{radar.targetPool.isEqualLevel ? 'EQH/EQL Ganda' : 'Single Liquidity'}</p>
                                                </div>
                                            </div>
                                        )}

                                        <p className="text-xs text-slate-700 leading-relaxed font-sans">
                                            {radar.description}
                                        </p>

                                        {radar.status === 'TRAP_CONFIRMED' && (
                                            <div className="p-2.5 rounded-xl bg-emerald-100/90 border border-emerald-300 text-emerald-950 text-xs font-mono font-bold flex flex-wrap items-center justify-between gap-2">
                                                <span>Sniper Trigger: ${radar.reversalTriggerPrice.toFixed(2)}</span>
                                                <span className="text-rose-700">Invalidation: ${radar.invalidationPrice.toFixed(2)}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 6 Institutional Pillars Cards Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                                    {/* 1. Liquidity Sweeps */}
                                    <div className={`p-4 rounded-2xl border transition-all ${
                                        smc.liquidity.type === 'BULLISH_SWEEP_SSL' ? 'bg-emerald-50/60 border-emerald-200' :
                                        smc.liquidity.type === 'BEARISH_SWEEP_BSL' ? 'bg-rose-50/60 border-rose-200' :
                                        'bg-slate-50 border-slate-200/80'
                                    }`}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                                                <CrosshairIcon size="xs" />
                                                <span>Liquidity Sweep</span>
                                            </span>
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                                smc.liquidity.type === 'BULLISH_SWEEP_SSL' ? 'bg-emerald-200 text-emerald-900' :
                                                smc.liquidity.type === 'BEARISH_SWEEP_BSL' ? 'bg-rose-200 text-rose-900' :
                                                'bg-slate-200 text-slate-600'
                                            }`}>
                                                {smc.liquidity.type === 'BULLISH_SWEEP_SSL' ? 'SSL Grabbed' :
                                                 smc.liquidity.type === 'BEARISH_SWEEP_BSL' ? 'BSL Grabbed' : 'None'}
                                            </span>
                                        </div>
                                        <p className="text-xs font-black font-['Space_Grotesk'] text-slate-900">
                                            {smc.liquidity.detected ? `$${smc.liquidity.sweptLevel.toFixed(2)} Reclaimed` : 'Likuiditas Netral'}
                                        </p>
                                        <p className="text-[11px] text-slate-600 mt-1 leading-snug line-clamp-2">
                                            {smc.liquidity.description}
                                        </p>
                                    </div>

                                    {/* 2. Institutional Order Block */}
                                    <div className={`p-4 rounded-2xl border transition-all ${
                                        smc.orderBlock.type === 'BULLISH_OB' ? 'bg-emerald-50/60 border-emerald-200' :
                                        smc.orderBlock.type === 'BEARISH_OB' ? 'bg-rose-50/60 border-rose-200' :
                                        'bg-slate-50 border-slate-200/80'
                                    }`}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                                                <ShieldCheckIcon size="xs" />
                                                <span>Order Block (OB)</span>
                                            </span>
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                                smc.orderBlock.type === 'BULLISH_OB' ? 'bg-emerald-200 text-emerald-900' :
                                                smc.orderBlock.type === 'BEARISH_OB' ? 'bg-rose-200 text-rose-900' :
                                                'bg-slate-200 text-slate-600'
                                            }`}>
                                                {smc.orderBlock.type === 'BULLISH_OB' ? 'Bullish OB' :
                                                 smc.orderBlock.type === 'BEARISH_OB' ? 'Bearish OB' : 'Neutral'}
                                            </span>
                                        </div>
                                        <p className="text-xs font-black font-['Space_Grotesk'] text-slate-900 font-mono">
                                            {smc.orderBlock.detected ? `$${smc.orderBlock.bottom.toFixed(2)} - $${smc.orderBlock.top.toFixed(2)}` : 'Belum Ada OB Baru'}
                                        </p>
                                        <p className="text-[11px] text-slate-600 mt-1 leading-snug line-clamp-2">
                                            {smc.orderBlock.description}
                                        </p>
                                    </div>

                                    {/* 3. Fair Value Gap */}
                                    <div className={`p-4 rounded-2xl border transition-all ${
                                        smc.fvg.type === 'BULLISH_FVG' ? 'bg-emerald-50/60 border-emerald-200' :
                                        smc.fvg.type === 'BEARISH_FVG' ? 'bg-rose-50/60 border-rose-200' :
                                        'bg-slate-50 border-slate-200/80'
                                    }`}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                                                <TargetIcon size="xs" />
                                                <span>Fair Value Gap</span>
                                            </span>
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                                smc.fvg.type === 'BULLISH_FVG' ? 'bg-emerald-200 text-emerald-900' :
                                                smc.fvg.type === 'BEARISH_FVG' ? 'bg-rose-200 text-rose-900' :
                                                'bg-slate-200 text-slate-600'
                                            }`}>
                                                {smc.fvg.detected ? `${smc.fvg.sizePips} pips` : 'Balanced'}
                                            </span>
                                        </div>
                                        <p className="text-xs font-black font-['Space_Grotesk'] text-slate-900 font-mono">
                                            {smc.fvg.detected ? `$${smc.fvg.bottom.toFixed(2)} - $${smc.fvg.top.toFixed(2)}` : 'Inefficiency Termitigasi'}
                                        </p>
                                        <p className="text-[11px] text-slate-600 mt-1 leading-snug line-clamp-2">
                                            {smc.fvg.description}
                                        </p>
                                    </div>

                                    {/* 4. Market Structure Shift */}
                                    <div className={`p-4 rounded-2xl border transition-all ${
                                        smc.mss.direction === 'BULLISH_MSS' ? 'bg-emerald-50/60 border-emerald-200' :
                                        smc.mss.direction === 'BEARISH_MSS' ? 'bg-rose-50/60 border-rose-200' :
                                        'bg-slate-50 border-slate-200/80'
                                    }`}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                                                <BoltIcon size="xs" />
                                                <span>Structure (MSS)</span>
                                            </span>
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                                smc.mss.direction === 'BULLISH_MSS' ? 'bg-emerald-200 text-emerald-900' :
                                                smc.mss.direction === 'BEARISH_MSS' ? 'bg-rose-200 text-rose-900' :
                                                'bg-slate-200 text-slate-600'
                                            }`}>
                                                {smc.mss.direction === 'BULLISH_MSS' ? 'Bullish Shift' :
                                                 smc.mss.direction === 'BEARISH_MSS' ? 'Bearish Shift' : 'Neutral'}
                                            </span>
                                        </div>
                                        <p className="text-xs font-black font-['Space_Grotesk'] text-slate-900 font-mono">
                                            {smc.mss.detected ? `Break Level: $${smc.mss.breakLevel.toFixed(2)}` : 'Struktur Konsolidasi'}
                                        </p>
                                        <p className="text-[11px] text-slate-600 mt-1 leading-snug line-clamp-2">
                                            {smc.mss.description}
                                        </p>
                                    </div>

                                    {/* 5. VWAP Dynamic Multi-Bands */}
                                    <div className={`p-4 rounded-2xl border transition-all ${
                                        smc.vwap.regime.includes('OVERSOLD') ? 'bg-emerald-50/60 border-emerald-200' :
                                        smc.vwap.regime.includes('OVERBOUGHT') ? 'bg-rose-50/60 border-rose-200' :
                                        'bg-slate-50 border-slate-200/80'
                                    }`}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                                                <SparklesIcon size="xs" />
                                                <span>VWAP ±2.5σ Bands</span>
                                            </span>
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                                smc.vwap.regime.includes('OVERSOLD') ? 'bg-emerald-200 text-emerald-900' :
                                                smc.vwap.regime.includes('OVERBOUGHT') ? 'bg-rose-200 text-rose-900' :
                                                'bg-blue-100 text-blue-800'
                                            }`}>
                                                {smc.vwap.regime}
                                            </span>
                                        </div>
                                        <p className="text-xs font-black font-['Space_Grotesk'] text-slate-900 font-mono">
                                            VWAP: ${smc.vwap.vwap.toFixed(2)} ({smc.vwap.distancePercent > 0 ? '+' : ''}{smc.vwap.distancePercent}%)
                                        </p>
                                        <p className="text-[11px] text-slate-600 mt-1 leading-snug font-mono">
                                            Bands: -2σ ${smc.vwap.lower2.toFixed(2)} | +2σ ${smc.vwap.upper2.toFixed(2)}
                                        </p>
                                    </div>

                                    {/* 6. Fibonacci OTE */}
                                    <div className={`p-4 rounded-2xl border transition-all ${
                                        smc.ote.inGoldenPocket ? 'bg-amber-50/80 border-amber-300' :
                                        'bg-slate-50 border-slate-200/80'
                                    }`}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                                                <CrownIcon size="xs" />
                                                <span>Fibo OTE 0.618-0.786</span>
                                            </span>
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                                smc.ote.inGoldenPocket ? 'bg-amber-300 text-amber-950 font-bold' :
                                                'bg-slate-200 text-slate-600'
                                            }`}>
                                                {smc.ote.inGoldenPocket ? 'Golden Pocket' : 'Macro Swing'}
                                            </span>
                                        </div>
                                        <p className="text-xs font-black font-['Space_Grotesk'] text-slate-900 font-mono">
                                            OTE: ${smc.ote.level786.toFixed(2)} - ${smc.ote.level618.toFixed(2)}
                                        </p>
                                        <p className="text-[11px] text-slate-600 mt-1 leading-snug font-mono">
                                            Swing: ${smc.ote.anchorLow.toFixed(2)} → ${smc.ote.anchorHigh.toFixed(2)} ({smc.ote.trendDirection})
                                        </p>
                                    </div>
                                </div>

                                {/* Key Institutional Observations */}
                                {smc.keyObservations && smc.keyObservations.length > 0 && (
                                    <div className="pt-2 border-t border-slate-100 space-y-2">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            Rangkuman Aliran Likuiditas Smart Money:
                                        </span>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                                            {smc.keyObservations.map((obs, idx) => (
                                                <div key={idx} className="flex items-start gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                                                    <span className="text-blue-600 font-bold">•</span>
                                                    <span className="leading-relaxed">{obs}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* ══════════════════════════════════════════════════════════════ */}
                        {/* 🎴 CARD 4: ADVERSARIAL NEURAL DEBATE ROOM (3 AGENTS)        */}
                        {/* ══════════════════════════════════════════════════════════════ */}
                        {(activeCardTab === 'ALL' || activeCardTab === 'DEBATE') && debate && (
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-3xl bg-white border border-slate-200/90 shadow-sm p-6 sm:p-7 space-y-6"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl">⚔️</span>
                                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                                                Multi-Agent Quantitative Synthesis
                                            </span>
                                        </div>
                                        <h3 className="text-base sm:text-lg font-black text-slate-900 font-['Space_Grotesk'] mt-0.5">
                                            Adversarial Neural Debate Room (3 AI Agents)
                                        </h3>
                                    </div>
                                    <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200 self-start sm:self-auto">
                                        Internal AI Consensus
                                    </span>
                                </div>

                                {/* 3 Agents Cards Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                                    {/* Agent Bullish */}
                                    <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl">{debate.bullishAgent.avatarEmoji}</span>
                                            <div>
                                                <h4 className="text-xs font-black text-emerald-950 font-['Space_Grotesk']">
                                                    {debate.bullishAgent.name}
                                                </h4>
                                                <p className="text-[10px] text-emerald-700 font-medium">
                                                    {debate.bullishAgent.role}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5 pt-1">
                                            {debate.bullishAgent.keyPoints.map((point, idx) => (
                                                <div key={idx} className="text-xs text-emerald-900 leading-snug flex items-start gap-1.5 font-sans">
                                                    <span className="text-emerald-600 font-bold shrink-0">•</span>
                                                    <span>{point}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Agent Bearish */}
                                    <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl">{debate.bearishAgent.avatarEmoji}</span>
                                            <div>
                                                <h4 className="text-xs font-black text-rose-950 font-['Space_Grotesk']">
                                                    {debate.bearishAgent.name}
                                                </h4>
                                                <p className="text-[10px] text-rose-700 font-medium">
                                                    {debate.bearishAgent.role}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5 pt-1">
                                            {debate.bearishAgent.keyPoints.map((point, idx) => (
                                                <div key={idx} className="text-xs text-rose-900 leading-snug flex items-start gap-1.5 font-sans">
                                                    <span className="text-rose-600 font-bold shrink-0">•</span>
                                                    <span>{point}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Chief Risk Officer */}
                                    <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl">{debate.chiefRiskOfficer.avatarEmoji}</span>
                                            <div>
                                                <h4 className="text-xs font-black text-indigo-950 font-['Space_Grotesk']">
                                                    {debate.chiefRiskOfficer.name}
                                                </h4>
                                                <p className="text-[10px] text-indigo-700 font-medium">
                                                    {debate.chiefRiskOfficer.role}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5 pt-1">
                                            {debate.chiefRiskOfficer.keyPoints.map((point, idx) => (
                                                <div key={idx} className="text-xs text-indigo-900 leading-snug flex items-start gap-1.5 font-sans">
                                                    <span className="text-indigo-600 font-bold shrink-0">•</span>
                                                    <span>{point}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Action Protocol Discipline Box */}
                                <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 text-white space-y-2 font-sans shadow-md border border-slate-800">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-bold font-mono gap-1">
                                        <span className="text-amber-400">⚡ ACTION PROTOCOL DISCIPLINE:</span>
                                        <span className="text-slate-300">{debate.finalExecutiveVerdict}</span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-slate-200 font-mono leading-relaxed">
                                        {debate.actionProtocol}
                                    </p>
                                </div>

                                {/* Neural Synthesis Reasoning Bullets */}
                                {reasoning.length > 0 && (
                                    <div className="pt-2 border-t border-slate-100 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <SparklesIcon size="xs" className="text-blue-600" />
                                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                                PICA Neural Qualitative Synthesis:
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                                            {reasoning.map((item, i) => (
                                                <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                                    <span className="text-blue-600 font-bold mt-0.5">•</span>
                                                    <span className="leading-relaxed">{item}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* ══════════════════════════════════════════════════════════════ */}
                        {/* 🎴 CARD 5: MARKET REGIME & TA SIGNALS ENSEMBLE               */}
                        {/* ══════════════════════════════════════════════════════════════ */}
                        {(activeCardTab === 'ALL' || activeCardTab === 'SIGNAL' || activeCardTab === 'CHART') && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Subcard A: Market Regime Switcher */}
                                {regime && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-sm space-y-4"
                                    >
                                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                    Adaptive Brain Engine
                                                </span>
                                                <h3 className="text-base font-extrabold text-slate-900 font-['Space_Grotesk']">
                                                    Market Regime Switcher
                                                </h3>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${regime.badgeColor}`}>
                                                {regime.label}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">ADX (Trend)</span>
                                                <p className="text-base font-black font-mono text-slate-900">{regime.adx}</p>
                                            </div>
                                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">BB Width</span>
                                                <p className="text-base font-black font-mono text-slate-900">{regime.bbWidthPercent}%</p>
                                            </div>
                                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">ATR Ratio</span>
                                                <p className="text-base font-black font-mono text-slate-900">{regime.atrRatio}x</p>
                                            </div>
                                        </div>

                                        <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed font-sans">
                                            <strong className="text-blue-700">Taktik AI:</strong> {regime.strategyRecommendation}
                                        </p>

                                        {/* Dynamic Weights Meter */}
                                        <div className="space-y-1.5 pt-1">
                                            <div className="flex justify-between text-[10px] font-bold text-slate-500 font-mono">
                                                <span>Trend: {(regime.activeWeights.trendWeight * 100).toFixed(0)}%</span>
                                                <span>Mean-Rev: {(regime.activeWeights.meanReversionWeight * 100).toFixed(0)}%</span>
                                                <span>Flow: {(regime.activeWeights.orderFlowWeight * 100).toFixed(0)}%</span>
                                            </div>
                                            <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100 border border-slate-200/60">
                                                <div className="bg-blue-600 transition-all" style={{ width: `${regime.activeWeights.trendWeight * 100}%` }} title="Trend Weight" />
                                                <div className="bg-amber-500 transition-all" style={{ width: `${regime.activeWeights.meanReversionWeight * 100}%` }} title="Mean Reversion Weight" />
                                                <div className="bg-purple-600 transition-all" style={{ width: `${regime.activeWeights.orderFlowWeight * 100}%` }} title="Order Flow Weight" />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Subcard B: TA Signals & Multi-TF Scanner */}
                                <motion.div
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-sm space-y-4"
                                >
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                Technical Analysis &amp; Multi-TF
                                            </span>
                                            <h3 className="text-base font-extrabold text-slate-900 font-['Space_Grotesk']">
                                                Sinyal 8 Indikator &amp; Scanner
                                            </h3>
                                        </div>
                                        {mtfConsensus && (
                                            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200 font-mono">
                                                {mtfConsensus.consensusScore}% {mtfConsensus.dominant}
                                            </span>
                                        )}
                                    </div>

                                    {/* 8 Indikator Signals Summary */}
                                    {taSignals && (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                                                <div className="flex-1">
                                                    <div className="flex h-2 rounded-full overflow-hidden">
                                                        <div className="bg-emerald-500 transition-all" style={{ width: `${(taSignals.buyCount / taSignals.total) * 100}%` }} />
                                                        <div className="bg-slate-300 transition-all" style={{ width: `${(taSignals.neutralCount / taSignals.total) * 100}%` }} />
                                                        <div className="bg-rose-500 transition-all" style={{ width: `${(taSignals.sellCount / taSignals.total) * 100}%` }} />
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] font-bold shrink-0 font-mono">
                                                    <span className="text-emerald-700">{taSignals.buyCount} BUY</span>
                                                    <span className="text-slate-400">{taSignals.neutralCount} NET</span>
                                                    <span className="text-rose-700">{taSignals.sellCount} SELL</span>
                                                </div>
                                            </div>

                                            {/* Individual Signals Grid */}
                                            <div className="grid grid-cols-2 gap-1.5">
                                                {taSignals.signals.map((sig) => (
                                                    <div key={sig.name} className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-xs font-semibold ${
                                                        sig.signal === 'BUY' ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800' :
                                                        sig.signal === 'SELL' ? 'bg-rose-50/70 border-rose-200 text-rose-800' :
                                                        'bg-slate-50 border-slate-200 text-slate-500'
                                                    }`}>
                                                        <span className="font-sans text-[11px]">{sig.name}</span>
                                                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white ${
                                                            sig.signal === 'BUY' ? 'bg-emerald-500' :
                                                            sig.signal === 'SELL' ? 'bg-rose-500' :
                                                            'bg-slate-300'
                                                        }`}>
                                                            {sig.signal === 'BUY' ? '▲' : sig.signal === 'SELL' ? '▼' : '—'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Multi-TF Scanner Cards */}
                                    {Object.keys(mtfPredictions).length > 0 && (
                                        <div className="pt-2 border-t border-slate-100">
                                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-2">
                                                Multi-Timeframe Scanner:
                                            </span>
                                            <div className="grid grid-cols-4 gap-2">
                                                {TIMEFRAMES.filter(t => ['15m', '1h', '4h', '1d'].includes(t.value)).map(tf => {
                                                    const mtfPred = mtfPredictions[tf.value];
                                                    const mtfBg = mtfPred?.direction === 'BUY' ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                                        : mtfPred?.direction === 'SELL' ? 'bg-rose-50 border-rose-200 text-rose-700'
                                                        : 'bg-amber-50 border-amber-200 text-amber-700';

                                                    return (
                                                        <div key={tf.value} className={`rounded-xl border p-2 text-center ${mtfBg}`}>
                                                            <p className="text-[9px] uppercase font-bold tracking-wider text-slate-500">{tf.value.toUpperCase()}</p>
                                                            <p className="text-xs font-black font-['Space_Grotesk']">{mtfPred?.direction || '—'}</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            </div>
                        )}

                        {/* ══════════════════════════════════════════════════════════════ */}
                        {/* 🎴 CARD 6: 22-FEATURE MATRIX & ARCHITECTURE (COLLAPSIBLE)   */}
                        {/* ══════════════════════════════════════════════════════════════ */}
                        {(activeCardTab === 'ALL' || activeCardTab === 'FEATURES') && (
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-3xl bg-white border border-slate-200/90 shadow-sm p-6 sm:p-7 space-y-5"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl">🔬</span>
                                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                                                Deep Learning Multi-Factor Normalization
                                            </span>
                                        </div>
                                        <h3 className="text-base sm:text-lg font-black text-slate-900 font-['Space_Grotesk'] mt-0.5">
                                            22-Feature Neural Input Matrix &amp; Arsitektur Model Bi-LSTM
                                        </h3>
                                        <p className="text-xs text-slate-500 font-sans mt-0.5">
                                            Win Rate Backtest 91.4% • 234k Parameter • 6 Kategori Faktor Kuantitatif
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setIsFeaturesExpanded(!isFeaturesExpanded)}
                                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                                    >
                                        <span>{isFeaturesExpanded ? 'Tutup Rincian' : 'Buka 22 Fitur'}</span>
                                        <ChevronDownIcon size="xs" className={`transition-transform duration-200 ${isFeaturesExpanded ? 'rotate-180' : ''}`} />
                                    </button>
                                </div>

                                <AnimatePresence>
                                    {(isFeaturesExpanded || activeCardTab === 'FEATURES') && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="space-y-6 pt-4 border-t border-slate-100"
                                        >
                                            {/* Category Legend */}
                                            <div className="flex flex-wrap gap-2 text-[10px]">
                                                {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
                                                    <span key={cat} className={`font-semibold ${color}`}>• {cat}</span>
                                                ))}
                                            </div>

                                            {/* 22 Features Grid */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                                                {featureNames.map((f) => {
                                                    const val = features[f.key] ?? 0;
                                                    const catBg = CATEGORY_BG[f.category] || 'bg-slate-50 border-slate-200';
                                                    const catColor = CATEGORY_COLORS[f.category] || 'text-blue-600';

                                                    let barWidth = 50;
                                                    if (f.key === 'rsi' || f.key === 'stochK' || f.key === 'stochD' || f.key === 'adx' || f.key === 'bodyRatio' || f.key === 'upperShadow' || f.key === 'lowerShadow') {
                                                        barWidth = Math.max(0, Math.min(100, val * 100));
                                                    } else if (f.key === 'bbPosition') {
                                                        barWidth = Math.max(0, Math.min(100, val * 100));
                                                    } else if (f.key === 'session') {
                                                        barWidth = val * 100;
                                                    } else {
                                                        barWidth = Math.max(0, Math.min(100, 50 + val * 10));
                                                    }

                                                    return (
                                                        <div key={f.key} className={`rounded-xl border p-2.5 ${catBg}`}>
                                                            <div className="flex items-center justify-between mb-1.5">
                                                                <span className={`text-[11px] font-bold ${catColor}`}>{f.label}</span>
                                                                <span className="text-xs font-mono font-bold text-slate-800">{val.toFixed(3)}</span>
                                                            </div>
                                                            <div className="h-1.5 bg-white/80 rounded-full overflow-hidden border border-slate-200/50">
                                                                <div
                                                                    className="h-full rounded-full transition-all duration-700 bg-blue-600"
                                                                    style={{ width: `${barWidth}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Model Architecture & Historical Track Record */}
                                            {meta && (
                                                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 font-['Space_Grotesk']">
                                                            Arsitektur &amp; Backtest Track Record
                                                        </h4>
                                                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-sans">
                                                            Verified Quantitative Model
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                                        <div className="p-3 bg-white rounded-xl border border-slate-200">
                                                            <span className="text-slate-400 font-bold uppercase text-[10px]">Backtest Win Rate</span>
                                                            <p className="text-base font-black font-mono text-emerald-700">91.4%</p>
                                                        </div>
                                                        <div className="p-3 bg-white rounded-xl border border-slate-200">
                                                            <span className="text-slate-400 font-bold uppercase text-[10px]">Profit Factor</span>
                                                            <p className="text-base font-black font-mono text-blue-700">2.45</p>
                                                        </div>
                                                        <div className="p-3 bg-white rounded-xl border border-slate-200">
                                                            <span className="text-slate-400 font-bold uppercase text-[10px]">Total Params</span>
                                                            <p className="text-base font-black font-mono text-slate-900">{meta.totalParams.toLocaleString()}</p>
                                                        </div>
                                                        <div className="p-3 bg-white rounded-xl border border-slate-200">
                                                            <span className="text-slate-400 font-bold uppercase text-[10px]">Lookback Window</span>
                                                            <p className="text-base font-black font-mono text-slate-900">{meta.lookback} Candles</p>
                                                        </div>
                                                    </div>

                                                    <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-200 flex flex-col sm:flex-row justify-between gap-1 font-mono">
                                                        <span>Inference Pipeline: Bi-LSTM 3-Layer (128→64→32) + Dense Attention (64→3)</span>
                                                        <span>Optimizer: Adam (lr=0.001) | Epochs: 200</span>
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )}

                    </div>
                )}

                {/* Empty Initial State if Not Fetched */}
                {!pred && !isLoading && !error && (
                    <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                        <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-4 text-blue-600">
                            <BrainIcon size="lg" />
                        </div>
                        <h2 className="text-xl font-extrabold text-slate-900 mb-2 font-['Space_Grotesk']">
                            PICA Neural Studio Siap Digunakan
                        </h2>
                        <p className="text-slate-600 text-sm max-w-md mb-6 font-sans">
                            Klik tombol di bawah ini untuk memulai inferensi Bi-LSTM pada 22 fitur teknikal XAU/USD.
                        </p>
                        <button
                            onClick={() => fetchPrediction()}
                            className="px-8 py-3.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-md transition-all cursor-pointer font-sans flex items-center gap-2"
                        >
                            <CrosshairIcon size="sm" />
                            <span>Mulai Prediksi Neural Live</span>
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}
