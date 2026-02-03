'use client';

import { useEffect, useState } from 'react';

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

interface CandleData {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
}

export default function FibonacciChart({ pair, timeframe, calculatedLevels }: FibonacciChartProps) {
    const [candles, setCandles] = useState<CandleData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [priceRange, setPriceRange] = useState({ min: 0, max: 0 });

    // Fetch market data
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch(`/api/market-data?pair=${pair}&timeframe=${timeframe}`);
                const data = await response.json();

                if (data.status === 'success' && data.candles && data.candles.length > 0) {
                    setCandles(data.candles);

                    // Calculate price range
                    const prices = data.candles.flatMap((c: CandleData) => [c.high, c.low]);
                    const min = Math.min(...prices);
                    const max = Math.max(...prices);
                    setPriceRange({ min, max });
                } else {
                    throw new Error('No candle data available');
                }

                setIsLoading(false);
            } catch (err) {
                console.error('Chart data fetch error:', err);
                setError(err instanceof Error ? err.message : 'Failed to load data');
                setIsLoading(false);
            }
        };

        fetchData();
    }, [pair, timeframe]);

    // Convert price to Y position (percentage)
    const priceToY = (price: number): number => {
        if (priceRange.max === priceRange.min) return 50;
        return ((priceRange.max - price) / (priceRange.max - priceRange.min)) * 100;
    };

    if (isLoading) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-black">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-3"></div>
                    <p className="text-gray-300 text-sm">Loading chart...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-black">
                <div className="text-center bg-red-900/20 border border-red-500 rounded-lg p-6 max-w-md">
                    <p className="text-red-400 text-sm mb-2">⚠️ Chart Error</p>
                    <p className="text-gray-300 text-xs">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full bg-black overflow-hidden">
            {/* Price Grid Background */}
            <div className="absolute inset-0">
                {[0, 20, 40, 60, 80, 100].map((y) => (
                    <div
                        key={y}
                        className="absolute w-full border-t border-gray-800"
                        style={{ top: `${y}%` }}
                    />
                ))}
            </div>

            {/* Candlestick Chart */}
            <div className="absolute inset-0 flex items-stretch px-4">
                {candles.slice(-50).map((candle, idx) => {
                    const isGreen = candle.close >= candle.open;
                    const bodyTop = Math.min(candle.open, candle.close);
                    const bodyBottom = Math.max(candle.open, candle.close);
                    const bodyHeight = bodyBottom - bodyTop;

                    return (
                        <div
                            key={idx}
                            className="relative flex-1 flex flex-col items-center justify-center"
                            style={{ minWidth: '2px', maxWidth: '20px' }}
                        >
                            {/* Wick (High-Low) */}
                            <div
                                className="absolute w-[2px] bg-gray-500"
                                style={{
                                    top: `${priceToY(candle.high)}%`,
                                    height: `${priceToY(candle.low) - priceToY(candle.high)}%`,
                                }}
                            />
                            {/* Body (Open-Close) */}
                            <div
                                className={`absolute ${isGreen ? 'bg-green-500' : 'bg-red-500'}`}
                                style={{
                                    top: `${priceToY(bodyTop)}%`,
                                    height: `${Math.max(priceToY(bodyBottom) - priceToY(bodyTop), 0.5)}%`,
                                    width: '80%',
                                }}
                            />
                        </div>
                    );
                })}
            </div>

            {/* Fibonacci Levels */}
            {calculatedLevels.map((level, idx) => {
                const price = parseFloat(level.price);
                if (isNaN(price)) return null;

                const yPos = priceToY(price);
                const isDashed = level.style === 2;

                return (
                    <div key={idx} className="absolute w-full" style={{ top: `${yPos}%` }}>
                        {/* Line */}
                        <div
                            className="w-full"
                            style={{
                                height: `${level.width || 1}px`,
                                backgroundColor: level.color,
                                opacity: 0.8,
                                borderTop: isDashed ? `${level.width || 1}px dashed ${level.color}` : 'none',
                            }}
                        />
                        {/* Label */}
                        <div
                            className="absolute right-2 -translate-y-1/2 px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap"
                            style={{
                                backgroundColor: level.color,
                                color: '#000',
                            }}
                        >
                            {level.label} ({level.price})
                        </div>
                    </div>
                );
            })}

            {/* Price Scale (Right Axis) */}
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gray-900/50 border-l border-gray-800">
                {[0, 25, 50, 75, 100].map((y) => {
                    const price = priceRange.max - ((priceRange.max - priceRange.min) * y) / 100;
                    return (
                        <div
                            key={y}
                            className="absolute right-1 text-xs text-gray-400 -translate-y-1/2"
                            style={{ top: `${y}%` }}
                        >
                            {price.toFixed(2)}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
