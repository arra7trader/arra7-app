'use client';

import { useState } from 'react';
import { useBookmap } from '@/hooks/useBookmap';
import BookmapCanvas from '@/components/bookmap/BookmapCanvas';
import OrderBookPanel from '@/components/bookmap/OrderBookPanel';
import { BookmapTheme, THEMES } from '@/lib/bookmap/themes';

export default function BookmapPage() {
    const [symbol, setSymbol] = useState<'BTCUSDT' | 'PAXGUSDT'>('BTCUSDT');
    const [theme, setTheme] = useState<BookmapTheme>('classic');
    const { dataRef, status, tick } = useBookmap(symbol);

    return (
        <div className="fixed inset-0 bg-black text-white flex flex-col">
            {/* Header / Toolbar */}
            <div className="h-14 mt-16 md:mt-20 border-b border-gray-800 flex items-center px-4 justify-between bg-black/90 backdrop-blur-sm z-10">
                <div className="flex items-center gap-4">
                    {/* Logo */}
                    <div className="flex items-center gap-2">
                        <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                        </svg>
                        <h1 className="font-bold text-lg hidden md:block">Bookmap LP</h1>
                    </div>

                    {/* Symbol Selector */}
                    <div className="flex bg-gray-900 rounded-lg p-1">
                        <button
                            onClick={() => setSymbol('BTCUSDT')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${symbol === 'BTCUSDT'
                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                }`}
                        >
                            BTC/USDT
                        </button>
                        <button
                            onClick={() => setSymbol('PAXGUSDT')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${symbol === 'PAXGUSDT'
                                    ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                }`}
                        >
                            GOLD (PAXG)
                        </button>
                    </div>

                    {/* Theme Selector */}
                    <div className="hidden md:flex items-center gap-2">
                        <span className="text-xs text-gray-500">Theme:</span>
                        <select
                            value={theme}
                            onChange={(e) => setTheme(e.target.value as BookmapTheme)}
                            className="bg-gray-900 border border-gray-700 rounded-md px-2 py-1 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        >
                            {Object.entries(THEMES).map(([key, config]) => (
                                <option key={key} value={key}>
                                    {config.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                    {/* Mobile Theme Selector */}
                    <select
                        value={theme}
                        onChange={(e) => setTheme(e.target.value as BookmapTheme)}
                        className="md:hidden bg-gray-900 border border-gray-700 rounded-md px-2 py-1 text-xs text-gray-300"
                    >
                        {Object.entries(THEMES).map(([key, config]) => (
                            <option key={key} value={key}>
                                {config.name}
                            </option>
                        ))}
                    </select>

                    {/* Status */}
                    <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                        <span className="text-gray-400 hidden sm:inline">{status.toUpperCase()}</span>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Canvas (Heatmap) */}
                <div className="flex-1 relative">
                    <BookmapCanvas
                        symbol={symbol}
                        dataRef={dataRef}
                        status={status}
                        theme={theme}
                    />
                </div>

                {/* Order Book Panel */}
                <div className="w-[260px] hidden lg:block border-l border-gray-800">
                    <OrderBookPanel dataRef={dataRef} tick={tick} />
                </div>
            </div>

            {/* Mobile hint */}
            <div className="lg:hidden absolute bottom-0 left-0 right-0 bg-gray-900/90 backdrop-blur-sm p-2 text-center text-[10px] text-gray-500">
                Scroll to zoom • Best on Desktop
            </div>
        </div>
    );
}
