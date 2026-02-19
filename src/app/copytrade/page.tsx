'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import ProviderCard from '@/components/copytrade/ProviderCard';

const FILTERS = [
    { id: 'popular', label: '🔥 Terpopuler' },
    { id: 'profitable', label: '💰 Profit Tertinggi' },
    { id: 'safest', label: '🛡️ Risiko Terendah' },
    { id: 'newest', label: '✨ Terbaru' },
];

export default function CopyTradePage() {
    const [providers, setProviders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('popular');
    const [stats, setStats] = useState({ totalProviders: 0, totalFollowers: 0, totalTrades: 0 });

    useEffect(() => {
        Promise.all([
            fetch('/api/copytrade/providers').then(r => r.json()),
            fetch('/api/copytrade/stats').then(r => r.json()),
        ]).then(([pData, sData]) => {
            if (pData.providers) setProviders(pData.providers);
            setStats(sData);
        }).catch(console.error).finally(() => setLoading(false));
    }, []);

    const filteredProviders = [...providers].sort((a: any, b: any) => {
        if (filter === 'popular') return (b.total_followers ?? 0) - (a.total_followers ?? 0);
        if (filter === 'profitable') return (b.net_profit_usd ?? 0) - (a.net_profit_usd ?? 0);
        if (filter === 'safest') return (a.max_drawdown ?? 0) - (b.max_drawdown ?? 0);
        if (filter === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        return 0;
    });

    return (
        <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
            <Navbar />

            <div className="pt-28 pb-20 container mx-auto px-4 max-w-7xl">

                {/* Hero */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-12 relative"
                >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />
                    <div className="relative">
                        <span className="inline-block text-xs font-semibold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full mb-4">
                            Copy Trading Marketplace
                        </span>
                        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
                            Copy Trader <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Pro Indonesia</span>
                        </h1>
                        <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto leading-relaxed">
                            Ikuti trader berpengalaman dan otomasi profit kamu. Pilih dari provider terverifikasi dan mulai copy sekarang.
                        </p>
                    </div>
                </motion.div>

                {/* Platform Stats */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="grid grid-cols-3 gap-4 mb-12 max-w-2xl mx-auto"
                >
                    {[
                        { label: 'Provider Aktif', value: stats.totalProviders || providers.length || 0, suffix: '' },
                        { label: 'Total Copier', value: stats.totalFollowers, suffix: '' },
                        { label: 'Total Trades', value: stats.totalTrades, suffix: '' },
                    ].map((s, i) => (
                        <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 text-center shadow-sm">
                            <div className="text-2xl font-bold text-[var(--text-primary)]">{s.value.toLocaleString()}</div>
                            <div className="text-xs text-gray-400 mt-1 uppercase tracking-wider">{s.label}</div>
                        </div>
                    ))}
                </motion.div>

                {/* Filter Tabs */}
                <div className="flex justify-center mb-8">
                    <div className="p-1 rounded-2xl bg-gray-100 border border-gray-200 flex items-center gap-1 flex-wrap justify-center">
                        {FILTERS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setFilter(tab.id)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${filter === tab.id
                                    ? 'bg-white text-[var(--text-primary)] shadow-sm border border-gray-200'
                                    : 'text-gray-500 hover:text-[var(--text-primary)]'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Providers Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                            <div key={i} className="h-72 bg-white rounded-2xl animate-pulse border border-gray-100" />
                        ))}
                    </div>
                ) : filteredProviders.length === 0 ? (
                    <div className="text-center py-24">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Belum ada provider aktif</h3>
                        <p className="text-gray-400 text-sm mb-6">Jadilah yang pertama! Daftarkan diri sebagai signal provider.</p>
                        <Link href="/copytrade/become-provider">
                            <button className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm">
                                Daftar Jadi Provider
                            </button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {filteredProviders.map((provider: any, i: number) => (
                            <ProviderCard key={provider.id} provider={provider} />
                        ))}

                        {/* Become a Provider Card */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            className="group relative bg-white rounded-2xl p-5 border-2 border-dashed border-gray-200 hover:border-blue-300 transition-all duration-300 flex flex-col items-center justify-center text-center min-h-[280px] cursor-pointer"
                        >
                            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                            </div>
                            <h3 className="text-base font-bold text-gray-800 mb-2">Jadi Provider</h3>
                            <p className="text-xs text-gray-400 mb-5 max-w-[160px] leading-relaxed">Share sinyal trading & hasilkan passive income dari follower kamu.</p>
                            <Link href="/copytrade/become-provider">
                                <button className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors shadow-sm">
                                    Daftar Sekarang
                                </button>
                            </Link>
                        </motion.div>
                    </div>
                )}
            </div>
        </main>
    );
}
