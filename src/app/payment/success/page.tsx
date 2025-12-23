'use client';

import { useEffect, useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function PaymentSuccessContent() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('order_id');
    const [status, setStatus] = useState<'loading' | 'success' | 'pending'>('loading');

    useEffect(() => {
        // Simple delay to show success animation
        const timer = setTimeout(() => {
            setStatus('success');
        }, 1500);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="relative min-h-screen flex items-center justify-center px-4">
            {/* Background */}
            <div className="absolute inset-0 bg-grid opacity-20" />
            <div className="bg-orb bg-orb-blue w-[500px] h-[500px] top-1/4 left-1/4 opacity-20" />
            <div className="bg-orb bg-orb-purple w-[400px] h-[400px] bottom-1/4 right-1/4 opacity-15" />

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative glass rounded-3xl p-8 md:p-12 max-w-lg w-full text-center border border-[#1F2937]"
            >
                {status === 'loading' ? (
                    <>
                        <div className="w-20 h-20 mx-auto mb-6 relative">
                            <div className="absolute inset-0 rounded-full border-4 border-blue-500/20" />
                            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin" />
                        </div>
                        <h1 className="text-2xl font-bold mb-2">Memproses Pembayaran...</h1>
                        <p className="text-[#94A3B8]">Mohon tunggu sebentar</p>
                    </>
                ) : (
                    <>
                        {/* Success Icon */}
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', delay: 0.2 }}
                            className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center"
                        >
                            <motion.svg
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 0.5, delay: 0.4 }}
                                className="w-12 h-12 text-green-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <motion.path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={3}
                                    d="M5 13l4 4L19 7"
                                />
                            </motion.svg>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="text-3xl font-bold mb-3"
                        >
                            Pembayaran Berhasil! 🎉
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="text-[#94A3B8] mb-6"
                        >
                            Terima kasih! Akun Anda telah di-upgrade.<br />
                            Nikmati semua fitur premium sekarang!
                        </motion.p>

                        {orderId && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.7 }}
                                className="bg-[#12141A] rounded-xl p-4 mb-6"
                            >
                                <p className="text-xs text-[#64748B] mb-1">Order ID</p>
                                <p className="font-mono text-sm text-[#94A3B8]">{orderId}</p>
                            </motion.div>
                        )}

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 }}
                            className="space-y-3"
                        >
                            <Link href="/analisa-market">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full glow-button py-4 rounded-xl font-semibold text-white"
                                >
                                    🚀 Mulai Analisa Sekarang
                                </motion.button>
                            </Link>

                            <Link href="/">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full py-3 rounded-xl border border-[#374151] text-[#94A3B8] hover:text-white transition-colors"
                                >
                                    Kembali ke Home
                                </motion.button>
                            </Link>
                        </motion.div>
                    </>
                )}
            </motion.div>
        </div>
    );
}

export default function PaymentSuccessPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <PaymentSuccessContent />
        </Suspense>
    );
}
