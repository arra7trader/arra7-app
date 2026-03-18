'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRightIcon } from '@/components/PremiumIcons';

export default function DownloadAppSection() {
    return (
        <section className="section-padding overflow-hidden relative">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
                <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
            </div>

            <div className="container-wide relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="mx-auto max-w-5xl rounded-3xl border border-[var(--border-light)] bg-[var(--bg-primary)] p-7 shadow-sm md:p-10"
                >
                    <div className="mb-4 inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                        ARRA7 Mobile v3.0.0 Beta
                    </div>

                    <div className="grid gap-7 md:grid-cols-[1.2fr_0.8fr] md:items-center">
                        <div>
                            <h2 className="headline-lg mb-3">
                                Menu Lebih Simple, Tetap Modern
                            </h2>
                            <p className="body-lg text-[var(--text-secondary)] mb-6">
                                Fokus ke 2 fitur utama setelah login: Analisa Market dan Info Akun.
                                Ringan, rapi, dan stabil untuk penggunaan harian.
                            </p>

                            <div className="mb-6 grid gap-3 sm:grid-cols-2">
                                <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-4">
                                    <p className="text-xs text-[var(--text-muted)]">Platform</p>
                                    <p className="font-semibold text-[var(--text-primary)]">Android APK</p>
                                </div>
                                <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-4">
                                    <p className="text-xs text-[var(--text-muted)]">Ukuran</p>
                                    <p className="font-semibold text-[var(--text-primary)]">~25 MB</p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row">
                                <Link
                                    href="/download-app"
                                    className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                                >
                                    Download APK
                                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                                </Link>
                                <Link
                                    href="/login"
                                    className="inline-flex items-center justify-center rounded-xl border border-[var(--border-light)] px-6 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-secondary)]"
                                >
                                    Masuk Web ARRA7
                                </Link>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-5">
                            <p className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Fitur Android vNext</p>
                            <div className="space-y-3">
                                <div className="rounded-lg bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                                    Login Google native tanpa webview
                                </div>
                                <div className="rounded-lg bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                                    Analisa market Forex, Gold, Crypto
                                </div>
                                <div className="rounded-lg bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                                    Info akun dan quota real-time
                                </div>
                                <div className="rounded-lg bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                                    UI adaptif light/dark yang lebih rapi
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

