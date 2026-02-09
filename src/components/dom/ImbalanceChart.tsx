'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { HeatmapDataPoint } from './HeatmapBubble';

interface ImbalanceChartProps {
    history: HeatmapDataPoint[];
    height?: number;
}

interface ImbalanceDataPoint {
    timestamp: number;
    imbalance: number;
    price: number;
}

/**
 * Extract imbalance data from history
 */
function extractImbalanceData(history: HeatmapDataPoint[]): ImbalanceDataPoint[] {
    return history.map(point => ({
        timestamp: point.timestamp,
        imbalance: point.orderBook.imbalance,
        price: point.orderBook.midPrice
    }));
}

/**
 * Calculate moving average of imbalance
 */
function calculateMA(data: ImbalanceDataPoint[], period: number): number[] {
    const ma: number[] = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            ma.push(data[i].imbalance);
        } else {
            const sum = data.slice(i - period + 1, i + 1).reduce((acc, d) => acc + d.imbalance, 0);
            ma.push(sum / period);
        }
    }
    return ma;
}

/**
 * Identify extreme zones
 */
interface ExtremeZone {
    start: number;
    end: number;
    type: 'BUYERS' | 'SELLERS';
}

function findExtremeZones(data: ImbalanceDataPoint[], threshold: number = 60): ExtremeZone[] {
    const zones: ExtremeZone[] = [];
    let currentZone: { start: number; type: 'BUYERS' | 'SELLERS' } | null = null;

    data.forEach((point, i) => {
        const isExtreme = Math.abs(point.imbalance) > threshold;
        const zoneType: 'BUYERS' | 'SELLERS' = point.imbalance > 0 ? 'BUYERS' : 'SELLERS';

        if (isExtreme && !currentZone) {
            currentZone = { start: i, type: zoneType };
        } else if (isExtreme && currentZone && currentZone.type !== zoneType) {
            zones.push({ start: currentZone.start, end: i - 1, type: currentZone.type });
            currentZone = { start: i, type: zoneType };
        } else if (!isExtreme && currentZone) {
            zones.push({ start: currentZone.start, end: i - 1, type: currentZone.type });
            currentZone = null;
        }
    });

    if (currentZone !== null) {
        const finalZone = currentZone as { start: number; type: 'BUYERS' | 'SELLERS' };
        zones.push({ start: finalZone.start, end: data.length - 1, type: finalZone.type });
    }

    return zones;
}

