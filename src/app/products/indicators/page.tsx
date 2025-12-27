'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const indicators = [
    {
        id: 'silver-bullet',
        name: 'ARRA7 ICT Silver Bullet',
        shortName: 'ICT Silver Bullet',
        description: 'Time-based FVG scalping menggunakan metode ICT. Auto-highlight Kill Zones (London, NY AM, NY PM) dan detect Fair Value Gap untuk entry presisi 20-30 pips.',
        features: ['3 Kill Zones Auto', 'FVG Detection', 'HTF Trend Filter', 'Alert System', 'WIB Timezone'],
        icon: '🎯',
        color: 'from-blue-500 to-cyan-500',
        borderColor: 'border-blue-500/30',
        bgColor: 'bg-blue-500/10',
        priority: 'FLAGSHIP',
        winrate: '65-75%',
        strategy: 'ICT Scalping',
    },
    {
        id: 'liquidity-hunter',
        name: 'ARRA7 Liquidity Hunter',
        shortName: 'Liquidity Hunter',
        description: 'Detect liquidity sweep dan reversal. Auto-mark Previous Day High/Low dan Asian Session Range. Entry setelah stop hunt + CHoCH confirmation.',
        features: ['PDH/PDL Auto Mark', 'Asian Range', 'Sweep Detection', 'Reversal Arrows', 'Smart Entry Zones'],
        icon: '💧',
        color: 'from-purple-500 to-pink-500',
        borderColor: 'border-purple-500/30',
        bgColor: 'bg-purple-500/10',
        priority: 'POPULAR',
        winrate: '70%+',
        strategy: 'Institutional Trading',
    },
    {
        id: 'order-flow',
        name: 'ARRA7 Order Flow Sniper',
        shortName: 'Order Flow Sniper',
        description: 'Auto-detect valid Order Blocks dan Breaker Blocks dengan filter volume. Hanya tampilkan OB yang memiliki institutional footprint.',
        features: ['Valid OB Only', 'Volume Filter', 'Breaker Blocks', 'HTF Confluence', 'Premium/Discount'],
        icon: '📊',
        color: 'from-amber-500 to-orange-500',
        borderColor: 'border-amber-500/30',
        bgColor: 'bg-amber-500/10',
        priority: null,
        winrate: '60-70%',
        strategy: 'SMC Order Blocks',
    },
    {
        id: 'momentum-shift',
        name: 'ARRA7 Momentum Shift Detector',
        shortName: 'Momentum Shift',
        description: 'Real-time Break of Structure (BOS) dan Change of Character (CHoCH) detection. Dikombinasikan dengan RSI hidden divergence untuk konfirmasi reversal.',
        features: ['BOS Alerts', 'CHoCH Detection', 'RSI Divergence', 'MTF Structure', 'Trend Reversal'],
        icon: '⚡',
        color: 'from-green-500 to-emerald-500',
        borderColor: 'border-green-500/30',
        bgColor: 'bg-green-500/10',
        priority: null,
        winrate: '65%',
        strategy: 'Structure Trading',
    },
    {
        id: 'high-prob-zone',
        name: 'ARRA7 High-Probability Zone Finder',
        shortName: 'HP Zone Finder',
        description: 'Kombinasi Williams %R + KAMA + fractal S/R. Entry hanya di confluence 3 faktor. Backtest menunjukkan 81% winrate di index, adaptable ke Gold.',
        features: ['Williams %R', 'KAMA Trend', 'Fractal S/R', '3-Factor Entry', 'High Accuracy'],
        icon: '💎',
        color: 'from-red-500 to-rose-500',
        borderColor: 'border-red-500/30',
        bgColor: 'bg-red-500/10',
        priority: 'HIGHEST WINRATE',
        winrate: '75-81%',
        strategy: 'Confluence Trading',
    },
];

