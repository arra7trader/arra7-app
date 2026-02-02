'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PremiumGuard from '@/components/layout/PremiumGuard';
import { useTranslations } from 'next-intl';
import { createChart, ColorType, ISeriesApi, LineData, IChartApi, CandlestickSeries } from 'lightweight-charts';

// KANJI LEVELS CONFIGURATION
const KANJI_LEVELS = [
    { level: 0, label: 'Start (0.0)', color: '#000000', width: 2 },
    { level: 1, label: 'End (1.0)', color: '#000000', width: 2 },
    // Scalping Zone
    { level: 0.559, label: 'Zone Entry (0.559)', color: '#2ecc71', width: 1 },
    { level: 0.619, label: 'Zone Entry (0.619)', color: '#2ecc71', width: 1 },
    { level: 0.667, label: 'Zone Entry (0.667)', color: '#2ecc71', width: 1 },
    // Scalping
    { level: 0.786, label: 'Zone Scalping (0.786)', color: '#f1c40f', width: 1, style: 2 }, // Dashed
    { level: 0.882, label: 'Zone Scalping (0.882)', color: '#f1c40f', width: 1, style: 2 },
    // Pullback / Break
    { level: 1.124, label: 'Pullback/Break (1.124)', color: '#e74c3c', width: 1 },
    { level: 1.272, label: 'Pullback/Break (1.272)', color: '#e74c3c', width: 1 },
    // Zone Entry 2
    { level: 1.559, label: 'Zone Entry 2 (1.559)', color: '#3498db', width: 1 },
    { level: 1.618, label: 'GOLDEN RATIO (1.618)', color: '#e67e22', width: 3 }, // Highlight
    { level: 1.667, label: 'Zone Entry 2 (1.667)', color: '#3498db', width: 1 },
    // Confluence
    { level: 2.0, label: 'Confluence (2.0)', color: '#9b59b6', width: 2 },
    // Further Levels
    { level: 2.618, label: 'Target 3 (2.618)', color: '#34495e', width: 1 },
];

