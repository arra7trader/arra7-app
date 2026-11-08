'use client';

import { useEffect, useRef, useCallback } from 'react';
import {
    CandlestickSeries,
    ColorType,
    createChart,
    createSeriesMarkers,
    type IChartApi,
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

interface CronosChartProps {
    symbol?: string;
    timeframe?: string;
    candles: CronosCandle[];
    action: 'BUY' | 'SELL' | 'WAIT' | null;
    formatPrice: (value: number) => string;
}

function chartTime(value: string): UTCTimestamp {
    return Math.floor(new Date(value).getTime() / 1000) as UTCTimestamp;
}

export default function CronosChart({
    symbol,
    timeframe,
    candles,
    action,
    formatPrice,
}: CronosChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candlesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);

    const prevSymbolTimeframeRef = useRef<string>('');
    const userHasScrolledRef = useRef<boolean>(false);

    // Posisikan candle terakhir tepat di tengah horizontal layar
    const centerOnLastCandle = useCallback(() => {
        const chart = chartRef.current;
        if (!chart || candles.length === 0) return;

        const visibleCandles = candles.slice(-512);
        const lastIndex = visibleCandles.length - 1;
        const containerWidth = containerRef.current?.clientWidth || 800;
        // Pada layar mobile tampilkan ~44 bar total, pada desktop tampilkan ~72 bar total
        const halfWindow = containerWidth < 640 ? 22 : 36;

        chart.timeScale().applyOptions({
            rightOffset: halfWindow,
            barSpacing: containerWidth < 640 ? 9 : 12,
            minBarSpacing: 3,
        });

        chart.timeScale().setVisibleLogicalRange({
            from: Math.max(0, lastIndex - halfWindow),
            to: lastIndex + halfWindow,
        });

        userHasScrolledRef.current = false;
    }, [candles]);

    const handleFitAll = useCallback(() => {
        chartRef.current?.timeScale().fitContent();
        userHasScrolledRef.current = true;
    }, []);

    const handleZoomIn = useCallback(() => {
        const chart = chartRef.current;
        if (!chart) return;
        const range = chart.timeScale().getVisibleLogicalRange();
        if (!range) return;
        const span = range.to - range.from;
        const newSpan = Math.max(12, Math.floor(span * 0.75));
        const center = (range.from + range.to) / 2;
        chart.timeScale().setVisibleLogicalRange({
            from: center - newSpan / 2,
            to: center + newSpan / 2,
        });
        userHasScrolledRef.current = true;
    }, []);

    const handleZoomOut = useCallback(() => {
        const chart = chartRef.current;
        if (!chart) return;
        const range = chart.timeScale().getVisibleLogicalRange();
        if (!range) return;
        const span = range.to - range.from;
        const newSpan = Math.floor(span * 1.35);
        const center = (range.from + range.to) / 2;
        chart.timeScale().setVisibleLogicalRange({
            from: center - newSpan / 2,
            to: center + newSpan / 2,
        });
        userHasScrolledRef.current = true;
    }, []);

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
            timeScale: {
                borderColor: 'rgba(91, 109, 133, 0.25)',
                timeVisible: true,
                secondsVisible: false,
                rightOffset: 36,
                barSpacing: 12,
                minBarSpacing: 3,
                fixLeftEdge: false,
                fixRightEdge: false,
            },
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

        chartRef.current = chart;
        candlesRef.current = candleSeries;
        markersRef.current = createSeriesMarkers(candleSeries, []);

        const resize = new ResizeObserver((entries) => {
            const width = entries[0]?.contentRect.width;
            if (width) {
                chart.applyOptions({ width });
            }
        });
        resize.observe(containerRef.current);

        return () => {
            resize.disconnect();
            chart.remove();
            markersRef.current = null;
            chartRef.current = null;
            candlesRef.current = null;
        };
    }, []);

    useEffect(() => {
        const chart = chartRef.current;
        const candleSeries = candlesRef.current;
        if (!chart || !candleSeries || candles.length === 0) return;
        chart.applyOptions({ localization: { priceFormatter: formatPrice } });

        const visibleCandles = candles.slice(-512);
        const candleData = visibleCandles.map((candle) => ({ ...candle, time: chartTime(candle.time) }));
        candleSeries.setData(candleData);

        const last = visibleCandles[visibleCandles.length - 1];

        // On-chart signal marker
        const signalMarker = action && action !== 'WAIT' ? [{
            time: chartTime(last.time),
            position: action === 'SELL' ? 'aboveBar' as const : 'belowBar' as const,
            color: action === 'BUY' ? '#10b981' : '#f43f5e',
            shape: action === 'BUY' ? 'arrowUp' as const : 'arrowDown' as const,
            text: `BIAS · ${action}`,
            size: 2,
        }] : [];
        markersRef.current?.setMarkers(signalMarker);

        // Check if symbol or timeframe changed
        const currentKey = `${symbol || ''}_${timeframe || ''}`;
        const hasKeyChanged = prevSymbolTimeframeRef.current !== currentKey;
        if (hasKeyChanged) {
            prevSymbolTimeframeRef.current = currentKey;
            userHasScrolledRef.current = false;
        }

        // Automatically position the last candle in the center horizontally
        if (!userHasScrolledRef.current) {
            centerOnLastCandle();
        }
    }, [candles, action, formatPrice, symbol, timeframe, centerOnLastCandle]);

    return (
        <div className="relative w-full">
            <div ref={containerRef} className="h-[390px] w-full sm:h-[485px]" aria-label="Chart OHLCV pasar aktual ARRA Cronos" />

            {/* Top Right Quick Chart View Controls: Center Candle, Fit All, Zoom In, Zoom Out */}
            <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-1 shadow-xl">
                <button
                    type="button"
                    onClick={() => centerOnLastCandle()}
                    title="Posisikan candle terakhir di tengah layar"
                    className="flex items-center gap-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 px-2.5 py-1 text-[11px] font-bold transition shadow-xs cursor-pointer"
                >
                    <span className="text-xs">🎯</span>
                    <span className="hidden sm:inline">Pusatkan di Tengah</span>
                    <span className="sm:hidden">Tengah</span>
                </button>
                <button
                    type="button"
                    onClick={handleFitAll}
                    title="Tampilkan Seluruh Histori Candle (Zoom Out Maksimal)"
                    className="rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2 py-1 text-[11px] font-bold transition cursor-pointer"
                >
                    <span className="hidden sm:inline">Fit All</span>
                    <span className="sm:hidden">Semua</span>
                </button>
                <div className="h-3.5 w-px bg-slate-700/80 mx-0.5" />
                <button
                    type="button"
                    onClick={handleZoomIn}
                    title="Perbesar / Zoom In (+)"
                    className="h-6 w-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center text-xs font-bold transition cursor-pointer"
                >
                    +
                </button>
                <button
                    type="button"
                    onClick={handleZoomOut}
                    title="Perkecil / Zoom Out (−)"
                    className="h-6 w-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center text-xs font-bold transition cursor-pointer"
                >
                    −
                </button>
            </div>
        </div>
    );
}
