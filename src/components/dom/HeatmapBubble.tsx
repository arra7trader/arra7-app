'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { OrderBook, OrderBookLevel } from '@/types/dom';

interface HeatmapBubbleProps {
    orderBook: OrderBook | null;
    flowHistory: FlowDataPoint[];
    height?: number;
}

export interface FlowDataPoint {
    timestamp: number;
    buyVolume: number;
    sellVolume: number;
    imbalance: number;
    price: number;
}

// Color interpolation for heatmap
function getHeatColor(intensity: number, isBid: boolean): string {
    // intensity: 0-100
    const alpha = Math.min(0.9, 0.2 + (intensity / 100) * 0.7);
    if (isBid) {
        // Green for bids - darker = more volume
        return `rgba(34, 197, 94, ${alpha})`; // green-500
    } else {
        // Red for asks
        return `rgba(239, 68, 68, ${alpha})`; // red-500
    }
}

// Bubble component for large orders
function OrderBubble({
    level,
    isBid,
    maxVolume
}: {
    level: OrderBookLevel;
    isBid: boolean;
    maxVolume: number;
}) {
    // Size based on volume (min 12px, max 60px)
    const size = Math.max(12, Math.min(60, (level.volume / maxVolume) * 60));
    const isWhale = level.percentage > 50;

    return (
        <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative group"
            style={{
                width: size,
                height: size,
            }}
        >
            <div
                className={`absolute inset-0 rounded-full ${isBid
                        ? 'bg-gradient-to-br from-green-400 to-green-600'
                        : 'bg-gradient-to-br from-red-400 to-red-600'
                    } ${isWhale ? 'animate-pulse shadow-lg' : ''}`}
                style={{
                    boxShadow: isWhale
                        ? `0 0 20px ${isBid ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`
                        : undefined
                }}
            />
            {isWhale && (
                <span className="absolute -top-1 -right-1 text-xs">🐋</span>
            )}

            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                <p className="font-bold">${level.price.toFixed(2)}</p>
                <p>Vol: {level.volume.toFixed(4)}</p>
            </div>
        </motion.div>
    );
}

