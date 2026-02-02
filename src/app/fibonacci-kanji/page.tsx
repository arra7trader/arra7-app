'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import PremiumGuard from '@/components/layout/PremiumGuard';
import { useTranslations } from 'next-intl';

// KANJI LEVELS CONFIGURATION
const KANJI_LEVELS = [
    { level: 0, label: 'Swing High (Stop Loss)', color: 'text-red-500', desc: 'Starting Point' },
    { level: 1, label: 'Swing Low', color: 'text-gray-500', desc: 'Ending Point' },
    // Scalping Zone
    { level: 0.559, label: 'Entry Zone 1', color: 'text-green-600', desc: 'Scalping Entry (0.559)' },
    { level: 0.619, label: 'Entry Zone 1', color: 'text-green-600', desc: 'Scalping Entry (0.619)' },
    // Scalping
    { level: 0.786, label: 'Scalping Zone', color: 'text-yellow-600', desc: 'Reversal Zone (0.786)' },
    { level: 0.882, label: 'Scalping Zone', color: 'text-yellow-600', desc: 'Reversal Zone (0.882)' },
    // Pullback / Break
    { level: 1.124, label: 'Breakout / Pullback', color: 'text-orange-500', desc: 'Watch for Break (1.124)' },
    { level: 1.272, label: 'Breakout / Pullback', color: 'text-orange-500', desc: 'Watch for Break (1.272)' },
    // Zone Entry 2
    { level: 1.618, label: 'GOLDEN RATIO (TP 1)', color: 'text-blue-600 font-bold', desc: 'Golden Target (1.618)' },
    { level: 2.0, label: 'Confluence (TP 2)', color: 'text-purple-600', desc: 'Major Extension (2.0)' },
    { level: 2.618, label: 'Moon Target (TP 3)', color: 'text-indigo-800', desc: 'Final Target (2.618)' },
];

