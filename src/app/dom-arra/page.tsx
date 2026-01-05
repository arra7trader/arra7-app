'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { LockIcon } from '@/components/PremiumIcons';

export default function DomArraPage() {
    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pt-20">
            <div className="container-apple section-padding">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <span className="badge-apple mb-6 inline-flex">
                        🔮 Advanced Trading Tool
                    </span>
                    <h1 className="headline-lg mb-4">
                        DOM <span className="gradient-text">ARRA</span>
                    </h1>
                    <p className="body-lg max-w-2xl mx-auto">
                        Depth of Market visualization dengan AI-powered order flow analysis
                    </p>
                </motion.div>

                {/* Locked Feature Card */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="max-w-2xl mx-auto"
                >
                    <div className="relative bg-white rounded-3xl border border-[var(--border-light)] overflow-hidden">
                        {/* Lock Overlay */}
                        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.3, type: 'spring' }}
                                className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center mb-6"
                            >
                                <LockIcon className="text-[var(--accent-blue)]" size="xl" />
                            </motion.div>
                            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Coming Soon</h2>
                            <p className="text-[var(--text-secondary)] mb-6 text-center px-8">
                                Fitur DOM ARRA sedang dalam pengembangan dan akan segera hadir
                            </p>
                            <div className="flex flex-wrap gap-3 justify-center">
                                <span className="px-4 py-2 rounded-full bg-[var(--bg-secondary)] text-sm text-[var(--text-secondary)]">
                                    📊 Order Flow Analysis
                                </span>
                                <span className="px-4 py-2 rounded-full bg-[var(--bg-secondary)] text-sm text-[var(--text-secondary)]">
                                    🔥 Liquidity Heatmap
                                </span>
                                <span className="px-4 py-2 rounded-full bg-[var(--bg-secondary)] text-sm text-[var(--text-secondary)]">
                                    🐋 Whale Detection
                                </span>
                            </div>
                        </div>

                        {/* Blurred Preview Content */}
                        <div className="p-8 opacity-30 blur-sm">
                            <div className="h-64 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl mb-4"></div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="h-20 bg-gray-100 rounded-xl"></div>
                                <div className="h-20 bg-gray-100 rounded-xl"></div>
                                <div className="h-20 bg-gray-100 rounded-xl"></div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Features Preview */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
                >
                    {[
                        {
                            icon: '📈',
                            title: 'Real-time DOM',
                            desc: 'Lihat kedalaman pasar secara real-time dengan visualisasi yang intuitif'
                        },
                        {
                            icon: '🔥',
                            title: 'Liquidity Zones',
                            desc: 'Identifikasi area likuiditas tinggi untuk entry dan exit yang optimal'
                        },
                        {
                            icon: '🤖',
                            title: 'AI Analysis',
                            desc: 'Analisis order flow dengan kecerdasan buatan untuk prediksi pergerakan'
                        }
                    ].map((feature, i) => (
                        <div key={i} className="bg-white rounded-2xl p-6 border border-[var(--border-light)] text-center">
                            <div className="text-3xl mb-4">{feature.icon}</div>
                            <h3 className="font-semibold text-[var(--text-primary)] mb-2">{feature.title}</h3>
                            <p className="text-sm text-[var(--text-secondary)]">{feature.desc}</p>
                        </div>
                    ))}
                </motion.div>

                {/* CTA */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-center mt-12"
                >
                    <p className="text-[var(--text-muted)] mb-4">Ingin notifikasi saat DOM ARRA tersedia?</p>
                    <Link href="https://t.me/arra7trader" target="_blank" rel="noopener noreferrer">
                        <button className="btn-primary">
                            Join Telegram untuk Update
                        </button>
                    </Link>
                </motion.div>

                {/* Back Link */}
                <div className="text-center mt-8">
                    <Link href="/" className="text-[var(--accent-blue)] hover:underline">
                        ← Kembali ke Beranda
                    </Link>
                </div>
            </div>
        </div>
    );
}
