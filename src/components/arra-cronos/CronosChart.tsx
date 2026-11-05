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
}

interface CronosChartProps {
    candles: CronosCandle[];
    forecast: CronosForecast[];
    action: 'BUY' | 'SELL' | 'WAIT' | null;
    entry: number | null;
    stop: number | null;
    target: number | null;
    formatPrice: (value: number) => string;
}

function chartTime(value: string): UTCTimestamp {
    return Math.floor(new Date(value).getTime() / 1000) as UTCTimestamp;
}

export default function CronosChart({ candles, forecast, action, entry, stop, target, formatPrice }: CronosChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candlesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const forecastCandlesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const forecastRef = useRef<ISeriesApi<'Line'> | null>(null);
    const levelsRef = useRef<IPriceLine[]>([]);
    const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;
        const chart = createChart(containerRef.current, {
            width: containerRef.current.clientWidth,
            height: 485,
            layout: { background: { type: ColorType.Solid, color: '#0b111b' }, textColor: '#7d8da3', fontFamily: 'ui-sans-serif, system-ui' },
            grid: { vertLines: { color: 'rgba(37, 49, 66, 0.32)' }, horzLines: { color: 'rgba(37, 49, 66, 0.48)' } },
            rightPriceScale: { borderColor: 'rgba(91, 109, 133, 0.25)' },
            timeScale: { borderColor: 'rgba(91, 109, 133, 0.25)', timeVisible: true, secondsVisible: false },
            crosshair: { vertLine: { color: 'rgba(119, 145, 176, 0.35)', labelBackgroundColor: '#243348' }, horzLine: { color: 'rgba(119, 145, 176, 0.35)', labelBackgroundColor: '#243348' } },
            localization: { priceFormatter: formatPrice },
        });
        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#43d4a2', downColor: '#f16d79', borderUpColor: '#43d4a2', borderDownColor: '#f16d79', wickUpColor: '#43d4a2', wickDownColor: '#f16d79',
        });
        const forecastCandleSeries = chart.addSeries(CandlestickSeries, {
            upColor: 'rgba(67, 212, 162, 0.2)', downColor: 'rgba(241, 109, 121, 0.2)',
            borderUpColor: '#43d4a2', borderDownColor: '#f16d79', wickUpColor: '#43d4a2', wickDownColor: '#f16d79',
            lastValueVisible: false, priceLineVisible: false,
        });
        const forecastSeries = chart.addSeries(LineSeries, {
            color: '#78a9ff', lineWidth: 3, lineStyle: 2, crosshairMarkerVisible: true, lastValueVisible: true, priceLineVisible: false,
        });
        chartRef.current = chart;
        candlesRef.current = candleSeries;
        forecastCandlesRef.current = forecastCandleSeries;
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
            forecastRef.current = null;
        };
    }, []);

    useEffect(() => {
        const chart = chartRef.current;
        const candleSeries = candlesRef.current;
        const forecastCandleSeries = forecastCandlesRef.current;
        const forecastSeries = forecastRef.current;
        if (!chart || !candleSeries || !forecastCandleSeries || !forecastSeries || candles.length === 0) return;
        chart.applyOptions({ localization: { priceFormatter: formatPrice } });

        const visibleCandles = candles.slice(-512);
        const candleData = visibleCandles.map((candle) => ({ ...candle, time: chartTime(candle.time) }));
        candleSeries.setData(candleData);

        levelsRef.current.forEach((line) => candleSeries.removePriceLine(line));
        levelsRef.current = [];
        if (entry != null) levelsRef.current.push(candleSeries.createPriceLine({ price: entry, color: '#d7e0eb', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'ENTRY' }));
        if (stop != null) levelsRef.current.push(candleSeries.createPriceLine({ price: stop, color: '#f16d79', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'STOP' }));
        if (target != null) levelsRef.current.push(candleSeries.createPriceLine({ price: target, color: '#43d4a2', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'MODEL TARGET' }));

        const last = visibleCandles[visibleCandles.length - 1];
        if (forecast.length > 0) {
            forecastCandleSeries.setData(forecast.map((bar) => ({ ...bar, time: chartTime(bar.time) })));
            const forecastData = [
                { time: chartTime(last.time), value: last.close },
                ...forecast.map((bar) => ({ time: chartTime(bar.time), value: bar.close })),
            ];
            forecastSeries.setData(forecastData);
        } else {
            forecastCandleSeries.setData([]);
            forecastSeries.setData([]);
        }

        const signalMarker = action ? [{
            time: chartTime(last.time),
            position: action === 'SELL' ? 'aboveBar' as const : 'belowBar' as const,
            color: action === 'BUY' ? '#17b981' : action === 'SELL' ? '#e85968' : '#8b9bb0',
            shape: action === 'BUY' ? 'arrowUp' as const : action === 'SELL' ? 'arrowDown' as const : 'circle' as const,
            text: action === 'WAIT' ? 'CRONOS · WAIT' : `CRONOS · ${action}`,
            size: 1,
        }] : [];
        markersRef.current?.setMarkers(signalMarker);
        chart.timeScale().fitContent();
    }, [candles, forecast, action, entry, stop, target, formatPrice]);

    return <div ref={containerRef} className="h-[390px] w-full sm:h-[485px]" aria-label="Chart OHLCV dan forecast ARRA Cronos" />;
}
