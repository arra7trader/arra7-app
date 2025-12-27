'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const expertAdvisors = [
    {
        id: 'copy-ai',
        name: 'ARRA7 Copy AI Signals EA',
        shortName: 'Copy AI Signals',
        description: 'GAME-CHANGER! Auto-execute trading signals dari AI Analysis ARRA7. Connect langsung ke API, eksekusi otomatis atau manual approval mode.',
        features: ['API Integration', 'Auto Execute', 'Manual Approval Mode', 'Custom Risk', 'Dashboard Sync'],
        icon: '🤖',
        color: 'from-blue-500 to-cyan-500',
        borderColor: 'border-blue-500/30',
        bgColor: 'bg-blue-500/10',
        priority: 'FLAGSHIP',
        platform: 'MT4 / MT5',
        pairs: 'All Pairs + Gold',
        riskLevel: 'Adjustable',
    },
    {
        id: 'gold-scalper',
        name: 'ARRA7 Gold Scalper EA',
        shortName: 'Gold Scalper',
        description: 'Scalping XAUUSD specialist dengan SMC + Session timing. Auto-trade during London & New York session dengan trailing stop Fibonacci.',
        features: ['XAUUSD Specialist', 'Session Trading', 'SMC Based Entry', 'Fibo Trailing', 'News Filter'],
        icon: '🥇',
        color: 'from-amber-500 to-orange-500',
        borderColor: 'border-amber-500/30',
        bgColor: 'bg-amber-500/10',
        priority: 'POPULAR',
        platform: 'MT4 / MT5',
        pairs: 'XAUUSD Only',
        riskLevel: '1-2% per trade',
    },
    {
        id: 'grid-recovery',
        name: 'ARRA7 Grid Recovery EA',
        shortName: 'Grid Recovery',
        description: 'Grid trading dengan smart recovery system. ATR-based grid spacing, partial close untuk secure profit, dan equity protection.',
        features: ['Smart Grid Spacing', 'Recovery Mode', 'Partial Close', 'Equity Protection', 'Low Drawdown'],
        icon: '📐',
        color: 'from-purple-500 to-pink-500',
        borderColor: 'border-purple-500/30',
        bgColor: 'bg-purple-500/10',
        priority: null,
        platform: 'MT4 / MT5',
        pairs: 'EUR, GBP, JPY pairs',
        riskLevel: 'Medium',
    },
    {
        id: 'trend-follower',
        name: 'ARRA7 Trend Follower EA',
        shortName: 'Trend Follower',
        description: 'Multi-timeframe trend following dengan entry signal dari H4/D1 dan confirmation dari M15/H1. Pyramiding mode untuk maximize profit.',
        features: ['Multi-TF Analysis', 'HTF + LTF Confirm', 'Dynamic ATR SL', 'Pyramiding Mode', 'Breakeven Auto'],
        icon: '📈',
        color: 'from-green-500 to-emerald-500',
        borderColor: 'border-green-500/30',
        bgColor: 'bg-green-500/10',
        priority: null,
        platform: 'MT4 / MT5',
        pairs: 'Major Pairs + Gold',
        riskLevel: 'Conservative',
    },
];

const stats = [
    { label: 'Total EAs', value: '4', icon: '🤖' },
    { label: 'Platform', value: 'MT4 & MT5', icon: '💻' },
    { label: 'Backtest', value: '3+ Years', icon: '📊' },
    { label: 'Support', value: '24/7 Indo', icon: '🇮🇩' },
];

