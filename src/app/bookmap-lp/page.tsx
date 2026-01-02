'use client';

import { useState } from 'react';
import { useBookmap } from '@/hooks/useBookmap';
import BookmapCanvas from '@/components/bookmap/BookmapCanvas';
import OrderBookPanel from '@/components/bookmap/OrderBookPanel';
import {
    BookmapTheme,
    VisualizationMode,
    BubbleStyle,
    THEMES,
    VISUALIZATION_MODES
} from '@/lib/bookmap/themes';

export default function BookmapPage() {
    const [symbol, setSymbol] = useState<'BTCUSDT' | 'PAXGUSDT'>('BTCUSDT');
    const [theme, setTheme] = useState<BookmapTheme>('bookmap');
    const [mode, setMode] = useState<VisualizationMode>('heatmap-bubbles');
    const [bubbleStyle, setBubbleStyle] = useState<BubbleStyle>('3d');
    const [showSettings, setShowSettings] = useState(false);

    const { dataRef, status, tick } = useBookmap(symbol);

    return (
        <div className="fixed inset-0 bg-black text-white flex flex-col">
            {/* Header */}
            <div className="h-14 mt-16 md:mt-20 border-b border-gray-800/50 flex items-center px-3 md:px-4 justify-between bg-black/95 backdrop-blur-sm z-10">
                {/* Left: Logo + Symbol */}
                <div className="flex items-center gap-2 md:gap-4">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 md:w-6 md:h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                        </svg>
                        <span className="font-bold text-sm md:text-lg hidden sm:block">Bookmap LP</span>
                    </div>

                    {/* Symbol Toggle */}
                    <div className="flex bg-gray-900 rounded-lg p-0.5">
                        <button
                            onClick={() => setSymbol('BTCUSDT')}
                            className={`px-2 md:px-3 py-1 text-xs md:text-sm font-medium rounded-md transition-all ${symbol === 'BTCUSDT'
                                    ? 'bg-orange-500 text-white'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            BTC
                        </button>
                        <button
                            onClick={() => setSymbol('PAXGUSDT')}
                            className={`px-2 md:px-3 py-1 text-xs md:text-sm font-medium rounded-md transition-all ${symbol === 'PAXGUSDT'
                                    ? 'bg-yellow-500 text-black'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            GOLD
                        </button>
                    </div>
                </div>

                {/* Center: Mode Selector (Desktop) */}
                <div className="hidden lg:flex items-center gap-1 bg-gray-900 rounded-lg p-0.5">
                    {Object.entries(VISUALIZATION_MODES).map(([key, config]) => (
                        <button
                            key={key}
                            onClick={() => setMode(key as VisualizationMode)}
                            title={config.description}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${mode === key
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                }`}
                        >
                            {config.name}
                        </button>
                    ))}
                </div>

                {/* Right: Settings + Status */}
                <div className="flex items-center gap-2 md:gap-3">
                    {/* Theme (Desktop) */}
                    <select
                        value={theme}
                        onChange={(e) => setTheme(e.target.value as BookmapTheme)}
                        className="hidden md:block bg-gray-900 border border-gray-700 rounded-md px-2 py-1 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        {Object.entries(THEMES).map(([key, config]) => (
                            <option key={key} value={key}>{config.name}</option>
                        ))}
                    </select>

                    {/* Bubble Style Toggle */}
                    <button
                        onClick={() => setBubbleStyle(s => s === '2d' ? '3d' : '2d')}
                        className="hidden md:block px-2 py-1 text-xs bg-gray-900 border border-gray-700 rounded-md text-gray-300 hover:bg-gray-800"
                        title="Toggle 2D/3D bubbles"
                    >
                        {bubbleStyle.toUpperCase()}
                    </button>

                    {/* Settings Button (Mobile) */}
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="md:hidden p-1.5 bg-gray-900 border border-gray-700 rounded-md text-gray-300"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>

                    {/* Status */}
                    <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`}></span>
                        <span className="text-[10px] md:text-xs text-gray-500 hidden sm:block">{status === 'connected' ? 'LIVE' : 'CONNECTING'}</span>
                    </div>
                </div>
            </div>

            {/* Mobile Settings Panel */}
            {showSettings && (
                <div className="md:hidden bg-gray-900 border-b border-gray-800 p-3 flex flex-wrap gap-2">
                    <select
                        value={mode}
                        onChange={(e) => setMode(e.target.value as VisualizationMode)}
                        className="bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-xs text-gray-300"
                    >
                        {Object.entries(VISUALIZATION_MODES).map(([key, config]) => (
                            <option key={key} value={key}>{config.name}</option>
                        ))}
                    </select>
                    <select
                        value={theme}
                        onChange={(e) => setTheme(e.target.value as BookmapTheme)}
                        className="bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-xs text-gray-300"
                    >
                        {Object.entries(THEMES).map(([key, config]) => (
                            <option key={key} value={key}>{config.name}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => setBubbleStyle(s => s === '2d' ? '3d' : '2d')}
                        className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded-md text-gray-300"
                    >
                        Bubbles: {bubbleStyle.toUpperCase()}
                    </button>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Canvas */}
                <div className="flex-1 relative">
                    <BookmapCanvas
                        symbol={symbol}
                        dataRef={dataRef}
                        status={status}
                        theme={theme}
                        mode={mode}
                        bubbleStyle={bubbleStyle}
                    />
                </div>

                {/* Order Book Panel (Desktop) */}
                <div className="w-[240px] hidden xl:block border-l border-gray-800">
                    <OrderBookPanel dataRef={dataRef} tick={tick} />
                </div>
            </div>

            {/* Mobile Footer */}
            <div className="lg:hidden bg-gray-900/90 backdrop-blur-sm p-1.5 text-center text-[9px] text-gray-500 border-t border-gray-800">
                Scroll to zoom • Tap ⚙️ for settings
            </div>
        </div>
    );
}
