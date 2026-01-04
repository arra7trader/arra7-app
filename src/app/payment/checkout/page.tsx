'use client';

import { useEffect, useState, Suspense, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import Image from 'next/image';
import { CheckIcon } from '@/components/PremiumIcons';

const NEW_YEAR_PROMO_END = new Date('2026-01-01T23:59:59+07:00');

function PaymentCheckoutContent() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const planId = searchParams.get('plan');

    const [qrCode, setQrCode] = useState<string | null>(null);
    const [orderId, setOrderId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'expired'>('pending');
    const [countdown, setCountdown] = useState<number>(300);
    const [useFallback, setUseFallback] = useState(false);

    const isPromoActive = useMemo(() => new Date() < NEW_YEAR_PROMO_END, []);

    const plan = useMemo(() => {
        if (planId === 'PRO') {
            return { id: 'PRO', name: 'Pro', price: isPromoActive ? 99000 : 149000, priceFormatted: isPromoActive ? 'Rp 99.000' : 'Rp 149.000', originalPrice: 'Rp 299.000', promoActive: isPromoActive, description: '25x Analisa/hari, Semua Timeframe', color: 'from-blue-500 to-purple-500' };
        } else if (planId === 'VVIP') {
            return { id: 'VVIP', name: 'VVIP', price: 399000, priceFormatted: 'Rp 399.000', originalPrice: null, promoActive: false, description: 'UNLIMITED Analisa, Free Custom EA', color: 'from-amber-500 to-orange-500' };
        }
        return null;
    }, [planId, isPromoActive]);

    const createQRIS = useCallback(async () => {
        if (!planId || !plan) return;
        setIsLoading(true);
        try {
            const response = await fetch('/api/payment/doku-create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId }) });
            const data = await response.json();
            if (data.status === 'success' && data.qrCode) {
                setQrCode(data.qrCode);
                setOrderId(data.orderId);
                setCountdown(300);
                setUseFallback(false);
            } else {
                setUseFallback(true);
                setOrderId(`ARRA7-${planId}-${Date.now()}`);
            }
        } catch {
            setUseFallback(true);
            setOrderId(`ARRA7-${planId}-${Date.now()}`);
        } finally {
            setIsLoading(false);
        }
    }, [planId, plan]);

    useEffect(() => { if (status === 'unauthenticated') router.push('/login?callbackUrl=/payment/checkout'); }, [status, router]);
    useEffect(() => { if (status === 'authenticated' && planId && plan) createQRIS(); }, [status, planId, plan, createQRIS]);
    useEffect(() => {
        if (countdown <= 0 || paymentStatus !== 'pending' || useFallback) return;
        const timer = setInterval(() => { setCountdown(prev => { if (prev <= 1) { setPaymentStatus('expired'); return 0; } return prev - 1; }); }, 1000);
        return () => clearInterval(timer);
    }, [countdown, paymentStatus, useFallback]);
    useEffect(() => {
        if (!orderId || paymentStatus !== 'pending' || useFallback) return;
        const pollInterval = setInterval(async () => { try { const res = await fetch('/api/user/quota'); const data = await res.json(); if (data.quota?.membership === planId) { setPaymentStatus('success'); clearInterval(pollInterval); } } catch { } }, 5000);
        return () => clearInterval(pollInterval);
    }, [orderId, paymentStatus, planId, useFallback]);

    const formatCountdown = (seconds: number) => { const mins = Math.floor(seconds / 60); const secs = seconds % 60; return `${mins}:${secs.toString().padStart(2, '0')}`; };
    const handleTelegramConfirm = () => { if (!plan) return; window.open(`https://t.me/arra7trader?text=${encodeURIComponent(`Halo Admin ARRA7! 👋\n\nSaya ingin konfirmasi pembayaran:\n\n📋 Order ID: ${orderId}\n📦 Paket: ${plan.name}\n💰 Nominal: ${plan.priceFormatted}\n📧 Email: ${session?.user?.email || '-'}\n\nMohon diproses upgrade membership saya. Terima kasih! 🙏`)}`, '_blank'); };

    if (!planId || !plan) return (<div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]"><div className="text-center"><h1 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">Plan tidak ditemukan</h1><Link href="/pricing" className="text-[var(--accent-blue)] hover:underline">Kembali ke Pricing</Link></div></div>);
    if (status === 'loading' || isLoading) return (<div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]"><div className="text-center"><div className="w-16 h-16 border-4 border-[var(--accent-blue)] border-t-transparent rounded-full animate-spin mx-auto mb-4" /><p className="text-[var(--text-secondary)]">Membuat QRIS...</p></div></div>);

    if (paymentStatus === 'success') {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl p-8 md:p-12 max-w-lg w-full text-center border border-green-200 shadow-lg">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckIcon className="text-green-600" size="xl" />
                    </motion.div>
                    <h1 className="text-3xl font-bold mb-3 text-[var(--text-primary)]">Pembayaran Berhasil! 🎉</h1>
                    <p className="text-[var(--text-secondary)] mb-6">Akun Anda telah di-upgrade ke <strong className="text-[var(--text-primary)]">{plan.name}</strong></p>
                    <Link href="/analisa-market"><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full btn-primary py-4">🚀 Mulai Analisa Sekarang</motion.button></Link>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pt-20">
            <div className="container-apple section-padding pt-8 max-w-lg mx-auto">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-6 md:p-8 border border-[var(--border-light)] shadow-lg">
                    <div className="text-center mb-6">
                        <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3 bg-gradient-to-br ${plan.color} text-2xl`}>{planId === 'PRO' ? '🚀' : '👑'}</div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Upgrade ke <span className="gradient-text">{plan.name}</span></h1>
                    </div>

                    <div className="bg-[var(--bg-secondary)] rounded-2xl p-4 mb-6 text-center">
                        {plan.promoActive && plan.originalPrice && (<div className="flex items-center justify-center gap-2 mb-1"><span className="text-lg text-[var(--text-muted)] line-through">{plan.originalPrice}</span><span className="px-2 py-0.5 rounded bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-bold">🎉 PROMO</span></div>)}
                        <p className="text-4xl font-bold gradient-text">{plan.priceFormatted}</p>
                    </div>

                    {paymentStatus === 'expired' ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center mb-6">
                            <p className="text-amber-700 mb-4">QRIS telah expired</p>
                            <button onClick={() => { setPaymentStatus('pending'); createQRIS(); }} className="px-6 py-2 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg text-amber-700">Buat QRIS Baru</button>
                        </div>
                    ) : useFallback ? (
                        <>
                            <div className="bg-white p-6 rounded-2xl mb-4 flex justify-center border border-[var(--border-light)]"><Image src="/images/qris-code.png" alt="QRIS Code" width={200} height={200} className="rounded-lg" /></div>
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4"><p className="text-sm text-blue-700">Scan QRIS, bayar <strong>{plan.priceFormatted}</strong>, lalu konfirmasi via Telegram</p></div>
                            <button onClick={handleTelegramConfirm} className="w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center gap-2 mb-4">📨 Konfirmasi via Telegram</button>
                        </>
                    ) : qrCode ? (
                        <>
                            <div className="bg-white p-6 rounded-2xl mb-4 flex justify-center border border-[var(--border-light)]"><QRCodeSVG value={qrCode} size={200} level="H" includeMargin /></div>
                            <div className="text-center mb-4"><p className="text-sm text-[var(--text-muted)]">Berlaku selama</p><p className={`text-2xl font-mono font-bold ${countdown < 60 ? 'text-red-600' : 'text-[var(--text-primary)]'}`}>{formatCountdown(countdown)}</p></div>
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex items-center gap-3"><div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" /><p className="text-sm text-blue-700">Menunggu pembayaran...</p></div>
                            <div className="text-sm text-[var(--text-secondary)] space-y-2 mb-4"><p>1. Scan QRIS dengan e-wallet/mobile banking</p><p>2. Pastikan nominal: <strong className="text-[var(--text-primary)]">{plan.priceFormatted}</strong></p><p>3. Selesaikan pembayaran</p></div>
                        </>
                    ) : null}

                    <div className="flex justify-center gap-2 flex-wrap mb-6">{['GoPay', 'OVO', 'Dana', 'ShopeePay', 'BCA', 'Mandiri'].map((name) => (<span key={name} className="px-2 py-1 bg-[var(--bg-secondary)] rounded text-xs text-[var(--text-muted)]">{name}</span>))}</div>
                    <Link href="/pricing" className="block"><button className="w-full py-3 rounded-xl border border-[var(--border-light)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors">← Kembali ke Pricing</button></Link>
                </motion.div>
            </div>
        </div>
    );
}

export default function PaymentCheckoutPage() {
    return (<Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]"><div className="w-10 h-10 border-2 border-[var(--accent-blue)] border-t-transparent rounded-full animate-spin" /></div>}><PaymentCheckoutContent /></Suspense>);
}
