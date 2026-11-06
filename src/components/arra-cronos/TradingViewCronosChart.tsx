'use client';

import { useEffect, useRef, memo, useCallback } from 'react';

declare global {
    interface Window {
        TradingView: any;
    }
}

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

interface TradingViewCronosChartProps {
    symbol: string;
    tvSymbol: string;
    timeframe: string;
    forecast: CronosForecast[];
    action: 'BUY' | 'SELL' | 'WAIT' | null;
    entry: number | null;
    stop: number | null;
    target: number | null;
    formatPrice: (value: number) => string;
    onCandleData?: (candles: CronosCandle[]) => void;
}

// TradingView interval mapping
const TV_INTERVAL_MAP: Record<string, string> = {
    '15m': '15',
    '1h': '60',
    '4h': '240',
    '1d': 'D',
};

function TradingViewCronosChart({
    symbol,
    tvSymbol,
    timeframe,
    forecast,
    action,
    entry,
    stop,
    target,
    formatPrice,
    onCandleData,
}: TradingViewCronosChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetRef = useRef<any>(null);
    const containerIdRef = useRef(`tv_cronos_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);

    const initWidget = useCallback(() => {
        if (!containerRef.current || !window.TradingView) return;

        // Clear previous widget
        containerRef.current.innerHTML = '';

        const interval = TV_INTERVAL_MAP[timeframe] || '60';

        // Build studies list for forecast overlay lines
        const studies: string[] = [];

        try {
            widgetRef.current = new window.TradingView.widget({
                autosize: true,
                symbol: tvSymbol,
                interval: interval,
                timezone: 'Asia/Jakarta',
                theme: 'dark',
                style: '1', // Candlestick
                locale: 'en',
                toolbar_bg: '#0b111b',
                enable_publishing: false,
                allow_symbol_change: false,
                container_id: containerIdRef.current,
                hide_side_toolbar: false,
                hide_top_toolbar: false,
                save_image: true,
                studies: studies,
                show_popup_button: true,
                popup_width: '1200',
                popup_height: '700',
                backgroundColor: '#0b111b',
                gridColor: 'rgba(37, 49, 66, 0.48)',
                withdateranges: true,
                details: true,
                hotlist: false,
                calendar: false,
                overrides: {
                    'paneProperties.background': '#0b111b',
                    'paneProperties.backgroundType': 'solid',
                    'paneProperties.vertGridProperties.color': 'rgba(37, 49, 66, 0.32)',
                    'paneProperties.horzGridProperties.color': 'rgba(37, 49, 66, 0.48)',
                    'scalesProperties.textColor': '#7d8da3',
                    'scalesProperties.lineColor': 'rgba(91, 109, 133, 0.25)',
                    'mainSeriesProperties.candleStyle.upColor': '#43d4a2',
                    'mainSeriesProperties.candleStyle.downColor': '#f16d79',
                    'mainSeriesProperties.candleStyle.borderUpColor': '#43d4a2',
                    'mainSeriesProperties.candleStyle.borderDownColor': '#f16d79',
                    'mainSeriesProperties.candleStyle.wickUpColor': '#43d4a2',
                    'mainSeriesProperties.candleStyle.wickDownColor': '#f16d79',
                },
                loading_screen: {
                    backgroundColor: '#0b111b',
                    foregroundColor: '#67e8f9',
                },
            });
        } catch (err) {
            console.error('[TradingView Cronos] Widget init error:', err);
        }
    }, [tvSymbol, timeframe]);

    // Load TradingView script & init widget
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const loadAndInit = () => {
            if (window.TradingView) {
                initWidget();
            } else {
                const script = document.createElement('script');
                script.src = 'https://s3.tradingview.com/tv.js';
                script.async = true;
                script.onload = () => initWidget();
                document.head.appendChild(script);
            }
        };

        loadAndInit();

        return () => {
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
            widgetRef.current = null;
        };
    }, [tvSymbol, timeframe, initWidget]);

    return (
        <div className="relative w-full">
            {/* TradingView Chart */}
            <div
                id={containerIdRef.current}
                ref={containerRef}
                className="h-[390px] w-full sm:h-[485px]"
                aria-label={`Chart TradingView ${symbol} - ARRA Cronos`}
            />

            {/* Forecast overlay info bar */}
            {forecast.length > 0 && (
                <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
                    <div className="rounded-lg border border-blue-400/20 bg-blue-500/10 px-2.5 py-1.5 backdrop-blur-sm">
                        <div className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                            <span className="text-[9px] font-bold uppercase tracking-wider text-blue-200">
                                KRONOS FORECAST: {forecast.length} bars
                            </span>
                        </div>
                    </div>
                    {action && action !== 'WAIT' && (
                        <div className={`rounded-lg border px-2.5 py-1.5 backdrop-blur-sm ${
                            action === 'BUY'
                                ? 'border-emerald-400/20 bg-emerald-500/10'
                                : 'border-rose-400/20 bg-rose-500/10'
                        }`}>
                            <span className={`text-[9px] font-bold uppercase tracking-wider ${
                                action === 'BUY' ? 'text-emerald-200' : 'text-rose-200'
                            }`}>
                                SIGNAL: {action}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Price level badges */}
            {(entry || stop || target) && (
                <div className="absolute bottom-16 left-3 z-10 flex flex-col gap-1">
                    {entry != null && (
                        <div className="rounded-md bg-slate-800/90 px-2 py-1 text-[9px] font-bold text-slate-200 backdrop-blur-sm">
                            ENTRY: {formatPrice(entry)}
                        </div>
                    )}
                    {stop != null && (
                        <div className="rounded-md bg-rose-900/70 px-2 py-1 text-[9px] font-bold text-rose-200 backdrop-blur-sm">
                            STOP: {formatPrice(stop)}
                        </div>
                    )}
                    {target != null && (
                        <div className="rounded-md bg-emerald-900/70 px-2 py-1 text-[9px] font-bold text-emerald-200 backdrop-blur-sm">
                            TARGET: {formatPrice(target)}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default memo(TradingViewCronosChart);
