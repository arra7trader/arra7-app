'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import PremiumGuard from '@/components/layout/PremiumGuard';
import { useTranslations } from 'next-intl';
import { createChart, ColorType, ISeriesApi, LineData, IChartApi } from 'lightweight-charts';

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

    const [startPrice, setStartPrice] = useState<number | null>(null);
    const [endPrice, setEndPrice] = useState<number | null>(null);
    const [isDrawing, setIsDrawing] = useState<'start' | 'end' | 'done'>('start');
    const [selectedPair, setSelectedPair] = useState<string>('XAUUSD');
    const [isLoading, setIsLoading] = useState(false);

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
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#333',
            },
            width: chartContainerRef.current.clientWidth,
            height: 500,
            grid: {
                vertLines: { color: 'rgba(197, 203, 206, 0.4)' },
                horzLines: { color: 'rgba(197, 203, 206, 0.4)' },
            },
            crosshair: {
                mode: 1, // CrosshairMode.Normal
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
            }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const series = (chart as any).addCandlestickSeries({
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });

        chartRef.current = chart;
        candleSeriesRef.current = series;

        // Click Handler for Drawing
        chart.subscribeClick((param) => {
            if (!param.point || !series) return;
            const price = series.coordinateToPrice(param.point.y);
            if (!price) return;

            if (isDrawing === 'start') {
                setStartPrice(price);
                setIsDrawing('end');
                // Could verify visual feedback here
            } else if (isDrawing === 'end') {
                setEndPrice(price);
                setIsDrawing('done');
            }
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
                        time: new Date(c.time).getTime() / 1000 as any, // Unix timestamp for lightweight-charts
                        open: c.open,
                        high: c.high,
                        low: c.low,
                        close: c.close,
                    }));

                    // Sort by time just in case
                    candles.sort((a: any, b: any) => a.time - b.time);

                    candleSeriesRef.current.setData(candles);
                    chartRef.current?.timeScale().fitContent();
                }
            } catch (error) {
                console.error('Failed to fetch pair data', error);
            } finally {
                setIsLoading(false);
                // Reset drawing on pair change
                setStartPrice(null);
                setEndPrice(null);
                setIsDrawing('start');
            }
        };

        fetchData();
    }, [selectedPair]);


    // Effect to Draw Lines when Start/End changes
    useEffect(() => {
        // Clear existing lines first would be ideal, but for V1 we just add.
        // In a real app we'd keep track of line objects and remove them.
        // Here we rely on the fact that if we change pairs, the chart clears data but lines might persist attached to series?
        // Actually, define a wrapper to clear lines if possible, or just accept appending for now.

        if (startPrice !== null && endPrice !== null && isDrawing === 'done' && candleSeriesRef.current) {
            const series = candleSeriesRef.current;
            const diff = endPrice - startPrice;

            KANJI_LEVELS.forEach(k => {
                const price = startPrice + (diff * k.level);
                series.createPriceLine({
                    price: price,
                    color: k.color,
                    lineWidth: k.width as any,
                    lineStyle: k.style || 1, // Solid
                    axisLabelVisible: true,
                    title: k.label,
                });
            });
        }
    }, [startPrice, endPrice, isDrawing]);

    const handleReset = () => {
        // Quick hack to clear lines: Reload data or re-init series. 
        // For simplicity: Reload the component logic by forcing update or just window reload.
        // Better: trigger re-fetch which resets data
        const currentPair = selectedPair;
        setSelectedPair(''); // Force change
        setTimeout(() => setSelectedPair(currentPair), 10);
    };

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pt-24 pb-12">
            <div className="container-apple">
                <PremiumGuard
                    title={t('title')}
                    description={t('desc')}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white p-4 rounded-3xl shadow-xl border border-[var(--border-light)]"
                    >
                        {/* Header & Controls */}
                        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                            <div>
                                <h1 className="text-2xl font-bold flex items-center gap-2">
                                    {t('title')} 🎌
                                    {isLoading && <span className="text-xs font-normal text-blue-500 animate-pulse">Loading Data...</span>}
                                </h1>
                                <p className="text-sm text-[var(--text-muted)]">{t('subtitle')}</p>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                {/* PAIR SELECTOR */}
                                <select
                                    value={selectedPair}
                                    onChange={(e) => setSelectedPair(e.target.value)}
                                    className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    {availablePairs.map(group => (
                                        <optgroup key={group.group} label={group.group}>
                                            {group.pairs.map(pair => (
                                                <option key={pair} value={pair}>{pair}</option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>

                                <div className="text-right px-4">
                                    <div className="text-[10px] uppercase text-[var(--text-muted)] font-bold">Drawing Mode</div>
                                    <div className={`text-sm font-bold ${isDrawing === 'done' ? 'text-green-600' : 'text-amber-600'}`}>
                                        {isDrawing === 'start' && "1. Click High"}
                                        {isDrawing === 'end' && "2. Click Low"}
                                        {isDrawing === 'done' && "✅ Active"}
                                    </div>
                                </div>

                                <button
                                    onClick={handleReset}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition text-sm font-medium"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>

                        {/* Chart Container */}
                        <div
                            ref={chartContainerRef}
                            className="w-full h-[500px] bg-gray-50 rounded-2xl overflow-hidden cursor-crosshair border border-gray-200 relative"
                        >
                            {/* Watermark */}
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-200 text-6xl font-black pointer-events-none select-none z-0">
                                ARRA7
                            </div>
                        </div>

                        <div className="mt-4 flex flex-col sm:flex-row gap-4 text-sm">
                            <div className="p-4 bg-blue-50 text-blue-800 rounded-xl flex-1">
                                ℹ️ <strong>Instruction:</strong> Select a pair from the dropdown. The chart usually loads <strong>H1</strong> data.
                                Click the <strong>Swing High</strong> first, then the <strong>Swing Low</strong> to draw Kanji Levels.
                            </div>
                        </div>
                    </motion.div>
                </PremiumGuard>
            </div>
        </div>
    );
}
