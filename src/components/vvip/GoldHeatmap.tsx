'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

interface ProbabilityZone {
    price: number;
    probability: number;
    bias: 'LONG' | 'SHORT' | 'NEUTRAL';
    lstmScore: number;
    ruleScore: number;
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
    modelInfo?: {
        type: string;
        trainedAt: string;
        accuracy: number;
        params: number;
    };
}

// ═══════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════

function getStrengthLabel(probability: number): string {
    if (probability >= 0.85) return '🔥 WHALE INTEREST'; // Renamed for VVIP
    if (probability >= 0.75) return '⚡⚡⚡ INST. STRONG';
    if (probability >= 0.65) return '⚡⚡ STRONG';
    if (probability >= 0.55) return '⚡ MODERATE';
    return 'WEAK';
}

function getStrengthColor(probability: number): string {
    if (probability >= 0.85) return 'text-purple-600 font-black animate-pulse'; // Special VVIP color
    if (probability >= 0.75) return 'text-emerald-600 font-bold';
    if (probability >= 0.65) return 'text-green-600 font-semibold';
    if (probability >= 0.55) return 'text-amber-600';
    return 'text-gray-500';
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
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
    const lastAlertTimeRef = useRef<number>(0);

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

    // ─── 3. VOICE ALERTS (REAL) ───
    useEffect(() => {
        if (!data || !isVoiceEnabled) return;

        // Check if price is near a STRONG zone (> 80%)
        const strongZones = data.zones.filter(z => z.probability > 0.8);
        const buffer = data.currentPrice * 0.0005; // Tight buffer for alert

        for (const zone of strongZones) {
            if (Math.abs(zone.price - data.currentPrice) < buffer) {
                const now = Date.now();
                // Alert once every 60 seconds per zone encounter
                if (now - lastAlertTimeRef.current > 60000) {
                    const type = zone.bias === 'LONG' ? 'Demand' : 'Supply';
                    const msg = new SpeechSynthesisUtterance(`Alert. Institutional ${type} Zone detected at ${Math.round(zone.price)}.`);
                    msg.rate = 1.1; // Slightly faster, robotic
                    msg.pitch = 1.0;
                    window.speechSynthesis.speak(msg);
                    lastAlertTimeRef.current = now;
                }
            }
        }
    }, [data, isVoiceEnabled]);

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

    // ─── 4. SMART MONEY BIAS CALC (REAL) ───
    const totalBuyProb = buyZones.reduce((acc, z) => acc + z.probability, 0);
    const totalSellProb = sellZones.reduce((acc, z) => acc + z.probability, 0);
    const totalProb = totalBuyProb + totalSellProb || 1;
    const buyPct = (totalBuyProb / totalProb) * 100;
    const sellPct = (totalSellProb / totalProb) * 100;
    const bias = buyPct > 55 ? 'NET LONG' : sellPct > 55 ? 'NET SHORT' : 'NEUTRAL';

    return (
        <div className="flex flex-col gap-6">

            {/* ═══ 1. WHALE RADAR (REAL ANIMATION) ═══ */}
            <div className="relative bg-black rounded-3xl overflow-hidden p-6 text-white shadow-2xl border border-gray-800">
                {/* Radar Background */}
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-green-500/30 rounded-full" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border border-green-500/30 rounded-full" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100px] h-[100px] border border-green-500/30 rounded-full" />
                    {/* Rotating Scanner Line */}
                    <motion.div
                        className="absolute top-1/2 left-1/2 w-[250px] h-[250px] origin-top-left bg-gradient-to-br from-green-500/20 to-transparent"
                        style={{ x: '-0%', y: '-0%' }} // Pivot at center
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <span className="flex h-3 w-3 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                            <h2 className="text-sm font-mono text-green-400 tracking-widest uppercase">Whale Radar Active</h2>
                        </div>
                        <h1 className="text-4xl font-black tracking-tighter">
                            ${data.currentPrice.toFixed(2)}
                        </h1>
                        <p className="text-xs text-gray-400 mt-2 font-mono">
                            LIQUIDITY SCAN: {secondsAgo}s AGO • SESSION: {data.session.toUpperCase()}
                        </p>
                    </div>

                    {/* Sentiment Gauge */}
                    <div className="flex items-center gap-6 bg-white/5 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
                        <div className="text-center">
                            <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Smart Money Bias</div>
                            <div className={`text-xl font-black ${bias === 'NET LONG' ? 'text-green-400' : bias === 'NET SHORT' ? 'text-red-400' : 'text-gray-200'}`}>
                                {bias}
                            </div>
                        </div>
                        <div className="h-10 w-px bg-white/10" />
                        <div className="flex flex-col gap-1 w-32">
                            <div className="flex justify-between text-[10px] font-mono">
                                <span className="text-green-400">B: {Math.round(buyPct)}%</span>
                                <span className="text-red-400">S: {Math.round(sellPct)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-700 rounded-full overflow-hidden flex">
                                <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${buyPct}%` }} />
                                <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${sellPct}%` }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ CONTROLS ═══ */}
            <div className="flex items-center justify-between px-2">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <span className="text-xl">📊</span> Institutional Volume Depth
                </h3>
                <button
                    onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${isVoiceEnabled ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-500/20' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                >
                    {isVoiceEnabled ? '🎙️ VOICE ALERT: ON' : '🔇 VOICE ALERT: OFF'}
                </button>
            </div>


            {/* ═══ 2. INSTITUTIONAL ZONES (ORDER BOOK STYLE) ═══ */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* DEMAND / BUY SIDE */}
                <div className="bg-white rounded-2xl border border-green-100 shadow-lg shadow-green-900/5 overflow-hidden">
                    <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Demand Zones (Bids)</span>
                        <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded">
                            Total: {buyZones.length}
                        </span>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {buyZones.slice(0, 8).map((zone, i) => (
                            <OrderBookRow key={zone.price} zone={zone} type="buy" currentPrice={data.currentPrice} />
                        ))}
                    </div>
                </div>

                {/* SUPPLY / SELL SIDE */}
                <div className="bg-white rounded-2xl border border-red-100 shadow-lg shadow-red-900/5 overflow-hidden">
                    <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Supply Zones (Asks)</span>
                        <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">
                            Total: {sellZones.length}
                        </span>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {sellZones.slice(0, 8).map((zone, i) => (
                            <OrderBookRow key={zone.price} zone={zone} type="sell" currentPrice={data.currentPrice} />
                        ))}
                    </div>
                </div>
            </div>

            {/* ═══ NEUTRAL ZONES (Collapsed) ═══ */}
            {neutralZones.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                    <button
                        onClick={() => setShowNeutral(!showNeutral)}
                        className="text-xs font-medium text-gray-400 hover:text-gray-600 flex items-center gap-1 mx-auto"
                    >
                        {showNeutral ? 'Hide Neutral Zones' : `Show ${neutralZones.length} Neutral Zones`}
                    </button>
                    <AnimatePresence>
                        {showNeutral && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4"
                            >
                                {neutralZones.slice(0, 6).map((zone) => (
                                    <div key={zone.price} className="bg-gray-50 rounded p-2 flex justify-between text-xs text-gray-500">
                                        <span>${zone.price.toFixed(2)}</span>
                                        <span>{Math.round(zone.probability * 100)}%</span>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════
// Order Book Row (New VVIP Visual)
// ═══════════════════════════════════════════════

function OrderBookRow({ zone, type, currentPrice }: {
    zone: ProbabilityZone;
    type: 'buy' | 'sell';
    currentPrice: number;
}) {
    const isNear = Math.abs(zone.price - currentPrice) < currentPrice * 0.001;
    const pct = Math.round(zone.probability * 100);
    const isWhale = zone.probability >= 0.8;

    return (
        <div className={`relative px-4 py-2.5 flex items-center justify-between group ${isNear ? 'bg-amber-50' : 'hover:bg-gray-50'}`}>
            {/* Volume Bar Background */}
            <div
                className={`absolute inset-y-0 ${type === 'buy' ? 'left-0 bg-green-100' : 'right-0 bg-red-100'} transition-all duration-1000 ease-out`}
                style={{
                    width: `${pct * 0.8}%`, // Max 80% width
                    opacity: 0.3
                }}
            />

            {/* Price */}
            <div className="relative z-10 flex items-center gap-3">
                <span className={`font-mono font-bold text-sm ${type === 'buy' ? 'text-green-700' : 'text-red-700'}`}>
                    {zone.price.toFixed(2)}
                </span>
                {isWhale && (
                    <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-600 rounded border border-purple-200 animate-pulse">
                        Whale
                    </span>
                )}
            </div>

            {/* Interest/Vol */}
            <div className="relative z-10 flex items-center gap-2">
                <div className="text-right">
                    <div className="text-xs font-bold text-gray-600">{pct}% Interest</div>
                    <div className="text-[10px] text-gray-400">{isNear ? '⚠️ APPROACHING' : 'Pending'}</div>
                </div>
            </div>
        </div>
    );
}
