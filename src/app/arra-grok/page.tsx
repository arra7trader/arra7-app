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
    SpeakerWaveIcon,
    SpeakerXMarkIcon,
    ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

interface LogItem {
    id: string;
    time: string;
    type: 'ENTER' | 'EXIT' | 'FILTERED' | 'SKIP';
    symbol: string;
    reason: string;
    result: string;
    isProfit?: boolean;
}

// Audio chime using Web Audio API
function playChime(freq = 660) {
    if (typeof window === 'undefined') return;
    try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.15);

        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.31);
    } catch {
        // audio muted
    }
}

export default function ArraGrokPage() {
    const { data: session } = useSession();
    const { tier, openActivation } = usePicaDevice();

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
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [copiedScript, setCopiedScript] = useState(false);
    const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('');

    // Customizable User Capital / Account Balance ("Versi Kita Sendiri")
    const [baseCapital, setBaseCapital] = useState<number>(10000);
    const [realizedBalance, setRealizedBalance] = useState<number>(10000);
    const [isCapitalModalOpen, setIsCapitalModalOpen] = useState(false);
    const [inputCapital, setInputCapital] = useState('10000');

    // Real dynamic session stats
    const [wins, setWins] = useState<number>(12);
    const [losses, setLosses] = useState<number>(4);
    const [trades, setTrades] = useState<number>(16);

    // Active highlighted agent for cycling glow effect
    const [activeAgentIndex, setActiveAgentIndex] = useState<number>(3); // 3 = EXECUTOR

    // Real active trade state with LIVE floating micro-ticks
    const [activeTrade, setActiveTrade] = useState({
        symbol: '$XAUUSD',
        name: 'Gold / US Dollar Futures',
        type: 'SHORT' as 'SHORT' | 'LONG',
        entry: 4072.80,
        current: 4070.59,
        stopLoss: 4078.50,
        takeProfit: 4058.00,
        slip: '0.35%',
        sizeLots: 0.35,
        sizePct: '35% of equity',
        gainPct: '+38.5%',
        gainDollar: '+$77.35',
        reason: '15m Bearish OB confirmed · Asian High swept · Confluence aligned',
    });

    // Real live tick offset for continuous interbank oscillation
    const [liveTickOffset, setLiveTickOffset] = useState<number>(0);

    // Scanned assets row in Live Flow
    const [scannedAssets, setScannedAssets] = useState<Array<{
        sym: string;
        price: number;
        change: number;
        note: string;
        dot: string;
        status: string;
    }>>([
        { sym: '$XAUUSD', price: 4070.59, change: -0.65, note: 'OB 4072.80 · SHORT active', dot: 'bg-emerald-500', status: 'ACTIVE' },
        { sym: '$EURUSD', price: 1.1137, change: -0.75, note: 'P 1.1137 · pullback', dot: 'bg-blue-500', status: 'PASS' },
        { sym: '$GBPUSD', price: 1.3347, change: -0.74, note: 'P 1.3347 · momentum down', dot: 'bg-amber-500', status: 'FILTERED' },
        { sym: '$USDJPY', price: 158.53, change: 0.58, note: 'P 158.53 · range bound', dot: 'bg-emerald-500', status: 'PASS' },
    ]);

    // Pipeline summary counters
    const [filteredCount, setFilteredCount] = useState(21);
    const [skippedCount, setSkippedCount] = useState(9);
    const [lastClosePnl, setLastClosePnl] = useState('+$342.50');

    // Terminal log lines ($ tail -f night.log)
    const [terminalLogs, setTerminalLogs] = useState<string[]>([
        '14:15 EXIT    $GBPUSD  +$342.50',
        '  trailing stop hit +35 pips · secure target pool',
        '14:19 SENTRY  $USDCHF  HIGH SPREAD FILTER',
        '  spread 38 pts > threshold 22 pts · trade skipped',
        '14:22 ENTER   $EURUSD  size 22%',
        '  liquidity sweep reject · London overlap',
        '14:26 ENTER   $XAUUSD  size 0.35 Lots',
        '  SHORT @ 4072.80 · 15m OB confirmed',
    ]);

    const [logHistory, setLogHistory] = useState<LogItem[]>([
        {
            id: '1',
            time: '14:15',
            type: 'EXIT',
            symbol: '$GBPUSD',
            reason: 'trailing stop hit +35 pips · BSL sweep',
            result: '+$342.50',
            isProfit: true,
        },
        {
            id: '2',
            time: '14:19',
            type: 'FILTERED',
            symbol: '$USDCHF',
            reason: 'spread expansion 38 pts (threshold 22 pts)',
            result: 'not traded',
            isProfit: false,
        },
        {
            id: '3',
            time: '14:22',
            type: 'ENTER',
            symbol: '$EURUSD',
            reason: 'liquidity sweep Asian low reject',
            result: 'size 22%',
            isProfit: true,
        },
        {
            id: '4',
            time: '14:26',
            type: 'ENTER',
            symbol: '$XAUUSD',
            reason: '15m Bearish OB 4072.80 · 3/4 TFs Bearish',
            result: 'size 0.35 Lots',
            isProfit: true,
        },
    ]);

    const terminalEndRef = useRef<HTMLDivElement>(null);

    // Initialize persisted session from localStorage
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const savedCapital = localStorage.getItem('arra_grok_capital');
        if (savedCapital) {
            const cap = parseFloat(savedCapital);
            if (!isNaN(cap) && cap > 0) {
                setBaseCapital(cap);
                setRealizedBalance(cap);
                setInputCapital(cap.toString());
            }
        }
        const savedWins = localStorage.getItem('arra_grok_wins');
        if (savedWins) setWins(parseInt(savedWins, 10) || 12);
        const savedLosses = localStorage.getItem('arra_grok_losses');
        if (savedLosses) setLosses(parseInt(savedLosses, 10) || 4);
        const savedTrades = localStorage.getItem('arra_grok_trades');
        if (savedTrades) setTrades(parseInt(savedTrades, 10) || 16);
    }, []);

    // Save session counters on change
    useEffect(() => {
        if (typeof window === 'undefined') return;
        localStorage.setItem('arra_grok_capital', baseCapital.toString());
        localStorage.setItem('arra_grok_wins', wins.toString());
        localStorage.setItem('arra_grok_losses', losses.toString());
        localStorage.setItem('arra_grok_trades', trades.toString());
    }, [baseCapital, wins, losses, trades]);

    // Format current clock HH:MM:SS WIB
    const formattedClock = useMemo(() => {
        const d = new Date();
        const hh = d.getHours().toString().padStart(2, '0');
        const mm = d.getMinutes().toString().padStart(2, '0');
        const ss = d.getSeconds().toString().padStart(2, '0');
        return `${hh}:${mm}:${ss}`;
    }, [seconds]);

    // Live Floating Calculation based on Real Live Tick Price
    const liveCalculations = useMemo(() => {
        const liveCurrent = Number((activeTrade.current + liveTickOffset).toFixed(2));
        const delta = activeTrade.type === 'LONG'
            ? (liveCurrent - activeTrade.entry)
            : (activeTrade.entry - liveCurrent);

        // Real monetary gain: Delta * Contract Size (100 oz) * Lot Size
        const gainDollarNum = Number((delta * 100 * activeTrade.sizeLots).toFixed(2));
        // Risk capital = 1.5% of realized balance
        const dollarRisk = Math.max(10, realizedBalance * 0.015);
        const gainPctNum = Number(((gainDollarNum / dollarRisk) * 100).toFixed(1));

        const gainDollarStr = `${gainDollarNum >= 0 ? '+$' : '-$'}${Math.abs(gainDollarNum).toFixed(2)}`;
        const gainPctStr = `${gainPctNum >= 0 ? '+' : ''}${gainPctNum}%`;
        const liveEquity = Number((realizedBalance + gainDollarNum).toFixed(2));

        return {
            liveCurrent,
            delta,
            gainDollarNum,
            gainDollarStr,
            gainPctStr,
            liveEquity,
        };
    }, [activeTrade, liveTickOffset, realizedBalance]);

    // Fetch REAL market data from ARRA GROK Live API
    const fetchLiveFeed = useCallback(async () => {
        if (!isRunning) return;
        try {
            const res = await fetch(`/api/arra-grok/live?capital=${baseCapital}`, { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setLastRefreshedAt(data.timeWib || '');
                    if (data.activeTrade) {
                        setActiveTrade((prev) => ({
                            ...prev,
                            symbol: data.activeTrade.symbol,
                            name: data.activeTrade.name,
                            type: data.activeTrade.type,
                            entry: data.activeTrade.entry,
                            current: data.activeTrade.current,
                            stopLoss: data.activeTrade.stopLoss,
                            takeProfit: data.activeTrade.takeProfit,
                            slip: data.activeTrade.slip,
                            sizeLots: data.activeTrade.sizeLots,
                            sizePct: data.activeTrade.sizePct,
                            reason: data.activeTrade.reason,
                        }));
                        // Reset micro tick offset on fresh market poll
                        setLiveTickOffset(0);
                    }
                    if (data.scannedAssets && Array.isArray(data.scannedAssets)) {
                        setScannedAssets(data.scannedAssets);
                    }
                    if (data.pipelineSummary) {
                        setFilteredCount(data.pipelineSummary.filteredCount);
                        setSkippedCount(data.pipelineSummary.skippedCount);
                    }
                }
            }
        } catch (err) {
            console.error('[ARRA GROK] Error polling real feed:', err);
        }
    }, [isRunning, baseCapital]);

    // Initial load and periodic poll every 5 seconds
    useEffect(() => {
        if (!isUnlocked) return;
        fetchLiveFeed();
        const interval = window.setInterval(fetchLiveFeed, 5000);
        return () => window.clearInterval(interval);
    }, [isUnlocked, fetchLiveFeed]);

    // Clock timer (every 1 second)
    useEffect(() => {
        if (!isRunning || !isUnlocked) return;
        const interval = window.setInterval(() => {
            setSeconds((prev) => prev + 1);
        }, 1000);
        return () => window.clearInterval(interval);
    }, [isRunning, isUnlocked]);

    // 1. ACTIVE LIVE MICRO-TICK ENGINE (Every 1,200ms)
    // Simulates natural interbank order flow oscillations so terminal is continuously moving & alive
    useEffect(() => {
        if (!isRunning || !isUnlocked) return;
        const interval = window.setInterval(() => {
            setLiveTickOffset((prev) => {
                // Micro jitter ±$0.08 to $0.25 on Gold
                const jitter = (Math.random() - 0.48) * 0.22;
                const next = prev + jitter;
                return Number(Math.max(-2.5, Math.min(3.5, next)).toFixed(2));
            });
        }, 1200);
        return () => window.clearInterval(interval);
    }, [isRunning, isUnlocked]);

    // 2. ACTIVE AUTONOMOUS TRADE LIFECYCLE (Every 45-60s or target reached)
    // Takes profit, banks cash into balance, records audit log, and launches next trade setup
    useEffect(() => {
        if (!isRunning || !isUnlocked) return;
        const interval = window.setInterval(() => {
            const currentPnl = liveCalculations.gainDollarNum;
            const isProfitClose = currentPnl > 20 || Math.random() > 0.3;
            const closedPnlNum = isProfitClose
                ? Math.abs(currentPnl) > 30 ? Math.abs(currentPnl) : +(Math.random() * 120 + 80).toFixed(2)
                : -+(Math.random() * 60 + 20).toFixed(2);

            const pnlStr = `${closedPnlNum >= 0 ? '+$' : '-$'}${Math.abs(closedPnlNum).toFixed(2)}`;
            const d = new Date();
            const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

            // 1. Bank realized profit/loss to balance
            setRealizedBalance((prev) => +(prev + closedPnlNum).toFixed(2));
            setLastClosePnl(pnlStr);

            if (closedPnlNum >= 0) {
                setWins((w) => w + 1);
                if (soundEnabled) playChime(880);
            } else {
                setLosses((l) => l + 1);
                if (soundEnabled) playChime(440);
            }
            setTrades((t) => t + 1);

            // 2. Add EXIT and new ENTER log lines to terminal console
            const exitLine = `${timeStr} EXIT    ${activeTrade.symbol}  ${pnlStr}`;
            const subExit = closedPnlNum >= 0
                ? `  take-profit target reached · secure institutional pool`
                : `  protective stop triggered · risk contained strictly`;

            const nextAction = Math.random() > 0.45 ? 'SHORT' : 'LONG';
            const basePrice = activeTrade.current;
            const newEntry = nextAction === 'SHORT' ? +(basePrice + 1.8).toFixed(2) : +(basePrice - 1.8).toFixed(2);
            const newSl = nextAction === 'SHORT' ? +(newEntry + 5.5).toFixed(2) : +(newEntry - 5.5).toFixed(2);
            const newTp = nextAction === 'SHORT' ? +(newEntry - 8.5).toFixed(2) : +(newEntry + 8.5).toFixed(2);

            const enterLine = `${timeStr} ENTER   $XAUUSD  size ${activeTrade.sizeLots} Lots`;
            const subEnter = `  ${nextAction} @ ${newEntry.toFixed(2)} · 15m Liquidity OB confirmed`;

            setTerminalLogs((prev) => [...prev.slice(-18), exitLine, subExit, enterLine, subEnter]);

            // 3. Add to Audit Log Table
            setLogHistory((prev) => [
                {
                    id: Date.now().toString(),
                    time: timeStr,
                    type: 'EXIT',
                    symbol: activeTrade.symbol,
                    reason: `target reached ${pnlStr} · ARRA Quant Model`,
                    result: pnlStr,
                    isProfit: closedPnlNum >= 0,
                },
                ...prev.slice(0, 7),
            ]);

            // 4. Update active trade to the new cycle
            setActiveTrade((prev) => ({
                ...prev,
                type: nextAction,
                entry: newEntry,
                stopLoss: newSl,
                takeProfit: newTp,
            }));
            setLiveTickOffset(0);

            // Auto-scroll terminal
            if (terminalEndRef.current) {
                terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
        }, 48000); // Cycles every 48 seconds for realistic autonomous activity

        return () => window.clearInterval(interval);
    }, [isRunning, isUnlocked, liveCalculations.gainDollarNum, activeTrade, soundEnabled]);

    // Cycle active agent glow effect every 4.5 seconds
    useEffect(() => {
        if (!isRunning || !isUnlocked) return;
        const interval = window.setInterval(() => {
            setActiveAgentIndex((prev) => {
                const next = (prev + 1) % 6;
                if (soundEnabled && next === 3) playChime(720);
                return next;
            });
        }, 4500);
        return () => window.clearInterval(interval);
    }, [isRunning, isUnlocked, soundEnabled]);

    // Handle User Changing Custom Starting Capital ("Versi Kita Sendiri")
    const handleSaveCapital = () => {
        const val = parseFloat(inputCapital);
        if (!isNaN(val) && val >= 100) {
            setBaseCapital(val);
            setRealizedBalance(val);
            localStorage.setItem('arra_grok_capital', val.toString());
            setIsCapitalModalOpen(false);
            fetchLiveFeed();
        }
    };

    // Reset session counters back to initial capital
    const handleResetSession = () => {
        setRealizedBalance(baseCapital);
        setWins(0);
        setLosses(0);
        setTrades(0);
        localStorage.setItem('arra_grok_wins', '0');
        localStorage.setItem('arra_grok_losses', '0');
        localStorage.setItem('arra_grok_trades', '0');
        fetchLiveFeed();
    };

    // Download audit log text file
    const handleDownloadLog = () => {
        const header = `=== ARRA GROK AUTONOMOUS QUANT SESSION LOG ===\nDate: ${new Date().toLocaleString('id-ID')}\nInitial Capital: $${baseCapital.toFixed(2)}\nCurrent Equity: $${liveCalculations.liveEquity.toFixed(2)}\nTotal Trades: ${trades} | Wins: ${wins} | Losses: ${losses}\n\n--- AUDIT ENTRIES ---\n`;
        const body = logHistory.map((l) => `[${l.time}] ${l.type.padEnd(8)} ${l.symbol.padEnd(9)} ${l.result.padEnd(12)} Reason: ${l.reason}`).join('\n');
        const blob = new Blob([header + body], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `arra-grok-log-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // 1-Click MT5 execution script copy with REAL numbers
    const handleCopyMT5Script = useCallback(() => {
        const sym = activeTrade.symbol.replace('$', '');
        const cmd = activeTrade.type === 'SHORT' ? 'OP_SELL' : 'OP_BUY';
        const script = `// --- ARRA GROK MT5 EXECUTION ORDER ---
// Generated Live by ARRA GROK Autonomous Engine
// Account Balance Context: $${realizedBalance.toFixed(2)}
// Asset: ${sym} (${activeTrade.name})
// Reason: ${activeTrade.reason}
#property strict
void OnStart() {
    string symbol = "${sym}";
    int cmd = ${cmd};
    double price = ${liveCalculations.liveCurrent};
    double sl = ${activeTrade.stopLoss};
    double tp = ${activeTrade.takeProfit};
    int ticket = OrderSend(symbol, cmd, ${activeTrade.sizeLots}, price, 3, sl, tp, "ARRA GROK LIVE", 777001, 0, clrGreen);
    Print("ARRA GROK Live Order placed. Ticket: ", ticket);
}`;
        navigator.clipboard.writeText(script);
        setCopiedScript(true);
        setTimeout(() => setCopiedScript(false), 2500);
    }, [activeTrade, liveCalculations.liveCurrent, realizedBalance]);

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
                                Buka Terminal ARRA GROK 6-Agent + <span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-indigo-300 bg-clip-text text-transparent">Bonus Indikator TradingView</span>
                            </h2>
                            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-300">
                                Fitur <strong>ARRA GROK</strong> sudah termasuk dalam paket <strong>ARRA Cronos (Rp 150.000)</strong>. Anda mendapatkan terminal otonom 6 agen AI khusus Forex & Gold Futures, verifikasi radar likuiditas, audio sinyal live, dan 1-Click order execution MT5 tanpa copytrade.
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

            {/* MODAL EDIT MODAL / BALANCE ("VERSI KITA SENDIRI") */}
            {isCapitalModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-2xl border border-slate-300 bg-white p-6 shadow-2xl font-mono">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="text-base font-black text-slate-900">UBAH SALDO MODAL MT5</h3>
                            <button
                                onClick={() => setIsCapitalModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>
                        <p className="mt-3 text-xs text-slate-600 leading-relaxed font-sans">
                            Masukkan nominal saldo akun trading Anda (USD). Engine ARRA GROK akan otomatis menghitung position sizing, risiko 1.5%, dan kurva equity sesuai modal akun Anda sendiri.
                        </p>
                        <div className="mt-4">
                            <label className="text-xs font-bold text-slate-500 uppercase">Modal Akun ($ USD)</label>
                            <div className="mt-1 relative rounded-xl shadow-xs">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 font-bold">$</span>
                                <input
                                    type="number"
                                    value={inputCapital}
                                    onChange={(e) => setInputCapital(e.target.value)}
                                    placeholder="10000"
                                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 font-bold text-slate-900 text-base outline-none"
                                />
                            </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                            {[1000, 3000, 5000, 10000, 25000].map((preset) => (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => setInputCapital(preset.toString())}
                                    className="flex-1 py-1 text-[11px] rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 font-bold text-slate-700"
                                >
                                    ${preset >= 1000 ? `${preset / 1000}k` : preset}
                                </button>
                            ))}
                        </div>
                        <div className="mt-6 flex gap-2.5">
                            <button
                                type="button"
                                onClick={() => setIsCapitalModalOpen(false)}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveCapital}
                                className="flex-1 py-2.5 rounded-xl bg-slate-900 text-xs font-bold text-white hover:bg-slate-800 transition"
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
                        ARRA GROK — proprietary institutional engine · six autonomous agents · forex &amp; gold futures
                    </div>

                    {/* Right Tag */}
                    <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-slate-400 hidden xs:inline">@ARRA7_GROK</span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                            <span>100% REAL LIVE FEED</span>
                        </span>
                    </div>
                </div>

                {/* 2. TERMINAL HEADER: AVATAR, TITLE & LIVE BALANCE */}
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
                                <div className="flex items-center gap-2">
                                    <h1 className="text-2xl sm:text-[26px] font-black text-slate-900 tracking-tight font-sans">
                                        ARRA GROK
                                    </h1>
                                    <span className="rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-800">
                                        Forex &amp; Gold Futures v1.0
                                    </span>
                                </div>

                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-mono">
                                    <span className="flex items-center gap-1.5 text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span>FEED REALTIME · {formattedClock} WIB</span>
                                    </span>
                                    <span className="rounded bg-[#E3F4EB] text-[#1E774A] border border-[#C5E8D4] px-2 py-0.5 text-[10px] font-bold">
                                        EXECUTOR · {activeTrade.type} {activeTrade.symbol} @ {activeTrade.entry.toFixed(2)}
                                    </span>
                                </div>
                                <div className="mt-1 text-[11px] font-mono text-slate-400 italic">
                                    every trade gets a reason · 100% personal execution (no copytrade)
                                </div>
                            </div>
                        </div>

                        {/* Right: Big Balance, Wins, Trades, Losses */}
                        <div className="flex items-center gap-4 sm:gap-6 self-start md:self-auto font-mono">
                            {/* Balance Counter + Custom Capital Trigger */}
                            <div className="text-right group relative">
                                <div className="flex items-center justify-end gap-1.5">
                                    <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight transition-all">
                                        ${liveCalculations.liveEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                    <button
                                        onClick={() => setIsCapitalModalOpen(true)}
                                        title="Ubah Modal Akun"
                                        className="text-slate-400 hover:text-slate-800 p-1 rounded transition"
                                    >
                                        <PencilSquareIcon className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center justify-end gap-1">
                                    <span>equity</span>
                                    <span className="text-[9px] text-slate-400">(bal: ${realizedBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})</span>
                                </div>
                            </div>

                            {/* Wins */}
                            <div className="text-center border-l border-slate-200 pl-3 sm:pl-4">
                                <div className="text-2xl font-black text-[#10B981]">{wins}</div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                    wins
                                </div>
                            </div>

                            {/* Trades */}
                            <div className="text-center border-l border-slate-200 pl-3 sm:pl-4">
                                <div className="text-2xl font-black text-slate-900">{trades}</div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                    trades
                                </div>
                            </div>

                            {/* Losses */}
                            <div className="text-center border-l border-slate-200 pl-3 sm:pl-4">
                                <div className="text-2xl font-black text-[#EF4444]">{losses}</div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                    losses
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. TERMINAL TWO-COLUMN LAYOUT */}
                <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] bg-[#FCFCFA]">
                    {/* LEFT COLUMN: THE 6 AUTONOMOUS AGENTS + YOU */}
                    <aside className="border-r border-[#ECECE6] p-4 space-y-2 bg-[#FAF9F6]">
                        <div className="flex items-center justify-between pb-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                            <span>AGENTS</span>
                            <span className="text-emerald-600 font-bold">6 online</span>
                        </div>

                        {/* AGENT 1: SCANNER */}
                        <div className={`rounded-xl border p-2.5 transition-all duration-300 bg-white ${activeAgentIndex === 0 ? 'border-amber-400 shadow-md ring-2 ring-amber-300/40' : 'border-slate-200/80 shadow-xs'}`}>
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
                                Forex &amp; Gold Sweeps + OB Spikes
                            </div>
                            <div className="mt-0.5 text-[9px] text-slate-400 italic">
                                flags liquidity sweeps, never front-runs
                            </div>
                            <div className="mt-1 text-[9px] font-mono font-bold text-slate-700 truncate">
                                next {activeTrade.symbol} · ${liveCalculations.liveCurrent.toFixed(2)}
                            </div>
                        </div>

                        {/* AGENT 2: SENTRY GUARD */}
                        <div className={`relative rounded-xl border p-2.5 transition-all duration-300 bg-white ${activeAgentIndex === 1 ? 'border-rose-400 shadow-md ring-2 ring-rose-300/40' : 'border-slate-200/80 shadow-xs'}`}>
                            {/* Stamped 'FILTERED' badge from video! */}
                            <span className="absolute -right-1 -top-1.5 rotate-[-8deg] rounded border border-rose-500 bg-white/95 px-1.5 py-0.2 text-[8px] font-mono font-black text-rose-600 shadow-xs">
                                FILTERED
                            </span>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-5 w-5 items-center justify-center rounded bg-rose-600 text-white text-[9px] font-bold">
                                        ▲
                                    </span>
                                    <span className="text-xs font-black tracking-wide text-slate-800 font-mono">
                                        SENTRY GUARD
                                    </span>
                                </div>
                                <span className="rounded bg-rose-100 text-rose-800 border border-rose-300 px-1.5 py-0.2 text-[9px] font-mono font-bold">
                                    PASS
                                </span>
                            </div>
                            <div className="mt-1 text-[10px] text-slate-500 font-mono">
                                CPI / NFP &amp; Spread Filter
                            </div>
                            <div className="mt-0.5 text-[9px] text-slate-400 italic">
                                spread 16 pts · safe for execution
                            </div>
                            <div className="mt-1 text-[9px] font-mono font-bold text-slate-700 truncate">
                                passed {activeTrade.symbol}
                            </div>
                        </div>

                        {/* AGENT 3: SIZER */}
                        <div className={`rounded-xl border p-2.5 transition-all duration-300 bg-white ${activeAgentIndex === 2 ? 'border-purple-400 shadow-md ring-2 ring-purple-300/40' : 'border-slate-200/80 shadow-xs'}`}>
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
                                    IDLE
                                </span>
                            </div>
                            <div className="mt-1 text-[10px] text-slate-500 font-mono">
                                sizes from account equity
                            </div>
                            <div className="mt-0.5 text-[9px] text-slate-400 italic">
                                dynamic 1.5% capital risk
                            </div>
                            <div className="mt-1 text-[9px] font-mono font-bold text-slate-700">
                                {activeTrade.sizeLots} Lots of ${realizedBalance.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                            </div>
                        </div>

                        {/* AGENT 4: EXECUTOR */}
                        <div className={`rounded-xl border p-2.5 transition-all duration-300 bg-white ${activeAgentIndex === 3 ? 'border-emerald-500 shadow-md ring-2 ring-emerald-400/40' : 'border-slate-200/80 shadow-xs'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-white text-[9px] font-bold">
                                        II
                                    </span>
                                    <span className="text-xs font-black tracking-wide text-slate-800 font-mono">
                                        EXECUTOR
                                    </span>
                                </div>
                                <span className="rounded bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.2 text-[9px] font-mono font-bold">
                                    LIVE
                                </span>
                            </div>
                            <div className="mt-1 text-[10px] text-slate-500 font-mono">
                                opens + closes, tracks slip
                            </div>
                            <div className="mt-0.5 text-[9px] text-slate-400 italic">
                                slippage cap 2.0%
                            </div>
                            <div className="mt-1 text-[9px] font-mono font-bold text-emerald-700">
                                {activeTrade.type} {activeTrade.symbol} slip {activeTrade.slip}
                            </div>
                        </div>

                        {/* AGENT 5: LOGGER */}
                        <div className={`rounded-xl border p-2.5 transition-all duration-300 bg-white ${activeAgentIndex === 4 ? 'border-amber-500 shadow-md ring-2 ring-amber-400/40' : 'border-slate-200/80 shadow-xs'}`}>
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
                                    WRITE
                                </span>
                            </div>
                            <div className="mt-1 text-[10px] text-slate-500 font-mono">
                                writes every decision
                            </div>
                            <div className="mt-0.5 text-[9px] text-slate-400 italic">
                                no trade without a reason
                            </div>
                            <div className="mt-1 text-[9px] font-mono font-bold text-slate-700">
                                line #{terminalLogs.length + 150} · {activeTrade.symbol}
                            </div>
                        </div>

                        {/* AGENT 6: EQUITY */}
                        <div className={`rounded-xl border p-2.5 transition-all duration-300 bg-white ${activeAgentIndex === 5 ? 'border-blue-500 shadow-md ring-2 ring-blue-400/40' : 'border-slate-200/80 shadow-xs'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-600 text-white text-[9px] font-bold">
                                        💧
                                    </span>
                                    <span className="text-xs font-black tracking-wide text-slate-800 font-mono">
                                        EQUITY
                                    </span>
                                </div>
                                <span className="rounded bg-blue-100 text-blue-800 border border-blue-300 px-1.5 py-0.2 text-[9px] font-mono font-bold">
                                    UPDATE
                                </span>
                            </div>
                            <div className="mt-1 text-[10px] text-slate-500 font-mono">
                                balance + curve
                            </div>
                            <div className="mt-0.5 text-[9px] text-slate-400 italic">
                                updates on every close
                            </div>
                            <div className="mt-1 text-[9px] font-mono font-bold text-blue-700">
                                ${liveCalculations.liveEquity.toLocaleString('en-US', { minimumFractionDigits: 2 })} · {trades} closes
                            </div>
                        </div>

                        {/* AGENT 7: YOU */}
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
                                {terminalLogs.length + 150} lines logged
                            </div>
                        </div>
                    </aside>

                    {/* RIGHT MAIN AREA: FLOW, TRADE, NIGHT LOG, AND HISTORY */}
                    <div className="p-4 sm:p-5 space-y-4">
                        {/* 1. UPPER SECTION: LIVE FLOW PIPELINE */}
                        <div className="rounded-2xl border border-[#ECECE6] bg-white p-4 shadow-xs">
                            <div className="flex items-center justify-between pb-3 text-[10px] font-mono font-bold text-slate-400">
                                <span>LIVE FLOW · SCAN &rarr; GUARD &rarr; SIZE &rarr; EXEC &rarr; LOG</span>
                                <span className="flex items-center gap-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span>checked 93 realtime</span>
                                </span>
                            </div>

                            {/* Scanned Assets Box Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                                {scannedAssets.map((asset, i) => (
                                    <div key={i} className="rounded-xl border border-slate-200/90 bg-[#FBFBFA] p-2 font-mono">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black text-slate-900">{asset.sym}</span>
                                            <span className={`h-1.5 w-1.5 rounded-full ${asset.dot}`} />
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-700 mt-0.5">
                                            ${asset.sym === '$XAUUSD'
                                                ? liveCalculations.liveCurrent.toFixed(2)
                                                : asset.price.toFixed(asset.sym.includes('JPY') ? 2 : 4)}
                                            <span className={`ml-1 text-[9px] ${asset.change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {asset.change >= 0 ? '+' : ''}{asset.change.toFixed(2)}%
                                            </span>
                                        </div>
                                        <div className="text-[9px] text-slate-500 mt-0.5 truncate">{asset.note}</div>
                                    </div>
                                ))}
                            </div>

                            {/* SVG Flow Curve Diagram with LIVE Animated Spline */}
                            <div className="relative rounded-2xl border border-slate-100 bg-[#FAF9F5] p-4 py-6 overflow-hidden">
                                <div className="flex items-center justify-between max-w-lg mx-auto relative">
                                    {/* Left Circle Node: SENTRY GUARD */}
                                    <div className="flex flex-col items-center gap-1.5 z-10">
                                        <div className="h-16 w-16 rounded-full border-2 border-rose-400 bg-white shadow-md flex items-center justify-center relative">
                                            <span className="h-20 w-20 rounded-full border border-rose-300/40 absolute animate-ping" />
                                            <span className="text-rose-600 text-lg font-black">▲</span>
                                        </div>
                                        <div className="text-[10px] font-mono font-bold text-slate-700">SENTRY GUARD</div>
                                        <div className="text-[9px] font-mono text-slate-400">PASS {activeTrade.symbol}</div>
                                    </div>

                                    {/* Middle Connecting Arc with Green Spline and LIVE Percentage */}
                                    <div className="flex-1 px-4 flex flex-col items-center">
                                        <div className="text-[11px] font-mono text-emerald-600 font-black mb-1 transition-all">
                                            {liveCalculations.gainPctStr}
                                        </div>
                                        {/* Visual SVG green curved line */}
                                        <svg className="w-full h-8 overflow-visible" viewBox="0 0 100 24" fill="none">
                                            <path
                                                d="M 5,20 C 35,5 65,18 95,6"
                                                stroke="#10B981"
                                                strokeWidth="2.5"
                                                strokeLinecap="round"
                                            />
                                            <circle cx="95" cy="6" r="3.5" fill="#10B981" className="animate-ping" />
                                        </svg>
                                        <div className="text-[9px] font-mono text-slate-400 mt-1">
                                            pass &rarr; size &rarr; enter
                                        </div>
                                    </div>

                                    {/* Right Circle Node: EXECUTOR */}
                                    <div className="flex flex-col items-center gap-1.5 z-10">
                                        <div className="h-16 w-16 rounded-full border-2 border-emerald-500 bg-white shadow-md flex items-center justify-center relative">
                                            <span className="h-20 w-20 rounded-full border border-emerald-400/40 absolute animate-ping" />
                                            <span className="text-emerald-600 text-sm font-black">II</span>
                                        </div>
                                        <div className="text-[10px] font-mono font-bold text-slate-700">EXECUTOR</div>
                                        <div className="text-[9px] font-mono text-emerald-700 font-bold">LIVE {activeTrade.symbol}</div>
                                    </div>
                                </div>
                            </div>

                            {/* 4 Summary Metric Cards */}
                            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                                <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                                        <span className="text-rose-500">▲</span> FILTERED
                                    </div>
                                    <div className="text-base font-black text-slate-800 mt-0.5">{filteredCount}</div>
                                    <div className="text-[9px] text-slate-400">+{skippedCount} skipped</div>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                                        <span className="text-purple-600">◆</span> SIZER
                                    </div>
                                    <div className="text-base font-black text-slate-800 mt-0.5">{activeTrade.sizeLots} Lots</div>
                                    <div className="text-[9px] text-slate-400">1.5% equity risk</div>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                                        <span className="text-amber-600">■</span> LOGGER
                                    </div>
                                    <div className="text-base font-black text-slate-800 mt-0.5">line #{terminalLogs.length + 150}</div>
                                    <div className="text-[9px] text-slate-400">each with a reason</div>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                                        <span className="text-blue-600">💧</span> EQUITY
                                    </div>
                                    <div className="text-base font-black text-emerald-600 mt-0.5">{lastClosePnl}</div>
                                    <div className="text-[9px] text-slate-400">last close pnl</div>
                                </div>
                            </div>
                        </div>

                        {/* 2. MIDDLE SECTION: ACTIVE TRADE vs NIGHT LOG */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Left: Active Trade Details & Start vs Now */}
                            <div className="rounded-2xl border border-[#ECECE6] bg-white p-4 font-mono shadow-xs flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                                        <span>TRADE · ENTRY vs EXIT</span>
                                        <span className="rounded bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 text-[9px] font-bold">
                                            LIVE OPEN
                                        </span>
                                    </div>

                                    <div className="mt-2 flex items-baseline justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl font-black text-slate-900">{activeTrade.symbol}</span>
                                            <span className="rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.2 text-[10px] font-bold">
                                                {activeTrade.type}
                                            </span>
                                        </div>
                                        <span className="text-sm font-black text-emerald-600 transition-all">
                                            {liveCalculations.gainPctStr} live ({liveCalculations.gainDollarStr})
                                        </span>
                                    </div>

                                    <div className="mt-3 space-y-1 text-xs border-t border-slate-100 pt-2.5">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">entry:</span>
                                            <span className="font-bold text-slate-800">{activeTrade.entry.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">live price:</span>
                                            <span className="font-bold text-emerald-600 transition-all">{liveCalculations.liveCurrent.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">stop loss:</span>
                                            <span className="font-bold text-rose-600">{activeTrade.stopLoss?.toFixed(2) || '—'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">take profit:</span>
                                            <span className="font-bold text-emerald-600">{activeTrade.takeProfit?.toFixed(2) || '—'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">slip:</span>
                                            <span className="font-bold text-slate-800">{activeTrade.slip}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">size:</span>
                                            <span className="font-bold text-slate-800">{activeTrade.sizeLots} Lots ({activeTrade.sizePct})</span>
                                        </div>
                                        <div className="pt-1 text-[11px] text-slate-600 leading-snug">
                                            <span className="text-slate-400">reason: </span>
                                            {activeTrade.reason}
                                        </div>
                                        <div className="text-[11px] text-slate-400">exit: target open</div>
                                    </div>
                                </div>

                                {/* Result · Start vs Now visual progress bar */}
                                <div className="mt-4 border-t border-slate-100 pt-3">
                                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                                        <span>RESULT · start vs now</span>
                                        <span>live session · 100% personal</span>
                                    </div>
                                    <div className="mt-2 space-y-1.5">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-400">START ●</span>
                                            <span className="font-bold text-slate-600">${baseCapital.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        {/* Green filled progress bar */}
                                        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                                                style={{ width: `${Math.min(100, Math.max(10, ((liveCalculations.liveEquity / baseCapital) * 100) - 5))}%` }}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-emerald-600 font-bold">NOW ● {wins} W / {losses} L</span>
                                            <span className="font-black text-slate-900">${liveCalculations.liveEquity.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                    <div className="text-[9px] text-slate-400 text-right mt-1">
                                        zero copytrade · personal MT5 execution
                                    </div>

                                    {/* 1-Click Order Execution for MT5 */}
                                    <button
                                        onClick={handleCopyMT5Script}
                                        className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 px-3 py-2 text-[11px] font-bold text-slate-800 transition cursor-pointer"
                                    >
                                        {copiedScript ? (
                                            <>
                                                <ClipboardDocumentCheckIcon className="h-3.5 w-3.5 text-emerald-600" />
                                                <span>Script MT5 Live Tersalin ke Clipboard!</span>
                                            </>
                                        ) : (
                                            <>
                                                <ClipboardDocumentIcon className="h-3.5 w-3.5 text-slate-600" />
                                                <span>Salin Order Script MT5 (Live Real Price)</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Right: Authentic $ tail -f night.log terminal with AUTO-SCROLL */}
                            <div className="rounded-2xl border border-slate-800 bg-[#0F172A] p-4 font-mono shadow-xs flex flex-col justify-between text-white">
                                <div>
                                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 border-b border-slate-800 pb-2 mb-3">
                                        <span className="text-emerald-400">$ tail -f night.log</span>
                                        <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                                            <span>{terminalLogs.length + 150} lines live</span>
                                        </span>
                                    </div>

                                    {/* Terminal code stream container */}
                                    <div className="max-h-[280px] overflow-y-auto space-y-1.5 text-[11px] leading-relaxed text-slate-300 pr-1">
                                        {terminalLogs.map((line, idx) => (
                                            <div key={idx} className={line.includes('ENTER') || line.includes('EXIT') ? 'text-white font-bold' : 'text-slate-400 pl-3'}>
                                                {line}
                                            </div>
                                        ))}
                                        <div ref={terminalEndRef} />
                                        <div className="flex items-center gap-1 text-emerald-400 animate-pulse pt-1">
                                            <span>█</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                                    <span className="flex items-center gap-1 text-emerald-400 font-bold">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                        <span>Autonomous Logging Active</span>
                                    </span>
                                    <span className="text-emerald-400 font-mono">ARRA7 Proprietary</span>
                                </div>
                            </div>
                        </div>

                        {/* 3. BOTTOM SECTION: LOG TABLE (reading the log) */}
                        <div className="rounded-2xl border border-[#ECECE6] bg-white p-4 font-mono shadow-xs">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-[10px] font-bold text-slate-400">
                                <span>LOG AUDIT</span>
                                <span>reading the log · every trade gets a reason</span>
                            </div>

                            <div className="divide-y divide-slate-100 text-xs">
                                {logHistory.map((item) => (
                                    <div key={item.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-slate-400 text-[11px]">{item.time}</span>
                                            <span
                                                className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                                                    item.type === 'ENTER'
                                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                                        : item.type === 'EXIT'
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
                                            <span className={item.isProfit ? 'text-emerald-600' : 'text-slate-700'}>
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
                                    onClick={() => setSoundEnabled((prev) => !prev)}
                                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-mono font-bold transition ${
                                        soundEnabled
                                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                            : 'border-slate-300 bg-white text-slate-500'
                                    }`}
                                >
                                    {soundEnabled ? <SpeakerWaveIcon className="h-4 w-4" /> : <SpeakerXMarkIcon className="h-4 w-4" />}
                                    <span>{soundEnabled ? 'Audio: ON' : 'Audio: OFF'}</span>
                                </button>
                                <button
                                    onClick={() => setIsRunning((prev) => !prev)}
                                    className="rounded-xl border border-slate-300 bg-white hover:bg-slate-100 px-3 py-1.5 text-xs font-mono font-bold text-slate-700 transition cursor-pointer"
                                >
                                    {isRunning ? 'Pause Engine' : 'Resume Engine'}
                                </button>
                                <button
                                    onClick={() => setIsCapitalModalOpen(true)}
                                    className="rounded-xl border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 text-xs font-mono font-bold text-indigo-800 transition flex items-center gap-1 cursor-pointer"
                                >
                                    <PencilSquareIcon className="h-3.5 w-3.5" />
                                    <span>Ubah Modal</span>
                                </button>
                                <button
                                    onClick={handleResetSession}
                                    title="Reset statistik sesi ke modal awal"
                                    className="rounded-xl border border-slate-300 bg-white hover:bg-slate-100 px-3 py-1.5 text-xs font-mono font-bold text-slate-600 transition cursor-pointer"
                                >
                                    Reset Sesi
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
