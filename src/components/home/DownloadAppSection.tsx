'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRightIcon } from '@/components/PremiumIcons';

export default function DownloadAppSection() {
    return (
        <section className="section-padding overflow-hidden relative">
            {/* Background Decorations */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-amber-400/5 rounded-full blur-[100px] -translate-y-1/2 -translate-x-1/2" />
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-400/5 rounded-full blur-[100px] translate-y-1/2 translate-x-1/4" />
            </div>

            <div className="container-wide relative z-10">
                <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">

                    {/* Left Side: Content */}
                    <div className="flex-1 text-center lg:text-left">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                        >
                            <span className="badge-apple mb-4 inline-flex bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border-amber-200">
                                📱 Mobile App Release v3.0
                            </span>

                            <h2 className="headline-lg mb-6">
                                Trading Pro Level Institutional <br className="hidden lg:block" />
                                <span className="gradient-text">Dalam Genggaman</span>
                            </h2>

                            <p className="body-lg text-[var(--text-secondary)] mb-8 max-w-xl mx-auto lg:mx-0">
                                Bawa kekuatan analisa Bookmap Real-time, AI Smart Predictor, dan Institutional Heatmap kemanapun Anda pergi.
                            </p>

                            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 mb-10">
                                {[
                                    { icon: '🐋', text: 'Whale Detector' },
                                    { icon: '🚀', text: '0.05% Precision' },
                                    { icon: '⚡', text: '60fps Native' }
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-sm">
                                        <span>{item.icon}</span>
                                        <span className="text-sm font-medium text-[var(--text-primary)]">{item.text}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                                <Link href="/download/android">
                                    <button
                                        onClick={() => {
                                            // Track download
                                            fetch('/api/user/track-download', { method: 'POST' });
                                        }}
                                        className="btn-primary bg-gradient-to-r from-amber-500 to-orange-600 border-none shadow-lg shadow-amber-500/20 px-8 py-4 text-lg group w-full sm:w-auto flex items-center justify-center"
                                    >
                                        <img src="/images/android-logo.png" alt="Android" className="w-6 h-6 mr-2 object-contain invert brightness-0" />
                                        Download Android
                                        <ArrowRightIcon className="ml-2 group-hover:translate-x-1 transition-transform" size="sm" />
                                    </button>
                                </Link>

                                <Link href="/download/ios">
                                    <button className="btn-secondary px-8 py-4 text-lg w-full sm:w-auto hover:bg-white/50 backdrop-blur-sm flex items-center justify-center">
                                        <img src="/images/apple-logo.png" alt="iOS" className="w-6 h-6 mr-2 object-contain" />
                                        iOS / Web App
                                    </button>
                                </Link>
                            </div>

                            <p className="mt-4 text-xs text-[var(--text-muted)]">
                                *Support Android 10+ • iOS Coming Soon
                            </p>
                        </motion.div>
                    </div>

                    {/* Right Side: Phone Mockup */}
                    <motion.div
                        className="flex-1 w-full max-w-[350px] lg:max-w-none flex justify-center lg:justify-end"
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        <div className="relative">
                            {/* Glow Effect behind phone */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/20 to-blue-500/20 blur-3xl transform scale-110" />

                            {/* Floating Animation */}
                            <motion.div
                                animate={{ y: [0, -15, 0] }}
                                transition={{
                                    duration: 6,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                                className="relative z-10"
                            >
                                <div className="relative rounded-[2.5rem] overflow-hidden border-8 border-slate-900 shadow-2xl bg-slate-900">
                                    {/* Notch/Camera Area */}
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-xl z-20" />

                                    <img
                                        src="/images/android-showcase.png"
                                        alt="ARRA7 App Interface"
                                        className="w-full h-auto block"
                                    />

                                    {/* Screen Reflection overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
                                </div>
                            </motion.div>

                            {/* Floating Elements (Badges) */}
                            <motion.div
                                animate={{ y: [0, 10, 0], rotate: [0, 5, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                                className="absolute -right-8 top-20 z-20 bg-white/90 backdrop-blur shadow-xl rounded-2xl p-3 border border-[var(--border-light)] hidden sm:block"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-xl">💵</div>
                                    <div>
                                        <div className="text-xs text-[var(--text-muted)]">Profit</div>
                                        <div className="font-bold text-green-600">+$1,240.50</div>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                animate={{ y: [0, -8, 0], rotate: [0, -3, 0] }}
                                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                                className="absolute -left-8 bottom-32 z-20 bg-white/90 backdrop-blur shadow-xl rounded-2xl p-3 border border-[var(--border-light)] hidden sm:block"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-xl">🤖</div>
                                    <div>
                                        <div className="text-xs text-[var(--text-muted)]">AI Signal</div>
                                        <div className="font-bold text-blue-600">Strong BUY</div>
                                    </div>
                                </div>
                            </motion.div>

                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