export default function ImbalanceChart({ history, height = 180 }: ImbalanceChartProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height });

    // Extract and process data
    const imbalanceData = useMemo(() => extractImbalanceData(history), [history]);
    const ma20 = useMemo(() => calculateMA(imbalanceData, 20), [imbalanceData]);
    const extremeZones = useMemo(() => findExtremeZones(imbalanceData, 60), [imbalanceData]);

    // Current stats
    const currentImbalance = imbalanceData.length > 0 ? imbalanceData[imbalanceData.length - 1].imbalance : 0;
    const avgImbalance = imbalanceData.length > 0
        ? imbalanceData.reduce((sum, d) => sum + d.imbalance, 0) / imbalanceData.length
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

    // Draw chart
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || imbalanceData.length === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width, height: canvasHeight } = dimensions;
        const PADDING = { left: 50, right: 20, top: 20, bottom: 30 };
        const chartWidth = width - PADDING.left - PADDING.right;
        const chartHeight = canvasHeight - PADDING.top - PADDING.bottom;

        // Clear canvas
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, canvasHeight);

        // Scales
        const maxVal = 100;
        const minVal = -100;
        const getY = (value: number) =>
            PADDING.top + chartHeight * (1 - (value - minVal) / (maxVal - minVal));
        const getX = (index: number) =>
            PADDING.left + (index / (imbalanceData.length - 1 || 1)) * chartWidth;

        // Draw extreme zones first (behind everything)
        extremeZones.forEach(zone => {
            const startX = getX(zone.start);
            const endX = getX(zone.end);
            const width = Math.max(endX - startX, 2);

            ctx.fillStyle = zone.type === 'BUYERS'
                ? 'rgba(34, 197, 94, 0.15)'
                : 'rgba(239, 68, 68, 0.15)';
            ctx.fillRect(startX, PADDING.top, width, chartHeight);
        });

        // Draw threshold lines
        const thresholds = [60, -60];
        thresholds.forEach(t => {
            const y = getY(t);
            ctx.strokeStyle = t > 0 ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(PADDING.left, y);
            ctx.lineTo(width - PADDING.right, y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Label
            ctx.fillStyle = t > 0 ? '#22c55e' : '#ef4444';
            ctx.font = '9px Inter, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(t > 0 ? 'Buyers Zone' : 'Sellers Zone', PADDING.left - 5, y + 3);
        });

        // Draw zero line
        const zeroY = getY(0);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(PADDING.left, zeroY);
        ctx.lineTo(width - PADDING.right, zeroY);
        ctx.stroke();

        // Draw Y-axis labels
        ctx.fillStyle = '#64748b';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'right';
        [-100, -50, 0, 50, 100].forEach(val => {
            ctx.fillText(val.toString(), PADDING.left - 8, getY(val) + 3);
        });

        // Draw MA line first (behind the main line)
        if (ma20.length > 0) {
            ctx.beginPath();
            ctx.moveTo(getX(0), getY(ma20[0]));
            ma20.forEach((val, i) => {
                ctx.lineTo(getX(i), getY(val));
            });
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // Draw main imbalance line
        ctx.beginPath();
        ctx.moveTo(getX(0), getY(imbalanceData[0].imbalance));
        imbalanceData.forEach((point, i) => {
            ctx.lineTo(getX(i), getY(point.imbalance));
        });

        // Gradient stroke based on position
        const gradient = ctx.createLinearGradient(0, PADDING.top, 0, canvasHeight - PADDING.bottom);
        gradient.addColorStop(0, '#22c55e');
        gradient.addColorStop(0.5, '#64748b');
        gradient.addColorStop(1, '#ef4444');
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw current value dot
        if (imbalanceData.length > 0) {
            const lastX = getX(imbalanceData.length - 1);
            const lastY = getY(currentImbalance);

            // Glow effect
            ctx.beginPath();
            ctx.arc(lastX, lastY, 8, 0, Math.PI * 2);
            const glowColor = currentImbalance > 0
                ? 'rgba(34, 197, 94, 0.3)'
                : 'rgba(239, 68, 68, 0.3)';
            ctx.fillStyle = glowColor;
            ctx.fill();

            // Dot
            ctx.beginPath();
            ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
            ctx.fillStyle = currentImbalance > 0 ? '#22c55e' : '#ef4444';
            ctx.fill();
        }

        // Draw time axis
        ctx.fillStyle = '#64748b';
        ctx.font = '9px Inter, sans-serif';
        ctx.textAlign = 'center';
        const timeIntervals = 5;
        for (let i = 0; i <= timeIntervals; i++) {
            const index = Math.floor((i / timeIntervals) * (imbalanceData.length - 1));
            if (imbalanceData[index]) {
                const x = getX(index);
                const time = new Date(imbalanceData[index].timestamp).toLocaleTimeString('en-US', {
                    hour12: false, hour: '2-digit', minute: '2-digit'
                });
                ctx.fillText(time, x, canvasHeight - 10);
            }
        }

    }, [imbalanceData, ma20, extremeZones, dimensions, currentImbalance]);

    if (imbalanceData.length === 0) {
        return (
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4" style={{ height }}>
                <div className="flex items-center justify-center h-full text-slate-500">
                    <div className="text-center">
                        <div className="w-6 h-6 border-2 border-slate-600 border-t-blue-500 animate-spin rounded-full mx-auto mb-2" />
                        <span className="text-sm">Collecting imbalance data...</span>
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
                    <span className="text-sm font-semibold text-white">⚖️ Imbalance History</span>
                    {Math.abs(currentImbalance) > 60 && (
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${currentImbalance > 0
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                                }`}
                        >
                            {currentImbalance > 0 ? '📈 Buyers Dominant' : '📉 Sellers Dominant'}
                        </motion.span>
                    )}
                </div>
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                        <span className="text-slate-400">Current:</span>
                        <span className={`font-bold ${currentImbalance > 0 ? 'text-green-400' : currentImbalance < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                            {currentImbalance > 0 ? '+' : ''}{currentImbalance.toFixed(1)}%
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-slate-400">Avg:</span>
                        <span className={`font-bold ${avgImbalance > 0 ? 'text-green-400' : avgImbalance < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                            {avgImbalance > 0 ? '+' : ''}{avgImbalance.toFixed(1)}%
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-slate-400">Extreme Zones:</span>
                        <span className="font-bold text-yellow-400">{extremeZones.length}</span>
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
                    <div className="w-6 h-0.5 bg-gradient-to-r from-green-500 via-slate-500 to-red-500" />
                    <span>Imbalance</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-6 h-0.5 bg-yellow-500" />
                    <span>MA(20)</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-500/20 rounded" />
                    <span>Buyers Zone</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-500/20 rounded" />
                    <span>Sellers Zone</span>
                </div>
            </div>
        </div>
    );
}
