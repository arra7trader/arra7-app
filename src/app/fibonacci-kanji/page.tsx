'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PremiumGuard from '@/components/layout/PremiumGuard';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';

// Dynamic import for FibonacciChart to avoid SSR issues with lightweight-charts
const FibonacciChart = dynamic(() => import('@/components/FibonacciChart'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-black">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-3"></div>
                <p className="text-gray-300 text-sm">Loading chart...</p>
            </div>
        </div>
    ),
});

// Dynamic imports for PriceLadder and TradeWizard with proper typing
const PriceLadder = dynamic(() => import('@/components/PriceLadder'), {
    ssr: false,
    loading: () => <div className="animate-pulse bg-[var(--bg-secondary)] rounded-xl h-96"></div>
}) as React.ComponentType<any>;

const TradeWizard = dynamic(() => import('@/components/TradeWizard'), {
    ssr: false,
    loading: () => <div className="animate-pulse bg-[var(--bg-secondary)] rounded-xl h-96"></div>
}) as React.ComponentType<any>;

// KANJI LEVELS CONFIGURATION
const KANJI_LEVELS = [
    { level: 0, label: 'Swing High (Stop Loss)', color: '#ef5350', desc: 'Starting Point', width: 2 },
    { level: 1, label: 'Swing Low', color: '#78909c', desc: 'Ending Point', width: 2 },
    // Scalping Zone
    { level: 0.559, label: 'Entry Zone 1', color: '#26a69a', desc: 'Scalping Entry', width: 1 },
    { level: 0.619, label: 'Entry Zone 2', color: '#26a69a', desc: 'Scalping Entry', width: 1 },
    // Scalping
    { level: 0.786, label: 'Scalping Zone A', color: '#fbc02d', desc: 'Reversal Zone', width: 1, style: 2 },
    { level: 0.882, label: 'Scalping Zone B', color: '#fbc02d', desc: 'Reversal Zone', width: 1, style: 2 },
    // Pullback / Break
    { level: 1.124, label: 'Breakout Zone 1', color: '#ff9800', desc: 'Watch for Break', width: 1 },
    { level: 1.272, label: 'Breakout Zone 2', color: '#ff9800', desc: 'Watch for Break', width: 1 },
    // Zone Entry 2
    { level: 1.618, label: 'GOLDEN RATIO (TP 1)', color: '#2962ff', desc: 'Golden Target', width: 3 }, // Thick
    { level: 2.0, label: 'Confluence (TP 2)', color: '#ab47bc', desc: 'Major Extension', width: 2 },
    { level: 2.618, label: 'Moon Target (TP 3)', color: '#37474f', desc: 'Final Target', width: 1 },
];