export default function IndicatorsPage() {
    return (
        <div className="relative min-h-screen overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-grid opacity-20" />
            <div className="bg-orb bg-orb-blue w-[600px] h-[600px] top-1/4 left-1/4 opacity-30" />
            <div className="bg-orb bg-orb-purple w-[500px] h-[500px] bottom-1/4 right-1/4 opacity-25" />

            {/* Hero Section */}
            <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 z-10">
                <div className="max-w-7xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm font-medium mb-6">
                            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                            Institutional-Grade Indicators
                        </span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-4xl md:text-6xl font-bold mb-6"
                    >
                        <span className="gradient-text">Premium Indicators</span>
                        <br />
                        <span className="text-white">ICT & Smart Money Concepts</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-lg text-[#94A3B8] mb-8 max-w-2xl mx-auto"
                    >
                        Indikator berbasis <strong className="text-white">strategi institusional</strong> dengan winrate tinggi.
                        Bukan indikator retail biasa - ini cara trading bank dan hedge fund.
                    </motion.p>

                    {/* Stats */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-12"
                    >
                        {[
                            { label: 'Total Indicators', value: '5', icon: '📊' },
                            { label: 'Highest Winrate', value: '81%', icon: '🎯' },
                            { label: 'Platform', value: 'TradingView', icon: '📈' },
                            { label: 'Timezone', value: 'WIB Ready', icon: '🇮🇩' },
                        ].map((stat, i) => (
                            <div key={i} className="glass rounded-xl p-4 border border-[#1F2937]">
                                <div className="text-2xl mb-1">{stat.icon}</div>
                                <div className="text-xl font-bold text-white">{stat.value}</div>
                                <div className="text-xs text-[#64748B]">{stat.label}</div>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Indicators Grid */}
            <section className="relative px-4 sm:px-6 lg:px-8 pb-20 z-10">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {indicators.map((indicator, index) => (
                            <motion.div
                                key={indicator.id}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * index }}
                                whileHover={{ y: -8, scale: 1.02 }}
                                className={`relative glass rounded-2xl p-6 border ${indicator.borderColor} hover:border-opacity-60 transition-all cursor-pointer group`}
                            >
                                {/* Priority Badge */}
                                {indicator.priority && (
                                    <div className="absolute -top-3 right-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${indicator.priority === 'FLAGSHIP'
                                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                                                : indicator.priority === 'HIGHEST WINRATE'
                                                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                                                    : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                            }`}>
                                            {indicator.priority === 'FLAGSHIP' ? '⭐ FLAGSHIP' :
                                                indicator.priority === 'HIGHEST WINRATE' ? '🏆 81% WINRATE' : '🔥 POPULAR'}
                                        </span>
                                    </div>
                                )}

                                {/* Icon */}
                                <div className={`w-14 h-14 rounded-2xl ${indicator.bgColor} flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform`}>
                                    {indicator.icon}
                                </div>

                                {/* Title */}
                                <h3 className={`text-xl font-bold mb-2 bg-gradient-to-r ${indicator.color} bg-clip-text text-transparent`}>
                                    {indicator.shortName}
                                </h3>

                                {/* Winrate & Strategy */}
                                <div className="flex gap-2 mb-3">
                                    <span className="px-2 py-1 rounded-md bg-green-500/20 text-green-400 text-xs font-semibold">
                                        {indicator.winrate} Winrate
                                    </span>
                                    <span className="px-2 py-1 rounded-md bg-[#1F2937]/50 text-[#94A3B8] text-xs">
                                        {indicator.strategy}
                                    </span>
                                </div>

                                {/* Description */}
                                <p className="text-[#94A3B8] text-sm mb-4 leading-relaxed">
                                    {indicator.description}
                                </p>

                                {/* Features */}
                                <div className="flex flex-wrap gap-2">
                                    {indicator.features.map((feature, i) => (
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

            {/* Why Different Section */}
            <section className="relative px-4 sm:px-6 lg:px-8 pb-20 z-10">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-12"
                    >
                        <h2 className="text-3xl font-bold mb-4">
                            Kenapa <span className="gradient-text">Berbeda</span>?
                        </h2>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[
                            {
                                title: 'ICT/SMC Based',
                                desc: 'Bukan RSI/MACD biasa. Ini strategi institusional yang digunakan bank dan hedge fund.',
                                icon: '🏦'
                            },
                            {
                                title: 'Time-Based Entry',
                                desc: 'Kill Zones sudah dikonversi ke WIB. Tidak perlu hitung timezone lagi.',
                                icon: '⏰'
                            },
                            {
                                title: 'Filtered Signals',
                                desc: 'Hanya tampilkan setup high-probability. Tidak ada noise atau false signals.',
                                icon: '🎯'
                            },
                            {
                                title: 'AI Integration',
                                desc: 'Kombinasikan dengan AI Analysis ARRA7 untuk konfirmasi tambahan.',
                                icon: '🤖'
                            },
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.1 * i }}
                                className="glass rounded-2xl p-6 border border-[#1F2937]"
                            >
                                <div className="text-3xl mb-3">{item.icon}</div>
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
                        <div className="text-4xl mb-4">🚀</div>
                        <h2 className="text-2xl md:text-3xl font-bold mb-4">
                            Dapatkan <span className="gradient-text">Early Access</span>
                        </h2>
                        <p className="text-[#94A3B8] mb-6">
                            Daftar sekarang dan dapatkan <strong className="text-white">diskon 40%</strong> + akses beta testing gratis!
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/pricing">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="px-8 py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/25"
                                >
                                    Lihat Paket Premium
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
                    </motion.div>
                </div>
            </section>
        </div>
    );
}
