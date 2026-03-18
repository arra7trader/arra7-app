'use client';

import { useMemo } from 'react';

// Zone Configuration
const ZONE_CONFIG = [
    { startLevel: 0.559, endLevel: 0.619, color: 'bg-green-500/20', borderColor: 'border-green-500', name: 'Entry Zone', emoji: '🎯' },
    { startLevel: 0.786, endLevel: 0.882, color: 'bg-yellow-500/20', borderColor: 'border-yellow-500', name: 'Reversal Zone', emoji: '⚠️' },
    { startLevel: 1.124, endLevel: 1.272, color: 'bg-orange-500/20', borderColor: 'border-orange-500', name: 'Breakout Zone', emoji: '🚀' },
    { startLevel: 1.618, endLevel: 2.0, color: 'bg-blue-500/15', borderColor: 'border-blue-500', name: 'Target Zone 1', emoji: '💰' },
    { startLevel: 2.0, endLevel: 2.618, color: 'bg-purple-500/15', borderColor: 'border-purple-500', name: 'Target Zone 2', emoji: '🌙' },
];

interface ZoneVisualChartProps {
    levels: Array<{
        level: number;
        price: string;
        label: string;
        color: string;
        desc: string;
    }>;
    trend: 'UP' | 'DOWN';
}

export default function ZoneVisualChart({ levels, trend }: ZoneVisualChartProps) {
    // Get price by level
    const getPriceForLevel = (lvl: number) => {
        const found = levels.find(l => l.level === lvl);
        return found ? parseFloat(found.price) : null;
    };

    // Calculate all prices and find range
    const { minPrice, maxPrice, sortedLevels } = useMemo(() => {
        if (levels.length === 0) return { minPrice: 0, maxPrice: 0, sortedLevels: [] };

        const prices = levels.map(l => parseFloat(l.price)).filter(p => !isNaN(p));
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const range = max - min;

        // Add padding
        const sorted = [...levels].sort((a, b) => parseFloat(b.price) - parseFloat(a.price));

        return {
            minPrice: min - range * 0.1,
            maxPrice: max + range * 0.1,
            sortedLevels: sorted
        };
    }, [levels]);

    // Convert price to percentage position (0% = top, 100% = bottom)
    const priceToPercent = (price: number) => {
        if (maxPrice === minPrice) return 50;
        return ((maxPrice - price) / (maxPrice - minPrice)) * 100;
    };

    // Build zones with calculated positions
    const zones = useMemo(() => {
        return ZONE_CONFIG.map(zone => {
            const startPrice = getPriceForLevel(zone.startLevel);
            const endPrice = getPriceForLevel(zone.endLevel);
            if (!startPrice || !endPrice) return null;

            const top = priceToPercent(Math.max(startPrice, endPrice));
            const bottom = priceToPercent(Math.min(startPrice, endPrice));
            const height = bottom - top;

            return {
                ...zone,
                startPrice,
                endPrice,
                top: `${top}%`,
                height: `${height}%`,
            };
        }).filter(Boolean);
    }, [levels, minPrice, maxPrice]);

    if (levels.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-2xl">
                <div className="text-center text-[var(--text-secondary)]">
                    <div className="text-4xl mb-4">📊</div>
                    <div className="font-medium">No Levels Calculated</div>
                    <div className="text-sm">Enter prices and calculate to see zones</div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full bg-gradient-to-b from-gray-900 to-gray-950 rounded-2xl overflow-hidden relative">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-gray-900 via-gray-900 to-transparent">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">{trend === 'UP' ? '📈' : '📉'}</span>
                        <div>
                            <div className={`font-bold ${trend === 'UP' ? 'text-green-400' : 'text-red-400'}`}>
                                {trend === 'UP' ? 'BULLISH' : 'BEARISH'} PROJECTION
                            </div>
                            <div className="text-[10px] text-[var(--text-secondary)]">Fibonacci Kanji Zones</div>
                        </div>
                    </div>
                    <div className="text-[10px] text-[var(--text-secondary)] bg-gray-800 px-3 py-1 rounded-full">
                        Based on Calculation
                    </div>
                </div>
            </div>

            {/* Main Visual Area */}
            <div className="absolute inset-0 pt-20 pb-4 px-4">
                <div className="relative w-full h-full">
                    {/* Zone Boxes */}
                    {zones.map((zone: any, i) => (
                        <div
                            key={i}
                            className={`absolute left-0 right-16 ${zone.color} ${zone.borderColor} border-l-4 rounded-r-lg flex items-center transition-all hover:opacity-80`}
                            style={{ top: zone.top, height: zone.height, minHeight: '24px' }}
                        >
                            <div className="px-3 py-1 text-[11px] font-medium text-white/80 flex items-center gap-2">
                                <span>{zone.emoji}</span>
                                <span>{zone.name}</span>
                            </div>
                        </div>
                    ))}

                    {/* Price Lines */}
                    {sortedLevels.map((lvl, i) => {
                        const price = parseFloat(lvl.price);
                        const top = priceToPercent(price);
                        const isKeyLevel = [0, 1, 0.619, 1.618].includes(lvl.level);

                        return (
                            <div
                                key={i}
                                className="absolute left-0 right-0 flex items-center group"
                                style={{ top: `${top}%`, transform: 'translateY(-50%)' }}
                            >
                                {/* Line */}
                                <div
                                    className={`flex-1 ${isKeyLevel ? 'border-t-2' : 'border-t border-dashed'} transition-all group-hover:border-white/50`}
                                    style={{ borderColor: lvl.color }}
                                />

                                {/* Price Tag */}
                                <div
                                    className={`ml-2 px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer hover:scale-105 ${isKeyLevel ? 'shadow-lg' : ''}`}
                                    style={{
                                        backgroundColor: lvl.color + '33',
                                        color: lvl.color,
                                        border: `1px solid ${lvl.color}66`
                                    }}
                                    onClick={() => {
                                        navigator.clipboard.writeText(lvl.price);
                                    }}
                                    title="Click to copy"
                                >
                                    {lvl.price}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 right-4 z-20">
                <div className="flex flex-wrap gap-2 justify-center">
                    {ZONE_CONFIG.map((zone, i) => (
                        <div key={i} className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)] bg-gray-800/50 px-2 py-1 rounded-full">
                            <span>{zone.emoji}</span>
                            <span>{zone.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
