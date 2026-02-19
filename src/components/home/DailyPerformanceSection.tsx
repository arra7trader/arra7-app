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
            className="bg-white rounded-xl p-3 md:p-4 border border-[var(--border-light)] text-center shadow-sm hover:shadow-md transition-all group"
        >
            <p className={`text-xl md:text-2xl font-bold ${color ?? 'text-[var(--text-primary)]'} group-hover:scale-110 transition-transform`}>
                {value}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mt-1">{label}</p>
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
        // Format date on client to avoid hydration mismatch
        setDateStr(new Date().toLocaleDateString('id-ID', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            timeZone: 'Asia/Jakarta'
        }));

        fetchData();
        // Refresh every 5 minutes
        const interval = setInterval(fetchData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return null;

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, staggerChildren: 0.08 } }
    };

    return (
        <section className="py-10 border-y border-[var(--border-light)] bg-white/50 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #0071e3 1px, transparent 1px)', backgroundSize: '16px 16px' }} />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-8">

                {/* Section Header */}
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75" />
                        <div className="relative w-3 h-3 bg-red-600 rounded-full border-2 border-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-[var(--text-primary)] leading-tight">LAPORAN HARIAN</h2>
                        <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider">{dateStr}</p>
                    </div>
                </div>

                {/* TODAY's Performance — exact match to Admin Report */}
                <motion.div variants={containerVariants} initial="hidden" animate="visible">
                    <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-3">
                        📈 Performa Hari Ini
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <StatCard value={data?.today.total ?? 0} label="Total Sinyal" />
                        <StatCard value={data?.today.tpHit ?? 0} label="TP Hit" color="text-green-600" />
                        <StatCard value={data?.today.slHit ?? 0} label="SL Hit" color="text-red-600" />
                        <StatCard value={data?.today.pending ?? 0} label="Pending" color="text-amber-600" />
                        <StatCard
                            value={`${data?.today.accuracy ?? '0'}%`}
                            label="Win Rate"
                            color="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
                        />
                    </div>
                </motion.div>

                {/* OVERALL Performance — exact match to Admin Report */}
                <motion.div variants={containerVariants} initial="hidden" animate="visible">
                    <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-3">
                        📊 Overall Performance
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <StatCard value={data?.overall?.total ?? 0} label="Total Sinyal" />
                        <StatCard value={data?.overall?.tpHit ?? 0} label="TP Hit" color="text-green-600" />
                        <StatCard value={data?.overall?.slHit ?? 0} label="SL Hit" color="text-red-600" />
                        <StatCard value={data?.overall?.pending ?? 0} label="Pending" color="text-amber-600" />
                        <StatCard
                            value={`${data?.overall?.accuracy ?? '0'}%`}
                            label="Win Rate"
                            color="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
                        />
                    </div>
                </motion.div>

            </div>
        </section>
    );
}
