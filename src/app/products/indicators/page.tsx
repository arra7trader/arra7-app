'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function IndicatorsPage() {
    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-grid opacity-20" />
            <div className="bg-orb bg-orb-blue w-[600px] h-[600px] top-1/4 left-1/4 opacity-30" />
            <div className="bg-orb bg-orb-purple w-[500px] h-[500px] bottom-1/4 right-1/4 opacity-25" />

            {/* Animated particles */}
            <div className="absolute inset-0 overflow-hidden">
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-blue-400 rounded-full"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                        }}
                        animate={{
                            y: [0, -30, 0],
                            opacity: [0.2, 0.8, 0.2],
                        }}
                        transition={{
                            duration: 3 + Math.random() * 2,
                            repeat: Infinity,
                            delay: Math.random() * 2,
                        }}
                    />
                ))}
            </div>

            <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
                {/* Icon */}
                <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', duration: 1, bounce: 0.5 }}
                    className="mb-8"
                >
                    <div className="inline-flex items-center justify-center w-28 h-28 rounded-3xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 backdrop-blur-sm">
                        <svg className="w-14 h-14 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                </motion.div>

                {/* Badge */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm font-medium mb-6">
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                        Dalam Pengembangan
                    </span>
                </motion.div>

                {/* Title */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-4xl md:text-6xl font-bold mb-6"
                >
                    <span className="gradient-text">Premium Indicators</span>
                    <br />
                    <span className="text-white">Coming Soon</span>
                </motion.h1>

                {/* Description */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-lg text-[#94A3B8] mb-8 max-w-xl mx-auto"
                >
                    Indikator trading profesional dengan akurasi tinggi.
                    Dikembangkan menggunakan algoritma canggih untuk memaksimalkan profit Anda.
                </motion.p>

                {/* Features Preview */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
                >
                    {[
                        { icon: '📈', label: 'Smart Money' },
                        { icon: '🎯', label: 'Auto S/R' },
                        { icon: '📊', label: 'Trend Scanner' },
                        { icon: '⚡', label: 'Signal Alert' },
                    ].map((feature, i) => (
                        <div
                            key={i}
                            className="glass rounded-xl p-4 border border-[#1F2937] hover:border-blue-500/50 transition-colors"
                        >
                            <div className="text-2xl mb-2">{feature.icon}</div>
                            <div className="text-sm text-[#94A3B8]">{feature.label}</div>
                        </div>
                    ))}
                </motion.div>

                {/* CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="flex flex-col sm:flex-row gap-4 justify-center"
                >
                    <Link href="/">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="px-8 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/25"
                        >
                            Kembali ke Home
                        </motion.button>
                    </Link>
                    <Link href="/analisa-market">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="px-8 py-3 rounded-xl font-semibold border border-[#374151] text-white hover:bg-white/5 transition-colors"
                        >
                            Coba AI Analisa
                        </motion.button>
                    </Link>
                </motion.div>

                {/* Notification */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="mt-10 text-sm text-[#64748B]"
                >
                    📧 Follow kami untuk update terbaru
                </motion.p>
            </div>
        </div>
    );
}
