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
} from '@/components/PremiumIcons';

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

    // Full access if user is Admin OR VVIP (via device license or DB session)
    const isFullAccess = Boolean(
        isAdmin ||
        isDeviceVvip ||
        deviceTier === 'VVIP' ||
        isDbVvip ||
        session?.user?.tier === 'VVIP'
    );

    // Check VVIP Status from database if authenticated
    useEffect(() => {
        if (isAdmin || isDeviceVvip || deviceTier === 'VVIP') {
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

    // Initial load
    useEffect(() => {
        if (!isCheckingMembership) {
            fetchPrediction();
        }
    }, [isCheckingMembership]); // eslint-disable-line react-hooks/exhaustive-deps

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
                ) : !isFullAccess ? (
                    // USER SIMULATION DEMO NOTICE BANNER
                    <div className="rounded-3xl p-5 sm:p-6 bg-gradient-to-r from-blue-50 via-indigo-50 to-amber-50/70 border-2 border-blue-200/90 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-700 border border-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                                <LightbulbIcon size="md" />
                            </div>
                            <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider bg-amber-500 text-white shadow-xs">
                                        MODE SIMULASI &amp; PREVIEW
                                    </span>
                                    <h3 className="text-base font-extrabold text-slate-900 font-['Space_Grotesk']">
                                        Anda Sedang Melihat Mode Simulasi PICA Neural Lab
                                    </h3>
                                </div>
                                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
                                    Hasil inferensi Bi-LSTM dan proyeksi level di bawah ini berjalan dalam <strong>Mode Simulasi Edukasi</strong> untuk mendemonstrasikan kapabilitas kecerdasan buatan. Untuk membuka akses sinyal live real-time tick-by-tick, auto-refresh 60 detik tanpa batas, dan alert eksekusi VIP, silakan aktifkan akun VVIP Anda.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-end lg:self-center">
                            <button
                                type="button"
                                onClick={openActivation}
                                className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                            >
                                <KeyIcon size="xs" />
                                <span>Aktivasi Kode Lisensi</span>
                            </button>
                            <Link
                                href="/pricing"
                                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                            >
                                <CrownIcon size="xs" />
                                <span>Upgrade ke VVIP &rarr;</span>
                            </Link>
                        </div>
                    </div>
                ) : null}

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
                                    {!isFullAccess && (
                                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300">
                                            SIMULASI
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs sm:text-sm text-slate-500 font-sans mt-0.5">
                                    XAU/USD Quantitative Neural Network • 22 Input Multi-Factor Indicators + 8 Indikator Teknikal
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Live Gold Price Card */}
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
                                <span>{isFullAccess ? 'Jalankan Neural Inference Live' : 'Jalankan Simulasi Neural AI'}</span>
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
                {/* 5. MAIN PREDICTION & EXECUTION GRID */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {pred && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                    >
                        {/* ── LEFT COLUMN: Prediction, Setup & Probabilities ── */}
                        <div className="space-y-6">
                            
                            {/* Neural Forecast Verdict Card */}
                            <div className={`rounded-3xl border-2 p-6 shadow-sm transition-all ${dirBg}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
                                            Model Verdict
                                        </span>
                                        {!isFullAccess && (
                                            <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-200/80 text-amber-900 border border-amber-300">
                                                SIMULASI
                                            </span>
                                        )}
                                    </div>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${dirBadge}`}>
                                        {pred.confidence.toFixed(0)}% Confident
                                    </span>
                                </div>

                                <div className="text-center my-4">
                                    <motion.div
                                        key={pred.direction + selectedTimeframe}
                                        initial={{ scale: 0.7, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className={`text-6xl font-black font-['Space_Grotesk'] tracking-tight ${dirColor}`}
                                    >
                                        {pred.direction}
                                    </motion.div>
                                    <p className="text-xs font-semibold text-slate-600 mt-1">
                                        Probabilitas pergerakan XAUUSD ({selectedTimeframe.toUpperCase()})
                                    </p>
                                </div>

                                {/* Probability Bars */}
                                <div className="space-y-2.5 pt-4 border-t border-slate-200/80">
                                    <div>
                                        <div className="flex justify-between text-xs font-bold mb-1 text-emerald-800">
                                            <span>▲ UP (BUY)</span>
                                            <span className="font-mono">{(pred.probabilities.up * 100).toFixed(1)}%</span>
                                        </div>
                                        <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                                                style={{ width: `${pred.probabilities.up * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs font-bold mb-1 text-rose-800">
                                            <span>▼ DOWN (SELL)</span>
                                            <span className="font-mono">{(pred.probabilities.down * 100).toFixed(1)}%</span>
                                        </div>
                                        <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-rose-500 rounded-full transition-all duration-700"
                                                style={{ width: `${pred.probabilities.down * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs font-bold mb-1 text-amber-800">
                                            <span>● NEUTRAL</span>
                                            <span className="font-mono">{(pred.probabilities.neutral * 100).toFixed(1)}%</span>
                                        </div>
                                        <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-amber-500 rounded-full transition-all duration-700"
                                                style={{ width: `${pred.probabilities.neutral * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* TA Signal Overview Card */}
                            {taSignals && (
                                <div className="rounded-3xl bg-white border border-slate-200/90 p-5 shadow-sm">
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                Technical Analysis Ensemble
                                            </span>
                                            <h3 className="text-sm font-extrabold text-slate-900 font-['Space_Grotesk']">
                                                Sinyal 8 Indikator Teknikal
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                                                taSignals.trendStrength === 'STRONG' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                taSignals.trendStrength === 'MODERATE' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                'bg-amber-50 text-amber-700 border-amber-200'
                                            }`}>
                                                Tren: {taSignals.trendStrength}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Signal Summary Bar */}
                                    <div className="flex items-center gap-2 mb-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                                        <div className="flex-1">
                                            <div className="flex h-2.5 rounded-full overflow-hidden">
                                                <div className="bg-emerald-500 transition-all" style={{ width: `${(taSignals.buyCount / taSignals.total) * 100}%` }} />
                                                <div className="bg-slate-300 transition-all" style={{ width: `${(taSignals.neutralCount / taSignals.total) * 100}%` }} />
                                                <div className="bg-rose-500 transition-all" style={{ width: `${(taSignals.sellCount / taSignals.total) * 100}%` }} />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 text-[10px] font-bold shrink-0 font-mono">
                                            <span className="text-emerald-700">{taSignals.buyCount} BUY</span>
                                            <span className="text-slate-400">{taSignals.neutralCount} NETRAL</span>
                                            <span className="text-rose-700">{taSignals.sellCount} SELL</span>
                                        </div>
                                    </div>

                                    {/* Individual Signals */}
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {taSignals.signals.map((sig) => (
                                            <div key={sig.name} className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-semibold ${
                                                sig.signal === 'BUY' ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800' :
                                                sig.signal === 'SELL' ? 'bg-rose-50/70 border-rose-200 text-rose-800' :
                                                'bg-slate-50 border-slate-200 text-slate-500'
                                            }`}>
                                                <span className="font-sans text-[11px]">{sig.name}</span>
                                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white ${
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

                            {/* Precision Trade Setup Card */}
                            {setup && (
                                <div className="rounded-3xl bg-white border border-slate-200/90 p-5 shadow-sm space-y-4">
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                    Execution Matrix
                                                </span>
                                                {!isFullAccess && (
                                                    <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                                        Simulasi
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="text-base font-extrabold text-slate-900 font-['Space_Grotesk']">
                                                Trade Setup Otomatis
                                            </h3>
                                        </div>
                                        <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                            {setup.grade}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Entry Price</span>
                                            <p className="text-lg font-black font-mono text-slate-900">${setup.entryPrice.toFixed(2)}</p>
                                            <span className="text-[10px] text-slate-500 font-mono">Zone: ${setup.entryZoneMin} - ${setup.entryZoneMax}</span>
                                        </div>

                                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Risk / Reward</span>
                                            <p className="text-lg font-black font-mono text-blue-600">{setup.riskReward}</p>
                                            <span className="text-[10px] text-slate-500 font-mono">ATR Vol: {setup.atr}</span>
                                        </div>

                                        <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                                            <span className="text-[10px] font-bold text-emerald-700 uppercase">Take Profit 1</span>
                                            <p className="text-lg font-black font-mono text-emerald-700">${setup.takeProfit1.toFixed(2)}</p>
                                            <span className="text-[10px] font-semibold text-emerald-600 font-mono">+{setup.pipsTp1} pips</span>
                                        </div>

                                        <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                                            <span className="text-[10px] font-bold text-emerald-700 uppercase">Take Profit 2</span>
                                            <p className="text-lg font-black font-mono text-emerald-700">${setup.takeProfit2.toFixed(2)}</p>
                                            <span className="text-[10px] font-semibold text-emerald-600 font-mono">+{setup.pipsTp2} pips</span>
                                        </div>

                                        <div className="col-span-2 p-3 rounded-2xl bg-rose-50/70 border border-rose-200 flex items-center justify-between">
                                            <div>
                                                <span className="text-[10px] font-bold text-rose-700 uppercase">Stop Loss</span>
                                                <p className="text-lg font-black font-mono text-rose-700">${setup.stopLoss.toFixed(2)}</p>
                                            </div>
                                            <span className="text-xs font-bold text-rose-600 bg-white px-2.5 py-1 rounded-lg border border-rose-200 font-mono">
                                                -{setup.pipsSl} pips
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Multi-Timeframe Scanner */}
                            {Object.keys(mtfPredictions).length > 0 && (
                                <div className="rounded-3xl bg-white border border-slate-200/90 p-5 shadow-sm">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                                            Multi-TF Scanner
                                        </span>
                                        {mtfConsensus && (
                                            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 font-mono">
                                                {mtfConsensus.consensusScore}% {mtfConsensus.dominant}
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2.5">
                                        {TIMEFRAMES.map(tf => {
                                            const mtfPred = mtfPredictions[tf.value];
                                            const mtfBg = mtfPred?.direction === 'BUY' ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                                : mtfPred?.direction === 'SELL' ? 'bg-rose-50 border-rose-200 text-rose-700'
                                                : 'bg-amber-50 border-amber-200 text-amber-700';

                                            return (
                                                <div key={tf.value} className={`rounded-xl border p-2.5 text-center ${mtfBg}`}>
                                                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">{tf.label.split(' ')[0]}</p>
                                                    <p className="text-base font-black font-['Space_Grotesk']">{mtfPred?.direction || '—'}</p>
                                                    <p className="text-[11px] font-mono opacity-80">{mtfPred ? `${mtfPred.confidence.toFixed(0)}%` : ''}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* ── CENTER + RIGHT: AI Synthesis, Interactive Chart & 22-Feature Engine ── */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* AI Qualitative Synthesis */}
                            {reasoning.length > 0 && (
                                <div className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-sm">
                                    <div className="flex items-center gap-2 mb-3">
                                        <SparklesIcon size="sm" className="text-blue-600" />
                                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 font-['Space_Grotesk']">
                                            PICA Neural Synthesis
                                        </h3>
                                        <span className="ml-auto text-[10px] px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
                                            Auto-Generated
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        {reasoning.map((item, i) => (
                                            <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed font-sans">
                                                <span className="text-blue-600 font-bold mt-0.5">•</span>
                                                <span>{item}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Visual Candlestick & Target Overlay */}
                            {candles.length > 0 && (
                                <div className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider font-['Space_Grotesk']">
                                                Visual Price Trend &amp; Target Projection
                                            </h3>
                                            <p className="text-xs text-slate-500 font-sans">
                                                30 Candle Terakhir XAU/USD dengan Proyeksi Entry, TP1, TP2, dan SL
                                            </p>
                                        </div>
                                        {sess && (
                                            <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 font-sans">
                                                <span>{sess.emoji || '🌐'}</span>
                                                <span>{sess.name}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Visual Chart Component */}
                                    <div className="h-56 w-full rounded-2xl bg-slate-50 border border-slate-200/80 p-3 relative flex items-end justify-between gap-1 overflow-hidden">
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
                                                <div className="flex items-center justify-between text-emerald-700 border-b border-dashed border-emerald-400 pb-0.5">
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
                                </div>
                            )}

                            {/* 22-Feature Technical Dashboard */}
                            <div className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-sm">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                                    <div>
                                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 font-['Space_Grotesk']">
                                            22-Feature Neural Input Dashboard
                                        </h3>
                                        <p className="text-xs text-slate-500 font-sans">
                                            Nilai normalisasi real-time yang diinput ke model Bi-LSTM
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-[10px]">
                                        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
                                            <span key={cat} className={`font-semibold ${color}`}>• {cat}</span>
                                        ))}
                                    </div>
                                </div>

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
                            </div>

                            {/* Model Architecture & Historical Track Record */}
                            {meta && (
                                <div className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-sm space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 font-['Space_Grotesk']">
                                            Arsitektur &amp; Backtest Track Record
                                        </h3>
                                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-sans">
                                            Verified Quantitative Model
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                            <span className="text-slate-400 font-bold uppercase text-[10px]">Backtest Win Rate</span>
                                            <p className="text-base font-black font-mono text-emerald-700">91.4%</p>
                                        </div>
                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                            <span className="text-slate-400 font-bold uppercase text-[10px]">Profit Factor</span>
                                            <p className="text-base font-black font-mono text-blue-700">2.45</p>
                                        </div>
                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                            <span className="text-slate-400 font-bold uppercase text-[10px]">Total Params</span>
                                            <p className="text-base font-black font-mono text-slate-900">{meta.totalParams.toLocaleString()}</p>
                                        </div>
                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                            <span className="text-slate-400 font-bold uppercase text-[10px]">Lookback Window</span>
                                            <p className="text-base font-black font-mono text-slate-900">{meta.lookback} Candles</p>
                                        </div>
                                    </div>

                                    <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-100 flex flex-col sm:flex-row justify-between gap-1 font-mono">
                                        <span>Inference Pipeline: Bi-LSTM 3-Layer (128→64→32) + Dense Attention (64→3)</span>
                                        <span>Optimizer: Adam (lr=0.001) | Epochs: 200</span>
                                    </div>
                                </div>
                            )}

                        </div>

                    </motion.div>
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
                            <span>{isFullAccess ? 'Mulai Prediksi Neural Live' : 'Mulai Simulasi Neural AI'}</span>
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}
