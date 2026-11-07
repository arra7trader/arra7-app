'use client';

import React, { useState } from 'react';
import { 
    ClipboardDocumentCheckIcon, 
    ClipboardDocumentIcon, 
    ArrowDownTrayIcon, 
    ChevronDownIcon, 
    ChevronUpIcon,
    CodeBracketIcon,
    SparklesIcon
} from '@heroicons/react/24/outline';

interface PineScriptViewerProps {
    initialCode?: string;
}

export default function PineScriptViewer({ initialCode }: PineScriptViewerProps) {
    const [copied, setCopied] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [code, setCode] = useState(initialCode || '');

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

    const toggleExpand = () => {
        if (!isExpanded && !code) {
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
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                        File resmi <code className="text-cyan-300">ARRA_Cronos.pine</code> — siap paste ke Pine Editor TradingView.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
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

            {/* Code Box Accordion */}
            {isExpanded && (
                <div className="relative">
                    {loading ? (
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

            {/* Quick Presets Guide */}
            <div className="grid border-t border-slate-800/80 bg-[#0a101b] p-5 sm:grid-cols-3 sm:gap-4 sm:p-6">
                <div className="rounded-xl border border-slate-800/60 bg-[#0e1624] p-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                        <SparklesIcon className="h-3.5 w-3.5" />
                        Preset Scalping (M1 - M5)
                    </div>
                    <ul className="mt-2.5 space-y-1 font-mono text-[11px] text-slate-400">
                        <li>• Search bars: <span className="text-white">350</span></li>
                        <li>• Pattern length: <span className="text-white">4</span></li>
                        <li>• Forecast bars: <span className="text-white">6</span></li>
                        <li>• Fast/Slow EMA: <span className="text-white">13 / 34</span></li>
                    </ul>
                </div>

                <div className="mt-3 rounded-xl border border-cyan-500/20 bg-[#0e1624] p-4 sm:mt-0">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                        <SparklesIcon className="h-3.5 w-3.5" />
                        Preset Intraday (M15 - H1) <span className="rounded bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">DEFAULT</span>
                    </div>
                    <ul className="mt-2.5 space-y-1 font-mono text-[11px] text-slate-400">
                        <li>• Search bars: <span className="text-white">400</span></li>
                        <li>• Pattern length: <span className="text-white">5</span></li>
                        <li>• Forecast bars: <span className="text-white">8</span></li>
                        <li>• Fast/Slow EMA: <span className="text-white">21 / 55</span></li>
                    </ul>
                </div>

                <div className="mt-3 rounded-xl border border-slate-800/60 bg-[#0e1624] p-4 sm:mt-0">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
                        <SparklesIcon className="h-3.5 w-3.5" />
                        Preset Swing (H4 - D1)
                    </div>
                    <ul className="mt-2.5 space-y-1 font-mono text-[11px] text-slate-400">
                        <li>• Search bars: <span className="text-white">500</span></li>
                        <li>• Pattern length: <span className="text-white">7</span></li>
                        <li>• Forecast bars: <span className="text-white">12</span></li>
                        <li>• Fast/Slow EMA: <span className="text-white">34 / 89</span></li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
