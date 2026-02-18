'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PerformanceData {
    today: {
        accuracy: string;
        total: number;
        totalPips?: string;
        avgConfidence?: string;
    };
    lastHour: {
        total: number;
    };
    ticker: Array<{
        symbol: string;
        action: string;
        target: string;
        time: string;
    }>;
}

export default function DailyPerformanceSection() {
    const [data, setData] = useState<PerformanceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState<string>('');
    const [secondTicker, setSecondTicker] = useState(0);

    // Fetch data every 60 seconds (Real data update)
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/public/performance');
                const result = await res.json();
                if (result.status === 'success') {
                    setData(result.data);
                }
            } catch (error) {
                console.error('Failed to fetch performance data', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 60000); // 1 minute
        return () => clearInterval(interval);
    }, []);

    // Clock and Second Ticker (Simulated "Live" feel)
    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString('en-US', { hour12: false }));
            setSecondTicker(prev => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    if (loading) return null;

    return (
        <section className="w-full bg-gradient-to-b from-white/50 to-white backdrop-blur-sm border-b border-[var(--border-light)] relative overflow-hidden">

            <div className="container-wide py-4">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-6">

                    {/* Header & Live Status */}
                    <div className="flex items-center gap-4 min-w-[250px]">
                        <div className="relative">
                            <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping absolute inset-0"></div>
                            <div className="w-2.5 h-2.5 bg-red-500 rounded-full relative z-10"></div>
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-[var(--text-secondary)] tracking-wider">LIVE MARKET</h3>
                            <div className="text-lg font-black text-[var(--text-primary)] leading-none">
                                DAILY REPORT
                            </div>
                        </div>
                        <div className="hidden sm:block h-8 w-px bg-[var(--border-light)] mx-2"></div>
                        <div className="hidden sm:block font-mono text-[var(--text-secondary)] text-sm">
                            {currentTime} <br />
                            <span className="text-[10px] text-[var(--text-muted)]">WIB (UTC+7)</span>
                        </div>
                    </div>

                    {/* Main Stats Grid */}
                    <div className="flex-1 w-full grid grid-cols-2 md:grid-cols-4 gap-4">

                        {/* Accuracy Card */}
                        <div className="bg-white/80 rounded-xl p-3 border border-[var(--border-light)] flex flex-col items-center justify-center relative shadow-sm hover:shadow-md transition-all">
                            <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-1">Win Rate</span>
                            <div className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">
                                {data?.today.accuracy}%
                            </div>
                            <span className="text-[10px] text-green-600 font-medium">
                                Real-time
                            </span>
                        </div>

                        {/* Signals Today */}
                        <div className="bg-white/80 rounded-xl p-3 border border-[var(--border-light)] flex flex-col items-center justify-center shadow-sm hover:shadow-md transition-all">
                            <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-1">Total Sinyal</span>
                            <div className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">
                                {data?.today.total}
                            </div>
                            <span className="text-[10px] text-[var(--text-muted)]">
                                +{data?.lastHour.total} Jam Terakhir
                            </span>
                        </div>

                        {/* Total Pips (Replaces Confidence) */}
                        <div className="bg-white/80 rounded-xl p-3 border border-[var(--border-light)] flex flex-col items-center justify-center shadow-sm hover:shadow-md transition-all">
                            <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-1">Total Pips</span>
                            <div className="text-xl md:text-2xl font-bold text-blue-600">
                                {data?.today.totalPips || '0'}
                            </div>
                            <span className="text-[10px] text-[var(--text-muted)]">
                                Hari Ini
                            </span>
                        </div>

                        {/* System Status */}
                        <div className="bg-white/80 rounded-xl p-3 border border-[var(--border-light)] flex flex-col items-center justify-center shadow-sm hover:shadow-md transition-all">
                            <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-1">Server Status</span>
                            <div className="text-sm font-bold text-green-600 flex items-center gap-2">
                                CONNECTED
                                <span className="flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full bg-green-500 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-600"></span>
                                </span>
                            </div>
                            <span className="text-[10px] text-[var(--text-muted)] font-mono mt-1">
                                {secondTicker}s latency
                            </span>
                        </div>
                    </div>
                </div>

                {/* Ticker / Recent Activity */}
                <div className="mt-6 border-t border-slate-800 pt-4 relative">
                    <div className="absolute left-0 top-4 bottom-0 w-20 bg-gradient-to-r from-slate-950 to-transparent z-10"></div>
                    <div className="absolute right-0 top-4 bottom-0 w-20 bg-gradient-to-l from-slate-950 to-transparent z-10"></div>

                    <div className="flex gap-8 overflow-hidden whitespace-nowrap mask-gradient">
                        <motion.div
                            className="flex gap-8 items-center"
                            animate={{ x: [0, -1000] }}
                            transition={{
                                repeat: Infinity,
                                ease: "linear",
                                duration: 30 // Slow ticker speed
                            }}
                        >
                            {[...data?.ticker || [], ...data?.ticker || []].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm">
                                    <span className="font-bold text-white">{item.symbol}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${item.action === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {item.action}
                                    </span>
                                    <span className="text-slate-400">Target hit di {item.target}</span>
                                    <span className="text-slate-600 text-xs pl-2 border-l border-slate-800">
                                        {new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
}
