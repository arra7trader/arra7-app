'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowPathIcon, ArrowTrendingDownIcon, ArrowTrendingUpIcon, BoltIcon, ChartBarIcon, ChevronDownIcon, ClockIcon, CpuChipIcon, MagnifyingGlassIcon, SignalIcon } from '@heroicons/react/24/outline';
import type { CronosCandle, CronosForecast } from '@/components/arra-cronos/CronosChart';

const CronosChart = dynamic(() => import('@/components/arra-cronos/CronosChart'), { ssr: false });
const TradingViewCronosChart = dynamic(() => import('@/components/arra-cronos/TradingViewCronosChart'), { ssr: false });

type Category = { id: string; name: string; pairs: { symbol: string; name: string }[] };
type Instrument = { symbol: string; name: string };
type MarketData = {
    symbol: string;
    name: string;
    feedSymbol: string;
    tvSymbol: string;
    timeframe: string;
    candles: CronosCandle[];
    currentPrice: number;
    latestBarClose: number;
    changePercent: number;
    source: string;
    updatedAt: string;
    freshnessSeconds: number;
    isFresh: boolean;
    count: number;
    volumeCoverage: number;
};
type ModelStatus = { available: boolean; model: string; status: string; device?: string; message: string };
type ForecastData = {
    forecast: CronosForecast[];
    direction: 'UP' | 'DOWN' | 'FLAT';
    currentPrice: number;
    targetPrice: number;
    inferenceMs: number;
    generatedAt: string;
    model: string;
    modelSource: string;
    historyBars: number;
};

const TIMEFRAMES = [
    { id: '15m', label: '15M' },
    { id: '1h', label: '1H' },
    { id: '4h', label: '4H' },
    { id: '1d', label: '1D' },
] as const;

type ChartMode = 'tradingview' | 'lightweight';

const CATEGORY_SHORT: Record<string, string> = { major: 'FOREX MAJOR', minor: 'FOREX CROSS', commodities: 'KOMODITAS', crypto: 'KRIPTO', indices: 'INDEKS' };
function formatPrice(symbol: string, price: number) {
    const decimals = symbol.includes('JPY') || symbol.includes('XAU') || symbol.includes('XAG') || symbol.endsWith('USD') && !['EURUSD', 'GBPUSD', 'AUDUSD', 'NZDUSD'].includes(symbol) ? 2 : price >= 100 ? 2 : 5;
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(price);
}

function calculateMetrics(candles: CronosCandle[]) {
    const closes = candles.map((candle) => candle.close);
    const ranges = candles.slice(1).map((candle, index) => Math.max(candle.high - candle.low, Math.abs(candle.high - closes[index]), Math.abs(candle.low - closes[index])));
    const atrValues = ranges.slice(-14);
    const atr = atrValues.length ? atrValues.reduce((sum, value) => sum + value, 0) / atrValues.length : 0;
    const gains: number[] = [];
    const losses: number[] = [];
    for (let index = Math.max(1, closes.length - 14); index < closes.length; index += 1) {
        const delta = closes[index] - closes[index - 1];
        if (delta >= 0) gains.push(delta);
        else losses.push(-delta);
    }
    const averageGain = gains.length ? gains.reduce((sum, value) => sum + value, 0) / 14 : 0;
    const averageLoss = losses.length ? losses.reduce((sum, value) => sum + value, 0) / 14 : 0;
    const rsi = averageLoss === 0 ? averageGain === 0 ? 50 : 100 : 100 - (100 / (1 + averageGain / averageLoss));
    const ema = (period: number) => {
        const alpha = 2 / (period + 1);
        const start = Math.max(0, closes.length - period * 3);
        const values = closes.slice(start);
        return values.slice(1).reduce((value, close) => alpha * close + (1 - alpha) * value, values[0] || 0);
    };
    return { atr, rsi, ema21: ema(21), ema55: ema(55) };
}

