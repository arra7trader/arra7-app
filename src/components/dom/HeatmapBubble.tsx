'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { OrderBook, OrderBookLevel } from '@/types/dom';
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

// Helper to find min/max price in history for Y-axis scaling
function getPriceRange(history: HeatmapDataPoint[], currentBook: OrderBook | null) {
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    const allBooks = currentBook ? [...history.map(h => h.orderBook), currentBook] : history.map(h => h.orderBook);

    if (allBooks.length === 0) return { min: 0, max: 100 };

    allBooks.forEach(book => {
        // Look at bids and asks to find visible range
        if (book.bids.length > 0) minPrice = Math.min(minPrice, book.bids[book.bids.length - 1].price);
        if (book.asks.length > 0) maxPrice = Math.max(maxPrice, book.asks[book.asks.length - 1].price);
    });

    // Add some padding
    const padding = (maxPrice - minPrice) * 0.1;
    return { min: minPrice - padding, max: maxPrice + padding };
}

export default function BookmapChart({ currentOrderBook, history, height = 500 }: HeatmapBubbleProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

    // Handle Resize
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

    // Main Draw Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !currentOrderBook) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width, height } = dimensions;

        // Visual Settings
        const RIGHT_MARGIN_PRICE = 60; // Space for Price Axis
        const FUTURE_ZONE_WIDTH = 100; // Space for "Future" liquidity projection
        const CHART_WIDTH = width - RIGHT_MARGIN_PRICE;
        const TIME_WIDTH = CHART_WIDTH - FUTURE_ZONE_WIDTH;

        // 1. Calculate Scale
        // Y-Axis: Price
        const priceRange = getPriceRange(history, currentOrderBook);
        const priceSpan = priceRange.max - priceRange.min;

        // Helper to map price to Y pixel
        const getY = (price: number) => {
            return height - ((price - priceRange.min) / priceSpan) * height;
        };

        // Clear Canvas
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#ffffff'; // White background for "Apple" style
        ctx.fillRect(0, 0, width, height);

        // 2. Draw Historical Heatmap
        // Max Volume for color intensity normalization
        let maxVol = 0;
        history.forEach(h => {
            h.orderBook.bids.forEach(b => maxVol = Math.max(maxVol, b.volume));
            h.orderBook.asks.forEach(a => maxVol = Math.max(maxVol, a.volume));
        });
        currentOrderBook.bids.forEach(b => maxVol = Math.max(maxVol, b.volume));
        currentOrderBook.asks.forEach(a => maxVol = Math.max(maxVol, a.volume));

        // Avoid division by zero
        maxVol = Math.max(maxVol, 0.0001);

        const pointWidth = Math.max(1, TIME_WIDTH / Math.max(history.length, 50));

        history.forEach((point, i) => {
            const x = i * pointWidth;

            // Draw Asks (Red) - Liquidity ABOVE price
            point.orderBook.asks.forEach(ask => {
                const y = getY(ask.price);
                const intensity = Math.min(1, ask.volume / maxVol); // Normalize volume
                // Red gradient: more opaque = more volume
                ctx.fillStyle = `rgba(239, 68, 68, ${intensity * 0.8})`;
                // Draw a block. Height based on typical tick size or just 2px for smoothness
                const h = Math.max(2, height / 50); // Dynamic height
                ctx.fillRect(x, y - h / 2, pointWidth + 0.5, h);
            });

            // Draw Bids (Green) - Liquidity BELOW price
            point.orderBook.bids.forEach(bid => {
                const y = getY(bid.price);
                const intensity = Math.min(1, bid.volume / maxVol); // Normalize volume
                // Green gradient
                ctx.fillStyle = `rgba(34, 197, 94, ${intensity * 0.8})`;
                const h = Math.max(2, height / 50);
                ctx.fillRect(x, y - h / 2, pointWidth + 0.5, h);
            });
        });

        // 3. Draw Price Line (Mid Price)
        ctx.beginPath();
        ctx.strokeStyle = '#2563eb'; // Blue price line
        ctx.lineWidth = 2;

        history.forEach((point, i) => {
            const x = i * pointWidth;
            const y = getY(point.orderBook.midPrice);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        // Connect to current state
        const currentX = history.length * pointWidth;
        const currentY = getY(currentOrderBook.midPrice);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();


        // 4. FUTURE ZONE / PENDING LIQUIDITY (The "Future Order Buy/Sell" request)
        // We project the CURRENT order book into the right side
        const futureStartX = TIME_WIDTH;

        // Separator Line
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = '#94a3b8';
        ctx.moveTo(futureStartX, 0);
        ctx.lineTo(futureStartX, height);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw Current Asks (Future Resistance)
        currentOrderBook.asks.forEach(ask => {
            const y = getY(ask.price);
            const intensity = Math.min(1, ask.volume / maxVol);
            // Gradient bar extending to the right
            const gradient = ctx.createLinearGradient(futureStartX, 0, CHART_WIDTH, 0);
            gradient.addColorStop(0, `rgba(239, 68, 68, ${intensity})`);
            gradient.addColorStop(1, `rgba(239, 68, 68, 0)`); // Fade out

            ctx.fillStyle = gradient;
            const h = Math.max(3, height / 40);
            ctx.fillRect(futureStartX, y - h / 2, FUTURE_ZONE_WIDTH, h);
        });

        // Draw Current Bids (Future Support)
        currentOrderBook.bids.forEach(bid => {
            const y = getY(bid.price);
            const intensity = Math.min(1, bid.volume / maxVol);
            // Gradient bar
            const gradient = ctx.createLinearGradient(futureStartX, 0, CHART_WIDTH, 0);
            gradient.addColorStop(0, `rgba(34, 197, 94, ${intensity})`);
            gradient.addColorStop(1, `rgba(34, 197, 94, 0)`); // Fade out

            ctx.fillStyle = gradient;
            const h = Math.max(3, height / 40);
            ctx.fillRect(futureStartX, y - h / 2, FUTURE_ZONE_WIDTH, h);
        });

        // Current Price Line Indicator in Future Zone
        ctx.beginPath();
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 1;
        ctx.moveTo(futureStartX, currentY);
        ctx.lineTo(CHART_WIDTH, currentY);
        ctx.stroke();

        // Bubble Pulse on Current Price
        ctx.beginPath();
        ctx.arc(futureStartX, currentY, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#2563eb';
        ctx.fill();


        // 5. PRICE AXIS (Right Side)
        ctx.fillStyle = '#f1f5f9'; // Light gray bg for axis
        ctx.fillRect(CHART_WIDTH, 0, RIGHT_MARGIN_PRICE, height);

        ctx.fillStyle = '#64748b'; // Text color
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        // Draw ~10 ticks
        const numTicks = 10;
        for (let i = 0; i <= numTicks; i++) {
            const price = priceRange.min + (priceSpan * i) / numTicks;
            const y = getY(price);

            // Grid line
            ctx.beginPath();
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 0.5;
            ctx.moveTo(0, y);
            ctx.lineTo(CHART_WIDTH, y);
            ctx.stroke();

            // Label
            ctx.fillText(price.toFixed(price < 10 ? 4 : 2), CHART_WIDTH + 4, y);
        }

        // Highlight Current Price Label
        const labelY = Math.max(10, Math.min(height - 10, currentY));
        ctx.fillStyle = '#2563eb';
        ctx.fillRect(CHART_WIDTH, labelY - 10, RIGHT_MARGIN_PRICE, 20);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(currentOrderBook.midPrice.toFixed(2), CHART_WIDTH + 4, labelY);

    }, [dimensions, currentOrderBook, history]);

    if (!currentOrderBook) {
        return (
            <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
                Loading Heatmap Data...
            </div>
        );
    }

    return (
        <div ref={containerRef} className="rounded-xl border border-[var(--border-light)] bg-white overflow-hidden relative shadow-sm">
            <div className="absolute top-4 left-4 z-10 flex gap-4 pointer-events-none">
                <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm">
                    <div className="text-xs text-gray-500 font-medium">Bids (Buyers)</div>
                    <div className="h-2 w-full bg-gradient-to-r from-green-200 to-green-600 rounded-full mt-1"></div>
                </div>
                <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm">
                    <div className="text-xs text-gray-500 font-medium">Asks (Sellers)</div>
                    <div className="h-2 w-full bg-gradient-to-r from-red-200 to-red-600 rounded-full mt-1"></div>
                </div>
            </div>

            <canvas
                ref={canvasRef}
                width={dimensions.width}
                height={dimensions.height}
                className="w-full h-full"
            />

            {/* Future Label */}
            <div className="absolute top-2 right-[70px] text-[10px] text-gray-400 font-medium">
                FUTURE LIQUIDITY
            </div>
        </div>
    );
}
