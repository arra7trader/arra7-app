'use client';

import { useEffect, useRef, useState } from 'react';
import { BookmapState } from '@/hooks/useBookmap';

interface BookmapCanvasProps {
    symbol: string;
    dataRef: React.MutableRefObject<BookmapState>; // Received from parent
    status: 'connecting' | 'connected' | 'error';
}

export default function BookmapCanvas({ symbol, dataRef, status }: BookmapCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Viewport state
    const [scaleY, setScaleY] = useState(100); // Pixels per unit price (zoomed in)
    const [offsetY, setOffsetY] = useState(0); // Vertical scroll position

    // Heatmap buffer state
    // We use a history array: { time: number, levels: Map<price, qty> }[]
    // Ideally this should be an OffscreenCanvas or a specialized data structure
    const historyRef = useRef<{ time: number, bids: Map<number, number>, asks: Map<number, number> }[]>([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: false }); // Optimize for speed
        if (!ctx) return;

        let animationId: number;
        let lastTime = 0;
        const speed = 1; // Pixels per frame scroll speed

        const render = (timestamp: number) => {
            if (timestamp - lastTime < 16) { // Cap at ~60 FPS
                animationId = requestAnimationFrame(render);
                return;
            }
            lastTime = timestamp;

            const width = canvas.width;
            const height = canvas.height;

            // 1. Data Snapshot Logic
            // Every frame, we take a snapshot of the current book state and push it to history
            // In a real optimized system, we wouldn't clone Maps every frame/interval.
            // We would rely on the WebSocket hook to just update a shared buffer.
            // For this implementation, we'll simple rendering:
            // Shift entire canvas image to the left by 1 pixel

            // Draw existing content shifted left
            ctx.drawImage(canvas, -speed, 0);

            // Clear the new slice on the right
            const sliceWidth = speed;
            const sliceX = width - sliceWidth;
            ctx.fillStyle = '#111111'; // Background color
            ctx.fillRect(sliceX, 0, sliceWidth, height);

            if (!dataRef.current) return;

            // Determine Center Price (Mid Price)
            const currentPrice = dataRef.current.lastPrice || ((dataRef.current.bestBid + dataRef.current.bestAsk) / 2);
            if (!currentPrice || currentPrice === 0) {
                animationId = requestAnimationFrame(render);
                return;
            }

            // Auto-center logic (simple version)
            // Center of screen (height/2) should be currentPrice
            // Y = height/2 + (price - currentPrice) * scaleY
            // Note: Canvas Y coordinates are inverted (0 is top)
            // Normalized Y = height/2 - (price - currentPrice) * scaleY

            const getY = (price: number) => height / 2 - (price - currentPrice) * scaleY;

            // 2. Render Heatmap (Rightmost Slice)
            // Iterate Bids
            dataRef.current.bids.forEach((qty, price) => {
                const y = getY(price);
                // Simple intensity mapping: darker -> brighter color
                // Max visible liquidity handling needed for normalization
                const intensity = Math.min(qty / 10, 1); // Mock normalization
                const r = Math.floor(255 * intensity);
                const g = Math.floor(100 * intensity);
                ctx.fillStyle = `rgb(${r}, ${g}, 0)`; // Orange-ish
                ctx.fillRect(sliceX, y, sliceWidth, scaleY * 0.1 || 1); // Thickness
            });

            // Iterate Asks
            dataRef.current.asks.forEach((qty, price) => {
                const y = getY(price);
                const intensity = Math.min(qty / 10, 1);
                const r = Math.floor(255 * intensity);
                const g = Math.floor(50 * intensity);
                ctx.fillStyle = `rgb(${r}, ${g}, 0)`; // Red-ish
                ctx.fillRect(sliceX, y, sliceWidth, scaleY * 0.1 || 1);
            });

            // 3. Render Best Bid/Ask Lines (Overlay on top of heatmap)
            // We draw these into the new slice
            const bestBidY = getY(dataRef.current.bestBid);
            const bestAskY = getY(dataRef.current.bestAsk);

            ctx.fillStyle = '#00FF00';
            ctx.fillRect(sliceX, bestBidY, sliceWidth, 1);

            ctx.fillStyle = '#FF0000';
            ctx.fillRect(sliceX, bestAskY, sliceWidth, 1);

            // 4. Render Trades (Bubbles)
            // Trades happen at discrete points in time.
            // We need to render trades that happened since last frame.
            // Or better, just draw them on the current slice if their timestamp is recent.
            // Simplified: Draw last few trades if they are "new" (hacky without timestamp tracking per frame)

            // Actually, correct way: We have dataRef.current.trades array.
            // We can filter for trades that happened in the last 100ms and draw them at the current X.
            // Since we shift the canvas, this "bubble" will physically move left.
            const now = Date.now();
            dataRef.current.trades.forEach(trade => {
                // If trade is extremely recent (< 100ms), draw bubble
                if (now - trade.time < 100) {
                    const y = getY(trade.price);
                    const radius = Math.max(2, Math.min(trade.quantity * 2, 20)); // Size based on volume

                    ctx.beginPath();
                    ctx.arc(sliceX - 10, y, radius, 0, 2 * Math.PI); // Draw slightly offset to not be cut off
                    ctx.fillStyle = trade.isBuyerMaker ? 'rgba(255, 50, 50, 0.7)' : 'rgba(50, 255, 50, 0.7)'; // Red for Sell (buyer is maker), Green for Buy
                    ctx.fill();
                    ctx.strokeStyle = '#FFFFFF';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            });

            animationId = requestAnimationFrame(render);
        };

        animationId = requestAnimationFrame(render);

        return () => cancelAnimationFrame(animationId);
    }, [symbol, scaleY]); // Re-init if symbol or scale changes

    // Resize handler
    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current) {
                // Keep the buffer content on resize? Ideally yes, but tricky.
                // Simple resize clears canvas.
                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = window.innerHeight - 80; // Minus navbar height
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize(); // Init
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Scroll/Zoom Interactivity
    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey) {
            // Zoom (Scale Y)
            const delta = -e.deltaY * 0.01;
            setScaleY(s => Math.max(1, Math.min(s + delta * 10, 10000)));
        } else {
            // Pan (Offset Y - TODO: Implement manual offset instead of auto-center)
            // For now, let's keep it auto-centered on price
        }
    };

    return (
        <div className="relative w-full h-full bg-[#111] overflow-hidden">
            <canvas
                ref={canvasRef}
                className="block cursor-crosshair"
                onWheel={handleWheel}
            />
            {/* Overlay Info */}
            <div className="absolute top-4 left-4 pointer-events-none text-xs text-white/50">
                <p>Symbol: {symbol}</p>
                <p>Zoom: {scaleY.toFixed(1)}x</p>
                <p>Status: {status}</p>
                <p>Price: {dataRef.current.lastPrice?.toFixed(2)}</p>
            </div>

            {/* Loading Indicator */}
            {status === 'connecting' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-orange-400 font-mono text-sm">Connecting to Binance Feed...</span>
                    </div>
                </div>
            )}
        </div>
    );
}
