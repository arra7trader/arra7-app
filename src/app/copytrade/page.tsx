'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import ProviderCard from '@/components/copytrade/ProviderCard';

export default function CopyTradePage() {
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('popular'); // popular, profitable, safest

    useEffect(() => {
        fetchProviders();
    }, []);

    const fetchProviders = async () => {
        try {
            const res = await fetch('/api/copytrade/providers');
            const data = await res.json();
            if (data.providers) {
                setProviders(data.providers);
            }
        } catch (error) {
            console.error('Failed to fetch providers:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredProviders = [...providers].sort((a: any, b: any) => {
        if (filter === 'popular') return b.total_followers - a.total_followers;
        if (filter === 'profitable') return b.total_profit_usd - a.total_profit_usd;
        if (filter === 'safest') return a.max_drawdown - b.max_drawdown;
        return 0;
    });

    return (
        <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] selection:bg-[var(--accent-blue)] selection:text-white">
            <Navbar />

            <div className="pt-48 pb-20 container mx-auto px-4">
                {/* Hero Section */}
                <div className="text-center mb-16 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
                            Copy <span className="gradient-text">Pro Traders</span>
                        </h1>
                        <p className="text-xl text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
                            Follow experienced traders and automate your profits.
                            Choose from verified signal providers and start copying instantly.
                        </p>
                    </motion.div>
                </div>

                {/* Filter Tabs */}
                <div className="flex justify-center mb-12">
                    <div className="p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] flex items-center gap-1">
                        {[
                            { id: 'popular', label: 'Most Popular' },
                            { id: 'profitable', label: 'Highest Profit' },
                            { id: 'safest', label: 'Lowest Risk' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setFilter(tab.id)}
                                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${filter === tab.id
                                    ? 'bg-white text-[var(--text-primary)] shadow-sm border border-[var(--border-light)]'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/50'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Providers Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="h-[280px] bg-[var(--bg-secondary)] rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredProviders.map((provider: any) => (
                            <ProviderCard key={provider.id} provider={provider} />
                        ))}

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="group relative bg-[var(--bg-secondary)] rounded-2xl p-5 border border-dashed border-[var(--border-medium)] hover:border-[var(--accent-blue)] transition-all duration-300 flex flex-col items-center justify-center text-center h-[280px]"
                        >
                            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                                <svg className="w-8 h-8 text-[var(--text-secondary)] group-hover:text-[var(--accent-blue)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Become a Provider</h3>
                            <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-[200px]">
                                Share your trades and earn subscription fees or profit sharing.
                            </p>
                            <Link href="/copytrade/become-provider">
                                <button className="px-6 py-2 rounded-full bg-[var(--text-primary)] hover:bg-black text-white text-sm font-medium transition-colors shadow-lg hover:shadow-xl">
                                    Apply Now
                                </button>
                            </Link>
                        </motion.div>
                    </div>
                )}
            </div>
        </main>
    );
}
