'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface HistoryItem {
    id: number;
    type: 'forex' | 'stock';
    symbol: string;
    timeframe: string | null;
    result: string;
    createdAt: string;
}

export default function HistoryPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'forex' | 'stock'>('all');
    const [expandedId, setExpandedId] = useState<number | null>(null);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login?callbackUrl=/history');
        } else if (status === 'authenticated') {
            fetchHistory();
        }
    }, [status, router]);

    const fetchHistory = async () => {
        try {
            const res = await fetch('/api/history?limit=50');
            const data = await res.json();
            if (data.status === 'success') {
                setHistory(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch history:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredHistory = history.filter(item =>
        filter === 'all' ? true : item.type === filter
    );

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getTypeColor = (type: string) => {
        return type === 'forex'
            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
            : 'bg-green-500/20 text-green-400 border-green-500/30';
    };

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="relative min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8">
            {/* Background */}
            <div className="absolute inset-0 bg-grid opacity-20" />
            <div className="bg-orb bg-orb-blue w-[600px] h-[600px] -top-40 left-1/4 opacity-20" />
            <div className="bg-orb bg-orb-purple w-[500px] h-[500px] bottom-0 right-1/4 opacity-15" />

            <div className="relative max-w-4xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#1F2937] bg-[#12141A]/50 backdrop-blur-sm mb-6">
                        <span className="text-xl">📜</span>
                        <span className="text-sm text-[#94A3B8]">Analysis History</span>
                    </div>
                    <h1 className="text-3xl lg:text-4xl font-bold mb-3">
                        Riwayat <span className="gradient-text">Analisa</span>
                    </h1>
                    <p className="text-[#94A3B8]">
                        Lihat kembali hasil analisa sebelumnya
                    </p>
                </motion.div>

                {/* Filter Tabs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex justify-center gap-2 mb-6"
                >
                    {(['all', 'forex', 'stock'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setFilter(tab)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === tab
                                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                                    : 'bg-[#1F2937] text-[#94A3B8] hover:bg-[#374151]'
                                }`}
                        >
                            {tab === 'all' ? 'Semua' : tab === 'forex' ? '📈 Forex' : '📊 Saham'}
                        </button>
                    ))}
                </motion.div>

                {/* Stats */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="grid grid-cols-3 gap-4 mb-6"
                >
                    <div className="glass rounded-xl p-4 border border-[#1F2937] text-center">
                        <p className="text-2xl font-bold">{history.length}</p>
                        <p className="text-xs text-[#64748B]">Total Analisa</p>
                    </div>
                    <div className="glass rounded-xl p-4 border border-[#1F2937] text-center">
                        <p className="text-2xl font-bold text-blue-400">
                            {history.filter(h => h.type === 'forex').length}
                        </p>
                        <p className="text-xs text-[#64748B]">Forex</p>
                    </div>
                    <div className="glass rounded-xl p-4 border border-[#1F2937] text-center">
                        <p className="text-2xl font-bold text-green-400">
                            {history.filter(h => h.type === 'stock').length}
                        </p>
                        <p className="text-xs text-[#64748B]">Saham</p>
                    </div>
                </motion.div>

                {/* History List */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-3"
                >
                    {filteredHistory.length === 0 ? (
                        <div className="glass rounded-2xl p-12 border border-[#1F2937] text-center">
                            <span className="text-5xl mb-4 block">📭</span>
                            <h3 className="text-xl font-bold mb-2">Belum Ada Riwayat</h3>
                            <p className="text-[#94A3B8] mb-4">
                                Mulai analisa untuk menyimpan riwayat
                            </p>
                            <div className="flex justify-center gap-3">
                                <Link
                                    href="/analisa-market"
                                    className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30 transition-colors"
                                >
                                    Analisa Forex
                                </Link>
                                <Link
                                    href="/analisa-saham"
                                    className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/30 transition-colors"
                                >
                                    Analisa Saham
                                </Link>
                            </div>
                        </div>
                    ) : (
                        filteredHistory.map((item) => (
                            <motion.div
                                key={item.id}
                                layout
                                className="glass rounded-xl border border-[#1F2937] overflow-hidden"
                            >
                                <button
                                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#1F2937]/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2 py-1 rounded text-xs font-semibold border ${getTypeColor(item.type)}`}>
                                            {item.type === 'forex' ? '📈 Forex' : '📊 Saham'}
                                        </span>
                                        <span className="font-bold">{item.symbol}</span>
                                        {item.timeframe && (
                                            <span className="text-xs text-[#64748B] bg-[#12141A] px-2 py-0.5 rounded">
                                                {item.timeframe}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-[#64748B]">
                                            {formatDate(item.createdAt)}
                                        </span>
                                        <svg
                                            className={`w-4 h-4 text-[#64748B] transition-transform ${expandedId === item.id ? 'rotate-180' : ''}`}
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </button>
                                <AnimatePresence>
                                    {expandedId === item.id && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="border-t border-[#1F2937]"
                                        >
                                            <div className="p-4 bg-[#12141A]">
                                                <div
                                                    className="text-sm text-[#94A3B8] whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto"
                                                    style={{ fontSize: '13px' }}
                                                >
                                                    {item.result}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))
                    )}
                </motion.div>

                {/* Info */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-center text-xs text-[#64748B] mt-6"
                >
                    Riwayat menyimpan maksimal 50 analisa terakhir
                </motion.p>
            </div>
        </div>
    );
}
