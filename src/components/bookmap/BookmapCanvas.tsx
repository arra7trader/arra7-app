'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { BookmapState } from '@/hooks/useBookmap';
import { BookmapTheme, THEMES, generateColorMap } from '@/lib/bookmap/themes';

interface BookmapCanvasProps {
    symbol: string;
    dataRef: React.MutableRefObject<BookmapState>;
    status: 'connecting' | 'connected' | 'error';
    theme: BookmapTheme;
}

// Ring buffer for historical depth snapshots
type DepthSnapshot = {
    time: number;
    bids: Map<number, number>;
    asks: Map<number, number>;
    lastPrice: number;
};

const MAX_HISTORY = 600; // ~10 seconds at 60fps
const SNAPSHOT_INTERVAL = 50; // ms between snapshots

export default function BookmapCanvas({ symbol, dataRef, status, theme }: BookmapCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const historyRef = useRef<DepthSnapshot[]>([]);
    const lastSnapshotTime = useRef(0);

    // Pre-compute color map for current theme
    const colorMap = useMemo(() => {
        return generateColorMap(THEMES[theme].heatmapGradient);
    }, [theme]);

    const themeConfig = THEMES[theme];

    // Zoom state (pixels per price unit)
    const [pricePerPixel, setPricePerPixel] = useState(0.5); // Lower = more zoomed in

    // Main render loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        let animationId: number;
        const AXIS_WIDTH = 70; // Right side price axis
        const HEADER_HEIGHT = 0; // No header in canvas

        // Heatmap column width in pixels
        const COLUMN_WIDTH = 2;

        const render = (timestamp: number) => {
            const width = canvas.width;
            const height = canvas.height;
            const chartWidth = width - AXIS_WIDTH;

            // 1. Take periodic snapshots of depth data
            if (timestamp - lastSnapshotTime.current > SNAPSHOT_INTERVAL && dataRef.current) {
                const snapshot: DepthSnapshot = {
                    time: timestamp,
                    bids: new Map(dataRef.current.bids),
                    asks: new Map(dataRef.current.asks),
                    lastPrice: dataRef.current.lastPrice,
                };
                historyRef.current.push(snapshot);

                // Trim old history
                if (historyRef.current.length > MAX_HISTORY) {
                    historyRef.current.shift();
                }
                lastSnapshotTime.current = timestamp;
            }

            // 2. Clear canvas with background
            ctx.fillStyle = themeConfig.background;
            ctx.fillRect(0, 0, width, height);

            // 3. Determine center price
            const currentPrice = dataRef.current?.lastPrice || 0;
            if (currentPrice === 0) {
                animationId = requestAnimationFrame(render);
                return;
            }

            // Price range visible on screen
            const priceRangeHalf = (height / 2) * pricePerPixel;
            const maxPrice = currentPrice + priceRangeHalf;
            const minPrice = currentPrice - priceRangeHalf;

            // Helper: price to Y coordinate
            const priceToY = (price: number) => {
                return Math.floor(height / 2 - (price - currentPrice) / pricePerPixel);
            };

            // 4. Render Heatmap from history buffer
            const numColumns = Math.floor(chartWidth / COLUMN_WIDTH);
            const historyLen = historyRef.current.length;

            // Calculate max quantity for normalization (across visible history)
            let maxQty = 1;
            for (let i = Math.max(0, historyLen - numColumns); i < historyLen; i++) {
                const snapshot = historyRef.current[i];
                snapshot.bids.forEach((qty) => { if (qty > maxQty) maxQty = qty; });
                snapshot.asks.forEach((qty) => { if (qty > maxQty) maxQty = qty; });
            }

            // Apply logarithmic scaling to max
            const logMaxQty = Math.log10(maxQty + 1);

            // Draw columns from oldest to newest (left to right)
            for (let col = 0; col < numColumns; col++) {
                const historyIndex = historyLen - numColumns + col;
                if (historyIndex < 0) continue;

                const snapshot = historyRef.current[historyIndex];
                if (!snapshot) continue;

                const x = col * COLUMN_WIDTH;

                // Draw bids
                snapshot.bids.forEach((qty, price) => {
                    if (price > maxPrice || price < minPrice) return;

                    const y = priceToY(price);
                    const barHeight = Math.max(Math.ceil(1 / pricePerPixel), 1);

                    // Logarithmic intensity
                    const intensity = Math.min(Math.log10(qty + 1) / logMaxQty, 1);
                    const colorIndex = Math.floor(intensity * 255);

                    ctx.fillStyle = colorMap[colorIndex];
                    ctx.fillRect(x, y, COLUMN_WIDTH, barHeight);
                });

                // Draw asks
                snapshot.asks.forEach((qty, price) => {
                    if (price > maxPrice || price < minPrice) return;

                    const y = priceToY(price);
                    const barHeight = Math.max(Math.ceil(1 / pricePerPixel), 1);

                    const intensity = Math.min(Math.log10(qty + 1) / logMaxQty, 1);
                    const colorIndex = Math.floor(intensity * 255);

                    ctx.fillStyle = colorMap[colorIndex];
                    ctx.fillRect(x, y, COLUMN_WIDTH, barHeight);
                });
            }

            // 5. Draw Grid Lines
            ctx.fillStyle = themeConfig.gridColor;
            const priceStep = calculateNiceStep(priceRangeHalf * 2, 10);
            const startPrice = Math.floor(minPrice / priceStep) * priceStep;

            for (let p = startPrice; p <= maxPrice; p += priceStep) {
                const y = priceToY(p);
                ctx.fillRect(0, y, chartWidth, 1);
            }

            // 6. Draw Best Bid/Ask Lines (on latest snapshot)
            if (dataRef.current) {
                const bestBid = dataRef.current.bestBid;
                const bestAsk = dataRef.current.bestAsk;

                if (bestBid > 0) {
                    const y = priceToY(bestBid);
                    ctx.fillStyle = themeConfig.bidLineColor;
                    ctx.fillRect(0, y, chartWidth, 2);
                }

                if (bestAsk > 0) {
                    const y = priceToY(bestAsk);
                    ctx.fillStyle = themeConfig.askLineColor;
                    ctx.fillRect(0, y, chartWidth, 2);
                }
            }

            // 7. Render Volume Bubbles (trades)
            const now = Date.now();
            if (dataRef.current) {
                dataRef.current.trades.forEach(trade => {
                    // Only render recent trades (last 300ms)
                    if (now - trade.time > 300) return;
                    if (trade.price > maxPrice || trade.price < minPrice) return;

                    const y = priceToY(trade.price);
                    // Position bubble at rightmost visible area
                    const tradeAge = now - trade.time;
                    const x = chartWidth - (tradeAge / 300) * 100; // Slide left as it ages

                    // Logarithmic radius based on volume
                    const radius = Math.max(4, Math.min(Math.log10(trade.quantity * 1000 + 1) * 5, 30));

                    // Draw bubble with gradient
                    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
                    if (trade.isBuyerMaker) {
                        grad.addColorStop(0, themeConfig.sellBubbleGradient[0]);
                        grad.addColorStop(1, themeConfig.sellBubbleGradient[1]);
                    } else {
                        grad.addColorStop(0, themeConfig.buyBubbleGradient[0]);
                        grad.addColorStop(1, themeConfig.buyBubbleGradient[1]);
                    }

                    ctx.beginPath();
                    ctx.arc(x, y, radius, 0, Math.PI * 2);
                    ctx.fillStyle = grad;
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                });
            }

            // 8. Draw Price Axis (Right Side)
            ctx.fillStyle = themeConfig.axisBackground;
            ctx.fillRect(chartWidth, 0, AXIS_WIDTH, height);

            // Draw price labels
            ctx.fillStyle = themeConfig.textColor;
            ctx.font = '10px monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';

            for (let p = startPrice; p <= maxPrice; p += priceStep) {
                const y = priceToY(p);

                // Tick line
                ctx.fillStyle = themeConfig.gridColor;
                ctx.fillRect(chartWidth, y, 5, 1);

                // Label
                ctx.fillStyle = themeConfig.textColor;
                const label = p.toFixed(currentPrice < 10 ? 4 : 2);
                ctx.fillText(label, chartWidth + 8, y);
            }

            // Current price highlight
            if (currentPrice > 0) {
                const currentY = priceToY(currentPrice);

                // Highlight box
                ctx.fillStyle = themeConfig.currentPriceBackground;
                ctx.fillRect(chartWidth, currentY - 9, AXIS_WIDTH, 18);

                // Label
                ctx.fillStyle = themeConfig.currentPriceText;
                ctx.font = 'bold 11px monospace';
                const priceLabel = currentPrice.toFixed(currentPrice < 10 ? 4 : 2);
                ctx.fillText(priceLabel, chartWidth + 6, currentY);
            }

            animationId = requestAnimationFrame(render);
        };

        animationId = requestAnimationFrame(render);

        return () => {
            cancelAnimationFrame(animationId);
        };
    }, [symbol, theme, colorMap, themeConfig, pricePerPixel]);

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
    }, [symbol]);

    // Zoom handler
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 1.1 : 0.9;
        setPricePerPixel(prev => Math.max(0.001, Math.min(prev * delta, 100)));
    };

    return (
        <div className="relative w-full h-full overflow-hidden" style={{ background: themeConfig.background }}>
            <canvas
                ref={canvasRef}
                className="block cursor-crosshair"
                onWheel={handleWheel}
            />

            {/* Minimal Overlay */}
            <div
                className="absolute top-3 left-3 pointer-events-none text-xs p-2 rounded backdrop-blur-sm"
                style={{
                    background: `${themeConfig.axisBackground}CC`,
                    color: themeConfig.textColor
                }}
            >
                <div className="flex items-center gap-2">
                    <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: status === 'connected' ? '#22c55e' : '#eab308' }}
                    />
                    <span className="font-bold">{symbol}</span>
                </div>
                <div className="mt-1">
                    Price: <span style={{ color: themeConfig.currentPriceBackground }}>
                        {dataRef.current?.lastPrice?.toFixed(2) || '---'}
                    </span>
                </div>
            </div>

            {/* Loading Indicator */}
            {status === 'connecting' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-orange-400 font-mono text-sm">Connecting to Binance...</span>
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper: Calculate a "nice" step value for grid lines
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
