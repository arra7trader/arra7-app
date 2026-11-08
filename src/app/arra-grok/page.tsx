'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { usePicaDevice } from '@/context/PicaDeviceContext';
import { isAdminEmail, isAdminUser } from '@/lib/admin-access';
import {
    ArrowPathIcon,
    BoltIcon,
    ClipboardDocumentCheckIcon,
    ClipboardDocumentIcon,
    KeyIcon,
    LockClosedIcon,
    PencilSquareIcon,
    ArrowDownTrayIcon,
    InformationCircleIcon,
    CheckCircleIcon,
    SparklesIcon,
} from '@heroicons/react/24/outline';

interface LogItem {
    id: string;
    time: string;
    type: 'SIGNAL' | 'SKIP';
    symbol: string;
    reason: string;
    result: string;
}

interface TradeSetup {
    symbol: string;
    name: string;
    type: 'SHORT' | 'LONG' | 'WAIT';
    entry: number | null;
    current: number;
    stopLoss: number | null;
    takeProfit: number | null;
    sizeLots: number;
    sizePct: string;
    reason: string;
}

// Check if Forex & Gold markets are closed for the weekend (Friday 22:00 UTC to Sunday 22:00 UTC / Mon 05:00 WIB)
function checkIsWeekendMarket() {
    const now = new Date();
    const day = now.getUTCDay(); // 0 = Sun, 6 = Sat
    const hour = now.getUTCHours();
    if (day === 6) return true; // Saturday all day
    if (day === 0 && hour < 22) return true; // Sunday before 22:00 UTC (05:00 WIB Monday)
    if (day === 5 && hour >= 22) return true; // Friday after 22:00 UTC
    return false;
}

