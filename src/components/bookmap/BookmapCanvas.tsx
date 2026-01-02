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

const MAX_HISTORY = 600;
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

            // Take snapshots
            if (timestamp - lastSnapshotTime.current > SNAPSHOT_INTERVAL && dataRef.current) {
                // Calculate volume since last snapshot
                let buyVol = 0, sellVol = 0;
                const trades = dataRef.current.trades;
                for (let i = lastTradeCount; i < trades.length; i++) {
                    if (trades[i].isBuyerMaker) {
                        sellVol += trades[i].quantity;
                    } else {
                        buyVol += trades[i].quantity;
                    }
                }
                lastTradeCount = trades.length;

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

                // Track price line
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

                // Update max quantity
                let maxQ = 1;
                const recent = historyRef.current.slice(-50);
                recent.forEach(snap => {
                    snap.bids.forEach(q => { if (q > maxQ) maxQ = q; });
                    snap.asks.forEach(q => { if (q > maxQ) maxQ = q; });
                });
                maxQuantityRef.current = maxQ;
            }

            // Clear
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

            // Price range
            const ppp = pricePerPixel;
            const priceRangeHalf = (chartHeight / 2) * ppp;
            const maxPrice = currentPrice + priceRangeHalf;
            const minPrice = currentPrice - priceRangeHalf;

            const priceToY = (price: number) => Math.floor(chartHeight / 2 - (price - currentPrice) / ppp);

            // Intensity calculation
            const getIntensity = (quantity: number) => {
                const base = Math.log10(quantity + 1) / Math.log10(maxQuantityRef.current + 1);
                return Math.min(Math.pow(base, 0.7), 1);
            };

            // =====================
            // RENDER HEATMAP
            // =====================
            if (mode === 'heatmap' || mode === 'heatmap-bubbles') {
                const colWidth = 2;
                const numColumns = Math.floor(chartWidth / colWidth);
                const historyLen = historyRef.current.length;

                // Calculate bar height based on price precision
                const barHeight = Math.max(Math.ceil(1 / ppp), 1);

                for (let col = 0; col < numColumns; col++) {
                    const historyIndex = historyLen - numColumns + col;
                    if (historyIndex < 0) continue;

                    const snapshot = historyRef.current[historyIndex];
                    if (!snapshot) continue;

                    const x = col * colWidth;

                    // Draw all levels
                    const allLevels = new Map<number, number>();
                    snapshot.bids.forEach((qty, price) => allLevels.set(price, qty));
                    snapshot.asks.forEach((qty, price) => allLevels.set(price, qty));

                    allLevels.forEach((qty, price) => {
                        if (price > maxPrice || price < minPrice) return;

                        const y = priceToY(price);
                        const intensity = getIntensity(qty);
                        const colorIndex = Math.floor(intensity * 255);

                        ctx.fillStyle = colorLookup[colorIndex];
                        ctx.fillRect(x, y - barHeight / 2, colWidth, barHeight);
                    });
                }
            }

            // =====================
            // RENDER PRICE LINE
            // =====================
            const priceLen = priceHistoryRef.current.length;
            if (priceLen > 1) {
                const colWidth = 2;
                const numColumns = Math.floor(chartWidth / colWidth);

                ctx.lineWidth = 2;
                ctx.beginPath();

                let lastY = 0;
                let lastIsBuy = true;

                for (let col = 0; col < numColumns; col++) {
                    const priceIndex = priceLen - numColumns + col;
                    if (priceIndex < 0) continue;

                    const point = priceHistoryRef.current[priceIndex];
                    if (!point || point.price > maxPrice || point.price < minPrice) continue;

                    const x = col * colWidth + colWidth / 2;
                    const y = priceToY(point.price);

                    if (col === 0 || priceIndex === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        // Change color based on direction
                        ctx.strokeStyle = point.isBuy ? themeConfig.priceLineUp : themeConfig.priceLineDown;
                        ctx.lineTo(x, y);
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.moveTo(x, y);
                    }
                    lastY = y;
                    lastIsBuy = point.isBuy;
                }
                ctx.stroke();
            }

            // =====================
            // RENDER BUBBLES
            // =====================
            if (mode === 'bubbles' || mode === 'heatmap-bubbles') {
                const now = Date.now();
                const trades = dataRef.current?.trades || [];

                trades.forEach(trade => {
                    const age = now - trade.time;
                    if (age > 1000) return;
                    if (trade.price > maxPrice || trade.price < minPrice) return;

                    const y = priceToY(trade.price);
                    const x = chartWidth - (age / 1000) * chartWidth * 0.3 - 10;

                    const baseRadius = Math.log10(trade.quantity * 10000 + 1) * 4;
                    const radius = Math.max(3, Math.min(baseRadius, 25));
                    const alpha = 1 - (age / 1000) * 0.6;

                    const bubbleConfig = trade.isBuyerMaker
                        ? themeConfig.sellBubble
                        : themeConfig.buyBubble;

                    if (bubbleStyle === '3d') {
                        ctx.beginPath();
                        ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
                        ctx.fillStyle = bubbleConfig.glow.replace('0.5', String(0.3 * alpha));
                        ctx.fill();

                        const grad = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius);
                        grad.addColorStop(0, `rgba(255,255,255,${0.5 * alpha})`);
                        grad.addColorStop(0.5, hexToRgba(bubbleConfig.fill, alpha));
                        grad.addColorStop(1, hexToRgba(bubbleConfig.stroke, alpha * 0.8));

                        ctx.beginPath();
                        ctx.arc(x, y, radius, 0, Math.PI * 2);
                        ctx.fillStyle = grad;
                        ctx.fill();
                    } else {
                        ctx.beginPath();
                        ctx.arc(x, y, radius, 0, Math.PI * 2);
                        ctx.fillStyle = hexToRgba(bubbleConfig.fill, alpha);
                        ctx.fill();
                        ctx.strokeStyle = hexToRgba(bubbleConfig.stroke, alpha);
                        ctx.lineWidth = 1.5;
                        ctx.stroke();
                    }
                });
            }

            // =====================
            // RENDER VOLUME PROFILE (Bottom)
            // =====================
            ctx.fillStyle = themeConfig.axisBackground;
            ctx.fillRect(0, chartHeight, chartWidth, VOLUME_HEIGHT);

            const colWidth = 2;
            const numCols = Math.floor(chartWidth / colWidth);
            const histLen = historyRef.current.length;

            let maxVol = 1;
            for (let i = Math.max(0, histLen - numCols); i < histLen; i++) {
                const snap = historyRef.current[i];
                if (snap) {
                    maxVol = Math.max(maxVol, snap.buyVolume + snap.sellVolume);
                }
            }

            for (let col = 0; col < numCols; col++) {
                const idx = histLen - numCols + col;
                if (idx < 0) continue;

                const snap = historyRef.current[idx];
                if (!snap) continue;

                const x = col * colWidth;
                const totalVol = snap.buyVolume + snap.sellVolume;
                const volHeight = (totalVol / maxVol) * (VOLUME_HEIGHT - 10);

                if (snap.buyVolume > snap.sellVolume) {
                    ctx.fillStyle = themeConfig.volumeUp;
                } else {
                    ctx.fillStyle = themeConfig.volumeDown;
                }
                ctx.fillRect(x, chartHeight + VOLUME_HEIGHT - 5 - volHeight, colWidth - 1, volHeight);
            }

            // =====================
            // RENDER GRID
            // =====================
            const gridStep = calculateNiceStep(priceRangeHalf * 2, 12);
            const startGrid = Math.floor(minPrice / gridStep) * gridStep;

            ctx.strokeStyle = themeConfig.gridColor;
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 4]);
            for (let p = startGrid; p <= maxPrice; p += gridStep) {
                const y = priceToY(p);
                ctx.beginPath();
                ctx.moveTo(0, y + 0.5);
                ctx.lineTo(chartWidth, y + 0.5);
                ctx.stroke();
            }
            ctx.setLineDash([]);

            // =====================
            // RENDER PRICE AXIS
            // =====================
            ctx.fillStyle = themeConfig.axisBackground;
            ctx.fillRect(chartWidth, 0, AXIS_WIDTH, height);

            ctx.font = '10px monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';

            for (let p = startGrid; p <= maxPrice; p += gridStep) {
                const y = priceToY(p);
                ctx.fillStyle = themeConfig.textMuted;
                ctx.fillRect(chartWidth, y, 5, 1);
                ctx.fillStyle = themeConfig.textColor;
                const decimals = currentPrice < 10 ? 4 : (currentPrice < 1000 ? 2 : 0);
                ctx.fillText(p.toFixed(decimals), chartWidth + 8, y);
            }

            // Current price highlight
            if (currentPrice > minPrice && currentPrice < maxPrice) {
                const currentY = priceToY(currentPrice);

                ctx.fillStyle = themeConfig.currentPriceBackground;
                ctx.fillRect(chartWidth, currentY - 9, AXIS_WIDTH, 18);

                ctx.fillStyle = themeConfig.currentPriceText;
                ctx.font = 'bold 11px monospace';
                const decimals = currentPrice < 10 ? 4 : 2;
                ctx.fillText(currentPrice.toFixed(decimals), chartWidth + 6, currentY);
            }

            animationId = requestAnimationFrame(render);
        };

        animationId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(animationId);
    }, [symbol, theme, mode, bubbleStyle, colorLookup, themeConfig, pricePerPixel, autoScaled]);

    // Resize
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

    // Reset on symbol change
    useEffect(() => {
        historyRef.current = [];
        priceHistoryRef.current = [];
        maxQuantityRef.current = 1;
        initialPriceRef.current = null;
        setAutoScaled(false);
    }, [symbol]);

    // Zoom
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 1.1 : 0.9;
        setPricePerPixel(prev => Math.max(0.0001, Math.min(prev * delta, 500)));
    }, []);

    return (
        <div className="relative w-full h-full overflow-hidden" style={{ background: themeConfig.background }}>
            <canvas
                ref={canvasRef}
                className="block cursor-crosshair"
                onWheel={handleWheel}
            />

            {/* Status Overlay */}
            <div
                className="absolute top-2 left-2 text-xs p-2 rounded pointer-events-none"
                style={{ background: `${themeConfig.axisBackground}E0`, color: themeConfig.textColor }}
            >
                <div className="flex items-center gap-2 font-semibold text-sm">
                    <span
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{ background: status === 'connected' ? '#3FB950' : '#F0B400' }}
                    />
                    {symbol}
                </div>
                <div className="mt-1 text-lg font-bold" style={{ color: themeConfig.currentPriceBackground }}>
                    {dataRef.current?.lastPrice?.toFixed(2) || '---'}
                </div>
                <div className="text-[10px] mt-1" style={{ color: themeConfig.textMuted }}>
                    {dataRef.current?.levelCount || 0} levels
                </div>
            </div>

            {status === 'connecting' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-blue-300 text-sm">Loading order book...</span>
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
