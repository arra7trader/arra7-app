'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { OrderBook, OrderBookLevel, DOM_SYMBOLS, DOMSymbolId } from '@/types/dom';
import { CircleStackIcon, ChartIcon } from '@/components/PremiumIcons';

export interface HeatmapDataPoint {
    timestamp: number;
    orderBook: OrderBook;
}

interface HeatmapBubbleProps {
    currentOrderBook: OrderBook | null;
    history: HeatmapDataPoint[];
    height?: number;
}

// Helper: Calculate statistics for auto-scaling color intensity
function getVolumeStats(history: HeatmapDataPoint[], currentBook: OrderBook | null) {
    let maxVol = 0;
    let totalVol = 0;
    let count = 0;

    const processLevel = (l: OrderBookLevel) => {
        maxVol = Math.max(maxVol, l.volume);
        totalVol += l.volume;
        count++;
    };

    if (currentBook) {
        currentBook.bids.forEach(processLevel);
        currentBook.asks.forEach(processLevel);
    }

    // Check last 50 points for better recent contrast
    const recent = history.slice(-50);
    recent.forEach(h => {
        h.orderBook.bids.forEach(processLevel);
        h.orderBook.asks.forEach(processLevel);
    });

    const avgVol = count > 0 ? totalVol / count : 1;
    return { max: Math.max(maxVol, 0.0001), avg: avgVol };
}

// Helper: Get Price Range
function getPriceRange(history: HeatmapDataPoint[], currentBook: OrderBook | null) {
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    if (currentBook) {
        if (currentBook.bids.length > 0) minPrice = Math.min(minPrice, currentBook.bids[currentBook.bids.length - 1].price);
        if (currentBook.asks.length > 0) maxPrice = Math.max(maxPrice, currentBook.asks[currentBook.asks.length - 1].price);
    }

    // Adaptive range based on history to prevent jitter, but smooth follow
    // For now, let's stick to current book + some history to keep context
    const recent = history.slice(-200); // Look at last 200 ticks
    recent.forEach(h => {
        if (h.orderBook.bids.length > 0) minPrice = Math.min(minPrice, h.orderBook.bids[h.orderBook.bids.length - 1].price);
        if (h.orderBook.asks.length > 0) maxPrice = Math.max(maxPrice, h.orderBook.asks[h.orderBook.asks.length - 1].price);
    });

    if (minPrice === Infinity || maxPrice === -Infinity) return { min: 0, max: 100 };

    const padding = (maxPrice - minPrice) * 0.2; // 20% padding
    return { min: minPrice - padding, max: maxPrice + padding };
}

