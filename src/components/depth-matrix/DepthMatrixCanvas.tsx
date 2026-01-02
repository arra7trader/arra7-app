'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { DepthMatrixState } from '@/hooks/useDepthMatrix';
import {
    DEPTH_MATRIX_THEME,
    generateHeatmapLookup,
    WHALE_THRESHOLDS
} from '@/lib/depth-matrix/theme';
import {
    detectLiquidityWalls,
    calculateNetFlow,
    detectWhales,
    LiquidityWall,
    WhaleAlert
} from '@/lib/depth-matrix/analytics';

interface DepthMatrixCanvasProps {
    symbol: 'BTCUSDT' | 'ETHUSDT' | 'PAXGUSDT';
    dataRef: React.MutableRefObject<DepthMatrixState>;
    status: 'connecting' | 'connected' | 'error';
    onWhaleAlert?: (alert: WhaleAlert) => void;
}

type DepthSnapshot = {
    time: number;
    bids: Map<number, number>;
    asks: Map<number, number>;
    lastPrice: number;
    buyVolume: number;
    sellVolume: number;
};

const MAX_HISTORY = 500;
const SNAPSHOT_INTERVAL = 80; // Faster updates
const VOLUME_HEIGHT = 50;
const AXIS_WIDTH = 70;

const theme = DEPTH_MATRIX_THEME;

