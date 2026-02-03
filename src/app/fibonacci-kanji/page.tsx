'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PremiumGuard from '@/components/layout/PremiumGuard';
import { useTranslations } from 'next-intl';
import KanjiAnalysisChart from '@/components/kanji/KanjiAnalysisChart';

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

type ViewMode = 'tradingview' | 'analysis';

export default function FibonacciKanjiPage() {
    const t = useTranslations('kanji');

    // State
    const [viewMode, setViewMode] = useState<ViewMode>('tradingview');
    const [trend, setTrend] = useState<'UP' | 'DOWN'>('DOWN'); // New Trend State
    const [highPrice, setHighPrice] = useState<string>('');
    const [lowPrice, setLowPrice] = useState<string>('');
    const [calculatedLevels, setCalculatedLevels] = useState<any[]>([]);
    const [selectedPair, setSelectedPair] = useState('XAUUSD');
    const [widgetSymbol, setWidgetSymbol] = useState('OANDA:XAUUSD');

    // AI Scanner State
    const [isAutoScan, setIsAutoScan] = useState(false);
    const [isScanning, setIsScanning] = useState(false);

    // Handle Pair Change
    const handlePairChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const pair = e.target.value;
        setSelectedPair(pair);

        // Map to TV Symbols
        const symbolMap: any = {
            'XAUUSD': 'OANDA:XAUUSD', 'XAGUSD': 'OANDA:XAGUSD',
            'BTCUSD': 'BINANCE:BTCUSDT', 'ETHUSD': 'BINANCE:ETHUSDT',
            'EURUSD': 'FX:EURUSD', 'GBPUSD': 'FX:GBPUSD', 'USDJPY': 'FX:USDJPY',
            'US30': 'BLACKBULL:US30', 'US500': 'BLACKBULL:US500', 'USTEC': 'BLACKBULL:US100'
        };
        setWidgetSymbol(symbolMap[pair] || 'OANDA:XAUUSD');
    };

    // --- CALCULATION LOGIC ---
    const calculateKanjiInternal = useCallback((hStr: string, lStr: string, currentTrend: 'UP' | 'DOWN') => {
        const cleanH = hStr.replace(/,/g, '.');
        const cleanL = lStr.replace(/,/g, '.');
        const h = parseFloat(cleanH);
        const l = parseFloat(cleanL);
        if (isNaN(h) || isNaN(l)) return;

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
        // Switch to analysis mode on manual calc if not already
        if (viewMode !== 'analysis') {
            setViewMode('analysis');
        }
    };

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

                        calculateKanjiInternal(high.toString(), low.toString(), newTrend);
                        // Optional: Auto switch to analysis? Maybe too intrusive.
                        // setViewMode('analysis'); 
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
    }, [isAutoScan, selectedPair, calculateKanjiInternal]);

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

                            {/* View Toggle */}
                            <div className="bg-gray-900 border-b border-gray-800 p-2 flex justify-between items-center px-4">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setViewMode('tradingview')}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${viewMode === 'tradingview' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                                    >
                                        <span>📺 TV Widget</span>
                                    </button>
                                    <button
                                        onClick={() => setViewMode('analysis')}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${viewMode === 'analysis' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                                    >
                                        <span>🎯 Analysis Visuals</span>
                                        {calculatedLevels.length > 0 && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>}
                                    </button>
                                </div>
                                <div className="text-gray-500 text-[10px] font-mono">
                                    {selectedPair} • {viewMode === 'analysis' ? 'KANJI DATA FEED' : 'TRADINGVIEW FEED'}
                                </div>
                            </div>

                            {/* Chart Content */}
                            <div className="flex-1 relative w-full h-full">
                                {viewMode === 'tradingview' && (
                                    <div className="tradingview-widget-container w-full h-full">
                                        <iframe
                                            className="w-full h-full"
                                            src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_widget&symbol=${widgetSymbol}&interval=60&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=[]&theme=dark&style=1&timezone=Asia%2FJakarta&withdateranges=1&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=en&utm_source=localhost&utm_medium=widget&utm_campaign=chart&utm_term=${widgetSymbol}`}
                                            allowFullScreen
                                        ></iframe>
                                    </div>
                                )}

                                {/* Using hidden class instead of unmount to preserve state/load? No, remounting ensures correct sizing. */}
                                {viewMode === 'analysis' && (
                                    <div className="w-full h-full">
                                        <KanjiAnalysisChart
                                            pair={selectedPair}
                                            levels={calculatedLevels}
                                            onPriceClick={handleChartClick}
                                        />
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

                                {/* Results Table */}
                                {calculatedLevels.length > 0 && (
                                    <div className="w-full pb-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-xs font-bold text-gray-400 uppercase">Kanji Levels</h3>
                                            {viewMode === 'analysis' && <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">Lines Active</span>}
                                        </div>
                                        <table className="w-full text-xs">
                                            <tbody className="divide-y divide-gray-50 border-t border-gray-100">
                                                {calculatedLevels.map((lvl) => (
                                                    <tr key={lvl.level} className="group hover:bg-gray-50 transition cursor-default">
                                                        <td className="py-2.5 pl-1">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: lvl.color }}></div>
                                                                <div>
                                                                    <div className="font-bold text-gray-700">{lvl.label}</div>
                                                                    <div className="text-[9px] text-gray-400">{lvl.desc}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-2.5 text-right font-mono font-medium text-gray-900 group-hover:text-blue-600 pr-1">
                                                            {lvl.price}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
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
