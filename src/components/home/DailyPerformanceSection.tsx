'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Interface matching the Admin Report Summary
// Ensuring all number fields can handle string or number from API
interface DailyStats {
    accuracy: string;
    total: number;
    tpHit?: number | string;
    slHit?: number | string;
    pending?: number | string;
    totalPips: string;
    avgConfidence: string;
}

interface PerformanceData {
    today: DailyStats;
    lastHour: {
        total: number;
    };
    ticker: Array<{
        symbol: string;
        action: 'BUY' | 'SELL';
        target: number;
        time: string;
    }>;
}

export default function DailyPerformanceSection() {
    const [data, setData] = useState<PerformanceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [time, setTime] = useState<Date | null>(null);

    // Initial fetch
    useEffect(() => {
        // Sets time only on client side to avoid hydration mismatch
        setTime(new Date());

        const fetchData = async () => {
            try {
                // Add timestamp to prevent caching
                const res = await fetch(`/api/public/performance?t=${new Date().getTime()}`, {
                    next: { revalidate: 60 }
                });
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

        // Refresh data every 5 minutes
        const dataInterval = setInterval(fetchData, 5 * 60 * 1000);

        // Update clock every second
        const clockInterval = setInterval(() => {
            setTime(new Date());
        }, 1000);

        return () => {
            clearInterval(dataInterval);
            clearInterval(clockInterval);
        };
    }, []);

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.6,
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, scale: 0.9 },
        visible: { opacity: 1, scale: 1 }
    };

    if (loading) return null;

    return (
        <section className="py-10 border-y border-[var(--border-light)] bg-white/50 backdrop-blur-sm relative overflow-hidden">
            {/* Background Pattern similar to Admin Page */}
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #0071e3 1px, transparent 1px)', backgroundSize: '16px 16px' }} />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-12"
                >
                    {/* Header Left - Clean & Professional */}
                    <div className="flex items-center gap-4 min-w-[200px]">
                        <div className="relative">
                            <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75" />
                            <div className="relative w-3 h-3 bg-red-600 rounded-full border-2 border-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[var(--text-primary)] leading-tight tracking-tight">
                                LAPORAN HARIAN
                            </h2>
                            <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider">
                                {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    </div>

                    {/* Admin-Style Stats Grid - EXACT MATCH to Admin Report */}
                    {/* 5 Columns: Total | TP | SL | Pending | Win Rate */}
                    <div className="flex-1 w-full md:w-auto">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {/* TOTAL */}
                            <motion.div variants={itemVariants} className="bg-white rounded-xl p-4 border border-[var(--border-light)] text-center shadow-sm hover:shadow-md transition-all">
                                <p className="text-2xl font-bold text-[var(--text-primary)]">{data?.today.total || 0}</p>
                                <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mt-1">Total Sinyal</p>
                            </motion.div>

                            {/* TP HIT */}
                            <motion.div variants={itemVariants} className="bg-white rounded-xl p-4 border border-green-100 text-center shadow-sm hover:shadow-md transition-all group">
                                <p className="text-2xl font-bold text-green-600 group-hover:scale-110 transition-transform">{data?.today.tpHit || 0}</p>
                                <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mt-1">TP Hit</p>
                            </motion.div>

                            {/* SL HIT */}
                            <motion.div variants={itemVariants} className="bg-white rounded-xl p-4 border border-red-100 text-center shadow-sm hover:shadow-md transition-all group">
                                <p className="text-2xl font-bold text-red-600 group-hover:scale-110 transition-transform">{data?.today.slHit || 0}</p>
                                <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mt-1">SL Hit</p>
                            </motion.div>

                            {/* PENDING */}
                            <motion.div variants={itemVariants} className="bg-white rounded-xl p-4 border border-amber-100 text-center shadow-sm hover:shadow-md transition-all group">
                                <p className="text-2xl font-bold text-amber-600 group-hover:scale-110 transition-transform">{data?.today.pending || 0}</p>
                                <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mt-1">Pending</p>
                            </motion.div>

                            {/* WIN RATE */}
                            <motion.div variants={itemVariants} className="bg-white rounded-xl p-4 border border-blue-100 text-center shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative">
                                    <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent group-hover:scale-110 transition-transform">
                                        {data?.today.accuracy || '0'}%
                                    </p>
                                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mt-1">Win Rate</p>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