function formatAge(seconds: number) {
    if (seconds < 60) return `${seconds} dtk`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} mnt`;
    if (seconds < 86_400) return `${Math.floor(seconds / 3600)} jam`;
    return `${Math.floor(seconds / 86_400)} hari`;
}

export default function ArraCronosPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('commodities');
    const [selectedSymbol, setSelectedSymbol] = useState('XAUUSD');
    const [timeframe, setTimeframe] = useState<(typeof TIMEFRAMES)[number]['id']>('1h');
    const [search, setSearch] = useState('');
    const [market, setMarket] = useState<MarketData | null>(null);
    const [forecast, setForecast] = useState<ForecastData | null>(null);
    const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isForecasting, setIsForecasting] = useState(false);
    const [marketError, setMarketError] = useState('');
    const [forecastError, setForecastError] = useState('');
    const [chartMode, setChartMode] = useState<ChartMode>('tradingview');

    const visibleAssets = useMemo(() => {
        const list = categories.find((category) => category.id === selectedCategory)?.pairs || [];
        const query = search.trim().toLowerCase();
        return query ? list.filter((asset) => asset.symbol.toLowerCase().includes(query) || asset.name.toLowerCase().includes(query)) : list;
    }, [categories, selectedCategory, search]);

    const activeAsset: Instrument | undefined = useMemo(
        () => categories.flatMap((category) => category.pairs).find((asset) => asset.symbol === selectedSymbol),
        [categories, selectedSymbol],
    );

    const isForecastingRef = useRef(false);

    const loadStatus = useCallback(async () => {
        try {
            const response = await fetch('/api/arra-cronos/status', { cache: 'no-store' });
            const status = await response.json();
            setModelStatus(status);
        } catch {
            setModelStatus({ available: false, model: 'Kronos-base', status: 'offline', message: 'Status model tidak bisa dibaca.' });
        }
    }, []);

    const runForecast = useCallback(async (sym: string, tf: string) => {
        if (isForecastingRef.current) return;
        isForecastingRef.current = true;
        setIsForecasting(true);
        setForecastError('');
        try {
            const response = await fetch('/api/arra-cronos/forecast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol: sym, timeframe: tf }),
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error || 'Forecast model tidak tersedia.');
            setForecast(payload);
        } catch (error) {
            setForecastError(error instanceof Error ? error.message : 'Forecast model tidak tersedia.');
        } finally {
            isForecastingRef.current = false;
            setIsForecasting(false);
        }
    }, []);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await loadStatus();
        try {
            const response = await fetch(`/api/arra-cronos/market?symbol=${encodeURIComponent(selectedSymbol)}&timeframe=${timeframe}`, { cache: 'no-store' });
            const payload = await response.json();
            if (response.ok && payload && !payload.error) {
                setMarket(payload);
                await runForecast(selectedSymbol, timeframe);
            }
        } catch {
            // ignore
        } finally {
            setIsRefreshing(false);
        }
    }, [selectedSymbol, timeframe, loadStatus, runForecast]);

    useEffect(() => {
        let live = true;
        fetch('/api/arra-cronos/catalog', { cache: 'no-store' })
            .then((response) => response.json())
            .then((payload) => { if (live) setCategories(payload.categories || []); })
            .catch(() => undefined);
        loadStatus();
        return () => { live = false; };
    }, [loadStatus]);

    useEffect(() => {
        const interval = window.setInterval(loadStatus, 60_000);
        return () => window.clearInterval(interval);
    }, [loadStatus]);

    useEffect(() => {
        if (!categories.length) return;
        const found = categories.some((category) => category.pairs.some((asset) => asset.symbol === selectedSymbol));
        if (!found) setSelectedSymbol(categories.find((category) => category.id === selectedCategory)?.pairs[0]?.symbol || 'EURUSD');
    }, [categories, selectedCategory, selectedSymbol]);

    // Single stable effect for fetching market & forecast with NO infinite re-render loop
    useEffect(() => {
        if (!categories.length) return;
        let cancelled = false;

        async function load() {
            setMarketError('');
            // Only show loader if we have no market data yet
            setIsLoading((prev) => (market ? false : true));

            try {
                const response = await fetch(`/api/arra-cronos/market?symbol=${encodeURIComponent(selectedSymbol)}&timeframe=${timeframe}`, { cache: 'no-store' });
                const payload = await response.json();
                if (cancelled) return;
                if (!response.ok) throw new Error(payload.error || 'Data harga belum tersedia.');
                setMarket(payload);
                setIsLoading(false);

                // Auto calculate Kronos forecast smoothly
                runForecast(selectedSymbol, timeframe);
            } catch (error) {
                if (cancelled) return;
                const message = error instanceof Error ? error.message : 'Analisis gagal dimuat.';
                setMarketError(message);
                setIsLoading(false);
            }
        }

        load();

        const interval = window.setInterval(() => {
            fetch(`/api/arra-cronos/market?symbol=${encodeURIComponent(selectedSymbol)}&timeframe=${timeframe}`, { cache: 'no-store' })
                .then((r) => r.json())
                .then((payload) => {
                    if (!cancelled && payload && !payload.error) {
                        setMarket(payload);
                    }
                })
                .catch(() => undefined);
        }, 5 * 60_000);

        return () => {
            cancelled = true;
            window.clearInterval(interval);
        };
    }, [categories.length, selectedSymbol, timeframe, runForecast]);

    const metrics = useMemo(() => market ? calculateMetrics(market.candles) : null, [market]);
    const currentPrice = market?.currentPrice || 0;
    const forecastBase = forecast?.currentPrice || market?.latestBarClose || currentPrice;
    const rawMove = forecast ? forecast.targetPrice - forecastBase : 0;
    const modelBias = forecast?.direction || null;
    const action: 'BUY' | 'SELL' | 'WAIT' | null = forecast && metrics
        ? Math.abs(rawMove) >= metrics.atr * 0.2 ? rawMove > 0 ? 'BUY' : 'SELL' : 'WAIT'
        : null;
    const entry = action && action !== 'WAIT' ? forecastBase : null;
    const stop = action === 'BUY' && metrics ? forecastBase - metrics.atr * 1.3 : action === 'SELL' && metrics ? forecastBase + metrics.atr * 1.3 : null;
    const target = action && action !== 'WAIT' ? forecast?.targetPrice || null : null;
    const movePct = forecastBase && forecast ? rawMove / forecastBase * 100 : 0;
    const upColor = 'text-emerald-300';
    const downColor = 'text-rose-300';
    const price = (value: number) => formatPrice(selectedSymbol, value);
    const selectedCategoryName = CATEGORY_SHORT[selectedCategory] || 'PASAR';

    return (
        <main className="min-h-screen bg-[#070b12] px-3 pb-10 pt-24 text-slate-100 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-[1600px]">
                <header className="mb-5 flex flex-col justify-between gap-4 border-b border-slate-800/90 pb-5 sm:flex-row sm:items-end">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.28em] text-cyan-300"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_14px_#67e8f9]" /> PICA QUANT · MULTI-ASSET DESK</div>
                        <h1 className="text-3xl font-black tracking-tight text-white sm:text-[38px]">ARRA <span className="bg-gradient-to-r from-cyan-200 via-blue-300 to-violet-300 bg-clip-text text-transparent">Cronos</span></h1>
                        <p className="mt-1 text-sm text-slate-400">OHLCV forecast engine untuk berbagai pasar · TradingView Realtime · Kronos-base model.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-bold ${modelStatus?.available ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200' : 'border-amber-300/20 bg-amber-300/10 text-amber-100'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${modelStatus?.available ? 'bg-emerald-300' : 'bg-amber-300'}`} />
                            {modelStatus?.available ? 'MODEL ONLINE' : 'MODEL SERVICE OFFLINE'}
                        </div>
                        <div className="inline-flex items-center gap-1 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-2 text-[11px] font-bold text-blue-200">
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                            TradingView
                        </div>
                        <button onClick={handleRefresh} disabled={isRefreshing || isLoading} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/40 hover:text-cyan-100 disabled:opacity-50">
                            <ArrowPathIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
                        </button>
                    </div>
                </header>

                <div className="grid items-start gap-4 xl:grid-cols-[255px_minmax(0,1fr)]">
                    <aside className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0b111b]">
                        <div className="border-b border-slate-800 p-4">
                            <div className="mb-3 flex items-center justify-between"><div><div className="text-[10px] font-bold uppercase tracking-[.2em] text-slate-500">Market universe</div><div className="mt-1 text-sm font-bold text-slate-100">Pilih instrumen</div></div><ChevronDownIcon className="h-4 w-4 text-slate-500" /></div>
                            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-[#080d15] px-3 py-2.5"><MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-slate-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari simbol / market" className="min-w-0 flex-1 bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-600" /></div>
                        </div>
                        <nav className="flex gap-1 overflow-x-auto border-b border-slate-800 p-2 xl:flex-col xl:overflow-visible" aria-label="Kelas aset">
                            {categories.map((category) => <button key={category.id} onClick={() => { setSelectedCategory(category.id); setSearch(''); }} className={`whitespace-nowrap rounded-lg px-2.5 py-2 text-left text-[10px] font-bold tracking-wide transition ${selectedCategory === category.id ? 'bg-cyan-300/10 text-cyan-200 ring-1 ring-inset ring-cyan-300/20' : 'text-slate-500 hover:bg-slate-800/60 hover:text-slate-200'}`}>{CATEGORY_SHORT[category.id] || category.name.toUpperCase()} <span className="ml-1 text-slate-600">{category.pairs.length}</span></button>)}
                        </nav>
                        <div className="max-h-[390px] overflow-y-auto p-2">
                            {visibleAssets.map((asset) => {
                                const selected = selectedSymbol === asset.symbol;
                                return <button key={asset.symbol} onClick={() => setSelectedSymbol(asset.symbol)} className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition ${selected ? 'bg-[#142335] ring-1 ring-inset ring-cyan-300/25' : 'hover:bg-slate-900'}`}><span className="min-w-0"><span className={`block text-xs font-bold ${selected ? 'text-white' : 'text-slate-300'}`}>{asset.symbol}</span><span className="mt-0.5 block truncate text-[10px] text-slate-600">{asset.name}</span></span><span className={`ml-2 h-1.5 w-1.5 shrink-0 rounded-full ${selected ? 'bg-cyan-300' : 'bg-slate-700'}`} /></button>;
                            })}
                            {visibleAssets.length === 0 && <div className="px-3 py-8 text-center text-xs text-slate-600">Market tidak ditemukan.</div>}
                        </div>
                        <div className="border-t border-slate-800 px-4 py-3 text-[10px] text-slate-600">{visibleAssets.length} instrumen · {selectedCategoryName}</div>
                    </aside>

                    <section className="min-w-0 space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                            <div className="rounded-2xl border border-slate-800 bg-[#0b111b] p-4 sm:col-span-2 2xl:col-span-1">
                                <div className="flex items-start justify-between gap-2"><div><div className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-500">Instrumen aktif</div><div className="mt-1 text-xl font-extrabold text-white">{activeAsset?.symbol || selectedSymbol}</div><div className="text-[11px] text-slate-500">{activeAsset?.name}</div></div><span className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[9px] font-bold text-slate-400">{selectedCategoryName}</span></div>
                                <div className="mt-4 flex items-end justify-between gap-2"><div className="text-[25px] font-bold tracking-tight text-slate-50">{market ? price(currentPrice) : '—'}</div><div className={`pb-1 text-xs font-bold ${market && market.changePercent >= 0 ? upColor : downColor}`}>{market ? `${market.changePercent >= 0 ? '+' : ''}${market.changePercent.toFixed(2)}%` : 'Menunggu feed'}</div></div>
                                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-600"><SignalIcon className="h-3.5 w-3.5" />{market?.source || 'Sumber harga'}</div>
                            </div>
                            <div className="rounded-2xl border border-slate-800 bg-[#0b111b] p-4">
                                <div className="mb-3 text-[10px] font-bold uppercase tracking-[.18em] text-slate-500">Model bias</div>
                                <div className="flex items-center gap-3">{modelBias === 'UP' ? <ArrowTrendingUpIcon className="h-8 w-8 text-emerald-300" /> : modelBias === 'DOWN' ? <ArrowTrendingDownIcon className="h-8 w-8 text-rose-300" /> : <BoltIcon className="h-8 w-8 text-slate-500" />}<div><div className={`text-xl font-black ${modelBias === 'UP' ? upColor : modelBias === 'DOWN' ? downColor : 'text-slate-400'}`}>{modelBias || (isForecasting ? 'MENGHITUNG…' : modelStatus?.available ? 'SIAP' : 'OFFLINE')}</div><div className="mt-0.5 text-[10px] text-slate-600">{forecast ? `${forecast.forecast.length} candle ke depan` : 'Arah diambil dari forecast model'}</div></div></div>
                            </div>
                            <div className="rounded-2xl border border-slate-800 bg-[#0b111b] p-4">
                                <div className="mb-3 text-[10px] font-bold uppercase tracking-[.18em] text-slate-500">Forecast target</div>
                                <div className="text-xl font-extrabold text-white">{forecast ? price(forecast.targetPrice) : '—'}</div>
                                <div className={`mt-1 text-[11px] font-bold ${rawMove >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{forecast ? `${rawMove >= 0 ? '+' : ''}${price(rawMove)} · ${movePct >= 0 ? '+' : ''}${movePct.toFixed(2)}%` : isForecasting ? 'Menghitung target…' : 'Siap dihitung'}</div>
                            </div>
                            <div className="rounded-2xl border border-slate-800 bg-[#0b111b] p-4">
                                <div className="mb-3 text-[10px] font-bold uppercase tracking-[.18em] text-slate-500">Action layer</div>
                                <div className={`text-xl font-black ${action === 'BUY' ? upColor : action === 'SELL' ? downColor : 'text-amber-200'}`}>{action || 'WAIT'}</div>
                                <div className="mt-1 text-[10px] leading-relaxed text-slate-600">{action ? 'Ambang gerak model vs ATR referensi' : 'Belum ada setup terkonfirmasi'}</div>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0b111b]">
                            <div className="flex flex-col justify-between gap-4 border-b border-slate-800 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
                            <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-200"><ChartBarIcon className="h-5 w-5" /></div><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-extrabold text-white">{selectedSymbol} <span className="text-slate-700">/</span> TradingView Realtime</h2>{market && <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${market.isFresh ? 'bg-emerald-300/10 text-emerald-300' : 'bg-amber-300/10 text-amber-200'}`}>{market.isFresh ? 'DATA FRESH' : `DATA ${formatAge(market.freshnessSeconds)} LALU`}</span>}{market && <span className="rounded-full bg-blue-400/10 px-2 py-0.5 text-[9px] font-bold text-blue-300">{market.source}</span>}</div><p className="mt-1 text-[10px] text-slate-600">Provider: TradingView{market ? ` · ${market.tvSymbol || market.feedSymbol} · ${market.count} candle historis` : ' · realtime chart feed'}</p></div></div>
                                <div className="flex items-center gap-2">
                                    {/* Chart Mode Toggle */}
                                    <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-[#080d15] p-1">
                                        <button onClick={() => setChartMode('tradingview')} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition ${chartMode === 'tradingview' ? 'bg-blue-500/20 text-blue-200 shadow ring-1 ring-blue-400/30' : 'text-slate-500 hover:text-slate-200'}`}>
                                            <svg className="mr-1 inline-block h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                                            TV
                                        </button>
                                        <button onClick={() => setChartMode('lightweight')} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition ${chartMode === 'lightweight' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-200'}`}>LW</button>
                                    </div>
                                    {/* Timeframe Selector */}
                                    <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-[#080d15] p-1">{TIMEFRAMES.map((item) => <button key={item.id} onClick={() => setTimeframe(item.id)} className={`rounded-lg px-3 py-1.5 text-[10px] font-bold transition ${timeframe === item.id ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-200'}`}>{item.label}</button>)}</div>
                                </div>
                            </div>
                            <div className="relative bg-[#0b111b]">
                                {/* TradingView Mode */}
                                {chartMode === 'tradingview' && market && !marketError && (
                                    <TradingViewCronosChart
                                        symbol={selectedSymbol}
                                        tvSymbol={market.tvSymbol || `OANDA:${selectedSymbol}`}
                                        timeframe={timeframe}
                                        forecast={forecast?.forecast || []}
                                        action={action}
                                        entry={entry}
                                        stop={stop}
                                        target={target}
                                        formatPrice={(value) => formatPrice(selectedSymbol, value)}
                                    />
                                )}
                                {/* Lightweight Charts Mode (with forecast overlay) */}
                                {chartMode === 'lightweight' && market && !marketError && <CronosChart candles={market.candles} forecast={forecast?.forecast || []} action={action} entry={entry} stop={stop} target={target} formatPrice={(value) => formatPrice(selectedSymbol, value)} />}
                                {(isLoading || (!market && !marketError)) && <div className="flex h-[390px] items-center justify-center text-xs text-slate-500"><ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />Mengambil candle realtime dari TradingView…</div>}
                                {marketError && <div className="flex h-[390px] flex-col items-center justify-center px-6 text-center"><SignalIcon className="mb-3 h-8 w-8 text-amber-300" /><div className="text-sm font-bold text-slate-200">Data chart tidak tersedia</div><p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-500">{marketError} Candle simulasi tidak digunakan.</p><button onClick={handleRefresh} className="mt-4 rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300">Coba lagi</button></div>}
                            </div>
                            <div className="grid grid-cols-2 border-t border-slate-800 md:grid-cols-4">
                                <div className="border-b border-r border-slate-800 px-4 py-3 md:border-b-0"><div className="text-[9px] font-bold uppercase tracking-[.16em] text-slate-600">RSI (14)</div><div className="mt-1 text-sm font-bold text-slate-200">{metrics ? metrics.rsi.toFixed(1) : '—'} <span className="ml-1 text-[9px] font-medium text-slate-600">{metrics ? metrics.rsi > 70 ? 'OVERBOUGHT' : metrics.rsi < 30 ? 'OVERSOLD' : 'NEUTRAL' : ''}</span></div></div>
                                <div className="border-b border-slate-800 px-4 py-3 md:border-b-0 md:border-r"><div className="text-[9px] font-bold uppercase tracking-[.16em] text-slate-600">ATR (14)</div><div className="mt-1 text-sm font-bold text-slate-200">{metrics ? price(metrics.atr) : '—'} <span className="ml-1 text-[9px] font-medium text-slate-600">VOLATILITAS</span></div></div>
                                <div className="border-r border-slate-800 px-4 py-3"><div className="text-[9px] font-bold uppercase tracking-[.16em] text-slate-600">EMA TREND</div><div className="mt-1 text-sm font-bold text-slate-200">{metrics && market ? metrics.ema21 > metrics.ema55 ? <span className="text-emerald-300">BULLISH</span> : metrics.ema21 < metrics.ema55 ? <span className="text-rose-300">BEARISH</span> : 'FLAT' : '—'} <span className="ml-1 text-[9px] font-medium text-slate-600">21 / 55</span></div></div>
                                <div className="px-4 py-3"><div className="text-[9px] font-bold uppercase tracking-[.16em] text-slate-600">CANDLE TERBARU</div><div className="mt-1 text-sm font-bold text-slate-200">{market ? formatAge(market.freshnessSeconds) : '—'} <span className="ml-1 text-[9px] font-medium text-slate-600">LALU</span></div></div>
                            </div>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
                            <div className="rounded-2xl border border-slate-800 bg-[#0b111b] p-4 sm:p-5">
                                <div className="mb-4 flex items-center justify-between"><div><div className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-500">Trade levels</div><h3 className="mt-1 text-sm font-extrabold text-white">Konteks eksekusi pada chart</h3></div><span className="rounded-full border border-slate-700 px-2 py-1 text-[9px] font-bold text-slate-500">ATR REFERENCE</span></div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="rounded-xl border border-slate-800 bg-[#080d15] p-3"><div className="text-[9px] font-bold uppercase tracking-wide text-slate-600">Entry</div><div className="mt-2 text-sm font-bold text-white">{entry ? price(entry) : '—'}</div></div>
                                    <div className="rounded-xl border border-rose-300/10 bg-rose-300/[.04] p-3"><div className="text-[9px] font-bold uppercase tracking-wide text-rose-300/60">Reference stop</div><div className="mt-2 text-sm font-bold text-rose-200">{stop ? price(stop) : '—'}</div></div>
                                    <div className="rounded-xl border border-emerald-300/10 bg-emerald-300/[.04] p-3"><div className="text-[9px] font-bold uppercase tracking-wide text-emerald-300/60">Model target</div><div className="mt-2 text-sm font-bold text-emerald-200">{target ? price(target) : '—'}</div></div>
                                </div>
                                <p className="mt-3 text-[10px] leading-relaxed text-slate-600">Target mengikuti candle forecast paling jauh. Stop memakai 1,3× ATR sebagai level referensi; level ini bukan hasil backtest strategi dan tidak menjamin risiko atau profit.</p>
                            </div>
                            <div className="rounded-2xl border border-slate-800 bg-[#0b111b] p-4 sm:p-5">
                                <div className="mb-4 flex items-center gap-2"><CpuChipIcon className="h-4 w-4 text-cyan-200" /><div><div className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-500">Inference status</div><h3 className="mt-1 text-sm font-extrabold text-white">{modelStatus?.model || 'ARRA Cronos / Kronos-base'}</h3></div></div>
                                {forecast ? <div className="grid grid-cols-2 gap-2"><div className="rounded-xl bg-[#080d15] p-3"><div className="text-[9px] uppercase tracking-wide text-slate-600">Model path</div><div className="mt-1 text-sm font-bold text-slate-200">{forecast.forecast.length} bars</div></div><div className="rounded-xl bg-[#080d15] p-3"><div className="text-[9px] uppercase tracking-wide text-slate-600">Inference</div><div className="mt-1 text-sm font-bold text-slate-200">{(forecast.inferenceMs / 1000).toFixed(1)}s</div></div></div> : <div className="rounded-xl border border-dashed border-slate-800 bg-[#080d15] p-3 text-xs leading-relaxed text-slate-500">{forecastError || (modelStatus?.available ? 'Model siap. Forecast memakai kuota analisis akun Anda.' : modelStatus?.message || 'Memeriksa status model…')}</div>}
                                <button onClick={() => runForecast(selectedSymbol, timeframe)} disabled={!modelStatus?.available || !market || isForecasting} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-200 px-3 py-2.5 text-xs font-extrabold text-slate-950 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"><CpuChipIcon className={`h-4 w-4 ${isForecasting ? 'animate-pulse' : ''}`} />{isForecasting ? 'Menghitung forecast…' : forecast ? 'Jalankan ulang forecast' : 'Buat forecast Kronos'}</button>
                                {market && <p className="mt-3 text-[10px] leading-relaxed text-slate-600">Cakupan volume positif pada riwayat: {market.volumeCoverage}%. Feed forex umumnya tidak memiliki volume terpusat; model menerima volume nol pada candle tanpa data volume.</p>}
                                <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-600"><ClockIcon className="h-3.5 w-3.5" />{forecast ? `Dibuat ${new Date(forecast.generatedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB` : isForecasting ? 'Memproses jalur forecast…' : 'Jalur forecast akan digambar pada chart.'}</div>
                            </div>
                        </div>

                        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-800 bg-[#0b111b] px-4 py-4 sm:flex-row sm:items-center sm:px-5">
                            <div><div className="text-xs font-bold text-slate-200">ARRA Cronos · Powered by TradingView</div><p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-slate-600">Chart realtime menggunakan TradingView Advanced Chart. Forecast Kronos-base dari model PyTorch terpisah — hasilnya ditampilkan sebagai overlay pada chart. Pine Script indikator juga tersedia untuk running langsung di TradingView.</p></div>
                            <div className="flex shrink-0 gap-2"><Link href="/indicators/arra-cronos" className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-3.5 py-2.5 text-[10px] font-bold text-cyan-100 transition hover:bg-cyan-300/15">Lihat indikator Pine</Link><Link href="/pricing" className="rounded-xl bg-slate-100 px-3.5 py-2.5 text-[10px] font-bold text-slate-950 transition hover:bg-white">Paket PICA</Link></div>
                        </div>
                    </section>
                </div>

                <footer className="mt-5 flex flex-col gap-2 text-[9px] leading-relaxed text-slate-700 sm:flex-row sm:justify-between"><span>Chart realtime dari TradingView. OHLCV untuk inference Kronos diambil server-side dari TradingView UDF/Binance/Yahoo sebagai backup.</span><span>Forecast eksperimental · Kronos-base model · Bukan nasihat finansial atau jaminan hasil.</span></footer>
            </div>
        </main>
    );
}
