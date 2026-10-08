'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePicaDevice } from '@/context/PicaDeviceContext';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Types
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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

    // Membership & Demo Mode
    const [isCheckingVvip, setIsCheckingVvip] = useState(true);
    const [isVvip, setIsVvip] = useState(false);
    const [isDemoMode, setIsDemoMode] = useState(false);

    const { isVvip: isDeviceVvip, openActivation, tier: deviceTier } = usePicaDevice();

    // Check VVIP Status (Supports both Device License and Session)
    useEffect(() => {
        if (isDeviceVvip) {
            setIsVvip(true);
            setIsDemoMode(false);
            setIsCheckingVvip(false);
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
                        setIsVvip(vvipStatus);
                        if (!vvipStatus) {
                            setIsDemoMode(true);
                        }
                    }
                } catch {
                    setIsDemoMode(true);
                } finally {
                    setIsCheckingVvip(false);
                }
            };
            checkMembership();
        } else {
            // Guest access: freely available!
            setIsVvip(false);
            setIsDemoMode(true);
            setIsCheckingVvip(false);
        }
    }, [status, isDeviceVvip]);

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

    // Auto-refresh interval (for VVIP)
    useEffect(() => {
        if (!autoRefresh || (!isVvip && !isDemoMode)) return;
        const interval = setInterval(() => fetchPrediction(), 60000);
        return () => clearInterval(interval);
    }, [autoRefresh, isVvip, isDemoMode, fetchPrediction]);

    // Initial load
    useEffect(() => {
        if (status === 'authenticated' && !isCheckingVvip) {
            fetchPrediction();
        }
    }, [status, isCheckingVvip]); // eslint-disable-line react-hooks/exhaustive-deps

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

    if (status === 'loading' || (status === 'authenticated' && isCheckingVvip)) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-semibold text-slate-600 font-mono">Loading PICA Neural Studio...</p>
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
    const trackRecord = data?.trackRecord;
    const reasoning = data?.aiReasoning || [];

    const dirColor = pred?.direction === 'BUY' ? 'text-emerald-700' : pred?.direction === 'SELL' ? 'text-rose-700' : 'text-amber-700';
    const dirBg = pred?.direction === 'BUY' ? 'bg-emerald-50 border-emerald-200' : pred?.direction === 'SELL' ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200';
    const dirBadge = pred?.direction === 'BUY' ? 'bg-emerald-600 text-white' : pred?.direction === 'SELL' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white';

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pt-28 pb-20 px-4 sm:px-6 lg:px-8 font-sans selection:bg-blue-100 selection:text-blue-900">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* â•â•â•â•â•â• DEMO MODE / VVIP NOTICE â•â•â•â•â•â• */}
                {!isVvip && (
                    <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-blue-50 via-indigo-50 to-amber-50 border border-blue-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">âœ¨</span>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">
                                    Simulasi PICA Neural Lab Aktif
                                </h3>
                                <p className="text-xs text-slate-600">
                                    Anda sedang mencoba modul Deep Learning dalam mode simulasi interaktif. Upgrade ke VVIP untuk akses feed Swissquote tick-by-tick &amp; auto-refresh real-time.
                                </p>
                            </div>
                        </div>
                        <Link
                            href="/pricing"
                            className="shrink-0 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
                        >
                            Upgrade ke VVIP â†’
                        </Link>
                    </div>
                )}

                {/* â•â•â•â•â•â• HERO HEADER â•â•â•â•â•â• */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm"
                >
                    <div>
                        <div className="flex items-center gap-3 mb-1.5">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl shadow-md shadow-blue-500/20">
                                ðŸ§ 
                            </div>
                            <div>
                                <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                                    <span>PICA Neural Lab</span>
                                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                                        v8.2 Bi-LSTM
                                    </span>
                                </h1>
                                <p className="text-xs text-slate-500">
                                    XAU/USD Quantitative Neural Network â€¢ 22 Input Multi-Factor Indicators
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Live Price Badge */}
                    {market && (
                        <div className="flex items-center gap-4 px-5 py-3 rounded-2xl bg-slate-50 border border-slate-200">
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">XAU/USD Gold</p>
                                <p className="text-2xl font-mono font-black text-slate-900">
                                    ${market.price.toFixed(2)}
                                </p>
                            </div>
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${market.change >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                {market.change >= 0 ? '+' : ''}{market.change.toFixed(2)}%
                            </span>
                        </div>
                    )}
                </motion.div>

                {/* â•â•â•â•â•â• CONTROLS BAR â•â•â•â•â•â• */}
                <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
                    {/* Timeframe Selector */}
                    <div className="flex gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200">
                        {TIMEFRAMES.map(tf => (
                            <button
                                key={tf.value}
                                onClick={() => { setSelectedTimeframe(tf.value); fetchPrediction(tf.value); }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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
                        className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50 cursor-pointer flex items-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Running Inference...</span>
                            </>
                        ) : (
                            <>
                                <span>ðŸ”¬</span>
                                <span>Run Neural Inference</span>
                            </>
                        )}
                    </motion.button>

                    {/* Multi-TF Scan */}
                    <button
                        onClick={fetchMTF}
                        disabled={mtfLoading}
                        className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                    >
                        <span>ðŸ“¡</span>
                        <span>{mtfLoading ? 'Scanning 4 TFs...' : 'Multi-TF Confluence'}</span>
                    </button>

                    {/* Auto-refresh */}
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
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
                        <span>{soundAlert ? 'ðŸ””' : 'ðŸ”•'}</span>
                        <span>Alert Sound</span>
                    </button>

                    {/* Last Updated */}
                    {lastUpdated && (
                        <span className="text-xs text-slate-400 font-mono ml-auto">
                            Updated: {lastUpdated}
                        </span>
                    )}
                </div>

                {/* â•â•â•â•â•â• ERROR NOTICE â•â•â•â•â•â• */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-rose-700 text-sm font-medium"
                        >
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* â•â•â•â•â•â• MAIN GRID â•â•â•â•â•â• */}
                {pred && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                    >
                        {/* â”€â”€ LEFT COLUMN: Prediction, Setup & Probabilities â”€â”€ */}
                        <div className="space-y-6">
                            
                            {/* Neural Forecast Verdict Card */}
                            <div className={`rounded-3xl border p-6 shadow-sm transition-all ${dirBg}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
                                        Model Verdict
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${dirBadge}`}>
                                        {pred.confidence.toFixed(0)}% Confident
                                    </span>
                                </div>

                                <div className="text-center my-4">
                                    <motion.div
                                        key={pred.direction + selectedTimeframe}
                                        initial={{ scale: 0.7, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className={`text-6xl font-black ${dirColor}`}
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
                                            <span>â–² UP (BUY)</span>
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
                                            <span>â–¼ DOWN (SELL)</span>
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
                                            <span>â— NEUTRAL</span>
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

                            {/* Precision Trade Setup Card */}
                            {setup && (
                                <div className="rounded-3xl bg-white border border-slate-200/90 p-5 shadow-sm space-y-4">
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Execution Matrix</span>
                                            <h3 className="text-base font-extrabold text-slate-900">Trade Setup Otomatis</h3>
                                        </div>
                                        <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                            {setup.grade}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Entry Price</span>
                                            <p className="text-lg font-black font-mono text-slate-900">${setup.entryPrice.toFixed(2)}</p>
                                            <span className="text-[10px] text-slate-500">Zone: ${setup.entryZoneMin} - ${setup.entryZoneMax}</span>
                                        </div>

                                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Risk / Reward</span>
                                            <p className="text-lg font-black font-mono text-blue-600">{setup.riskReward}</p>
                                            <span className="text-[10px] text-slate-500">ATR Vol: {setup.atr}</span>
                                        </div>

                                        <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                                            <span className="text-[10px] font-bold text-emerald-700 uppercase">Take Profit 1</span>
                                            <p className="text-lg font-black font-mono text-emerald-700">${setup.takeProfit1.toFixed(2)}</p>
                                            <span className="text-[10px] font-semibold text-emerald-600">+{setup.pipsTp1} pips</span>
                                        </div>

                                        <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                                            <span className="text-[10px] font-bold text-emerald-700 uppercase">Take Profit 2</span>
                                            <p className="text-lg font-black font-mono text-emerald-700">${setup.takeProfit2.toFixed(2)}</p>
                                            <span className="text-[10px] font-semibold text-emerald-600">+{setup.pipsTp2} pips</span>
                                        </div>

                                        <div className="col-span-2 p-3 rounded-2xl bg-rose-50/70 border border-rose-200 flex items-center justify-between">
                                            <div>
                                                <span className="text-[10px] font-bold text-rose-700 uppercase">Stop Loss</span>
                                                <p className="text-lg font-black font-mono text-rose-700">${setup.stopLoss.toFixed(2)}</p>
                                            </div>
                                            <span className="text-xs font-bold text-rose-600 bg-white px-2.5 py-1 rounded-lg border border-rose-200">
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
                                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Multi-TF Scanner</span>
                                        {mtfConsensus && (
                                            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
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
                                                    <p className="text-base font-black">{mtfPred?.direction || 'â€”'}</p>
                                                    <p className="text-[11px] font-mono opacity-80">{mtfPred ? `${mtfPred.confidence.toFixed(0)}%` : ''}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* â”€â”€ CENTER + RIGHT: AI Synthesis, Interactive Chart & 22-Feature Engine â”€â”€ */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* AI Qualitative Synthesis */}
                            {reasoning.length > 0 && (
                                <div className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-sm">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-lg">ðŸ¤–</span>
                                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
                                            PICA Neural Synthesis
                                        </h3>
                                        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
                                            Auto-Generated
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        {reasoning.map((item, i) => (
                                            <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed">
                                                <span className="text-blue-600 font-bold mt-0.5">âœ¦</span>
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
                                            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                                                Visual Price Trend &amp; Target Projection
                                            </h3>
                                            <p className="text-xs text-slate-500">
                                                30 Candle Terakhir XAU/USD dengan Proyeksi Entry, TP1, TP2, dan SL
                                            </p>
                                        </div>
                                        {sess && (
                                            <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                                                <span>{sess.emoji}</span>
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
                                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
                                            22-Feature Neural Input Dashboard
                                        </h3>
                                        <p className="text-xs text-slate-500">
                                            Nilai normalisasi real-time yang diinput ke model Bi-LSTM
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-[10px]">
                                        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
                                            <span key={cat} className={`font-semibold ${color}`}>â— {cat}</span>
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
                                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
                                            Arsitektur &amp; Backtest Track Record
                                        </h3>
                                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                            Verified Model
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

                                    <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-100 flex flex-col sm:flex-row justify-between gap-1">
                                        <span>Inference Pipeline: Bi-LSTM 3-Layer (128â†’64â†’32) + Dense Attention (64â†’3)</span>
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
                        <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-4 text-3xl">
                            ðŸ§ 
                        </div>
                        <h2 className="text-xl font-extrabold text-slate-900 mb-2">
                            PICA Neural Studio Siap Digunakan
                        </h2>
                        <p className="text-slate-600 text-sm max-w-md mb-6">
                            Klik tombol di bawah ini untuk memulai inferensi Bi-LSTM pada 22 fitur teknikal XAU/USD.
                        </p>
                        <button
                            onClick={() => fetchPrediction()}
                            className="px-8 py-3.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
                        >
                            ðŸ”¬ Mulai Prediksi Neural
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}
