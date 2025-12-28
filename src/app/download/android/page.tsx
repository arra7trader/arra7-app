'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DownloadAndroidPage() {
    const [isAndroid, setIsAndroid] = useState(false);

    useEffect(() => {
        // Detect Android
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
        <div className="min-h-screen bg-[#0B0C10] text-white pt-20">
            {/* Background */}
            <div className="absolute inset-0 bg-grid opacity-20" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-green-500/20 to-transparent rounded-full blur-3xl" />

            <div className="relative max-w-4xl mx-auto px-4 py-12">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 border border-green-500/30 mb-6">
                        <span className="text-2xl">📱</span>
                        <span className="text-green-400 font-medium">Android App</span>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        Download <span className="text-green-400">ARRA7</span> untuk Android
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Trading analysis di genggaman Anda. Install sekarang dan dapatkan akses ke AI trading signals kapan saja.
                    </p>
                </motion.div>

                {/* Download Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-[#12141A] rounded-2xl border border-[#1F2937] p-8 mb-12"
                >
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        {/* App Icon */}
                        <div className="shrink-0">
                            <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-blue-500/30">
                                <span className="text-5xl font-bold text-white">A7</span>
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-center md:text-left">
                            <h2 className="text-2xl font-bold mb-2">ARRA7 Trading App</h2>
                            <p className="text-gray-400 mb-4">Version 2.0 • ~13 MB</p>

                            <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-6">
                                <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm">AI Analysis</span>
                                <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-sm">Forex</span>
                                <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm">Saham</span>
                                <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-sm">Crypto</span>
                            </div>

                            {/* Download Button */}
                            <a
                                href="https://raw.githubusercontent.com/arra7trader/arra7-app/main/ARRA7_v2.0.apk"
                                download="ARRA7_v2.0.apk"
                                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl font-semibold text-lg hover:shadow-lg hover:shadow-green-500/30 transition-all"
                            >
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.523 15.34l-.006-.026a3.002 3.002 0 00-2.83-2.314H9.313a3.002 3.002 0 00-2.83 2.314l-.006.026A9.957 9.957 0 015 12c0-3.859 2.18-7.211 5.375-8.89a3.003 3.003 0 003.25 0A9.959 9.959 0 0119 12c0 1.203-.216 2.355-.611 3.424zM12 2c-.69 0-1.25.56-1.25 1.25S11.31 4.5 12 4.5s1.25-.56 1.25-1.25S12.69 2 12 2zm0 20c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm-1-5h2v2h-2v-2zm0-2h2V9h-2v6z" />
                                </svg>
                                Download APK (v2.0)
                            </a>

                            <p className="text-sm text-gray-500 mt-3">
                                ⚠️ Aktifkan "Install from Unknown Sources" di Settings
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Features */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
                >
                    {features.map((feature, i) => (
                        <div key={i} className="bg-[#12141A] rounded-xl border border-[#1F2937] p-4 text-center">
                            <div className="text-3xl mb-2">{feature.icon}</div>
                            <h3 className="font-semibold mb-1">{feature.title}</h3>
                            <p className="text-xs text-gray-500">{feature.desc}</p>
                        </div>
                    ))}
                </motion.div>

                {/* Installation Steps */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-[#12141A] rounded-2xl border border-[#1F2937] p-6"
                >
                    <h3 className="text-xl font-bold mb-4">📲 Cara Install</h3>
                    <div className="space-y-4">
                        <div className="flex items-start gap-4">
                            <span className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shrink-0 font-bold">1</span>
                            <div>
                                <h4 className="font-semibold">Download APK</h4>
                                <p className="text-sm text-gray-400">Klik tombol download di atas</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <span className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shrink-0 font-bold">2</span>
                            <div>
                                <h4 className="font-semibold">Aktifkan Unknown Sources</h4>
                                <p className="text-sm text-gray-400">Settings → Security → Allow Unknown Sources</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <span className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shrink-0 font-bold">3</span>
                            <div>
                                <h4 className="font-semibold">Install APK</h4>
                                <p className="text-sm text-gray-400">Buka file APK dan install</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <span className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shrink-0 font-bold">✓</span>
                            <div>
                                <h4 className="font-semibold">Login & Enjoy!</h4>
                                <p className="text-sm text-gray-400">Login dengan Google dan mulai trading</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Back to Home */}
                <div className="text-center mt-8">
                    <Link href="/" className="text-blue-400 hover:text-blue-300 underline">
                        ← Kembali ke Beranda
                    </Link>
                </div>
            </div>
        </div>
    );
}
