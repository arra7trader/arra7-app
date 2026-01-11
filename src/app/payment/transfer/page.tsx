'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const NEW_YEAR_PROMO_END = new Date('2026-12-31T23:59:59+07:00');

function TransferContent() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const planId = searchParams.get('plan');

    const isPromoActive = useMemo(() => new Date() < NEW_YEAR_PROMO_END, []);

    const plan = useMemo(() => {
        if (planId === 'PRO') return { name: 'Pro', price: isPromoActive ? 99000 : 149000, priceDisplay: isPromoActive ? 'Rp 99.000' : 'Rp 149.000', originalPrice: isPromoActive ? 'Rp 299.000' : null, promoActive: isPromoActive, period: '/bulan' };
        if (planId === 'VVIP') return { name: 'VVIP', price: 399000, priceDisplay: 'Rp 399.000', originalPrice: null, promoActive: false, period: '/bulan' };
        return null;
    }, [planId, isPromoActive]);

    useEffect(() => { if (status === 'unauthenticated') router.push('/login?callbackUrl=/payment/transfer?plan=' + planId); }, [status, router, planId]);

    if (status === 'loading') return (<div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]"><div className="w-10 h-10 border-2 border-[var(--accent-blue)] border-t-transparent rounded-full animate-spin" /></div>);
    if (!planId || !plan) return (<div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]"><div className="text-center"><h1 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">Paket tidak ditemukan</h1><Link href="/pricing" className="text-[var(--accent-blue)] hover:underline">Kembali ke Pricing</Link></div></div>);

    const telegramLink = `https://t.me/arra7trader?text=${encodeURIComponent(`Halo Admin ARRA7!\n\nSaya sudah transfer untuk paket ${plan.name}:\n\n📧 Email: ${session?.user?.email}\n👤 Nama: ${session?.user?.name}\n📦 Paket: ${plan.name}\n💰 Nominal: ${plan.priceDisplay}\n\nMohon diproses aktivasi membership saya. Terima kasih! 🙏`)}`;

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pt-20">
            <div className="container-apple section-padding pt-8 max-w-lg mx-auto">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-6 border border-[var(--border-light)] shadow-lg">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center"><span className="text-3xl">🏦</span></div>
                        <h1 className="text-2xl font-bold mb-2 text-[var(--text-primary)]">Transfer Bank</h1>
                        <p className="text-[var(--text-secondary)]">Upgrade ke paket <span className="text-[var(--text-primary)] font-semibold">{plan.name}</span></p>
                    </div>

                    <div className="bg-[var(--bg-secondary)] rounded-xl p-4 mb-6 text-center">
                        <p className="text-sm text-[var(--text-muted)] mb-1">Total Pembayaran</p>
                        {plan.promoActive && plan.originalPrice && (<div className="flex items-center justify-center gap-2 mb-1"><span className="text-lg text-[var(--text-muted)] line-through">{plan.originalPrice}</span><span className="px-2 py-0.5 rounded bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-bold">🎉 PROMO</span></div>)}
                        <p className="text-3xl font-bold gradient-text">{plan.priceDisplay}</p>
                        <p className="text-sm text-[var(--text-muted)]">{plan.period}</p>
                    </div>

                    <div className="space-y-4 mb-6">
                        <div className="bg-white p-4 rounded-xl text-center border border-[var(--border-light)]">
                            <p className="text-[var(--text-primary)] font-bold mb-3 text-lg">Scan QRIS untuk Bayar</p>
                            <div className="relative aspect-square w-full max-w-[280px] mx-auto border-2 border-gray-200 rounded-lg overflow-hidden">
                                <img src="/qris-payment.jpg" alt="QRIS Payment ARRA7" className="w-full h-full object-contain" />
                            </div>
                            <p className="text-[var(--text-muted)] text-xs mt-2 font-mono">ARRA7 FULLSTACK DEVELOPER</p>
                            <p className="text-[var(--text-muted)] text-xs font-mono">NMID: ID1025468752486</p>
                        </div>
                    </div>

                    <div className="bg-[var(--bg-secondary)] rounded-xl p-4 mb-6">
                        <p className="text-sm text-[var(--text-muted)] mb-2">Akun Anda</p>
                        <div className="flex items-center gap-3">
                            {session?.user?.image && (<img src={session.user.image} alt="" className="w-10 h-10 rounded-full" />)}
                            <div><p className="font-semibold text-[var(--text-primary)]">{session?.user?.name}</p><p className="text-sm text-[var(--text-muted)]">{session?.user?.email}</p></div>
                        </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                        <div className="flex gap-3">
                            <span className="text-xl">⚠️</span>
                            <div className="text-sm">
                                <p className="font-semibold text-amber-700 mb-2">Langkah Selanjutnya:</p>
                                <ol className="list-decimal list-inside space-y-1 text-[var(--text-secondary)]">
                                    <li>Scan QRIS di atas dengan aplikasi e-wallet/banking apapun</li>
                                    <li>Masukan nominal sesuai total pembayaran: <strong className="text-[var(--text-primary)]">{plan.priceDisplay}</strong></li>
                                    <li>Setelah berhasil, SCREENSHOT bukti pembayaran</li>
                                    <li>Klik tombol konfirmasi di bawah untuk kirim bukti ke Admin</li>
                                    <li>Tunggu aktivasi (maks 1x24 jam)</li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <a href={telegramLink} target="_blank" rel="noopener noreferrer" className="block w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl text-center hover:shadow-lg hover:shadow-blue-500/25 transition-all">
                            <span className="flex items-center justify-center gap-2">📨 Konfirmasi & Kirim Bukti Transfer</span>
                        </a>
                        <Link href="/pricing" className="block w-full py-3 border border-[var(--border-light)] text-[var(--text-secondary)] font-semibold rounded-xl text-center hover:bg-[var(--bg-secondary)] transition-colors">Kembali ke Pricing</Link>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

export default function TransferPage() {
    return (<Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]"><div className="w-10 h-10 border-2 border-[var(--accent-blue)] border-t-transparent rounded-full animate-spin" /></div>}><TransferContent /></Suspense>);
}
