'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDepthMatrix } from '@/hooks/useDepthMatrix';
import DepthMatrixCanvas from '@/components/depth-matrix/DepthMatrixCanvas';
import OrderBookHistogram from '@/components/depth-matrix/OrderBookHistogram';
import WhaleAlertPopup from '@/components/depth-matrix/WhaleAlertPopup';
import { DEPTH_MATRIX_THEME, WHALE_THRESHOLDS } from '@/lib/depth-matrix/theme';
import { WhaleAlert } from '@/lib/depth-matrix/analytics';

type Symbol = 'BTCUSDT' | 'ETHUSDT' | 'PAXGUSDT';

const theme = DEPTH_MATRIX_THEME;

const SYMBOLS: { id: Symbol; name: string; icon: string; color: string }[] = [
    { id: 'BTCUSDT', name: 'BTC/USDT', icon: '₿', color: '#f7931a' },
    { id: 'ETHUSDT', name: 'ETH/USDT', icon: 'Ξ', color: '#627eea' },
    { id: 'PAXGUSDT', name: 'GOLD/USDT', icon: '🪙', color: '#ffd700' },
];

export default function DepthMatrixPage() {
    const [symbol, setSymbol] = useState<Symbol>('BTCUSDT');
    const [showOrderBook, setShowOrderBook] = useState(true);
    const [whaleAlerts, setWhaleAlerts] = useState<WhaleAlert[]>([]);
    const [isVVIP, setIsVVIP] = useState<boolean | null>(null);
    const [checkingAccess, setCheckingAccess] = useState(true);

    const { dataRef, status, tick } = useDepthMatrix(symbol);
    const currentSymbolConfig = SYMBOLS.find(s => s.id === symbol)!;

    // Check VVIP access
    useEffect(() => {
        const checkAccess = async () => {
            try {
                const res = await fetch('/api/user/me');
                if (res.ok) {
                    const data = await res.json();
                    const membership = (data.membership || '').toUpperCase();
                    setIsVVIP(membership === 'VVIP' || membership === 'ADMIN');
                } else {
                    setIsVVIP(false);
                }
            } catch {
                setIsVVIP(false);
            } finally {
                setCheckingAccess(false);
            }
        };
        checkAccess();
    }, []);

    // Handle whale alerts
    const handleWhaleAlert = useCallback((alert: WhaleAlert) => {
        setWhaleAlerts(prev => [alert, ...prev].slice(0, 10));
    }, []);

    const dismissWhaleAlert = useCallback((id: string) => {
        setWhaleAlerts(prev => prev.filter(a => a.id !== id));
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'f' || e.key === 'F') {
                document.documentElement.requestFullscreen?.();
            }
            if (e.key === 'b' || e.key === 'B') {
                setShowOrderBook(prev => !prev);
            }
            // Switch symbols with 1, 2, 3
            if (e.key === '1') setSymbol('BTCUSDT');
            if (e.key === '2') setSymbol('ETHUSDT');
            if (e.key === '3') setSymbol('PAXGUSDT');
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div
            className="fixed inset-0 flex flex-col overflow-hidden"
            style={{ background: theme.background, color: theme.textPrimary }}
        >
            {/* VVIP Gate */}
            {!checkingAccess && !isVVIP && (
                <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: `${theme.background}F0` }}>
                    <div
                        className="p-8 rounded-2xl max-w-md text-center border relative overflow-hidden"
                        style={{ background: theme.surface, borderColor: theme.border }}
                    >
                        {/* Top glow */}
                        <div
                            className="absolute top-0 inset-x-0 h-1"
                            style={{ background: `linear-gradient(to right, transparent, ${theme.primary}, transparent)` }}
                        />

                        <div
                            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                            style={{ background: `${theme.primary}15` }}
                        >
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke={theme.primary}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>

                        <h2 className="text-2xl font-bold mb-2">VVIP Access Only</h2>
                        <p className="text-sm mb-6 leading-relaxed" style={{ color: theme.textSecondary }}>
                            <strong>Depth Matrix</strong> is an institutional-grade order flow intelligence tool
                            exclusively for <span style={{ color: theme.primary }}>VVIP Members</span>.
                        </p>

                        <div className="space-y-3">
                            <a
                                href="/pricing"
                                className="block w-full py-3 px-4 font-bold rounded-lg transition-all transform hover:scale-[1.02]"
                                style={{
                                    background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`,
                                    color: theme.background
                                }}
                            >
                                Upgrade to VVIP
                            </a>
                            <a
                                href="/"
                                className="block w-full py-3 px-4 font-medium rounded-lg transition-colors"
                                style={{ background: theme.surfaceElevated, color: theme.textSecondary }}
                            >
                                Return Home
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header
                className="h-14 mt-16 md:mt-20 border-b flex items-center px-4 justify-between z-10"
                style={{ background: `${theme.surface}F0`, borderColor: theme.border }}
            >
                {/* Left: Logo + Symbol */}
                <div className="flex items-center gap-4">
                    {/* Logo */}
                    <div className="flex items-center gap-2">
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm"
                            style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`, color: theme.background }}
                        >
                            DM
                        </div>
                        <div className="hidden sm:block">
                            <div className="text-sm font-bold">Depth Matrix</div>
                            <div className="text-[10px] -mt-0.5" style={{ color: theme.textMuted }}>by ARRA7</div>
                        </div>
                    </div>

                    {/* Symbol Selector */}
                    <div
                        className="flex rounded-lg p-0.5"
                        style={{ background: theme.surfaceElevated }}
                    >
                        {SYMBOLS.map(s => (
                            <button
                                key={s.id}
                                onClick={() => setSymbol(s.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all`}
                                style={{
                                    background: symbol === s.id ? s.color : 'transparent',
                                    color: symbol === s.id ? (s.id === 'PAXGUSDT' ? '#000' : '#fff') : theme.textMuted
                                }}
                            >
                                <span>{s.icon}</span>
                                <span className="hidden md:inline">{s.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Center: Stats */}
                <div className="hidden lg:flex items-center gap-6">
                    <div className="text-center">
                        <div className="text-[10px] uppercase tracking-wider" style={{ color: theme.textMuted }}>Last Price</div>
                        <div className="text-lg font-mono font-bold" style={{ color: theme.primary }}>
                            {dataRef.current.lastPrice > 0 ? formatPrice(dataRef.current.lastPrice) : '---'}
                        </div>
                    </div>
                    <div className="w-px h-8" style={{ background: theme.border }} />
                    <div className="text-center">
                        <div className="text-[10px] uppercase tracking-wider" style={{ color: theme.textMuted }}>Spread</div>
                        <div className="text-sm font-mono" style={{ color: theme.textSecondary }}>
                            {dataRef.current.bestAsk > 0 && dataRef.current.bestBid > 0
                                ? (dataRef.current.bestAsk - dataRef.current.bestBid).toFixed(2)
                                : '--'
                            }
                        </div>
                    </div>
                    <div className="w-px h-8" style={{ background: theme.border }} />
                    <div className="text-center">
                        <div className="text-[10px] uppercase tracking-wider" style={{ color: theme.textMuted }}>Whale Threshold</div>
                        <div className="text-sm font-mono" style={{ color: theme.accent }}>
                            {WHALE_THRESHOLDS[symbol]} {symbol.replace('USDT', '')}
                        </div>
                    </div>
                </div>

                {/* Right: Controls */}
                <div className="flex items-center gap-3">
                    {/* Toggle Order Book */}
                    <button
                        onClick={() => setShowOrderBook(!showOrderBook)}
                        className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all"
                        style={{
                            background: showOrderBook ? theme.primary : theme.surfaceElevated,
                            color: showOrderBook ? theme.background : theme.textMuted
                        }}
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        <span>Book</span>
                    </button>

                    {/* Status */}
                    <div className="flex items-center gap-1.5">
                        <span
                            className="w-2 h-2 rounded-full animate-pulse"
                            style={{ background: status === 'connected' ? theme.connected : theme.connecting }}
                        />
                        <span className="text-[10px] uppercase tracking-wider" style={{ color: theme.textMuted }}>
                            {status === 'connected' ? 'LIVE' : 'CONNECTING'}
                        </span>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex overflow-hidden">
                {/* Canvas */}
                <div className="flex-1 relative">
                    <DepthMatrixCanvas
                        symbol={symbol}
                        dataRef={dataRef}
                        status={status}
                        onWhaleAlert={handleWhaleAlert}
                    />
                </div>

                {/* Order Book Panel */}
                {showOrderBook && (
                    <div
                        className="w-[200px] hidden lg:block border-l"
                        style={{ borderColor: theme.border }}
                    >
                        <OrderBookHistogram dataRef={dataRef} tick={tick} />
                    </div>
                )}
            </main>

            {/* Whale Alerts */}
            <WhaleAlertPopup alerts={whaleAlerts} onDismiss={dismissWhaleAlert} />

            {/* Footer Hint */}
            <footer
                className="h-6 flex items-center justify-center text-[10px] border-t"
                style={{ background: theme.surface, borderColor: theme.border, color: theme.textMuted }}
            >
                <span className="hidden sm:inline">
                    Shortcuts: <kbd className="px-1 py-0.5 rounded bg-white/5">Scroll</kbd> Zoom •
                    <kbd className="px-1 py-0.5 rounded bg-white/5 ml-1">B</kbd> Toggle Book •
                    <kbd className="px-1 py-0.5 rounded bg-white/5 ml-1">F</kbd> Fullscreen •
                    <kbd className="px-1 py-0.5 rounded bg-white/5 ml-1">1-3</kbd> Switch Symbol
                </span>
                <span className="sm:hidden">Pinch to zoom • Tap for settings</span>
            </footer>
        </div>
    );
}

function formatPrice(price: number): string {
    if (price >= 10000) return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (price >= 100) return price.toFixed(1);
    return price.toFixed(2);
}