export default function ExpertAdvisorsPage() {
    return (
        <div className="relative min-h-screen overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-grid opacity-20" />
            <div className="bg-orb bg-orb-purple w-[600px] h-[600px] top-1/4 right-1/4 opacity-30" />
            <div className="bg-orb bg-orb-blue w-[500px] h-[500px] bottom-1/4 left-1/4 opacity-25" />

            {/* Hero Section */}
            <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 z-10">
                <div className="max-w-7xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-sm font-medium mb-6">
                            <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                            Coming Q1 2025
                        </span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-4xl md:text-6xl font-bold mb-6"
                    >
                        <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Expert Advisors</span>
                        <br />
                        <span className="text-white">Auto Trading 24/7</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-lg text-[#94A3B8] mb-8 max-w-2xl mx-auto"
                    >
                        Robot trading otomatis yang bekerja tanpa henti.
                        Eksekusi trading tanpa emosi dengan manajemen risiko yang ketat.
                    </motion.p>

                    {/* Stats */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto mb-12"
                    >
                        {stats.map((stat, i) => (
                            <div key={i} className="glass rounded-xl p-4 border border-[#1F2937]">
                                <div className="text-2xl mb-1">{stat.icon}</div>
                                <div className="text-xl font-bold text-white">{stat.value}</div>
                                <div className="text-xs text-[#64748B]">{stat.label}</div>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* EA Grid */}
            <section className="relative px-4 sm:px-6 lg:px-8 pb-20 z-10">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {expertAdvisors.map((ea, index) => (
                            <motion.div
                                key={ea.id}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * index }}
                                whileHover={{ y: -8, scale: 1.01 }}
                                className={`relative glass rounded-2xl p-6 border ${ea.borderColor} hover:border-opacity-60 transition-all cursor-pointer group`}
                            >
                                {/* Priority Badge */}
                                {ea.priority && (
                                    <div className="absolute -top-3 right-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${ea.priority === 'FLAGSHIP'
                                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                                                : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                            }`}>
                                            {ea.priority === 'FLAGSHIP' ? '⭐ FLAGSHIP' : '🔥 POPULAR'}
                                        </span>
                                    </div>
                                )}

                                <div className="flex gap-4">
                                    {/* Icon */}
                                    <div className={`w-16 h-16 rounded-2xl ${ea.bgColor} flex items-center justify-center text-4xl flex-shrink-0 group-hover:scale-110 transition-transform`}>
                                        {ea.icon}
                                    </div>

                                    <div className="flex-1">
                                        {/* Title */}
                                        <h3 className={`text-xl font-bold mb-2 bg-gradient-to-r ${ea.color} bg-clip-text text-transparent`}>
                                            {ea.shortName}
                                        </h3>

                                        {/* Description */}
                                        <p className="text-[#94A3B8] text-sm mb-4 leading-relaxed">
                                            {ea.description}
                                        </p>
                                    </div>
                                </div>

                                {/* Specs */}
                                <div className="grid grid-cols-3 gap-3 mt-4 mb-4">
                                    <div className="text-center p-2 rounded-lg bg-[#1F2937]/30">
                                        <div className="text-[10px] text-[#64748B] uppercase">Platform</div>
                                        <div className="text-xs text-white font-medium">{ea.platform}</div>
                                    </div>
                                    <div className="text-center p-2 rounded-lg bg-[#1F2937]/30">
                                        <div className="text-[10px] text-[#64748B] uppercase">Pairs</div>
                                        <div className="text-xs text-white font-medium">{ea.pairs}</div>
                                    </div>
                                    <div className="text-center p-2 rounded-lg bg-[#1F2937]/30">
                                        <div className="text-[10px] text-[#64748B] uppercase">Risk</div>
                                        <div className="text-xs text-white font-medium">{ea.riskLevel}</div>
                                    </div>
                                </div>

                                {/* Features */}
                                <div className="flex flex-wrap gap-2">
                                    {ea.features.map((feature, i) => (
                                        <span
                                            key={i}
                                            className="px-2 py-1 rounded-md bg-[#1F2937]/50 text-[#94A3B8] text-xs"
                                        >
                                            ✓ {feature}
                                        </span>
                                    ))}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="relative px-4 sm:px-6 lg:px-8 pb-20 z-10">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-12"
                    >
                        <h2 className="text-3xl font-bold mb-4">
                            Cara Kerja <span className="gradient-text">Expert Advisor</span>
                        </h2>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { step: '1', title: 'Install EA', desc: 'Download file EA dan install ke folder MT4/MT5 Experts', icon: '📥' },
                            { step: '2', title: 'Setup & Config', desc: 'Atur parameter sesuai risk tolerance dan pair trading Anda', icon: '⚙️' },
                            { step: '3', title: 'Let It Trade', desc: 'EA akan trading otomatis 24/7. Monitor via dashboard', icon: '🚀' },
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.1 * i }}
                                className="glass rounded-2xl p-6 border border-[#1F2937] text-center"
                            >
                                <div className="text-4xl mb-3">{item.icon}</div>
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm mx-auto mb-3">
                                    {item.step}
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                                <p className="text-[#94A3B8] text-sm">{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="relative px-4 sm:px-6 lg:px-8 pb-20 z-10">
                <div className="max-w-3xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="glass rounded-3xl p-8 md:p-12 border border-[#1F2937] text-center"
                    >
                        <div className="text-4xl mb-4">🎁</div>
                        <h2 className="text-2xl md:text-3xl font-bold mb-4">
                            Pre-order <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Sekarang</span>
                        </h2>
                        <p className="text-[#94A3B8] mb-6">
                            Daftar waitlist untuk mendapatkan diskon 40% + akses beta testing gratis!
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/pricing">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="px-8 py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/25"
                                >
                                    Lihat Paket VVIP
                                </motion.button>
                            </Link>
                            <Link href="/analisa-market">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="px-8 py-4 rounded-xl font-semibold border border-[#374151] text-white hover:bg-white/5 transition-colors"
                                >
                                    Coba AI Analisa
                                </motion.button>
                            </Link>
                        </div>

                        <p className="text-[#64748B] text-sm mt-6">
                            ⚠️ EA memerlukan VPS untuk performa optimal
                        </p>
                    </motion.div>
                </div>
            </section>
        </div>
    );
}
