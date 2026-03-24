'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

interface Prediction {
    direction: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    probabilities: { up: number; down: number; neutral: number };
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

interface PredictionResponse {
    status: string;
    prediction: Prediction;
    features: Record<string, number>;
    featureNames: FeatureMeta[];
    marketInfo: MarketInfo;
    session: SessionInfo;
    modelMeta: ModelMeta;
}

// ═══════════════════════════════════════════════
// Timeframes
// ═══════════════════════════════════════════════

const TIMEFRAMES = [
    { value: '15m', label: 'M15' },
    { value: '1h', label: 'H1' },
    { value: '4h', label: 'H4' },
    { value: '1d', label: 'D1' },
];

// ═══════════════════════════════════════════════
// Feature category color mapping
// ═══════════════════════════════════════════════

const CATEGORY_COLORS: Record<string, string> = {
    Trend: 'text-blue-400',
    Momentum: 'text-purple-400',
    Volatility: 'text-amber-400',
    Volume: 'text-cyan-400',
    Pattern: 'text-emerald-400',
    Temporal: 'text-rose-400',
};

const CATEGORY_BG: Record<string, string> = {
    Trend: 'bg-blue-500/10 border-blue-500/20',
    Momentum: 'bg-purple-500/10 border-purple-500/20',
    Volatility: 'bg-amber-500/10 border-amber-500/20',
    Volume: 'bg-cyan-500/10 border-cyan-500/20',
    Pattern: 'bg-emerald-500/10 border-emerald-500/20',
    Temporal: 'bg-rose-500/10 border-rose-500/20',
};

// ═══════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════

export default function XauusdNeuralLabPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [selectedTimeframe, setSelectedTimeframe] = useState('1h');
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<PredictionResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);

    // Multi-timeframe predictions
    const [mtfPredictions, setMtfPredictions] = useState<Record<string, Prediction | null>>({});
    const [mtfLoading, setMtfLoading] = useState(false);

    // Auth check
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login?callbackUrl=/xauusd-neural-lab');
        }
    }, [status, router]);

    // VVIP check (client-side)
    const membership = (session?.user as any)?.membership || 'BASIC';
    const isVvip = membership === 'VVIP' || membership === 'ADMIN';

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
            } else {
                setError(result.error || 'Prediction failed');
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [selectedTimeframe]);

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

    // Auto-refresh interval
    useEffect(() => {
        if (!autoRefresh || !isVvip) return;
        const interval = setInterval(() => fetchPrediction(), 60000); // 60s
        return () => clearInterval(interval);
    }, [autoRefresh, isVvip, fetchPrediction]);

    // Initial load
    useEffect(() => {
        if (isVvip && status === 'authenticated') {
            fetchPrediction();
        }
    }, [isVvip, status]); // eslint-disable-line react-hooks/exhaustive-deps

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            </div>
        );
    }

    // VVIP Gate
    if (!isVvip) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] pt-28 pb-16 px-4">
                <div className="max-w-lg mx-auto text-center">
                    <div className="w-24 h-24 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
                        <svg className="w-12 h-12 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-3">VVIP Exclusive</h1>
                    <p className="text-[var(--text-secondary)] mb-8 max-w-md mx-auto">
                        XAUUSD Neural Lab adalah fitur eksklusif untuk member VVIP. Upgrade sekarang untuk akses neural network prediksi Gold real-time.
                    </p>
                    <Link
                        href="/pricing"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-amber-500/30 transition-all"
                    >
                        Upgrade ke VVIP
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </Link>
                </div>
            </div>
        );
    }

    const pred = data?.prediction;
    const market = data?.marketInfo;
    const sess = data?.session;
    const meta = data?.modelMeta;
    const features = data?.features || {};
    const featureNames = data?.featureNames || [];

    const dirColor = pred?.direction === 'BUY' ? 'text-emerald-400' : pred?.direction === 'SELL' ? 'text-rose-400' : 'text-amber-400';
    const dirBg = pred?.direction === 'BUY' ? 'bg-emerald-500/10 border-emerald-500/20' : pred?.direction === 'SELL' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-amber-500/10 border-amber-500/20';
    const dirGlow = pred?.direction === 'BUY' ? 'shadow-emerald-500/20' : pred?.direction === 'SELL' ? 'shadow-rose-500/20' : 'shadow-amber-500/20';

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pt-28 pb-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* ══════ HERO HEADER ══════ */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                >
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-3xl">🧠</span>
                            <h1 className="text-3xl lg:text-4xl font-bold text-[var(--text-primary)]">
                                XAUUSD Neural Lab
                            </h1>
                            <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-bold uppercase tracking-wider">
                                VVIP
                            </span>
                        </div>
                        <p className="text-[var(--text-secondary)] text-sm max-w-xl">
                            Neural network prediction engine khusus XAUUSD. LSTM 3-layer dengan 22 input features teknikal dari Swissquote real-time data.
                        </p>
                    </div>

                    {/* Live Price Badge */}
                    {market && (
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-light)]"
                        >
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">XAU/USD Live</p>
                                <p className="text-2xl font-mono font-bold text-[var(--text-primary)]">
                                    ${market.price.toFixed(2)}
                                </p>
                            </div>
                            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${market.change >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                {market.change >= 0 ? '+' : ''}{market.change.toFixed(2)}%
                            </span>
                        </motion.div>
                    )}
                </motion.div>

                {/* ══════ CONTROLS ══════ */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Timeframe Selector */}
                    <div className="flex gap-1 p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)]">
                        {TIMEFRAMES.map(tf => (
                            <button
                                key={tf.value}
                                onClick={() => { setSelectedTimeframe(tf.value); fetchPrediction(tf.value); }}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    selectedTimeframe === tf.value
                                        ? 'bg-[var(--accent-blue)] text-white shadow-md'
                                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                            >
                                {tf.label}
                            </button>
                        ))}
                    </div>

                    {/* Analyze Button */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => fetchPrediction()}
                        disabled={isLoading}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold text-sm hover:shadow-lg hover:shadow-blue-500/20 transition-all disabled:opacity-50"
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Analyzing...
                            </span>
                        ) : '🔬 Run Neural Prediction'}
                    </motion.button>

                    {/* Multi-TF Button */}
                    <button
                        onClick={fetchMTF}
                        disabled={mtfLoading}
                        className="px-4 py-2.5 rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50"
                    >
                        {mtfLoading ? 'Scanning...' : '📡 Multi-TF Scan'}
                    </button>

                    {/* Auto-refresh */}
                    <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={e => setAutoRefresh(e.target.checked)}
                            className="w-4 h-4 rounded accent-blue-500"
                        />
                        Auto (60s)
                    </label>

                    {/* Last Updated */}
                    {lastUpdated && (
                        <span className="text-xs text-[var(--text-muted)] ml-auto">
                            Updated: {lastUpdated}
                        </span>
                    )}
                </div>

                {/* ══════ SESSION INFO ══════ */}
                {sess && (
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-lg">{sess.emoji}</span>
                        <span className="text-[var(--text-secondary)]">Active Session:</span>
                        <span className="text-[var(--text-primary)] font-medium">{sess.name}</span>
                        <span className="text-[var(--text-muted)]">(UTC {sess.utcHour}:00)</span>
                    </div>
                )}

                {/* ══════ ERROR ══════ */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-400 text-sm"
                        >
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ══════ MAIN CONTENT ══════ */}
                {pred && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                    >
                        {/* ── LEFT: Prediction Card + Probability ── */}
                        <div className="space-y-6">
                            {/* Direction Prediction Card */}
                            <div className={`rounded-3xl border p-6 shadow-xl ${dirBg} ${dirGlow}`}>
                                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-3">Neural Prediction</p>
                                <div className="text-center">
                                    <motion.div
                                        key={pred.direction}
                                        initial={{ scale: 0.5, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className={`text-6xl font-black ${dirColor} mb-2`}
                                    >
                                        {pred.direction}
                                    </motion.div>
                                    <div className="flex items-center justify-center gap-2 mb-4">
                                        <span className="text-[var(--text-secondary)] text-sm">Confidence</span>
                                        <span className={`text-2xl font-bold font-mono ${dirColor}`}>
                                            {pred.confidence.toFixed(1)}%
                                        </span>
                                    </div>

                                    {/* Confidence Ring */}
                                    <div className="relative w-32 h-32 mx-auto">
                                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                                            <circle
                                                cx="50" cy="50" r="42" fill="none"
                                                stroke={pred.direction === 'BUY' ? '#34d399' : pred.direction === 'SELL' ? '#fb7185' : '#fbbf24'}
                                                strokeWidth="8"
                                                strokeLinecap="round"
                                                strokeDasharray={`${(pred.confidence / 100) * 264} 264`}
                                                className="transition-all duration-1000"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className={`text-xl font-bold font-mono ${dirColor}`}>
                                                {pred.confidence.toFixed(0)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Probability Distribution */}
                            <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-5">
                                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4">Probability Distribution</p>
                                <div className="space-y-3">
                                    {/* UP */}
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-emerald-400 font-medium">▲ UP (BUY)</span>
                                            <span className="text-emerald-400 font-mono">{(pred.probabilities.up * 100).toFixed(1)}%</span>
                                        </div>
                                        <div className="h-3 bg-[var(--bg-primary)] rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${pred.probabilities.up * 100}%` }}
                                                transition={{ duration: 1, ease: 'easeOut' }}
                                                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                                            />
                                        </div>
                                    </div>
                                    {/* DOWN */}
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-rose-400 font-medium">▼ DOWN (SELL)</span>
                                            <span className="text-rose-400 font-mono">{(pred.probabilities.down * 100).toFixed(1)}%</span>
                                        </div>
                                        <div className="h-3 bg-[var(--bg-primary)] rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${pred.probabilities.down * 100}%` }}
                                                transition={{ duration: 1, ease: 'easeOut', delay: 0.1 }}
                                                className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-full"
                                            />
                                        </div>
                                    </div>
                                    {/* NEUTRAL */}
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-amber-400 font-medium">● NEUTRAL</span>
                                            <span className="text-amber-400 font-mono">{(pred.probabilities.neutral * 100).toFixed(1)}%</span>
                                        </div>
                                        <div className="h-3 bg-[var(--bg-primary)] rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${pred.probabilities.neutral * 100}%` }}
                                                transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                                                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Multi-TF Scanner */}
                            {Object.keys(mtfPredictions).length > 0 && (
                                <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-5">
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4">Multi-Timeframe Scanner</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {TIMEFRAMES.map(tf => {
                                            const mtfPred = mtfPredictions[tf.value];
                                            const mtfColor = mtfPred?.direction === 'BUY' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                                : mtfPred?.direction === 'SELL' ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                                                : 'text-amber-400 bg-amber-500/10 border-amber-500/20';
                                            return (
                                                <div key={tf.value} className={`rounded-xl border p-3 text-center ${mtfColor}`}>
                                                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{tf.label}</p>
                                                    <p className="text-lg font-bold">{mtfPred?.direction || '—'}</p>
                                                    <p className="text-xs font-mono opacity-75">{mtfPred ? `${mtfPred.confidence.toFixed(1)}%` : ''}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── CENTER + RIGHT: Feature Dashboard ── */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Feature Dashboard */}
                            <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">22-Feature Technical Dashboard</p>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
                                            <span key={cat} className={`text-[10px] ${color} opacity-70`}>● {cat}</span>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                                    {featureNames.map((f, idx) => {
                                        const val = features[f.key] ?? 0;
                                        const catBg = CATEGORY_BG[f.category] || '';
                                        const catColor = CATEGORY_COLORS[f.category] || 'text-blue-400';
                                        // Normalize value for bar display (different scales per feature)
                                        let barWidth = 50; // centered default
                                        if (f.key === 'rsi' || f.key === 'stochK' || f.key === 'stochD' || f.key === 'adx' || f.key === 'bodyRatio' || f.key === 'upperShadow' || f.key === 'lowerShadow') {
                                            barWidth = Math.max(0, Math.min(100, val * 100));
                                        } else if (f.key === 'bbPosition') {
                                            barWidth = Math.max(0, Math.min(100, val * 100));
                                        } else if (f.key === 'session') {
                                            barWidth = val * 100;
                                        } else {
                                            // Centered features (-range to +range)
                                            barWidth = Math.max(0, Math.min(100, 50 + val * 10));
                                        }

                                        return (
                                            <div key={f.key} className={`rounded-xl border p-3 ${catBg}`}>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className={`text-[11px] font-medium ${catColor}`}>{f.label}</span>
                                                    <span className="text-xs font-mono text-[var(--text-primary)]">{val.toFixed(3)}</span>
                                                </div>
                                                <div className="h-1.5 bg-[var(--bg-primary)] rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-700 ${
                                                            val > 0.5 || (f.key !== 'rsi' && val > 0) ? 'bg-emerald-400/70' : 'bg-rose-400/70'
                                                        }`}
                                                        style={{ width: `${barWidth}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Market Info Grid */}
                            {market && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-4">
                                        <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">24h High</p>
                                        <p className="text-lg font-bold font-mono text-[var(--text-primary)]">${market.high24h.toFixed(2)}</p>
                                    </div>
                                    <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-4">
                                        <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">24h Low</p>
                                        <p className="text-lg font-bold font-mono text-[var(--text-primary)]">${market.low24h.toFixed(2)}</p>
                                    </div>
                                    <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-4">
                                        <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Data Source</p>
                                        <p className="text-sm font-semibold text-[var(--text-primary)] capitalize">{market.source}</p>
                                    </div>
                                    <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-4">
                                        <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Timeframe</p>
                                        <p className="text-lg font-bold text-[var(--text-primary)]">{market.timeframe.toUpperCase()}</p>
                                    </div>
                                </div>
                            )}

                            {/* Model Metadata */}
                            {meta && (
                                <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-5">
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4">🤖 Model Architecture</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                        <div>
                                            <p className="text-[var(--text-muted)] text-xs">Architecture</p>
                                            <p className="text-[var(--text-primary)] font-medium">{meta.architecture}</p>
                                        </div>
                                        <div>
                                            <p className="text-[var(--text-muted)] text-xs">LSTM Units</p>
                                            <p className="text-[var(--text-primary)] font-medium font-mono">{meta.biLstmUnits?.join(' → ')}</p>
                                        </div>
                                        <div>
                                            <p className="text-[var(--text-muted)] text-xs">Dense Units</p>
                                            <p className="text-[var(--text-primary)] font-medium font-mono">{meta.denseUnits?.join(' → ')}</p>
                                        </div>
                                        <div>
                                            <p className="text-[var(--text-muted)] text-xs">Total Params</p>
                                            <p className="text-[var(--text-primary)] font-medium font-mono">{meta.totalParams?.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-[var(--text-muted)] text-xs">Accuracy</p>
                                            <p className="text-emerald-400 font-medium font-mono">{(meta.accuracy * 100).toFixed(1)}%</p>
                                        </div>
                                        <div>
                                            <p className="text-[var(--text-muted)] text-xs">Lookback</p>
                                            <p className="text-[var(--text-primary)] font-medium">{meta.lookback} candles</p>
                                        </div>
                                        <div>
                                            <p className="text-[var(--text-muted)] text-xs">Input Features</p>
                                            <p className="text-[var(--text-primary)] font-medium">{meta.inputFeatures} (model) / {meta.displayFeatures} (display)</p>
                                        </div>
                                        <div>
                                            <p className="text-[var(--text-muted)] text-xs">Trained</p>
                                            <p className="text-[var(--text-primary)] font-medium text-xs">{meta.trainedAt}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-[var(--border-light)] text-xs text-[var(--text-muted)]">
                                        <p>Hyperparameters: LSTM 3-Layer (128→64→32) | Dropout: 0.2-0.3 | Adam LR: 0.001 | Lookback: 60 candles</p>
                                        <p className="mt-1">Training: {meta.epochs} epochs + early stopping | Batch: 32 | Labels: 3-class (UP/DOWN/NEUTRAL)</p>
                                    </div>
                                </div>
                            )}

                            {/* Disclaimer */}
                            <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-4 text-xs text-amber-400/80">
                                <p className="font-semibold mb-1">⚠️ Disclaimer</p>
                                <p>Neural network predictions bersifat probabilistik dan BUKAN jaminan profit. Selalu gunakan risk management yang ketat. Model ini adalah alat bantu analisis, bukan pengganti keputusan trading Anda.</p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Empty State */}
                {!pred && !isLoading && !error && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-20 text-center"
                    >
                        <div className="w-24 h-24 rounded-full bg-blue-500/10 flex items-center justify-center mb-6">
                            <span className="text-4xl">🧠</span>
                        </div>
                        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Neural Lab Ready</h2>
                        <p className="text-[var(--text-secondary)] max-w-md mb-6">
                            Klik &quot;Run Neural Prediction&quot; untuk menjalankan inference LSTM pada data XAUUSD real-time dari Swissquote.
                        </p>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => fetchPrediction()}
                            className="px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg hover:shadow-xl hover:shadow-blue-500/20 transition-all"
                        >
                            🔬 Run Neural Prediction
                        </motion.button>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
