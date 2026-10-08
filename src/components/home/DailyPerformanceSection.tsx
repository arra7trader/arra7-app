'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface StatBlock {
    accuracy: string;
    total: number;
    tpHit: number | string;
    slHit: number | string;
    pending: number | string;
    totalPips?: string;
}

interface PerformanceData {
    today: StatBlock;
    overall: StatBlock;
    lastHour: { total: number };
    ticker: Array<{ symbol: string; action: string; target: number | string; time: string }>;
}

function StatCard({ value, label, color }: { value: string | number; label: string; color?: string }) {
    return (
        <motion.div
            variants={{ hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1 } }}
            className="bg-white rounded-2xl p-3 md:p-4 border border-slate-200/90 text-center shadow-xs hover:shadow-md transition-all group"
        >
            <p className={`text-xl md:text-2xl font-bold ${color ?? 'text-slate-900'} group-hover:scale-105 transition-transform`}>
                {value}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mt-1">{label}</p>
        </motion.div>
    );
}

export default function DailyPerformanceSection() {
    const [data, setData] = useState<PerformanceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [dateStr, setDateStr] = useState('');

    const fetchData = async () => {
        try {
            const res = await fetch(`/api/public/performance?t=${Date.now()}`);
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

    useEffect(() => {
        setDateStr(new Date().toLocaleDateString('id-ID', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            timeZone: 'Asia/Jakarta'
        }));

        fetchData();
        const interval = setInterval(fetchData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return null;

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, staggerChildren: 0.08 } }
    };

    return (
        <section className="py-8 border-y border-slate-200/80 bg-white/60 backdrop-blur-sm relative overflow-hidden rounded-3xl">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-6">

                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-75" />
                            <div className="relative w-3.5 h-3.5 bg-emerald-600 rounded-full border-2 border-white shadow-xs" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 leading-tight tracking-tight">LIVE ENGINE PERFORMANCE</h2>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{dateStr}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Bi-LSTM Engine Active
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                            91.4% Quant Win Rate
                        </span>
                    </div>
                </div>

                {/* TODAY's Performance */}
                <motion.div variants={containerVariants} initial="hidden" animate="visible">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2.5">
                        ðŸ“ˆ Performa Hari Ini
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <StatCard value={data?.today.total ?? 0} label="Total Sinyal" />
                        <StatCard value={data?.today.tpHit ?? 0} label="TP Hit" color="text-emerald-600 font-mono" />
                        <StatCard value={data?.today.slHit ?? 0} label="SL Hit" color="text-rose-600 font-mono" />
                        <StatCard value={data?.today.pending ?? 0} label="Pending" color="text-amber-600 font-mono" />
                        <StatCard
                            value={`${data?.today.accuracy ?? '0'}%`}
                            label="Win Rate"
                            color="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent font-black"
                        />
                    </div>
                </motion.div>

                {/* OVERALL Performance */}
                <motion.div variants={containerVariants} initial="hidden" animate="visible">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2.5">
                        ðŸ“Š Overall Performance
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <StatCard value={data?.overall?.total ?? 0} label="Total Sinyal" />
                        <StatCard value={data?.overall?.tpHit ?? 0} label="TP Hit" color="text-emerald-600 font-mono" />
                        <StatCard value={data?.overall?.slHit ?? 0} label="SL Hit" color="text-rose-600 font-mono" />
                        <StatCard value={data?.overall?.pending ?? 0} label="Pending" color="text-amber-600 font-mono" />
                        <StatCard
                            value={`${data?.overall?.accuracy ?? '0'}%`}
                            label="Win Rate"
                            color="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent font-black"
                        />
                    </div>
                </motion.div>

            </div>
        </section>
    );
}
