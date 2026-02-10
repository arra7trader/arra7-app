'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

interface ProbabilityZone {
    price: number;
    probability: number;
    bias: 'LONG' | 'SHORT' | 'NEUTRAL';
}

interface HeatmapData {
    currentPrice: number;
    zones: ProbabilityZone[];
    timestamp: string;
    dataSource: string;
    session: string;
    sessionEmoji: string;
    high24h: number;
    low24h: number;
    atr: number;
}

// ═══════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════

function getBarColor(zone: ProbabilityZone): string {
    if (zone.bias === 'LONG') return 'rgb(34, 197, 94)';
    if (zone.bias === 'SHORT') return 'rgb(239, 68, 68)';
    return 'rgb(156, 163, 175)';
}

function getBarBgClass(zone: ProbabilityZone): string {
    if (zone.bias === 'LONG') return 'bg-green-500';
    if (zone.bias === 'SHORT') return 'bg-red-500';
    return 'bg-gray-400';
}

function getBiasLabel(zone: ProbabilityZone): string {
    if (zone.bias === 'LONG') return 'BUY';
    if (zone.bias === 'SHORT') return 'SELL';
    return '—';
}

function getBiasTextClass(zone: ProbabilityZone): string {
    if (zone.bias === 'LONG') return 'text-green-600';
    if (zone.bias === 'SHORT') return 'text-red-600';
    return 'text-gray-400';
}

function formatPct(v: number): string {
    return `${Math.round(v * 100)}%`;
}

// ═══════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════

