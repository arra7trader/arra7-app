'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { BookmapState } from '@/hooks/useBookmap';
import {
    BookmapTheme,
    VisualizationMode,
    BubbleStyle,
    THEMES,
    generateColorStringLookup
} from '@/lib/bookmap/themes';

interface BookmapCanvasProps {
    symbol: string;
    dataRef: React.MutableRefObject<BookmapState>;
    status: 'connecting' | 'connected' | 'error';
    theme: BookmapTheme;
    mode: VisualizationMode;
    bubbleStyle: BubbleStyle;
}

// History snapshot
type DepthSnapshot = {
    time: number;
    bids: Map<number, number>;
    asks: Map<number, number>;
    bestBid: number;
    bestAsk: number;
    lastPrice: number;
    buyVolume: number;
    sellVolume: number;
};

const MAX_HISTORY = 400; // Optimized history length
const SNAPSHOT_INTERVAL = 100;
const VOLUME_HEIGHT = 60;
const AXIS_WIDTH = 80;

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
    const priceHistoryRef = useRef<{ time: number; price: number; isBuy: boolean }[]>([]);
    const lastSnapshotTime = useRef(0);
    const maxQuantityRef = useRef(1);
    const initialPriceRef = useRef<number | null>(null);
    const [showLegend, setShowLegend] = useState(true);

    const themeConfig = THEMES[theme];
    const colorLookup = useMemo(() => generateColorStringLookup(themeConfig), [themeConfig]);

    const [pricePerPixel, setPricePerPixel] = useState(5);
    const [autoScaled, setAutoScaled] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        let animationId: number;
        let lastTradeCount = 0;

        const render = (timestamp: number) => {
            const width = canvas.width;
            const height = canvas.height;
            const chartHeight = height - VOLUME_HEIGHT;
            const chartWidth = width - AXIS_WIDTH;

            // 1. DATA COLLECTION
            if (timestamp - lastSnapshotTime.current > SNAPSHOT_INTERVAL && dataRef.current) {
                let buyVol = 0, sellVol = 0;
                const trades = dataRef.current.trades;
                const len = trades.length;
                // Only process new trades
                const start = Math.max(0, lastTradeCount);
                for (let i = start; i < len; i++) {
                    if (trades[i].isBuyerMaker) sellVol += trades[i].quantity;
                    else buyVol += trades[i].quantity;
                }
                lastTradeCount = len;

                const snapshot: DepthSnapshot = {
                    time: timestamp,
                    bids: new Map(dataRef.current.bids),
                    asks: new Map(dataRef.current.asks),
                    bestBid: dataRef.current.bestBid,
                    bestAsk: dataRef.current.bestAsk,
                    lastPrice: dataRef.current.lastPrice,
                    buyVolume: buyVol,
                    sellVolume: sellVol,
                };
                historyRef.current.push(snapshot);

                if (historyRef.current.length > MAX_HISTORY) {
                    historyRef.current.shift();
                }
                lastSnapshotTime.current = timestamp;

                if (dataRef.current.lastPrice > 0) {
                    priceHistoryRef.current.push({
                        time: timestamp,
                        price: dataRef.current.lastPrice,
                        isBuy: !dataRef.current.trades[dataRef.current.trades.length - 1]?.isBuyerMaker
                    });
                    if (priceHistoryRef.current.length > MAX_HISTORY) {
                        priceHistoryRef.current.shift();
                    }
                }

                // Update maxQ roughly
                let maxQ = 1;
                snapshot.bids.forEach(q => { if (q > maxQ) maxQ = q; });
                snapshot.asks.forEach(q => { if (q > maxQ) maxQ = q; });
                // Fast decay
                maxQuantityRef.current = Math.max(maxQ, maxQuantityRef.current * 0.99);
            }

            // 2. CLEAR & SETUP
            ctx.fillStyle = themeConfig.background;
            ctx.fillRect(0, 0, width, height);

            const currentPrice = dataRef.current?.lastPrice || 0;
            if (currentPrice === 0) {
                animationId = requestAnimationFrame(render);
                return;
            }

            // Auto-scale
            if (initialPriceRef.current === null || !autoScaled) {
                initialPriceRef.current = currentPrice;
                const targetRange = currentPrice * 0.015;
                const optimalPPP = Math.max(targetRange / (chartHeight / 2), 0.01);
                setPricePerPixel(optimalPPP);
                setAutoScaled(true);
            }

            const ppp = pricePerPixel;
            const effectiveChartHeightHalf = chartHeight / 2;
            const priceRangeHalf = effectiveChartHeightHalf * ppp;
            const maxPrice = currentPrice + priceRangeHalf;
            const minPrice = currentPrice - priceRangeHalf;

            // Optimized coordinate mapper
            const priceToY = (price: number) => (effectiveChartHeightHalf - (price - currentPrice) / ppp) | 0;

            const maxQ = maxQuantityRef.current;
            const logMaxQ = Math.log10(maxQ + 1);

            // 3. RENDER HEATMAP
            if (mode === 'heatmap' || mode === 'heatmap-bubbles') {
                const colWidth = 4; // Wider columns for performance & visual blockiness
                const numColumns = Math.ceil(chartWidth / colWidth);
                const historyLen = historyRef.current.length;
                const barHeight = Math.max(Math.ceil(2 / ppp * 4), 3); // Taller blocks

                for (let col = 0; col < numColumns; col++) {
                    const historyIndex = historyLen - numColumns + col;
                    if (historyIndex < 0) continue;

                    const snapshot = historyRef.current[historyIndex];
                    if (!snapshot) continue;

                    const x = col * colWidth;

                    // Draw Bids
                    snapshot.bids.forEach((qty, price) => {
                        if (price > maxPrice || price < minPrice) return;
                        const intensity = Math.min((Math.log10(qty + 1) / logMaxQ) * 1.3, 1);
                        ctx.fillStyle = colorLookup[(intensity * 255) | 0];
                        ctx.fillRect(x, priceToY(price) - barHeight / 2, colWidth, barHeight);
                    });

                    // Draw Asks
                    snapshot.asks.forEach((qty, price) => {
                        if (price > maxPrice || price < minPrice) return;
                        const intensity = Math.min((Math.log10(qty + 1) / logMaxQ) * 1.3, 1);
                        ctx.fillStyle = colorLookup[(intensity * 255) | 0];
                        ctx.fillRect(x, priceToY(price) - barHeight / 2, colWidth, barHeight);
                    });
                }
            }

            // 4. PRICE LINE
            const priceLen = priceHistoryRef.current.length;
            if (priceLen > 1) {
                const colWidth = 4;
                const numColumns = Math.ceil(chartWidth / colWidth);

                ctx.lineWidth = 2;
                ctx.beginPath();

                for (let col = 0; col < numColumns; col++) {
                    const idx = priceLen - numColumns + col;
                    if (idx < 0) continue;
                    const point = priceHistoryRef.current[idx];
                    if (!point || point.price > maxPrice || point.price < minPrice) continue;

                    const x = col * colWidth + colWidth / 2;
                    const y = priceToY(point.price);

                    if (col === 0 || idx === 0) ctx.moveTo(x, y);
                    else {
                        ctx.lineTo(x, y);
                        ctx.strokeStyle = point.isBuy ? themeConfig.priceLineUp : themeConfig.priceLineDown;
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.moveTo(x, y);
                    }
                }
            }

            // 5. BUBBLES (Optimized)
            if (mode === 'bubbles' || mode === 'heatmap-bubbles') {
                const now = Date.now();
                const trades = dataRef.current?.trades || [];
                // Only loop reversed to find visible ones quickly? No, array is time sorted.
                // We need recent trades.
                // Loop backwards until age > 10s
                for (let i = trades.length - 1; i >= 0; i--) {
                    const trade = trades[i];
                    const age = now - trade.time;
                    if (age > 10000) break; // Optimization: stop if too old
                    if (trade.price > maxPrice || trade.price < minPrice) continue;

                    const x = chartWidth - (age / 10000) * chartWidth; // 10s window on screen (overlay)
                    // Note: This bubble logic is "overlay" style, moving left.

                    const y = priceToY(trade.price);
                    const radius = Math.max(3, Math.min(Math.log10(trade.quantity * 100 + 1) * 3, 20));

                    const bubbleColor = trade.isBuyerMaker ? themeConfig.sellBubble : themeConfig.buyBubble;

                    ctx.beginPath();
                    ctx.arc(x, y, radius, 0, Math.PI * 2);
                    // Simple flat fill
                    ctx.fillStyle = hexToRgba(bubbleColor.fill, 0.7);
                    ctx.fill();
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = bubbleColor.stroke;
                    ctx.stroke();
                }
            }

            // 6. VOLUME PROFILE
            const colWidth = 4;
            const numCols = Math.ceil(chartWidth / colWidth);
            const histLen = historyRef.current.length;

            ctx.fillStyle = themeConfig.axisBackground;
            ctx.fillRect(0, chartHeight, chartWidth, VOLUME_HEIGHT);

            let maxVolProfile = 0.001;
            // Scan visible history for max volume
            const startIdx = Math.max(0, histLen - numCols);
            for (let i = startIdx; i < histLen; i++) {
                const s = historyRef.current[i];
                maxVolProfile = Math.max(maxVolProfile, s.buyVolume + s.sellVolume);
            }

            for (let col = 0; col < numCols; col++) {
                const idx = histLen - numCols + col;
                if (idx < 0) continue;
                const s = historyRef.current[idx];
                const totalVol = s.buyVolume + s.sellVolume;
                if (totalVol < 0.0001) continue;

                const x = col * colWidth;
                const h = (totalVol / maxVolProfile) * (VOLUME_HEIGHT - 6);

                ctx.fillStyle = s.buyVolume > s.sellVolume ? themeConfig.volumeUp : themeConfig.volumeDown;
                ctx.fillRect(x, height - 3 - h, colWidth - 1, h);
            }

            // 7. GRID & AXIS
            ctx.fillStyle = themeConfig.axisBackground;
            ctx.fillRect(chartWidth, 0, AXIS_WIDTH, height);

            const gridStep = calculateNiceStep(priceRangeHalf * 2, 8);
            const startGrid = Math.floor(minPrice / gridStep) * gridStep;

            ctx.strokeStyle = themeConfig.gridColor;
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 5]);
            ctx.font = '10px monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';

            for (let p = startGrid; p <= maxPrice; p += gridStep) {
                const y = priceToY(p);
                // Draw Grid
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(chartWidth, y);
                ctx.stroke();
                // Draw Label
                ctx.fillStyle = themeConfig.textColor;
                ctx.fillText(p.toFixed(2), chartWidth + 5, y);
            }
            ctx.setLineDash([]);

            // Current Price
            if (currentPrice > minPrice && currentPrice < maxPrice) {
                const y = priceToY(currentPrice);
                ctx.fillStyle = themeConfig.currentPriceBackground;
                ctx.fillRect(chartWidth, y - 9, AXIS_WIDTH, 18);
                ctx.fillStyle = themeConfig.currentPriceText;
                ctx.font = 'bold 11px monospace';
                ctx.fillText(currentPrice.toFixed(2), chartWidth + 5, y);
            }

            animationId = requestAnimationFrame(render);
        };

        animationId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(animationId);
    }, [symbol, theme, mode, bubbleStyle, colorLookup, themeConfig, pricePerPixel, autoScaled]);

    // Resizing
    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current?.parentElement) {
                canvasRef.current.width = canvasRef.current.parentElement.clientWidth;
                canvasRef.current.height = canvasRef.current.parentElement.clientHeight;
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Reset
    useEffect(() => {
        historyRef.current = [];
        priceHistoryRef.current = [];
        maxQuantityRef.current = 1;
        initialPriceRef.current = null;
        setAutoScaled(false);
    }, [symbol]);

    // Wheel Zoom
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 1.1 : 0.9;
        setPricePerPixel(prev => Math.max(0.0001, Math.min(prev * delta, 500)));
    }, []);

    return (
        <div className="relative w-full h-full overflow-hidden" style={{ background: themeConfig.background }}>
            <canvas ref={canvasRef} className="block cursor-crosshair" onWheel={handleWheel} />

            {/* Legend & Status */}
            <div className="absolute top-2 left-2 flex flex-col gap-2 pointer-events-none">
                <div className="flex items-center gap-3 p-2 rounded backdrop-blur-md shadow-lg pointer-events-auto border"
                    style={{ background: `${themeConfig.axisBackground}C0`, borderColor: themeConfig.gridColor }}>
                    <div className="flex items-center gap-2 font-mono text-sm font-bold" style={{ color: themeConfig.textColor }}>
                        <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
                        {symbol}
                    </div>
                    <div className="text-lg font-mono font-bold" style={{ color: themeConfig.currentPriceBackground }}>
                        {dataRef.current?.lastPrice?.toFixed(2) || '---'}
                    </div>
                    <button onClick={() => setShowLegend(!showLegend)}
                        className="ml-2 px-2 py-0.5 text-[10px] uppercase tracking-wider rounded border hover:bg-white/5 transition-colors"
                        style={{ borderColor: themeConfig.gridColor, color: themeConfig.textMuted }}>
                        {showLegend ? 'Hide Legend' : 'Legend'}
                    </button>
                </div>

                {/* Legend Panel */}
                {showLegend && (
                    <div className="p-3 rounded backdrop-blur-md shadow-xl border pointer-events-auto w-[220px]"
                        style={{ background: `${themeConfig.axisBackground}F0`, borderColor: themeConfig.gridColor, color: themeConfig.textColor }}>
                        <h4 className="text-[10px] font-bold uppercase tracking-wider mb-2 border-b pb-1 opacity-80" style={{ borderColor: themeConfig.gridColor }}>
                            Order Flow Legend
                        </h4>

                        {/* 1. Heatmap */}
                        <div className="mb-3">
                            <div className="flex justify-between text-[9px] mb-1 opacity-70">
                                <span>Low Liquidity</span>
                                <span>High Liquidity</span>
                            </div>
                            <div className="h-3 w-full rounded-sm mb-1" style={{
                                background: `linear-gradient(to right, ${themeConfig.heatmapColors[0]}, ${themeConfig.heatmapColors[10]}, ${themeConfig.heatmapColors[20]})`
                            }} />
                            <p className="text-[9px] leading-relaxed opacity-70">
                                White/Orange indicates <strong>Limit Orders</strong> waiting to be filled (Support/Resistance).
                            </p>
                        </div>

                        {/* 2. Bubbles */}
                        <div className="mb-3">
                            <h5 className="text-[9px] font-bold mb-1 opacity-80">Market Orders (Executions)</h5>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-3 h-3 rounded-full" style={{ background: hexToRgba(themeConfig.buyBubble.fill, 0.8), border: `1px solid ${themeConfig.buyBubble.stroke}` }} />
                                <span className="text-[9px]">Aggressive Buyer</span>
                            </div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-3 h-3 rounded-full" style={{ background: hexToRgba(themeConfig.sellBubble.fill, 0.8), border: `1px solid ${themeConfig.sellBubble.stroke}` }} />
                                <span className="text-[9px]">Aggressive Seller</span>
                            </div>
                        </div>

                        {/* 3. Price Line */}
                        <div>
                            <h5 className="text-[9px] font-bold mb-1 opacity-80">Trends</h5>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-0.5" style={{ background: themeConfig.priceLineUp }} />
                                <span className="text-[9px]">Price Movement</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {status === 'connecting' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
                        <span className="text-xs font-mono text-white/70">Connecting to Binance Stream...</span>
                    </div>
                </div>
            )}
        </div>
    );
}

function calculateNiceStep(range: number, targetSteps: number): number {
    const roughStep = range / targetSteps;
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const residual = roughStep / magnitude;
    let niceStep;
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
