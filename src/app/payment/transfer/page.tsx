'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// New Year Promo ends: January 1, 2026 at 23:59:59 WIB (UTC+7)
const NEW_YEAR_PROMO_END = new Date('2026-01-01T23:59:59+07:00');

const { data: session, status } = useSession();
const router = useRouter();
const searchParams = useSearchParams();
const planId = searchParams.get('plan');

// Check promo status at runtime (client-side)
const isPromoActive = useMemo(() => {
    return new Date() < NEW_YEAR_PROMO_END;
}, []);

// Calculate plan details dynamically based on promo status
const plan = useMemo(() => {
    if (planId === 'PRO') {
        return {
            name: 'Pro',
            price: isPromoActive ? 99000 : 149000,
            priceDisplay: isPromoActive ? 'Rp 99.000' : 'Rp 149.000',
            originalPrice: isPromoActive ? 'Rp 299.000' : null,
            promoActive: isPromoActive,
            period: '/bulan',
        };
    } else if (planId === 'VVIP') {
        return {
            name: 'VVIP',
            price: 399000,
            priceDisplay: 'Rp 399.000',
            originalPrice: null,
            promoActive: false,
            period: '/bulan',
        };
    }
    return null;
}, [planId, isPromoActive]);

useEffect(() => {
    if (status === 'unauthenticated') {
        router.push('/login?callbackUrl=/payment/transfer?plan=' + planId);
    }
}, [status, router, planId]);

if (status === 'loading') {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );
}

if (!planId || !plan) {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">Paket tidak ditemukan</h1>
                <Link href="/pricing" className="text-blue-400 hover:underline">
                    Kembali ke Pricing
                </Link>
            </div>
        </div>
    );
}



const telegramLink = `https://t.me/arra7trader?text=${encodeURIComponent(
    `Halo Admin ARRA7!\n\n` +
    `Saya sudah transfer untuk paket ${plan.name}:\n\n` +
    `📧 Email: ${session?.user?.email}\n` +
    `👤 Nama: ${session?.user?.name}\n` +
    `📦 Paket: ${plan.name}\n` +
    `💰 Nominal: ${plan.priceDisplay}\n\n` +
    `Mohon diproses aktivasi membership saya. Terima kasih! 🙏`
)}`;

return (
    <div className="relative min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8">
        {/* Background */}
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="bg-orb bg-orb-blue w-[600px] h-[600px] -top-40 left-1/4 opacity-20" />
        <div className="bg-orb bg-orb-purple w-[500px] h-[500px] bottom-0 right-1/4 opacity-15" />

        <div className="relative max-w-lg mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl p-6 border border-[#1F2937]"
            >
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                        <span className="text-3xl">🏦</span>
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Transfer Bank</h1>
                    <p className="text-[#94A3B8]">
                        Upgrade ke paket <span className="text-white font-semibold">{plan.name}</span>
                    </p>
                </div>

                {/* Amount */}
                <div className="bg-[#12141A] rounded-xl p-4 mb-6 text-center">
                    <p className="text-sm text-[#64748B] mb-1">Total Pembayaran</p>
                    {plan.promoActive && plan.originalPrice && (
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <span className="text-lg text-[#64748B] line-through">{plan.originalPrice}</span>
                            <span className="px-2 py-0.5 rounded bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-bold animate-pulse">
                                🎉 PROMO TAHUN BARU
                            </span>
                        </div>
                    )}
                    <p className="text-3xl font-bold gradient-text">{plan.priceDisplay}</p>
                    <p className="text-sm text-[#64748B]">{plan.period}</p>
                </div>

                {/* QRIS Display */}
                <div className="space-y-4 mb-6">
                    <div className="bg-white p-4 rounded-xl text-center">
                        <p className="text-black font-bold mb-3 text-lg">Scan QRIS untuk Bayar</p>
                        <div className="relative aspect-square w-full max-w-[280px] mx-auto border-2 border-black rounded-lg overflow-hidden">
                            <img
                                src="/qris-payment.jpg"
                                alt="QRIS Payment ARRA7"
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <p className="text-black/60 text-xs mt-2 font-mono">ARRA7 FULLSTACK DEVELOPER</p>
                        <p className="text-black/60 text-xs font-mono">NMID: ID1025468752486</p>
                    </div>
                </div>

                {/* User Info */}
                <div className="bg-[#12141A] rounded-xl p-4 mb-6">
                    <p className="text-sm text-[#64748B] mb-2">Akun Anda</p>
                    <div className="flex items-center gap-3">
                        {session?.user?.image && (
                            <img
                                src={session.user.image}
                                alt=""
                                className="w-10 h-10 rounded-full"
                            />
                        )}
                        <div>
                            <p className="font-semibold">{session?.user?.name}</p>
                            <p className="text-sm text-[#64748B]">{session?.user?.email}</p>
                        </div>
                    </div>
                </div>

                {/* Instructions */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
                    <div className="flex gap-3">
                        <span className="text-xl">⚠️</span>
                        <div className="text-sm">
                            <p className="font-semibold text-amber-400 mb-2">Langkah Selanjutnya:</p>
                            <ol className="list-decimal list-inside space-y-1 text-[#94A3B8]">
                                <li>Scan QRIS di atas dengan aplikasi e-wallet/banking apapun (Gopay, OVO, Dana, BCA Mobile, dll)</li>
                                <li>Masukan nominal sesuai total pembayaran: <strong className="text-white">{plan.priceDisplay}</strong></li>
                                <li>Setelah berhasil, SCREENSHOT bukti pembayaran</li>
                                <li>Klik tombol konfirmasi di bawah untuk kirim bukti ke Admin</li>
                                <li>Tunggu aktivasi (maks 1x24 jam)</li>
                            </ol>
                        </div>
                    </div>
                </div>

                {/* CTA Buttons */}
                <div className="space-y-3">
                    <a
                        href={telegramLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl text-center hover:shadow-lg hover:shadow-blue-500/25 transition-all"
                    >
                        <span className="flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                            </svg>
                            Konfirmasi & Kirim Bukti Transfer
                        </span>
                    </a>
                    <Link
                        href="/pricing"
                        className="block w-full py-3 border border-[#1F2937] text-[#94A3B8] font-semibold rounded-xl text-center hover:bg-[#12141A] transition-colors"
                    >
                        Kembali ke Pricing
                    </Link>
                </div>
            </motion.div>
        </div>
    </div>
);
}