// Running Flow Chart component
export function OrderFlowChart({
    data,
    width,
    height
}: {
    data: FlowDataPoint[];
    width: number;
    height: number;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || data.length < 2) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Background
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, width, height);

        // Center line
        const centerY = height / 2;
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();

        // Calculate scale
        const maxImbalance = Math.max(...data.map(d => Math.abs(d.imbalance)), 50);
        const pointWidth = width / Math.max(data.length - 1, 1);

        // Draw filled area
        ctx.beginPath();
        ctx.moveTo(0, centerY);

        data.forEach((point, i) => {
            const x = i * pointWidth;
            const y = centerY - (point.imbalance / maxImbalance) * (height / 2 - 10);

            if (i === 0) {
                ctx.lineTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        // Close the path back to center
        ctx.lineTo(width, centerY);
        ctx.closePath();

        // Create gradient fill
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(34, 197, 94, 0.3)');
        gradient.addColorStop(0.5, 'rgba(200, 200, 200, 0.1)');
        gradient.addColorStop(1, 'rgba(239, 68, 68, 0.3)');
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw the line
        ctx.beginPath();
        data.forEach((point, i) => {
            const x = i * pointWidth;
            const y = centerY - (point.imbalance / maxImbalance) * (height / 2 - 10);

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.strokeStyle = data[data.length - 1]?.imbalance >= 0 ? '#22c55e' : '#ef4444';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw bubbles for significant changes
        data.forEach((point, i) => {
            if (Math.abs(point.imbalance) > 30) {
                const x = i * pointWidth;
                const y = centerY - (point.imbalance / maxImbalance) * (height / 2 - 10);
                const size = Math.abs(point.imbalance) / 10;

                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fillStyle = point.imbalance > 0 ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)';
                ctx.fill();
            }
        });

    }, [data, width, height]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="rounded-lg"
        />
    );
}

// Main Heatmap Bubble Component
export function HeatmapBubbleChart({ orderBook, flowHistory, height = 300 }: HeatmapBubbleProps) {
    const [chartWidth, setChartWidth] = useState(600);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                setChartWidth(containerRef.current.offsetWidth);
            }
        };
        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    const maxVolume = useMemo(() => {
        if (!orderBook) return 1;
        const allVolumes = [...orderBook.bids, ...orderBook.asks].map(l => l.volume);
        return Math.max(...allVolumes, 0.001);
    }, [orderBook]);

    if (!orderBook) {
        return (
            <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p>Loading heatmap...</p>
                </div>
            </div>
        );
    }

    // Get top 10 levels for bubble display
    const topBids = orderBook.bids.slice(0, 10);
    const topAsks = orderBook.asks.slice(0, 10);

    // Current imbalance status
    const imbalance = orderBook.imbalance;
    const direction = imbalance > 20 ? 'BUYERS' : imbalance < -20 ? 'SELLERS' : 'NEUTRAL';
    const lastFlow = flowHistory[flowHistory.length - 1];

    return (
        <div className="space-y-4" ref={containerRef}>
            {/* Header with current status */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={`px-3 py-1 rounded-full text-sm font-bold ${direction === 'BUYERS' ? 'bg-green-100 text-green-700' :
                            direction === 'SELLERS' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-700'
                        }`}>
                        {direction === 'BUYERS' && '📈 '}
                        {direction === 'SELLERS' && '📉 '}
                        {direction === 'NEUTRAL' && '➡️ '}
                        {direction}
                    </div>
                    <span className="text-sm text-[var(--text-muted)]">
                        Imbalance: <span className={imbalance >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {imbalance > 0 ? '+' : ''}{imbalance.toFixed(1)}%
                        </span>
                    </span>
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                    {flowHistory.length} data points
                </div>
            </div>

            {/* Running Flow Chart */}
            <div className="bg-white rounded-xl border border-[var(--border-light)] p-4">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                        📊 Order Flow Timeline
                    </h4>
                    <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                            Buyers
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                            Sellers
                        </span>
                    </div>
                </div>
                <OrderFlowChart
                    data={flowHistory}
                    width={chartWidth - 32}
                    height={120}
                />
            </div>

            {/* Bubble Visualization */}
            <div className="bg-white rounded-xl border border-[var(--border-light)] p-4">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
                    🔮 Liquidity Bubbles
                </h4>

                {/* Visual representation */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Bid bubbles (left) */}
                    <div className="bg-green-50/50 rounded-xl p-4">
                        <div className="text-xs text-green-700 mb-3 font-medium">
                            BUY ORDERS ({orderBook.totalBidVolume.toFixed(2)})
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center items-end h-24">
                            {topBids.slice(0, 8).map((level, i) => (
                                <OrderBubble
                                    key={`bid-${i}`}
                                    level={level}
                                    isBid={true}
                                    maxVolume={maxVolume}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Ask bubbles (right) */}
                    <div className="bg-red-50/50 rounded-xl p-4">
                        <div className="text-xs text-red-700 mb-3 font-medium">
                            SELL ORDERS ({orderBook.totalAskVolume.toFixed(2)})
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center items-end h-24">
                            {topAsks.slice(0, 8).map((level, i) => (
                                <OrderBubble
                                    key={`ask-${i}`}
                                    level={level}
                                    isBid={false}
                                    maxVolume={maxVolume}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Legend */}
                <div className="mt-4 flex items-center justify-center gap-6 text-xs text-[var(--text-muted)]">
                    <span className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-green-400 to-green-600"></div>
                        Large = High Volume
                    </span>
                    <span className="flex items-center gap-1">
                        🐋 = Whale Order
                    </span>
                    <span className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                        Small = Low Volume
                    </span>
                </div>
            </div>

            {/* Heatmap Grid */}
            <div className="bg-white rounded-xl border border-[var(--border-light)] p-4">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
                    🔥 Depth Heatmap
                </h4>
                <div className="grid grid-cols-2 gap-1">
                    {/* Bids heatmap */}
                    <div className="space-y-1">
                        {topBids.slice(0, 10).map((level, i) => (
                            <div
                                key={`bid-heat-${i}`}
                                className="flex items-center gap-2 rounded px-2 py-1"
                                style={{ backgroundColor: getHeatColor(level.percentage, true) }}
                            >
                                <span className="text-xs font-mono text-green-800 w-20">
                                    ${level.price.toFixed(2)}
                                </span>
                                <div className="flex-1 h-2 bg-green-200/50 rounded overflow-hidden">
                                    <motion.div
                                        className="h-full bg-green-600"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${level.percentage}%` }}
                                    />
                                </div>
                                <span className="text-xs text-green-800 w-16 text-right">
                                    {level.volume.toFixed(3)}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Asks heatmap */}
                    <div className="space-y-1">
                        {topAsks.slice(0, 10).map((level, i) => (
                            <div
                                key={`ask-heat-${i}`}
                                className="flex items-center gap-2 rounded px-2 py-1"
                                style={{ backgroundColor: getHeatColor(level.percentage, false) }}
                            >
                                <span className="text-xs font-mono text-red-800 w-20">
                                    ${level.price.toFixed(2)}
                                </span>
                                <div className="flex-1 h-2 bg-red-200/50 rounded overflow-hidden">
                                    <motion.div
                                        className="h-full bg-red-600"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${level.percentage}%` }}
                                    />
                                </div>
                                <span className="text-xs text-red-800 w-16 text-right">
                                    {level.volume.toFixed(3)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default HeatmapBubbleChart;
