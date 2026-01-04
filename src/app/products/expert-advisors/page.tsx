'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const expertAdvisors = [
    {
        id: 'copy-ai',
        name: 'Copy AI Signals',
        description: 'Auto-execute trading signals dari AI Analysis ARRA7. Connect langsung ke API.',
        features: ['API Integration', 'Auto Execute', 'Custom Risk'],
        platform: 'MT4 / MT5',
        pairs: 'All + Gold',
        monthly: 'Varies',
        strategy: 'AI-Powered',
    },
    {
        id: 'silver-bullet',
        name: 'Silver Bullet Scalper',
        description: 'Automated ICT Silver Bullet strategy. Trading hanya di NY AM Session.',
        features: ['NY AM Only', 'FVG Entry', 'Auto SL/TP'],
        platform: 'MT4 / MT5',
        pairs: 'XAUUSD, GBPUSD',
        monthly: '~12%',
        strategy: 'ICT Time-Based',
    },
    {
        id: 'asian-sweep',
        name: 'Asian Sweep EA',
        description: 'Auto-trade Asian session liquidity sweep dengan CHoCH confirmation.',
        features: ['Asian Range Auto', 'Sweep Detection', 'Reversal Style'],
        platform: 'MT4 / MT5',
        pairs: 'XAUUSD, EUR, GBP',
        monthly: '~8%',
        strategy: 'Liquidity Hunting',
    },
    {
        id: 'williams-momentum',
        name: 'Williams Momentum',
        description: 'Combo Williams %R + KAMA trend filter. Strategi dengan 75% backtest winrate.',
        features: ['Williams %R', 'KAMA Filter', 'Auto Trailing'],
        platform: 'MT4 / MT5',
        pairs: 'Gold, Nasdaq',
        monthly: '~6%',
        strategy: 'Momentum Trading',
    },
];

export default function ExpertAdvisorsPage() {
    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pt-20">
            {/* Hero */}
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
                            <span className="gradient-text">Expert Advisors</span>
                            <br />
                            Profit Tanpa Ribet
                        </h1>
                        <p className="body-lg max-w-2xl mx-auto">
                            Robot trading dengan strategi proven. Trading 24/7 tanpa emosi.
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
                            { label: 'Total EAs', value: '4', icon: '🤖' },
                            { label: 'Highest Monthly', value: '~12%', icon: '📈' },
                            { label: 'Best Winrate', value: '75%', icon: '🎯' },
                            { label: 'Platform', value: 'MT4/MT5', icon: '💻' },
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

            {/* EA Grid */}
            <section className="section-padding bg-[var(--bg-secondary)]">
                <div className="container-wide">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {expertAdvisors.map((ea, index) => (
                            <motion.div
                                key={ea.id}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * index }}
                                className="relative bg-white rounded-2xl p-6 border border-[var(--border-light)] overflow-hidden"
                            >
                                {/* Lock Overlay */}
                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                                    <div className="w-12 h-12 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mb-3">
                                        <svg className="w-6 h-6 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <span className="font-medium text-[var(--text-primary)]">Coming Soon</span>
                                    <span className="text-sm text-[var(--text-secondary)]">Q1 2025</span>
                                </div>

                                {/* Content */}
                                <div className="blur-[2px]">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-lg font-semibold mb-1">{ea.name}</h3>
                                            <span className="px-2 py-1 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-xs">
                                                {ea.strategy}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                                                {ea.monthly}/mo
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-sm text-[var(--text-secondary)] mb-4">{ea.description}</p>
                                    <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                                        <div className="p-2 rounded bg-[var(--bg-secondary)]">
                                            <span className="text-[var(--text-muted)]">Platform:</span>
                                            <span className="ml-1 font-medium">{ea.platform}</span>
                                        </div>
                                        <div className="p-2 rounded bg-[var(--bg-secondary)]">
                                            <span className="text-[var(--text-muted)]">Pairs:</span>
                                            <span className="ml-1 font-medium">{ea.pairs}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {ea.features.map((feature, i) => (
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

            {/* CTA */}
            <section className="section-padding">
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
                            Jadi yang pertama tahu saat Expert Advisors ini rilis. Dapatkan diskon 40% untuk early adopters!
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
                        <p className="text-sm text-[var(--text-muted)] mt-6">
                            ⚠️ Trading berisiko. EA memerlukan VPS untuk performa optimal.
                        </p>
                    </motion.div>
                </div>
            </section>
        </div>
    );
}
