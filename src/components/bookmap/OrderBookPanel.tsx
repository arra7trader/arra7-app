'use client';

import { BookmapState } from '@/hooks/useBookmap';
import { MutableRefObject } from 'react';

interface OrderBookPanelProps {
    dataRef: MutableRefObject<BookmapState>;
    // Tick is passed just to trigger re-renders
    tick: number;
}

export default function OrderBookPanel({ dataRef, tick }: OrderBookPanelProps) {
    const data = dataRef.current;

    // Sort and slice top 15 levels
    const bids = Array.from(data.bids.entries())
        .sort((a, b) => b[0] - a[0]) // Descending
        .slice(0, 15);

    const asks = Array.from(data.asks.entries())
        .sort((a, b) => a[0] - b[0]) // Ascending
        .slice(0, 15);

    // Calculate max volume for progress bars
    const maxVol = Math.max(
        ...bids.map(b => b[1]),
        ...asks.map(a => a[1]),
        1 // Avoid div / 0
    );

    return (
        <div className="h-full bg-[#0A0E14] border-l border-[#1F2937] flex flex-col font-mono text-xs">
            {/* Header */}
            <div className="p-2 border-b border-[#1F2937] text-[#94A3B8] font-bold text-center">
                Order Book
            </div>

            {/* Asks (Sell Orders) - Red */}
            <div className="flex-1 overflow-hidden flex flex-col justify-end pb-2">
                {asks.slice().reverse().map(([price, qty]) => (
                    <div key={price} className="relative flex justify-between items-center px-2 py-0.5 hover:bg-white/5">
                        {/* Background Bar */}
                        <div
                            className="absolute right-0 top-0 bottom-0 bg-red-500/10"
                            style={{ width: `${(qty / maxVol) * 100}%` }}
                        />
                        <span className="text-red-400 relative z-10">{price.toFixed(2)}</span>
                        <span className="text-[#64748B] relative z-10">{qty.toFixed(3)}</span>
                    </div>
                ))}
            </div>

            {/* Spread / Current Price */}
            <div className="py-2 border-y border-[#1F2937] bg-white/5 text-center">
                <div className="text-xl font-bold text-white">
                    {data.lastPrice?.toFixed(2) || '---'}
                </div>
                <div className="text-[10px] text-[#64748B] mt-0.5">
                    Spread: {((data.bestAsk - data.bestBid) || 0).toFixed(2)}
                </div>
            </div>

            {/* Bids (Buy Orders) - Green */}
            <div className="flex-1 overflow-hidden pt-2">
                {bids.map(([price, qty]) => (
                    <div key={price} className="relative flex justify-between items-center px-2 py-0.5 hover:bg-white/5">
                        {/* Background Bar */}
                        <div
                            className="absolute right-0 top-0 bottom-0 bg-green-500/10"
                            style={{ width: `${(qty / maxVol) * 100}%` }}
                        />
                        <span className="text-green-400 relative z-10">{price.toFixed(2)}</span>
                        <span className="text-[#64748B] relative z-10">{qty.toFixed(3)}</span>
                    </div>
                ))}
            </div>

            <div className="p-2 border-t border-[#1F2937] text-[10px] text-[#64748B] text-center">
                Real-time Data
            </div>
        </div>
    );
}
