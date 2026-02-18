'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PerformanceData {
    today: {
        accuracy: string;
        total: number;
        avgConfidence: string;
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
        <section className="w-full bg-slate-950 border-y border-slate-800 relative overflow-hidden">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10 pointer-events-none"></div>

            <div className="container-wide py-4 md:py-6">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-6">

                    {/* Header & Live Status */}
                    <div className="flex items-center gap-4 min-w-[280px]">
                        <div className="relative">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-ping absolute inset-0"></div>
                            <div className="w-3 h-3 bg-green-500 rounded-full relative z-10"></div>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-400 tracking-wider">DAILY REPORTS</h3>
                            <div className="text-xl font-black text-white leading-none">
                                PERFORMANCE <span className="text-blue-500">LIVE</span>
                            </div>
                        </div>
                        <div className="hidden sm:block h-8 w-px bg-slate-800 mx-2"></div>
                        <div className="hidden sm:block font-mono text-slate-500 text-sm">
                            {currentTime} <br />
                            <span className="text-xs text-slate-600">UTC+7</span>
                        </div>
                    </div>

                    {/* Main Stats Grid */}
                    <div className="flex-1 w-full grid grid-cols-2 md:grid-cols-4 gap-4">

                        {/* Accuracy Card */}
                        <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden group hover:border-blue-500/50 transition-colors">
                            <div className="absolute top-0 right-0 p-1 opacity-20">
                                <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <span className="text-xs text-slate-400 uppercase tracking-wider mb-1">Accuracy Today</span>
                            <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                                {data?.today.accuracy}%
                            </div>
                            <span className="text-[10px] text-green-500 flex items-center gap-1">
                                <span className="animate-pulse">●</span> High Confidence
                            </span>
                        </div>

                        {/* Signals Today */}
                        <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-800 flex flex-col items-center justify-center group hover:border-purple-500/50 transition-colors">
                            <span className="text-xs text-slate-400 uppercase tracking-wider mb-1">Signals Today</span>
                            <div className="text-2xl md:text-3xl font-bold text-white">
                                {data?.today.total}
                            </div>
                            <span className="text-[10px] text-slate-500">
                                +{data?.lastHour.total} Last Hour
                            </span>
                        </div>

                        {/* Avg Confidence */}
                        <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-800 flex flex-col items-center justify-center group hover:border-amber-500/50 transition-colors">
                            <span className="text-xs text-slate-400 uppercase tracking-wider mb-1">AI Confidence</span>
                            <div className="text-2xl md:text-3xl font-bold text-amber-400">
                                {data?.today.avgConfidence}%
                            </div>
                            <span className="text-[10px] text-slate-500">
                                Neural Engine v7
                            </span>
                        </div>

                        {/* System Status */}
                        <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-800 flex flex-col items-center justify-center group hover:border-green-500/50 transition-colors">
                            <span className="text-xs text-slate-400 uppercase tracking-wider mb-1">System Status</span>
                            <div className="text-lg font-bold text-green-400 flex items-center gap-2">
                                ONLINE
                                <span className="flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">
                                T+{secondTicker}s uptime
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
                                    <span className="text-slate-400">Target hit at {item.target}</span>
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
