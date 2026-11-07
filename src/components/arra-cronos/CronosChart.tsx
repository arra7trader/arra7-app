'use client';

import { useEffect, useRef } from 'react';
import {
    CandlestickSeries,
    ColorType,
    createChart,
    createSeriesMarkers,
    LineSeries,
    type IChartApi,
    type IPriceLine,
    type ISeriesApi,
    type ISeriesMarkersPluginApi,
    type Time,
    type UTCTimestamp,
} from 'lightweight-charts';

export interface CronosCandle {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface CronosForecast {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    upper?: number;
    lower?: number;
}

interface CronosChartProps {
    candles: CronosCandle[];
    forecast: CronosForecast[];
    action: 'BUY' | 'SELL' | 'WAIT' | null;
    entry: number | null;
    stop: number | null;
    target: number | null;
    takeProfit1?: number | null;
    takeProfit2?: number | null;
    formatPrice: (value: number) => string;
}

function chartTime(value: string): UTCTimestamp {
    return Math.floor(new Date(value).getTime() / 1000) as UTCTimestamp;
}

export default function CronosChart({
    candles,
    forecast,
    action,
    entry,
    stop,
    target,
    takeProfit1,
    takeProfit2,
    formatPrice,
}: CronosChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candlesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const forecastCandlesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const forecastRef = useRef<ISeriesApi<'Line'> | null>(null);
    const upperBandRef = useRef<ISeriesApi<'Line'> | null>(null);
    const lowerBandRef = useRef<ISeriesApi<'Line'> | null>(null);
    const levelsRef = useRef<IPriceLine[]>([]);
    const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;
        const chart = createChart(containerRef.current, {
            width: containerRef.current.clientWidth,
            height: 485,
            layout: {
                background: { type: ColorType.Solid, color: '#0b111b' },
                textColor: '#7d8da3',
                fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
            },
            grid: {
                vertLines: { color: 'rgba(37, 49, 66, 0.32)' },
                horzLines: { color: 'rgba(37, 49, 66, 0.48)' },
            },
            rightPriceScale: { borderColor: 'rgba(91, 109, 133, 0.25)' },
            timeScale: { borderColor: 'rgba(91, 109, 133, 0.25)', timeVisible: true, secondsVisible: false },
            crosshair: {
                vertLine: { color: 'rgba(119, 145, 176, 0.35)', labelBackgroundColor: '#243348' },
                horzLine: { color: 'rgba(119, 145, 176, 0.35)', labelBackgroundColor: '#243348' },
            },
            localization: { priceFormatter: formatPrice },
        });

        // 1. Historical Candles
        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#43d4a2',
            downColor: '#f16d79',
            borderUpColor: '#43d4a2',
            borderDownColor: '#f16d79',
            wickUpColor: '#43d4a2',
            wickDownColor: '#f16d79',
        });

        // 2. Projected Future Candles (Semi-transparent)
        const forecastCandleSeries = chart.addSeries(CandlestickSeries, {
            upColor: 'rgba(67, 212, 162, 0.25)',
            downColor: 'rgba(241, 109, 121, 0.25)',
            borderUpColor: '#43d4a2',
            borderDownColor: '#f16d79',
            wickUpColor: '#43d4a2',
            wickDownColor: '#f16d79',
            lastValueVisible: false,
            priceLineVisible: false,
        });

        // 3. Volatility Corridor: Upper Band (P90)
        const upperBandSeries = chart.addSeries(LineSeries, {
            color: 'rgba(56, 189, 248, 0.45)',
            lineWidth: 1,
            lineStyle: 2,
            crosshairMarkerVisible: false,
            lastValueVisible: false,
            priceLineVisible: false,
        });

        // 4. Volatility Corridor: Lower Band (P10)
        const lowerBandSeries = chart.addSeries(LineSeries, {
            color: 'rgba(56, 189, 248, 0.45)',
            lineWidth: 1,
            lineStyle: 2,
            crosshairMarkerVisible: false,
            lastValueVisible: false,
            priceLineVisible: false,
        });

        // 5. Autoregressive Mean Path (Bold neon cyan/blue)
        const forecastSeries = chart.addSeries(LineSeries, {
            color: '#38bdf8',
            lineWidth: 3,
            lineStyle: 0,
            crosshairMarkerVisible: true,
            lastValueVisible: true,
            priceLineVisible: false,
        });

        chartRef.current = chart;
        candlesRef.current = candleSeries;
        forecastCandlesRef.current = forecastCandleSeries;
        upperBandRef.current = upperBandSeries;
        lowerBandRef.current = lowerBandSeries;
        forecastRef.current = forecastSeries;
        markersRef.current = createSeriesMarkers(candleSeries, []);

        const resize = new ResizeObserver((entries) => {
            const width = entries[0]?.contentRect.width;
            if (width) chart.applyOptions({ width });
        });
        resize.observe(containerRef.current);

        return () => {
            resize.disconnect();
            chart.remove();
            markersRef.current = null;
            chartRef.current = null;
            candlesRef.current = null;
            forecastCandlesRef.current = null;
            upperBandRef.current = null;
            lowerBandRef.current = null;
            forecastRef.current = null;
        };
    }, []);

    useEffect(() => {
        const chart = chartRef.current;
        const candleSeries = candlesRef.current;
        const forecastCandleSeries = forecastCandlesRef.current;
        const upperBand = upperBandRef.current;
        const lowerBand = lowerBandRef.current;
        const forecastSeries = forecastRef.current;

        if (!chart || !candleSeries || !forecastCandleSeries || !forecastSeries || candles.length === 0) return;
        chart.applyOptions({ localization: { priceFormatter: formatPrice } });

        const visibleCandles = candles.slice(-512);
        const candleData = visibleCandles.map((candle) => ({ ...candle, time: chartTime(candle.time) }));
        candleSeries.setData(candleData);

        // Remove old price lines
        levelsRef.current.forEach((line) => candleSeries.removePriceLine(line));
        levelsRef.current = [];

        // Dynamic price levels with institutional formatting
        if (entry != null) {
            levelsRef.current.push(
                candleSeries.createPriceLine({
                    price: entry,
                    color: '#38bdf8',
                    lineWidth: 1,
                    lineStyle: 2,
                    axisLabelVisible: true,
                    title: 'ENTRY',
                })
            );
        }

        if (stop != null) {
            levelsRef.current.push(
                candleSeries.createPriceLine({
                    price: stop,
                    color: '#f43f5e',
                    lineWidth: 1,
                    lineStyle: 2,
                    axisLabelVisible: true,
                    title: 'SL',
                })
            );
        }

        const effectiveTp1 = takeProfit1 ?? null;
        if (effectiveTp1 != null) {
            levelsRef.current.push(
                candleSeries.createPriceLine({
                    price: effectiveTp1,
                    color: '#34d399',
                    lineWidth: 1,
                    lineStyle: 2,
                    axisLabelVisible: true,
                    title: 'TP1 (55%)',
                })
            );
        }

        const effectiveTp2 = takeProfit2 ?? target ?? null;
        if (effectiveTp2 != null) {
            levelsRef.current.push(
                candleSeries.createPriceLine({
                    price: effectiveTp2,
                    color: '#10b981',
                    lineWidth: 2,
                    lineStyle: 0,
                    axisLabelVisible: true,
                    title: 'TP2 / TARGET',
                })
            );
        }

        const last = visibleCandles[visibleCandles.length - 1];
        if (forecast.length > 0) {
            forecastCandleSeries.setData(forecast.map((bar) => ({ ...bar, time: chartTime(bar.time) })));

            // Forecast Mean Path
            const forecastData = [
                { time: chartTime(last.time), value: last.close },
                ...forecast.map((bar) => ({ time: chartTime(bar.time), value: bar.close })),
            ];
            forecastSeries.setData(forecastData);

            // Upper & Lower Volatility Bands
            if (upperBand && lowerBand) {
                const upperData = [
                    { time: chartTime(last.time), value: last.close },
                    ...forecast.map((bar) => ({ time: chartTime(bar.time), value: bar.upper || bar.high })),
                ];
                const lowerData = [
                    { time: chartTime(last.time), value: last.close },
                    ...forecast.map((bar) => ({ time: chartTime(bar.time), value: bar.lower || bar.low })),
                ];
                upperBand.setData(upperData);
                lowerBand.setData(lowerData);
            }
        } else {
            forecastCandleSeries.setData([]);
            forecastSeries.setData([]);
            upperBand?.setData([]);
            lowerBand?.setData([]);
        }

        // On-chart signal marker
        const signalMarker = action && action !== 'WAIT' ? [{
            time: chartTime(last.time),
            position: action === 'SELL' ? 'aboveBar' as const : 'belowBar' as const,
            color: action === 'BUY' ? '#10b981' : '#f43f5e',
            shape: action === 'BUY' ? 'arrowUp' as const : 'arrowDown' as const,
            text: `KRONOS · ${action}`,
            size: 2,
        }] : [];
        markersRef.current?.setMarkers(signalMarker);

        chart.timeScale().fitContent();
    }, [candles, forecast, action, entry, stop, target, takeProfit1, takeProfit2, formatPrice]);

    return (
        <div className="relative w-full">
            <div ref={containerRef} className="h-[390px] w-full sm:h-[485px]" aria-label="Chart OHLCV dan forecast ARRA Cronos" />
            {forecast.length > 0 && (
                <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2">
                    <span className="rounded-lg border border-cyan-400/30 bg-slate-900/80 px-2.5 py-1 text-[10px] font-bold text-cyan-200 backdrop-blur-sm">
                        ⚡ QUANT VOLATILITY ENVELOPE (P10 - P90)
                    </span>
                </div>
            )}
        </div>
    );
}
