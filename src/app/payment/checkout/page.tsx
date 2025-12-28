'use client';

import { useEffect, useState, Suspense, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import Image from 'next/image';

// New Year Promo ends: January 1, 2026 at 23:59:59 WIB (UTC+7)
const NEW_YEAR_PROMO_END = new Date('2026-01-01T23:59:59+07:00');

function PaymentCheckoutContent() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const planId = searchParams.get('plan');

    const [qrCode, setQrCode] = useState<string | null>(null);
    const [orderId, setOrderId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'expired'>('pending');
    const [countdown, setCountdown] = useState<number>(300);
    const [useFallback, setUseFallback] = useState(false);

    // Check promo status at runtime (client-side)
    const isPromoActive = useMemo(() => {
        return new Date() < NEW_YEAR_PROMO_END;
    }, []);

    // Calculate plan details dynamically based on promo status
    const plan = useMemo(() => {
        if (planId === 'PRO') {
            return {
                id: 'PRO',
                name: 'Pro',
                price: isPromoActive ? 99000 : 149000,
                priceFormatted: isPromoActive ? 'Rp 99.000' : 'Rp 149.000',
                originalPrice: 'Rp 299.000',
                promoActive: isPromoActive,
                description: '25x Analisa/hari, Semua Timeframe',
                color: 'from-blue-500 to-purple-500',
            };
        } else if (planId === 'VVIP') {
            return {
                id: 'VVIP',
                name: 'VVIP',
                price: 399000,
                priceFormatted: 'Rp 399.000',
                originalPrice: null,
                promoActive: false,
                description: 'UNLIMITED Analisa, Free Custom EA',
                color: 'from-amber-500 to-orange-500',
            };
        }
        return null;
    }, [planId, isPromoActive]);

    const createQRIS = useCallback(async () => {
        if (!planId || !plan) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/payment/doku-create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId }),
            });

            const data = await response.json();

            if (data.status === 'success' && data.qrCode) {
                setQrCode(data.qrCode);
                setOrderId(data.orderId);
                setCountdown(300); // 5 minutes
                setUseFallback(false);
            } else {
                console.error('DOKU Error:', data.message);
                // Fallback to manual QRIS
                setUseFallback(true);
                setOrderId(`ARRA7-${planId}-${Date.now()}`);
            }
        } catch (err) {
            console.error('Create QRIS error:', err);
            setUseFallback(true);
            setOrderId(`ARRA7-${planId}-${Date.now()}`);
        } finally {
            setIsLoading(false);
        }
    }, [planId, plan]);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login?callbackUrl=/payment/checkout');
        }
    }, [status, router]);

    useEffect(() => {
        if (status === 'authenticated' && planId && plan) {
            createQRIS();
        }
    }, [status, planId, plan, createQRIS]);

    // Countdown timer
    useEffect(() => {
        if (countdown <= 0 || paymentStatus !== 'pending' || useFallback) return;

        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    setPaymentStatus('expired');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [countdown, paymentStatus, useFallback]);

    // Poll for payment status
    useEffect(() => {
        if (!orderId || paymentStatus !== 'pending' || useFallback) return;

        const pollInterval = setInterval(async () => {
            try {
                const response = await fetch(`/api/user/quota`);
                const data = await response.json();

                if (data.quota?.membership === planId) {
                    setPaymentStatus('success');
                    clearInterval(pollInterval);
                }
            } catch (err) {
                console.error('Poll error:', err);
            }
        }, 5000);

        return () => clearInterval(pollInterval);
    }, [orderId, paymentStatus, planId, useFallback]);

    const formatCountdown = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleTelegramConfirm = () => {
        if (!plan) return;
        const message = encodeURIComponent(
            `Halo Admin ARRA7! 👋\n\n` +
            `Saya ingin konfirmasi pembayaran:\n\n` +
            `📋 Order ID: ${orderId}\n` +
            `📦 Paket: ${plan.name}\n` +
            `💰 Nominal: ${plan.priceFormatted}\n` +
            `📧 Email: ${session?.user?.email || '-'}\n\n` +
            `Mohon diproses upgrade membership saya. Terima kasih! 🙏`
        );
        window.open(`https://t.me/arra7trader?text=${message}`, '_blank');
    };

    if (!planId || !plan) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Plan tidak ditemukan</h1>
                    <Link href="/pricing" className="text-blue-400 hover:underline">
                        Kembali ke Pricing
                    </Link>
                </div>
            </div>
        );
    }

    if (status === 'loading' || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-[#94A3B8]">Membuat QRIS...</p>
                </div>
            </div>
        );
    }

    // Success state
    if (paymentStatus === 'success') {
        return (
            <div className="relative min-h-screen flex items-center justify-center px-4">
                <div className="absolute inset-0 bg-grid opacity-20" />
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative glass rounded-3xl p-8 md:p-12 max-w-lg w-full text-center border border-green-500/30"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center"
                    >
                        <svg className="w-12 h-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </motion.div>
                    <h1 className="text-3xl font-bold mb-3">Pembayaran Berhasil! 🎉</h1>
                    <p className="text-[#94A3B8] mb-6">
                        Akun Anda telah di-upgrade ke <strong className="text-white">{plan.name}</strong>
                    </p>
                    <Link href="/analisa-market">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full glow-button py-4 rounded-xl font-semibold text-white"
                        >
                            🚀 Mulai Analisa Sekarang
                        </motion.button>
                    </Link>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen pt-28 lg:pt-36 pb-20 px-4 sm:px-6 lg:px-8">
            <div className="absolute inset-0 bg-grid opacity-20" />
            <div className="bg-orb bg-orb-blue w-[500px] h-[500px] top-1/4 left-1/4 opacity-20" />

            <div className="relative max-w-lg mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-3xl p-6 md:p-8 border border-[#1F2937]"
                >
                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3 bg-gradient-to-br ${plan.color}`}>
                            {planId === 'PRO' ? '🚀' : '👑'}
                        </div>
                        <h1 className="text-2xl font-bold">
                            Upgrade ke <span className="gradient-text">{plan.name}</span>
                        </h1>
                    </div>

                    {/* Price with promo indicator */}
                    <div className="bg-[#12141A] rounded-2xl p-4 mb-6 text-center">
                        {plan.promoActive && plan.originalPrice && (
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <span className="text-lg text-[#64748B] line-through">{plan.originalPrice}</span>
                                <span className="px-2 py-0.5 rounded bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-bold animate-pulse">
                                    🎉 PROMO TAHUN BARU
                                </span>
                            </div>
                        )}
                        <p className="text-4xl font-bold gradient-text">{plan.priceFormatted}</p>
                    </div>

                    {paymentStatus === 'expired' ? (
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 text-center mb-6">
                            <p className="text-amber-400 mb-4">QRIS telah expired</p>
                            <button
                                onClick={() => {
                                    setPaymentStatus('pending');
                                    createQRIS();
                                }}
                                className="px-6 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 rounded-lg text-amber-400"
                            >
                                Buat QRIS Baru
                            </button>
                        </div>
                    ) : useFallback ? (
                        /* Fallback to static QRIS */
                        <>
                            <div className="bg-white p-6 rounded-2xl mb-4 flex justify-center">
                                <Image
                                    src="/images/qris-code.png"
                                    alt="QRIS Code"
                                    width={200}
                                    height={200}
                                    className="rounded-lg"
                                />
                            </div>

                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-4">
                                <p className="text-sm text-blue-400">
                                    Scan QRIS, bayar <strong>{plan.priceFormatted}</strong>, lalu konfirmasi via Telegram
                                </p>
                            </div>

                            <button
                                onClick={handleTelegramConfirm}
                                className="w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center gap-2 mb-4"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                                </svg>
                                Konfirmasi via Telegram
                            </button>
                        </>
                    ) : qrCode ? (
                        /* Dynamic QRIS from DOKU */
                        <>
                            <div className="bg-white p-6 rounded-2xl mb-4 flex justify-center">
                                <QRCodeSVG
                                    value={qrCode}
                                    size={200}
                                    level="H"
                                    includeMargin
                                />
                            </div>

                            <div className="text-center mb-4">
                                <p className="text-sm text-[#64748B]">Berlaku selama</p>
                                <p className={`text-2xl font-mono font-bold ${countdown < 60 ? 'text-red-400' : 'text-white'}`}>
                                    {formatCountdown(countdown)}
                                </p>
                            </div>

                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-4 flex items-center gap-3">
                                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                                <p className="text-sm text-blue-400">Menunggu pembayaran...</p>
                            </div>

                            <div className="text-sm text-[#94A3B8] space-y-2 mb-4">
                                <p>1. Scan QRIS dengan e-wallet/mobile banking</p>
                                <p>2. Pastikan nominal: <strong className="text-white">{plan.priceFormatted}</strong></p>
                                <p>3. Selesaikan pembayaran</p>
                            </div>
                        </>
                    ) : null}

                    {/* Supported Payments */}
                    <div className="flex justify-center gap-2 flex-wrap mb-6">
                        {['GoPay', 'OVO', 'Dana', 'ShopeePay', 'BCA', 'Mandiri'].map((name) => (
                            <span key={name} className="px-2 py-1 bg-[#1F2937] rounded text-xs text-[#94A3B8]">
                                {name}
                            </span>
                        ))}
                    </div>

                    <Link href="/pricing" className="block">
                        <button className="w-full py-3 rounded-xl border border-[#374151] text-[#94A3B8] hover:text-white transition-colors">
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
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <PaymentCheckoutContent />
        </Suspense>
    );
}
