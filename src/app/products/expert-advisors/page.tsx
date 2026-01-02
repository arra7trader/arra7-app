'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { StarIcon, CurrencyIcon, TrophyIcon, FireIcon, BellIcon, WarningIcon } from '@/components/PremiumIcons';

const expertAdvisors = [
    {
        id: 'copy-ai',
        name: 'ARRA7 Copy AI Signals EA',
        shortName: 'Copy AI Signals',
        description: 'GAME-CHANGER! Auto-execute trading signals dari AI Analysis ARRA7. Connect langsung ke API, bisa mode otomatis atau manual approval. Tidak perlu analisa sendiri lagi.',
        features: ['API Integration', 'Auto Execute', 'Manual Mode', 'Custom Risk', 'Real-time Sync'],
        icon: '🤖',
        color: 'from-blue-500 to-cyan-500',
        borderColor: 'border-blue-500/30',
        bgColor: 'bg-blue-500/10',
        priority: 'FLAGSHIP',
        platform: 'MT4 / MT5',
        pairs: 'All + Gold',
        monthly: 'Varies',
        strategy: 'AI-Powered',
    },
    {
        id: 'silver-bullet',
        name: 'ARRA7 Silver Bullet Scalper EA',
        shortName: 'Silver Bullet Scalper',
        description: 'Automated ICT Silver Bullet strategy. Trading hanya di NY AM Session (22:00-23:00 WIB) dengan FVG entry. Target 20-30 pips per trade, max 2 trades/hari.',
        features: ['NY AM Only', 'FVG Entry', 'Auto SL/TP', 'Max 2/Day', 'News Filter'],
        icon: '🎯',
        color: 'from-amber-500 to-orange-500',
        borderColor: 'border-amber-500/30',
        bgColor: 'bg-amber-500/10',
        priority: 'HIGH PROFIT',
        platform: 'MT4 / MT5',
        pairs: 'XAUUSD, GBPUSD',
        monthly: '~12%',
        strategy: 'ICT Time-Based',
    },
    {
        id: 'asian-sweep',
        name: 'ARRA7 Asian Sweep Reversal EA',
        shortName: 'Asian Sweep EA',
        description: 'Auto-trade Asian session liquidity sweep. Mark Asian High/Low, tunggu sweep di London/NY, lalu entry reversal dengan CHoCH confirmation.',
        features: ['Asian Range Auto', 'Sweep Detection', 'CHoCH Entry', 'Reversal Style', 'Low DD'],
        icon: '🌏',
        color: 'from-purple-500 to-pink-500',
        borderColor: 'border-purple-500/30',
        bgColor: 'bg-purple-500/10',
        priority: 'POPULAR',
        platform: 'MT4 / MT5',
        pairs: 'XAUUSD, EUR, GBP',
        monthly: '~8%',
        strategy: 'Liquidity Hunting',
    },
    {
        id: 'williams-momentum',
        name: 'ARRA7 Williams Momentum EA',
        shortName: 'Williams Momentum',
        description: 'Combo Williams %R + KAMA trend filter. Entry di oversold (-80) saat KAMA bullish, exit di overbought atau trailing. Strategi dengan 75% backtest winrate.',
        features: ['Williams %R', 'KAMA Filter', 'Auto Trailing', '1% Risk/Trade', 'Low Frequency'],
        icon: '📈',
        color: 'from-green-500 to-emerald-500',
        borderColor: 'border-green-500/30',
        bgColor: 'bg-green-500/10',
        priority: '75% WINRATE',
        platform: 'MT4 / MT5',
        pairs: 'Gold, Nasdaq',
        monthly: '~6%',
        strategy: 'Momentum Trading',
    },
];

