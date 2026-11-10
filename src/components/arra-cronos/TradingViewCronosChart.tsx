'use client';

import { useEffect, useRef, memo, useCallback, useState } from 'react';
import { useSession } from 'next-auth/react';
import { usePicaDevice } from '@/context/PicaDeviceContext';
import { isAdminEmail, isAdminUser } from '@/lib/admin-access';
import Link from 'next/link';
import {
    ArrowDownTrayIcon,
    ArrowTopRightOnSquareIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    ClipboardDocumentCheckIcon,
    ClipboardDocumentIcon,
    CodeBracketIcon,
    EyeIcon,
    EyeSlashIcon,
    SparklesIcon,
    XMarkIcon,
    LockClosedIcon,
    BoltIcon,
} from '@heroicons/react/24/outline';
import type { CronosQuantMetrics } from '@/lib/arra-cronos-engine';

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

export interface TradingViewCronosChartProps {
    symbol: string;
    tvSymbol: string;
    timeframe: string;
    action: 'BUY' | 'SELL' | 'WAIT' | null;
    alignmentScore?: number | null;
    metrics?: CronosQuantMetrics | null;
    confluenceScore?: number | null;
    confluenceSummary?: string | null;
    direction?: 'UP' | 'DOWN' | 'FLAT' | null;
    currentPrice: number;
    isUnlocked?: boolean;
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
    action,
    alignmentScore,
    metrics,
    confluenceScore,
    direction,
    currentPrice,
    isUnlocked,
    formatPrice,
}: TradingViewCronosChartProps) {
    const { data: session } = useSession();
    const { tier } = usePicaDevice();

    const isAdmin =
        Boolean(isAdminUser(session?.user)) ||
        Boolean(isAdminEmail(session?.user?.email)) ||
        session?.user?.isAdmin === true ||
        (session?.user as any)?.role === 'ADMIN' ||
        (session?.user as any)?.tier === 'ADMIN';

    const hasOrder =
        tier === 'PRO' ||
        tier === 'VVIP' ||
        tier === 'ARRA_CRONOS' ||
        tier === 'LIFETIME' ||
        session?.user?.tier === 'PRO' ||
        session?.user?.tier === 'VVIP' ||
        session?.user?.tier === 'ARRA_CRONOS' ||
        session?.user?.tier === 'LIFETIME' ||
        (session?.user as any)?.plan === 'ARRA_CRONOS' ||
        (session?.user as any)?.plan === 'ALL_ACCESS' ||
        (typeof window !== 'undefined' && localStorage.getItem('pica_arra_cronos_unlocked') === 'true');

    const effectiveUnlocked = isAdmin || (isUnlocked !== undefined ? isUnlocked : hasOrder);
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetRef = useRef<any>(null);
    const containerIdRef = useRef(`tv_cronos_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);

    // UI Overlay state
    const [isOverlayVisible, setIsOverlayVisible] = useState(true);
    const [isOverlayExpanded, setIsOverlayExpanded] = useState(true);
    const [isPineModalOpen, setIsPineModalOpen] = useState(false);
    const [copiedPine, setCopiedPine] = useState(false);
    const [pineCode, setPineCode] = useState<string>('');
    const [loadingPine, setLoadingPine] = useState(false);
    const [showCodePreview, setShowCodePreview] = useState(false);

    // Initialize TradingView Widget with ARRA Cronos Trend EMAs and Volume studies
    const initWidget = useCallback(() => {
        if (!containerRef.current || !window.TradingView) return;

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
                studies: [
                    'MAExp@tv-basicstudies',
                    'Volume@tv-basicstudies',
                ],
                studies_overrides: {
                    'moving average exponential.length': 21,
                    'moving average exponential.plot.color': '#38bdf8',
                    'moving average exponential.plot.linewidth': 2,
                    'volume.volume.color.0': 'rgba(241, 109, 121, 0.45)',
                    'volume.volume.color.1': 'rgba(67, 212, 162, 0.45)',
                },
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
                    'paneProperties.rightMargin': 15,
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

    // Fetch official Pine Script code on demand
    const loadPineCode = useCallback(async () => {
        if (pineCode) return pineCode;
        setLoadingPine(true);
        try {
            const res = await fetch('/api/arra-cronos/pine', { cache: 'no-store' });
            if (res.ok) {
                const text = await res.text();
                setPineCode(text);
                return text;
            }
        } catch (err) {
            console.error('Failed to load ARRA_Cronos.pine', err);
        } finally {
            setLoadingPine(false);
        }
        return '';
    }, [pineCode]);

    const handleCopyPineScript = useCallback(async () => {
        if (!effectiveUnlocked) {
            setIsPineModalOpen(true);
            return;
        }

        let codeToCopy = pineCode;
        if (!codeToCopy) {
            codeToCopy = await loadPineCode();
        }
        if (codeToCopy) {
            try {
                await navigator.clipboard.writeText(codeToCopy);
                setCopiedPine(true);
                setTimeout(() => setCopiedPine(false), 2500);
            } catch (err) {
                console.error('Clipboard copy failed', err);
            }
        }
    }, [pineCode, loadPineCode, effectiveUnlocked]);

    const handleOpenPineModal = useCallback(() => {
        if (effectiveUnlocked) {
            loadPineCode();
        }
        setIsPineModalOpen(true);
    }, [loadPineCode, effectiveUnlocked]);

    const tvExternalUrl = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}`;

    return (
        <div className="relative w-full overflow-hidden rounded-2xl bg-[#0b111b]">
            {/* Top Info Bar indicating ARRA Cronos on TradingView */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-[#080d16] px-3.5 py-1.5 text-[10px]">
                <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8]" />
                    <span className="font-bold text-slate-300">
                        Chart harga TradingView
                    </span>
                    <span className="text-cyan-300">EMA 21 / 55 + Volume</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-emerald-300">Sinyal ARRA dari engine web</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-cyan-200">Pine Script dipasang terpisah</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="hidden sm:inline text-amber-300 font-semibold">
                        🎁 Bonus Script TradingView Pine v6 (Rp 150.000)
                    </span>
                    <button
                        onClick={handleOpenPineModal}
                        className="rounded bg-cyan-400/20 px-2 py-0.5 text-[9px] font-black text-cyan-200 hover:bg-cyan-400/30 transition"
                    >
                        Pasang di TV
                    </button>
                </div>
            </div>

            {/* TradingView Chart Container */}
            <div
                id={containerIdRef.current}
                ref={containerRef}
                className="h-[430px] w-full sm:h-[520px]"
                aria-label={`Chart TradingView ${symbol} - ARRA Cronos`}
            />

            {/* ON-CHART ARRA CRONOS INDICATOR OVERLAY (Institutional Pine HUD) */}
            {isOverlayVisible && (
                <div className="pointer-events-auto absolute left-3 top-10 z-20 max-w-[calc(100%-24px)] sm:max-w-md transition-all duration-300">
                    <div className="overflow-hidden rounded-xl border border-cyan-400/40 bg-[#070d17]/95 shadow-2xl backdrop-blur-md">
                        {/* Header bar of indicator */}
                        <div className="flex items-center justify-between border-b border-slate-800/80 px-3 py-2 bg-gradient-to-r from-cyan-950/40 via-[#0a1422] to-slate-900/40">
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_8px_#38bdf8]" />
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-black uppercase tracking-wider text-white">
                                        ARRA CRONOS™
                                    </span>
                                    <span className="rounded bg-cyan-400/20 px-1 py-0.2 text-[8px] font-black text-cyan-300">
                                        v1.1 PINE
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                                {/* Action / Setup Badge */}
                                <span
                                    className={`rounded-md px-2 py-0.5 text-[9px] font-black tracking-wide ${
                                        action === 'BUY'
                                            ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
                                            : action === 'SELL'
                                            ? 'bg-rose-400/20 text-rose-300 border border-rose-400/40'
                                            : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                                    }`}
                                >
                                    {action === 'BUY' ? 'BIAS BULLISH' : action === 'SELL' ? 'BIAS BEARISH' : 'WAIT / NETRAL'}
                                </span>

                                {/* Quick Pine Button */}
                                <button
                                    onClick={handleOpenPineModal}
                                    title="Pasang Indikator ARRA Cronos di TradingView (Pine Script)"
                                    className="flex h-6 items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 text-[9px] font-bold text-cyan-200 transition hover:bg-cyan-500/20"
                                >
                                    <CodeBracketIcon className="h-3 w-3" />
                                    <span className="hidden sm:inline">Pine Script</span>
                                </button>

                                {/* Collapse / Expand toggle */}
                                <button
                                    onClick={() => setIsOverlayExpanded((prev) => !prev)}
                                    className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white"
                                    title={isOverlayExpanded ? 'Ciutkan indikator' : 'Buka indikator'}
                                >
                                    {isOverlayExpanded ? (
                                        <ChevronUpIcon className="h-3.5 w-3.5" />
                                    ) : (
                                        <ChevronDownIcon className="h-3.5 w-3.5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Expanded Readout Body */}
                        {isOverlayExpanded && (
                            <div className="p-3 text-[10px] space-y-2">
                                {/* Row 1: Current observed price and technical bias */}
                                <div className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-[#060a12] p-2">
                                    <div>
                                        <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                                            Harga saat ini · data feed
                                        </div>
                                        <div className="text-sm font-black text-cyan-200">
                                            {currentPrice ? formatPrice(currentPrice) : '—'}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div
                                            className={`text-xs font-black ${
                                                direction === 'UP'
                                                    ? 'text-emerald-300'
                                                    : direction === 'DOWN'
                                                    ? 'text-rose-300'
                                                    : 'text-slate-400'
                                            }`}
                                        >
                                            {direction || 'FLAT'}
                                        </div>
                                    </div>
                                </div>

                                {/* Row 2: Pine Indicator Readouts Grid */}
                                <div className="grid grid-cols-3 gap-1.5 text-center">
                                    <div className="rounded-lg border border-slate-800/60 bg-[#080d16] p-1.5">
                                        <div className="text-[8px] font-bold uppercase text-slate-500">MTF Direction</div>
                                        <div className="text-[11px] font-black text-emerald-300">
                                            {confluenceScore ?? '—'}/100
                                        </div>
                                    </div>
                                    <div className="rounded-lg border border-slate-800/60 bg-[#080d16] p-1.5">
                                        <div className="text-[8px] font-bold uppercase text-slate-500">Alignment · bukan probabilitas</div>
                                        <div className="text-[11px] font-black text-cyan-300">
                                            {alignmentScore ?? metrics?.alignmentScore ?? '—'}/100
                                        </div>
                                    </div>
                                    <div className="rounded-lg border border-slate-800/60 bg-[#080d16] p-1.5">
                                        <div className="text-[8px] font-bold uppercase text-slate-500">RSI 14</div>
                                        <div className="text-[11px] font-black text-white">{metrics?.rsi14 ?? '—'}</div>
                                    </div>
                                </div>

                                {/* Row 3: Observed technical indicator values */}
                                <div className="flex flex-wrap items-center justify-between gap-1 border-t border-slate-800/60 pt-2 text-[9px] text-slate-400">
                                    <span>EMA 21: <strong className="text-white">{metrics ? formatPrice(metrics.ema21) : '—'}</strong></span>
                                    <span>EMA 55: <strong className="text-white">{metrics ? formatPrice(metrics.ema55) : '—'}</strong></span>
                                    <span>ATR 14: <strong className="text-white">{metrics ? formatPrice(metrics.atr14) : '—'}</strong></span>
                                </div>

                                {/* Technical EMA Status */}
                                {metrics && (
                                    <div className="flex items-center justify-between border-t border-slate-800/60 pt-1.5 text-[8.5px] text-slate-500">
                                        <span>Indikator EMA: Fast 21 · Slow 55</span>
                                        <span className={`font-bold ${metrics.ema21 >= metrics.ema55 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {metrics.ema21 >= metrics.ema55 ? 'Bullish Crossover' : 'Bearish Crossover'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Toggle Overlay Visibility Pill (bottom right) */}
            <div className="pointer-events-auto absolute bottom-3 right-3 z-10 flex items-center gap-2">
                <button
                    onClick={() => setIsOverlayVisible((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800/90 bg-[#070b12]/90 px-2.5 py-1 text-[10px] font-bold text-slate-400 shadow-lg backdrop-blur-md transition hover:border-cyan-400/40 hover:text-cyan-200"
                    title={isOverlayVisible ? 'Sembunyikan ARRA Cronos Overlay' : 'Tampilkan ARRA Cronos Overlay'}
                >
                    {isOverlayVisible ? (
                        <>
                            <EyeSlashIcon className="h-3.5 w-3.5" />
                            <span>Tutup HUD</span>
                        </>
                    ) : (
                        <>
                            <EyeIcon className="h-3.5 w-3.5 text-cyan-300" />
                            <span>ARRA Cronos HUD</span>
                        </>
                    )}
                </button>

                <button
                    onClick={handleOpenPineModal}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-500/20 px-3 py-1 text-[10px] font-black text-cyan-200 shadow-lg backdrop-blur-md transition hover:bg-cyan-500/30"
                >
                    <SparklesIcon className="h-3.5 w-3.5 text-cyan-300" />
                    <span>Pasang di TradingView</span>
                </button>
            </div>

            {/* MODAL: PASANG INDIKATOR ARRA CRONOS DI TRADINGVIEW */}
            {isPineModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
                    <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-cyan-400/30 bg-[#0b121e] shadow-2xl">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-slate-800 bg-[#0e1726] p-5">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                                    <CodeBracketIcon className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold text-white">
                                        Pasang Indikator ARRA Cronos di TradingView
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        Skrip Pine Script v6 resmi — BONUS paket ARRA Cronos (Rp 150.000)
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsPineModalOpen(false)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="max-h-[70vh] overflow-y-auto p-5 space-y-4">
                            {!effectiveUnlocked && (
                                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                                    <div className="flex items-start gap-3">
                                        <LockClosedIcon className="h-5 w-5 text-amber-300 shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="text-xs font-bold text-amber-200 uppercase tracking-wide">
                                                Bonus Eksklusif Pembeli ARRA Cronos (Rp 150.000)
                                            </h4>
                                            <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                                                Source code indikator TradingView Pine Script v6 disertakan sebagai bonus sekali bayar. Silakan order paket ARRA Cronos untuk mendapatkan akses penuh skrip ini.
                                            </p>
                                            <div className="mt-3">
                                                <Link
                                                    href="/payment/checkout?plan=ARRA_CRONOS"
                                                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2 text-xs font-black text-slate-950 hover:opacity-95 transition"
                                                >
                                                    <BoltIcon className="h-4 w-4" />
                                                    <span>Order ARRA Cronos Sekarang — Rp 150.000</span>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 3 Steps Guide */}
                            <div className="rounded-xl border border-cyan-500/20 bg-[#070d17] p-4">
                                <div className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                                    Cara Pemasangan di TradingView (30 Detik)
                                </div>
                                <ol className="mt-3 space-y-2.5 text-xs text-slate-300">
                                    <li className="flex items-start gap-2.5">
                                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-400/20 text-[10px] font-black text-cyan-300">
                                            1
                                        </span>
                                        <span>
                                            Salin kode Pine Script di bawah menggunakan tombol <strong>Salin Script</strong>.
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2.5">
                                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-400/20 text-[10px] font-black text-cyan-300">
                                            2
                                        </span>
                                        <span>
                                            Buka chart di TradingView.com, lalu klik tab <strong className="text-white">Pine Editor</strong> di bagian bawah layar.
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2.5">
                                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-400/20 text-[10px] font-black text-cyan-300">
                                            3
                                        </span>
                                        <span>
                                            Hapus kode bawaan, paste skrip ARRA Cronos, lalu klik <strong className="text-emerald-400">Add to chart</strong> (Tambahkan ke chart). Indikator langsung aktif selamanya di akun TradingView Anda!
                                        </span>
                                    </li>
                                </ol>
                            </div>

                            {/* Features list */}
                            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                                <div className="rounded-lg border border-slate-800 bg-[#09101b] p-2.5">
                                    <span className="font-bold text-cyan-300">⚡ Indikator harga teramati</span>
                                    <p className="mt-0.5 text-[10px] text-slate-500">EMA cepat dan lambat dari candle chart aktif.</p>
                                </div>
                                <div className="rounded-lg border border-slate-800 bg-[#09101b] p-2.5">
                                    <span className="font-bold text-emerald-300">📊 RSI & ATR</span>
                                    <p className="mt-0.5 text-[10px] text-slate-500">Ringkasan momentum dan volatilitas historis.</p>
                                </div>
                                <div className="rounded-lg border border-slate-800 bg-[#09101b] p-2.5">
                                    <span className="font-bold text-indigo-300">📈 Trend EMA 21 & 55</span>
                                    <p className="mt-0.5 text-[10px] text-slate-500">Filter tren terintegrasi langsung di chart.</p>
                                </div>
                                <div className="rounded-lg border border-slate-800 bg-[#09101b] p-2.5">
                                    <span className="font-bold text-amber-300">🧭 Bias multi-timeframe</span>
                                    <p className="mt-0.5 text-[10px] text-slate-500">EMA timeframe 1 jam, 4 jam, dan harian dari chart.</p>
                                </div>
                            </div>

                            {/* Code preview toggle */}
                            <div>
                                <button
                                    onClick={() => setShowCodePreview((prev) => !prev)}
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-cyan-300"
                                >
                                    {showCodePreview ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                                    <span>{showCodePreview ? 'Sembunyikan Source Code' : 'Lihat Source Code Script'}</span>
                                </button>
                                {showCodePreview && (
                                    <div className="mt-2 max-h-48 overflow-auto rounded-xl border border-slate-800 bg-[#060a12] p-3 font-mono text-[10px] text-slate-300">
                                        {!effectiveUnlocked ? (
                                            <div className="py-6 text-center text-slate-400">
                                                <LockClosedIcon className="h-6 w-6 text-amber-400 mx-auto mb-1" />
                                                <p>Source code terkunci. Order paket ARRA Cronos (Rp 150.000) untuk membuka.</p>
                                            </div>
                                        ) : loadingPine ? (
                                            'Memuat kode…'
                                        ) : (
                                            <pre className="whitespace-pre">{pineCode}</pre>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-[#0e1726] p-4">
                            <div className="flex items-center gap-2">
                                <a
                                    href={tvExternalUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-200 transition hover:bg-slate-700"
                                >
                                    <span>Buka di TradingView</span>
                                    <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                                </a>
                                {effectiveUnlocked && (
                                    <a
                                        href="/api/arra-cronos/pine"
                                        download="ARRA_Cronos.pine"
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-200 transition hover:bg-slate-700"
                                    >
                                        <ArrowDownTrayIcon className="h-4 w-4" />
                                        <span>Unduh File</span>
                                    </a>
                                )}
                            </div>

                            {effectiveUnlocked ? (
                                <button
                                    onClick={handleCopyPineScript}
                                    className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-bold transition shadow-lg ${
                                        copiedPine
                                            ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                                            : 'bg-cyan-300 text-slate-950 hover:bg-cyan-200 shadow-cyan-400/20'
                                    }`}
                                >
                                    {copiedPine ? (
                                        <>
                                            <ClipboardDocumentCheckIcon className="h-4 w-4" />
                                            <span>Kode Berhasil Disalin!</span>
                                        </>
                                    ) : (
                                        <>
                                            <ClipboardDocumentIcon className="h-4 w-4" />
                                            <span>Salin Pine Script (Copy)</span>
                                        </>
                                    )}
                                </button>
                            ) : (
                                <Link
                                    href="/payment/checkout?plan=ARRA_CRONOS"
                                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 px-5 py-2 text-xs font-black text-slate-950 shadow-lg hover:opacity-95 transition"
                                >
                                    <BoltIcon className="h-4 w-4" />
                                    <span>Order ARRA Cronos — Rp 150.000</span>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default memo(TradingViewCronosChart);
