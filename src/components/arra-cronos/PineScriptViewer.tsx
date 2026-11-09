'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { usePicaDevice } from '@/context/PicaDeviceContext';
import { isAdminEmail, isAdminUser } from '@/lib/admin-access';
import Link from 'next/link';
import { 
    ClipboardDocumentCheckIcon, 
    ClipboardDocumentIcon, 
    ArrowDownTrayIcon, 
    ChevronDownIcon, 
    ChevronUpIcon,
    CodeBracketIcon,
    SparklesIcon,
    LockClosedIcon,
    BoltIcon,
} from '@heroicons/react/24/outline';

interface PineScriptViewerProps {
    initialCode?: string;
    isUnlocked?: boolean;
}

export default function PineScriptViewer({ initialCode, isUnlocked }: PineScriptViewerProps) {
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
        session?.user?.tier === 'PRO' ||
        session?.user?.tier === 'VVIP' ||
        (session?.user as any)?.plan === 'ARRA_CRONOS' ||
        (session?.user as any)?.plan === 'ALL_ACCESS' ||
        (typeof window !== 'undefined' && localStorage.getItem('pica_arra_cronos_unlocked') === 'true');

    const effectiveUnlocked = isAdmin || (isUnlocked !== undefined ? isUnlocked : hasOrder);
    const [copied, setCopied] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [code, setCode] = useState(initialCode || '');
    const [showLockPrompt, setShowLockPrompt] = useState(false);

    const loadCodeIfNeeded = async () => {
        if (!code) {
            setLoading(true);
            try {
                const res = await fetch('/ARRA_Cronos.pine');
                if (res.ok) {
                    const text = await res.text();
                    setCode(text);
                }
            } catch (err) {
                console.error('Failed to load script', err);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleCopy = async () => {
        if (!effectiveUnlocked) {
            setShowLockPrompt(true);
            return;
        }

        let textToCopy = code;
        if (!textToCopy) {
            setLoading(true);
            try {
                const res = await fetch('/ARRA_Cronos.pine');
                if (res.ok) {
                    textToCopy = await res.text();
                    setCode(textToCopy);
                }
            } catch (err) {
                console.error('Failed to load script', err);
            } finally {
                setLoading(false);
            }
        }

        if (textToCopy) {
            try {
                await navigator.clipboard.writeText(textToCopy);
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
            } catch (e) {
                console.error('Clipboard copy failed', e);
            }
        }
    };

    const handleDownloadClick = (e: React.MouseEvent) => {
        if (!effectiveUnlocked) {
            e.preventDefault();
            setShowLockPrompt(true);
        }
    };

    const toggleExpand = () => {
        if (!isExpanded && !code && effectiveUnlocked) {
            loadCodeIfNeeded();
        }
        setIsExpanded(!isExpanded);
    };

    return (
        <div className="mt-8 overflow-hidden rounded-2xl border border-cyan-500/20 bg-[#0d1522] shadow-2xl">
            {/* Header / Action Bar */}
            <div className="flex flex-col gap-4 border-b border-slate-800 bg-[#101a2b] p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-400">
                            <CodeBracketIcon className="h-4 w-4" />
                        </span>
                        <h3 className="text-base font-extrabold text-white">Source Code Indikator Pine Script v6</h3>
                        {!effectiveUnlocked ? (
                            <span className="rounded-full bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-400/30 flex items-center gap-1">
                                <LockClosedIcon className="h-3 w-3" />
                                <span>Bonus Khusus Member (Rp 150.000)</span>
                            </span>
                        ) : (
                            <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[9px] font-bold text-emerald-300 border border-emerald-400/30">
                                UNLOCKED
                            </span>
                        )}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                        File resmi <code className="text-cyan-300">ARRA_Cronos.pine</code> — disertakan sebagai bonus pembelian ARRA Cronos (Rp 150.000).
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {effectiveUnlocked ? (
                        <>
                            <button
                                onClick={handleCopy}
                                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                                    copied
                                        ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                                        : 'bg-cyan-300 text-slate-950 hover:bg-cyan-200'
                                }`}
                            >
                                {copied ? (
                                    <>
                                        <ClipboardDocumentCheckIcon className="h-4 w-4" />
                                        <span>Tersalin ke Clipboard!</span>
                                    </>
                                ) : (
                                    <>
                                        <ClipboardDocumentIcon className="h-4 w-4" />
                                        <span>Salin Script (Copy)</span>
                                    </>
                                )}
                            </button>

                            <a
                                href="/ARRA_Cronos.pine"
                                download="ARRA_Cronos.pine"
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-bold text-slate-200 transition hover:border-slate-600 hover:bg-slate-700"
                            >
                                <ArrowDownTrayIcon className="h-4 w-4" />
                                <span>Download .pine</span>
                            </a>
                        </>
                    ) : (
                        <Link
                            href="/payment/checkout?plan=ARRA_CRONOS"
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2.5 text-xs font-black text-slate-950 shadow-lg hover:opacity-95 transition"
                        >
                            <LockClosedIcon className="h-4 w-4" />
                            <span>Buka Akses Bonus (Rp 150.000)</span>
                        </Link>
                    )}

                    <button
                        onClick={toggleExpand}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2.5 text-xs font-semibold text-slate-400 transition hover:text-white"
                    >
                        {isExpanded ? (
                            <>
                                <span>Tutup Kode</span>
                                <ChevronUpIcon className="h-4 w-4" />
                            </>
                        ) : (
                            <>
                                <span>Lihat Kode</span>
                                <ChevronDownIcon className="h-4 w-4" />
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Lock Prompt Modal if user clicked copy while locked */}
            {showLockPrompt && !effectiveUnlocked && (
                <div className="border-b border-amber-500/30 bg-amber-500/10 p-4 text-center">
                    <p className="text-xs font-bold text-amber-200">
                        🔒 Source Code Pine Script v6 resmi adalah bonus eksklusif paket ARRA Cronos (Rp 150.000).
                    </p>
                    <div className="mt-2 flex items-center justify-center gap-3">
                        <Link
                            href="/payment/checkout?plan=ARRA_CRONOS"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-300 px-3 py-1.5 text-xs font-black text-slate-950 hover:bg-cyan-200 transition"
                        >
                            <BoltIcon className="h-3.5 w-3.5" />
                            <span>Order ARRA Cronos — Rp 150.000</span>
                        </Link>
                        <button
                            onClick={() => setShowLockPrompt(false)}
                            className="text-xs text-slate-400 hover:text-white"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            )}

            {/* Code Box Accordion */}
            {isExpanded && (
                <div className="relative">
                    {!effectiveUnlocked ? (
                        <div className="flex flex-col items-center justify-center bg-[#070b12] p-8 text-center">
                            <LockClosedIcon className="h-8 w-8 text-amber-400 mb-2" />
                            <h4 className="text-sm font-bold text-white">Source Code Terkunci</h4>
                            <p className="mt-1 max-w-md text-xs text-slate-400">
                                Dapatkan akses penuh ke source code indikator TradingView Pine Script v6 dengan mengorder ARRA Cronos seharga Rp 150.000 sekali bayar.
                            </p>
                            <Link
                                href="/payment/checkout?plan=ARRA_CRONOS"
                                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-2 text-xs font-black text-slate-950 hover:bg-cyan-200 transition"
                            >
                                <span>Order Sekarang (Rp 150.000)</span>
                            </Link>
                        </div>
                    ) : loading ? (
                        <div className="flex h-48 items-center justify-center text-xs text-slate-400">
                            Memuat source code script…
                        </div>
                    ) : (
                        <div className="max-h-[460px] overflow-auto bg-[#070b12] p-4 font-mono text-[11px] leading-relaxed text-slate-300 selection:bg-cyan-500/30 selection:text-white">
                            <pre className="overflow-x-auto whitespace-pre">{code}</pre>
                        </div>
                    )}
                </div>
            )}

            <div className="grid border-t border-slate-800/80 bg-[#0a101b] p-5 sm:grid-cols-3 sm:gap-4 sm:p-6">
                <div className="rounded-xl border border-slate-800/60 bg-[#0e1624] p-4">
                    <div className="text-xs font-bold text-cyan-300">EMA cepat / lambat</div>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-400">Membaca arah relatif dari candle timeframe chart yang aktif.</p>
                </div>
                <div className="mt-3 rounded-xl border border-cyan-500/20 bg-[#0e1624] p-4 sm:mt-0">
                    <div className="text-xs font-bold text-emerald-400">RSI dan ATR</div>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-400">Menampilkan momentum dan rentang volatilitas historis.</p>
                </div>
                <div className="mt-3 rounded-xl border border-slate-800/60 bg-[#0e1624] p-4 sm:mt-0">
                    <div className="text-xs font-bold text-indigo-400">Forecast & setup terkunci</div>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-400">Menggambar jalur harga estimasi dan koridor ATR. Saat setup terkonfirmasi setelah candle tutup, level Entry, SL, TP, serta jalurnya tetap dan status tersentuh tercatat pada chart.</p>
                </div>
            </div>
        </div>
    );
}
