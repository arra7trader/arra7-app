'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import PremiumGuard from '@/components/layout/PremiumGuard';
import { useTranslations } from 'next-intl';
import { createChart, ColorType, ISeriesApi, IChartApi, CandlestickSeries } from 'lightweight-charts';

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

    // Chart Refs
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const [priceLines, setPriceLines] = useState<any[]>([]);

    // State
    const [highPrice, setHighPrice] = useState<string>('');
    const [lowPrice, setLowPrice] = useState<string>('');
    const [calculatedLevels, setCalculatedLevels] = useState<any[]>([]);
    const [selectedPair, setSelectedPair] = useState('XAUUSD');
    const [isLoading, setIsLoading] = useState(false);

    // AI Scanner State
    const [isAutoScan, setIsAutoScan] = useState(false);
    const [isScanning, setIsScanning] = useState(false);

    // --- CHART INITIALIZATION ---
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#000000' }, // Dark Background
                textColor: '#d1d4dc',
            },
            width: chartContainerRef.current.clientWidth,
            height: 600, // Matches container
            grid: {
                vertLines: { color: 'rgba(42, 46, 57, 0.2)' },
                horzLines: { color: 'rgba(42, 46, 57, 0.2)' },
            },
            rightPriceScale: {
                borderColor: 'rgba(197, 203, 206, 0.8)',
            },
            timeScale: {
                borderColor: 'rgba(197, 203, 206, 0.8)',
                timeVisible: true,
            },
            crosshair: {
                mode: 1,
            },
        });

        const series = chart.addSeries(CandlestickSeries, {
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });

        chartRef.current = chart;
        candleSeriesRef.current = series;

        // Resize Handler
        const handleResize = () => {
            chart.applyOptions({ width: chartContainerRef.current?.clientWidth || 0 });
        };
        window.addEventListener('resize', handleResize);

        // Click to set High/Low (Interactive Mode)
        chart.subscribeClick((param) => {
            if (!param.point || !series) return;
            const price = series.coordinateToPrice(param.point.y);
            if (price) {
                // Simple toggle logic: Fill High if empty, else Low
                if (!highPrice || (highPrice && lowPrice)) {
                    setHighPrice(price.toFixed(price > 50 ? 2 : 5));
                    setLowPrice(''); // Reset low to force input
                } else {
                    setLowPrice(price.toFixed(price > 50 ? 2 : 5));
                }
            }
        });

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, []); // eslint-disable-line

    // --- DATA FALLBACK LOGIC ---
    const generateFallbackData = (basePrice: number) => {
        const data = [];
        let time = Math.floor(Date.now() / 1000) - (100 * 3600);
        let value = basePrice;
        for (let i = 0; i < 200; i++) {
            const volatility = basePrice * 0.002;
            const change = (Math.random() - 0.5) * volatility;
            const open = value;
            const close = open + change;
            const high = Math.max(open, close) + Math.random() * volatility * 0.2;
            const low = Math.min(open, close) - Math.random() * volatility * 0.2;
            data.push({ time: time as any, open, high, low, close });
            value = close;
            time += 3600;
        }
        return data;
    };

    // --- API FETCHING ---
    useEffect(() => {
        const fetchData = async () => {
            if (!candleSeriesRef.current) return;
            setIsLoading(true);
            try {
                const res = await fetch(`/api/market?pair=${selectedPair}&timeframe=1h`);
                let success = false;
                let candles = [];

                if (res.ok) {
                    const json = await res.json();
                    if (json.status === 'success' && json.data.candles?.length > 0) {
                        candles = json.data.candles.map((c: any) => ({
                            time: new Date(c.time).getTime() / 1000 as any,
                            open: c.open, high: c.high, low: c.low, close: c.close
                        })).sort((a: any, b: any) => a.time - b.time);
                        success = true;
                    }
                }

                if (!success || candles.length === 0) {
                    console.warn("Using Fallback Data");
                    let basePrice = 2000;
                    if (selectedPair.includes('JPY')) basePrice = 150;
                    else if (selectedPair.includes('BTC')) basePrice = 90000;
                    else if (selectedPair.includes('EUR')) basePrice = 1.05;
                    candles = generateFallbackData(basePrice);
                }

                candleSeriesRef.current.setData(candles);
                chartRef.current?.timeScale().fitContent();

            } catch (err) {
                console.error("Fetch error, fallback", err);
                const fallback = generateFallbackData(2000);
                candleSeriesRef.current.setData(fallback);
                chartRef.current?.timeScale().fitContent();
            } finally {
                setIsLoading(false);
                clearLines();
                setHighPrice('');
                setLowPrice('');
                setCalculatedLevels([]);
            }
        };
        fetchData();
    }, [selectedPair]);

    // --- DRAWING LOGIC ---
    const clearLines = () => {
        if (!candleSeriesRef.current) return;
        priceLines.forEach(l => candleSeriesRef.current?.removePriceLine(l));
        setPriceLines([]);
    };

    const drawLines = (levels: any[]) => {
        if (!candleSeriesRef.current) return;
        clearLines(); // Clear existing

        const newLines: any[] = [];
        levels.forEach(lvl => {
            const line = candleSeriesRef.current?.createPriceLine({
                price: parseFloat(lvl.price),
                color: lvl.color,
                lineWidth: lvl.width || 1,
                lineStyle: lvl.style || 1, // Solid
                axisLabelVisible: true,
                title: lvl.label,
            });
            newLines.push(line);
        });
        setPriceLines(newLines);
    };

    // --- CALCULATION LOGIC ---
    const calculateKanjiInternal = useCallback((hStr: string, lStr: string) => {
        const cleanH = hStr.replace(/,/g, '.');
        const cleanL = lStr.replace(/,/g, '.');
        const h = parseFloat(cleanH);
        const l = parseFloat(cleanL);
        if (isNaN(h) || isNaN(l)) return;

        const range = Math.abs(h - l);
        const levels = KANJI_LEVELS.map(k => {
            let finalPrice = 0;
            // Standard Logic: Projection
            if (h > l) {
                finalPrice = h - (range * k.level);
            } else {
                finalPrice = h - ((h - l) * k.level);
            }

            const isIndo = selectedPair === 'USDIDR';
            const decimals = (finalPrice > 1000 && !isIndo) ? 2 : (finalPrice > 50 ? 2 : 5);
            return { ...k, price: finalPrice.toFixed(decimals) };
        });

        setCalculatedLevels(levels);
        drawLines(levels); // DRAW ON CHART
    }, [selectedPair]); // eslint-disable-line

    const calculateKanji = () => {
        calculateKanjiInternal(highPrice, lowPrice);
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
                    const { high, low } = json.data;
                    if (high && low) {
                        setHighPrice(high.toString());
                        setLowPrice(low.toString());
                        calculateKanjiInternal(high.toString(), low.toString());
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


    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pt-24 pb-12">
            <div className="container-fluid mx-auto px-4 max-w-[1900px]">
                <PremiumGuard title={t('title')} description={t('desc')}>
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[85vh] min-h-[700px]">

                        {/* CHART AREA */}
                        <div className="lg:col-span-3 bg-black rounded-3xl overflow-hidden shadow-2xl border border-gray-800 relative group">
                            {isLoading && (
                                <div className="absolute inset-0 bg-black/80 z-20 flex flex-col items-center justify-center backdrop-blur-sm">
                                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                    <div className="text-gray-400 font-medium animate-pulse">Fetching Market Data...</div>
                                </div>
                            )}
                            <div ref={chartContainerRef} className="w-full h-full cursor-crosshair" />

                            {/* Tools Overlay */}
                            <div className="absolute top-4 left-4 flex gap-2">
                                <div className="bg-black/60 text-gray-300 text-xs px-3 py-1.5 rounded-lg backdrop-blur border border-white/10 flex items-center gap-2">
                                    <span>📍 Click chart to set High/Low</span>
                                </div>
                            </div>

                            <div className="absolute bottom-4 left-4 text-[80px] font-black text-white/5 pointer-events-none select-none">
                                KANJI
                            </div>
                        </div>

                        {/* CONTROLS */}
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
                                        onChange={(e) => setSelectedPair(e.target.value)}
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

                                {/* Inputs */}
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-red-500 uppercase mb-1">Swing High</label>
                                        <input
                                            type="text"
                                            value={highPrice}
                                            onChange={(e) => setHighPrice(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full p-2.5 bg-red-50 border border-red-100 rounded-lg font-mono text-sm text-gray-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-green-500 uppercase mb-1">Swing Low</label>
                                        <input
                                            type="text"
                                            value={lowPrice}
                                            onChange={(e) => setLowPrice(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full p-2.5 bg-green-50 border border-green-100 rounded-lg font-mono text-sm text-gray-900 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
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
                                {calculatedLevels.length > 0 ? (
                                    <div className="w-full pb-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-xs font-bold text-gray-400 uppercase">Kanji Levels</h3>
                                            <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">Live on Chart</span>
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
                                ) : (
                                    <div className="py-10 text-center border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                                        <span className="text-3xl block mb-2 opacity-50">📉</span>
                                        <p className="font-medium text-xs text-gray-400">Chart Waiting for Input...</p>
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
