'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DocumentIcon, TrendUpIcon, ChartIcon, ChevronDownIcon } from '@/components/PremiumIcons';

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
            if (data.status === 'success') setHistory(data.data);
        } catch (error) {
            console.error('Failed to fetch history:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredHistory = history.filter(item => filter === 'all' ? true : item.type === filter);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const getTypeColor = (type: string) => {
        return type === 'forex' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700';
    };

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
                <div className="w-10 h-10 border-2 border-[var(--accent-blue)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pt-20">
            <div className="container-wide section-padding pt-8">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--border-light)] bg-white mb-6">
                        <DocumentIcon className="text-[var(--accent-blue)]" size="lg" />
                        <span className="text-sm text-[var(--text-secondary)]">Analysis History</span>
                    </div>
                    <h1 className="text-3xl lg:text-4xl font-bold text-[var(--text-primary)] mb-3">
                        Riwayat <span className="gradient-text">Analisa</span>
                    </h1>
                    <p className="text-[var(--text-secondary)]">Lihat kembali hasil analisa sebelumnya</p>
                </motion.div>

                {/* Filter Tabs */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex justify-center gap-2 mb-6">
                    {(['all', 'forex', 'stock'] as const).map((tab) => (
                        <button key={tab} onClick={() => setFilter(tab)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === tab ? 'bg-[var(--accent-blue)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
                            {tab === 'all' ? 'Semua' : tab === 'forex' ? <><TrendUpIcon className="inline" size="sm" /> Forex</> : <><ChartIcon className="inline" size="sm" /> Saham</>}
                        </button>
                    ))}
                </motion.div>

                {/* Stats */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="grid grid-cols-3 gap-4 mb-6 max-w-lg mx-auto">
                    <div className="bg-white rounded-xl p-4 border border-[var(--border-light)] text-center">
                        <p className="text-2xl font-bold text-[var(--text-primary)]">{history.length}</p>
                        <p className="text-xs text-[var(--text-muted)]">Total Analisa</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-[var(--border-light)] text-center">
                        <p className="text-2xl font-bold text-[var(--accent-blue)]">{history.filter(h => h.type === 'forex').length}</p>
                        <p className="text-xs text-[var(--text-muted)]">Forex</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-[var(--border-light)] text-center">
                        <p className="text-2xl font-bold text-green-600">{history.filter(h => h.type === 'stock').length}</p>
                        <p className="text-xs text-[var(--text-muted)]">Saham</p>
                    </div>
                </motion.div>

                {/* History List */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-3 max-w-4xl mx-auto">
                    {filteredHistory.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 border border-[var(--border-light)] text-center">
                            <span className="text-5xl mb-4 block">📭</span>
                            <h3 className="text-xl font-bold mb-2 text-[var(--text-primary)]">Belum Ada Riwayat</h3>
                            <p className="text-[var(--text-secondary)] mb-4">Mulai analisa untuk menyimpan riwayat</p>
                            <div className="flex justify-center gap-3">
                                <Link href="/analisa-market" className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition-colors">Analisa Forex</Link>
                                <Link href="/analisa-saham" className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 transition-colors">Analisa Saham</Link>
                            </div>
                        </div>
                    ) : (
                        filteredHistory.map((item) => (
                            <motion.div key={item.id} layout className="bg-white rounded-xl border border-[var(--border-light)] overflow-hidden">
                                <button onClick={() => setExpandedId(expandedId === item.id ? null : item.id)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--bg-secondary)] transition-colors">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getTypeColor(item.type)}`}>
                                            {item.type === 'forex' ? <><TrendUpIcon className="inline" size="sm" /> Forex</> : <><ChartIcon className="inline" size="sm" /> Saham</>}
                                        </span>
                                        <span className="font-bold text-[var(--text-primary)]">{item.symbol}</span>
                                        {item.timeframe && <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded">{item.timeframe}</span>}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-[var(--text-muted)]">{formatDate(item.createdAt)}</span>
                                        <ChevronDownIcon className={`text-[var(--text-muted)] transition-transform ${expandedId === item.id ? 'rotate-180' : ''}`} size="sm" />
                                    </div>
                                </button>
                                <AnimatePresence>
                                    {expandedId === item.id && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-[var(--border-light)]">
                                            <div className="p-4 bg-[var(--bg-secondary)]">
                                                <div className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto" style={{ fontSize: '13px' }}>
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
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-center text-xs text-[var(--text-muted)] mt-6">
                    Riwayat menyimpan maksimal 50 analisa terakhir
                </motion.p>
            </div>
        </div>
    );
}
