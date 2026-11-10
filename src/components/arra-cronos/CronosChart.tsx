'use client';

import { useEffect, useRef, useCallback } from 'react';
import {
    CandlestickSeries,
    ColorType,
    createChart,
    createSeriesMarkers,
    LineSeries,
    type IPriceLine,
    type IChartApi,
    type ISeriesApi,
    type ISeriesMarkersPluginApi,
    type Time,
    type UTCTimestamp,
} from 'lightweight-charts';
import type { CronosScenarioSetup } from '@/lib/arra-cronos-engine';
import type { CronosTrackedSetup } from '@/lib/arra-cronos-setups';
import { formatCronosSetupStatus } from '@/lib/arra-cronos-setup-labels';

export interface CronosCandle {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface CronosForecastPoint {
    time: string;
    value: number;
    upper: number;
    lower: number;
}

interface CronosChartProps {
    symbol?: string;
    timeframe?: string;
    candles: CronosCandle[];
    forecast: CronosForecastPoint[];
    scenarioSetup: CronosScenarioSetup | null;
    trackedSetups: CronosTrackedSetup[];
    currentPrice: number;
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
    forecast,
    scenarioSetup,
    trackedSetups,
    currentPrice,
    action,
    formatPrice,
}: CronosChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candlesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const forecastRef = useRef<ISeriesApi<'Line'> | null>(null);
    const upperBandRef = useRef<ISeriesApi<'Line'> | null>(null);
    const lowerBandRef = useRef<ISeriesApi<'Line'> | null>(null);
    const levelsRef = useRef<IPriceLine[]>([]);
    const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);

    const prevSymbolTimeframeRef = useRef<string>('');
    const userHasScrolledRef = useRef<boolean>(false);
    const latestTrackedSetup = trackedSetups.find((setup) => setup.status === 'OPEN' || setup.status === 'TP1_HIT')
        ?? trackedSetups[0]
        ?? null;

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

        const forecastSeries = chart.addSeries(LineSeries, {
            color: '#22d3ee',
            lineWidth: 4,
            crosshairMarkerVisible: true,
            crosshairMarkerRadius: 5,
            pointMarkersVisible: true,
            pointMarkersRadius: 3,
            lastValueVisible: true,
            priceLineVisible: false,
        });
        const upperBandSeries = chart.addSeries(LineSeries, {
            color: 'rgba(34, 211, 238, 0.7)',
            lineWidth: 1,
            lineStyle: 2,
            crosshairMarkerVisible: false,
            lastValueVisible: false,
            priceLineVisible: false,
        });
        const lowerBandSeries = chart.addSeries(LineSeries, {
            color: 'rgba(34, 211, 238, 0.7)',
            lineWidth: 1,
            lineStyle: 2,
            crosshairMarkerVisible: false,
            lastValueVisible: false,
            priceLineVisible: false,
        });

        chartRef.current = chart;
        candlesRef.current = candleSeries;
        forecastRef.current = forecastSeries;
        upperBandRef.current = upperBandSeries;
        lowerBandRef.current = lowerBandSeries;
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
            forecastRef.current = null;
            upperBandRef.current = null;
            lowerBandRef.current = null;
            levelsRef.current = [];
        };
    }, []);

    useEffect(() => {
        const chart = chartRef.current;
        const candleSeries = candlesRef.current;
        const forecastSeries = forecastRef.current;
        const upperBand = upperBandRef.current;
        const lowerBand = lowerBandRef.current;
        if (!chart || !candleSeries || !forecastSeries || candles.length === 0) return;
        chart.applyOptions({ localization: { priceFormatter: formatPrice } });

        const visibleCandles = candles.slice(-512);
        const candleData = visibleCandles.map((candle) => ({ ...candle, time: chartTime(candle.time) }));
        candleSeries.setData(candleData);

        const last = visibleCandles[visibleCandles.length - 1];
        const intervalSeconds = timeframe === '15m' ? 900 : timeframe === '1h' ? 3_600 : timeframe === '4h' ? 14_400 : 86_400;
        const frozenSetup = latestTrackedSetup;
        const visibleForecast = frozenSetup?.forecast?.length ? frozenSetup.forecast : forecast;
        const lastCandleTime = chartTime(last.time);
        const lastCandleCloseTime = (lastCandleTime + intervalSeconds) as UTCTimestamp;
        const currentPointTime = frozenSetup
            ? (chartTime(frozenSetup.setupBarTime) + intervalSeconds) as UTCTimestamp
            // Forecast points are generated from the last completed candle.
            // Anchor one interval before the first projection so a live candle
            // can never create a duplicate timestamp in the forecast series.
            : visibleForecast.length
                ? (chartTime(visibleForecast[0].time) - intervalSeconds) as UTCTimestamp
                : lastCandleCloseTime;
        const currentForecastPrice = frozenSetup?.entryPrice ?? scenarioSetup?.entryPrice ?? last.close;
        const forecastLine = visibleForecast.length
            ? [{ time: currentPointTime, value: currentForecastPrice }, ...visibleForecast.map((point) => ({ time: chartTime(point.time), value: point.value }))]
            : [];
        forecastSeries.setData(forecastLine);
        upperBand?.setData(visibleForecast.length
            ? [{ time: currentPointTime, value: currentForecastPrice }, ...visibleForecast.map((point) => ({ time: chartTime(point.time), value: point.upper }))]
            : []);
        lowerBand?.setData(visibleForecast.length
            ? [{ time: currentPointTime, value: currentForecastPrice }, ...visibleForecast.map((point) => ({ time: chartTime(point.time), value: point.lower }))]
            : []);

        levelsRef.current.forEach((line) => candleSeries.removePriceLine(line));
        levelsRef.current = [];
        const visibleSetup = frozenSetup || scenarioSetup;
        if (visibleSetup) {
            const sideLabel = visibleSetup.side === 'BUY' ? 'BUY' : 'SELL';
            const levels = [
                { price: visibleSetup.entryPrice, title: `${sideLabel} · ENTRY${frozenSetup ? ' FIX' : ''}`, color: '#38bdf8', width: 1 as const },
                { price: visibleSetup.stopLoss, title: `SL · ${frozenSetup ? frozenSetup.stopHitAt ? 'HIT SL' : 'LEVEL FIX' : 'ESTIMASI'}`, color: '#f43f5e', width: 1 as const },
                { price: visibleSetup.takeProfit1, title: `TP 1 · ${frozenSetup ? frozenSetup.tp1HitAt ? 'HIT TP 1' : 'LEVEL FIX' : 'ESTIMASI'}`, color: '#34d399', width: 1 as const },
                { price: visibleSetup.takeProfit2, title: `TP 2 · ${frozenSetup ? frozenSetup.tp2HitAt ? 'HIT TP 2' : 'LEVEL FIX' : 'ESTIMASI'}`, color: '#10b981', width: 2 as const },
            ];
            for (const level of levels) {
                levelsRef.current.push(candleSeries.createPriceLine({
                    price: level.price,
                    color: level.color,
                    lineWidth: level.width,
                    lineStyle: 2,
                    axisLabelVisible: true,
                    title: level.title,
                }));
            }
        }

        // On-chart signal marker
        const signalMarker = action && action !== 'WAIT' ? [{
            time: chartTime(last.time),
            position: action === 'SELL' ? 'aboveBar' as const : 'belowBar' as const,
            color: action === 'BUY' ? '#10b981' : '#f43f5e',
            shape: action === 'BUY' ? 'arrowUp' as const : 'arrowDown' as const,
            text: `BIAS · ${action}`,
            size: 2,
        }] : [];
        const visibleCandleTimes = new Set(candleData.map((candle) => Number(candle.time)));
        const outcomeMarkers = trackedSetups.flatMap((setup) => {
            const markers = [];
            if (setup.tp1HitAt) markers.push({
                time: chartTime(setup.tp1HitAt),
                position: setup.side === 'BUY' ? 'belowBar' as const : 'aboveBar' as const,
                color: '#34d399', shape: 'circle' as const, text: 'HIT TP 1', size: 2 as const,
            });
            if (setup.tp2HitAt) markers.push({
                time: chartTime(setup.tp2HitAt),
                position: setup.side === 'BUY' ? 'belowBar' as const : 'aboveBar' as const,
                color: '#10b981', shape: setup.side === 'BUY' ? 'arrowUp' as const : 'arrowDown' as const, text: 'HIT TP 2', size: 2 as const,
            });
            if (setup.stopHitAt) markers.push({
                time: chartTime(setup.stopHitAt),
                position: setup.side === 'BUY' ? 'aboveBar' as const : 'belowBar' as const,
                color: '#f43f5e', shape: 'square' as const, text: setup.status === 'SL_AFTER_TP1' ? 'HIT SL · SETELAH TP 1' : 'HIT SL', size: 2 as const,
            });
            if (setup.status === 'AMBIGUOUS' || setup.status === 'AMBIGUOUS_AFTER_TP1') markers.push({
                time: chartTime(setup.ambiguousAt || setup.setupBarTime),
                position: 'aboveBar' as const,
                color: '#f59e0b', shape: 'square' as const, text: 'URUTAN TP/SL AMBIGU', size: 1 as const,
            });
            return markers;
        }).filter((marker) => visibleCandleTimes.has(Number(marker.time)));
        markersRef.current?.setMarkers([...signalMarker, ...outcomeMarkers].sort((a, b) => Number(a.time) - Number(b.time)));

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
    }, [candles, forecast, scenarioSetup, trackedSetups, currentPrice, action, formatPrice, symbol, timeframe, centerOnLastCandle]);

    return (
        <div className="relative w-full">
            <div ref={containerRef} className="h-[390px] w-full sm:h-[485px]" aria-label="Chart pasar aktual dengan jalur estimasi dan level skenario ARRA Cronos" />

            {forecast.length > 0 && (
                <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2">
                    <span className="rounded-lg border border-sky-400/30 bg-slate-900/90 px-2.5 py-1 text-[10px] font-bold text-sky-200 backdrop-blur-sm">
                        JALUR ESTIMASI · BUKAN HARGA AKTUAL
                    </span>
                    <span className="rounded-lg border border-slate-600/50 bg-slate-900/90 px-2.5 py-1 text-[10px] font-bold text-slate-200 backdrop-blur-sm">
                        {scenarioSetup?.action === 'WAIT' ? 'SETUP MENUNGGU KONFIRMASI' : `SKENARIO ${scenarioSetup?.side || '—'}`}
                    </span>
                    <span className="rounded-lg border border-slate-600/50 bg-slate-900/90 px-2.5 py-1 text-[10px] font-semibold text-slate-300 backdrop-blur-sm">
                        Garis cyan terang + titik = forecast · garis putus-putus = koridor ATR
                    </span>
                    {latestTrackedSetup && (
                        <span className="rounded-lg border border-emerald-400/30 bg-slate-900/90 px-2.5 py-1 text-[10px] font-bold text-emerald-200 backdrop-blur-sm">
                            LEVEL SETUP TETAP · {formatCronosSetupStatus(latestTrackedSetup.status)} · CANDLE AKTUAL
                        </span>
                    )}
                </div>
            )}

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
