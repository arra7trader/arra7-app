'use client';

import { useState, useEffect } from 'react';
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
    const [symbol, setSymbol] = useState<'BTCUSDT' | 'ETHUSDT' | 'PAXGUSDT'>('BTCUSDT');
    const [theme, setTheme] = useState<BookmapTheme>('professional');
    const [mode, setMode] = useState<VisualizationMode>('heatmap-bubbles');
    const [bubbleStyle, setBubbleStyle] = useState<BubbleStyle>('3d');
    const [showSettings, setShowSettings] = useState(false);

    // Access Control
    const [isVVIP, setIsVVIP] = useState<boolean | null>(null); // null = loading
    const [checkingAccess, setCheckingAccess] = useState(true);

    const { dataRef, status, tick } = useBookmap(symbol);
    const themeConfig = THEMES[theme];

    // Check Membership
    useEffect(() => {
        const checkAccess = async () => {
            try {
                const res = await fetch('/api/user/me');
                if (res.ok) {
                    const data = await res.json();
                    // Check if membership is VVIP (case insensitive just in case)
                    const membership = (data.membership || '').toUpperCase();
                    setIsVVIP(membership === 'VVIP' || membership === 'ADMIN');
                } else {
                    setIsVVIP(false);
                }
            } catch (err) {
                console.error('Access check failed', err);
                setIsVVIP(false);
            } finally {
                setCheckingAccess(false);
            }
        };
        checkAccess();
    }, []);

    return (
        <div className="fixed inset-0 text-white flex flex-col" style={{ background: themeConfig.background }}>

            {/* VVIP Restriction Overlay */}
            {!checkingAccess && !isVVIP && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
                    <div className="bg-[#0D1117] border border-gray-800 p-8 rounded-2xl max-w-md text-center shadow-2xl relative overflow-hidden">
                        {/* Glow effect */}
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-50"></div>

                        <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-2">VVIP Access Only</h2>
                        <p className="text-gray-400 mb-6 text-sm leading-relaxed">
                            This institutional-grade market depth tool is exclusively available for <strong>VVIP Members</strong>.
                            See hidden liquidity walls and whale activity in real-time.
                        </p>

                        <div className="space-y-3">
                            <a
                                href="/pricing"
                                className="block w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold rounded-lg transition-all transform hover:scale-[1.02] shadow-lg shadow-orange-900/20"
                            >
                                Upgrade to VVIP
                            </a>
                            <a
                                href="/"
                                className="block w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg transition-all"
                            >
                                Return Home
                            </a>
                        </div>

                        <div className="mt-6 pt-6 border-t border-gray-800/50 flex justify-center gap-6">
                            <div className="text-center">
                                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Data Feed</div>
                                <div className="text-sm font-mono text-green-400 font-bold">BINANCE L2</div>
                            </div>
                            <div className="text-center">
                                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Latency</div>
                                <div className="text-sm font-mono text-blue-400 font-bold">{"<"}50ms</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div
                className="h-14 mt-16 md:mt-20 border-b flex items-center px-3 md:px-4 justify-between backdrop-blur-sm z-10"
                style={{
                    background: `${themeConfig.axisBackground}F0`,
                    borderColor: themeConfig.gridColor
                }}
            >
                {/* Left: Logo + Symbol */}
                <div className="flex items-center gap-2 md:gap-4">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 md:w-6 md:h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                        </svg>
                        <span className="font-bold text-sm md:text-lg hidden sm:block">Bookmap LP</span>
                    </div>

                    {/* Symbol Selector */}
                    <div className="flex rounded-lg p-0.5" style={{ background: themeConfig.axisBackground }}>
                        <button
                            onClick={() => setSymbol('BTCUSDT')}
                            className={`px-2 md:px-3 py-1 text-xs md:text-sm font-medium rounded-md transition-all ${symbol === 'BTCUSDT'
                                ? 'bg-orange-500 text-white'
                                : 'hover:bg-white/10'
                                }`}
                            style={{ color: symbol === 'BTCUSDT' ? undefined : themeConfig.textMuted }}
                        >
                            BTC
                        </button>
                        <button
                            onClick={() => setSymbol('ETHUSDT')}
                            className={`px-2 md:px-3 py-1 text-xs md:text-sm font-medium rounded-md transition-all ${symbol === 'ETHUSDT'
                                ? 'bg-indigo-500 text-white'
                                : 'hover:bg-white/10'
                                }`}
                            style={{ color: symbol === 'ETHUSDT' ? undefined : themeConfig.textMuted }}
                        >
                            ETH
                        </button>
                        <button
                            onClick={() => setSymbol('PAXGUSDT')}
                            className={`px-2 md:px-3 py-1 text-xs md:text-sm font-medium rounded-md transition-all ${symbol === 'PAXGUSDT'
                                ? 'bg-yellow-500 text-black'
                                : 'hover:bg-white/10'
                                }`}
                            style={{ color: symbol === 'PAXGUSDT' ? undefined : themeConfig.textMuted }}
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
