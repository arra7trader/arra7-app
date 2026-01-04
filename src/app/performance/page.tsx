'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ChartIcon, CheckCircleIcon, XCircleIcon, ClockIcon, TrophyIcon, DocumentIcon, WarningIcon, RocketIcon, TrendUpIcon } from '@/components/PremiumIcons';

interface PerformanceData {
    overall: {
        total: number;
        tpHit: number;
        slHit: number;
        pending: number;
        winRate: string;
        avgConfidence: string;
    };
    bySymbol: Array<{
        symbol: string;
        type: string;
        total: number;
        tpHit: number;
        winRate: number;
    }>;
    recentSignals: Array<{
        id: number;
        type: string;
        symbol: string;
        timeframe: string;
        direction: string;
        entryPrice: number;
        stopLoss: number;
        takeProfit: number;
        confidence: number;
        status: string;
        createdAt: string;
        verifiedAt: string;
    }>;
    dailyStats: Array<{
        date: string;
        total: number;
        tpHit: number;
        slHit: number;
    }>;
}

export default function PerformancePage() {
    const [data, setData] = useState<PerformanceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<'all' | '7d' | '30d'>('all');
    const [filter, setFilter] = useState<'all' | 'forex' | 'stock'>('all');

    useEffect(() => {
        fetchPerformance();
    }, [period, filter]);

    const fetchPerformance = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            params.set('period', period);
            if (filter !== 'all') params.set('type', filter);
            const res = await fetch(`/api/performance?${params.toString()}`);
            const result = await res.json();
            if (result.status === 'success') setData(result.data);
        } catch (error) {
            console.error('Failed to fetch performance:', error);
        } finally {
            setLoading(false);
        }
    };

    const getWinRateColor = (winRate: number | string) => {
        const rate = typeof winRate === 'string' ? parseFloat(winRate) : winRate;
        if (rate >= 70) return 'text-green-600';
        if (rate >= 50) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'TP_HIT': return 'bg-green-100 text-green-700';
            case 'SL_HIT': return 'bg-red-100 text-red-700';
            default: return 'bg-yellow-100 text-yellow-700';
        }
    };

    if (loading && !data) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
                <div className="w-10 h-10 border-2 border-[var(--accent-blue)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const overall = data?.overall || { total: 0, tpHit: 0, slHit: 0, pending: 0, winRate: '0', avgConfidence: '0' };

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pt-20">
            <div className="container-wide section-padding pt-8">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--border-light)] bg-white mb-6">
                        <ChartIcon className="text-[var(--accent-blue)]" size="lg" />
                        <span className="text-sm text-[var(--text-secondary)]">Verified Stats</span>
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">LIVE</span>
                    </div>
                    <h1 className="text-3xl lg:text-4xl font-bold text-[var(--text-primary)] mb-3">
                        AI <span className="gradient-text">Performance</span>
                    </h1>
                    <p className="text-[var(--text-secondary)]">Statistik performa AI ARRA7 yang terverifikasi dan transparan</p>
                </motion.div>

                {/* Filters */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-wrap justify-center gap-4 mb-8">
                    <div className="flex gap-2">
                        {(['all', '30d', '7d'] as const).map((p) => (
                            <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${period === p ? 'bg-[var(--accent-blue)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
                                {p === 'all' ? 'All Time' : p === '30d' ? '30 Hari' : '7 Hari'}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        {(['all', 'forex', 'stock'] as const).map((f) => (
                            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f ? 'bg-[var(--accent-blue)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
                                {f === 'all' ? 'Semua' : f === 'forex' ? <><TrendUpIcon className="inline mr-1" size="sm" /> Forex</> : <><ChartIcon className="inline mr-1" size="sm" /> Saham</>}
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Main Stats */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                    <div className="bg-white rounded-xl p-6 border border-[var(--border-light)] text-center col-span-2 lg:col-span-1">
                        <p className="text-4xl font-bold gradient-text">{overall.winRate}%</p>
                        <p className="text-sm text-[var(--text-muted)]">Win Rate</p>
                    </div>
                    <div className="bg-white rounded-xl p-6 border border-[var(--border-light)] text-center">
                        <p className="text-3xl font-bold text-[var(--text-primary)]">{overall.total}</p>
                        <p className="text-sm text-[var(--text-muted)]">Total Signal</p>
                    </div>
                    <div className="bg-white rounded-xl p-6 border border-[var(--border-light)] text-center">
                        <p className="text-3xl font-bold text-green-600">{overall.tpHit}</p>
                        <p className="text-sm text-[var(--text-muted)] flex items-center justify-center gap-1"><CheckCircleIcon className="text-green-600" size="sm" /> TP Hit</p>
                    </div>
                    <div className="bg-white rounded-xl p-6 border border-[var(--border-light)] text-center">
                        <p className="text-3xl font-bold text-red-600">{overall.slHit}</p>
                        <p className="text-sm text-[var(--text-muted)] flex items-center justify-center gap-1"><XCircleIcon className="text-red-600" size="sm" /> SL Hit</p>
                    </div>
                    <div className="bg-white rounded-xl p-6 border border-[var(--border-light)] text-center">
                        <p className="text-3xl font-bold text-yellow-600">{overall.pending}</p>
                        <p className="text-sm text-[var(--text-muted)] flex items-center justify-center gap-1"><ClockIcon className="text-yellow-600" size="sm" /> Pending</p>
                    </div>
                </motion.div>

                {/* Two Column Layout */}
                <div className="grid lg:grid-cols-2 gap-6 mb-8">
                    {/* Top Symbols */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-xl border border-[var(--border-light)] overflow-hidden">
                        <div className="p-4 border-b border-[var(--border-light)]">
                            <h2 className="text-lg font-bold flex items-center gap-2 text-[var(--text-primary)]">
                                <TrophyIcon className="text-yellow-500" size="md" /> Top Performing Symbols
                            </h2>
                        </div>
                        <div className="p-4">
                            {data?.bySymbol && data.bySymbol.length > 0 ? (
                                <div className="space-y-3">
                                    {data.bySymbol.slice(0, 5).map((item, index) => (
                                        <div key={item.symbol} className="flex items-center justify-between bg-[var(--bg-secondary)] rounded-lg p-3">
                                            <div className="flex items-center gap-3">
                                                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">{index + 1}</span>
                                                <div>
                                                    <p className="font-semibold text-[var(--text-primary)]">{item.symbol}</p>
                                                    <p className="text-xs text-[var(--text-muted)]">{item.total} signals</p>
                                                </div>
                                            </div>
                                            <span className={`text-lg font-bold ${getWinRateColor(item.winRate)}`}>{item.winRate}%</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-[var(--text-muted)] py-8">Belum ada data</p>
                            )}
                        </div>
                    </motion.div>

                    {/* Recent Signals */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white rounded-xl border border-[var(--border-light)] overflow-hidden">
                        <div className="p-4 border-b border-[var(--border-light)]">
                            <h2 className="text-lg font-bold flex items-center gap-2 text-[var(--text-primary)]">
                                <DocumentIcon className="text-[var(--accent-blue)]" size="md" /> Recent Signals
                            </h2>
                        </div>
                        <div className="p-4 max-h-80 overflow-y-auto">
                            {data?.recentSignals && data.recentSignals.length > 0 ? (
                                <div className="space-y-2">
                                    {data.recentSignals.slice(0, 10).map((signal) => (
                                        <div key={signal.id} className="flex items-center justify-between bg-[var(--bg-secondary)] rounded-lg p-3">
                                            <div className="flex items-center gap-3">
                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusBadge(signal.status)}`}>
                                                    {signal.status === 'TP_HIT' ? <CheckCircleIcon className="text-green-600" size="sm" /> : signal.status === 'SL_HIT' ? <XCircleIcon className="text-red-600" size="sm" /> : <ClockIcon className="text-yellow-600" size="sm" />}
                                                </span>
                                                <div>
                                                    <p className="font-semibold text-sm text-[var(--text-primary)]">{signal.symbol}</p>
                                                    <p className="text-xs text-[var(--text-muted)]">{signal.direction} @ {signal.entryPrice}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-[var(--text-muted)]">{new Date(signal.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-[var(--text-muted)] py-8">Belum ada signal</p>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Disclaimer */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                    <p className="text-sm text-amber-700">
                        <WarningIcon className="text-amber-600 inline mr-1" size="sm" /> <strong>Disclaimer:</strong> Performa masa lalu tidak menjamin hasil di masa depan. Selalu gunakan money management yang baik dan lakukan riset mandiri (DYOR).
                    </p>
                </motion.div>

                {/* CTA */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="text-center mt-8">
                    <Link href="/analisa-market" className="btn-primary inline-flex items-center gap-2">
                        <RocketIcon size="md" /> Coba Analisa AI Sekarang
                    </Link>
                </motion.div>
            </div>
        </div>
    );
}
