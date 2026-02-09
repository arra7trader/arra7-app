'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { LockIcon } from '@/components/PremiumIcons';

const indicators = [
    {
        id: 'silver-bullet',
        name: 'ICT Silver Bullet',
        description: 'Time-based FVG scalping menggunakan metode ICT. Auto-highlight Kill Zones dan detect Fair Value Gap.',
        features: ['3 Kill Zones Auto', 'FVG Detection', 'HTF Trend Filter', 'Alert System'],
        winrate: '65-75%',
        strategy: 'ICT Scalping',
        color: 'blue',
    },
    {
        id: 'liquidity-hunter',
        name: 'Liquidity Hunter',
        description: 'Detect liquidity sweep dan reversal. Auto-mark Previous Day High/Low dan Asian Session Range.',
        features: ['PDH/PDL Auto Mark', 'Asian Range', 'Sweep Detection', 'Smart Entry Zones'],
        winrate: '70%+',
        strategy: 'Institutional Trading',
        color: 'purple',
    },
    {
        id: 'order-flow',
        name: 'Order Flow Sniper',
        description: 'Auto-detect valid Order Blocks dan Breaker Blocks dengan filter volume.',
        features: ['Valid OB Only', 'Volume Filter', 'Breaker Blocks', 'Premium/Discount'],
        winrate: '60-70%',
        strategy: 'SMC Order Blocks',
        color: 'amber',
    },
    {
        id: 'momentum-shift',
        name: 'Momentum Shift',
        description: 'Real-time Break of Structure (BOS) dan Change of Character (CHoCH) detection.',
        features: ['BOS Alerts', 'CHoCH Detection', 'RSI Divergence', 'MTF Structure'],
        winrate: '65%',
        strategy: 'Structure Trading',
        color: 'green',
    },
    {
        id: 'high-prob-zone',
        name: 'HP Zone Finder',
        description: 'Kombinasi Williams %R + KAMA + fractal S/R. Entry hanya di confluence 3 faktor.',
        features: ['Williams %R', 'KAMA Trend', 'Fractal S/R', '3-Factor Entry'],
        winrate: '75-81%',
        strategy: 'Confluence Trading',
        color: 'rose',
    },
];

export default function IndicatorsPage() {
    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pt-20">
            {/* Hero Section */}
            <section className="section-padding text-center">
                <div className="container-apple">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <span className="badge-apple mb-6 inline-flex">
                            🔒 Coming Soon - Q1 2025
                        </span>
                        <h1 className="headline-lg mb-4">
                            <span className="gradient-text">Premium Indicators</span>
                            <br />
                            ICT & Smart Money Concepts
                        </h1>
                        <p className="body-lg max-w-2xl mx-auto">
                            Indikator berbasis strategi institusional dengan winrate tinggi.
                            Bukan indikator retail biasa.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Stats */}
            <section className="section-padding pt-0">
                <div className="container-apple">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="grid grid-cols-2 md:grid-cols-4 gap-4"
                    >
                        {[
                            { label: 'Total Indicators', value: '5', icon: '📊' },
                            { label: 'Highest Winrate', value: '81%', icon: '🎯' },
                            { label: 'Platform', value: 'TradingView', icon: '📈' },
                            { label: 'Timezone', value: 'WIB Ready', icon: '🇮🇩' },
                        ].map((stat, i) => (
                            <div key={i} className="card-feature text-center py-6">
                                <div className="text-2xl mb-2">{stat.icon}</div>
                                <div className="text-2xl font-bold text-[var(--text-primary)]">{stat.value}</div>
                                <div className="text-sm text-[var(--text-secondary)]">{stat.label}</div>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Indicators Grid */}
            <section className="section-padding bg-[var(--bg-secondary)]">
                <div className="container-wide">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {indicators.map((indicator, index) => (
                            <motion.div
                                key={indicator.id}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * index }}
                                className="relative bg-white rounded-2xl p-6 border border-[var(--border-light)] overflow-hidden"
                            >
                                {/* Lock Overlay */}
                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                                    <div className="w-12 h-12 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mb-3">
                                        <LockIcon className="text-[var(--text-secondary)]" size="lg" />
                                    </div>
                                    <span className="font-medium text-[var(--text-primary)]">Coming Soon</span>
                                    <span className="text-sm text-[var(--text-secondary)]">Q1 2025</span>
                                </div>

                                {/* Content */}
                                <div className="blur-[2px]">
                                    <h3 className="text-lg font-semibold mb-2">{indicator.name}</h3>
                                    <div className="flex gap-2 mb-3">
                                        <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                                            {indicator.winrate} Winrate
                                        </span>
                                        <span className="px-2 py-1 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-xs">
                                            {indicator.strategy}
                                        </span>
                                    </div>
                                    <p className="text-sm text-[var(--text-secondary)] mb-4">{indicator.description}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {indicator.features.slice(0, 3).map((feature, i) => (
                                            <span key={i} className="px-2 py-1 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-xs">
                                                ✓ {feature}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Why Different */}
            <section className="section-padding">
                <div className="container-apple">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-12"
                    >
                        <h2 className="headline-md mb-4">
                            Kenapa <span className="gradient-text">Berbeda</span>?
                        </h2>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[
                            { title: 'ICT/SMC Based', desc: 'Strategi institusional yang digunakan bank dan hedge fund.', icon: '🏦' },
                            { title: 'Time-Based Entry', desc: 'Kill Zones sudah dikonversi ke WIB.', icon: '⏰' },
                            { title: 'Filtered Signals', desc: 'Hanya setup high-probability. Tanpa noise.', icon: '🎯' },
                            { title: 'AI Integration', desc: 'Kombinasikan dengan AI Analysis ARRA7.', icon: '🤖' },
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.1 * i }}
                                className="card-feature"
                            >
                                <div className="text-3xl mb-3">{item.icon}</div>
                                <h3 className="font-semibold mb-2">{item.title}</h3>
                                <p className="text-sm text-[var(--text-secondary)]">{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="section-padding bg-[var(--bg-secondary)]">
                <div className="container-apple text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="headline-md mb-4">
                            Daftar <span className="gradient-text">Waitlist</span>
                        </h2>
                        <p className="body-md mb-8 max-w-lg mx-auto">
                            Jadi yang pertama tahu saat indicators ini rilis. Dapatkan diskon 40% untuk early adopters!
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/pricing">
                                <button className="btn-primary">
                                    Join Waitlist
                                </button>
                            </Link>
                            <Link href="/analisa-market">
                                <button className="btn-secondary">
                                    Coba AI Analisa
                                </button>
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>
        </div>
    );
}
