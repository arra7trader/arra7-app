'use client';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { createChart, ColorType, ISeriesApi, IChartApi, CandlestickSeries } from 'lightweight-charts';

interface KanjiChartProps {
    pair: string;
    levels: any[];
    onPriceClick?: (price: number) => void;
}

const KanjiAnalysisChart = forwardRef(({ pair, levels, onPriceClick }: KanjiChartProps, ref) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const [priceLines, setPriceLines] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Expose refresh method
    useImperativeHandle(ref, () => ({
        refresh: () => {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        }
    }));

    // Generate Fallback Data
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

    // Initialize Chart
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#000000' },
                textColor: '#d1d4dc',
            },
            width: chartContainerRef.current.clientWidth,
            height: 600,
            grid: {
                vertLines: { color: 'rgba(42, 46, 57, 0.2)' },
                horzLines: { color: 'rgba(42, 46, 57, 0.2)' },
            },
            timeScale: {
                borderColor: 'rgba(197, 203, 206, 0.8)',
                timeVisible: true,
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

        const handleResize = () => {
            chart.applyOptions({ width: chartContainerRef.current?.clientWidth || 0 });
        };
        window.addEventListener('resize', handleResize);

        chart.subscribeClick((param) => {
            if (param.point && series && onPriceClick) {
                const price = series.coordinateToPrice(param.point.y);
                if (price) onPriceClick(price);
            }
        });

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, []);

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            if (!candleSeriesRef.current) return;
            setIsLoading(true);
            try {
                const res = await fetch(`/api/market?pair=${pair}&timeframe=1h`);
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
                    let basePrice = 2000;
                    if (pair.includes('JPY')) basePrice = 150;
                    else if (pair.includes('BTC')) basePrice = 90000;
                    else if (pair.includes('EUR')) basePrice = 1.05;
                    else if (pair.includes('US30')) basePrice = 38000;
                    candles = generateFallbackData(basePrice);
                }

                candleSeriesRef.current.setData(candles);
                chartRef.current?.timeScale().fitContent();

            } catch (err) {
                const fallback = generateFallbackData(2000);
                candleSeriesRef.current?.setData(fallback);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [pair]);

    // Update Lines
    useEffect(() => {
        if (!candleSeriesRef.current) return;

        // Clear old lines
        priceLines.forEach(l => candleSeriesRef.current?.removePriceLine(l));

        // Draw new lines
        const newLines: any[] = [];
        levels.forEach(lvl => {
            const line = candleSeriesRef.current?.createPriceLine({
                price: parseFloat(lvl.price),
                color: lvl.color,
                lineWidth: lvl.width || 1,
                lineStyle: lvl.style || 1,
                axisLabelVisible: true,
                title: lvl.label,
            });
            newLines.push(line);
        });
        setPriceLines(newLines);
    }, [levels]);

    return (
        <div className="relative w-full h-full group">
            {isLoading && (
                <div className="absolute inset-0 bg-black/80 z-20 flex flex-col items-center justify-center backdrop-blur-sm">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <div className="text-gray-400 font-medium animate-pulse">Fetching Fresh Data...</div>
                </div>
            )}
            <div ref={chartContainerRef} className="w-full h-full cursor-crosshair" />

            <div className="absolute top-4 left-4 flex gap-2 pointer-events-none">
                <div className="bg-blue-600/90 text-white text-xs px-3 py-1.5 rounded-lg backdrop-blur shadow-lg border border-white/20 flex items-center gap-2">
                    <span>🎯 Analysis Mode (Visual Zones Active)</span>
                </div>
            </div>
        </div>
    );
});

KanjiAnalysisChart.displayName = 'KanjiAnalysisChart';
export default KanjiAnalysisChart;
