'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { LockIcon, ChartIcon, SparklesIcon, ScaleIcon, SignalIcon, CircleStackIcon } from '@/components/PremiumIcons';
import { OrderBook, DOMPrediction, DOM_SYMBOLS, DOMSymbolId } from '@/types/dom';
import { analyzeOrderFlow, calculateOrderBookMetrics } from '@/lib/dom-analysis';
import BookmapChart, { HeatmapDataPoint } from '@/components/dom/HeatmapBubble';
import MLPredictionPanel from '@/components/dom/MLPredictionPanel';
import { MLPrediction, fetchMLPrediction } from '@/types/ml-prediction';
import MLSettingsPanel, { PredictionSettings, DEFAULT_SETTINGS } from '@/components/dom/MLSettingsPanel';
import AccuracyTrackerPanel, { useAccuracyTracker } from '@/components/dom/AccuracyTracker';

const ADMIN_EMAILS = ['apmexplore@gmail.com'];
const MAX_FLOW_HISTORY = 600; // Keep last 1 minute of data (100ms * 600)

// Order Book Component
function OrderBookVisualization({ orderBook, maxLevels = 15 }: { orderBook: OrderBook | null; maxLevels?: number }) {
    if (!orderBook) {
        return (
            <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p>Menghubungkan ke market...</p>
                </div>
            </div>
        );
    }

    const bids = orderBook.bids.slice(0, maxLevels);
    const asks = orderBook.asks.slice(0, maxLevels).reverse(); // Reverse for display

    return (
        <div className="grid grid-cols-2 gap-4 h-full">
            {/* Asks (Sell Orders) - Top */}
            <div className="col-span-2">
                <div className="text-xs text-[var(--text-muted)] mb-2 flex justify-between">
                    <span>SELL ORDERS (Asks)</span>
                    <span>Total: {orderBook.totalAskVolume.toFixed(4)}</span>
                </div>
                <div className="space-y-1">
                    {asks.map((level, i) => (
                        <div key={`ask-${i}`} className="flex items-center gap-2 text-sm">
                            <div className="w-24 text-right font-mono text-red-600">
                                {level.price.toFixed(2)}
                            </div>
                            <div className="flex-1 h-6 bg-[var(--bg-secondary)] rounded overflow-hidden relative">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${level.percentage}%` }}
                                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-red-500/30 to-red-500/60"
                                />
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)] font-mono">
                                    {level.volume.toFixed(4)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Spread Indicator */}
            <div className="col-span-2 py-3 px-4 bg-[var(--bg-secondary)] rounded-xl flex items-center justify-between">
                <div className="text-center">
                    <span className="text-xs text-[var(--text-muted)]">Best Bid</span>
                    <p className="text-lg font-bold text-green-600">{orderBook.bids[0]?.price.toFixed(2) || '-'}</p>
                </div>
                <div className="text-center px-4">
                    <span className="text-xs text-[var(--text-muted)]">Spread</span>
                    <p className="text-lg font-bold text-[var(--text-primary)]">{orderBook.spread.toFixed(2)}</p>
                    <span className="text-xs text-[var(--text-muted)]">({orderBook.spreadPercent.toFixed(3)}%)</span>
                </div>
                <div className="text-center">
                    <span className="text-xs text-[var(--text-muted)]">Best Ask</span>
                    <p className="text-lg font-bold text-red-600">{orderBook.asks[0]?.price.toFixed(2) || '-'}</p>
                </div>
            </div>

            {/* Bids (Buy Orders) - Bottom */}
            <div className="col-span-2">
                <div className="text-xs text-[var(--text-muted)] mb-2 flex justify-between">
                    <span>BUY ORDERS (Bids)</span>
                    <span>Total: {orderBook.totalBidVolume.toFixed(4)}</span>
                </div>
                <div className="space-y-1">
                    {bids.map((level, i) => (
                        <div key={`bid-${i}`} className="flex items-center gap-2 text-sm">
                            <div className="w-24 text-right font-mono text-green-600">
                                {level.price.toFixed(2)}
                            </div>
                            <div className="flex-1 h-6 bg-[var(--bg-secondary)] rounded overflow-hidden relative">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${level.percentage}%` }}
                                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-500/30 to-green-500/60"
                                />
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)] font-mono">
                                    {level.volume.toFixed(4)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Imbalance Meter Component
function ImbalanceMeter({ imbalance }: { imbalance: number }) {
    // Clamp to -100 to +100
    const value = Math.max(-100, Math.min(100, imbalance));
    const percentage = (value + 100) / 2; // Convert to 0-100 scale

    const getColor = () => {
        if (value > 30) return 'text-green-600';
        if (value < -30) return 'text-red-600';
        return 'text-amber-600';
    };

    const getLabel = () => {
        if (value > 50) return 'Strong Buyers';
        if (value > 20) return 'Buyers Active';
        if (value < -50) return 'Strong Sellers';
        if (value < -20) return 'Sellers Active';
        return 'Balanced';
    };

    return (
        <div className="bg-white rounded-2xl p-6 border border-[var(--border-light)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <span>⚖️</span> Order Imbalance
            </h3>

            {/* Gauge */}
            <div className="relative h-4 bg-[var(--bg-secondary)] rounded-full overflow-hidden mb-4">
                <div className="absolute inset-0 flex">
                    <div className="w-1/2 bg-gradient-to-r from-red-500 to-red-300 opacity-30" />
                    <div className="w-1/2 bg-gradient-to-r from-green-300 to-green-500 opacity-30" />
                </div>
                <motion.div
                    className="absolute top-0 w-3 h-full bg-[var(--text-primary)] rounded-full shadow-lg"
                    initial={{ left: '50%' }}
                    animate={{ left: `calc(${percentage}% - 6px)` }}
                    transition={{ type: 'spring', stiffness: 100 }}
                />
            </div>

            <div className="flex justify-between text-xs text-[var(--text-muted)] mb-4">
                <span>Sellers</span>
                <span>Neutral</span>
                <span>Buyers</span>
            </div>

            <div className="text-center">
                <p className={`text-2xl font-bold ${getColor()}`}>
                    {value > 0 ? '+' : ''}{value.toFixed(1)}%
                </p>
                <p className="text-sm text-[var(--text-secondary)]">{getLabel()}</p>
            </div>
        </div>
    );
}

// Prediction Panel Component
function PredictionPanel({ prediction }: { prediction: DOMPrediction | null }) {
    if (!prediction) {
        return (
            <div className="bg-white rounded-2xl p-6 border border-[var(--border-light)] h-full flex items-center justify-center">
                <p className="text-[var(--text-muted)]">Analyzing...</p>
            </div>
        );
    }

    const directionColors = {
        BULLISH: 'from-green-500 to-emerald-500',
        BEARISH: 'from-red-500 to-rose-500',
        NEUTRAL: 'from-amber-500 to-orange-500',
    };

    const directionIcons = {
        BULLISH: '📈',
        BEARISH: '📉',
        NEUTRAL: '➡️',
    };

    return (
        <div className="bg-white rounded-2xl p-6 border border-[var(--border-light)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <SparklesIcon size="sm" className="text-purple-500" />
                AI Prediction
            </h3>

            {/* Direction Badge */}
            <div className={`bg-gradient-to-r ${directionColors[prediction.direction]} rounded-xl p-4 text-white mb-4`}>
                <div className="flex items-center gap-3">
                    <span className="text-3xl">{directionIcons[prediction.direction]}</span>
                    <div>
                        <p className="text-lg font-bold">{prediction.direction}</p>
                        <p className="text-sm opacity-90">Strength: {prediction.strength.toFixed(0)}%</p>
                    </div>
                </div>
            </div>

            {/* Confidence & Whale Activity */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-[var(--bg-secondary)] rounded-xl p-3 text-center">
                    <p className="text-xs text-[var(--text-muted)]">Confidence</p>
                    <p className="text-lg font-bold text-[var(--text-primary)]">{prediction.confidence}%</p>
                </div>
                <div className="bg-[var(--bg-secondary)] rounded-xl p-3 text-center">
                    <p className="text-xs text-[var(--text-muted)]">Whale Activity</p>
                    <p className={`text-lg font-bold ${prediction.whaleActivity === 'HIGH' ? 'text-purple-600' :
                        prediction.whaleActivity === 'MEDIUM' ? 'text-blue-600' : 'text-gray-500'
                        }`}>
                        {prediction.whaleActivity === 'HIGH' ? '🐋 High' :
                            prediction.whaleActivity === 'MEDIUM' ? '🐬 Medium' : '🐟 Low'}
                    </p>
                </div>
            </div>

            {/* Recommendation */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                <p className="text-sm text-blue-800">{prediction.recommendation}</p>
            </div>

            {/* Signals */}
            {prediction.signals.length > 0 && (
                <div>
                    <p className="text-xs text-[var(--text-muted)] mb-2">Detected Signals</p>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                        {prediction.signals.slice(0, 5).map((signal, i) => (
                            <div key={i} className="text-xs p-2 bg-[var(--bg-secondary)] rounded-lg flex items-start gap-2">
                                <span className={`px-1.5 py-0.5 rounded text-white text-[10px] ${signal.level === 'HIGH' ? 'bg-red-500' :
                                    signal.level === 'MEDIUM' ? 'bg-amber-500' : 'bg-gray-400'
                                    }`}>
                                    {signal.level}
                                </span>
                                <span className="text-[var(--text-secondary)]">{signal.description}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// Coming Soon Component (for non-admin users)
function ComingSoonView() {
    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pt-20">
            <div className="container-apple section-padding">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <span className="badge-apple mb-6 inline-flex">
                        🔮 Advanced Trading Tool
                    </span>
                    <h1 className="headline-lg mb-4">
                        DOM <span className="gradient-text">ARRA</span>
                    </h1>
                    <p className="body-lg max-w-2xl mx-auto">
                        Depth of Market visualization dengan AI-powered order flow analysis
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="max-w-2xl mx-auto"
                >
                    <div className="relative bg-white rounded-3xl border border-[var(--border-light)] overflow-hidden">
                        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.3, type: 'spring' }}
                                className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center mb-6"
                            >
                                <LockIcon className="text-[var(--accent-blue)]" size="xl" />
                            </motion.div>
                            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Coming Soon</h2>
                            <p className="text-[var(--text-secondary)] mb-6 text-center px-8">
                                Fitur DOM ARRA sedang dalam pengembangan dan akan segera hadir
                            </p>
                            <div className="flex flex-wrap gap-3 justify-center">
                                <span className="px-4 py-2 rounded-full bg-[var(--bg-secondary)] text-sm text-[var(--text-secondary)]">
                                    📊 Order Flow Analysis
                                </span>
                                <span className="px-4 py-2 rounded-full bg-[var(--bg-secondary)] text-sm text-[var(--text-secondary)]">
                                    🔥 Liquidity Heatmap
                                </span>
                                <span className="px-4 py-2 rounded-full bg-[var(--bg-secondary)] text-sm text-[var(--text-secondary)]">
                                    🐋 Whale Detection
                                </span>
                            </div>
                        </div>

                        <div className="p-8 opacity-30 blur-sm">
                            <div className="h-64 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl mb-4"></div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="h-20 bg-gray-100 rounded-xl"></div>
                                <div className="h-20 bg-gray-100 rounded-xl"></div>
                                <div className="h-20 bg-gray-100 rounded-xl"></div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-center mt-12"
                >
                    <p className="text-[var(--text-muted)] mb-4">Ingin notifikasi saat DOM ARRA tersedia?</p>
                    <Link href="https://t.me/arra7trader" target="_blank" rel="noopener noreferrer">
                        <button className="btn-primary">
                            Join Telegram untuk Update
                        </button>
                    </Link>
                </motion.div>

                <div className="text-center mt-8">
                    <Link href="/" className="text-[var(--accent-blue)] hover:underline">
                        ← Kembali ke Beranda
                    </Link>
                </div>
            </div>
        </div>
    );
}

// Main DOM ARRA Component
export default function DomArraPage() {
    const { data: session, status } = useSession();
    const [selectedSymbol, setSelectedSymbol] = useState<DOMSymbolId>('BTCUSD');
    const [orderBook, setOrderBook] = useState<OrderBook | null>(null);
    const [prediction, setPrediction] = useState<DOMPrediction | null>(null);
    const [mlPrediction, setMLPrediction] = useState<MLPrediction | null>(null);
    const [mlLoading, setMLLoading] = useState(false);
    const [mlSettings, setMLSettings] = useState<PredictionSettings>(DEFAULT_SETTINGS);
    const [isConnected, setIsConnected] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [flowHistory, setFlowHistory] = useState<HeatmapDataPoint[]>([]);
    const [activeTab, setActiveTab] = useState<'orderbook' | 'heatmap'>('orderbook');
    const { stats: accuracyStats, pendingCount, trackPrediction, setGetCurrentPrice } = useAccuracyTracker(selectedSymbol);
    const [usePolling, setUsePolling] = useState(false); // Fallback mode for ISP blocks
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const currentSymbolRef = useRef<DOMSymbolId>(selectedSymbol);
    const wsFailCountRef = useRef(0); // Track consecutive failures

    const isAdmin = session?.user?.email && ADMIN_EMAILS.includes(session.user.email);
    const symbolConfig = DOM_SYMBOLS[selectedSymbol];

    // Set up price getter for accuracy verification
    useEffect(() => {
        setGetCurrentPrice(() => orderBook?.midPrice || 0);
    }, [orderBook, setGetCurrentPrice]);

    // Update ref when symbol changes
    useEffect(() => {
        currentSymbolRef.current = selectedSymbol;
    }, [selectedSymbol]);

    // Unified Binance WebSocket connection for both symbols
    const connectBinanceStream = useCallback((symbol: DOMSymbolId) => {
        // Clear any pending reconnect
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        // Close existing connection
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        // Get the binance symbol from config
        const binanceSymbol = DOM_SYMBOLS[symbol].binanceSymbol;
        if (!binanceSymbol) {
            console.error('No Binance symbol configured for', symbol);
            return;
        }

        console.log(`Connecting to Binance for ${symbol} (${binanceSymbol})...`);
        const wsUrl = `wss://stream.binance.com/ws/${binanceSymbol}@depth20@100ms`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log(`Binance WebSocket connected for ${symbol} (${binanceSymbol})`);
            setIsConnected(true);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                // Parse Binance depth data
                const bids = data.bids.map(([price, volume]: [string, string]) => ({
                    price: parseFloat(price),
                    volume: parseFloat(volume),
                }));

                const asks = data.asks.map(([price, volume]: [string, string]) => ({
                    price: parseFloat(price),
                    volume: parseFloat(volume),
                }));

                // Calculate order book metrics - use the symbol this connection was created for
                const newOrderBook = calculateOrderBookMetrics(bids, asks, symbol, 'REAL');
                setOrderBook(newOrderBook);
                setLastUpdate(new Date());

                // Analyze order flow
                const newPrediction = analyzeOrderFlow(newOrderBook);
                setPrediction(newPrediction);

                // Add to flow history
                setFlowHistory(prev => {
                    const newPoint: HeatmapDataPoint = {
                        timestamp: Date.now(),
                        orderBook: newOrderBook
                    };
                    const updated = [...prev, newPoint];
                    return updated.slice(-MAX_FLOW_HISTORY);
                });
            } catch (error) {
                console.error('Error parsing Binance data:', error);
            }
        };

        ws.onclose = () => {
            console.log('Binance WebSocket disconnected');
            setIsConnected(false);

            // Only reconnect if this is still the current symbol
            if (currentSymbolRef.current === symbol) {
                reconnectTimeoutRef.current = setTimeout(() => {
                    // Double-check the symbol hasn't changed
                    if (currentSymbolRef.current === symbol) {
                        connectBinanceStream(symbol);
                    }
                }, 5000);
            }
        };

        ws.onerror = (error) => {
            console.error('Binance WebSocket error:', error);
            setIsConnected(false);
            wsFailCountRef.current++;

            // After 2 consecutive failures, switch to polling fallback
            if (wsFailCountRef.current >= 2) {
                console.log('WebSocket blocked, switching to proxy polling...');
                setUsePolling(true);
            }
        };

        wsRef.current = ws;
    }, []);

    // Proxy Polling Fallback (for ISP-blocked connections)
    const fetchViaProxy = useCallback(async (symbol: DOMSymbolId) => {
        try {
            const binanceSymbol = DOM_SYMBOLS[symbol].binanceSymbol;
            const response = await fetch(`/api/binance/depth?symbol=${binanceSymbol}&limit=20`);

            if (!response.ok) throw new Error('Proxy fetch failed');

            const data = await response.json();

            // Parse data (same format as WebSocket)
            const bids = data.bids.map(([price, volume]: [string, string]) => ({
                price: parseFloat(price),
                volume: parseFloat(volume),
            }));
            const asks = data.asks.map(([price, volume]: [string, string]) => ({
                price: parseFloat(price),
                volume: parseFloat(volume),
            }));

            const newOrderBook = calculateOrderBookMetrics(bids, asks, symbol, 'REAL');
            setOrderBook(newOrderBook);
            setLastUpdate(new Date());
            setIsConnected(true);

            const newPrediction = analyzeOrderFlow(newOrderBook);
            setPrediction(newPrediction);

            setFlowHistory(prev => {
                const newPoint: HeatmapDataPoint = {
                    timestamp: Date.now(),
                    orderBook: newOrderBook
                };
                const updated = [...prev, newPoint];
                return updated.slice(-MAX_FLOW_HISTORY);
            });
        } catch (error) {
            console.error('Proxy fetch error:', error);
            setIsConnected(false);
        }
    }, []);

    // Effect: Start polling when in fallback mode
    useEffect(() => {
        if (!usePolling || !isAdmin) return;

        // Close WebSocket if still open
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        // Start polling every 500ms
        console.log('Starting proxy polling for', selectedSymbol);
        fetchViaProxy(selectedSymbol); // Initial fetch
        pollingIntervalRef.current = setInterval(() => {
            fetchViaProxy(selectedSymbol);
        }, 500);

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        };
    }, [usePolling, selectedSymbol, isAdmin, fetchViaProxy]);

    // Effect: Connect on symbol change
    useEffect(() => {
        if (!isAdmin || usePolling) return;

        // Reset failure count on symbol change
        wsFailCountRef.current = 0;

        // Clear data when switching symbols
        setOrderBook(null);
        setPrediction(null);
        setFlowHistory([]);

        // Connect to Binance for the selected symbol
        connectBinanceStream(selectedSymbol);

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [selectedSymbol, isAdmin, usePolling, connectBinanceStream]);

    // Effect: Fetch ML predictions based on settings
    useEffect(() => {
        if (!isAdmin || !orderBook) return;

        const fetchPrediction = async () => {
            try {
                setMLLoading(true);
                const pred = await fetchMLPrediction(selectedSymbol, mlSettings.horizon, orderBook);
                setMLPrediction(pred);

                // Track for accuracy
                if (orderBook.midPrice) {
                    trackPrediction(pred, orderBook.midPrice);
                }
            } catch (error) {
                console.error('ML prediction error:', error);
            } finally {
                setMLLoading(false);
            }
        };

        // Initial fetch
        fetchPrediction();

        // Fetch based on settings interval
        const interval = setInterval(fetchPrediction, mlSettings.refreshInterval * 1000);

        return () => clearInterval(interval);
    }, [selectedSymbol, isAdmin, orderBook, mlSettings.horizon, mlSettings.refreshInterval, trackPrediction]);

    // Loading state
    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
                <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Show coming soon for non-admin users
    if (!isAdmin) {
        return <ComingSoonView />;
    }

    // Admin View - Full DOM
    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pt-20 pb-12">
            <div className="max-w-7xl mx-auto px-4">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between mb-6"
                >
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                            <ChartIcon size="lg" className="text-blue-600" />
                            DOM ARRA
                            <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full">DEV MODE</span>
                        </h1>
                        <p className="text-[var(--text-secondary)]">Real-time Depth of Market Analysis</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Connection Status */}
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${isConnected ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                            }`}>
                            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                            {isConnected ? 'Connected' : 'Disconnected'}
                        </div>
                        <Link href="/admin">
                            <button className="px-4 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-light)] rounded-lg text-sm text-[var(--text-primary)]">
                                ← Admin
                            </button>
                        </Link>
                    </div>
                </motion.div>

                {/* Symbol Selector */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex gap-3 mb-6"
                >
                    {Object.entries(DOM_SYMBOLS).map(([key, config]) => (
                        <button
                            key={key}
                            onClick={() => setSelectedSymbol(key as DOMSymbolId)}
                            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${selectedSymbol === key
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border border-[var(--border-light)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                                }`}
                        >
                            <span className="text-xl">{config.icon}</span>
                            <span>{config.id}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${config.dataSource === 'REAL'
                                ? 'bg-green-500/20 text-green-500'
                                : 'bg-amber-500/20 text-amber-500'
                                }`}>
                                {config.dataSource}
                            </span>
                        </button>
                    ))}
                </motion.div>

                {/* Tab Selector */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="flex gap-2 mb-6"
                >
                    <button
                        onClick={() => setActiveTab('orderbook')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'orderbook'
                            ? 'bg-blue-100 text-blue-700 border border-blue-300'
                            : 'bg-white border border-[var(--border-light)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                            }`}
                    >
                        <CircleStackIcon size="sm" />
                        Order Book
                    </button>
                    <button
                        onClick={() => setActiveTab('heatmap')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'heatmap'
                            ? 'bg-purple-100 text-purple-700 border border-purple-300'
                            : 'bg-white border border-[var(--border-light)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                            }`}
                    >
                        <ChartIcon size="sm" />
                        Heatmap & Flow
                    </button>
                </motion.div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Content - 2 columns */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="lg:col-span-2"
                    >
                        {activeTab === 'orderbook' ? (
                            <div className="bg-white rounded-2xl p-6 border border-[var(--border-light)]">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                                        <CircleStackIcon size="md" className="text-blue-600" />
                                        Order Book - {symbolConfig.name}
                                    </h2>
                                    {lastUpdate && (
                                        <span className="text-xs text-[var(--text-muted)]">
                                            Last update: {lastUpdate.toLocaleTimeString()}
                                        </span>
                                    )}
                                </div>
                                <OrderBookVisualization orderBook={orderBook} />
                            </div>
                        ) : (
                            <BookmapChart currentOrderBook={orderBook} history={flowHistory} mlPrediction={mlPrediction} />
                        )}
                    </motion.div>

                    {/* Right Sidebar - Imbalance & Prediction */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="space-y-4"
                    >
                        <ImbalanceMeter imbalance={orderBook?.imbalance || 0} />
                        <MLPredictionPanel prediction={mlPrediction} isLoading={mlLoading} />
                        <MLSettingsPanel settings={mlSettings} onSettingsChange={setMLSettings} />
                        <AccuracyTrackerPanel stats={accuracyStats} pendingCount={pendingCount} />
                        <PredictionPanel prediction={prediction} />
                    </motion.div>
                </div>

                {/* Stats Footer */}
                {orderBook && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4"
                    >
                        <div className="bg-white rounded-xl p-4 border border-[var(--border-light)]">
                            <p className="text-xs text-[var(--text-muted)]">Mid Price</p>
                            <p className="text-xl font-bold text-[var(--text-primary)]">${orderBook.midPrice.toFixed(2)}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-[var(--border-light)]">
                            <p className="text-xs text-[var(--text-muted)]">Total Bid Volume</p>
                            <p className="text-xl font-bold text-green-600">{orderBook.totalBidVolume.toFixed(4)}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-[var(--border-light)]">
                            <p className="text-xs text-[var(--text-muted)]">Total Ask Volume</p>
                            <p className="text-xl font-bold text-red-600">{orderBook.totalAskVolume.toFixed(4)}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-[var(--border-light)]">
                            <p className="text-xs text-[var(--text-muted)]">Data Source</p>
                            <p className={`text-xl font-bold ${orderBook.dataSource === 'REAL' ? 'text-green-600' : 'text-amber-600'}`}>
                                {orderBook.dataSource === 'REAL' ? '🔴 Live' : '🟡 Simulated'}
                            </p>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
