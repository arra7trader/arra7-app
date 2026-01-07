'use client';

import { useRef, useEffect, useState } from 'react';
import { OrderBook, DOM_SYMBOLS, DOMSymbolId } from '@/types/dom';
import { MLPrediction, getPredictionColor } from '@/types/ml-prediction';

export interface HeatmapDataPoint {
    timestamp: number;
    orderBook: OrderBook;
}

interface HeatmapBubbleProps {
    currentOrderBook: OrderBook | null;
    history: HeatmapDataPoint[];
    height?: number;
    mlPrediction?: MLPrediction | null;
}

// Turbo Colormap (Approximation)
// 0.0: Blue (Deep Ocean)
// 0.25: Cyan
// 0.5: Green
// 0.75: Yellow
// 1.0: Red (Hot)
function getHeatmapColor(intensity: number, alpha: number = 1): string {
    // Clamp intensity
    const t = Math.max(0, Math.min(1, intensity));

    let r = 0, g = 0, b = 0;

    if (t < 0.25) {
        // Blue to Cyan
        // 0.0: 0, 0, 150
        // 0.25: 0, 255, 255
        const p = t / 0.25;
        r = 0;
        g = Math.floor(p * 255);
        b = Math.floor(150 + p * 105);
    } else if (t < 0.5) {
        // Cyan to Green
        // 0.25: 0, 255, 255
        // 0.5: 0, 255, 0
        const p = (t - 0.25) / 0.25;
        r = 0;
        g = 255;
        b = Math.floor(255 * (1 - p));
    } else if (t < 0.75) {
        // Green to Yellow
        // 0.5: 0, 255, 0
        // 0.75: 255, 255, 0
        const p = (t - 0.5) / 0.25;
        r = Math.floor(p * 255);
        g = 255;
        b = 0;
    } else {
        // Yellow to Red
        // 0.75: 255, 255, 0
        // 1.0: 255, 0, 0
        // 1.0+: White (Whale)
        const p = (t - 0.75) / 0.25;
        r = 255;
        g = Math.floor(255 * (1 - p));
        b = 0;

        // Whale highlight (White hot)
        if (t > 0.95) {
            r = 255; g = 255; b = 255;
        }
    }

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Helper: Calculate statistics for auto-scaling color intensity
function getVolumeStats(history: HeatmapDataPoint[], currentBook: OrderBook | null) {
    let maxVol = 0;
    let totalVol = 0;
    let count = 0;

    const processLevels = (levels: any[]) => {
        levels.forEach(l => {
            maxVol = Math.max(maxVol, l.volume);
            totalVol += l.volume;
            count++;
        });
    };

    if (currentBook) {
        processLevels(currentBook.bids);
        processLevels(currentBook.asks);
    }

    // Check last 100 points
    const recent = history.slice(-100);
    recent.forEach(h => {
        processLevels(h.orderBook.bids);
        processLevels(h.orderBook.asks);
    });

    // Cap max volume to avoid outliers hiding everything
    // Use 95th percentile approximation or just a multiplier of average
    const avgVol = count > 0 ? totalVol / count : 1;
    // Dynamic ceiling: Min(ActualMax, Avg * 5)
    // This ensures outlines don't squash the entire map visibility
    const ceiling = Math.min(maxVol, avgVol * 8);

    return { max: Math.max(ceiling, 0.0001), avg: avgVol };
}

// Helper: Get Price Range
function getPriceRange(history: HeatmapDataPoint[], currentBook: OrderBook | null) {
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    if (currentBook) {
        if (currentBook.bids.length > 0) minPrice = Math.min(minPrice, currentBook.bids[currentBook.bids.length - 1].price);
        if (currentBook.asks.length > 0) maxPrice = Math.max(maxPrice, currentBook.asks[currentBook.asks.length - 1].price);
    }

    const recent = history.slice(-150);
    recent.forEach(h => {
        if (h.orderBook.bids.length > 0) minPrice = Math.min(minPrice, h.orderBook.bids[h.orderBook.bids.length - 1].price);
        if (h.orderBook.asks.length > 0) maxPrice = Math.max(maxPrice, h.orderBook.asks[h.orderBook.asks.length - 1].price);
    });

    if (minPrice === Infinity || maxPrice === -Infinity) return { min: 0, max: 100 };

    const padding = (maxPrice - minPrice) * 0.15;
    return { min: minPrice - padding, max: maxPrice + padding };
}

export default function BookmapChart({ currentOrderBook, history, height = 500, mlPrediction }: HeatmapBubbleProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

    // Resize Handler
    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.offsetWidth,
                    height: height
                });
            }
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, [height]);

    // Draw Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !currentOrderBook) return;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const symbolConfig = DOM_SYMBOLS[currentOrderBook.symbol as DOMSymbolId];
        const priceDecimals = symbolConfig?.decimals || 2;
        const volDecimals = symbolConfig?.volumeDecimals ?? 2;
        const { width, height } = dimensions;

        // --- Layout ---
        const RIGHT_MARGIN = 80;
        const BOTTOM_MARGIN = 24;
        const FUTURE_WIDTH = 180;
        const CHART_WIDTH = width - RIGHT_MARGIN;
        const HISTORY_WIDTH = CHART_WIDTH - FUTURE_WIDTH;
        const CHART_HEIGHT = height - BOTTOM_MARGIN;

        // --- Stats & Scale ---
        const { max: maxVol, avg: avgVol } = getVolumeStats(history, currentOrderBook);
        const priceRange = getPriceRange(history, currentOrderBook);
        const priceSpan = priceRange.max - priceRange.min;
        const getY = (price: number) => CHART_HEIGHT - ((price - priceRange.min) / priceSpan) * CHART_HEIGHT;

        // --- 1. Background (Dark Theme) ---
        ctx.fillStyle = '#0f172a'; // Slate 900
        ctx.fillRect(0, 0, width, height);

        // --- 2. Draw History Heatmap ---
        // Point width depends on history length relative to width
        // Target: fill HISTORY_WIDTH with available history
        const maxPoints = Math.floor(HISTORY_WIDTH);
        const pointsToDraw = history.slice(-maxPoints);
        const pointWidth = Math.max(1, HISTORY_WIDTH / pointsToDraw.length);

        pointsToDraw.forEach((point, i) => {
            const x = i * pointWidth;

            // Draw Asks
            point.orderBook.asks.forEach(ask => {
                if (ask.volume < avgVol * 0.1) return; // Optimization: Skip tiny noise

                const y = getY(ask.price);
                const intensity = ask.volume / maxVol;

                ctx.fillStyle = getHeatmapColor(intensity);
                // Draw slight vertical stretch to fill gaps
                ctx.fillRect(x, y, Math.ceil(pointWidth), 2);
            });

            // Draw Bids
            point.orderBook.bids.forEach(bid => {
                if (bid.volume < avgVol * 0.1) return;

                const y = getY(bid.price);
                const intensity = bid.volume / maxVol;

                ctx.fillStyle = getHeatmapColor(intensity);
                ctx.fillRect(x, y, Math.ceil(pointWidth), 2);
            });
        });

        // --- 3. Current Price Line ---
        ctx.beginPath();
        const currentY = getY(currentOrderBook.midPrice);

        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#ffffff'; // White line on dark bg

        // Trace history
        if (pointsToDraw.length > 0) {
            ctx.moveTo(0, getY(pointsToDraw[0].orderBook.midPrice));
            pointsToDraw.forEach((p, i) => {
                ctx.lineTo(i * pointWidth, getY(p.orderBook.midPrice));
            });
        }

        // Connect to current (Future Zone start)
        const historyEndX = pointsToDraw.length * pointWidth;
        ctx.lineTo(historyEndX, currentY);

        // Extend through Future Zone
        ctx.lineTo(CHART_WIDTH, currentY);
        ctx.stroke();

        // --- 4. FUTURE ZONE (DOM Snapshot) ---
        const futureX = historyEndX;

        // Separator Line
        ctx.beginPath();
        ctx.setLineDash([2, 4]);
        ctx.strokeStyle = '#475569'; // Slate 600
        ctx.moveTo(futureX, 0);
        ctx.lineTo(futureX, CHART_HEIGHT);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw Current Depth Bars in Future Zone
        const drawFutureBar = (price: number, volume: number) => {
            const y = getY(price);
            const intensity = volume / maxVol;
            const barWidth = FUTURE_WIDTH * intensity;

            ctx.fillStyle = getHeatmapColor(intensity, 0.8);
            ctx.fillRect(futureX, y - 1, barWidth, 3);

            // Whale Highlight
            if (volume > avgVol * 3) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(futureX + barWidth, y - 1, 2, 3);
            }
        };

        currentOrderBook.asks.forEach(a => drawFutureBar(a.price, a.volume));
        currentOrderBook.bids.forEach(b => drawFutureBar(b.price, b.volume));

        // --- 4b. FUTURE WHALE WALLS (Visual Labels) ---
        // Only label walls that are significant relative to the max volume
        const whaleThreshold = Math.max(avgVol * 3, maxVol * 0.6);

        const drawWhaleWall = (price: number, volume: number, type: 'ASK' | 'BID') => {
            if (volume < whaleThreshold) return;

            const y = getY(price);
            const color = type === 'ASK' ? 'rgba(239, 68, 68, 0.8)' : 'rgba(34, 197, 94, 0.8)'; // Red/Green

            // Line extending to future
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 4]); // Dotted
            ctx.moveTo(futureX, y);
            ctx.lineTo(CHART_WIDTH, y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Label background
            const labelText = volume.toFixed(volDecimals); // e.g. "500"
            const textWidth = ctx.measureText(labelText).width;

            ctx.fillStyle = 'rgba(15, 23, 42, 0.8)'; // Dark bg for text
            ctx.fillRect(CHART_WIDTH - textWidth - 2, y - 8, textWidth + 4, 10);

            // Text Label
            ctx.fillStyle = color;
            ctx.font = 'bold 9px Inter, monospace';
            ctx.fillText(labelText, CHART_WIDTH - textWidth, y);
        };

        currentOrderBook.asks.forEach(a => drawWhaleWall(a.price, a.volume, 'ASK'));
        currentOrderBook.bids.forEach(b => drawWhaleWall(b.price, b.volume, 'BID'));

        // --- 5. ML PREDICTION OVERLAY ---
        if (mlPrediction && mlPrediction.confidence > 0.5) {
            const predColor = getPredictionColor(mlPrediction.direction);
            const isUp = mlPrediction.direction === 'UP';
            const isDown = mlPrediction.direction === 'DOWN';

            // Calculate target
            const priceChange = currentOrderBook.midPrice * 0.001 * (isUp ? 1 : isDown ? -1 : 0);
            const targetY = getY(currentOrderBook.midPrice + priceChange);

            // Glow effect
            ctx.shadowBlur = 10;
            ctx.shadowColor = predColor;

            // Line
            ctx.beginPath();
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = predColor;
            ctx.lineWidth = 2;
            ctx.moveTo(futureX, currentY);
            ctx.bezierCurveTo(
                futureX + FUTURE_WIDTH * 0.5, currentY,
                futureX + FUTURE_WIDTH * 0.5, targetY,
                CHART_WIDTH, targetY
            );
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.shadowBlur = 0;

            // Prediction Label
            const confPct = Math.round(mlPrediction.confidence * 100);
            const labelX = futureX + 10;
            const labelY = 30;

            ctx.fillStyle = 'rgba(15, 23, 42, 0.8)'; // Semi-transparent bg
            ctx.strokeStyle = predColor;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(labelX, labelY, 90, 24, 6);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = predColor;
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.fillText(`AI: ${confPct}% ${mlPrediction.direction}`, labelX + 8, labelY + 16);
        }

        // --- 6. AXES & LABELS ---
        // Price Axis Bg
        ctx.fillStyle = '#1e293b'; // Slate 800
        ctx.fillRect(CHART_WIDTH, 0, RIGHT_MARGIN, height);

        // Price Axis Ticks
        ctx.fillStyle = '#94a3b8'; // Slate 400
        ctx.font = '10px Inter, monospace';
        const numTicks = 8;
        for (let i = 0; i <= numTicks; i++) {
            const price = priceRange.min + (priceSpan * i) / numTicks;
            const y = getY(price);

            if (Math.abs(y - currentY) > 15) { // Avoid overlap with current price
                ctx.fillText(price.toFixed(priceDecimals), CHART_WIDTH + 6, y + 3);
                ctx.fillStyle = '#334155';
                ctx.fillRect(CHART_WIDTH, y, 4, 1);
                ctx.fillStyle = '#94a3b8';
            }
        }

        // Current Price Tag
        ctx.fillStyle = '#3b82f6'; // Blue
        ctx.fillRect(CHART_WIDTH, currentY - 10, RIGHT_MARGIN, 20);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Inter, monospace';
        ctx.fillText(currentOrderBook.midPrice.toFixed(priceDecimals), CHART_WIDTH + 6, currentY + 4);

        // Time Axis
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, CHART_HEIGHT, width, BOTTOM_MARGIN);

        ctx.fillStyle = '#64748b';
        ctx.font = '10px Inter, sans-serif';
        const nowX = historyEndX;
        ctx.fillText('NOW', nowX - 10, CHART_HEIGHT + 16);

        // Draw ~4-5 time ticks
        if (Math.floor(pointsToDraw.length / 4) > 10) {
            pointsToDraw.forEach((p, i) => {
                if (i % Math.floor(pointsToDraw.length / 4) === 0) {
                    const x = i * pointWidth;
                    const timeStr = new Date(p.timestamp).toLocaleTimeString('en-US', {
                        hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
                    });
                    ctx.fillText(timeStr, x, CHART_HEIGHT + 16);
                }
            });
        }

    }, [dimensions, currentOrderBook, history, mlPrediction]);

    if (!currentOrderBook) {
        return (
            <div className="h-[500px] w-full flex items-center justify-center bg-slate-900 border border-slate-800 rounded-xl text-slate-400">
                <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 rounded-full border-2 border-slate-600 border-t-blue-500 animate-spin" />
                    <span className="text-sm font-medium">Initializing Spectrum Feed...</span>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="relative rounded-xl overflow-hidden border border-slate-800 shadow-xl bg-slate-900">
            {/* Legend Overlay */}
            <div className="absolute top-3 left-3 flex gap-2 z-10">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800/80 border border-slate-700 backdrop-blur text-[10px] text-slate-300">
                    <div className="w-2 h-2 rounded-sm bg-blue-600"></div>
                    <span>Low</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800/80 border border-slate-700 backdrop-blur text-[10px] text-slate-300">
                    <div className="w-2 h-2 rounded-sm bg-green-500"></div>
                    <span>Med</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800/80 border border-slate-700 backdrop-blur text-[10px] text-slate-300">
                    <div className="w-2 h-2 rounded-sm bg-red-500"></div>
                    <span>High</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800/80 border border-slate-700 backdrop-blur text-[10px] text-white font-bold">
                    <div className="w-2 h-2 rounded-sm bg-white shadow-[0_0_5px_white]"></div>
                    <span>Whale</span>
                </div>
            </div>

            <canvas
                ref={canvasRef}
                width={dimensions.width}
                height={dimensions.height}
                className="block"
            />
        </div>
    );
}
