'use client';

import { BookmapState } from '@/hooks/useBookmap';
import { MutableRefObject } from 'react';

interface OrderBookPanelProps {
    dataRef: MutableRefObject<BookmapState>;
    tick: number;
}

export default function OrderBookPanel({ dataRef, tick }: OrderBookPanelProps) {
    const data = dataRef.current;

    // Sort and get top 25 levels for display (we have up to 1000 available)
    const bids = Array.from(data.bids.entries())
        .sort((a, b) => b[0] - a[0])
        .slice(0, 25);

    const asks = Array.from(data.asks.entries())
        .sort((a, b) => a[0] - b[0])
        .slice(0, 25);

    // Calculate max volume for progress bars
    const allVolumes = [...bids.map(b => b[1]), ...asks.map(a => a[1])];
    const maxVol = Math.max(...allVolumes, 0.001);

    // Calculate total depth
    const totalBidVol = bids.reduce((sum, [_, qty]) => sum + qty, 0);
    const totalAskVol = asks.reduce((sum, [_, qty]) => sum + qty, 0);

    // Price range info from full order book
    const allBidPrices = Array.from(data.bids.keys()).sort((a, b) => b - a);
    const allAskPrices = Array.from(data.asks.keys()).sort((a, b) => a - b);

    const totalLevels = data.levelCount || (data.bids.size + data.asks.size);
    const priceRangeMin = allBidPrices[allBidPrices.length - 1] || 0;
    const priceRangeMax = allAskPrices[allAskPrices.length - 1] || 0;

    // Format price based on value
    const formatPrice = (price: number) => {
        if (price < 1) return price.toFixed(6);
        if (price < 10) return price.toFixed(4);
        if (price < 1000) return price.toFixed(2);
        return price.toFixed(2);
    };

    // Format quantity
    const formatQty = (qty: number) => {
        if (qty >= 1000) return qty.toFixed(0);
        if (qty >= 1) return qty.toFixed(2);
        if (qty >= 0.01) return qty.toFixed(4);
        return qty.toFixed(6);
    };

    return (
        <div className="h-full bg-[#0D1117] flex flex-col font-mono text-[10px]">
            {/* Header */}
            <div className="p-2 border-b border-[#21262D] flex justify-between items-center">
                <span className="text-[#8B949E] font-semibold">Order Book</span>
                <span className="text-green-500 text-[9px]">
                    {totalLevels} levels
                </span>
            </div>

            {/* Price Range Info */}
            <div className="px-2 py-1 border-b border-[#21262D] text-[9px] text-[#484F58]">
                <div className="flex justify-between">
                    <span>Full Range:</span>
                    <span>${formatPrice(priceRangeMin)} - ${formatPrice(priceRangeMax)}</span>
                </div>
            </div>

            {/* Asks (Sell Orders) - Reversed to show highest at top */}
            <div className="flex-1 overflow-auto flex flex-col justify-end">
                {asks.slice().reverse().map(([price, qty]) => {
                    const barWidth = Math.min((qty / maxVol) * 100, 100);
                    return (
                        <div key={price} className="relative flex justify-between items-center px-2 py-[2px] hover:bg-white/5">
                            <div
                                className="absolute right-0 top-0 bottom-0 bg-red-500/15"
                                style={{ width: `${barWidth}%` }}
                            />
                            <span className="text-red-400 relative z-10">{formatPrice(price)}</span>
                            <span className="text-[#6E7681] relative z-10">{formatQty(qty)}</span>
                        </div>
                    );
                })}
            </div>

            {/* Spread / Current Price */}
            <div className="py-2 px-2 border-y border-[#21262D] bg-[#161B22]">
                <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-white">
                        {formatPrice(data.lastPrice || 0)}
                    </span>
                    <span className="text-[9px] text-[#8B949E]">
                        Spread: {((data.bestAsk - data.bestBid) || 0).toFixed(2)}
                    </span>
                </div>
                <div className="flex justify-between mt-1 text-[9px] text-[#484F58]">
                    <span>Bid: {totalBidVol.toFixed(2)}</span>
                    <span>Ask: {totalAskVol.toFixed(2)}</span>
                </div>
            </div>

            {/* Bids (Buy Orders) */}
            <div className="flex-1 overflow-auto">
                {bids.map(([price, qty]) => {
                    const barWidth = Math.min((qty / maxVol) * 100, 100);
                    return (
                        <div key={price} className="relative flex justify-between items-center px-2 py-[2px] hover:bg-white/5">
                            <div
                                className="absolute right-0 top-0 bottom-0 bg-green-500/15"
                                style={{ width: `${barWidth}%` }}
                            />
                            <span className="text-green-400 relative z-10">{formatPrice(price)}</span>
                            <span className="text-[#6E7681] relative z-10">{formatQty(qty)}</span>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-[#21262D] text-[9px] text-[#484F58] flex justify-between">
                <span>Binance Full Depth</span>
                <span className="text-green-500">●</span>
            </div>
        </div>
    );
}
