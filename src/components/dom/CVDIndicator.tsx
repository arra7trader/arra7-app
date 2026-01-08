'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { OrderBook } from '@/types/dom';
import { HeatmapDataPoint } from './HeatmapBubble';

interface CVDIndicatorProps {
    history: HeatmapDataPoint[];
    currentOrderBook: OrderBook | null;
    height?: number;
}

interface CVDDataPoint {
    timestamp: number;
    delta: number;           // Single point delta (buy - sell)
    cumulative: number;      // Cumulative delta
    price: number;           // Price at that moment
}

/**
 * Calculate CVD (Cumulative Volume Delta) from order book history
 * CVD = Cumulative (Buy Volume - Sell Volume)
 * Positive CVD = More aggressive buying
 * Negative CVD = More aggressive selling
 */
function calculateCVD(history: HeatmapDataPoint[]): CVDDataPoint[] {
    if (history.length === 0) return [];

    const cvdData: CVDDataPoint[] = [];
    let cumulative = 0;

    history.forEach((point, i) => {
        const book = point.orderBook;

        // Calculate volume delta from imbalance
        // Positive imbalance = more bid volume = buying pressure
        const totalVolume = book.totalBidVolume + book.totalAskVolume;
        const delta = (book.totalBidVolume - book.totalAskVolume);

        cumulative += delta;

        cvdData.push({
            timestamp: point.timestamp,
            delta,
            cumulative,
            price: book.midPrice
        });
    });

    return cvdData;
}

/**
 * Detect divergence between price and CVD
 * - Price up + CVD down = Bearish divergence (weakness)
 * - Price down + CVD up = Bullish divergence (strength)
 */
function detectDivergence(cvdData: CVDDataPoint[], lookback: number = 20): 'BULLISH' | 'BEARISH' | 'NONE' {
    if (cvdData.length < lookback) return 'NONE';

    const recent = cvdData.slice(-lookback);
    const first = recent[0];
    const last = recent[recent.length - 1];

    const priceChange = last.price - first.price;
    const cvdChange = last.cumulative - first.cumulative;

    const priceUp = priceChange > 0;
    const cvdUp = cvdChange > 0;

    // Divergence occurs when price and CVD move in opposite directions
    if (priceUp && !cvdUp && Math.abs(cvdChange) > 0.1) {
        return 'BEARISH'; // Price rising but buying pressure decreasing
    }
    if (!priceUp && cvdUp && Math.abs(cvdChange) > 0.1) {
        return 'BULLISH'; // Price falling but buying pressure increasing
    }

    return 'NONE';
}