export default function FibonacciKanjiPage() {
    const t = useTranslations('kanji');
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

    const [selectedPair, setSelectedPair] = useState<string>('XAUUSD');
    const [isLoading, setIsLoading] = useState(false);
    const [startPrice, setStartPrice] = useState<number | null>(null);
    const [endPrice, setEndPrice] = useState<number | null>(null);
    const [isDrawing, setIsDrawing] = useState<'start' | 'end' | 'done'>('start');

    // List of pairs for dropdown
    const availablePairs = [
        { group: 'Commodities', pairs: ['XAUUSD', 'XAGUSD', 'XTIUSD'] },
        { group: 'Crypto', pairs: ['BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD'] },
        { group: 'Forex Major', pairs: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD'] },
        { group: 'Indices', pairs: ['US30', 'US500', 'USTEC', 'DE40'] },
    ];

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#ffffff' },
                textColor: '#1a1a1a',
            },
            width: chartContainerRef.current.clientWidth,
            height: 600,
            grid: {
                vertLines: { color: 'rgba(240, 240, 240, 1)' },
                horzLines: { color: 'rgba(240, 240, 240, 1)' },
            },
            rightPriceScale: {
                borderColor: 'rgba(197, 203, 206, 1)',
                visible: true,
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.1,
                },
            },
            timeScale: {
                borderColor: 'rgba(197, 203, 206, 1)',
                timeVisible: true,
                secondsVisible: false,
            },
            crosshair: {
                mode: 1, // CrosshairMode.Normal
            }
        });

        const series = chart.addSeries(CandlestickSeries, {
            upColor: '#089981',
            downColor: '#F23645',
            borderVisible: false,
            wickUpColor: '#089981',
            wickDownColor: '#F23645',
        });

        chartRef.current = chart;
        candleSeriesRef.current = series;

        // Click Handler for Drawing
        chart.subscribeClick((param) => {
            if (!param.point || !series) return;
            const price = series.coordinateToPrice(param.point.y);
            if (!price) return;

            setStartPrice(prevStart => {
                if (prevStart === null) {
                    setIsDrawing('end');
                    return price;
                }

                setEndPrice(prevEnd => {
                    if (prevEnd === null) {
                        setIsDrawing('done');
                        return price;
                    }
                    return prevEnd;
                });

                return prevStart;
            });
        });

        const handleResize = () => {
            chart.applyOptions({ width: chartContainerRef.current?.clientWidth || 0 });
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, []); // Init chart only once

    // Fetch Data Effect when Pair changes
    useEffect(() => {
        const fetchData = async () => {
            if (!candleSeriesRef.current) return;
            setIsLoading(true);

            try {
                // Fetch H1 data by default
                const res = await fetch(`/api/market?pair=${selectedPair}&timeframe=1h`);
                const json = await res.json();

                if (json.status === 'success' && json.data.candles) {
                    const candles = json.data.candles.map((c: any) => ({
                        time: new Date(c.time).getTime() / 1000 as any,
                        open: c.open,
                        high: c.high,
                        low: c.low,
                        close: c.close,
                    }));

                    // Sort by time
                    candles.sort((a: any, b: any) => a.time - b.time);

                    candleSeriesRef.current.setData(candles);
                    chartRef.current?.timeScale().fitContent();

                    // Add watermark-like text?
                }
            } catch (error) {
                console.error('Failed to fetch pair data', error);
            } finally {
                setIsLoading(false);
                // Reset drawing
                setStartPrice(null);
                setEndPrice(null);
                setIsDrawing('start');

                // Clear lines hack: re-render or remove lines?
                // For now, new lines will be added, but since we clear state, the effect below *adds* them.
                // To *remove* lines, we need reference.
                // IMPROVEMENT: Refresh chart or just clear data? 
                // Currently reusing the same chart instance.
                // We'll trust the user to hit "Reset" if it gets messy.
            }
        };

        fetchData();
    }, [selectedPair]);


    // Effect to Draw Lines
    const [priceLines, setPriceLines] = useState<any[]>([]);

    useEffect(() => {
        if (startPrice !== null && endPrice !== null && isDrawing === 'done' && candleSeriesRef.current) {
            const series = candleSeriesRef.current;
            const diff = endPrice - startPrice;

            // Remove old lines first?
            priceLines.forEach(line => series.removePriceLine(line));
            const newLines: any[] = [];

            KANJI_LEVELS.forEach(k => {
                const price = startPrice + (diff * k.level);
                const line = series.createPriceLine({
                    price: price,
                    color: k.color,
                    lineWidth: k.width as any,
                    lineStyle: k.style || 1, // Solid
                    axisLabelVisible: true,
                    title: k.label,
                });
                newLines.push(line);
            });

            setPriceLines(newLines);
        }
    }, [startPrice, endPrice, isDrawing]); // Check dependencies

    const handleReset = () => {
        // Clear lines
        if (candleSeriesRef.current) {
            priceLines.forEach(line => candleSeriesRef.current?.removePriceLine(line));
        }
        setPriceLines([]);
        setStartPrice(null);
        setEndPrice(null);
        setIsDrawing('start');
    };

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pt-24 pb-12">
            <div className="container-app mx-auto px-4 max-w-7xl">
                <PremiumGuard
                    title={t('title')}
                    description={t('desc')}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-3xl shadow-xl border border-[var(--border-light)] overflow-hidden"
                    >
                        {/* Header & Controls Toolbar */}
                        <div className="bg-gray-50 border-b border-gray-200 p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-3">
                                <span className="text-3xl">🎌</span>
                                <div>
                                    <h1 className="text-xl font-bold text-gray-900 leading-tight">{t('title')}</h1>
                                    <p className="text-xs text-gray-500 font-medium tracking-wide uppercase">{t('subtitle')}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 bg-white p-1 rounded-xl shadow-sm border border-gray-200">
                                {/* PAIR SELECTOR */}
                                <select
                                    value={selectedPair}
                                    onChange={(e) => setSelectedPair(e.target.value)}
                                    className="px-4 py-2 bg-transparent text-gray-800 font-bold text-sm outline-none cursor-pointer hover:bg-gray-50 rounded-lg transition"
                                >
                                    {availablePairs.map(group => (
                                        <optgroup key={group.group} label={group.group}>
                                            {group.pairs.map(pair => (
                                                <option key={pair} value={pair}>{pair}</option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>

                                <div className="w-px h-6 bg-gray-300 mx-1"></div>

                                {/* STATUS INDICATOR */}
                                <div className="flex items-center gap-2 px-2">
                                    <div className={`w-2 h-2 rounded-full ${isDrawing === 'done' ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`}></div>
                                    <span className="text-xs font-bold text-gray-600">
                                        {isDrawing === 'start' && t('start')}
                                        {isDrawing === 'end' && t('end')}
                                        {isDrawing === 'done' && t('levels')}
                                    </span>
                                </div>

                                <div className="w-px h-6 bg-gray-300 mx-1"></div>

                                <button
                                    onClick={handleReset}
                                    className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                    title={t('reset')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Chart Area */}
                        <div className="relative w-full h-[600px] bg-white group">
                            {isLoading && (
                                <div className="absolute inset-0 bg-white/80 z-10 flex flex-col items-center justify-center backdrop-blur-sm">
                                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                    <div className="text-gray-500 font-medium animate-pulse">Fetching Market Data...</div>
                                </div>
                            )}

                            <div
                                ref={chartContainerRef}
                                className="w-full h-full cursor-crosshair"
                            />

                            {/* Watermark */}
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-100 text-[100px] font-black pointer-events-none select-none z-0 tracking-widest opacity-30">
                                KANJI
                            </div>

                            {/* Floating Instruction */}
                            <AnimatePresence>
                                {isDrawing !== 'done' && !isLoading && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/75 text-white px-6 py-3 rounded-full shadow-lg backdrop-blur text-sm font-medium z-20 pointer-events-none"
                                    >
                                        {isDrawing === 'start' ? '👉 Click anywhere to set the SWING HIGH' : '👇 Now click the SWING LOW'}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </PremiumGuard>
            </div>
        </div>
    );
}
