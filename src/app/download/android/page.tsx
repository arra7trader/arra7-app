'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DownloadIcon } from '@/components/PremiumIcons';

export default function DownloadAndroidPage() {
    const [isAndroid, setIsAndroid] = useState(false);

    useEffect(() => {
        const userAgent = navigator.userAgent.toLowerCase();
        setIsAndroid(userAgent.includes('android'));
    }, []);

    const features = [
        { icon: '🔮', title: 'AI Trading Analysis', desc: 'Analisa Forex, Crypto, Saham dengan AI' },
        { icon: '📊', title: 'Real-time Data', desc: 'Data market live dari berbagai sumber' },
        { icon: '🔔', title: 'Notifikasi', desc: 'Alert untuk sinyal trading penting' },
        { icon: '⚡', title: 'Fast & Lightweight', desc: 'Hanya ~13MB, cepat dan ringan' },
    ];

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pt-20">
            {/* Header */}
            <section className="section-padding text-center">
                <div className="container-apple">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <span className="badge-apple mb-6 inline-flex">
                            📱 Android App
                        </span>
                        <h1 className="headline-lg mb-4">
                            Download <span className="gradient-text">ARRA7</span> untuk Android
                        </h1>
                        <p className="body-lg max-w-2xl mx-auto">
                            Trading analysis di genggaman Anda. Install sekarang.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Download Card */}
            <section className="section-padding pt-0">
                <div className="container-apple">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-2xl border border-[var(--border-light)] p-8"
                    >
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            {/* App Icon */}
                            <div className="shrink-0">
                                <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-[var(--accent-blue)] to-cyan-500 flex items-center justify-center shadow-xl">
                                    <span className="text-4xl font-bold text-white">A7</span>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="flex-1 text-center md:text-left">
                                <h2 className="text-2xl font-bold mb-2 text-[var(--text-primary)]">ARRA7 Trading App</h2>
                                <p className="text-[var(--text-secondary)] mb-4">Version 2.1 • ~13 MB</p>

                                <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-6">
                                    <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm">AI Analysis</span>
                                    <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm">Forex</span>
                                    <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm">Saham</span>
                                    <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-sm">Crypto</span>
                                </div>

                                <a
                                    href="https://raw.githubusercontent.com/arra7trader/arra7-app/main/ARRA7_v2.1.apk"
                                    download="ARRA7_v2.1.apk"
                                    className="btn-primary inline-flex"
                                >
                                    <DownloadIcon className="mr-2" size="md" />
                                    Download APK (v2.1)
                                </a>

                                <p className="text-sm text-[var(--text-muted)] mt-3">
                                    ⚠️ Aktifkan "Install from Unknown Sources" di Settings
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Features */}
            <section className="section-padding bg-[var(--bg-secondary)]">
                <div className="container-apple">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="grid grid-cols-2 md:grid-cols-4 gap-4"
                    >
                        {features.map((feature, i) => (
                            <div key={i} className="card-feature text-center py-6">
                                <div className="text-3xl mb-3">{feature.icon}</div>
                                <h3 className="font-semibold mb-1 text-[var(--text-primary)]">{feature.title}</h3>
                                <p className="text-xs text-[var(--text-secondary)]">{feature.desc}</p>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Installation Steps */}
            <section className="section-padding">
                <div className="container-apple">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white rounded-2xl border border-[var(--border-light)] p-8"
                    >
                        <h3 className="text-xl font-bold mb-6 text-[var(--text-primary)]">📲 Cara Install</h3>
                        <div className="space-y-5">
                            {[
                                { step: '1', title: 'Download APK', desc: 'Klik tombol download di atas' },
                                { step: '2', title: 'Aktifkan Unknown Sources', desc: 'Settings → Security → Allow Unknown Sources' },
                                { step: '3', title: 'Install APK', desc: 'Buka file APK dan install' },
                                { step: '✓', title: 'Login & Enjoy!', desc: 'Login dengan Google dan mulai trading', done: true },
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-4">
                                    <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-white ${item.done ? 'bg-green-500' : 'bg-[var(--accent-blue)]'}`}>
                                        {item.step}
                                    </span>
                                    <div>
                                        <h4 className="font-semibold text-[var(--text-primary)]">{item.title}</h4>
                                        <p className="text-sm text-[var(--text-secondary)]">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Back to Home */}
            <div className="text-center py-8">
                <Link href="/" className="text-[var(--accent-blue)] hover:underline">
                    ← Kembali ke Beranda
                </Link>
            </div>
        </div>
    );
}
