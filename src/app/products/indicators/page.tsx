'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const indicators = [
    {
        id: 'smc',
        name: 'ARRA7 Smart Money Concept',
        shortName: 'SMC Indicator',
        description: 'Auto-detect Order Blocks, Break of Structure (BOS), Change of Character (CHoCH), Fair Value Gap (FVG), dan Liquidity Zones. Konsep SMC populer untuk trading Gold & Forex.',
        features: ['Order Blocks Auto', 'BOS & CHoCH Labels', 'FVG Highlighting', 'Liquidity Zones', 'Premium/Discount'],
        icon: '🎯',
        color: 'from-blue-500 to-cyan-500',
        borderColor: 'border-blue-500/30',
        bgColor: 'bg-blue-500/10',
        priority: 'FLAGSHIP',
    },
    {
        id: 'mtf',
        name: 'ARRA7 Multi-Timeframe Dashboard',
        shortName: 'MTF Dashboard',
        description: 'Panel dashboard lengkap menampilkan trend direction semua timeframe (M5-D1), RSI, MACD, Stochastic, dan key levels dalam satu view.',
        features: ['All Timeframe Trend', 'RSI/MACD Overview', 'Entry Signal Summary', 'S/R Key Levels', 'One-Click Panel'],
        icon: '📊',
        color: 'from-purple-500 to-pink-500',
        borderColor: 'border-purple-500/30',
        bgColor: 'bg-purple-500/10',
        priority: 'POPULAR',
    },
    {
        id: 'zone',
        name: 'ARRA7 Zone Sniper',
        shortName: 'Zone Sniper',
        description: 'Auto Support/Resistance dan Supply/Demand zones dengan volume strength. Alert ketika harga mendekati zone penting.',
        features: ['Auto S/R Zones', 'Supply & Demand', 'Zone Confidence Level', 'Price Alert', 'Historical Accuracy'],
        icon: '🔫',
        color: 'from-amber-500 to-orange-500',
        borderColor: 'border-amber-500/30',
        bgColor: 'bg-amber-500/10',
        priority: null,
    },
    {
        id: 'session',
        name: 'ARRA7 Session Highlighter',
        shortName: 'Session Highlighter',
        description: 'Highlight London, New York, Asian session dengan High/Low setiap session. Killzone marking untuk XAUUSD/Forex. Waktu sudah disesuaikan WIB.',
        features: ['3 Major Sessions', 'Session High/Low', 'Killzone Marking', 'WIB Timezone', 'Session Statistics'],
        icon: '⏰',
        color: 'from-green-500 to-emerald-500',
        borderColor: 'border-green-500/30',
        bgColor: 'bg-green-500/10',
        priority: null,
    },
    {
        id: 'risk',
        name: 'ARRA7 Risk Calculator Overlay',
        shortName: 'Risk Calculator',
        description: 'Drag entry, SL, TP langsung di chart. Auto-calculate lot size berdasarkan % risk. Display P&L dalam IDR/USD.',
        features: ['Drag & Drop Tool', 'Auto Lot Size', 'R:R Ratio Display', 'P&L in IDR', '% Risk Control'],
        icon: '💰',
        color: 'from-red-500 to-rose-500',
        borderColor: 'border-red-500/30',
        bgColor: 'bg-red-500/10',
        priority: null,
    },
    {
        id: 'divergence',
        name: 'ARRA7 Divergence Hunter',
        shortName: 'Divergence Hunter',
        description: 'Auto-detect Regular & Hidden divergence pada RSI, MACD, CCI. Alert ketika divergence terbentuk untuk sinyal reversal.',
        features: ['Regular Divergence', 'Hidden Divergence', 'Multi Oscillator', 'Alert System', 'Reversal Probability'],
        icon: '📈',
        color: 'from-indigo-500 to-violet-500',
        borderColor: 'border-indigo-500/30',
        bgColor: 'bg-indigo-500/10',
        priority: null,
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
                            Coming Q1 2025
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
                        <span className="text-white">untuk TradingView</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-lg text-[#94A3B8] mb-8 max-w-2xl mx-auto"
                    >
                        Koleksi indikator profesional yang dikembangkan khusus untuk trader Indonesia.
                        Kombinasikan dengan AI Analysis ARRA7 untuk hasil maksimal.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="flex flex-wrap justify-center gap-4 mb-12"
                    >
                        <div className="glass rounded-xl px-4 py-2 border border-[#1F2937]">
                            <span className="text-[#64748B] text-sm">Platform:</span>
                            <span className="text-white ml-2 font-semibold">TradingView</span>
                        </div>
                        <div className="glass rounded-xl px-4 py-2 border border-[#1F2937]">
                            <span className="text-[#64748B] text-sm">Total:</span>
                            <span className="text-white ml-2 font-semibold">6 Indicators</span>
                        </div>
                        <div className="glass rounded-xl px-4 py-2 border border-[#1F2937]">
                            <span className="text-[#64748B] text-sm">Bahasa:</span>
                            <span className="text-white ml-2 font-semibold">Indonesia 🇮🇩</span>
                        </div>
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
                                                : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                            }`}>
                                            {indicator.priority === 'FLAGSHIP' ? '⭐ FLAGSHIP' : '🔥 POPULAR'}
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
                                            {feature}
                                        </span>
                                    ))}
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
                        className="glass rounded-3xl p-8 md:p-12 border border-[#1F2937] text-center"
                    >
                        <div className="text-4xl mb-4">🎁</div>
                        <h2 className="text-2xl md:text-3xl font-bold mb-4">
                            Dapatkan <span className="gradient-text">Early Access</span>
                        </h2>
                        <p className="text-[#94A3B8] mb-6">
                            Daftar sekarang untuk mendapatkan akses pertama dan diskon khusus 30% saat launch!
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/pricing">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="px-8 py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/25"
                                >
                                    Lihat Paket Berlangganan
                                </motion.button>
                            </Link>
                            <Link href="/analisa-market">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="px-8 py-4 rounded-xl font-semibold border border-[#374151] text-white hover:bg-white/5 transition-colors"
                                >
                                    Coba AI Analisa Gratis
                                </motion.button>
                            </Link>
                        </div>

                        <p className="text-[#64748B] text-sm mt-6">
                            💬 Atau hubungi kami di <a href="https://t.me/arrareborn" className="text-blue-400 hover:underline">Telegram</a> untuk info lebih lanjut
                        </p>
                    </motion.div>
                </div>
            </section>
        </div>
    );
}