export default function BookmapChart({ currentOrderBook, history, height = 500 }: HeatmapBubbleProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

    // Performance: Use offscreen canvas to cache the scrolling heatmap
    const offscreenRef = useRef<HTMLCanvasElement | null>(null);

    // Handle Resize
    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                const newWidth = containerRef.current.offsetWidth;
                setDimensions({ width: newWidth, height: height });

                // Reset offscreen canvas on resize
                offscreenRef.current = null;
            }
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, [height]);

    // Main Draw Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !currentOrderBook) return;

        const ctx = canvas.getContext('2d', { alpha: false }); // Optimize for no alpha channel if possible
        if (!ctx) return;

        // Get Symbol Config
        const symbolConfig = DOM_SYMBOLS[currentOrderBook.symbol as DOMSymbolId];
        const priceDecimals = symbolConfig?.decimals || 2;
        const volDecimals = symbolConfig?.volumeDecimals ?? 2;

        const { width, height } = dimensions;

        // Layout Constants
        // Layout Constants
        const RIGHT_MARGIN_PRICE = 90; // Increased to fit Volume text
        const BOTTOM_MARGIN_TIME = 20; // Space for Time Axis
        const FUTURE_ZONE_WIDTH = 180;
        const CHART_WIDTH = width - RIGHT_MARGIN_PRICE;
        const CHART_HEIGHT = height - BOTTOM_MARGIN_TIME;
        const TIME_WIDTH = CHART_WIDTH - FUTURE_ZONE_WIDTH;

        // 1. Calculate Scale
        const priceRange = getPriceRange(history, currentOrderBook);
        const priceSpan = priceRange.max - priceRange.min;
        const getY = (price: number) => CHART_HEIGHT - ((price - priceRange.min) / priceSpan) * CHART_HEIGHT;

        // 2. Heatmap Logic (Offscreen/Scrolling Optim)
        if (!offscreenRef.current) {
            // Init Offscreen Canvas
            offscreenRef.current = document.createElement('canvas');
            offscreenRef.current.width = TIME_WIDTH;
            offscreenRef.current.height = height;
        }

        const offCtx = offscreenRef.current.getContext('2d', { willReadFrequently: true });
        if (offCtx) {
            // Scroll Left: Draw current image shifted left by 1 pixel (or pointWidth)
            const pointWidth = Math.max(1, TIME_WIDTH / 600); // 600 points history approx

            // Optimization: Instead of shifting every frame with drawImage (expensive reading), 
            // since we are redrawing based on State change (history update), we can just redraw the whole thing 
            // IF history is small. But for 600 points, it's better to optimize directly on the main canvas 
            // OR finding a way to persist.

            // Simpler "Fast" Approach for React:
            // Since `history` array changes reference every update, strict "shift" logic is hard without mutable ref.
            // However, 600 rectangles x 2 sides = 1200 rects is actually very cheap for Canvas 2D.
            // The lag might be coming from React re-renders or something else (Shadows/Blurs).
            // Let's optimize the drawing loop itself to be minimal.

            // Statistics for Coloring
            const { max: maxVol, avg: avgVol } = getVolumeStats(history, currentOrderBook);

            // Draw Background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);

            // Draw History
            // Optimization: Batch fillRects of similar colors if possible, but simplest is just raw loop.
            // To reduce overlap, we use strict pointWidth.

            // We only draw the last N points that fit.
            const numPoints = Math.floor(TIME_WIDTH / pointWidth);
            const visibleHistory = history.slice(-numPoints);

            visibleHistory.forEach((point, i) => {
                const x = i * pointWidth;

                // Threshold for visibility to reduce draw calls
                // Only draw if volume > 5% of max
                const VISIBILITY_THRESHOLD = maxVol * 0.05;

                point.orderBook.asks.forEach(ask => {
                    if (ask.volume < VISIBILITY_THRESHOLD) return;
                    const y = getY(ask.price);
                    const intensity = Math.min(1, ask.volume / maxVol);
                    ctx.fillStyle = `rgba(239, 68, 68, ${intensity})`; // Simple alpha
                    // Height = 1-2px for density
                    const h = Math.max(1, CHART_HEIGHT / 100);
                    ctx.fillRect(x, Math.floor(y), Math.ceil(pointWidth), Math.ceil(h));
                });

                point.orderBook.bids.forEach(bid => {
                    if (bid.volume < VISIBILITY_THRESHOLD) return;
                    const y = getY(bid.price);
                    const intensity = Math.min(1, bid.volume / maxVol);
                    ctx.fillStyle = `rgba(34, 197, 94, ${intensity})`;
                    const h = Math.max(1, CHART_HEIGHT / 100);
                    ctx.fillRect(x, Math.floor(y), Math.ceil(pointWidth), Math.ceil(h));
                });
            });

            // 3. Draw Price Line
            ctx.beginPath();
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 1.5;
            visibleHistory.forEach((point, i) => {
                const x = i * pointWidth;
                const y = getY(point.orderBook.midPrice);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            // Connect to current
            const currentX = visibleHistory.length * pointWidth;
            const currentY = getY(currentOrderBook.midPrice);
            ctx.lineTo(currentX, currentY);
            ctx.stroke();

            // 4. FUTURE ZONE
            const futureStartX = visibleHistory.length * pointWidth;

            // Separator
            ctx.beginPath();
            ctx.strokeStyle = '#e2e8f0';
            ctx.setLineDash([4, 4]);
            ctx.moveTo(futureStartX, 0);
            ctx.lineTo(futureStartX, CHART_HEIGHT);
            ctx.stroke();
            ctx.setLineDash([]);

            // Significant Level Threshold
            const WHALE_THRESHOLD = avgVol * 2.5; // 2.5x Average Volume

            // Draw Current Levels
            // Asks
            currentOrderBook.asks.forEach(ask => {
                const y = getY(ask.price);
                const isWhale = ask.volume > WHALE_THRESHOLD;
                const intensity = Math.min(1, ask.volume / maxVol);

                // Base Gradient
                const gradient = ctx.createLinearGradient(futureStartX, 0, CHART_WIDTH, 0);
                gradient.addColorStop(0, `rgba(239, 68, 68, ${intensity})`);
                gradient.addColorStop(1, `rgba(239, 68, 68, 0)`);

                ctx.fillStyle = gradient;
                const h = Math.max(2, CHART_HEIGHT / 80);
                ctx.fillRect(futureStartX, y - h / 2, FUTURE_ZONE_WIDTH, h);

                // Highlight Whale Levels
                if (isWhale) {
                    // Draw Solid Line for Whale
                    ctx.fillStyle = '#ef4444'; // Solid Red
                    ctx.fillRect(futureStartX, y - 1, FUTURE_ZONE_WIDTH, 2);

                    // Price Label Background on Future Zone?
                    // Maybe just a dot or indicator
                    ctx.beginPath();
                    ctx.arc(futureStartX + 5, y, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            // Bids
            currentOrderBook.bids.forEach(bid => {
                const y = getY(bid.price);
                const isWhale = bid.volume > WHALE_THRESHOLD;
                const intensity = Math.min(1, bid.volume / maxVol);

                const gradient = ctx.createLinearGradient(futureStartX, 0, CHART_WIDTH, 0);
                gradient.addColorStop(0, `rgba(34, 197, 94, ${intensity})`);
                gradient.addColorStop(1, `rgba(34, 197, 94, 0)`);

                ctx.fillStyle = gradient;
                const h = Math.max(2, CHART_HEIGHT / 80);
                ctx.fillRect(futureStartX, y - h / 2, FUTURE_ZONE_WIDTH, h);

                if (isWhale) {
                    ctx.fillStyle = '#22c55e'; // Solid Green
                    ctx.fillRect(futureStartX, y - 1, FUTURE_ZONE_WIDTH, 2);

                    ctx.beginPath();
                    ctx.arc(futureStartX + 5, y, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            // Current Price Line through Future
            ctx.beginPath();
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 1;
            ctx.moveTo(futureStartX, currentY);
            ctx.lineTo(CHART_WIDTH, currentY);
            ctx.stroke();


            // 5. PRICE AXIS
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(CHART_WIDTH, 0, RIGHT_MARGIN_PRICE, CHART_HEIGHT);

            // Draw Axis Border
            ctx.beginPath();
            ctx.strokeStyle = '#e2e8f0';
            ctx.moveTo(CHART_WIDTH, 0);
            ctx.lineTo(CHART_WIDTH, CHART_HEIGHT);
            ctx.stroke();

            ctx.font = '11px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';

            // Draw WHALE LABELS First (underneath)
            // Filter significant levels
            const significantAsks = currentOrderBook.asks.filter(a => a.volume > WHALE_THRESHOLD);
            const significantBids = currentOrderBook.bids.filter(b => b.volume > WHALE_THRESHOLD);

            [...significantAsks, ...significantBids].forEach(level => {
                const y = getY(level.price);
                // Only draw if within bounds
                if (y > 15 && y < CHART_HEIGHT - 15) {
                    // Label Background
                    ctx.fillStyle = '#fef3c7'; // Amber 100 (Gold-ish)
                    ctx.fillRect(CHART_WIDTH + 1, y - 10, RIGHT_MARGIN_PRICE - 2, 20); // Taller box

                    // Price Text
                    ctx.font = 'bold 11px sans-serif';
                    ctx.fillStyle = '#b45309'; // Amber 700
                    ctx.fillText(level.price.toFixed(priceDecimals), CHART_WIDTH + 4, y - 3);

                    // Volume Text (Big & Clear)
                    ctx.font = 'bold 10px sans-serif'; // Monospace for numbers
                    ctx.fillStyle = '#d97706'; // Darker Amber
                    ctx.fillText(`Vol: ${level.volume.toFixed(volDecimals)}`, CHART_WIDTH + 4, y + 7);

                    ctx.font = '11px sans-serif'; // Reset font
                }
            });

            // Draw Grid & Standard Ticks
            ctx.strokeStyle = '#e2e8f0';
            ctx.fillStyle = '#64748b';
            const numTicks = 8;
            for (let i = 0; i <= numTicks; i++) {
                const price = priceRange.min + (priceSpan * i) / numTicks;
                const y = getY(price);

                // Grid line
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(CHART_WIDTH, y);
                ctx.stroke();

                // Draw standard tick only if it doesn't overlap strongly with Current Price
                if (Math.abs(y - currentY) > 15) {
                    ctx.fillText(price.toFixed(priceDecimals), CHART_WIDTH + 4, y);
                }
            }

            // Current Price Label (Always on top)
            const labelY = Math.max(12, Math.min(CHART_HEIGHT - 12, currentY));
            ctx.fillStyle = '#2563eb'; // Blue bg
            ctx.fillRect(CHART_WIDTH, labelY - 10, RIGHT_MARGIN_PRICE, 20);

            // Triangle pointer
            ctx.beginPath();
            ctx.moveTo(CHART_WIDTH, labelY);
            ctx.lineTo(CHART_WIDTH - 5, labelY - 5);
            ctx.lineTo(CHART_WIDTH - 5, labelY + 5);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px sans-serif';
            ctx.fillText(currentOrderBook.midPrice.toFixed(priceDecimals), CHART_WIDTH + 6, labelY);


            // 6. TIME AXIS (Bottom)
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, CHART_HEIGHT, width, BOTTOM_MARGIN_TIME);

            // Draw Axis Border
            ctx.beginPath();
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1;
            ctx.moveTo(0, CHART_HEIGHT);
            ctx.lineTo(width, CHART_HEIGHT);
            ctx.stroke();

            // Draw Time Ticks
            ctx.fillStyle = '#64748b';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';

            // Draw ~6 ticks across visible history
            const TICK_INTERVAL_POINTS = Math.floor(visibleHistory.length / 5);

            if (TICK_INTERVAL_POINTS > 0) {
                visibleHistory.forEach((point, i) => {
                    if (i % TICK_INTERVAL_POINTS === 0) {
                        const x = i * pointWidth;
                        const date = new Date(point.timestamp);
                        // Format: HH:mm:ss
                        const timeStr = date.toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false
                        });

                        // Tick mark
                        ctx.beginPath();
                        ctx.moveTo(x, CHART_HEIGHT);
                        ctx.lineTo(x, CHART_HEIGHT + 4);
                        ctx.stroke();

                        // Label
                        ctx.fillText(timeStr, x, CHART_HEIGHT + 6);
                    }
                });
            }

            // Draw 'Now' Label at the end of history
            const nowX = visibleHistory.length * pointWidth;
            ctx.fillText("Now", nowX, CHART_HEIGHT + 6);
        }

    }, [dimensions, currentOrderBook, history]);

    if (!currentOrderBook) {
        return (
            <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
                Loading Heatmap Data...
            </div>
        );
    }

    return (
        <div ref={containerRef} className="rounded-xl border border-[var(--border-light)] bg-white overflow-hidden relative shadow-sm h-full">
            <div className="absolute top-4 left-4 z-10 flex gap-4 pointer-events-none">
                <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-xs text-gray-600 font-medium">Buying Power</span>
                </div>
                <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="text-xs text-gray-600 font-medium">Selling Pressure</span>
                </div>
                <div className="bg-amber-50/90 backdrop-blur px-3 py-1.5 rounded-lg border border-amber-200 shadow-sm flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                    <span className="text-xs text-amber-700 font-bold">Whale Zones</span>
                </div>
            </div>

            <canvas
                ref={canvasRef}
                width={dimensions.width}
                height={dimensions.height}
                className="w-full h-full"
                style={{ imageRendering: 'pixelated' }}
            />

            {/* Future Label */}
            <div className="absolute top-2 right-[80px] text-[10px] text-gray-400 font-bold tracking-wider">
                FUTURE LIQUIDITY
            </div>
        </div>
    );
}