export default function FibonacciKanjiPage() {
    const t = useTranslations('kanji');

    // State
    const [selectedPair, setSelectedPair] = useState<string>('XAUUSD');
    const [timeframe, setTimeframe] = useState<'1h' | '4h' | '1d'>('1h');
    const [trend, setTrend] = useState<'UP' | 'DOWN'>('UP');
    const [highPrice, setHighPrice] = useState<string>('');
    const [lowPrice, setLowPrice] = useState<string>('');
    const [calculatedLevels, setCalculatedLevels] = useState<any[]>([]); // Assuming CalculatedLevel[] is meant to be any[] or a defined type
    const [isAutoScan, setIsAutoScan] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [currentPrice, setCurrentPrice] = useState<number | null>(null);

    // Fetch current price
    useEffect(() => {
        const fetchCurrentPrice = async () => {
            try {
                const response = await fetch(`/api/market-data?pair=${selectedPair}&timeframe=${timeframe}`);
                const data = await response.json();

                // Try both 'currentPrice' and 'current_price' keys
                const price = data.currentPrice || data.current_price;

                if (data.status === 'success' && price) {
                    setCurrentPrice(price);
                } else {
                    // Fallback: use midpoint of high/low if available
                    if (highPrice && lowPrice) {
                        const high = parseFloat(highPrice);
                        const low = parseFloat(lowPrice);
                        if (!isNaN(high) && !isNaN(low)) {
                            setCurrentPrice((high + low) / 2);
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to fetch current price:', err);
                // Fallback: use midpoint of high/low if available
                if (highPrice && lowPrice) {
                    const high = parseFloat(highPrice);
                    const low = parseFloat(lowPrice);
                    if (!isNaN(high) && !isNaN(low)) {
                        setCurrentPrice((high + low) / 2);
                    }
                }
            }
        };

        fetchCurrentPrice();
        const interval = setInterval(fetchCurrentPrice, 10000); // Update every 10s
        return () => clearInterval(interval);
    }, [selectedPair, timeframe, highPrice, lowPrice]);

    // Handle Pair Change
    const handlePairChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedPair(e.target.value);
    };

    // --- CALCULATION LOGIC ---
    const calculateKanjiInternal = useCallback((hStr: string, lStr: string, currentTrend: 'UP' | 'DOWN') => {
        const cleanH = hStr.replace(/,/g, '.');
        const cleanL = lStr.replace(/,/g, '.');
        const h = parseFloat(cleanH);
        const l = parseFloat(cleanL);
        if (isNaN(h) || isNaN(l)) {
            setCalculatedLevels([]);
            return;
        }

        const range = Math.abs(h - l);

        const levels = KANJI_LEVELS.map(k => {
            let finalPrice = 0;
            let finalLabel = k.label;

            // DYNAMIC CALCULATION BASED ON TREND
            if (currentTrend === 'DOWN') {
                // Bearish: Start at High (Level 0), Project Down
                // Price = High - (Range * Level)
                finalPrice = h - (range * k.level);

                // Labels fine as is for Bearish default, but let's be explicit
                if (k.level === 0) finalLabel = 'Swing High (Stop Loss)';
                if (k.level === 1) finalLabel = 'Swing Low';

            } else {
                // Bullish: Start at Low (Level 0), Project Up
                // Price = Low + (Range * Level)
                finalPrice = l + (range * k.level);

                // Update Labels for Bullish
                if (k.level === 0) finalLabel = 'Swing Low (Stop Loss)'; // Start point
                if (k.level === 1) finalLabel = 'Swing High'; // End point
            }

            const isIndo = selectedPair === 'USDIDR';
            const decimals = (finalPrice > 1000 && !isIndo) ? 2 : (finalPrice > 50 ? 2 : 5);
            return {
                ...k,
                label: finalLabel,
                price: finalPrice.toFixed(decimals)
            };
        });

        setCalculatedLevels(levels);
    }, [selectedPair]);

    const calculateKanji = () => {
        calculateKanjiInternal(highPrice, lowPrice, trend);
    };

    // --- AUTO CALCULATION ON INPUT CHANGE ---
    useEffect(() => {
        if (highPrice && lowPrice) {
            calculateKanjiInternal(highPrice, lowPrice, trend);
        } else {
            setCalculatedLevels([]);
        }
    }, [highPrice, lowPrice, trend, calculateKanjiInternal]);

    // --- AI AUTO SCAN ---
    useEffect(() => {
        const scan = async () => {
            if (!isAutoScan) return;
            setIsScanning(true);
            try {
                const res = await fetch(`/api/kanji/detect?pair=${selectedPair}&timeframe=1h`);
                const json = await res.json();
                if (json.status === 'success' && json.data) {
                    const { high, low, trend: detectedTrend } = json.data;
                    if (high && low) {
                        setHighPrice(high.toString());
                        setLowPrice(low.toString());

                        // Auto-set trend from AI
                        const newTrend = detectedTrend === 'UP' ? 'UP' : 'DOWN';
                        setTrend(newTrend);

                        // Triggering setHigh/setLow will trigger the Auto Calculation useEffect above
                        // But we might want to ensure we call it explicitly just in case of race condition or just rely on useEffect
                        // Actually relying on useEffect is safer. But let's keep the explicit call in scan() if needed?
                        // No, if we set state, useEffect will fire.
                    }
                }
            } catch (e) { console.error(e) }
            finally { setIsScanning(false); }
        };

        let interval: any;
        if (isAutoScan) {
            scan();
            interval = setInterval(scan, 60000);
        }
        return () => clearInterval(interval);
    }, [isAutoScan, selectedPair]);

    // Handle Click on Analysis Chart
    const handleChartClick = (price: number) => {
        if (!highPrice || (highPrice && lowPrice)) {
            setHighPrice(price.toFixed(price > 50 ? 2 : 5));
            setLowPrice('');
        } else {
            setLowPrice(price.toFixed(price > 50 ? 2 : 5));
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pt-36 pb-12">
            <div className="container-fluid mx-auto px-4 max-w-[1900px]">
                <PremiumGuard
                    title={t('title')}
                    description={t('desc')}
                    minTier="PRO"
                >
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[85vh] min-h-[700px]">

                        {/* CHART AREA */}
                        <div className="lg:col-span-3 bg-black rounded-3xl overflow-hidden shadow-2xl border border-gray-800 relative flex flex-col">

                            {/* Header */}
                            <div className="bg-gray-900 border-b border-gray-800 p-2 flex justify-between items-center px-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-blue-400 text-sm">📊</span>
                                    <span className="text-white text-xs font-bold">Fibonacci Levels Visualization</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    {/* Timeframe Display */}
                                    <div className="px-2 py-1 bg-blue-600 rounded text-[10px] font-bold text-white">
                                        {timeframe.toUpperCase()}
                                    </div>
                                    <div className="text-[var(--text-secondary)] text-[10px] font-mono">
                                        {selectedPair} • {calculatedLevels.length > 0 ? `${calculatedLevels.length} LEVELS` : 'REAL-TIME FEED'}
                                    </div>
                                </div>
                            </div>

                            {/* Chart Content - Now Price Ladder + Trade Wizard */}
                            <div className="flex-1 relative w-full h-full overflow-y-auto p-6">
                                {calculatedLevels.length > 0 ? (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Price Ladder */}
                                        <div>
                                            <PriceLadder
                                                levels={calculatedLevels}
                                                currentPrice={currentPrice}
                                                trend={trend}
                                            />
                                        </div>

                                        {/* Trade Wizard */}
                                        <div className="sticky top-6">
                                            <TradeWizard
                                                levels={calculatedLevels}
                                                currentPrice={currentPrice}
                                                trend={trend}
                                                onTrendChange={setTrend}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-black rounded-2xl">
                                        <div className="text-center">
                                            <div className="text-6xl mb-4">🧮</div>
                                            <p className="text-slate-400 text-sm mb-2">Calculate Fibonacci Levels</p>
                                            <p className="text-[var(--text-secondary)] text-xs">Enter High/Low prices or enable AI Auto-Detect</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* SIDEBAR CONTROLS */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="lg:col-span-1 bg-[var(--bg-primary)] rounded-3xl p-6 shadow-xl border border-[var(--border-light)] flex flex-col h-full overflow-hidden"
                        >
                            <div className="mb-4 flex-shrink-0">
                                <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-1">🧮 Kanji Pro</h2>
                                <p className="text-[var(--text-secondary)] text-xs">AI-Powered Fibonacci Levels</p>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                                {/* Auto Scan Toggle */}
                                <div className="mb-4 p-3 bg-indigo-500/10 border-indigo-500/20 border border-indigo-100 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-2 rounded-lg bg-[var(--bg-primary)] shadow-sm ${isScanning ? 'animate-pulse' : ''}`}>
                                            <span className="text-xl">🤖</span>
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-indigo-900">AI Auto-Detect</div>
                                            <div className="text-[10px] text-indigo-400">Auto Scan every 60s</div>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isAutoScan}
                                            onChange={(e) => setIsAutoScan(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--bg-primary)] after:border-[var(--border-medium)] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>

                                {/* Pair Selector */}
                                <div className="mb-4 space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Asset Pair</label>
                                    <select
                                        value={selectedPair}
                                        onChange={handlePairChange}
                                        className="w-full p-3 bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-xl font-bold text-[var(--text-primary)] text-sm outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer hover:bg-[var(--bg-secondary)] transition"
                                    >
                                        <optgroup label="🥇 Commodities">
                                            <option value="XAUUSD">Gold (XAUUSD)</option>
                                            <option value="XAGUSD">Silver (XAGUSD)</option>
                                            <option value="XTIUSD">Crude Oil (WTI)</option>
                                            <option value="XBRUSD">Brent Oil</option>
                                            <option value="XNGUSD">Natural Gas</option>
                                        </optgroup>
                                        <optgroup label="📈 US Indices">
                                            <option value="US30">US30 (Dow Jones)</option>
                                            <option value="US500">US500 (S&P 500)</option>
                                            <option value="USTEC">Nasdaq 100 (USTEC)</option>
                                        </optgroup>
                                        <optgroup label="🌍 Global Indices">
                                            <option value="GER40">DAX 40 (Germany)</option>
                                            <option value="UK100">FTSE 100 (UK)</option>
                                            <option value="FRA40">CAC 40 (France)</option>
                                            <option value="JPN225">Nikkei 225 (Japan)</option>
                                            <option value="AUS200">ASX 200 (Australia)</option>
                                        </optgroup>
                                        <optgroup label="💱 Forex - Major Pairs">
                                            <option value="EURUSD">EUR/USD (Euro Dollar)</option>
                                            <option value="GBPUSD">GBP/USD (Cable)</option>
                                            <option value="USDJPY">USD/JPY (Gopher)</option>
                                            <option value="USDCHF">USD/CHF (Swissy)</option>
                                            <option value="AUDUSD">AUD/USD (Aussie)</option>
                                            <option value="USDCAD">USD/CAD (Loonie)</option>
                                            <option value="NZDUSD">NZD/USD (Kiwi)</option>
                                        </optgroup>
                                        <optgroup label="💱 Forex - Minor Pairs">
                                            <option value="EURGBP">EUR/GBP</option>
                                            <option value="EURJPY">EUR/JPY</option>
                                            <option value="GBPJPY">GBP/JPY</option>
                                            <option value="EURCHF">EUR/CHF</option>
                                            <option value="EURAUD">EUR/AUD</option>
                                            <option value="GBPAUD">GBP/AUD</option>
                                            <option value="AUDJPY">AUD/JPY</option>
                                            <option value="NZDJPY">NZD/JPY</option>
                                        </optgroup>
                                        <optgroup label="💱 Forex - Exotic Pairs">
                                            <option value="USDIDR">USD/IDR (Rupiah)</option>
                                            <option value="USDSGD">USD/SGD</option>
                                            <option value="USDTHB">USD/THB</option>
                                            <option value="USDMXN">USD/MXN</option>
                                            <option value="USDZAR">USD/ZAR</option>
                                            <option value="USDTRY">USD/TRY</option>
                                        </optgroup>
                                        <optgroup label="₿ Crypto - Top Coins">
                                            <option value="BTCUSD">Bitcoin (BTC)</option>
                                            <option value="ETHUSD">Ethereum (ETH)</option>
                                            <option value="BNBUSD">Binance Coin (BNB)</option>
                                            <option value="XRPUSD">Ripple (XRP)</option>
                                            <option value="SOLUSD">Solana (SOL)</option>
                                            <option value="ADAUSD">Cardano (ADA)</option>
                                            <option value="DOGEUSD">Dogecoin (DOGE)</option>
                                            <option value="MATICUSD">Polygon (MATIC)</option>
                                            <option value="LINKUSD">Chainlink (LINK)</option>
                                            <option value="AVAXUSD">Avalanche (AVAX)</option>
                                        </optgroup>
                                    </select>
                                </div>

                                {/* TREND SELECTOR (NEW) */}
                                <div className="mb-4">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Trend Direction</label>
                                    <div className="flex bg-[var(--bg-secondary)] p-1 rounded-xl">
                                        <button
                                            onClick={() => setTrend('UP')}
                                            className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition ${trend === 'UP' ? 'bg-green-500 text-white shadow-md' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                                        >
                                            <span>📈 Bullish</span>
                                        </button>
                                        <button
                                            onClick={() => setTrend('DOWN')}
                                            className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition ${trend === 'DOWN' ? 'bg-red-500 text-white shadow-md' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                                        >
                                            <span>📉 Bearish</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Inputs */}
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-1">
                                            {trend === 'UP' ? 'Swing Low (Start)' : 'Swing High (Start)'}
                                        </label>
                                        <input
                                            type="text"
                                            value={trend === 'UP' ? lowPrice : highPrice}
                                            onChange={(e) => trend === 'UP' ? setLowPrice(e.target.value) : setHighPrice(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full p-2.5 bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-lg font-mono text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-1">
                                            {trend === 'UP' ? 'Swing High (End)' : 'Swing Low (End)'}
                                        </label>
                                        <input
                                            type="text"
                                            value={trend === 'UP' ? highPrice : lowPrice}
                                            onChange={(e) => trend === 'UP' ? setHighPrice(e.target.value) : setLowPrice(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full p-2.5 bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-lg font-mono text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={calculateKanji}
                                    className="w-full py-3.5 bg-gray-900 hover:bg-black text-white rounded-xl font-bold shadow-lg shadow-gray-200 transition transform hover:scale-[1.02] active:scale-95 mb-6 text-sm flex items-center justify-center gap-2"
                                >
                                    <span>Calculate Levels</span>
                                    <span>🚀</span>
                                </button>

                                {/* Results Section */}
                                {calculatedLevels.length > 0 && (
                                    <div className="w-full pb-4">
                                        {/* Trend Badge */}
                                        <div className={`mb-3 p-3 rounded-xl flex items-center gap-3 ${trend === 'UP' ? 'bg-green-500/10 border-green-500/20 border border-green-500/20' : 'bg-red-500/10 border-red-500/20 border border-red-500/20'}`}>
                                            <div className={`text-2xl ${trend === 'UP' ? 'animate-bounce' : ''}`}>
                                                {trend === 'UP' ? '📈' : '📉'}
                                            </div>
                                            <div>
                                                <div className={`font-bold text-sm ${trend === 'UP' ? 'text-green-400' : 'text-red-400'}`}>
                                                    {trend === 'UP' ? 'BULLISH TREND' : 'BEARISH TREND'}
                                                </div>
                                                <div className="text-[10px] text-[var(--text-secondary)]">
                                                    {trend === 'UP' ? 'Low → High Projection' : 'High → Low Projection'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Current Price Badge */}
                                        {currentPrice && (
                                            <div className="mb-3 p-3 bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl text-white shadow-lg">
                                                <div className="text-[10px] font-bold opacity-80 mb-1">💰 CURRENT PRICE</div>
                                                <div className="text-2xl font-mono font-bold">{currentPrice.toFixed(2)}</div>
                                            </div>
                                        )}

                                        {/* Table Header */}
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-xs font-bold text-slate-400 uppercase">Kanji Levels</h3>
                                        </div>

                                        {/* Interactive Table */}
                                        <table className="w-full text-xs">
                                            <tbody className="divide-y divide-gray-50 border-t border-[var(--border-light)]">
                                                {calculatedLevels.map((lvl) => {
                                                    const levelPrice = parseFloat(lvl.price);
                                                    const distance = currentPrice ? Math.abs(currentPrice - levelPrice) : null;
                                                    const isAbove = currentPrice ? currentPrice > levelPrice : false;
                                                    const isNear = distance && currentPrice ? (distance / currentPrice) < 0.002 : false;

                                                    let status = '⚪ PENDING';
                                                    let statusColor = 'text-slate-400';
                                                    if (currentPrice) {
                                                        const percentDiff = Math.abs(currentPrice - levelPrice) / currentPrice;
                                                        if (percentDiff < 0.001) {
                                                            status = '🟢 ACTIVE';
                                                            statusColor = 'text-green-400';
                                                        } else if (
                                                            (trend === 'UP' && currentPrice > levelPrice) ||
                                                            (trend === 'DOWN' && currentPrice < levelPrice)
                                                        ) {
                                                            status = '🔴 BREACHED';
                                                            statusColor = 'text-red-400';
                                                        }
                                                    }

                                                    return (
                                                        <tr
                                                            key={lvl.level}
                                                            className={`group hover:bg-blue-500/10 border-blue-500/20 transition cursor-pointer ${isNear ? 'bg-yellow-500/10 border-yellow-500/20' : ''}`}
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(lvl.price);
                                                                const el = document.getElementById(`price-${lvl.level}`);
                                                                if (el) {
                                                                    el.classList.add('text-green-400', 'scale-110');
                                                                    setTimeout(() => el.classList.remove('text-green-400', 'scale-110'), 300);
                                                                }
                                                            }}
                                                            title="Click to copy price"
                                                        >
                                                            <td className="py-2.5 pl-1">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: lvl.color }}></div>
                                                                    <div className="flex-1">
                                                                        <div className="font-bold text-[var(--text-primary)] group-hover:text-blue-400">{lvl.label}</div>
                                                                        <div className="text-[9px] text-slate-400">{lvl.desc}</div>
                                                                        <div className={`text-[8px] font-bold ${statusColor} mt-0.5`}>
                                                                            {status}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-2.5 text-right pr-1">
                                                                <div className="flex flex-col items-end gap-1">
                                                                    <span
                                                                        id={`price-${lvl.level}`}
                                                                        className="font-mono font-medium text-[var(--text-primary)] group-hover:text-blue-400 transition-all duration-150"
                                                                    >
                                                                        {lvl.price}
                                                                    </span>
                                                                    {distance !== null && (
                                                                        <span className={`text-[8px] font-bold ${isNear ? 'text-orange-600' : 'text-slate-400'}`}>
                                                                            {isAbove ? '↑' : '↓'} {distance.toFixed(2)} pips
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="text-slate-400 ml-1 opacity-0 group-hover:opacity-100 transition text-[10px]">📋</span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>

                                        {/* Auto Trade Setup Generator */}
                                        {calculatedLevels.length > 0 && currentPrice && (
                                            <div className="mt-4 p-4 bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-500/20 rounded-xl">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className="text-lg">🎯</span>
                                                    <h3 className="text-sm font-bold text-indigo-900">Smart Trade Setup</h3>
                                                </div>

                                                {(() => {
                                                    // Find Entry Zone
                                                    const entryZone = calculatedLevels.find(l => l.level === 0.559);
                                                    // Find TP zones
                                                    const tp1 = calculatedLevels.find(l => l.level === 1.618); // Golden Ratio
                                                    const tp2 = calculatedLevels.find(l => l.level === 2.0); // Confluence
                                                    const tp3 = calculatedLevels.find(l => l.level === 2.618); // Moon Target
                                                    // Find SL zone (swing point)
                                                    const slZone = calculatedLevels.find(l => l.level === 0);

                                                    if (!entryZone || !tp1 || !slZone) return null;

                                                    const entry = parseFloat(entryZone.price);
                                                    const stopLoss = parseFloat(slZone.price);
                                                    const takeProfit1 = parseFloat(tp1.price);
                                                    const takeProfit2 = tp2 ? parseFloat(tp2.price) : null;

                                                    const risk = Math.abs(entry - stopLoss);
                                                    const reward = Math.abs(takeProfit1 - entry);
                                                    const rr = reward / risk;

                                                    return (
                                                        <div className="space-y-2 text-xs">
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div className="bg-[var(--bg-primary)] p-2 rounded-lg">
                                                                    <div className="text-[9px] text-[var(--text-secondary)] font-bold mb-1">ENTRY</div>
                                                                    <div className="font-mono font-bold text-indigo-400">{entry.toFixed(2)}</div>
                                                                    <div className="text-[8px] text-slate-400">{entryZone.label}</div>
                                                                </div>
                                                                <div className="bg-[var(--bg-primary)] p-2 rounded-lg">
                                                                    <div className="text-[9px] text-[var(--text-secondary)] font-bold mb-1">STOP LOSS</div>
                                                                    <div className="font-mono font-bold text-red-400">{stopLoss.toFixed(2)}</div>
                                                                    <div className="text-[8px] text-slate-400">-{risk.toFixed(2)} pips</div>
                                                                </div>
                                                            </div>

                                                            <div className="bg-[var(--bg-primary)] p-2 rounded-lg">
                                                                <div className="text-[9px] text-[var(--text-secondary)] font-bold mb-1">TAKE PROFIT LEVELS</div>
                                                                <div className="space-y-1">
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-[9px] text-[var(--text-secondary)]">TP1 (Golden):</span>
                                                                        <span className="font-mono font-bold text-green-400">{takeProfit1.toFixed(2)}</span>
                                                                    </div>
                                                                    {takeProfit2 && (
                                                                        <div className="flex justify-between items-center">
                                                                            <span className="text-[9px] text-[var(--text-secondary)]">TP2 (Conf):</span>
                                                                            <span className="font-mono font-bold text-green-400">{takeProfit2.toFixed(2)}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className={`p-2 rounded-lg ${rr >= 2 ? 'bg-green-500/10 border-green-500/20 border border-green-500/20' : 'bg-yellow-500/10 border-yellow-500/20 border border-yellow-500/20'}`}>
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-[9px] font-bold text-[var(--text-primary)]">Risk/Reward:</span>
                                                                    <span className={`font-bold ${rr >= 2 ? 'text-green-400' : 'text-yellow-400'}`}>
                                                                        1:{rr.toFixed(2)} {rr >= 2 ? '✅' : '⚠️'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        )}

                                        {/* Quick Actions */}
                                        <div className="flex gap-2 mt-4">
                                            <button
                                                onClick={() => {
                                                    const text = calculatedLevels.map(l => `${l.label}: ${l.price}`).join('\n');
                                                    navigator.clipboard.writeText(text);
                                                    alert('All levels copied to clipboard!');
                                                }}
                                                className="flex-1 py-2 px-3 bg-[var(--bg-secondary)] hover:bg-slate-800 text-[var(--text-primary)] rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 transition"
                                            >
                                                <span>📋</span> Copy All
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                    </div>

                    {/* TUTORIAL & GLOSSARY SECTION */}
                    <div className="mt-8 max-w-7xl mx-auto space-y-6">
                        {/* HOW TO USE TUTORIAL */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-3xl p-8 border border-blue-500/20 dark:border-blue-800"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
                                    <span className="text-2xl">📚</span>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-[var(--text-primary)] dark:text-white">Cara Menggunakan</h2>
                                    <p className="text-sm text-[var(--text-secondary)] dark:text-slate-400">Panduan lengkap Fibonacci Kanji</p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Step 1 */}
                                <div className="bg-[var(--bg-primary)] dark:bg-gray-800 rounded-xl p-5 shadow-sm">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>
                                        <div>
                                            <h3 className="font-bold text-[var(--text-primary)] dark:text-white mb-2">Pilih Asset Pair</h3>
                                            <p className="text-sm text-[var(--text-secondary)] dark:text-slate-400">Pilih instrumen yang ingin dianalisa dari dropdown menu (Gold, Forex, Crypto, dll)</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Step 2 */}
                                <div className="bg-[var(--bg-primary)] dark:bg-gray-800 rounded-xl p-5 shadow-sm">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>
                                        <div>
                                            <h3 className="font-bold text-[var(--text-primary)] dark:text-white mb-2">Tentukan Trend</h3>
                                            <p className="text-sm text-[var(--text-secondary)] dark:text-slate-400">Pilih Bullish (📈) jika trend naik, atau Bearish (📉) jika trend turun</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Step 3 */}
                                <div className="bg-[var(--bg-primary)] dark:bg-gray-800 rounded-xl p-5 shadow-sm">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">3</div>
                                        <div>
                                            <h3 className="font-bold text-[var(--text-primary)] dark:text-white mb-2">Input High & Low</h3>
                                            <p className="text-sm text-[var(--text-secondary)] dark:text-slate-400">Masukkan harga Swing High dan Swing Low secara manual, atau aktifkan AI Auto-Detect</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Step 4 */}
                                <div className="bg-[var(--bg-primary)] dark:bg-gray-800 rounded-xl p-5 shadow-sm">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">4</div>
                                        <div>
                                            <h3 className="font-bold text-[var(--text-primary)] dark:text-white mb-2">Lihat Level & Trade</h3>
                                            <p className="text-sm text-[var(--text-secondary)] dark:text-slate-400">Gunakan level yang dihitung untuk planning entry, stop loss, dan take profit Anda</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Pro Tips */}
                            <div className="mt-6 p-4 bg-amber-500/10 border-amber-500/20 dark:bg-amber-900/20 border-l-4 border-amber-500 rounded-lg">
                                <div className="flex items-start gap-2">
                                    <span className="text-xl">💡</span>
                                    <div>
                                        <h4 className="font-bold text-amber-900 dark:text-amber-300 mb-1">Pro Tips</h4>
                                        <ul className="text-sm text-amber-400 dark:text-amber-400 space-y-1">
                                            <li>• Gunakan timeframe lebih tinggi (4H, Daily) untuk swing point yang lebih akurat</li>
                                            <li>• Konfirmasi dengan price action sebelum entry di zone yang diberikan</li>
                                            <li>• Selalu perhatikan Risk/Reward Ratio minimal 1:2</li>
                                            <li>• AI Auto-Detect bekerja optimal di kondisi trending market</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* TERMINOLOGY GLOSSARY */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="bg-[var(--bg-primary)] dark:bg-gray-900 rounded-3xl p-8 border border-[var(--border-light)] dark:border-gray-800 shadow-lg"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center">
                                    <span className="text-2xl">📖</span>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-[var(--text-primary)] dark:text-white">Glossary Istilah</h2>
                                    <p className="text-sm text-[var(--text-secondary)] dark:text-slate-400">Penjelasan lengkap setiap zone & istilah</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {/* Entry Zones */}
                                <div className="p-5 bg-gradient-to-r from-teal-50 to-green-50 dark:from-teal-900/20 dark:to-green-900/20 rounded-xl border border-teal-200 dark:border-teal-800">
                                    <div className="flex items-start gap-3">
                                        <div className="w-3 h-3 bg-teal-500 rounded-full mt-1"></div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-teal-900 dark:text-teal-300 text-lg mb-2">Entry Zone 1 & 2</h3>
                                            <p className="text-sm text-[var(--text-primary)] dark:text-gray-300 mb-3">
                                                Zone optimal untuk melakukan entry position. Entry Zone 1 adalah zona entry pertama, sementara Entry Zone 2 adalah zona entry alternatif jika price melewati zone pertama.
                                            </p>
                                            <div className="bg-[var(--bg-primary)]/50 dark:bg-gray-800/50 p-3 rounded-lg">
                                                <p className="text-xs text-[var(--text-secondary)] dark:text-slate-400">
                                                    <strong>Strategi:</strong> Wait for price action confirmation (candlestick pattern, support/resistance test) sebelum entry di zone ini.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Scalping Zones */}
                                <div className="p-5 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-xl border border-yellow-500/20 dark:border-yellow-800">
                                    <div className="flex items-start gap-3">
                                        <div className="w-3 h-3 bg-yellow-500 rounded-full mt-1"></div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-yellow-900 dark:text-yellow-300 text-lg mb-2">Scalping Zone A & B</h3>
                                            <p className="text-sm text-[var(--text-primary)] dark:text-gray-300 mb-3">
                                                Zone reversal yang kuat, sering digunakan untuk scalping atau swing trading. Zone ini menandakan area di mana price kemungkinan besar akan mengalami reversal atau pullback signifikan.
                                            </p>
                                            <div className="bg-[var(--bg-primary)]/50 dark:bg-gray-800/50 p-3 rounded-lg">
                                                <p className="text-xs text-[var(--text-secondary)] dark:text-slate-400">
                                                    <strong>Strategi:</strong> Ideal untuk counter-trend entry atau taking profit jika sudah dalam posisi. Watch for rejection candlestick patterns.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Breakout Zones */}
                                <div className="p-5 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                                    <div className="flex items-start gap-3">
                                        <div className="w-3 h-3 bg-orange-500 rounded-full mt-1"></div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-orange-900 dark:text-orange-300 text-lg mb-2">Breakout Zone 1 & 2</h3>
                                            <p className="text-sm text-[var(--text-primary)] dark:text-gray-300 mb-3">
                                                Zone di mana price kemungkinan melakukan breakout atau pullback setelah melewati swing point. Zone ini penting untuk monitoring continuation atau reversal pattern.
                                            </p>
                                            <div className="bg-[var(--bg-primary)]/50 dark:bg-gray-800/50 p-3 rounded-lg">
                                                <p className="text-xs text-[var(--text-secondary)] dark:text-slate-400">
                                                    <strong>Strategi:</strong> Watch for volume confirmation saat breakout. Jika breakout gagal (false breakout), ini bisa menjadi signal reversal yang kuat.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Take Profit Levels */}
                                <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-500/20 dark:border-blue-800">
                                    <div className="flex items-start gap-3">
                                        <div className="w-3 h-3 bg-blue-600 rounded-full mt-1"></div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-blue-900 dark:text-blue-300 text-lg mb-2">Golden Ratio, Confluence & Moon Target</h3>
                                            <p className="text-sm text-[var(--text-primary)] dark:text-gray-300 mb-3">
                                                Tiga level Take Profit utama. <strong>Golden Ratio (TP1)</strong> adalah target pertama dengan probabilitas tertinggi, <strong>Confluence (TP2)</strong> adalah target kedua untuk extension move, dan <strong>Moon Target (TP3)</strong> adalah target maksimal untuk momentum ekstrim.
                                            </p>
                                            <div className="bg-[var(--bg-primary)]/50 dark:bg-gray-800/50 p-3 rounded-lg">
                                                <p className="text-xs text-[var(--text-secondary)] dark:text-slate-400">
                                                    <strong>Strategi:</strong> Close sebagian position di TP1 (50%), sebagian di TP2 (30%), dan sisanya target TP3. Move stop loss ke breakeven setelah TP1 tercapai.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Trend Direction */}
                                <div className="p-5 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-500/20 dark:border-green-800">
                                    <div className="flex items-start gap-3">
                                        <div className="w-3 h-3 bg-green-600 rounded-full mt-1"></div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-green-900 dark:text-green-300 text-lg mb-2">Bullish vs Bearish Trend</h3>
                                            <p className="text-sm text-[var(--text-primary)] dark:text-gray-300 mb-3">
                                                <strong>Bullish (📈):</strong> Trend naik, level dihitung dari Low ke High, mencari buy opportunity.<br />
                                                <strong>Bearish (📉):</strong> Trend turun, level dihitung dari High ke Low, mencari sell opportunity.
                                            </p>
                                            <div className="bg-[var(--bg-primary)]/50 dark:bg-gray-800/50 p-3 rounded-lg">
                                                <p className="text-xs text-[var(--text-secondary)] dark:text-slate-400">
                                                    <strong>Tip:</strong> Identifikasi trend dengan higher highs & higher lows (bullish) atau lower highs & lower lows (bearish). Gunakan timeframe lebih tinggi untuk trend confirmation.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Risk Reward Ratio */}
                                <div className="p-5 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-500/20 dark:border-purple-800">
                                    <div className="flex items-start gap-3">
                                        <div className="w-3 h-3 bg-purple-600 rounded-full mt-1"></div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-purple-900 dark:text-purple-300 text-lg mb-2">Risk/Reward Ratio</h3>
                                            <p className="text-sm text-[var(--text-primary)] dark:text-gray-300 mb-3">
                                                Perbandingan antara potential profit (reward) dengan potential loss (risk). Ratio 1:2 berarti jika risk Anda 100 pips, target profit minimal 200 pips.
                                            </p>
                                            <div className="bg-[var(--bg-primary)]/50 dark:bg-gray-800/50 p-3 rounded-lg">
                                                <p className="text-xs text-[var(--text-secondary)] dark:text-slate-400">
                                                    <strong>Rule:</strong> Minimum R:R adalah 1:2. Dengan R:R 1:2 dan win rate 40%, Anda masih profitable. R:R 1:3 atau lebih tinggi adalah excellent.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* AI Auto-Detect */}
                                <div className="p-5 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-xl border border-indigo-500/20 dark:border-indigo-800">
                                    <div className="flex items-start gap-3">
                                        <div className="w-3 h-3 bg-indigo-600 rounded-full mt-1"></div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-indigo-900 dark:text-indigo-300 text-lg mb-2">🤖 AI Auto-Detect</h3>
                                            <p className="text-sm text-[var(--text-primary)] dark:text-gray-300 mb-3">
                                                Fitur AI yang secara otomatis mendeteksi Swing High dan Swing Low terbaru dari chart, serta menentukan trend direction. AI melakukan scan setiap 60 detik untuk update level secara real-time.
                                            </p>
                                            <div className="bg-[var(--bg-primary)]/50 dark:bg-gray-800/50 p-3 rounded-lg">
                                                <p className="text-xs text-[var(--text-secondary)] dark:text-slate-400">
                                                    <strong>Best Use:</strong> Ideal untuk trending market. Di ranging market, manual input mungkin lebih akurat. Toggle ON untuk monitoring real-time, OFF untuk analisa manual.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* DISCLAIMER */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="bg-[var(--bg-secondary)] dark:bg-gray-800/50 rounded-2xl p-6 border border-[var(--border-light)] dark:border-gray-700"
                        >
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">⚠️</span>
                                <div>
                                    <h3 className="font-bold text-[var(--text-primary)] dark:text-white mb-2">Disclaimer</h3>
                                    <p className="text-sm text-[var(--text-secondary)] dark:text-slate-400">
                                        Fibonacci Kanji adalah tools analisa teknikal. Hasil analisa bukan merupakan rekomendasi trading atau jaminan profit.
                                        Selalu lakukan analisa fundamental, gunakan proper risk management, dan trading sesuai dengan risk tolerance Anda.
                                        Past performance tidak menjamin future results.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                </PremiumGuard>
            </div>
        </div>
    );
}