export default function ArraGrokPage() {
    const { data: session } = useSession();
    const { tier, openActivation, deviceId } = usePicaDevice();

    const [hasLocalUnlock, setHasLocalUnlock] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const local = localStorage.getItem('pica_arra_cronos_unlocked') === 'true';
            if (local) setHasLocalUnlock(true);
        }
    }, []);

    const isAdmin =
        Boolean(isAdminUser(session?.user)) ||
        Boolean(isAdminEmail(session?.user?.email)) ||
        session?.user?.isAdmin === true ||
        (session?.user as any)?.role === 'ADMIN' ||
        (session?.user as any)?.tier === 'ADMIN';

    const isUnlocked =
        isAdmin ||
        hasLocalUnlock ||
        tier === 'PRO' ||
        tier === 'VVIP' ||
        session?.user?.tier === 'PRO' ||
        session?.user?.tier === 'VVIP' ||
        (session?.user as any)?.plan === 'ARRA_CRONOS' ||
        (session?.user as any)?.plan === 'ALL_ACCESS';

    // Terminal Engine State
    const [isRunning, setIsRunning] = useState(true);
    const [seconds, setSeconds] = useState(0);
    const [copiedScript, setCopiedScript] = useState(false);
    const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('');

    // Market hours are also reported by the live API; this local value is used before the first response.
    const isWeekend = checkIsWeekendMarket();
    // Active Pair Selection: Default to BTCUSD if weekend (since BTC operates 24/7 non-stop!)
    const [selectedPair, setSelectedPair] = useState<'BTCUSD' | 'XAUUSD'>('BTCUSD');

    // Customizable User Capital ("Versi Kita Sendiri") — Default requested $1,254
    const [baseCapital, setBaseCapital] = useState<number>(1254);
    const [isCapitalModalOpen, setIsCapitalModalOpen] = useState(false);
    const [inputCapital, setInputCapital] = useState('1254');
    const [activeTrade, setActiveTrade] = useState<TradeSetup>({
        symbol: '$BTCUSD',
        name: 'Bitcoin / US Dollar',
        type: 'WAIT',
        entry: null,
        current: 0,
        stopLoss: null,
        takeProfit: null,
        sizeLots: 0,
        sizePct: '—',
        reason: 'Menunggu feed dan analisis pasar.',
    });
    const [hasFeed, setHasFeed] = useState(false);
    const [feedError, setFeedError] = useState('');
    const [feedSource, setFeedSource] = useState('');
    const [feedIsFresh, setFeedIsFresh] = useState<boolean | null>(null);
    const [groqReview, setGroqReview] = useState('');
    const [groqReviewError, setGroqReviewError] = useState('');
    const [groqReviewModel, setGroqReviewModel] = useState('');
    const [isReviewingWithGroq, setIsReviewingWithGroq] = useState(false);
    const liveRequestId = useRef(0);
    const hasActionableAnalysis = isRunning && hasFeed && feedIsFresh === true && activeTrade.type !== 'WAIT';

    const handleToggleFeed = () => {
        if (isRunning) {
            setFeedIsFresh(false);
            setActiveTrade((previous) => ({
                ...previous,
                type: 'WAIT',
                entry: null,
                stopLoss: null,
                takeProfit: null,
                sizeLots: 0,
                sizePct: '—',
                reason: 'Pembaruan feed dijeda. Setup ditahan sampai feed segar dimuat.',
            }));
            setIsRunning(false);
            return;
        }
        setIsRunning(true);
    };

    // Scanned asset prices are provided by the API; unavailable prices stay null.
    const [scannedAssets, setScannedAssets] = useState<Array<{
        sym: string;
        name?: string;
        price: number | null;
        change: number | null;
        note: string;
        dot: string;
        status: string;
        is24_7?: boolean;
    }>>([]);

    const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
    const [logHistory, setLogHistory] = useState<LogItem[]>([]);

    const handleSelectPair = useCallback((pair: 'BTCUSD' | 'XAUUSD') => {
        if (pair === selectedPair) return;
        liveRequestId.current += 1;
        setSelectedPair(pair);
        setHasFeed(false);
        setFeedIsFresh(null);
        setFeedError('');
        setFeedSource('');
        setScannedAssets([]);
        setTerminalLogs([]);
        setLogHistory([]);
        setGroqReview('');
        setGroqReviewError('');
        setActiveTrade({
            symbol: `$${pair}`,
            name: pair === 'BTCUSD' ? 'Bitcoin / US Dollar' : 'Gold / US Dollar',
            type: 'WAIT',
            entry: null,
            current: 0,
            stopLoss: null,
            takeProfit: null,
            sizeLots: 0,
            sizePct: '—',
            reason: 'Menunggu feed dan analisis pasar.',
        });
    }, [selectedPair]);

    const handleGroqReview = useCallback(async () => {
        setIsReviewingWithGroq(true);
        setGroqReviewError('');
        try {
            const response = await fetch('/api/arra-grok/review', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(deviceId ? { 'x-device-id': deviceId } : {}),
                },
                body: JSON.stringify({ symbol: selectedPair }),
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error || 'Review Groq belum tersedia.');
            setGroqReview(payload.review || 'Groq tidak mengembalikan ulasan.');
            setGroqReviewModel(payload.model || 'Groq');
        } catch (error) {
            setGroqReviewError(error instanceof Error ? error.message : 'Review Groq gagal diproses.');
        } finally {
            setIsReviewingWithGroq(false);
        }
    }, [deviceId, selectedPair]);

    // Initialize persisted session from localStorage (defaulting to user requested $1,254)
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const savedCapital = localStorage.getItem('arra_grok_capital');
        if (savedCapital) {
            const cap = parseFloat(savedCapital);
            if (!isNaN(cap) && cap > 0 && cap !== 10000) {
                setBaseCapital(cap);
                setInputCapital(cap.toString());
            } else {
                setBaseCapital(1254);
                setInputCapital('1254');
                localStorage.setItem('arra_grok_capital', '1254');
            }
        } else {
            setBaseCapital(1254);
            setInputCapital('1254');
            localStorage.setItem('arra_grok_capital', '1254');
        }
    }, []);

    // Save the user's reference capital only. It is not a connected broker balance.
    useEffect(() => {
        if (typeof window === 'undefined') return;
        localStorage.setItem('arra_grok_capital', baseCapital.toString());
    }, [baseCapital]);

    // Format current clock HH:MM:SS WIB
    const formattedClock = useMemo(() => {
        const d = new Date();
        const hh = d.getHours().toString().padStart(2, '0');
        const mm = d.getMinutes().toString().padStart(2, '0');
        const ss = d.getSeconds().toString().padStart(2, '0');
        return `${hh}:${mm}:${ss}`;
    }, [seconds]);

    // Fetch REAL market data from ARRA GROK Live API
    const fetchLiveFeed = useCallback(async () => {
        if (!isRunning) return;
        const requestId = ++liveRequestId.current;
        const clearUnavailableFeed = (message: string) => {
            setFeedError(message);
            setHasFeed(false);
            setFeedIsFresh(false);
            setFeedSource('');
            setLastRefreshedAt('');
            setScannedAssets([]);
            setTerminalLogs([]);
            setActiveTrade({
                symbol: `$${selectedPair}`,
                name: selectedPair === 'BTCUSD' ? 'Bitcoin / US Dollar' : 'Gold / US Dollar',
                type: 'WAIT',
                entry: null,
                current: 0,
                stopLoss: null,
                takeProfit: null,
                sizeLots: 0,
                sizePct: '—',
                reason: message,
            });
        };
        try {
            const res = await fetch(`/api/arra-grok/live?capital=${baseCapital}&symbol=${selectedPair}`, { cache: 'no-store' });
            const data = await res.json();
            if (requestId !== liveRequestId.current) return;
            if (!res.ok || !data.success) {
                clearUnavailableFeed(data.error || 'Feed pasar sementara tidak tersedia.');
                return;
            }
            setFeedError('');
            setHasFeed(true);
            setFeedSource(data.marketSnapshot?.source || '');
            setFeedIsFresh(Boolean(data.marketSnapshot?.isFresh));
            setLastRefreshedAt(data.marketSnapshot?.quoteTimeWib || '');
            if (data.activeTrade) {
                setActiveTrade({
                    symbol: data.activeTrade.symbol,
                    name: data.activeTrade.name,
                    type: data.activeTrade.type,
                    entry: data.activeTrade.entry,
                    current: data.activeTrade.current,
                    stopLoss: data.activeTrade.stopLoss,
                    takeProfit: data.activeTrade.takeProfit,
                    sizeLots: data.activeTrade.sizeLots,
                    sizePct: data.activeTrade.sizePct,
                    reason: data.activeTrade.reason,
                });
            }
            if (data.scannedAssets && Array.isArray(data.scannedAssets)) {
                setScannedAssets(data.scannedAssets);
            }
            setTerminalLogs(Array.isArray(data.terminalLogs) ? data.terminalLogs : []);
            const newLogItem: LogItem = {
                id: `${selectedPair}-${data.updatedAt}`,
                time: data.timeWib || '',
                type: data.activeTrade?.type === 'WAIT' ? 'SKIP' : 'SIGNAL',
                symbol: data.activeTrade?.symbol || `$${selectedPair}`,
                reason: data.activeTrade?.reason || 'Analisis belum tersedia.',
                result: data.activeTrade?.type === 'WAIT' ? 'WAIT' : `${data.activeTrade.entry}`,
            };
            setLogHistory((previous) => [newLogItem, ...previous].slice(0, 40));
        } catch (err) {
            if (requestId !== liveRequestId.current) return;
            clearUnavailableFeed('Koneksi feed pasar terputus. Coba perbarui feed.');
            console.error('[ARRA GROK] Error polling real feed:', err);
        }
    }, [isRunning, baseCapital, selectedPair]);

    // Initial load and periodic poll
    useEffect(() => {
        if (!isUnlocked) return;
        fetchLiveFeed();
        const pollRate = selectedPair === 'BTCUSD' ? 5000 : (isWeekend ? 15000 : 5000);
        const interval = window.setInterval(fetchLiveFeed, pollRate);
        return () => {
            window.clearInterval(interval);
            liveRequestId.current += 1;
        };
    }, [isUnlocked, fetchLiveFeed, isWeekend, selectedPair]);

    // Clock timer (every 1 second)
    useEffect(() => {
        if (!isRunning || !isUnlocked) return;
        const interval = window.setInterval(() => {
            setSeconds((prev) => prev + 1);
        }, 1000);
        return () => window.clearInterval(interval);
    }, [isRunning, isUnlocked]);

    // Handle User Changing Custom Starting Capital ("Versi Kita Sendiri")
    const handleSaveCapital = () => {
        const val = parseFloat(inputCapital);
        if (!isNaN(val) && val >= 10) {
            setBaseCapital(val);
            localStorage.setItem('arra_grok_capital', val.toString());
            setIsCapitalModalOpen(false);
            fetchLiveFeed();
        }
    };

    // Download audit log text file
    const handleDownloadLog = () => {
        const header = `=== ARRA GROK MARKET ANALYSIS ===\nDate: ${new Date().toLocaleString('id-ID')}\nPair: ${selectedPair} (${selectedPair === 'BTCUSD' ? '24/7 Crypto' : 'Forex/Gold'})\nReference Capital: $${baseCapital.toFixed(2)}\nMarket Data: ${feedSource || 'unavailable'} · ${feedIsFresh ? 'fresh' : 'stale/unavailable'}\nOrder execution: not connected\n\n--- ANALYSIS LOG ---\n`;
        const body = logHistory.map((l) => `[${l.time}] ${l.type.padEnd(8)} ${l.symbol.padEnd(9)} ${l.result.padEnd(12)} Reason: ${l.reason}`).join('\n');
        const blob = new Blob([header + body], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `arra-grok-${selectedPair}-log-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Copy an MQL5 script for manual review; this does not send an order to a broker.
    const handleCopyMT5Script = useCallback(() => {
        if (!hasActionableAnalysis || activeTrade.entry === null || activeTrade.stopLoss === null || activeTrade.takeProfit === null) return;
        const sym = activeTrade.symbol.replace('$', '');
        const script = `// --- ARRA GROK MQL5 SIGNAL SNAPSHOT ---
// Review only. This script does not submit an order.
// Reference capital (not read from broker): $${baseCapital.toFixed(2)}
// Asset: ${sym} (${activeTrade.name})
// Reason: ${activeTrade.reason}
#property strict
void OnStart()
{
    Print("ARRA GROK analysis snapshot; no broker order was sent.");
    Print("Symbol: ${sym}");
    Print("Action: ${activeTrade.type}");
    Print("Reference entry: ${activeTrade.entry}");
    Print("Stop loss: ${activeTrade.stopLoss}");
    Print("Take profit: ${activeTrade.takeProfit}");
    Print("Estimated volume: ${activeTrade.sizeLots}");
}`;
        void navigator.clipboard.writeText(script).then(() => {
            setCopiedScript(true);
            window.setTimeout(() => setCopiedScript(false), 2500);
        }).catch(() => setFeedError('Clipboard tidak tersedia. Izinkan akses clipboard lalu coba lagi.'));
    }, [activeTrade, baseCapital, hasActionableAnalysis]);

    return (
        <main className="min-h-screen bg-[#F2F2EE] px-3 pb-16 pt-24 text-slate-800 sm:px-6 lg:px-8 font-sans selection:bg-cyan-200">
            {/* PAYWALL LOCK MODAL/CONTAINER IF NOT UNLOCKED */}
            {!isUnlocked && (
                <div className="mx-auto max-w-4xl mb-8 overflow-hidden rounded-3xl border border-cyan-500/40 bg-gradient-to-br from-[#0c1a2e] via-[#091220] to-[#141029] p-6 sm:p-8 shadow-2xl relative text-white">
                    <div className="absolute right-0 top-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
                    <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="max-w-2xl">
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 border border-amber-400/40 px-3 py-1 text-xs font-black text-amber-300">
                                    <LockClosedIcon className="h-3.5 w-3.5" />
                                    TERMINAL ARRA GROK TERKUNCI
                                </span>
                                <span className="rounded-full bg-cyan-400/20 px-3 py-1 text-xs font-black text-cyan-200 border border-cyan-400/30">
                                    RP 150.000 · LIFETIME SEKALI BAYAR
                                </span>
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                                Buka Terminal ARRA GROK + <span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-indigo-300 bg-clip-text text-transparent">Bonus Indikator TradingView</span>
                            </h2>
                            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-300">
                                Fitur <strong>ARRA GROK</strong> sudah termasuk dalam paket <strong>ARRA Cronos (Rp 150.000)</strong>. Anda mendapatkan terminal analisis pasar untuk Forex, Gold Futures, dan Bitcoin 24/7, perhitungan ukuran posisi, jurnal rekomendasi, serta contoh script MQL5 yang dapat ditinjau sebelum digunakan.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 min-w-[220px]">
                            <Link
                                href="/payment/checkout?plan=ARRA_CRONOS"
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 px-6 py-3.5 text-xs sm:text-sm font-black text-slate-950 shadow-xl shadow-cyan-500/25 hover:opacity-95 transition transform hover:scale-[1.02]"
                            >
                                <BoltIcon className="h-4 w-4" />
                                <span>ORDER SEKARANG — RP 150.000</span>
                            </Link>
                            <button
                                onClick={openActivation}
                                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-[11px] font-bold text-slate-200 hover:bg-slate-800 transition"
                            >
                                <KeyIcon className="h-3.5 w-3.5 text-amber-300" />
                                <span>Aktivasi Kode Lisensi</span>
                            </button>
                            <a
                                href="https://t.me/arra7trader?text=Halo%20Admin%20ARRA7!%20Saya%20ingin%20order%20ARRA%20Cronos%20+%20ARRA%20Grok%20(Rp%20150.000)"
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-[11px] font-bold text-slate-200 hover:bg-slate-800 transition"
                            >
                                <span>💬 Chat Admin Telegram</span>
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* TOP NOTICE BANNER: 24/7 BTC vs WEEKEND FOREX */}
            {selectedPair === 'BTCUSD' ? (
                <div className="mx-auto max-w-6xl mb-4 rounded-2xl border border-emerald-300 bg-emerald-50/90 p-4 shadow-sm font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-950">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white font-bold">
                            <CheckCircleIcon className="h-4.5 w-4.5" />
                        </span>
                        <div>
                            <span className="font-black uppercase tracking-wide flex items-center gap-2">
                                <span>PASAR KRIPTO BUKA 24/7 (BITCOIN)</span>
                                <span className="rounded bg-emerald-200 text-emerald-900 px-1.5 py-0.2 text-[9px] font-bold">
                                    TANPA LIBUR WEEKEND
                                </span>
                            </span>
                            <div className="text-[11px] text-emerald-800 mt-0.5">
                                Pasar <strong>$BTCUSD</strong> tersedia 24/7. Terminal membaca feed harga untuk analisis dan menghitung contoh ukuran posisi berdasarkan modal referensi <strong>${baseCapital.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>; tidak ada order broker yang dikirim.
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => handleSelectPair('XAUUSD')}
                            className="rounded-xl border border-emerald-400 bg-white hover:bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-900 transition flex items-center gap-1.5 cursor-pointer"
                        >
                            <span>🥇 Lihat Emas ($XAUUSD)</span>
                        </button>
                    </div>
                </div>
            ) : isWeekend ? (
                <div className="mx-auto max-w-6xl mb-4 rounded-2xl border border-amber-300 bg-amber-50/90 p-4 shadow-sm font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-amber-950 font-bold">
                            <InformationCircleIcon className="h-4 w-4" />
                        </span>
                        <div>
                            <span className="font-black uppercase tracking-wide">PASAR EMAS &amp; FOREX TUTUP (AKHIR PEKAN)</span>
                            <div className="text-[11px] text-amber-800 mt-0.5">
                                Pasar XAUUSD biasanya tutup pada akhir pekan. Terminal tidak terhubung ke saldo broker; beralihlah ke pair <strong>$BTCUSD (24/7)</strong> untuk melihat feed yang tersedia.
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => handleSelectPair('BTCUSD')}
                            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                            <span>⚡ Beralih ke $BTCUSD (24/7 Live)</span>
                        </button>
                        <button
                            onClick={() => fetchLiveFeed()}
                            className={`rounded-xl px-2.5 py-1.5 text-xs font-bold transition flex items-center gap-1 ${
                                'border border-amber-400/80 bg-white hover:bg-amber-100 text-amber-900'
                            }`}
                        >
                            <span>Perbarui feed</span>
                        </button>
                    </div>
                </div>
            ) : null}

            {/* MODAL EDIT MODAL / BALANCE ("VERSI KITA SENDIRI") */}
            {isCapitalModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-2xl border border-slate-300 bg-white p-6 shadow-2xl font-mono">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="text-base font-black text-slate-900">UBAH MODAL REFERENSI</h3>
                            <button
                                onClick={() => setIsCapitalModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>
                        <p className="mt-3 text-xs text-slate-600 leading-relaxed font-sans">
                            Masukkan modal referensi dalam USD. ARRA GROK memakainya untuk memperkirakan risiko dan ukuran posisi; angka ini bukan saldo akun broker.
                        </p>
                        <div className="mt-4">
                            <label className="text-xs font-bold text-slate-500 uppercase">Modal Referensi ($ USD)</label>
                            <div className="mt-1 relative rounded-xl shadow-xs">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 font-bold">$</span>
                                <input
                                    type="number"
                                    value={inputCapital}
                                    onChange={(e) => setInputCapital(e.target.value)}
                                    placeholder="1254"
                                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 font-bold text-slate-900 text-base outline-none"
                                />
                            </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                            {[500, 1254, 3000, 5000, 10000].map((preset) => (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => setInputCapital(preset.toString())}
                                    className="flex-1 py-1 text-[11px] rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 font-bold text-slate-700 cursor-pointer"
                                >
                                    ${preset >= 1000 ? `${preset}` : preset}
                                </button>
                            ))}
                        </div>
                        <div className="mt-6 flex gap-2.5">
                            <button
                                type="button"
                                onClick={() => setIsCapitalModalOpen(false)}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveCapital}
                                className="flex-1 py-2.5 rounded-xl bg-slate-900 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer"
                            >
                                Terapkan Modal
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* RETRO-MODERN MAC WINDOW TERMINAL FRAME */}
            <div className={`mx-auto max-w-6xl overflow-hidden rounded-2xl sm:rounded-3xl border border-[#DCDCD5] bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.04)] transition-all ${!isUnlocked ? 'pointer-events-none opacity-40 blur-[1px]' : ''}`}>
                {/* 1. RETRO-MODERN MAC WINDOW TITLE BAR */}
                <div className="flex items-center justify-between border-b border-[#ECECE6] bg-[#F7F7F4] px-4 py-3 sm:px-6 select-none">
                    {/* Traffic Light Window Controls */}
                    <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-[#FF5F56] border border-[#E0443E] inline-block shadow-xs" />
                        <span className="h-3 w-3 rounded-full bg-[#FFBD2E] border border-[#DEA123] inline-block shadow-xs" />
                        <span className="h-3 w-3 rounded-full bg-[#27C93F] border border-[#1AAB29] inline-block shadow-xs" />
                    </div>

                    {/* Window Title Subtitle */}
                    <div className="hidden sm:block text-[11px] font-mono text-slate-500 font-medium">
                        ARRA GROK — market feed &amp; trade setup analysis · BTC, gold &amp; forex
                    </div>

                    {/* Right Tag */}
                    <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-slate-400 hidden xs:inline">@ARRA7_GROK</span>
                        {selectedPair === 'BTCUSD' ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                                <span>BTC 24/7 · {feedIsFresh ? 'FEED SEGAR' : 'MENUNGGU FEED'}</span>
                            </span>
                        ) : isWeekend ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/60 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                <span>PASAR TUTUP · WEEKEND STANDBY</span>
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                                <span>{feedIsFresh ? 'FEED TERBARU' : 'FEED MENUNGGU'}</span>
                            </span>
                        )}
                    </div>
                </div>

                {/* 2. TERMINAL HEADER: AVATAR, TITLE, PAIR SWITCHER & REFERENCE CAPITAL */}
                <div className="border-b border-[#ECECE6] px-5 sm:px-7 py-5 bg-white">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        {/* Left: Avatar + Title & Status */}
                        <div className="flex items-start gap-4">
                            {/* ARRA Grok Bot Avatar (Silver Chrome Sphere with Oval Eyes) */}
                            <div className="h-14 w-14 shrink-0 rounded-full bg-gradient-to-b from-[#FFFFFF] via-[#F0F0EE] to-[#E2E2DC] border border-[#D5D5CE] shadow-[0_4px_10px_rgba(0,0,0,0.06),inset_0_2px_4px_rgba(255,255,255,0.9)] flex items-center justify-center gap-1.5">
                                <span className="h-4 w-1.5 rounded-full bg-slate-900" />
                                <span className="h-4 w-1.5 rounded-full bg-slate-900" />
                            </div>

                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-2xl sm:text-[26px] font-black text-slate-900 tracking-tight font-sans">
                                        ARRA GROK
                                    </h1>
                                    <span className="rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-800">
                                        v1.0 Quant
                                    </span>

                                    {/* PAIR SELECTOR PILLS */}
                                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                                        <button
                                            onClick={() => handleSelectPair('BTCUSD')}
                                            className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg transition cursor-pointer flex items-center gap-1 ${
                                                selectedPair === 'BTCUSD'
                                                    ? 'bg-emerald-600 text-white shadow-xs'
                                                    : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                        >
                                            <span>₿ $BTCUSD</span>
                                            <span className={`text-[9px] px-1 py-0.2 rounded font-black ${selectedPair === 'BTCUSD' ? 'bg-emerald-700 text-emerald-100' : 'bg-emerald-100 text-emerald-800'}`}>
                                                24/7
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => handleSelectPair('XAUUSD')}
                                            className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg transition cursor-pointer flex items-center gap-1 ${
                                                selectedPair === 'XAUUSD'
                                                    ? 'bg-amber-600 text-white shadow-xs'
                                                    : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                        >
                                            <span>🥇 $XAUUSD</span>
                                            {isWeekend && (
                                                <span className={`text-[9px] px-1 py-0.2 rounded font-black ${selectedPair === 'XAUUSD' ? 'bg-amber-700 text-amber-100' : 'bg-amber-100 text-amber-800'}`}>
                                                    LIBUR
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-mono">
                                    <span className="flex items-center gap-1.5 text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                                        <span className={`h-2 w-2 rounded-full ${feedIsFresh ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                                        <span>{!isRunning ? 'FEED DIJEDA' : feedIsFresh ? 'FEED TERBARU' : feedError ? 'FEED TERPUTUS' : 'MENUNGGU FEED'} · {formattedClock} WIB</span>
                                    </span>
                                    <span className="rounded bg-[#E3F4EB] text-[#1E774A] border border-[#C5E8D4] px-2 py-0.5 text-[10px] font-bold">
                                        ANALISIS · {hasActionableAnalysis ? activeTrade.type : 'WAIT'} {activeTrade.symbol} {hasActionableAnalysis && activeTrade.entry !== null ? `@ ${activeTrade.entry.toFixed(selectedPair === 'BTCUSD' ? 1 : 2)}` : ''}
                                    </span>
                                </div>
                                <div className="mt-1 text-[11px] font-mono text-slate-400 italic">
                                    {selectedPair === 'BTCUSD'
                                        ? 'BTC market 24/7 · market quote is separate from broker execution'
                                        : isWeekend
                                        ? 'pasar emas libur akhir pekan · kuotasi terakhir tersedia · rekomendasi ditahan sampai feed segar'
                                        : 'market analysis only · no broker account connection'}
                                </div>
                            </div>
                        </div>

                        {/* Right: Reference capital */}
                        <div className="flex items-center gap-4 self-start md:self-auto font-mono">
                            <div className="text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                    <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                                        ${baseCapital.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                    <button
                                        onClick={() => setIsCapitalModalOpen(true)}
                                        title="Ubah modal referensi"
                                        className="text-slate-400 hover:text-slate-800 p-1 rounded transition cursor-pointer"
                                    >
                                        <PencilSquareIcon className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">modal referensi · bukan saldo broker</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. TERMINAL TWO-COLUMN LAYOUT */}
                <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] bg-[#FCFCFA]">
                    {/* LEFT COLUMN: ANALYSIS WORKFLOW MODULES */}
                    <aside className="border-r border-[#ECECE6] p-4 space-y-2 bg-[#FAF9F6]">
                        <div className="flex items-center justify-between pb-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                            <span>WORKFLOW</span>
                            <span className={feedIsFresh ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                                {feedIsFresh ? 'feed segar' : feedError ? 'feed terputus' : 'menunggu feed'}
                            </span>
                        </div>

                        {/* MODULE 1: SCANNER */}
                        <div className="rounded-xl border border-slate-200/80 p-2.5 bg-white shadow-xs">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-5 w-5 items-center justify-center rounded bg-[#D97706] text-white text-[9px] font-bold">
                                        II
                                    </span>
                                    <span className="text-xs font-black tracking-wide text-slate-800 font-mono">
                                        SCANNER
                                    </span>
                                </div>
                                <span className="rounded bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.2 text-[9px] font-mono font-bold">
                                    SCAN
                                </span>
                            </div>
                            <div className="mt-1 text-[10px] text-slate-500 font-mono">
                                BTC 24/7 + Gold &amp; Forex
                            </div>
                            <div className="mt-0.5 text-[9px] text-slate-400 italic">
                                quotes from the market feed
                            </div>
                            <div className="mt-1 text-[9px] font-mono font-bold text-slate-700 truncate">
                                {activeTrade.symbol} · {activeTrade.current ? `$${activeTrade.current.toFixed(selectedPair === 'BTCUSD' ? 1 : 2)}` : 'harga menunggu feed'}
                            </div>
                        </div>

                        {/* MODULE 2: MARKET GUARD */}
                        <div className="relative rounded-xl border border-slate-200/80 p-2.5 bg-white shadow-xs">
                            <span className="absolute -right-1 -top-1.5 rotate-[-8deg] rounded border border-rose-500 bg-white/95 px-1.5 py-0.2 text-[8px] font-mono font-black text-rose-600 shadow-xs">
                                {selectedPair === 'XAUUSD' && isWeekend ? 'MARKET CLOSED' : !hasFeed ? 'NO FEED' : !feedIsFresh ? 'STALE FEED' : 'FEED OK'}
                            </span>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-5 w-5 items-center justify-center rounded bg-rose-600 text-white text-[9px] font-bold">
                                        ▲
                                    </span>
                                    <span className="text-xs font-black tracking-wide text-slate-800 font-mono">
                                        MARKET GUARD
                                    </span>
                                </div>
                                <span className="rounded bg-rose-100 text-rose-800 border border-rose-300 px-1.5 py-0.2 text-[9px] font-mono font-bold">
                                    {!hasFeed ? 'NO FEED' : !feedIsFresh ? 'STALE' : isWeekend && selectedPair === 'XAUUSD' ? 'CLOSED' : 'STATUS'}
                                </span>
                            </div>
                            <div className="mt-1 text-[10px] text-slate-500 font-mono">
                                market-hours check
                            </div>
                            <div className="mt-0.5 text-[9px] text-slate-400 italic">
                                news and spread checks are not connected
                            </div>
                            <div className="mt-1 text-[9px] font-mono font-bold text-slate-700 truncate">
                                {activeTrade.type === 'WAIT' ? 'no entry recommendation' : `setup ${activeTrade.symbol}`}
                            </div>
                        </div>

                        {/* MODULE 3: SIZER */}
                        <div className="rounded-xl border border-slate-200/80 p-2.5 bg-white shadow-xs">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-5 w-5 items-center justify-center rounded bg-indigo-600 text-white text-[9px] font-bold">
                                        ◆
                                    </span>
                                    <span className="text-xs font-black tracking-wide text-slate-800 font-mono">
                                        SIZER
                                    </span>
                                </div>
                                <span className="rounded bg-purple-100 text-purple-800 border border-purple-300 px-1.5 py-0.2 text-[9px] font-mono font-bold">
                                    ESTIMATE
                                </span>
                            </div>
                            <div className="mt-1 text-[10px] text-slate-500 font-mono">
                                estimated size from reference capital
                            </div>
                            <div className="mt-0.5 text-[9px] text-slate-400 italic">
                                1.5% reference risk model
                            </div>
                            <div className="mt-1 text-[9px] font-mono font-bold text-slate-700">
                                {activeTrade.sizeLots || '—'} Lots · ${baseCapital.toLocaleString('en-US', { minimumFractionDigits: 0 })} reference
                            </div>
                        </div>

                        {/* MODULE 4: ORDER REVIEW */}
                        <div className="rounded-xl border border-slate-200/80 p-2.5 bg-white shadow-xs">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-white text-[9px] font-bold">
                                        II
                                    </span>
                                    <span className="text-xs font-black tracking-wide text-slate-800 font-mono">
                                        ORDER REVIEW
                                    </span>
                                </div>
                                <span className="rounded bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.2 text-[9px] font-mono font-bold">
                                    NO BROKER
                                </span>
                            </div>
                            <div className="mt-1 text-[10px] text-slate-500 font-mono">
                                no broker connection
                            </div>
                            <div className="mt-0.5 text-[9px] text-slate-400 italic">
                                signal only
                            </div>
                            <div className="mt-1 text-[9px] font-mono font-bold text-emerald-700">
                                {activeTrade.type} {activeTrade.symbol} · no order sent
                            </div>
                        </div>

                        {/* MODULE 5: LOGGER */}
                        <div className="rounded-xl border border-slate-200/80 p-2.5 bg-white shadow-xs">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-700 text-white text-[9px] font-bold">
                                        II
                                    </span>
                                    <span className="text-xs font-black tracking-wide text-slate-800 font-mono">
                                        LOGGER
                                    </span>
                                </div>
                                <span className="rounded bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.2 text-[9px] font-mono font-bold">
                                    SNAPSHOT
                                </span>
                            </div>
                            <div className="mt-1 text-[10px] text-slate-500 font-mono">
                                in-memory snapshots for this session
                            </div>
                            <div className="mt-0.5 text-[9px] text-slate-400 italic">
                                no executed trade history
                            </div>
                            <div className="mt-1 text-[9px] font-mono font-bold text-slate-700">
                                {terminalLogs.length} current log lines · {activeTrade.symbol}
                            </div>
                        </div>

                        {/* MODULE 6: CAPITAL REFERENCE */}
                        <div className="rounded-xl border border-slate-200/80 p-2.5 bg-white shadow-xs">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-600 text-white text-[9px] font-bold">
                                        💧
                                    </span>
                                    <span className="text-xs font-black tracking-wide text-slate-800 font-mono">
                                        CAPITAL
                                    </span>
                                </div>
                                <span className="rounded bg-blue-100 text-blue-800 border border-blue-300 px-1.5 py-0.2 text-[9px] font-mono font-bold">
                                    UPDATE
                                </span>
                            </div>
                            <div className="mt-1 text-[10px] text-slate-500 font-mono">
                                reference capital only
                            </div>
                            <div className="mt-0.5 text-[9px] text-slate-400 italic">
                                no broker equity data
                            </div>
                            <div className="mt-1 text-[9px] font-mono font-bold text-blue-700">
                                ${baseCapital.toLocaleString('en-US', { minimumFractionDigits: 2 })} reference
                            </div>
                        </div>

                        {/* SESSION JOURNAL */}
                        <div className="rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-xs">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-5 w-5 items-center justify-center rounded bg-slate-900 text-white text-[9px] font-bold">
                                        Y
                                    </span>
                                    <span className="text-xs font-black tracking-wide text-slate-800 font-mono">
                                        YOU
                                    </span>
                                </div>
                                <span className="rounded bg-slate-100 text-slate-700 border border-slate-300 px-1.5 py-0.2 text-[9px] font-mono font-bold">
                                    READING
                                </span>
                            </div>
                            <div className="mt-1 text-[10px] text-slate-500 font-mono">
                                reads the log in the morning
                            </div>
                            <div className="mt-0.5 text-[9px] text-slate-400 italic">
                                stopped asking, started reading
                            </div>
                            <div className="mt-1 text-[9px] font-mono font-bold text-slate-700">
                                {logHistory.length} signal snapshots logged
                            </div>
                        </div>
                    </aside>

                    {/* RIGHT MAIN AREA: FLOW, SIGNAL, FEED LOG, AND HISTORY */}
                    <div className="p-4 sm:p-5 space-y-4">
                        {/* 1. UPPER SECTION: LIVE FLOW PIPELINE */}
                        <div className="rounded-2xl border border-[#ECECE6] bg-white p-4 shadow-xs">
                            <div className="flex items-center justify-between pb-3 text-[10px] font-mono font-bold text-slate-400">
                                <span>ANALYSIS FLOW · SCAN &rarr; MARKET CHECK &rarr; SIZE &rarr; REVIEW &rarr; LOG</span>
                                <span className="flex items-center gap-1.5">
                                    <span className={`h-1.5 w-1.5 rounded-full ${feedIsFresh ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                                    <span>{feedIsFresh ? `${feedSource} · diperbarui ${lastRefreshedAt || 'baru saja'} WIB` : feedError || 'menunggu feed pasar'}</span>
                                </span>
                            </div>

                            {/* Scanned Assets Box Grid (Click to switch active instrument) */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
                                {scannedAssets.map((asset, i) => {
                                    const isSelected = selectedPair === asset.sym.replace('$', '');
                                    return (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => {
                                                const s = asset.sym.replace('$', '');
                                                if (s === 'BTCUSD' || s === 'XAUUSD') {
                                                    handleSelectPair(s as 'BTCUSD' | 'XAUUSD');
                                                }
                                            }}
                                            className={`rounded-xl border p-2 font-mono text-left transition cursor-pointer ${
                                                isSelected
                                                    ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-400/30 shadow-xs'
                                                    : 'border-slate-200/90 bg-[#FBFBFA] hover:bg-slate-100'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-black text-slate-900">{asset.sym}</span>
                                                <span className={`h-1.5 w-1.5 rounded-full ${asset.dot}`} />
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-700 mt-0.5">
                                                {asset.price === null ? '—' : `$${asset.price.toFixed(asset.sym === '$BTCUSD' ? 1 : asset.sym.includes('JPY') || asset.sym === '$XAUUSD' ? 2 : 4)}`}
                                                {asset.change !== null && (
                                                    <span className={`ml-1 text-[9px] ${asset.change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {asset.change >= 0 ? '+' : ''}{asset.change.toFixed(2)}%
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[9px] text-slate-500 mt-0.5 truncate flex items-center justify-between">
                                                <span>{asset.note}</span>
                                                {asset.is24_7 && (
                                                    <span className="text-[8px] font-bold text-emerald-700 bg-emerald-100 px-1 rounded">
                                                        24/7
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* SVG Flow Curve Diagram */}
                            <div className="relative rounded-2xl border border-slate-100 bg-[#FAF9F5] p-4 py-6 overflow-hidden">
                                <div className="flex items-center justify-between max-w-lg mx-auto relative">
                                    {/* Left Circle Node: SENTRY GUARD */}
                                    <div className="flex flex-col items-center gap-1.5 z-10">
                                        <div className="h-16 w-16 rounded-full border-2 border-rose-400 bg-white shadow-md flex items-center justify-center relative">
                                            <span className="h-20 w-20 rounded-full border border-rose-300/40 absolute animate-ping" />
                                            <span className="text-rose-600 text-lg font-black">▲</span>
                                        </div>
                                        <div className="text-[10px] font-mono font-bold text-slate-700">MARKET STATUS</div>
                                        <div className="text-[9px] font-mono text-slate-400">
                                            {!hasFeed ? 'MENUNGGU FEED' : selectedPair === 'BTCUSD' ? 'PASAR 24/7' : isWeekend ? 'PASAR TUTUP' : 'STATUS PASAR'}
                                        </div>
                                    </div>

                                    {/* Middle Connecting Arc with Green Spline and LIVE Percentage */}
                                    <div className="flex-1 px-4 flex flex-col items-center">
                                        <div className="text-[11px] font-mono text-emerald-600 font-black mb-1 transition-all">
                                            {activeTrade.type}
                                        </div>
                                        {/* Visual SVG green curved line */}
                                        <svg className="w-full h-8 overflow-visible" viewBox="0 0 100 24" fill="none">
                                            <path
                                                d="M 5,20 C 35,5 65,18 95,6"
                                                stroke={feedIsFresh ? '#10B981' : '#94A3B8'}
                                                strokeWidth="2.5"
                                                strokeLinecap="round"
                                            />
                                            <circle cx="95" cy="6" r="3.5" fill={feedIsFresh ? '#10B981' : '#94A3B8'} className={feedIsFresh ? 'animate-ping' : ''} />
                                        </svg>
                                        <div className="text-[9px] font-mono text-slate-400 mt-1">
                                            {activeTrade.type === 'WAIT' ? 'menunggu konfirmasi analisis' : 'rekomendasi · belum dieksekusi'}
                                        </div>
                                    </div>

                                    {/* Right Circle Node: SIGNAL */}
                                    <div className="flex flex-col items-center gap-1.5 z-10">
                                        <div className="h-16 w-16 rounded-full border-2 border-emerald-500 bg-white shadow-md flex items-center justify-center relative">
                                            <span className="h-20 w-20 rounded-full border border-emerald-400/40 absolute animate-ping" />
                                            <span className="text-emerald-600 text-sm font-black">II</span>
                                        </div>
                                        <div className="text-[10px] font-mono font-bold text-slate-700">SIGNAL</div>
                                        <div className="text-[9px] font-mono text-emerald-700 font-bold">
                                            TIDAK TERHUBUNG
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 4 Summary Metric Cards */}
                            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                                <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                                        <span className="text-rose-500">▲</span> ASSETS SCANNED
                                    </div>
                                    <div className="text-base font-black text-slate-800 mt-0.5">{scannedAssets.length}</div>
                                    <div className="text-[9px] text-slate-400">instrumen dari feed</div>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                                        <span className="text-purple-600">◆</span> SIZER
                                    </div>
                                        <div className="text-base font-black text-slate-800 mt-0.5">{activeTrade.sizeLots || '—'} Lots</div>
                                    <div className="text-[9px] text-slate-400">estimasi risiko 1.5% referensi</div>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                                        <span className="text-amber-600">■</span> LOGGER
                                    </div>
                                    <div className="text-base font-black text-slate-800 mt-0.5">{terminalLogs.length}</div>
                                    <div className="text-[9px] text-slate-400">baris feed / sinyal</div>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                                        <span className="text-blue-600">💧</span> FEED STATUS
                                    </div>
                                    <div className="text-base font-black text-slate-800 mt-0.5">{feedIsFresh ? 'SEGAR' : 'STALE'}</div>
                                    <div className="text-[9px] text-slate-400">status data {feedSource || '—'}</div>
                                </div>
                            </div>
                        </div>

                        {/* 2. MIDDLE SECTION: ACTIVE TRADE vs NIGHT LOG */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Left: Active Trade Details & Start vs Now */}
                            <div className="rounded-2xl border border-[#ECECE6] bg-white p-4 font-mono shadow-xs flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                                        <span>ANALISIS · LEVEL REFERENSI</span>
                                        <span className="rounded px-1.5 py-0.2 text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                            {selectedPair === 'BTCUSD' ? 'PASAR 24/7' : isWeekend ? 'PASAR TUTUP · ANALISIS SAJA' : 'TIDAK ADA POSISI BROKER'}
                                        </span>
                                    </div>

                                    <div className="mt-2 flex items-baseline justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl font-black text-slate-900">{activeTrade.symbol}</span>
                                            <span className="rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.2 text-[10px] font-bold">
                                                {activeTrade.type}
                                            </span>
                                            {selectedPair === 'BTCUSD' && (
                                                <span className="rounded bg-emerald-500 text-white px-1.5 py-0.2 text-[9px] font-bold">
                                                    24/7
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-sm font-black text-slate-500">{feedIsFresh ? 'FEED OK' : 'FEED TIDAK SEGAR'}</span>
                                    </div>

                                    <div className="mt-3 space-y-1 text-xs border-t border-slate-100 pt-2.5">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">entry referensi:</span>
                                            <span className="font-bold text-slate-800">{hasActionableAnalysis && activeTrade.entry !== null ? activeTrade.entry.toFixed(selectedPair === 'BTCUSD' ? 1 : 2) : '—'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                        <span className="text-slate-400">harga feed:</span>
                                            <span className="font-bold text-emerald-600 transition-all">{activeTrade.current ? activeTrade.current.toFixed(selectedPair === 'BTCUSD' ? 1 : 2) : '—'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">stop loss:</span>
                                            <span className="font-bold text-rose-600">{hasActionableAnalysis && activeTrade.stopLoss !== null ? activeTrade.stopLoss.toFixed(selectedPair === 'BTCUSD' ? 1 : 2) : '—'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">take profit:</span>
                                            <span className="font-bold text-emerald-600">{hasActionableAnalysis && activeTrade.takeProfit !== null ? activeTrade.takeProfit.toFixed(selectedPair === 'BTCUSD' ? 1 : 2) : '—'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">sumber feed:</span>
                                            <span className="font-bold text-slate-800">{feedSource || '—'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">size:</span>
                                            <span className="font-bold text-slate-800">{activeTrade.sizeLots || '—'} Lots ({activeTrade.sizePct})</span>
                                        </div>
                                        <div className="pt-1 text-[11px] text-slate-600 leading-snug">
                                            <span className="text-slate-400">reason: </span>
                                            {hasFeed && !feedIsFresh ? 'Feed tidak segar; level analisis lama disembunyikan.' : activeTrade.reason}
                                        </div>
                                        <div className="text-[11px] text-slate-400">
                                            {activeTrade.type === 'WAIT' ? 'Analisis belum menemukan setup yang dapat ditindaklanjuti.' : 'Ini level analisis, bukan posisi terbuka.'}
                                        </div>
                                    </div>
                                </div>

                                {/* Reference size uses an editable capital assumption, not broker equity. */}
                                <div className="mt-4 border-t border-slate-100 pt-3">
                                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                                        <span>MODAL REFERENSI · ESTIMASI UKURAN</span>
                                        <span>${baseCapital.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="mt-2 space-y-1.5">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-400">Perkiraan volume:</span>
                                            <span className="font-bold text-slate-600">{activeTrade.sizeLots || '—'} lot</span>
                                        </div>
                                        <p className="text-[10px] text-slate-500">Ukuran kontrak dan batas volume bisa berbeda di broker Anda. Tidak ada saldo atau P/L akun broker yang dibaca.</p>
                                    </div>
                                    <div className="text-[9px] text-slate-400 text-right mt-1">
                                        draft untuk ditinjau · tidak mengirim order
                                    </div>

                                    <button
                                        onClick={handleCopyMT5Script}
                                        disabled={!hasActionableAnalysis}
                                        className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 px-3 py-2 text-[11px] font-bold text-slate-800 transition cursor-pointer"
                                    >
                                        {copiedScript ? (
                                            <>
                                                <ClipboardDocumentCheckIcon className="h-3.5 w-3.5 text-emerald-600" />
                                                <span>Draft MQL5 {selectedPair} Tersalin ke Clipboard!</span>
                                            </>
                                        ) : (
                                            <>
                                                <ClipboardDocumentIcon className="h-3.5 w-3.5 text-slate-600" />
                                                <span>Salin Draft Setup MQL5 ({selectedPair} · {activeTrade.sizeLots || '—'} Lots)</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Right: Market data and analysis output */}
                            <div className="rounded-2xl border border-slate-800 bg-[#0F172A] p-4 font-mono shadow-xs flex flex-col justify-between text-white">
                                <div>
                                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 border-b border-slate-800 pb-2 mb-3">
                                    <span className="text-emerald-400">$ market-analysis</span>
                                        <span className={`flex items-center gap-1.5 text-xs ${feedIsFresh ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            <span className={`h-1.5 w-1.5 rounded-full ${feedIsFresh && isRunning ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                                            <span>{terminalLogs.length} feed lines · session only</span>
                                        </span>
                                    </div>

                                    {/* Terminal code stream container */}
                                    <div className="max-h-[280px] overflow-y-auto space-y-1.5 text-[11px] leading-relaxed text-slate-300 pr-1">
                                        {terminalLogs.map((line, idx) => (
                                            <div key={idx} className={line.includes('ENTER') || line.includes('EXIT') ? 'text-white font-bold' : 'text-slate-400 pl-3'}>
                                                {line}
                                            </div>
                                        ))}
                                        <div className="flex items-center gap-1 text-emerald-400 animate-pulse pt-1">
                                            <span>█</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                                    <span className="flex items-center gap-1 text-emerald-400 font-bold">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                        <span>{feedIsFresh ? 'Feed dan sinyal terbaru' : feedError || 'Feed belum tersedia'}</span>
                                    </span>
                                    <span className="text-emerald-400 font-mono">ARRA7 Proprietary</span>
                                </div>
                            </div>
                        </div>

                        <section className="rounded-2xl border border-cyan-200 bg-white p-4 font-mono shadow-xs">
                            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                                <div>
                                    <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
                                        <SparklesIcon className="h-4 w-4 text-cyan-700" />
                                        REVIEW TAMBAHAN GROQ · {selectedPair}
                                    </h3>
                                    <p className="mt-1 text-[11px] text-slate-500">
                                        Diproses saat diminta dari data live dan indikator ARRA GROK. Tidak mengubah sinyal atau mengirim order.
                                    </p>
                                </div>
                                <button
                                    onClick={handleGroqReview}
                                    disabled={isReviewingWithGroq || !hasFeed}
                                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-50 px-3.5 py-2 text-xs font-bold text-cyan-800 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isReviewingWithGroq ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <SparklesIcon className="h-4 w-4" />}
                                    {isReviewingWithGroq ? 'Meninjau…' : 'Minta review Groq'}
                                </button>
                            </div>
                            {groqReviewError && <p className="mt-3 text-xs font-medium text-rose-700">{groqReviewError}</p>}
                            {groqReview && (
                                <div className="mt-3 rounded-xl border border-slate-200 bg-[#F7F7F4] p-3 text-xs leading-relaxed text-slate-700">
                                    <div className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-cyan-800">{groqReviewModel} · opini sekunder</div>
                                    {groqReview}
                                </div>
                            )}
                        </section>

                        {/* 3. BOTTOM SECTION: LOG TABLE (reading the log) */}
                        <div className="rounded-2xl border border-[#ECECE6] bg-white p-4 font-mono shadow-xs">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-[10px] font-bold text-slate-400">
                                        <span>RIWAYAT SINYAL</span>
                                        <span>snapshot analisis · bukan riwayat transaksi</span>
                            </div>

                            <div className="divide-y divide-slate-100 text-xs">
                                {logHistory.map((item) => (
                                    <div key={item.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-slate-400 text-[11px]">{item.time}</span>
                                            <span
                                                className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                                                    item.type === 'SIGNAL'
                                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                                        : item.type === 'SKIP'
                                                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                                                }`}
                                            >
                                                {item.type}
                                            </span>
                                            <span className="font-black text-slate-800">{item.symbol}</span>
                                            <span className="text-[11px] text-slate-500 hidden md:inline">
                                                reason: {item.reason}
                                            </span>
                                        </div>
                                        <div className="text-right sm:self-auto self-end font-bold">
                                            <span className="text-slate-700">
                                                {item.result}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Bottom Utility Controls */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    onClick={handleToggleFeed}
                                    className="rounded-xl border border-slate-300 bg-white hover:bg-slate-100 px-3 py-1.5 text-xs font-mono font-bold text-slate-700 transition cursor-pointer"
                                >
                                    {isRunning ? 'Pause Feed Updates' : 'Resume Feed Updates'}
                                </button>
                                <button
                                    onClick={() => setIsCapitalModalOpen(true)}
                                    className="rounded-xl border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 text-xs font-mono font-bold text-indigo-800 transition flex items-center gap-1 cursor-pointer"
                                >
                                    <PencilSquareIcon className="h-3.5 w-3.5" />
                                    <span>Ubah Modal (${baseCapital})</span>
                                </button>
                                <button
                                    onClick={handleDownloadLog}
                                    className="rounded-xl border border-slate-300 bg-white hover:bg-slate-100 px-3 py-1.5 text-xs font-mono font-bold text-slate-600 transition flex items-center gap-1 cursor-pointer"
                                >
                                    <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                                    <span>Unduh Log</span>
                                </button>
                                <button
                                    onClick={fetchLiveFeed}
                                    className="rounded-xl border border-cyan-300 bg-cyan-50 hover:bg-cyan-100 px-3 py-1.5 text-xs font-mono font-bold text-cyan-800 transition flex items-center gap-1 cursor-pointer"
                                >
                                    <ArrowPathIcon className="h-3.5 w-3.5" />
                                    <span>Refresh Feed</span>
                                </button>
                            </div>

                            <Link
                                href="/arra-cronos"
                                className="text-xs font-mono font-bold text-cyan-700 hover:text-cyan-900 flex items-center gap-1"
                            >
                                <span>Lihat Chart ARRA Cronos &rarr;</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
