'use client';

import { useState } from 'react';
import { useBookmap } from '@/hooks/useBookmap';
import BookmapCanvas from '@/components/bookmap/BookmapCanvas';
import OrderBookPanel from '@/components/bookmap/OrderBookPanel';
import Navbar from '@/components/Navbar'; // Assuming Navbar component exists
// We need to import the Navbar to maintain consistency
// Wait, Navbar is likely in layout, but let's check standard page structure.
// Most pages in this app seem to include Navbar or it's in layout.tsx.
// Based on previous file views, Navbar is used in layout usually. 
// I will check layout.tsx later but for now I assume standard Next.js Layout.
// Actually, looking at other pages, they don't import Navbar usually if it's in layout.
// I'll stick to just the page content.

export default function BookmapPage() {
    const [symbol, setSymbol] = useState<'BTCUSDT' | 'PAXGUSDT'>('BTCUSDT');
    const { dataRef, status, tick } = useBookmap(symbol);

    return (
        <div className="fixed inset-0 bg-[#0A0E14] text-white flex flex-col">
            {/* Header / Toolbar directly above canvas (below main Navbar) */}
            <div className="h-16 mt-16 md:mt-20 border-b border-[#1F2937] flex items-center px-4 justify-between bg-[#111]">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🔥</span>
                        <h1 className="font-bold text-lg hidden md:block">Bookmap LP</h1>
                    </div>

                    <div className="flex bg-[#1F2937] rounded-lg p-1">
                        <button
                            onClick={() => setSymbol('BTCUSDT')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${symbol === 'BTCUSDT'
                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                    : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
                                }`}
                        >
                            BTC/USDT
                        </button>
                        <button
                            onClick={() => setSymbol('PAXGUSDT')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${symbol === 'PAXGUSDT'
                                    ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20'
                                    : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
                                }`}
                        >
                            GOLD (PAXG)
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-[#64748B]">
                    <div className="hidden md:flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        Status: <span className={status === 'connected' ? 'text-green-400' : 'text-yellow-400'}>{status.toUpperCase()}</span>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Canvas (Heatmap) - Takes 80-85% width */}
                <div className="flex-1 relative border-r border-[#1F2937]">
                    <BookmapCanvas symbol={symbol} dataRef={dataRef} status={status} />
                </div>

                {/* Right: Order Book Panel - Takes remaining width */}
                <div className="w-[280px] hidden md:block">
                    <OrderBookPanel dataRef={dataRef} tick={tick} />
                </div>
            </div>

            {/* Mobile warning overlay (optional, since this is heavy data app) */}
            <div className="md:hidden absolute bottom-0 left-0 right-0 bg-[#1F2937]/90 p-2 text-center text-[10px] text-gray-400 backdrop-blur-sm">
                Best viewed on Desktop
            </div>
        </div>
    );
}
