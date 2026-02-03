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
    loading: () => <div className="animate-pulse bg-gray-100 rounded-xl h-96"></div>
}) as React.ComponentType<any>;

const TradeWizard = dynamic(() => import('@/components/TradeWizard'), {
    ssr: false,
    loading: () => <div className="animate-pulse bg-gray-100 rounded-xl h-96"></div>
}) as React.ComponentType<any>;

// KANJI LEVELS CONFIGURATION
const KANJI_LEVELS = [
    { level: 0, label: 'Swing High (Stop Loss)', color: '#ef5350', desc: 'Starting Point', width: 2 },
    { level: 1, label: 'Swing Low', color: '#78909c', desc: 'Ending Point', width: 2 },
    // Scalping Zone
    { level: 0.559, label: 'Entry Zone 1 (0.559)', color: '#26a69a', desc: 'Scalping Entry', width: 1 },
    { level: 0.619, label: 'Entry Zone 1 (0.619)', color: '#26a69a', desc: 'Scalping Entry', width: 1 },
    // Scalping
    { level: 0.786, label: 'Scalping Zone (0.786)', color: '#fbc02d', desc: 'Reversal Zone', width: 1, style: 2 },
    { level: 0.882, label: 'Scalping Zone (0.882)', color: '#fbc02d', desc: 'Reversal Zone', width: 1, style: 2 },
    // Pullback / Break
    { level: 1.124, label: 'Breakout / Pullback (1.124)', color: '#ff9800', desc: 'Watch for Break', width: 1 },
    { level: 1.272, label: 'Breakout / Pullback (1.272)', color: '#ff9800', desc: 'Watch for Break', width: 1 },
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
                if (data.status === 'success' && data.currentPrice) {
                    setCurrentPrice(data.currentPrice);
                }
            } catch (err) {
                console.error('Failed to fetch current price:', err);
            }
        };

        fetchCurrentPrice();
        const interval = setInterval(fetchCurrentPrice, 10000); // Update every 10s
        return () => clearInterval(interval);
    }, [selectedPair, timeframe]);

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
        <div className="min-h-screen bg-[var(--bg-primary)] pt-24 pb-12">
            <div className="container-fluid mx-auto px-4 max-w-[1900px]">
                <PremiumGuard title={t('title')} description={t('desc')}>
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
                                    <div className="text-gray-500 text-[10px] font-mono">
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
                                            <p className="text-gray-400 text-sm mb-2">Calculate Fibonacci Levels</p>
                                            <p className="text-gray-600 text-xs">Enter High/Low prices or enable AI Auto-Detect</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* SIDEBAR CONTROLS */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="lg:col-span-1 bg-white rounded-3xl p-6 shadow-xl border border-gray-100 flex flex-col h-full overflow-hidden"
                        >
                            <div className="mb-4 flex-shrink-0">
                                <h2 className="text-2xl font-bold text-gray-900 mb-1">🧮 Kanji Pro</h2>
                                <p className="text-gray-500 text-xs">AI-Powered Fibonacci Levels</p>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                                {/* Auto Scan Toggle */}
                                <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-2 rounded-lg bg-white shadow-sm ${isScanning ? 'animate-pulse' : ''}`}>
                                            <span className="text-xl">🤖</span>
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-indigo-900">AI Auto-Detect</div>
                                            <div className="text-[10px] text-indigo-600">Auto Scan every 60s</div>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isAutoScan}
                                            onChange={(e) => setIsAutoScan(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>

                                {/* Pair Selector */}
                                <div className="mb-4 space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Asset Pair</label>
                                    <select
                                        value={selectedPair}
                                        onChange={handlePairChange}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 text-sm outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer hover:bg-gray-100 transition"
                                    >
                                        <optgroup label="Commodities">
                                            <option value="XAUUSD">Gold (XAUUSD)</option>
                                            <option value="XAGUSD">Silver (XAGUSD)</option>
                                        </optgroup>
                                        <optgroup label="Indices">
                                            <option value="US30">US30 (Dow Jones)</option>
                                            <option value="US500">US500 (S&P 500)</option>
                                            <option value="USTEC">Nasdaq (USTEC)</option>
                                        </optgroup>
                                        <optgroup label="Forex">
                                            <option value="EURUSD">EURUSD</option>
                                            <option value="GBPUSD">GBPUSD</option>
                                            <option value="USDJPY">USDJPY</option>
                                        </optgroup>
                                        <optgroup label="Crypto">
                                            <option value="BTCUSD">Bitcoin</option>
                                            <option value="ETHUSD">Ethereum</option>
                                        </optgroup>
                                    </select>
                                </div>

                                {/* TREND SELECTOR (NEW) */}
                                <div className="mb-4">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Trend Direction</label>
                                    <div className="flex bg-gray-100 p-1 rounded-xl">
                                        <button
                                            onClick={() => setTrend('UP')}
                                            className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition ${trend === 'UP' ? 'bg-green-500 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            <span>📈 Bullish</span>
                                        </button>
                                        <button
                                            onClick={() => setTrend('DOWN')}
                                            className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition ${trend === 'DOWN' ? 'bg-red-500 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            <span>📉 Bearish</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Inputs */}
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                                            {trend === 'UP' ? 'Swing Low (Start)' : 'Swing High (Start)'}
                                        </label>
                                        <input
                                            type="text"
                                            value={trend === 'UP' ? lowPrice : highPrice}
                                            onChange={(e) => trend === 'UP' ? setLowPrice(e.target.value) : setHighPrice(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                                            {trend === 'UP' ? 'Swing High (End)' : 'Swing Low (End)'}
                                        </label>
                                        <input
                                            type="text"
                                            value={trend === 'UP' ? highPrice : lowPrice}
                                            onChange={(e) => trend === 'UP' ? setHighPrice(e.target.value) : setLowPrice(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                                        <div className={`mb-3 p-3 rounded-xl flex items-center gap-3 ${trend === 'UP' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                                            <div className={`text-2xl ${trend === 'UP' ? 'animate-bounce' : ''}`}>
                                                {trend === 'UP' ? '📈' : '📉'}
                                            </div>
                                            <div>
                                                <div className={`font-bold text-sm ${trend === 'UP' ? 'text-green-700' : 'text-red-700'}`}>
                                                    {trend === 'UP' ? 'BULLISH TREND' : 'BEARISH TREND'}
                                                </div>
                                                <div className="text-[10px] text-gray-500">
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
                                            <h3 className="text-xs font-bold text-gray-400 uppercase">Kanji Levels</h3>
                                        </div>

                                        {/* Interactive Table */}
                                        <table className="w-full text-xs">
                                            <tbody className="divide-y divide-gray-50 border-t border-gray-100">
                                                {calculatedLevels.map((lvl) => {
                                                    const levelPrice = parseFloat(lvl.price);
                                                    const distance = currentPrice ? Math.abs(currentPrice - levelPrice) : null;
                                                    const isAbove = currentPrice ? currentPrice > levelPrice : false;
                                                    const isNear = distance && currentPrice ? (distance / currentPrice) < 0.002 : false;

                                                    let status = '⚪ PENDING';
                                                    let statusColor = 'text-gray-400';
                                                    if (currentPrice) {
                                                        const percentDiff = Math.abs(currentPrice - levelPrice) / currentPrice;
                                                        if (percentDiff < 0.001) {
                                                            status = '🟢 ACTIVE';
                                                            statusColor = 'text-green-600';
                                                        } else if (
                                                            (trend === 'UP' && currentPrice > levelPrice) ||
                                                            (trend === 'DOWN' && currentPrice < levelPrice)
                                                        ) {
                                                            status = '🔴 BREACHED';
                                                            statusColor = 'text-red-600';
                                                        }
                                                    }

                                                    return (
                                                        <tr
                                                            key={lvl.level}
                                                            className={`group hover:bg-blue-50 transition cursor-pointer ${isNear ? 'bg-yellow-50' : ''}`}
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(lvl.price);
                                                                const el = document.getElementById(`price-${lvl.level}`);
                                                                if (el) {
                                                                    el.classList.add('text-green-600', 'scale-110');
                                                                    setTimeout(() => el.classList.remove('text-green-600', 'scale-110'), 300);
                                                                }
                                                            }}
                                                            title="Click to copy price"
                                                        >
                                                            <td className="py-2.5 pl-1">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: lvl.color }}></div>
                                                                    <div className="flex-1">
                                                                        <div className="font-bold text-gray-700 group-hover:text-blue-700">{lvl.label}</div>
                                                                        <div className="text-[9px] text-gray-400">{lvl.desc}</div>
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
                                                                        className="font-mono font-medium text-gray-900 group-hover:text-blue-600 transition-all duration-150"
                                                                    >
                                                                        {lvl.price}
                                                                    </span>
                                                                    {distance !== null && (
                                                                        <span className={`text-[8px] font-bold ${isNear ? 'text-orange-600' : 'text-gray-400'}`}>
                                                                            {isAbove ? '↑' : '↓'} {distance.toFixed(2)} pips
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="text-gray-400 ml-1 opacity-0 group-hover:opacity-100 transition text-[10px]">📋</span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>

                                        {/* Auto Trade Setup Generator */}
                                        {calculatedLevels.length > 0 && currentPrice && (
                                            <div className="mt-4 p-4 bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-xl">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className="text-lg">🎯</span>
                                                    <h3 className="text-sm font-bold text-indigo-900">Smart Trade Setup</h3>
                                                </div>

                                                {(() => {
                                                    // Find Entry Zone (0.559)
                                                    const entryZone = calculatedLevels.find(l => l.level === 0.559);
                                                    // Find TP zones
                                                    const tp1 = calculatedLevels.find(l => l.level === 1.618); // Golden Ratio
                                                    const tp2 = calculatedLevels.find(l => l.level === 2.0); // Confluence
                                                    const tp3 = calculatedLevels.find(l => l.level === 2.618); // Moon Target
                                                    // Find SL zone (below entry)
                                                    const slZone = calculatedLevels.find(l => l.level === 0.382);

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
                                                                <div className="bg-white p-2 rounded-lg">
                                                                    <div className="text-[9px] text-gray-500 font-bold mb-1">ENTRY</div>
                                                                    <div className="font-mono font-bold text-indigo-700">{entry.toFixed(2)}</div>
                                                                    <div className="text-[8px] text-gray-400">{entryZone.label}</div>
                                                                </div>
                                                                <div className="bg-white p-2 rounded-lg">
                                                                    <div className="text-[9px] text-gray-500 font-bold mb-1">STOP LOSS</div>
                                                                    <div className="font-mono font-bold text-red-600">{stopLoss.toFixed(2)}</div>
                                                                    <div className="text-[8px] text-gray-400">-{risk.toFixed(2)} pips</div>
                                                                </div>
                                                            </div>

                                                            <div className="bg-white p-2 rounded-lg">
                                                                <div className="text-[9px] text-gray-500 font-bold mb-1">TAKE PROFIT LEVELS</div>
                                                                <div className="space-y-1">
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-[9px] text-gray-600">TP1 (Golden):</span>
                                                                        <span className="font-mono font-bold text-green-600">{takeProfit1.toFixed(2)}</span>
                                                                    </div>
                                                                    {takeProfit2 && (
                                                                        <div className="flex justify-between items-center">
                                                                            <span className="text-[9px] text-gray-600">TP2 (Conf):</span>
                                                                            <span className="font-mono font-bold text-green-600">{takeProfit2.toFixed(2)}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className={`p-2 rounded-lg ${rr >= 2 ? 'bg-green-100 border border-green-300' : 'bg-yellow-100 border border-yellow-300'}`}>
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-[9px] font-bold text-gray-700">Risk/Reward:</span>
                                                                    <span className={`font-bold ${rr >= 2 ? 'text-green-700' : 'text-yellow-700'}`}>
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
                                                className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 transition"
                                            >
                                                <span>📋</span> Copy All
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                    </div>
                </PremiumGuard>
            </div>
        </div>
    );
}
