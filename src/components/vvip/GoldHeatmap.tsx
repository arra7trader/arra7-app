'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

interface ProbabilityZone {
    price: number;
    probability: number; // 0.3 to 0.98
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
// Component: Gold Probability Heatmap
// ═══════════════════════════════════════════════

export default function GoldHeatmap() {
    const [data, setData] = useState<HeatmapData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
    const containerRef = useRef<HTMLDivElement>(null);

    // Fetch data loop
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/xauusd/probability-zones');
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                    setLastUpdate(new Date());
                }
            } catch (error) {
                console.error('Failed to fetch heatmap data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 3000); // Update every 3s
        return () => clearInterval(interval);
    }, []);

    if (isLoading && !data) {
        return (
            <div className="w-full h-[600px] flex items-center justify-center bg-white rounded-2xl border border-[var(--border-light)]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-gray-400 font-medium">Initializing AI Engine...</span>
                </div>
            </div>
        );
    }

    if (!data) return null;

    // Calculate view range (current price ± range)
    // We want to center the current price
    const range = data.atr * 3; // Show 3 ATRs up and down
    const maxPrice = data.currentPrice + range;
    const minPrice = data.currentPrice - range;
    const pixelHeight = 600;
    const priceRange = maxPrice - minPrice;

    // Helper to map price to Y position (0 is top, heigth is bottom)
    const getY = (price: number) => {
        const relative = (maxPrice - price) / priceRange;
        return relative * pixelHeight;
    };

    // Filter zones to visible range only for performance
    const visibleZones = data.zones.filter(z => z.price >= minPrice && z.price <= maxPrice);

    return (
        <div className="flex flex-col gap-4">
            {/* Header Info */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-[var(--border-light)] shadow-sm">
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
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span className="flex items-center gap-1" title="Data freshness">
                                🕒 {Math.floor((new Date().getTime() - lastUpdate.getTime()) / 1000)}s ago
                            </span>
                            <span className="w-1 h-1 bg-gray-300 rounded-full" />
                            <span className="flex items-center gap-1" title="Active Market Session">
                                {data.sessionEmoji} {data.session}
                            </span>
                            <span className="w-1 h-1 bg-gray-300 rounded-full" />
                            <span title="Data Source">
                                📡 {data.dataSource === 'swissquote' ? 'Swissquote Bank' : 'Yahoo Finance'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end">
                    <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-yellow-600 font-mono tracking-tight">
                        {data.currentPrice.toFixed(2)}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium">
                        <span className="text-red-500">L: {data.low24h.toFixed(2)}</span>
                        <span className="text-gray-300">|</span>
                        <span className="text-green-500">H: {data.high24h.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Main Heatmap Visualization */}
            <div
                ref={containerRef}
                className="relative w-full h-[600px] bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl"
                style={{
                    background: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)'
                }}
            >
                {/* 1. Grid Lines */}
                {Array.from({ length: 10 }).map((_, i) => {
                    const p = minPrice + (i * (priceRange / 10));
                    const y = getY(p);
                    return (
                        <div key={i} className="absolute w-full h-[1px] bg-slate-800/50" style={{ top: y }}>
                            <span className="absolute right-2 -top-3 text-[10px] text-slate-600 font-mono">
                                {p.toFixed(2)}
                            </span>
                        </div>
                    );
                })}

                {/* 2. Probability Zones (The Heatmap) */}
                <div className="absolute inset-0 transition-opacity duration-500">
                    {visibleZones.map((zone, i) => {
                        const y = getY(zone.price);
                        const height = (data.atr * 0.4 / priceRange) * pixelHeight;

                        // Color logic
                        let color = '255, 255, 255'; // default
                        if (zone.bias === 'LONG') color = '34, 197, 94'; // green
                        if (zone.bias === 'SHORT') color = '239, 68, 68'; // red
                        if (zone.bias === 'NEUTRAL') color = '234, 179, 8'; // yellow/amber

                        // Opacity based on probability (0.3 -> 0.1, 0.9 -> 0.8)
                        const opacity = Math.max(0.05, (zone.probability - 0.3) * 1.5);

                        return (
                            <motion.div
                                key={`${zone.price}-${i}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity }}
                                transition={{ duration: 0.5 }}
                                className="absolute left-0 right-16 blur-sm"
                                style={{
                                    top: y - (height / 2),
                                    height: height * 1.5, // Slight overlap for smooth look
                                    background: `rgba(${color}, 1)`,
                                    boxShadow: `0 0 20px rgba(${color}, 0.5)`
                                }}
                            />
                        );
                    })}
                </div>

                {/* 3. Current Price Line */}
                <motion.div
                    className="absolute left-0 right-0 flex items-center z-20"
                    animate={{ top: getY(data.currentPrice) }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                    <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-amber-400 to-amber-400 opacity-80" />
                    <div className="h-[2px] w-16 bg-amber-400" />
                    <div className="relative -mr-4">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                        </span>
                    </div>
                </motion.div>

                {/* 4. Price Label Tag */}
                <motion.div
                    className="absolute right-0 bg-amber-500 text-black text-xs font-bold px-2 py-1 rounded-l-md z-30 shadow-lg font-mono"
                    animate={{ top: getY(data.currentPrice) - 12 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                    {data.currentPrice.toFixed(2)}
                </motion.div>

                {/* 5. Overlay Info */}
                <div className="absolute top-4 left-4 p-4 bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-700/50 z-10 max-w-xs">
                    <h3 className="text-amber-400 font-bold text-sm mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                        Probability Engine Active
                    </h3>
                    <div className="space-y-2 text-xs text-slate-300">
                        <div className="flex justify-between">
                            <span>Strongest Long Zone:</span>
                            <span className="text-green-400 font-mono">
                                {data.zones.filter(z => z.bias === 'LONG').sort((a, b) => b.probability - a.probability)[0]?.price.toFixed(2) || 'N/A'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>Strongest Short Zone:</span>
                            <span className="text-red-400 font-mono">
                                {data.zones.filter(z => z.bias === 'SHORT').sort((a, b) => b.probability - a.probability)[0]?.price.toFixed(2) || 'N/A'}
                            </span>
                        </div>
                        <div className="flex justify-between border-t border-slate-700 pt-2 mt-2">
                            <span>Volatility (ATR):</span>
                            <span className="text-slate-400">{data.atr.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* 6. Legend */}
                <div className="absolute bottom-4 left-4 flex gap-4 text-[10px] text-slate-400 font-medium z-10">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-green-500/80 shadow-[0_0_10px_rgba(34,197,94,0.4)]" />
                        High Probability Buy Area
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.4)]" />
                        High Probability Sell Area
                    </div>
                </div>

                {data.dataSource === 'swissquote' && (
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-50 text-[10px] text-slate-500">
                        <img src="/icons/swissquote_logo_placeholder.png" alt="" className="w-3 h-3 grayscale" onError={(e) => e.currentTarget.style.display = 'none'} />
                        Data by Swissquote
                    </div>
                )}
            </div>

            <p className="text-center text-xs text-gray-400 mt-2">
                *Probability zones are generated by LSTM + Rule-based ensemble models. Past performance does not guarantee future results.
            </p>
        </div>
    );
}
