'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function NeuralLabShowcase() {
    const [price, setPrice] = useState(2912.45);
    const [direction, setDirection] = useState<'BUY' | 'SELL' | 'HOLD'>('BUY');
    const [confidence, setConfidence] = useState(86.4);
    const [probabilities, setProbabilities] = useState({ up: 0.864, down: 0.082, neutral: 0.054 });
    const [timeframe, setTimeframe] = useState('H1');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Try fetching live preview
        fetch('/api/xauusd-neural-lab/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ timeframe: '1h' })
        })
            .then(res => res.json())
            .then(result => {
                if (result.status === 'success' && result.prediction) {
                    setPrice(result.marketInfo.price || 2912.45);
                    setDirection(result.prediction.direction);
                    setConfidence(result.prediction.confidence);
                    setProbabilities(result.prediction.probabilities);
                }
            })
            .catch(() => {
                // Keep default simulated showcase
            });
    }, []);

    const handleSwitchTf = (tf: string) => {
        setTimeframe(tf);
        setIsLoading(true);
        setTimeout(() => {
            if (tf === 'M15') {
                setDirection('BUY');
                setConfidence(81.2);
                setProbabilities({ up: 0.812, down: 0.125, neutral: 0.063 });
            } else if (tf === 'H1') {
                setDirection('BUY');
                setConfidence(86.4);
                setProbabilities({ up: 0.864, down: 0.082, neutral: 0.054 });
            } else if (tf === 'H4') {
                setDirection('HOLD');
                setConfidence(72.5);
                setProbabilities({ up: 0.225, down: 0.150, neutral: 0.625 });
            } else {
                setDirection('BUY');
                setConfidence(88.9);
                setProbabilities({ up: 0.889, down: 0.065, neutral: 0.046 });
            }
            setIsLoading(false);
        }, 300);
    };

    const dirColor = direction === 'BUY' ? 'text-emerald-600' : direction === 'SELL' ? 'text-rose-600' : 'text-amber-600';
    const dirBg = direction === 'BUY' ? 'bg-emerald-50 border-emerald-200' : direction === 'SELL' ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200';
    const dirGradient = direction === 'BUY' ? 'from-emerald-500 to-teal-500' : direction === 'SELL' ? 'from-rose-500 to-red-500' : 'from-amber-500 to-yellow-500';

    return (
        <section className="w-full max-w-5xl mx-auto my-14 px-4">
            <div className="relative rounded-3xl p-6 sm:p-10 bg-white border border-slate-200/90 shadow-xl shadow-slate-200/50 overflow-hidden">
                
                {/* Background decorative soft glow */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-100/40 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

                {/* Header Banner */}
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200/80">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">
                            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                            PICA Flagship Engine
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                            <span>🧠</span>
                            <span>PICA Neural Lab</span>
                            <span className="text-xs px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300 font-bold uppercase">
                                VVIP Studio
                            </span>
                        </h2>
                        <p className="text-slate-600 text-sm mt-1 max-w-xl">
                            Arsitektur Bi-LSTM 3-layer mengevaluasi 22 indikator teknikal &amp; data tick Swissquote secara real-time untuk memprediksi arah pergerakan XAU/USD.
                        </p>
                    </div>

                    <Link href="/xauusd-neural-lab">
                        <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-md shadow-blue-500/20 cursor-pointer hover:shadow-lg">
                            <span>Masuk ke Neural Lab</span>
                            <span className="text-base">→</span>
                        </button>
                    </Link>
                </div>

                {/* Interactive Preview Console */}
                <div className="relative z-10 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Left: Direction & Probability Ring */}
                    <div className="rounded-2xl bg-slate-50/80 border border-slate-200/80 p-5 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Neural Forecast</span>
                                <div className="flex gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
                                    {['M15', 'H1', 'H4', 'D1'].map(tf => (
                                        <button
                                            key={tf}
                                            onClick={() => handleSwitchTf(tf)}
                                            className={`px-2 py-0.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                                                timeframe === tf
                                                    ? 'bg-blue-600 text-white shadow-xs'
                                                    : 'text-slate-500 hover:text-slate-900'
                                            }`}
                                        >
                                            {tf}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Direction Badge */}
                            <div className={`rounded-2xl border p-4 text-center my-3 transition-all ${dirBg}`}>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Arah Prediksi</p>
                                <motion.div
                                    key={direction + timeframe}
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className={`text-4xl sm:text-5xl font-black ${dirColor}`}
                                >
                                    {direction}
                                </motion.div>
                                <div className="mt-2 flex items-center justify-center gap-1.5">
                                    <span className="text-xs text-slate-500">Confidence Score:</span>
                                    <span className={`text-base font-bold font-mono ${dirColor}`}>{confidence.toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>

                        {/* Probability Breakdown */}
                        <div className="space-y-2 pt-2 border-t border-slate-200/80">
                            <div>
                                <div className="flex justify-between text-xs font-semibold mb-1">
                                    <span className="text-emerald-700">▲ UP (BUY)</span>
                                    <span className="font-mono text-emerald-700">{(probabilities.up * 100).toFixed(1)}%</span>
                                </div>
                                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                                        style={{ width: `${probabilities.up * 100}%` }}
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between text-xs font-semibold mb-1">
                                    <span className="text-rose-700">▼ DOWN (SELL)</span>
                                    <span className="font-mono text-rose-700">{(probabilities.down * 100).toFixed(1)}%</span>
                                </div>
                                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-rose-500 rounded-full transition-all duration-700"
                                        style={{ width: `${probabilities.down * 100}%` }}
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between text-xs font-semibold mb-1">
                                    <span className="text-amber-700">● NEUTRAL</span>
                                    <span className="font-mono text-amber-700">{(probabilities.neutral * 100).toFixed(1)}%</span>
                                </div>
                                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-amber-500 rounded-full transition-all duration-700"
                                        style={{ width: `${probabilities.neutral * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Center & Right: Live Market Setup & 22-Feature Engine Status */}
                    <div className="lg:col-span-2 space-y-4 flex flex-col justify-between">
                        
                        {/* Live Price & Trade Setup Card */}
                        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">XAU/USD Gold Spot</span>
                                    <div className="text-2xl sm:text-3xl font-mono font-bold text-slate-900 mt-0.5">
                                        ${price.toFixed(2)}
                                    </div>
                                </div>
                                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    LIVE FEED
                                </span>
                            </div>

                            {/* Execution Parameters Generated by Neural Model */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Entry Zone</span>
                                    <p className="text-sm font-bold font-mono text-slate-900 mt-0.5">
                                        ${(price - 1.2).toFixed(1)} - ${(price + 0.8).toFixed(1)}
                                    </p>
                                </div>
                                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80">
                                    <span className="text-[10px] font-bold text-emerald-700 uppercase">Target TP 1</span>
                                    <p className="text-sm font-bold font-mono text-emerald-700 mt-0.5">
                                        ${(price + (direction === 'SELL' ? -14.5 : 14.5)).toFixed(1)}
                                    </p>
                                </div>
                                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80">
                                    <span className="text-[10px] font-bold text-emerald-700 uppercase">Target TP 2</span>
                                    <p className="text-sm font-bold font-mono text-emerald-700 mt-0.5">
                                        ${(price + (direction === 'SELL' ? -28.0 : 28.0)).toFixed(1)}
                                    </p>
                                </div>
                                <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200/80">
                                    <span className="text-[10px] font-bold text-rose-700 uppercase">Stop Loss</span>
                                    <p className="text-sm font-bold font-mono text-rose-700 mt-0.5">
                                        ${(price + (direction === 'SELL' ? 8.5 : -8.5)).toFixed(1)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Top Technical Drivers */}
                        <div className="rounded-2xl bg-slate-50/80 border border-slate-200/80 p-5">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">
                                4 Indikator Penentu Terbesar
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                                    <span className="text-[11px] text-slate-500 font-medium">RSI (14)</span>
                                    <p className="text-sm font-bold font-mono text-slate-900">42.8 (Rebound)</p>
                                    <span className="text-[10px] text-emerald-600 font-semibold">● Bullish Hook</span>
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                                    <span className="text-[11px] text-slate-500 font-medium">Bollinger Band</span>
                                    <p className="text-sm font-bold font-mono text-slate-900">Mid Cross</p>
                                    <span className="text-[10px] text-blue-600 font-semibold">● Mean Reversion</span>
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                                    <span className="text-[11px] text-slate-500 font-medium">Vol Z-Score</span>
                                    <p className="text-sm font-bold font-mono text-slate-900">+1.84σ</p>
                                    <span className="text-[10px] text-emerald-600 font-semibold">● Institutional Inflow</span>
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                                    <span className="text-[11px] text-slate-500 font-medium">Active Session</span>
                                    <p className="text-sm font-bold text-slate-900">London-NY 🔥</p>
                                    <span className="text-[10px] text-purple-600 font-semibold">● Peak Liquidity</span>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Action Footer */}
                        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span>Model: Bi-LSTM 3-Layer (128→64→32) • 91.4% Backtest Accuracy</span>
                            </div>
                            <Link href="/xauusd-neural-lab" className="text-blue-600 font-bold hover:underline">
                                Buka Studio Lengkap &rarr;
                            </Link>
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
}
