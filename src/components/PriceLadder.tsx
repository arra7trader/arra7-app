'use client';

import { motion } from 'framer-motion';

interface CalculatedLevel {
    level: number;
    price: string;
    label: string;
    desc: string;
    color: string;
    width?: number;
    style?: number;
}

interface PriceLadderProps {
    levels: CalculatedLevel[];
    currentPrice: number | null;
    trend: 'UP' | 'DOWN';
}

export default function PriceLadder({ levels, currentPrice, trend }: PriceLadderProps) {
    // Sort levels by price (highest to lowest)
    const sortedLevels = [...levels].sort((a, b) => parseFloat(b.price) - parseFloat(a.price));

    // Find current zone (where price is between two levels)
    const getCurrentZoneIndex = () => {
        if (!currentPrice) return -1;
        for (let i = 0; i < sortedLevels.length - 1; i++) {
            const upper = parseFloat(sortedLevels[i].price);
            const lower = parseFloat(sortedLevels[i + 1].price);
            if (currentPrice <= upper && currentPrice >= lower) {
                return i;
            }
        }
        return -1;
    };

    const currentZoneIndex = getCurrentZoneIndex();

    return (
        <div className="relative">
            {/* Current Price Badge - Floating */}
            {currentPrice && (
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="sticky top-4 z-20 mb-6"
                >
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-4 shadow-2xl border-2 border-blue-400">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-xs font-bold opacity-80 mb-1">💰 CURRENT PRICE</div>
                                <div className="text-3xl font-mono font-bold">{currentPrice.toFixed(2)}</div>
                            </div>
                            <div className="text-5xl animate-pulse">📍</div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Price Ladder */}
            <div className="space-y-3">
                {sortedLevels.map((level, index) => {
                    const levelPrice = parseFloat(level.price);
                    const distance = currentPrice ? Math.abs(currentPrice - levelPrice) : null;
                    const isAbove = currentPrice ? currentPrice > levelPrice : false;
                    const percentDiff = currentPrice ? (distance! / currentPrice) * 100 : 0;
                    const isNear = percentDiff < 0.2; // Within 0.2%
                    const isActive = percentDiff < 0.1; // Within 0.1%
                    const isCurrentZone = index === currentZoneIndex;

                    // Status badges
                    let statusBadge = '';
                    let statusColor = 'bg-gray-100 text-gray-600';

                    if (isActive) {
                        statusBadge = '⚡ ACTIVE';
                        statusColor = 'bg-green-100 text-green-700 border-2 border-green-400';
                    } else if (isNear) {
                        statusBadge = '🔥 NEAR';
                        statusColor = 'bg-orange-100 text-orange-700 border-2 border-orange-400';
                    } else if (
                        (trend === 'UP' && currentPrice && currentPrice > levelPrice) ||
                        (trend === 'DOWN' && currentPrice && currentPrice < levelPrice)
                    ) {
                        statusBadge = '🔴 BREACHED';
                        statusColor = 'bg-red-100 text-red-700';
                    } else {
                        statusBadge = '⚪ PENDING';
                    }

                    return (
                        <motion.div
                            key={level.level}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`relative ${isCurrentZone ? 'scale-105' : ''}`}
                        >
                            {/* Current Zone Indicator */}
                            {isCurrentZone && currentPrice && (
                                <div className="absolute -left-8 top-1/2 -translate-y-1/2 text-3xl animate-bounce z-10">
                                    👉
                                </div>
                            )}

                            {/* Zone Rung */}
                            <div
                                className={`relative overflow-hidden rounded-2xl transition-all duration-300 ${isActive
                                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-4 border-green-400 shadow-xl shadow-green-200'
                                        : isNear
                                            ? 'bg-gradient-to-r from-orange-50 to-yellow-50 border-4 border-orange-400 shadow-lg shadow-orange-200'
                                            : isCurrentZone
                                                ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 shadow-lg'
                                                : 'bg-white border-2 border-gray-200 hover:border-gray-300 shadow-md'
                                    }`}
                            >
                                {/* Color Strip Left */}
                                <div
                                    className="absolute left-0 top-0 bottom-0 w-2"
                                    style={{ backgroundColor: level.color }}
                                />

                                <div className="p-4 pl-6">
                                    <div className="flex items-center justify-between gap-4">
                                        {/* Zone Info */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-lg font-bold text-gray-900">{level.label}</h3>
                                                {statusBadge && (
                                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${statusColor}`}>
                                                        {statusBadge}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 mb-2">{level.desc}</p>

                                            {/* Price */}
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-2xl font-mono font-bold text-gray-900">
                                                    {level.price}
                                                </span>
                                                {distance !== null && (
                                                    <span className={`text-sm font-bold ${isAbove ? 'text-blue-600' : 'text-purple-600'}`}>
                                                        {isAbove ? '↑' : '↓'} {distance.toFixed(2)} pips ({percentDiff.toFixed(2)}%)
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(level.price);
                                                }}
                                                className="px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-bold transition flex items-center gap-2"
                                            >
                                                📋 Copy
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Progress Bar - Distance Visualization */}
                                {currentPrice && (
                                    <div className="h-1.5 bg-gray-100">
                                        <div
                                            className={`h-full transition-all duration-500 ${isActive
                                                    ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                                                    : isNear
                                                        ? 'bg-gradient-to-r from-orange-400 to-yellow-500'
                                                        : 'bg-gradient-to-r from-blue-400 to-indigo-500'
                                                }`}
                                            style={{
                                                width: `${Math.min(100 - percentDiff * 10, 100)}%`,
                                            }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Connector Line (except for last item) */}
                            {index < sortedLevels.length - 1 && (
                                <div className="flex justify-center py-2">
                                    <div className="w-0.5 h-6 bg-gradient-to-b from-gray-300 to-gray-200" />
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
