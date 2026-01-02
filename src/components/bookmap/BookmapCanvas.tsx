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
    const [offsetY, setOffsetY] = useState(0); // Vertical scroll position (manual logic to be added later)

    // Manual Price Center - if null, auto-center
    const [centerPrice, setCenterPrice] = useState<number | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: false }); // Optimize for speed
        if (!ctx) return;

        let animationId: number;
        let lastTime = 0;
        const speed = 1.5; // Slightly faster scroll

        // Thermal Color Map (Blue -> Green -> Yellow -> Red -> White)
        // Pre-calculate 256 colors for fast lookup
        const colorMap: string[] = [];
        for (let i = 0; i < 256; i++) {
            // Normalized 0-1
            const t = i / 255;
            let r = 0, g = 0, b = 0;

            // Simple thermal gradient logic
            if (t < 0.25) { // Black to Blue
                b = Math.floor(255 * (t / 0.25));
            } else if (t < 0.5) { // Blue to Green
                b = Math.floor(255 * (1 - (t - 0.25) / 0.25));
                g = Math.floor(255 * ((t - 0.25) / 0.25));
            } else if (t < 0.75) { // Green to Red (via Yellowish)
                g = Math.floor(255 * (1 - (t - 0.5) / 0.25 * 0.5)); // Keep some green
                r = Math.floor(255 * ((t - 0.5) / 0.25));
            } else { // Red to White
                r = 255;
                g = Math.floor(255 * ((t - 0.75) / 0.25));
                b = Math.floor(255 * ((t - 0.75) / 0.25));
            }
            colorMap[i] = `rgb(${r},${g},${b})`;
        }

        // Custom simple heat function for better contrast
        const getHeatColor = (qty: number) => {
            // Logarithmic scale for volume to generic intensity
            // Adjust divisor based on symbol later
            const intensity = Math.min(Math.log10(qty + 1) / 3, 1);
            const index = Math.floor(intensity * 255);
            return colorMap[index];
        };

        const render = (timestamp: number) => {
            if (timestamp - lastTime < 16) {
                animationId = requestAnimationFrame(render);
                return;
            }
            lastTime = timestamp;

            const width = canvas.width;
            const height = canvas.height;
            const CHART_RIGHT_MARGIN = 60; // Space for price labels

            // 1. Shift Canvas
            ctx.drawImage(canvas, -speed, 0);

            // 2. Clear New Slice
            const sliceWidth = speed + 2; // +2 to cover anti-aliasing artifacts
            const sliceX = width - CHART_RIGHT_MARGIN - speed;

            // Clear chart area only
            ctx.fillStyle = '#111111'; // Dark background
            ctx.fillRect(sliceX, 0, sliceWidth + CHART_RIGHT_MARGIN, height); // Clear all the way to right

            if (!dataRef.current) return;

            // Determine Center Price
            const midPrice = dataRef.current.lastPrice || ((dataRef.current.bestBid + dataRef.current.bestAsk) / 2);
            if (!midPrice || midPrice === 0) {
                animationId = requestAnimationFrame(render);
                return;
            }

            // Use locked center price if user dragged (future feature), else auto-follow
            const effectiveCenter = centerPrice || midPrice;

            // Y Coordinate mapper
            const getY = (price: number) => Math.floor(height / 2 - (price - effectiveCenter) * scaleY);

            // 3. Render Heatmap (Liquidity)
            // Optimization: Only render visible range
            const priceRangeVisible = (height / 2) / scaleY;
            const maxVisiblePrice = effectiveCenter + priceRangeVisible;
            const minVisiblePrice = effectiveCenter - priceRangeVisible;

            // Bids
            dataRef.current.bids.forEach((qty, price) => {
                if (price > maxVisiblePrice || price < minVisiblePrice) return;
                const y = getY(price);
                const barHeight = Math.max(scaleY * 0.1, 2); // Minimum 2px visibility

                ctx.fillStyle = getHeatColor(qty);
                ctx.fillRect(sliceX, y, sliceWidth, barHeight);
            });

            // Asks
            dataRef.current.asks.forEach((qty, price) => {
                if (price > maxVisiblePrice || price < minVisiblePrice) return;
                const y = getY(price);
                const barHeight = Math.max(scaleY * 0.1, 2); // Minimum 2px visibility

                ctx.fillStyle = getHeatColor(qty);
                ctx.fillRect(sliceX, y, sliceWidth, barHeight);
            });

            // 4. Render Best Bid/Ask Lines
            const bestBidY = getY(dataRef.current.bestBid);
            const bestAskY = getY(dataRef.current.bestAsk);

            // Draw slightly thicker lines
            ctx.fillStyle = '#00FF00'; // Bid Green
            ctx.fillRect(sliceX, bestBidY, sliceWidth, 1.5);

            ctx.fillStyle = '#FF0000'; // Ask Red
            ctx.fillRect(sliceX, bestAskY, sliceWidth, 1.5);

            // 5. Render Price Axis (Static, Right Side)
            // Clear right margin first (already done above but ensuring specific area)
            ctx.fillStyle = '#0A0E14'; // Darker for axis
            ctx.fillRect(width - CHART_RIGHT_MARGIN, 0, CHART_RIGHT_MARGIN, height);

            ctx.fillStyle = '#64748B'; // Text color
            ctx.font = '10px monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';

            // Draw ticks
            // Dynamic step based on scaleY
            const priceStep = 100 / scaleY; // Rough heuristic
            // Round step to nice number (0.01, 0.1, 1, 10, 50, 100)
            // Simplified:
            const step = Math.pow(10, Math.floor(Math.log10(priceRangeVisible))) / 2;

            const startTick = Math.floor(minVisiblePrice / step) * step;
            for (let p = startTick; p <= maxVisiblePrice; p += step) {
                const y = getY(p);
                // Grid line (optional, draw across chart)
                ctx.fillStyle = 'rgba(255,255,255,0.05)';
                ctx.fillRect(0, y, width - CHART_RIGHT_MARGIN, 1);

                // Label
                ctx.fillStyle = '#64748B';
                // Adjust precision based on price
                const label = p.toFixed(p < 10 ? 4 : 2);
                ctx.fillText(label, width - CHART_RIGHT_MARGIN + 5, y);
            }

            // Highlight Current Price on Axis
            const currentY = getY(dataRef.current.lastPrice);
            if (currentY > 0 && currentY < height) {
                ctx.fillStyle = '#EAB308'; // Yellow background
                ctx.fillRect(width - CHART_RIGHT_MARGIN, currentY - 8, CHART_RIGHT_MARGIN, 16);
                ctx.fillStyle = '#000000';
                ctx.font = 'bold 10px monospace';
                ctx.fillText(dataRef.current.lastPrice.toFixed(2), width - CHART_RIGHT_MARGIN + 5, currentY);
            }


            // 6. Render Trades (Bubbles)
            const now = Date.now();
            dataRef.current.trades.forEach(trade => {
                // If trade is extremely recent (< 100ms), draw bubble
                if (now - trade.time < 150) { // Slight buffer
                    const y = getY(trade.price);

                    // Logarithmic radius: Volume 0.001 -> 2px, 1 -> 8px, 10 -> 15px
                    const radius = Math.max(3, Math.min(Math.log10(trade.quantity * 100) * 3, 25));

                    ctx.beginPath();
                    ctx.arc(sliceX - radius / 2, y, radius, 0, 2 * Math.PI);

                    // Fill with gradient for 3D effect
                    const grad = ctx.createRadialGradient(sliceX - radius / 2, y, 0, sliceX - radius / 2, y, radius);
                    if (trade.isBuyerMaker) { // Sell (Red)
                        grad.addColorStop(0, 'rgba(255, 100, 100, 0.9)');
                        grad.addColorStop(1, 'rgba(150, 0, 0, 0.8)');
                    } else { // Buy (Green)
                        grad.addColorStop(0, 'rgba(100, 255, 100, 0.9)');
                        grad.addColorStop(1, 'rgba(0, 150, 0, 0.8)');
                    }

                    ctx.fillStyle = grad;
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
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
            e.preventDefault();
            const delta = -e.deltaY * 0.001;
            setScaleY(s => Math.max(1, Math.min(s * (1 + delta), 100000))); // Multiplicative zoom
        } else {
            // Pan (Future implementation: adjust setCenterPrice)
        }
    };

    return (
        <div className="relative w-full h-full bg-[#111] overflow-hidden">
            <canvas
                ref={canvasRef}
                className="block cursor-crosshair"
                onWheel={handleWheel}
            />
            {/* Overlay Info (Minimal) */}
            <div className="absolute top-4 left-4 pointer-events-none text-xs text-white/50 bg-black/40 p-2 rounded backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: status === 'connected' ? '#22c55e' : '#eab308' }}></span>
                    <span>{symbol}</span>
                </div>
                <div>Price: <span className="text-white">{dataRef.current.lastPrice?.toFixed(2)}</span></div>
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
