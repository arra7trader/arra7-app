'use client';

import { motion } from 'framer-motion';
import { ArrowLeftIcon, ShareIcon, Square2StackIcon } from '@/components/PremiumIcons';
import Link from 'next/link';

const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }
};

export default function IOSDownloadPage() {
    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pt-32 pb-20">
            <div className="container-apple max-w-4xl">
                {/* Back Link */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="mb-8"
                >
                    <Link href="/" className="inline-flex items-center text-[var(--text-secondary)] hover:text-[var(--accent-blue)] transition-colors">
                        <ArrowLeftIcon className="w-4 h-4 mr-2" />
                        Back to Home
                    </Link>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    {/* Left: Content */}
                    <motion.div
                        initial="initial"
                        animate="animate"
                        variants={fadeInUp}
                    >
                        <span className="badge-apple mb-4 inline-flex bg-blue-50 text-blue-600 border-blue-200">
                             iOS / iPadOS
                        </span>

                        <h1 className="headline-lg mb-6">
                            Install on iPhone
                            <span className="block gradient-text">Web App (PWA)</span>
                        </h1>

                        <p className="body-lg text-[var(--text-secondary)] mb-8">
                            ARRA7 tersedia versi iOS Web App (PWA). Nikmati performa native tanpa perlu lewat App Store.
                        </p>

                        <div className="space-y-6 bg-white p-6 rounded-3xl border border-[var(--border-light)] shadow-sm">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 shrink-0">1</div>
                                <div>
                                    <h3 className="font-semibold text-[var(--text-primary)]">Buka di Safari</h3>
                                    <p className="text-sm text-[var(--text-muted)] mt-1">
                                        Pastikan Anda membuka halaman ini menggunakan browser <strong>Safari</strong>.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 shrink-0">2</div>
                                <div>
                                    <h3 className="font-semibold text-[var(--text-primary)]">Tap Tombol "Share"</h3>
                                    <p className="text-sm text-[var(--text-muted)] mt-1">
                                        Biasanya ada di bagian bawah tengah layar.
                                        <ShareIcon className="w-5 h-5 inline-block ml-2 text-blue-500" />
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 shrink-0">3</div>
                                <div>
                                    <h3 className="font-semibold text-[var(--text-primary)]">Pilih "Add to Home Screen"</h3>
                                    <p className="text-sm text-[var(--text-muted)] mt-1">
                                        Scroll ke bawah & pilih menu:
                                        <span className="inline-flex items-center gap-1 font-medium text-slate-900 ml-1">
                                            <Square2StackIcon className="w-4 h-4" />
                                            Add to Home Screen
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8">
                            <a
                                href="/dom-arra"
                                className="btn-primary w-full text-center block bg-gradient-to-r from-blue-500 to-indigo-600"
                            >
                                Buka Web App (Access Now)
                            </a>
                            <p className="text-xs text-center text-[var(--text-muted)] mt-4">
                                *Fitur PWA support iOS 14 ke atas
                            </p>
                        </div>

                    </motion.div>

                    {/* Right: Illustration */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="relative"
                    >
                        <div className="relative z-10 mx-auto max-w-[300px]">
                            {/* iPhone Frame */}
                            <div className="relative rounded-[3rem] overflow-hidden border-[8px] border-slate-800 shadow-2xl bg-white aspect-[9/19.5]">
                                {/* Notch */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-slate-800 rounded-b-2xl z-20" />

                                {/* Content in Phone: Step 3 visualization */}
                                <div className="h-full bg-slate-50 p-6 flex flex-col justify-end pb-20">
                                    <div className="bg-white rounded-xl p-4 shadow-lg mb-4 border border-slate-100">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center">
                                                <span className="text-xl font-bold text-white">A7</span>
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-900">ARRA7 App</div>
                                                <div className="text-xs text-slate-500">arra7.com</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-200/50 rounded-xl p-2">
                                        <div className="bg-white rounded-lg p-3 shadow-sm flex items-center justify-between">
                                            <span>Add to Home Screen</span>
                                            <span className="text-blue-500 font-semibold">Add</span>
                                        </div>
                                        <div className="mt-2 bg-white rounded-lg p-3 shadow-sm text-slate-400">
                                            Copy
                                        </div>
                                    </div>
                                </div>

                                {/* iOS Bottom Bar */}
                                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-900 rounded-full" />
                            </div>
                        </div>

                        {/* Background blobs */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl -z-10" />
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
