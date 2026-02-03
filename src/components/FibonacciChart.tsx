'use client';

import { useEffect, useRef, useState } from 'react';

interface FibonacciChartProps {
    pair: string;
    timeframe: string;
    calculatedLevels: Array<{
        level: number;
        label: string;
        price: string;
        color: string;
        width?: number;
        style?: number;
    }>;
}

export default function FibonacciChart({ pair, timeframe, calculatedLevels }: FibonacciChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);
    const candlestickSeriesRef = useRef<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [chartReady, setChartReady] = useState(false);

    // Initialize chart
    useEffect(() => {
        if (!chartContainerRef.current) return;

        let isMounted = true;

        // Dynamic import of lightweight-charts to prevent SSR issues
        import('lightweight-charts').then((LightweightCharts) => {
            if (!isMounted || !chartContainerRef.current) return;

            const { createChart, ColorType } = LightweightCharts;

            // Create chart instance
            const chart = createChart(chartContainerRef.current, {
                width: chartContainerRef.current.clientWidth,
                height: chartContainerRef.current.clientHeight,
                layout: {
                    background: { type: ColorType.Solid, color: '#000000' },
                    textColor: '#d1d4dc',
                },
                grid: {
                    vertLines: { color: '#2B2B43' },
                    horzLines: { color: '#2B2B43' },
                },
                timeScale: {
                    borderColor: '#2B2B43',
                    timeVisible: true,
                    secondsVisible: false,
                },
                rightPriceScale: {
                    borderColor: '#2B2B43',
                },
            });

            // Add candlestick series
            const candlestickSeries = (chart as any).addCandlestickSeries({
                upColor: '#26a69a',
                downColor: '#ef5350',
                borderVisible: false,
                wickUpColor: '#26a69a',
                wickDownColor: '#ef5350',
            });

            chartRef.current = chart;
            candlestickSeriesRef.current = candlestickSeries;
            setChartReady(true);

            // Handle resize
            const handleResize = () => {
                if (chartContainerRef.current && chartRef.current) {
                    chartRef.current.applyOptions({
                        width: chartContainerRef.current.clientWidth,
                        height: chartContainerRef.current.clientHeight,
                    });
                }
            };

            window.addEventListener('resize', handleResize);

            // Cleanup
            return () => {
                window.removeEventListener('resize', handleResize);
                if (chartRef.current) {
                    chartRef.current.remove();
                    chartRef.current = null;
                }
            };
        }).catch((err) => {
            console.error('Failed to load chart library:', err);
            setError('Failed to initialize chart');
        });

        return () => {
            isMounted = false;
        };
    }, []);

    // Fetch and display market data
    useEffect(() => {
        const fetchMarketData = async () => {
            if (!candlestickSeriesRef.current || !chartReady) return;

            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch(`/api/kanji/detect?pair=${pair}&timeframe=${timeframe}`);

                if (!response.ok) {
                    throw new Error('Failed to fetch market data');
                }

                const data = await response.json();

                if (data.status !== 'success' || !data.data) {
                    throw new Error('Invalid data format');
                }

                // Get candles from the market-data endpoint
                const marketDataResponse = await fetch(`/api/market-data?pair=${pair}&timeframe=${timeframe}`);
                const marketData = await marketDataResponse.json();

                if (marketData.candles && marketData.candles.length > 0) {
                    const formattedCandles = marketData.candles.map((candle: any) => ({
                        time: new Date(candle.time).getTime() / 1000, // Convert to seconds
                        open: candle.open,
                        high: candle.high,
                        low: candle.low,
                        close: candle.close,
                    }));

                    candlestickSeriesRef.current.setData(formattedCandles);

                    // Auto-fit content
                    if (chartRef.current) {
                        chartRef.current.timeScale().fitContent();
                    }
                }

                setIsLoading(false);
            } catch (err) {
                console.error('Chart data fetch error:', err);
                setError(err instanceof Error ? err.message : 'Failed to load chart data');
                setIsLoading(false);
            }
        };

        fetchMarketData();
    }, [pair, timeframe, chartReady]);

    // Draw Fibonacci levels as horizontal price lines
    useEffect(() => {
        if (!candlestickSeriesRef.current || !chartRef.current || calculatedLevels.length === 0 || !chartReady) {
            return;
        }

        // Dynamic import for LineStyle to prevent SSR issues
        import('lightweight-charts').then((LightweightCharts) => {
            const { LineStyle } = LightweightCharts;

            // Draw new price lines for each Fibonacci level
            calculatedLevels.forEach((level) => {
                if (!candlestickSeriesRef.current) return;

                const price = parseFloat(level.price);
                if (isNaN(price)) return;

                try {
                    candlestickSeriesRef.current.createPriceLine({
                        price: price,
                        color: level.color,
                        lineWidth: (level.width || 1) as 1 | 2 | 3 | 4,
                        lineStyle: level.style === 2 ? LineStyle.Dashed : LineStyle.Solid,
                        axisLabelVisible: true,
                        title: level.label,
                    });
                } catch (err) {
                    console.error(`Failed to create price line for ${level.label}:`, err);
                }
            });
        });

    }, [calculatedLevels, chartReady]);

    return (
        <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-3"></div>
                        <p className="text-gray-300 text-sm">Loading chart data...</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
                    <div className="text-center bg-red-900/20 border border-red-500 rounded-lg p-6 max-w-md">
                        <p className="text-red-400 text-sm mb-2">⚠️ Chart Error</p>
                        <p className="text-gray-300 text-xs">{error}</p>
                    </div>
                </div>
            )}

            <div ref={chartContainerRef} className="w-full h-full" />
        </div>
    );
}
