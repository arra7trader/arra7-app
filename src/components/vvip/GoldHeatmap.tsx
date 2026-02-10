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

function getStrengthLabel(probability: number): string {
    if (probability >= 0.75) return '⚡⚡⚡ VERY STRONG';
    if (probability >= 0.65) return '⚡⚡ STRONG';
    if (probability >= 0.55) return '⚡ MODERATE';
    return 'WEAK';
}

function getStrengthColor(probability: number): string {
    if (probability >= 0.75) return 'text-emerald-600 font-bold';
    if (probability >= 0.65) return 'text-green-600 font-semibold';
    if (probability >= 0.55) return 'text-amber-600';
    return 'text-gray-500';
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
    const [showNeutral, setShowNeutral] = useState(false);

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

    // Group zones by bias
    const buyZones = data.zones.filter(z => z.bias === 'LONG').sort((a, b) => b.probability - a.probability);
    const sellZones = data.zones.filter(z => z.bias === 'SHORT').sort((a, b) => b.probability - a.probability);
    const neutralZones = data.zones.filter(z => z.bias === 'NEUTRAL');

    return (
        <div className="flex flex-col gap-6">

            {/* ═══ HEADER ═══ */}
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

            {/* ═══ HOW TO READ GUIDE ═══ */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6">
                <h3 className="text-base font-bold text-blue-900 mb-3 flex items-center gap-2">
                    <span className="text-xl">📖</span>
                    Cara Membaca Heatmap
                </h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-white/80 rounded-lg p-4 border border-blue-100">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded bg-green-500 flex items-center justify-center text-white text-xs font-bold">1</div>
                            <span className="font-semibold text-gray-800">BUY ZONES (Hijau)</span>
                        </div>
                        <p className="text-gray-600 leading-relaxed">
                            Harga dengan <strong className="text-green-600">probabilitas tinggi untuk naik</strong>.
                            Semakin banyak ⚡, semakin kuat signal buy.
                            Zone di <strong>bawah current price</strong> = potensi support.
                        </p>
                    </div>
                    <div className="bg-white/80 rounded-lg p-4 border border-blue-100">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded bg-red-500 flex items-center justify-center text-white text-xs font-bold">2</div>
                            <span className="font-semibold text-gray-800">SELL ZONES (Merah)</span>
                        </div>
                        <p className="text-gray-600 leading-relaxed">
                            Harga dengan <strong className="text-red-600">probabilitas tinggi untuk turun</strong>.
                            Semakin banyak ⚡, semakin kuat signal sell.
                            Zone di <strong>atas current price</strong> = potensi resistance.
                        </p>
                    </div>
                </div>
                <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-xs text-amber-800 leading-relaxed">
                        <strong>💡 Tips:</strong> Gunakan untuk konfirmasi strategi trading Anda.
                        Zone dengan ⚡⚡⚡ punya probabilitas 75%+ untuk bergerak sesuai bias.
                        Perhatikan juga current price (garis kuning) untuk posisi saat ini.
                    </p>
                </div>
            </div>

            {/* ═══ BUY ZONES (GREEN) ═══ */}
            <div className="bg-white rounded-2xl border border-green-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-5 py-4 border-b border-green-100">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-green-800 flex items-center gap-2">
                            <span className="text-xl">🟢</span>
                            BUY ZONES — Support Areas
                        </h3>
                        <span className="text-xs text-green-600 font-medium bg-green-100 px-3 py-1 rounded-full">
                            {buyZones.length} zones
                        </span>
                    </div>
                </div>
                <div className="divide-y divide-green-50">
                    {buyZones.slice(0, 10).map((zone, i) => (
                        <ZoneRow key={zone.price} zone={zone} index={i} type="buy" currentPrice={data.currentPrice} />
                    ))}
                </div>
            </div>

            {/* ═══ SELL ZONES (RED) ═══ */}
            <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-red-50 to-rose-50 px-5 py-4 border-b border-red-100">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-red-800 flex items-center gap-2">
                            <span className="text-xl">🔴</span>
                            SELL ZONES — Resistance Areas
                        </h3>
                        <span className="text-xs text-red-600 font-medium bg-red-100 px-3 py-1 rounded-full">
                            {sellZones.length} zones
                        </span>
                    </div>
                </div>
                <div className="divide-y divide-red-50">
                    {sellZones.slice(0, 10).map((zone, i) => (
                        <ZoneRow key={zone.price} zone={zone} index={i} type="sell" currentPrice={data.currentPrice} />
                    ))}
                </div>
            </div>

            {/* ═══ NEUTRAL ZONES (Collapsed) ═══ */}
            {neutralZones.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <button
                        onClick={() => setShowNeutral(!showNeutral)}
                        className="w-full px-5 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                        <span className="text-sm font-semibold text-gray-600">
                            ⚪ Neutral Zones ({neutralZones.length})
                        </span>
                        <span className="text-xs text-gray-400">
                            {showNeutral ? 'Hide ▲' : 'Show ▼'}
                        </span>
                    </button>
                    <AnimatePresence>
                        {showNeutral && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="border-t border-gray-100 divide-y divide-gray-50"
                            >
                                {neutralZones.slice(0, 10).map((zone, i) => (
                                    <ZoneRow key={zone.price} zone={zone} index={i} type="neutral" currentPrice={data.currentPrice} />
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* ═══ DISCLAIMER ═══ */}
            <p className="text-center text-[11px] text-gray-400">
                *Probabilitas dihitung menggunakan ensemble model (RSI, VWAP, ATR, Momentum). Bukan financial advice.
            </p>
        </div>
    );
}

// ═══════════════════════════════════════════════
// Zone Row Component
// ═══════════════════════════════════════════════

function ZoneRow({ zone, index, type, currentPrice }: {
    zone: ProbabilityZone;
    index: number;
    type: 'buy' | 'sell' | 'neutral';
    currentPrice: number;
}) {
    const isNearCurrent = Math.abs(zone.price - currentPrice) < currentPrice * 0.002;
    const strength = getStrengthLabel(zone.probability);
    const pct = Math.round(zone.probability * 100);

    let bgClass = 'hover:bg-gray-50/50';
    let priceClass = 'text-gray-700';
    let actionText = '—';
    let actionClass = 'text-gray-400';

    if (type === 'buy') {
        bgClass = index === 0 ? 'bg-green-50/50' : 'hover:bg-green-50/30';
        priceClass = 'text-green-700 font-semibold';
        actionText = zone.price < currentPrice ? 'Support' : 'Bounce Target';
        actionClass = 'text-green-600';
    } else if (type === 'sell') {
        bgClass = index === 0 ? 'bg-red-50/50' : 'hover:bg-red-50/30';
        priceClass = 'text-red-700 font-semibold';
        actionText = zone.price > currentPrice ? 'Resistance' : 'Retracement';
        actionClass = 'text-red-600';
    }

    return (
        <div className={`flex items-center gap-3 px-5 py-3 transition-colors ${bgClass} ${isNearCurrent ? 'border-l-4 border-amber-400' : ''}`}>
            {/* Rank */}
            <div className="w-8 text-center text-xs font-bold text-gray-400">
                #{index + 1}
            </div>

            {/* Price */}
            <div className={`w-[100px] font-mono text-sm ${priceClass} shrink-0`}>
                ${zone.price.toFixed(2)}
            </div>

            {/* Probability */}
            <div className="flex-1 flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500 w-12">{pct}%</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full ${type === 'buy' ? 'bg-green-500' : type === 'sell' ? 'bg-red-500' : 'bg-gray-400'}`}
                        style={{ width: `${pct}%`, opacity: 0.2 + (zone.probability * 0.6) }}
                    />
                </div>
            </div>

            {/* Strength */}
            <div className={`text-[11px] ${getStrengthColor(zone.probability)} w-[140px] shrink-0`}>
                {strength}
            </div>

            {/* Action */}
            <div className={`text-xs font-medium w-[100px] text-right shrink-0 ${actionClass}`}>
                {actionText}
            </div>
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