export default function GoldHeatmap() {
    const [data, setData] = useState<HeatmapData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [secondsAgo, setSecondsAgo] = useState(0);
    const [lastFetchTime, setLastFetchTime] = useState<number>(Date.now());

    // Fetch data
    const fetchData = useCallback(async () => {
        try {
            const res = await fetch('/api/xauusd/probability-zones');
            if (!res.ok) throw new Error('API error');
            const json: HeatmapData = await res.json();
            setData(json);
            setLastFetchTime(Date.now());
            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // Seconds-ago ticker
    useEffect(() => {
        const tick = setInterval(() => setSecondsAgo(Math.floor((Date.now() - lastFetchTime) / 1000)), 1000);
        return () => clearInterval(tick);
    }, [lastFetchTime]);

    // ─── Loading ───
    if (isLoading && !data) {
        return (
            <div className="w-full min-h-[400px] flex items-center justify-center bg-white rounded-2xl border border-[var(--border-light)]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-gray-400 font-medium">Loading heatmap data…</span>
                </div>
            </div>
        );
    }

    if (error && !data) {
        return (
            <div className="w-full min-h-[200px] flex items-center justify-center bg-white rounded-2xl border border-red-200">
                <p className="text-red-500 text-sm">⚠️ {error}</p>
            </div>
        );
    }

    if (!data) return null;

    // ─── Compute display data ───

    // Sort zones by price descending (top = highest price)
    const sortedZones = [...data.zones]
        .filter(z => z.price >= data.currentPrice - data.atr * 3 && z.price <= data.currentPrice + data.atr * 3)
        .sort((a, b) => b.price - a.price);

    // Key zones
    const strongestLong = [...data.zones].filter(z => z.bias === 'LONG').sort((a, b) => b.probability - a.probability)[0];
    const strongestShort = [...data.zones].filter(z => z.bias === 'SHORT').sort((a, b) => b.probability - a.probability)[0];

    // Stats
    const longCount = data.zones.filter(z => z.bias === 'LONG').length;
    const shortCount = data.zones.filter(z => z.bias === 'SHORT').length;
    const neutralCount = data.zones.filter(z => z.bias === 'NEUTRAL').length;
    const overallBias = longCount > shortCount ? 'BULLISH' : shortCount > longCount ? 'BEARISH' : 'NEUTRAL';
    const overallBiasColor = overallBias === 'BULLISH' ? 'text-green-600' : overallBias === 'BEARISH' ? 'text-red-600' : 'text-gray-500';

    return (
        <div className="flex flex-col gap-5">

            {/* ═══ TOP: Header Card ═══ */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-white rounded-2xl border border-[var(--border-light)] shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center border border-amber-100">
                        <span className="text-2xl">🏆</span>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            XAU/USD Probability Heatmap
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-green-100 text-green-700 rounded-full border border-green-200 animate-pulse">
                                LIVE
                            </span>
                        </h2>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-0.5">
                            <span>🕒 {secondsAgo}s ago</span>
                            <span className="text-gray-300">·</span>
                            <span>{data.sessionEmoji} {data.session}</span>
                            <span className="text-gray-300">·</span>
                            <span>📡 {data.dataSource === 'swissquote' ? 'Swissquote Bank' : 'Yahoo Finance'}</span>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-bold font-mono tracking-tight text-amber-600">
                        ${data.currentPrice.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                        <span className="text-red-500">L {data.low24h.toFixed(2)}</span>
                        <span className="mx-1.5 text-gray-300">|</span>
                        <span className="text-green-500">H {data.high24h.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* ═══ STAT CARDS ═══ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                    label="Overall Bias"
                    value={overallBias}
                    valueClass={overallBiasColor}
                    icon="🧭"
                />
                <StatCard
                    label="ATR (Volatility)"
                    value={`$${data.atr.toFixed(2)}`}
                    valueClass="text-gray-800"
                    icon="📊"
                />
                <StatCard
                    label="Strongest Buy Zone"
                    value={strongestLong ? `$${strongestLong.price.toFixed(2)}` : 'N/A'}
                    sub={strongestLong ? formatPct(strongestLong.probability) : undefined}
                    valueClass="text-green-600"
                    icon="🟢"
                />
                <StatCard
                    label="Strongest Sell Zone"
                    value={strongestShort ? `$${strongestShort.price.toFixed(2)}` : 'N/A'}
                    sub={strongestShort ? formatPct(strongestShort.probability) : undefined}
                    valueClass="text-red-600"
                    icon="🔴"
                />
            </div>

            {/* ═══ MAIN: Heatmap Bar Chart ═══ */}
            <div className="bg-white rounded-2xl border border-[var(--border-light)] shadow-sm overflow-hidden">

                {/* Chart Header */}
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">Price Zone Probability</h3>
                    <div className="flex items-center gap-4 text-[11px] text-gray-400">
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" /> Buy Zone</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> Sell Zone</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-gray-400 inline-block" /> Neutral</span>
                    </div>
                </div>

                {/* Table/Bar Chart */}
                <div className="divide-y divide-gray-50">
                    {sortedZones.map((zone, i) => {
                        const isCurrentPrice = Math.abs(zone.price - data.currentPrice) < data.atr * 0.25;
                        const barWidth = Math.max(4, zone.probability * 100);
                        const pct = Math.round(zone.probability * 100);

                        return (
                            <motion.div
                                key={zone.price}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.02 }}
                                className={`flex items-center gap-3 px-5 py-2 group hover:bg-gray-50/80 transition-colors ${isCurrentPrice ? 'bg-amber-50/60 border-l-4 border-amber-400' : ''}`}
                            >
                                {/* Price Label */}
                                <div className={`w-[90px] text-right font-mono text-sm shrink-0 ${isCurrentPrice ? 'text-amber-700 font-bold' : 'text-gray-600'}`}>
                                    {zone.price.toFixed(2)}
                                    {isCurrentPrice && <span className="ml-1 text-[10px] text-amber-500">◀</span>}
                                </div>

                                {/* Probability Bar */}
                                <div className="flex-1 flex items-center gap-2">
                                    <div className="flex-1 h-5 bg-gray-100 rounded-md overflow-hidden relative">
                                        <motion.div
                                            className={`h-full rounded-md ${getBarBgClass(zone)}`}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${barWidth}%` }}
                                            transition={{ duration: 0.6, ease: 'easeOut' }}
                                            style={{ opacity: 0.15 + zone.probability * 0.7 }}
                                        />
                                        {/* Percentage text inside bar */}
                                        <span className={`absolute inset-y-0 flex items-center text-[11px] font-semibold ${barWidth > 30 ? 'left-2 text-white' : 'right-2 text-gray-500'}`}
                                            style={barWidth > 30 ? { left: '8px' } : { right: '8px' }}>
                                            {pct}%
                                        </span>
                                    </div>
                                </div>

                                {/* Bias Label */}
                                <div className={`w-[48px] text-center text-xs font-bold shrink-0 ${getBiasTextClass(zone)}`}>
                                    {getBiasLabel(zone)}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* ═══ BOTTOM: Disclaimer ═══ */}
            <p className="text-center text-[11px] text-gray-400">
                *Probability zones are generated by ensemble models (RSI, VWAP, ATR, Momentum). This is not financial advice.
            </p>
        </div>
    );
}

// ═══════════════════════════════════════════════
// Sub-Components
// ═══════════════════════════════════════════════

function StatCard({ label, value, sub, valueClass, icon }: {
    label: string;
    value: string;
    sub?: string;
    valueClass: string;
    icon: string;
}) {
    return (
        <div className="bg-white rounded-xl border border-[var(--border-light)] p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{icon}</span>
                <span className="text-xs text-gray-500 font-medium">{label}</span>
            </div>
            <div className={`text-lg font-bold font-mono ${valueClass}`}>
                {value}
            </div>
            {sub && <span className="text-xs text-gray-400">{sub} probability</span>}
        </div>
    );
}