export default function DepthMatrixCanvas({
    symbol,
    dataRef,
    status,
    onWhaleAlert
}: DepthMatrixCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const historyRef = useRef<DepthSnapshot[]>([]);
    const priceHistoryRef = useRef<{ time: number; price: number; isBuy: boolean }[]>([]);
    const lastSnapshotTime = useRef(0);
    const maxQuantityRef = useRef(1);
    const initialPriceRef = useRef<number | null>(null);
    const lastWhaleCheckTime = useRef(0);

    const [pricePerPixel, setPricePerPixel] = useState(5);
    const [autoScaled, setAutoScaled] = useState(false);
    const [liquidityWalls, setLiquidityWalls] = useState<LiquidityWall[]>([]);
    const [netFlow, setNetFlow] = useState({ flowPercent: 0, buyVolume: 0, sellVolume: 0, netFlow: 0 });

    const colorLookup = useMemo(() => generateHeatmapLookup(), []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        let animationId: number;
        let lastTradeCount = 0;

        if (lastSnapshotTime.current === 0) lastSnapshotTime.current = performance.now();

        const render = (timestamp: number) => {
            const width = canvas.width;
            const height = canvas.height;
            const chartHeight = height - VOLUME_HEIGHT;
            const chartWidth = width - AXIS_WIDTH;

            // ============ DATA COLLECTION ============
            const timeSinceLastSnapshot = timestamp - lastSnapshotTime.current;

            if (timeSinceLastSnapshot > SNAPSHOT_INTERVAL && dataRef.current) {
                const stepsToFill = Math.floor(timeSinceLastSnapshot / SNAPSHOT_INTERVAL);
                const steps = Math.min(stepsToFill, 200);

                let buyVol = 0, sellVol = 0;
                const trades = dataRef.current.trades;
                const len = trades.length;
                const start = Math.max(0, lastTradeCount);
                for (let i = start; i < len; i++) {
                    if (trades[i].isBuyerMaker) sellVol += trades[i].quantity;
                    else buyVol += trades[i].quantity;
                }
                lastTradeCount = len;

                const buyVolPerStep = buyVol / Math.max(steps, 1);
                const sellVolPerStep = sellVol / Math.max(steps, 1);

                const currentBids = new Map(dataRef.current.bids);
                const currentAsks = new Map(dataRef.current.asks);
                const currentLastPrice = dataRef.current.lastPrice;

                for (let i = 0; i < steps; i++) {
                    const snapshotTime = lastSnapshotTime.current + SNAPSHOT_INTERVAL;
                    historyRef.current.push({
                        time: snapshotTime,
                        bids: currentBids,
                        asks: currentAsks,
                        lastPrice: currentLastPrice,
                        buyVolume: buyVolPerStep,
                        sellVolume: sellVolPerStep,
                    });

                    if (historyRef.current.length > MAX_HISTORY) {
                        historyRef.current.shift();
                    }

                    if (currentLastPrice > 0) {
                        priceHistoryRef.current.push({
                            time: snapshotTime,
                            price: currentLastPrice,
                            isBuy: dataRef.current.lastTradeIsBuy
                        });
                        if (priceHistoryRef.current.length > MAX_HISTORY) {
                            priceHistoryRef.current.shift();
                        }
                    }

                    lastSnapshotTime.current = snapshotTime;
                }

                let maxQ = 1;
                currentBids.forEach(q => { if (q > maxQ) maxQ = q; });
                currentAsks.forEach(q => { if (q > maxQ) maxQ = q; });
                maxQuantityRef.current = Math.max(maxQ, maxQuantityRef.current * 0.995);

                // Analytics (every 500ms)
                if (timestamp - lastWhaleCheckTime.current > 500) {
                    // Detect liquidity walls
                    const walls = detectLiquidityWalls(currentBids, currentAsks, 6);
                    setLiquidityWalls(walls);

                    // Calculate net flow
                    const flow = calculateNetFlow(dataRef.current.trades, 5000);
                    setNetFlow(flow);

                    // Detect whales
                    const threshold = WHALE_THRESHOLDS[symbol] || 10;
                    const whales = detectWhales(dataRef.current.trades, threshold, lastWhaleCheckTime.current);
                    whales.forEach(w => {
                        w.symbol = symbol;
                        onWhaleAlert?.(w);
                    });

                    lastWhaleCheckTime.current = timestamp;
                }
            }

            // ============ CLEAR ============
            ctx.fillStyle = theme.background;
            ctx.fillRect(0, 0, width, height);

            const currentPrice = dataRef.current?.lastPrice || 0;
            if (currentPrice === 0) {
                animationId = requestAnimationFrame(render);
                return;
            }

            // Auto-scale
            if (initialPriceRef.current === null || !autoScaled) {
                initialPriceRef.current = currentPrice;
                const targetRange = currentPrice * 0.012;
                const optimalPPP = Math.max(targetRange / (chartHeight / 2), 0.01);
                setPricePerPixel(optimalPPP);
                setAutoScaled(true);
            }

            const ppp = pricePerPixel;
            const halfHeight = chartHeight / 2;
            const priceRangeHalf = halfHeight * ppp;
            const maxPrice = currentPrice + priceRangeHalf;
            const minPrice = currentPrice - priceRangeHalf;

            const priceToY = (price: number) => (halfHeight - (price - currentPrice) / ppp) | 0;

            const maxQ = maxQuantityRef.current;
            const logMaxQ = Math.log10(maxQ + 1);

            // ============ HEATMAP ============
            const colWidth = 3;
            const numColumns = Math.ceil(chartWidth / colWidth);
            const historyLen = historyRef.current.length;
            const barHeight = Math.max(Math.ceil(3 / ppp * 3), 2);

            for (let col = 0; col < numColumns; col++) {
                const historyIndex = historyLen - numColumns + col;
                if (historyIndex < 0) continue;

                const snapshot = historyRef.current[historyIndex];
                if (!snapshot) continue;

                const x = col * colWidth;

                // Bids (cyan side)
                snapshot.bids.forEach((qty, price) => {
                    if (price > maxPrice || price < minPrice) return;
                    const intensity = Math.min((Math.log10(qty + 1) / logMaxQ) * 1.4, 1);
                    ctx.fillStyle = colorLookup[(intensity * 255) | 0];
                    ctx.fillRect(x, priceToY(price) - barHeight / 2, colWidth, barHeight);
                });

                // Asks (orange side)
                snapshot.asks.forEach((qty, price) => {
                    if (price > maxPrice || price < minPrice) return;
                    const intensity = Math.min((Math.log10(qty + 1) / logMaxQ) * 1.4, 1);
                    ctx.fillStyle = colorLookup[(intensity * 255) | 0];
                    ctx.fillRect(x, priceToY(price) - barHeight / 2, colWidth, barHeight);
                });
            }

            // ============ LIQUIDITY WALLS ============
            ctx.globalAlpha = 0.4;
            liquidityWalls.forEach(wall => {
                if (wall.price > maxPrice || wall.price < minPrice) return;
                const y = priceToY(wall.price);
                const lineWidth = 2 + wall.strength * 3;

                ctx.strokeStyle = wall.side === 'bid' ? theme.liquidityBid : theme.liquidityAsk;
                ctx.lineWidth = lineWidth;
                ctx.setLineDash([8, 4]);
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(chartWidth, y);
                ctx.stroke();
            });
            ctx.setLineDash([]);
            ctx.globalAlpha = 1;

            // ============ PRICE LINE ============
            const priceLen = priceHistoryRef.current.length;
            if (priceLen > 1) {
                ctx.lineWidth = 2;
                ctx.shadowColor = theme.primary;
                ctx.shadowBlur = 6;

                ctx.beginPath();
                let started = false;

                for (let col = 0; col < numColumns; col++) {
                    const idx = priceLen - numColumns + col;
                    if (idx < 0) continue;
                    const point = priceHistoryRef.current[idx];
                    if (!point || point.price > maxPrice || point.price < minPrice) continue;

                    const x = col * colWidth + colWidth / 2;
                    const y = priceToY(point.price);

                    if (!started) {
                        ctx.moveTo(x, y);
                        started = true;
                    } else {
                        ctx.lineTo(x, y);
                    }
                }

                ctx.strokeStyle = theme.priceLineCurrent;
                ctx.stroke();
                ctx.shadowBlur = 0;
            }

            // ============ VOLUME DELTA PROFILE ============
            ctx.fillStyle = theme.surface;
            ctx.fillRect(0, chartHeight, chartWidth, VOLUME_HEIGHT);

            // Separator line
            ctx.strokeStyle = theme.border;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, chartHeight);
            ctx.lineTo(chartWidth, chartHeight);
            ctx.stroke();

            let maxVolProfile = 0.001;
            const startIdx = Math.max(0, historyLen - numColumns);
            for (let i = startIdx; i < historyLen; i++) {
                const s = historyRef.current[i];
                maxVolProfile = Math.max(maxVolProfile, s.buyVolume + s.sellVolume);
            }

            for (let col = 0; col < numColumns; col++) {
                const idx = historyLen - numColumns + col;
                if (idx < 0) continue;
                const s = historyRef.current[idx];
                const buyH = (s.buyVolume / maxVolProfile) * (VOLUME_HEIGHT - 8);
                const sellH = (s.sellVolume / maxVolProfile) * (VOLUME_HEIGHT - 8);
                const x = col * colWidth;

                // Stack buy on top of sell
                ctx.fillStyle = theme.volumeSell;
                ctx.fillRect(x, height - 4 - sellH, colWidth - 1, sellH);
                ctx.fillStyle = theme.volumeBuy;
                ctx.fillRect(x, height - 4 - sellH - buyH, colWidth - 1, buyH);
            }

            // ============ AXIS ============
            ctx.fillStyle = theme.axisBg;
            ctx.fillRect(chartWidth, 0, AXIS_WIDTH, height);

            // Axis separator
            ctx.strokeStyle = theme.border;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(chartWidth, 0);
            ctx.lineTo(chartWidth, height);
            ctx.stroke();

            // Grid lines
            const gridStep = calculateNiceStep(priceRangeHalf * 2, 10);
            const startGrid = Math.floor(minPrice / gridStep) * gridStep;

            ctx.strokeStyle = theme.gridColor;
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 6]);
            ctx.font = '10px "JetBrains Mono", monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = theme.axisText;

            for (let p = startGrid; p <= maxPrice; p += gridStep) {
                const y = priceToY(p);
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(chartWidth, y);
                ctx.stroke();
                ctx.fillText(formatPrice(p), chartWidth + 6, y);
            }
            ctx.setLineDash([]);

            // Current price label
            if (currentPrice > minPrice && currentPrice < maxPrice) {
                const y = priceToY(currentPrice);

                // Background
                ctx.fillStyle = theme.primary;
                ctx.fillRect(chartWidth, y - 10, AXIS_WIDTH, 20);

                // Triangle pointer
                ctx.beginPath();
                ctx.moveTo(chartWidth - 5, y);
                ctx.lineTo(chartWidth, y - 5);
                ctx.lineTo(chartWidth, y + 5);
                ctx.closePath();
                ctx.fill();

                // Text
                ctx.fillStyle = theme.background;
                ctx.font = 'bold 11px "JetBrains Mono", monospace';
                ctx.fillText(formatPrice(currentPrice), chartWidth + 6, y);
            }

            animationId = requestAnimationFrame(render);
        };

        animationId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(animationId);
    }, [symbol, colorLookup, pricePerPixel, autoScaled, liquidityWalls, onWhaleAlert]);

    // Resize handler
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
        lastSnapshotTime.current = 0;
        lastWhaleCheckTime.current = 0;
        setAutoScaled(false);
        setLiquidityWalls([]);
    }, [symbol]);

    // Wheel zoom
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 1.08 : 0.92;
        setPricePerPixel(prev => Math.max(0.0001, Math.min(prev * delta, 500)));
    }, []);

    return (
        <div className="relative w-full h-full overflow-hidden" style={{ background: theme.background }}>
            <canvas
                ref={canvasRef}
                className="block cursor-crosshair"
                onWheel={handleWheel}
            />

            {/* Net Flow Indicator (Top Right) */}
            <div
                className="absolute top-3 right-24 flex items-center gap-2 px-3 py-1.5 rounded-lg border backdrop-blur-sm"
                style={{
                    background: `${theme.surface}E0`,
                    borderColor: theme.border
                }}
            >
                <div className="text-[10px] uppercase tracking-wider" style={{ color: theme.textMuted }}>
                    Net Flow
                </div>
                <div
                    className="font-mono text-sm font-bold"
                    style={{
                        color: netFlow.flowPercent > 0 ? theme.bullish :
                            netFlow.flowPercent < 0 ? theme.bearish : theme.textSecondary
                    }}
                >
                    {netFlow.flowPercent > 0 ? '+' : ''}{netFlow.flowPercent.toFixed(0)}%
                </div>
                {/* Mini bar */}
                <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: theme.surfaceElevated }}>
                    <div
                        className="h-full transition-all duration-300"
                        style={{
                            width: `${Math.abs(netFlow.flowPercent)}%`,
                            marginLeft: netFlow.flowPercent < 0 ? `${100 - Math.abs(netFlow.flowPercent)}%` : '0',
                            background: netFlow.flowPercent > 0 ? theme.bullish : theme.bearish
                        }}
                    />
                </div>
            </div>

            {/* Connection Status */}
            {status === 'connecting' && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: `${theme.background}CC` }}>
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: theme.primary }} />
                        <span className="text-xs font-mono" style={{ color: theme.textMuted }}>
                            Connecting to Binance L2...
                        </span>
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

function formatPrice(price: number): string {
    if (price >= 10000) return price.toFixed(0);
    if (price >= 100) return price.toFixed(1);
    if (price >= 1) return price.toFixed(2);
    return price.toFixed(4);
}
