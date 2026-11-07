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
    upper?: number;
    lower?: number;
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
    takeProfit1?: number | null;
    takeProfit2?: number | null;
    riskRewardRatio?: number | null;
    confidence?: number | null;
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
    takeProfit1,
    takeProfit2,
    riskRewardRatio,
    confidence,
    formatPrice,
}: TradingViewCronosChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetRef = useRef<any>(null);
    const containerIdRef = useRef(`tv_cronos_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);

    const initWidget = useCallback(() => {
        if (!containerRef.current || !window.TradingView) return;

        // Clear previous widget
        containerRef.current.innerHTML = '';

        const interval = TV_INTERVAL_MAP[timeframe] || '60';

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
                studies: [],
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

    const effectiveTp1 = takeProfit1 ?? null;
    const effectiveTp2 = takeProfit2 ?? target ?? null;

    return (
        <div className="relative w-full">
            {/* TradingView Chart */}
            <div
                id={containerIdRef.current}
                ref={containerRef}
                className="h-[390px] w-full sm:h-[485px]"
                aria-label={`Chart TradingView ${symbol} - ARRA Cronos`}
            />

            {/* Top HUD Badges */}
            <div className="pointer-events-none absolute right-3 top-3 z-10 flex flex-wrap items-center gap-2">
                {confidence != null && (
                    <div className="rounded-lg border border-cyan-400/30 bg-[#080d15]/90 px-2.5 py-1.5 shadow-lg backdrop-blur-md">
                        <div className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#38bdf8]" />
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-200">
                                CONFIDENCE: {confidence}%
                            </span>
                        </div>
                    </div>
                )}

                {action && action !== 'WAIT' && (
                    <div
                        className={`rounded-lg border px-3 py-1.5 shadow-lg backdrop-blur-md ${
                            action === 'BUY'
                                ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-200'
                                : 'border-rose-400/40 bg-rose-500/20 text-rose-200'
                        }`}
                    >
                        <span className="text-[10px] font-black uppercase tracking-wider">
                            SIGNAL: {action}
                        </span>
                        {riskRewardRatio != null && riskRewardRatio > 0 && (
                            <span className="ml-1.5 text-[9px] opacity-80">· R:R 1:{riskRewardRatio}</span>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom-left Price Level Badges */}
            {(entry || stop || effectiveTp1 || effectiveTp2) && (
                <div className="pointer-events-none absolute bottom-14 left-3 z-10 flex flex-col gap-1.5">
                    {entry != null && (
                        <div className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-[#070b12]/90 px-2.5 py-1 text-[10px] font-bold text-cyan-200 shadow-md backdrop-blur-md">
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                            <span>ENTRY: {formatPrice(entry)}</span>
                        </div>
                    )}
                    {stop != null && (
                        <div className="inline-flex items-center gap-2 rounded-lg border border-rose-500/30 bg-[#1f0b11]/90 px-2.5 py-1 text-[10px] font-bold text-rose-300 shadow-md backdrop-blur-md">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                            <span>SL: {formatPrice(stop)}</span>
                        </div>
                    )}
                    {effectiveTp1 != null && (
                        <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-[#061e14]/90 px-2.5 py-1 text-[10px] font-bold text-emerald-300 shadow-md backdrop-blur-md">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            <span>TP1: {formatPrice(effectiveTp1)}</span>
                        </div>
                    )}
                    {effectiveTp2 != null && (
                        <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/50 bg-[#082a1d]/90 px-2.5 py-1 text-[10px] font-black text-emerald-200 shadow-md backdrop-blur-md">
                            <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_8px_#34d399]" />
                            <span>TP2 / TARGET: {formatPrice(effectiveTp2)}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default memo(TradingViewCronosChart);
