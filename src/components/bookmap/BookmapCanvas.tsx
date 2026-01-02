'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { BookmapState } from '@/hooks/useBookmap';
import {
    BookmapTheme,
    VisualizationMode,
    BubbleStyle,
    THEMES,
    generateColorLookup
} from '@/lib/bookmap/themes';

interface BookmapCanvasProps {
    symbol: string;
    dataRef: React.MutableRefObject<BookmapState>;
    status: 'connecting' | 'connected' | 'error';
    theme: BookmapTheme;
    mode: VisualizationMode;
    bubbleStyle: BubbleStyle;
}

// History snapshot for heatmap
type DepthSnapshot = {
    time: number;
    bids: Map<number, number>;
    asks: Map<number, number>;
    bestBid: number;
    bestAsk: number;
};

const MAX_HISTORY = 800;
const SNAPSHOT_INTERVAL = 50; // ms

export default function BookmapCanvas({
    symbol,
    dataRef,
    status,
    theme,
    mode,
    bubbleStyle
}: BookmapCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const historyRef = useRef<DepthSnapshot[]>([]);
    const lastSnapshotTime = useRef(0);
    const maxQuantityRef = useRef(1);

    const themeConfig = THEMES[theme];
    const colorLookup = useMemo(() => generateColorLookup(themeConfig), [themeConfig]);

    // Zoom and pan
    const [pricePerPixel, setPricePerPixel] = useState(0.5);
    const [contrast, setContrast] = useState(1.0);

    // Main rendering loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        let animationId: number;
        const AXIS_WIDTH = 75;
        const COLUMN_WIDTH = 2;

        const render = (timestamp: number) => {
            const width = canvas.width;
            const height = canvas.height;
            const chartWidth = width - AXIS_WIDTH;

            // Take snapshots
            if (timestamp - lastSnapshotTime.current > SNAPSHOT_INTERVAL && dataRef.current) {
                const snapshot: DepthSnapshot = {
                    time: timestamp,
                    bids: new Map(dataRef.current.bids),
                    asks: new Map(dataRef.current.asks),
                    bestBid: dataRef.current.bestBid,
                    bestAsk: dataRef.current.bestAsk,
                };
                historyRef.current.push(snapshot);

                if (historyRef.current.length > MAX_HISTORY) {
                    historyRef.current.shift();
                }
                lastSnapshotTime.current = timestamp;

                // Update max quantity for normalization (rolling window)
                let maxQ = 1;
                const recentHistory = historyRef.current.slice(-100);
                recentHistory.forEach(snap => {
                    snap.bids.forEach(q => { if (q > maxQ) maxQ = q; });
                    snap.asks.forEach(q => { if (q > maxQ) maxQ = q; });
                });
                maxQuantityRef.current = maxQ;
            }

            // Clear with background
            ctx.fillStyle = themeConfig.background;
            ctx.fillRect(0, 0, width, height);

            const currentPrice = dataRef.current?.lastPrice || 0;
            if (currentPrice === 0) {
                animationId = requestAnimationFrame(render);
                return;
            }

            // Price range
            const priceRangeHalf = (height / 2) * pricePerPixel;
            const maxPrice = currentPrice + priceRangeHalf;
            const minPrice = currentPrice - priceRangeHalf;

            const priceToY = (price: number) => Math.floor(height / 2 - (price - currentPrice) / pricePerPixel);

            // Calculate intensity with contrast
            const getIntensity = (quantity: number) => {
                const base = Math.log10(quantity + 1) / Math.log10(maxQuantityRef.current + 1);
                return Math.min(Math.pow(base, 1 / contrast), 1);
            };

            // =====================
            // RENDER HEATMAP
            // =====================
            if (mode === 'heatmap' || mode === 'heatmap-bubbles') {
                const numColumns = Math.floor(chartWidth / COLUMN_WIDTH);
                const historyLen = historyRef.current.length;

                for (let col = 0; col < numColumns; col++) {
                    const historyIndex = historyLen - numColumns + col;
                    if (historyIndex < 0) continue;

                    const snapshot = historyRef.current[historyIndex];
                    if (!snapshot) continue;

                    const x = col * COLUMN_WIDTH;

                    // Draw bids (below best bid)
                    snapshot.bids.forEach((qty, price) => {
                        if (price > maxPrice || price < minPrice) return;

                        const y = priceToY(price);
                        const barHeight = Math.max(Math.ceil(1 / pricePerPixel), 2);
                        const intensity = getIntensity(qty);
                        const colorIndex = Math.floor(intensity * 511);

                        ctx.fillStyle = colorLookup[colorIndex];
                        ctx.fillRect(x, y, COLUMN_WIDTH, barHeight);
                    });

                    // Draw asks (above best ask)
                    snapshot.asks.forEach((qty, price) => {
                        if (price > maxPrice || price < minPrice) return;

                        const y = priceToY(price);
                        const barHeight = Math.max(Math.ceil(1 / pricePerPixel), 2);
                        const intensity = getIntensity(qty);
                        const colorIndex = Math.floor(intensity * 511);

                        ctx.fillStyle = colorLookup[colorIndex];
                        ctx.fillRect(x, y, COLUMN_WIDTH, barHeight);
                    });

                    // Draw best bid/ask lines for this column
                    if (snapshot.bestBid > minPrice && snapshot.bestBid < maxPrice) {
                        ctx.fillStyle = themeConfig.bidLineColor;
                        ctx.fillRect(x, priceToY(snapshot.bestBid), COLUMN_WIDTH, 2);
                    }
                    if (snapshot.bestAsk > minPrice && snapshot.bestAsk < maxPrice) {
                        ctx.fillStyle = themeConfig.askLineColor;
                        ctx.fillRect(x, priceToY(snapshot.bestAsk), COLUMN_WIDTH, 2);
                    }
                }
            }

            // =====================
            // RENDER COLUMNS (DOM View)
            // =====================
            if (mode === 'columns') {
                const colWidth = 100;
                const bidX = chartWidth - colWidth * 2;
                const askX = chartWidth - colWidth;

                // Column backgrounds
                ctx.fillStyle = 'rgba(0,100,0,0.1)';
                ctx.fillRect(bidX, 0, colWidth, height);
                ctx.fillStyle = 'rgba(100,0,0,0.1)';
                ctx.fillRect(askX, 0, colWidth, height);

                if (dataRef.current) {
                    // Draw bid bars
                    dataRef.current.bids.forEach((qty, price) => {
                        if (price > maxPrice || price < minPrice) return;
                        const y = priceToY(price);
                        const barWidth = Math.min((qty / maxQuantityRef.current) * colWidth * 0.9, colWidth * 0.9);
                        const barHeight = Math.max(Math.ceil(1 / pricePerPixel), 3);

                        ctx.fillStyle = themeConfig.bidLineColor;
                        ctx.fillRect(bidX + colWidth - barWidth - 5, y, barWidth, barHeight);
                    });

                    // Draw ask bars
                    dataRef.current.asks.forEach((qty, price) => {
                        if (price > maxPrice || price < minPrice) return;
                        const y = priceToY(price);
                        const barWidth = Math.min((qty / maxQuantityRef.current) * colWidth * 0.9, colWidth * 0.9);
                        const barHeight = Math.max(Math.ceil(1 / pricePerPixel), 3);

                        ctx.fillStyle = themeConfig.askLineColor;
                        ctx.fillRect(askX + 5, y, barWidth, barHeight);
                    });
                }
            }

            // =====================
            // RENDER GRID LINES
            // =====================
            const gridStep = calculateNiceStep(priceRangeHalf * 2, 15);
            const startGrid = Math.floor(minPrice / gridStep) * gridStep;

            ctx.strokeStyle = themeConfig.gridColor;
            ctx.lineWidth = 1;
            for (let p = startGrid; p <= maxPrice; p += gridStep) {
                const y = priceToY(p);
                ctx.beginPath();
                ctx.moveTo(0, y + 0.5);
                ctx.lineTo(chartWidth, y + 0.5);
                ctx.stroke();
            }

            // =====================
            // RENDER BUBBLES
            // =====================
            if (mode === 'bubbles' || mode === 'heatmap-bubbles') {
                const now = Date.now();
                if (dataRef.current) {
                    dataRef.current.trades.forEach(trade => {
                        const age = now - trade.time;
                        if (age > 500) return; // Only show last 500ms
                        if (trade.price > maxPrice || trade.price < minPrice) return;

                        const y = priceToY(trade.price);
                        const x = chartWidth - (age / 500) * 150 - 10;

                        // Logarithmic radius
                        const baseRadius = Math.log10(trade.quantity * 10000 + 1) * 3;
                        const radius = Math.max(4, Math.min(baseRadius, 35));

                        // Fade out as bubble ages
                        const alpha = 1 - (age / 500) * 0.5;

                        const bubbleConfig = trade.isBuyerMaker
                            ? themeConfig.sellBubble
                            : themeConfig.buyBubble;

                        if (bubbleStyle === '3d') {
                            // 3D style with gradient and glow
                            // Glow
                            ctx.beginPath();
                            ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
                            ctx.fillStyle = bubbleConfig.glow.replace('0.3', String(0.3 * alpha));
                            ctx.fill();

                            // Main bubble with gradient
                            const grad = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius);
                            grad.addColorStop(0, `rgba(255,255,255,${0.4 * alpha})`);
                            grad.addColorStop(0.3, bubbleConfig.fill.replace(')', `,${alpha})`).replace('rgb', 'rgba'));
                            grad.addColorStop(1, bubbleConfig.stroke.replace(')', `,${alpha})`).replace('rgb', 'rgba').replace('#', ''));

                            ctx.beginPath();
                            ctx.arc(x, y, radius, 0, Math.PI * 2);
                            ctx.fillStyle = grad;
                            ctx.fill();

                            // Highlight
                            ctx.beginPath();
                            ctx.arc(x - radius * 0.25, y - radius * 0.25, radius * 0.3, 0, Math.PI * 2);
                            ctx.fillStyle = `rgba(255,255,255,${0.4 * alpha})`;
                            ctx.fill();
                        } else {
                            // 2D flat style
                            ctx.beginPath();
                            ctx.arc(x, y, radius, 0, Math.PI * 2);
                            ctx.fillStyle = hexToRgba(bubbleConfig.fill, alpha);
                            ctx.fill();
                            ctx.strokeStyle = hexToRgba(bubbleConfig.stroke, alpha);
                            ctx.lineWidth = 2;
                            ctx.stroke();
                        }
                    });
                }
            }

            // =====================
            // RENDER PRICE AXIS
            // =====================
            ctx.fillStyle = themeConfig.axisBackground;
            ctx.fillRect(chartWidth, 0, AXIS_WIDTH, height);

            // Price labels
            ctx.font = '10px monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';

            for (let p = startGrid; p <= maxPrice; p += gridStep) {
                const y = priceToY(p);

                // Tick
                ctx.fillStyle = themeConfig.textColor;
                ctx.fillRect(chartWidth, y, 4, 1);

                // Label
                const decimals = currentPrice < 10 ? 4 : (currentPrice < 1000 ? 2 : 0);
                ctx.fillText(p.toFixed(decimals), chartWidth + 8, y);
            }

            // Current price highlight
            if (currentPrice > minPrice && currentPrice < maxPrice) {
                const currentY = priceToY(currentPrice);

                ctx.fillStyle = themeConfig.currentPriceBackground;
                ctx.fillRect(chartWidth, currentY - 10, AXIS_WIDTH, 20);

                ctx.fillStyle = themeConfig.currentPriceText;
                ctx.font = 'bold 11px monospace';
                const decimals = currentPrice < 10 ? 4 : (currentPrice < 1000 ? 2 : 0);
                ctx.fillText(currentPrice.toFixed(decimals), chartWidth + 6, currentY);
            }

            // Spread indicator
            if (dataRef.current && dataRef.current.bestBid && dataRef.current.bestAsk) {
                const spread = dataRef.current.bestAsk - dataRef.current.bestBid;
                ctx.font = '9px monospace';
                ctx.fillStyle = themeConfig.textColor;
                ctx.fillText(`Spread: ${spread.toFixed(2)}`, chartWidth + 5, height - 10);
            }

            animationId = requestAnimationFrame(render);
        };

        animationId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(animationId);
    }, [symbol, theme, mode, bubbleStyle, colorLookup, themeConfig, pricePerPixel, contrast]);

    // Resize handler
    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current) {
                const parent = canvasRef.current.parentElement;
                if (parent) {
                    canvasRef.current.width = parent.clientWidth;
                    canvasRef.current.height = parent.clientHeight;
                }
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Clear history on symbol change
    useEffect(() => {
        historyRef.current = [];
        maxQuantityRef.current = 1;
    }, [symbol]);

    // Zoom handler
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 1.08 : 0.92;
        setPricePerPixel(prev => Math.max(0.0001, Math.min(prev * delta, 100)));
    }, []);

    return (
        <div className="relative w-full h-full overflow-hidden" style={{ background: themeConfig.background }}>
            <canvas
                ref={canvasRef}
                className="block cursor-crosshair"
                onWheel={handleWheel}
            />

            {/* Info Overlay */}
            <div
                className="absolute top-3 left-3 text-xs p-2 rounded backdrop-blur-sm pointer-events-none"
                style={{ background: `${themeConfig.axisBackground}DD`, color: themeConfig.textColor }}
            >
                <div className="flex items-center gap-2 font-bold">
                    <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: status === 'connected' ? '#22c55e' : '#eab308' }}
                    />
                    {symbol}
                </div>
                <div className="mt-1">
                    <span style={{ color: themeConfig.currentPriceBackground }}>
                        {dataRef.current?.lastPrice?.toFixed(2) || '---'}
                    </span>
                </div>
            </div>

            {/* Legend */}
            <div
                className="absolute bottom-3 left-3 text-[10px] p-2 rounded backdrop-blur-sm pointer-events-none flex gap-3"
                style={{ background: `${themeConfig.axisBackground}DD`, color: themeConfig.textColor }}
            >
                <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full" style={{ background: themeConfig.buyBubble.fill }}></span>
                    Buy
                </div>
                <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full" style={{ background: themeConfig.sellBubble.fill }}></span>
                    Sell
                </div>
            </div>

            {/* Loading */}
            {status === 'connecting' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-orange-400 font-mono text-sm">Connecting to Binance...</span>
                    </div>
                </div>
            )}
        </div>
    );
}

// Helpers
function calculateNiceStep(range: number, targetSteps: number): number {
    const roughStep = range / targetSteps;
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const residual = roughStep / magnitude;

    let niceStep: number;
    if (residual < 1.5) niceStep = 1;
    else if (residual < 3) niceStep = 2;
    else if (residual < 7) niceStep = 5;
    else niceStep = 10;

    return niceStep * magnitude;
}

function hexToRgba(hex: string, alpha: number): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
        return `rgba(${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)},${alpha})`;
    }
    return hex;
}
