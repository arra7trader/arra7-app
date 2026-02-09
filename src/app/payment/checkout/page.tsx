'use client';

import { Suspense, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function PaymentCheckoutContent() {
    const { data: session } = useSession();
    const searchParams = useSearchParams();
    const planId = searchParams.get('plan');

    const plan = useMemo(() => {
        if (planId === 'PRO') {
            return {
                id: 'PRO',
                name: 'Pro',
                price: 149000,
                priceFormatted: 'Rp 149.000',
                description: '25x Analisa/hari, Semua Timeframe',
                color: 'from-blue-500 to-purple-500'
            };
        } else if (planId === 'VVIP') {
            return {
                id: 'VVIP',
                name: 'VVIP',
                price: 399000,
                priceFormatted: 'Rp 399.000',
                description: 'UNLIMITED Analisa, Free Custom EA',
                color: 'from-amber-500 to-orange-500'
            };
        }
        return null;
    }, [planId]);

    if (!planId || !plan) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">Plan tidak ditemukan</h1>
                    <Link href="/pricing" className="text-[var(--accent-blue)] hover:underline">
                        Kembali ke Pricing
                    </Link>
                </div>
            </div>
        );
    }

    const handleTelegramConfirm = () => {
        const message = `Halo Admin ARRA7! 👋\n\nSaya ingin konfirmasi pembayaran QRIS:\n\n📦 Paket: ${plan.name}\n💰 Nominal: ${plan.priceFormatted}\n📧 Email: ${session?.user?.email || '-'}\n\nMohon diproses upgrade membership saya. Terima kasih! 🙏`;
        window.open(`https://t.me/arra7trader?text=${encodeURIComponent(message)}`, '_blank');
    };

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pt-20">
            <div className="container-apple section-padding pt-8 max-w-lg mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl p-6 md:p-8 border border-[var(--border-light)] shadow-lg"
                >
                    <div className="text-center mb-6">
                        <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3 bg-gradient-to-br ${plan.color} text-2xl`}>
                            {planId === 'PRO' ? '🚀' : '👑'}
                        </div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                            Upgrade ke <span className="gradient-text">{plan.name}</span>
                        </h1>
                    </div>

                    <div className="bg-[var(--bg-secondary)] rounded-2xl p-4 mb-6 text-center">
                        <p className="text-sm text-[var(--text-muted)] mb-1">Total Pembayaran</p>
                        <p className="text-4xl font-bold gradient-text">{plan.priceFormatted}</p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl mb-6 flex flex-col items-center justify-center border border-[var(--border-light)]">
                        <div className="relative aspect-square w-full max-w-[280px] mb-4">
                            <img
                                src="/qris-payment.jpg"
                                alt="QRIS ARRA7"
                                className="w-full h-full object-contain rounded-lg"
                            />
                        </div>
                        <p className="text-sm font-semibold text-gray-700">ARRA7 FULLSTACK DEVELOPER</p>
                        <p className="text-xs text-gray-500 font-mono">NMID: ID1025468752486</p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                        <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                            <span>ℹ️</span> Cara Pembayaran:
                        </h3>
                        <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
                            <li>Scan QRIS di atas pakai GoPay/OVO/Dana/BCA/dll.</li>
                            <li>Input nominal: <strong>{plan.priceFormatted}</strong></li>
                            <li>Screenshot bukti bayar.</li>
                            <li>Klik tombol konfirmasi di bawah.</li>
                        </ol>
                    </div>

                    <button
                        onClick={handleTelegramConfirm}
                        className="w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center gap-2 mb-4 hover:shadow-lg transition-all"
                    >
                        <span>📨 Konfirmasi via Telegram</span>
                    </button>

                    <Link href="/pricing" className="block">
                        <button className="w-full py-3 rounded-xl border border-[var(--border-light)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors">
                            ← Kembali ke Pricing
                        </button>
                    </Link>
                </motion.div>
            </div>
        </div>
    );
}

export default function PaymentCheckoutPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
                <div className="w-10 h-10 border-2 border-[var(--accent-blue)] border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <PaymentCheckoutContent />
        </Suspense>
    );
}