export default function CVDIndicator({ history, currentOrderBook, height = 150 }: CVDIndicatorProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height });

    // Calculate CVD data
    const cvdData = useMemo(() => calculateCVD(history), [history]);
    const divergence = useMemo(() => detectDivergence(cvdData), [cvdData]);

    // Current CVD stats
    const currentCVD = cvdData.length > 0 ? cvdData[cvdData.length - 1].cumulative : 0;
    const cvdTrend = cvdData.length > 1
        ? cvdData[cvdData.length - 1].cumulative - cvdData[Math.max(0, cvdData.length - 10)].cumulative
        : 0;

    // Resize handler
    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                const { width } = containerRef.current.getBoundingClientRect();
                setDimensions({ width, height });
            }
        };

        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, [height]);

    // Draw CVD chart
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || cvdData.length === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width, height } = dimensions;
        const PADDING = { left: 50, right: 20, top: 20, bottom: 30 };
        const chartWidth = width - PADDING.left - PADDING.right;
        const chartHeight = height - PADDING.top - PADDING.bottom;

        // Clear canvas
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);

        // Calculate scales
        const maxCVD = Math.max(...cvdData.map(d => Math.abs(d.cumulative)), 0.001);
        const minCVD = -maxCVD;
        const getY = (value: number) =>
            PADDING.top + chartHeight * (1 - (value - minCVD) / (maxCVD - minCVD));
        const getX = (index: number) =>
            PADDING.left + (index / (cvdData.length - 1 || 1)) * chartWidth;

        // Draw zero line
        const zeroY = getY(0);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(PADDING.left, zeroY);
        ctx.lineTo(width - PADDING.right, zeroY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw axis labels
        ctx.fillStyle = '#64748b';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(maxCVD.toFixed(2), PADDING.left - 5, PADDING.top + 10);
        ctx.fillText('0', PADDING.left - 5, zeroY + 3);
        ctx.fillText(minCVD.toFixed(2), PADDING.left - 5, height - PADDING.bottom - 5);

        // Draw CVD line with gradient fill
        ctx.beginPath();
        ctx.moveTo(getX(0), getY(cvdData[0].cumulative));
        cvdData.forEach((point, i) => {
            ctx.lineTo(getX(i), getY(point.cumulative));
        });

        // Line stroke
        ctx.strokeStyle = currentCVD >= 0 ? '#22c55e' : '#ef4444';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Fill to zero line
        const fillPath = new Path2D();
        fillPath.moveTo(getX(0), zeroY);
        cvdData.forEach((point, i) => {
            fillPath.lineTo(getX(i), getY(point.cumulative));
        });
        fillPath.lineTo(getX(cvdData.length - 1), zeroY);
        fillPath.closePath();

        const gradient = ctx.createLinearGradient(0, PADDING.top, 0, height - PADDING.bottom);
        if (currentCVD >= 0) {
            gradient.addColorStop(0, 'rgba(34, 197, 94, 0.3)');
            gradient.addColorStop(0.5, 'rgba(34, 197, 94, 0.1)');
            gradient.addColorStop(1, 'rgba(239, 68, 68, 0.1)');
        } else {
            gradient.addColorStop(0, 'rgba(34, 197, 94, 0.1)');
            gradient.addColorStop(0.5, 'rgba(239, 68, 68, 0.1)');
            gradient.addColorStop(1, 'rgba(239, 68, 68, 0.3)');
        }
        ctx.fillStyle = gradient;
        ctx.fill(fillPath);

        // Draw current value indicator
        if (cvdData.length > 0) {
            const lastPoint = cvdData[cvdData.length - 1];
            const lastX = getX(cvdData.length - 1);
            const lastY = getY(lastPoint.cumulative);

            // Dot
            ctx.beginPath();
            ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
            ctx.fillStyle = currentCVD >= 0 ? '#22c55e' : '#ef4444';
            ctx.fill();

            // Value label
            ctx.fillStyle = currentCVD >= 0 ? '#22c55e' : '#ef4444';
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(lastPoint.cumulative.toFixed(3), lastX + 10, lastY + 4);
        }

        // Draw time axis
        ctx.fillStyle = '#64748b';
        ctx.font = '9px Inter, sans-serif';
        ctx.textAlign = 'center';
        const timeIntervals = 5;
        for (let i = 0; i <= timeIntervals; i++) {
            const index = Math.floor((i / timeIntervals) * (cvdData.length - 1));
            if (cvdData[index]) {
                const x = getX(index);
                const time = new Date(cvdData[index].timestamp).toLocaleTimeString('en-US', {
                    hour12: false, hour: '2-digit', minute: '2-digit'
                });
                ctx.fillText(time, x, height - 10);
            }
        }

    }, [cvdData, dimensions, currentCVD]);

    if (!currentOrderBook || cvdData.length === 0) {
        return (
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4" style={{ height }}>
                <div className="flex items-center justify-center h-full text-slate-500">
                    <div className="text-center">
                        <div className="w-6 h-6 border-2 border-slate-600 border-t-blue-500 animate-spin rounded-full mx-auto mb-2" />
                        <span className="text-sm">Collecting CVD data...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">📊 CVD (Cumulative Volume Delta)</span>
                    {divergence !== 'NONE' && (
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${divergence === 'BULLISH'
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-red-500/20 text-red-400'
                                }`}
                        >
                            {divergence === 'BULLISH' ? '📈 Bullish Divergence' : '📉 Bearish Divergence'}
                        </motion.span>
                    )}
                </div>
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                        <span className="text-slate-400">Current:</span>
                        <span className={`font-bold ${currentCVD >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {currentCVD >= 0 ? '+' : ''}{currentCVD.toFixed(3)}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-slate-400">Trend:</span>
                        <span className={`font-bold ${cvdTrend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {cvdTrend >= 0 ? '↑' : '↓'} {Math.abs(cvdTrend).toFixed(4)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <canvas
                ref={canvasRef}
                width={dimensions.width}
                height={dimensions.height}
                className="block"
            />

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 px-4 py-2 border-t border-slate-800 text-xs text-slate-400">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                    <span>Buying Pressure</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-500 rounded-full" />
                    <span>Selling Pressure</span>
                </div>
                <div className="flex items-center gap-1">
                    <span>⚡</span>
                    <span>Divergence = Potential Reversal</span>
                </div>
            </div>
        </div>
    );
}