export default function FibonacciKanjiPage() {
    const t = useTranslations('kanji');

    // Calculator State
    const [highPrice, setHighPrice] = useState<string>('');
    const [lowPrice, setLowPrice] = useState<string>('');
    const [calculatedLevels, setCalculatedLevels] = useState<any[]>([]);

    // Determine Pair for Widget
    const [selectedPair, setSelectedPair] = useState('XAUUSD');
    const [widgetSymbol, setWidgetSymbol] = useState('OANDA:XAUUSD');

    // Handle Pair Change
    const handlePairChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const pair = e.target.value;
        setSelectedPair(pair);

        // Map to TV Symbols
        const symbolMap: any = {
            'XAUUSD': 'OANDA:XAUUSD',
            'XAGUSD': 'OANDA:XAGUSD',
            'BTCUSD': 'BINANCE:BTCUSDT',
            'ETHUSD': 'BINANCE:ETHUSDT',
            'EURUSD': 'FX:EURUSD',
            'GBPUSD': 'FX:GBPUSD',
            'USDJPY': 'FX:USDJPY',
            'US30': 'BLACKBULL:US30',
            'US500': 'BLACKBULL:US500',
            'USTEC': 'BLACKBULL:US100'
        };
        setWidgetSymbol(symbolMap[pair] || 'OANDA:XAUUSD');
    };

    // AI Scanner State
    const [isAutoScan, setIsAutoScan] = useState(false);
    const [isScanning, setIsScanning] = useState(false);

    // AI Scanner Effect
    useEffect(() => {
        let interval: NodeJS.Timeout;

        const scanMarket = async () => {
            if (!isAutoScan) return;
            setIsScanning(true);
            try {
                const res = await fetch(`/api/kanji/detect?pair=${selectedPair}&timeframe=1h`);
                const json = await res.json();

                if (json.status === 'success' && json.data) {
                    const { high, low } = json.data;

                    // Only update if different to avoid jitter?
                    // Or just force update.
                    setHighPrice(high.toString());
                    setLowPrice(low.toString());

                    // Auto Calculate
                    // We need to call calculateKanji, but state updates (setHighPrice) are async.
                    // Better to clean and calc directly here or stick to useEffect dependency?
                    // Let's rely on a separate Effect or just call explicit calc function with params.

                    // Trigger manual click logic simulation or just reuse logic:
                    // Duplicating check logic for simplicity inside effect:
                    if (high && low) {
                        // wait for state update? No, use local vars
                        calculateKanjiInternal(high.toString(), low.toString());
                    }
                }
            } catch (e) {
                console.error("AI Scan failed", e);
            } finally {
                setIsScanning(false);
            }
        };

        if (isAutoScan) {
            scanMarket(); // Initial call
            interval = setInterval(scanMarket, 60000); // Poll every minute
        }

        return () => clearInterval(interval);
    }, [isAutoScan, selectedPair]);

    // Refactored Calc Logic to accept args
    const calculateKanjiInternal = (hStr: string, lStr: string) => {
        const cleanH = hStr.replace(/,/g, '.');
        const cleanL = lStr.replace(/,/g, '.');
        const h = parseFloat(cleanH);
        const l = parseFloat(cleanL);
        if (isNaN(h) || isNaN(l)) return;

        const range = Math.abs(h - l);
        const levels = KANJI_LEVELS.map(k => {
            let price = 0;
            if (h > l) {
                price = h - (range * k.level);
            } else {
                price = h - ((h - l) * k.level);
            }
            const isYen = selectedPair.includes('JPY');
            const isIndo = selectedPair === 'USDIDR';
            const decimals = (price > 1000 && !isIndo) ? 2 : (price > 50 ? 2 : 5);
            return { ...k, price: price.toFixed(decimals) };
        });
        setCalculatedLevels(levels);
    };

    const calculateKanji = () => {
        calculateKanjiInternal(highPrice, lowPrice);
    };

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pt-24 pb-12">
            <div className="container-fluid mx-auto px-4 max-w-[1800px]">
                <PremiumGuard
                    title={t('title')}
                    description={t('desc')}
                >
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[85vh] min-h-[700px]">

                        {/* LEFT: TradingView Widget */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="lg:col-span-3 bg-black rounded-3xl overflow-hidden shadow-2xl border border-gray-800 h-full"
                        >
                            {/* TradingView Widget Container */}
                            <div className="tradingview-widget-container w-full h-full">
                                <iframe
                                    className="w-full h-full"
                                    src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_widget&symbol=${widgetSymbol}&interval=60&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=[]&theme=dark&style=1&timezone=Asia%2FJakarta&withdateranges=1&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=en&utm_source=localhost&utm_medium=widget&utm_campaign=chart&utm_term=${widgetSymbol}`}
                                    allowFullScreen
                                ></iframe>
                            </div>
                        </motion.div>

                        {/* RIGHT: Kanji Calculator */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="lg:col-span-1 bg-white rounded-3xl p-6 shadow-xl border border-gray-100 flex flex-col h-full overflow-hidden"
                        >
                            <div className="mb-4 flex-shrink-0">
                                <h2 className="text-2xl font-bold text-gray-900 mb-1">🧮 Kanji Calculator</h2>
                                <p className="text-gray-500 text-xs">Input Swing High & Low from chart.</p>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                                {/* Auto Scan Toggle */}
                                <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xl ${isScanning ? 'animate-spin' : ''}`}>🤖</span>
                                        <div>
                                            <div className="text-sm font-bold text-gray-900">AI Auto-Detect</div>
                                            <div className="text-[10px] text-gray-500">Auto Swing Detection (1m)</div>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isAutoScan}
                                            onChange={(e) => setIsAutoScan(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                {/* Pair Selector - EXISTING */}
                                <div className="mb-4">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Select Pair</label>
                                    <select
                                        value={selectedPair}
                                        onChange={handlePairChange}
                                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg font-bold text-gray-800 text-sm outline-none focus:ring-2 focus:ring-blue-500"
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

                                {/* Inputs - EXISTING */}
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-red-500 uppercase mb-1">Swing High</label>
                                        <input
                                            type="text"
                                            value={highPrice}
                                            onChange={(e) => setHighPrice(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full p-2.5 bg-red-50 border border-red-100 rounded-lg font-mono text-sm text-gray-900 outline-none focus:border-red-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-green-500 uppercase mb-1">Swing Low</label>
                                        <input
                                            type="text"
                                            value={lowPrice}
                                            onChange={(e) => setLowPrice(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full p-2.5 bg-green-50 border border-green-100 rounded-lg font-mono text-sm text-gray-900 outline-none focus:border-green-500"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={calculateKanji}
                                    className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-bold shadow-md transition transform hover:scale-[1.01] active:scale-95 mb-4 text-sm"
                                >
                                    Calculate Levels 🚀
                                </button>

                                {/* Results Table - EXISTING */}
                                {calculatedLevels.length > 0 ? (
                                    <div className="w-full">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="text-left text-gray-400 border-b border-gray-100">
                                                    <th className="pb-2">Level</th>
                                                    <th className="pb-2 text-right">Price</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {calculatedLevels.map((lvl) => (
                                                    <tr key={lvl.level} className="group hover:bg-blue-50 transition">
                                                        <td className="py-2.5">
                                                            <div className={`font-bold ${lvl.color}`}>{lvl.label}</div>
                                                            <div className="text-[9px] text-gray-400">{lvl.desc}</div>
                                                        </td>
                                                        <td className="py-2.5 text-right font-mono font-medium text-gray-700 group-hover:text-blue-600">
                                                            {lvl.price}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="py-8 text-center text-gray-300">
                                        <span className="text-3xl block mb-2">🎌</span>
                                        <p className="font-medium text-xs">Enter coordinates to<br />reveal geometry.</p>
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