const stats = [
    { label: 'Total EAs', value: '4', icon: '🤖' },
    { label: 'Highest Monthly', value: '~12%', icon: '📈' },
    { label: 'Best Winrate', value: '75%', icon: '🎯' },
    { label: 'Platform', value: 'MT4/MT5', icon: '💻' },
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
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-medium mb-6">
                            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                            🔒 Coming Soon - Q1 2025
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
                        <span className="text-white">Profit Tanpa Ribet</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-lg text-[#94A3B8] mb-8 max-w-2xl mx-auto"
                    >
                        Robot trading dengan <strong className="text-white">strategi proven</strong>.
                        Dari ICT Silver Bullet sampai AI-powered signals. Trading 24/7 tanpa emosi.
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

            {/* EA Grid - LOCKED */}
            <section className="relative px-4 sm:px-6 lg:px-8 pb-20 z-10">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {expertAdvisors.map((ea, index) => (
                            <motion.div
                                key={ea.id}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * index }}
                                className={`relative glass rounded-2xl p-6 border ${ea.borderColor} overflow-hidden`}
                            >
                                {/* Blur Overlay */}
                                <div className="absolute inset-0 backdrop-blur-sm bg-[#0F1629]/60 z-10 flex flex-col items-center justify-center">
                                    <div className="w-16 h-16 rounded-full bg-[#1F2937]/80 flex items-center justify-center mb-4 border border-[#374151]">
                                        <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <span className="text-amber-400 font-semibold text-sm">Coming Soon</span>
                                    <span className="text-[#64748B] text-xs mt-1">Q1 2025</span>
                                </div>

                                {/* Priority Badge */}
                                {ea.priority && (
                                    <div className="absolute -top-3 right-4 z-20">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${ea.priority === 'FLAGSHIP'
                                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                                            : ea.priority === 'HIGH PROFIT'
                                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                                                : ea.priority === '75% WINRATE'
                                                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                                                    : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                            }`}>
                                            {ea.priority === 'FLAGSHIP' ? <><StarIcon className="inline mr-1" size="sm" /> FLAGSHIP</> :
                                                ea.priority === 'HIGH PROFIT' ? <><CurrencyIcon className="inline mr-1" size="sm" /> 12%/MONTH</> :
                                                    ea.priority === '75% WINRATE' ? <><TrophyIcon className="inline mr-1" size="sm" /> 75% WIN</> : <><FireIcon className="inline mr-1" size="sm" /> POPULAR</>}
                                        </span>
                                    </div>
                                )}

                                {/* Blurred Content */}
                                <div className="filter blur-[2px]">
                                    <div className="flex gap-4">
                                        {/* Icon */}
                                        <div className={`w-16 h-16 rounded-2xl ${ea.bgColor} flex items-center justify-center text-4xl flex-shrink-0`}>
                                            {ea.icon}
                                        </div>

                                        <div className="flex-1">
                                            {/* Title */}
                                            <h3 className={`text-xl font-bold mb-2 bg-gradient-to-r ${ea.color} bg-clip-text text-transparent`}>
                                                {ea.shortName}
                                            </h3>

                                            {/* Strategy Badge */}
                                            <span className="inline-block px-2 py-1 rounded-md bg-[#1F2937]/50 text-[#94A3B8] text-xs mb-3">
                                                {ea.strategy}
                                            </span>

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
                                        <div className="text-center p-2 rounded-lg bg-green-500/10">
                                            <div className="text-[10px] text-green-400 uppercase">Monthly</div>
                                            <div className="text-xs text-green-400 font-bold">{ea.monthly}</div>
                                        </div>
                                    </div>

                                    {/* Features */}
                                    <div className="flex flex-wrap gap-2">
                                        {ea.features.slice(0, 3).map((feature, i) => (
                                            <span
                                                key={i}
                                                className="px-2 py-1 rounded-md bg-[#1F2937]/50 text-[#94A3B8] text-xs"
                                            >
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

            {/* CTA Section */}
            <section className="relative px-4 sm:px-6 lg:px-8 pb-20 z-10">
                <div className="max-w-3xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="glass rounded-3xl p-8 md:p-12 border border-amber-500/30 text-center"
                    >
                        <BellIcon className="text-amber-400 mx-auto mb-4" size="xl" />
                        <h2 className="text-2xl md:text-3xl font-bold mb-4">
                            Daftar <span className="text-amber-400">Waitlist</span>
                        </h2>
                        <p className="text-[#94A3B8] mb-6">
                            Jadi yang pertama tahu saat Expert Advisors ini rilis. Dapatkan <strong className="text-white">diskon 40%</strong> + lifetime update untuk early adopters!
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/pricing">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="px-8 py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg shadow-amber-500/25"
                                >
                                    <BellIcon className="inline mr-2" size="sm" /> Join Waitlist
                                </motion.button>
                            </Link>
                            <Link href="/analisa-market">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="px-8 py-4 rounded-xl font-semibold border border-[#374151] text-white hover:bg-white/5 transition-colors"
                                >
                                    Coba AI Dulu
                                </motion.button>
                            </Link>
                        </div>

                        <p className="text-[#64748B] text-sm mt-6">
                            <WarningIcon className="inline mr-1" size="sm" /> Trading berisiko. EA memerlukan VPS untuk performa optimal.
                        </p>
                    </motion.div>
                </div>
            </section>
        </div>
    );
}
