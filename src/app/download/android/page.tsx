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
        { icon: '🐋', title: 'Institutional Heatmap', desc: 'Visualisasi Order Flow kelas dunia. Deteksi "Whale Walls" dan manipulasi harga yang tidak terlihat di chart biasa.' },
        { icon: '🧠', title: 'AI Smart Predictor', desc: 'Analisa market otomatis dengan Machine Learning. Dapatkan sinyal arah tren dengan Confidence Score real-time.' },
        { icon: '⚡', title: 'Native Performance', desc: 'Engine v3.0 super ringan. Zoom 0.05% presisi tinggi & "Soft Follow" viewport untuk pengalaman trading tanpa lag.' },
        { icon: '🛠️', title: 'All-in-One Tools', desc: 'Lengkap dengan CVD, Volume Profile, dan Multi-asset analysis (Crypto, Forex, Saham) dalam satu aplikasi.' },
    ];

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pt-20">
            {/* Header */}
            <section className="section-padding text-center pb-0">
                <div className="container-apple">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <span className="badge-apple mb-6 inline-flex bg-blue-50 text-blue-600 border-blue-100">
                            🚀 New Update v3.0
                        </span>
                        <h1 className="headline-lg mb-4">
                            ARRA7 <span className="gradient-text">Native Heatmap</span>
                        </h1>
                        <p className="body-lg max-w-2xl mx-auto text-[var(--text-secondary)]">
                            Experience the new native engine. Faster, smoother, and more detailed than ever.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Main Showcase */}
            <section className="section-padding pt-12">
                <div className="container-apple">
                    <div className="grid md:grid-cols-2 gap-12 items-center">

                        {/* Left: Phone Mockup */}
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="relative mx-auto md:mx-0 max-w-[320px]"
                        >
                            <div className="relative rounded-[2.5rem] border-[8px] border-slate-900 overflow-hidden shadow-2xl bg-slate-900 aspect-[9/19]">
                                <img
                                    src="/images/android-showcase.png"
                                    alt="ARRA7 Android App Interface"
                                    className="w-full h-full object-cover"
                                />
                                {/* Glossy Reflection */}
                                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/10 to-transparent pointer-events-none"></div>
                            </div>
                            {/* Decorative Blob */}
                            <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[80%] bg-blue-500/20 blur-[80px] rounded-full"></div>
                        </motion.div>

                        {/* Right: Download & Info */}
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <div className="bg-white rounded-3xl border border-[var(--border-light)] p-8 shadow-sm">
                                <div className="flex items-center gap-6 mb-8">
                                    <div className="w-20 h-20 shrink-0">
                                        <img
                                            src="/icons/a7-icon.jpg"
                                            alt="ARRA7 App Icon"
                                            className="w-full h-full object-contain drop-shadow-lg rounded-2xl"
                                        />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-[var(--text-primary)]">ARRA7 Trading App</h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-sm font-medium px-2 py-0.5 rounded bg-green-100 text-green-700">Stable</span>
                                            <span className="text-[var(--text-secondary)] text-sm">v3.0.0 • Native Engine</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-8">
                                    {features.map((f, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <span className="text-xl mt-0.5">{f.icon}</span>
                                            <div>
                                                <h4 className="font-semibold text-[var(--text-primary)] text-sm">{f.title}</h4>
                                                <p className="text-xs text-[var(--text-secondary)]">{f.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex flex-col gap-3">
                                    <a
                                        href="https://github.com/arra7trader/arra7-app/raw/main/ARRA7_v3.0_Native.apk"
                                        download="ARRA7_v3.0.apk"
                                        className="btn-primary w-full py-4 justify-center text-lg shadow-blue-500/25"
                                    >
                                        <DownloadIcon className="mr-2" size="md" />
                                        Download APK (v3.0)
                                    </a>
                                    <p className="text-xs text-center text-[var(--text-muted)]">
                                        Compatible with Android 10+ • 64-bit Architecture
                                    </p>
                                </div>
                            </div>

                            {/* Installation Note */}
                            <div className="mt-6 bg-yellow-50 border border-yellow-100 rounded-xl p-4 flex gap-3">
                                <span className="text-xl">⚠️</span>
                                <p className="text-sm text-yellow-800">
                                    Jika update dari versi lama gagal, silakan <b>Uninstall</b> versi lama terlebih dahulu, lalu install versi v3.0 ini.
                                </p>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Back to Home */}
            <div className="text-center pb-12">
                <Link href="/" className="text-[var(--text-secondary)] hover:text-[var(--accent-blue)] transition-colors text-sm font-medium">
                    ← Kembali ke Beranda
                </Link>
            </div>
        </div>
    );
}
