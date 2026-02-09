'use client';

import { useEffect, useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function PaymentSuccessContent() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('order_id');
    const [status, setStatus] = useState<'loading' | 'success' | 'pending'>('loading');

    useEffect(() => { const timer = setTimeout(() => { setStatus('success'); }, 1500); return () => clearTimeout(timer); }, []);

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl p-8 md:p-12 max-w-lg w-full text-center border border-[var(--border-light)] shadow-lg">
                {status === 'loading' ? (
                    <>
                        <div className="w-20 h-20 mx-auto mb-6 relative">
                            <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
                            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[var(--accent-blue)] animate-spin" />
                        </div>
                        <h1 className="text-2xl font-bold mb-2 text-[var(--text-primary)]">Memproses Pembayaran...</h1>
                        <p className="text-[var(--text-secondary)]">Mohon tunggu sebentar</p>
                    </>
                ) : (
                    <>
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }} className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
                            <motion.svg initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.4 }} className="w-12 h-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <motion.path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </motion.svg>
                        </motion.div>

                        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="text-3xl font-bold mb-3 text-[var(--text-primary)]">Pembayaran Berhasil! 🎉</motion.h1>
                        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="text-[var(--text-secondary)] mb-6">Terima kasih! Akun Anda telah di-upgrade.<br />Nikmati semua fitur premium sekarang!</motion.p>

                        {orderId && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="bg-[var(--bg-secondary)] rounded-xl p-4 mb-6">
                                <p className="text-xs text-[var(--text-muted)] mb-1">Order ID</p>
                                <p className="font-mono text-sm text-[var(--text-secondary)]">{orderId}</p>
                            </motion.div>
                        )}

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="space-y-3">
                            <Link href="/analisa-market"><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full btn-primary py-4">🚀 Mulai Analisa Sekarang</motion.button></Link>
                            <Link href="/"><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full py-3 rounded-xl border border-[var(--border-light)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors">Kembali ke Home</motion.button></Link>
                        </motion.div>
                    </>
                )}
            </motion.div>
        </div>
    );
}

export default function PaymentSuccessPage() {
    return (<Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]"><div className="w-10 h-10 border-2 border-[var(--accent-blue)] border-t-transparent rounded-full animate-spin" /></div>}><PaymentSuccessContent /></Suspense>);
}
