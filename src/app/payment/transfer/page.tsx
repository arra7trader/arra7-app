'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// New Year Promo ends: January 1, 2026 at 23:59:59 WIB (UTC+7)
const NEW_YEAR_PROMO_END = new Date('2026-01-01T23:59:59+07:00');
const isNewYearPromoActive = () => new Date() < NEW_YEAR_PROMO_END;

const PLAN_DETAILS = {
    PRO: {
        name: 'Pro',
        price: isNewYearPromoActive() ? 99000 : 149000,
        priceDisplay: isNewYearPromoActive() ? 'Rp 99.000' : 'Rp 149.000',
        originalPrice: isNewYearPromoActive() ? 'Rp 299.000' : null,
        promoActive: isNewYearPromoActive(),
        period: '/bulan',
    },
    VVIP: {
        name: 'VVIP',
        price: 399000,
        priceDisplay: 'Rp 399.000',
        originalPrice: null,
        promoActive: false,
        period: '/bulan',
    },
};

const BANK_INFO = {
    bank: 'BCA',
    accountNumber: '1392698188',
    accountName: 'Arland Pratama Muldiawan',
};

export default function TransferPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const planId = searchParams.get('plan') as keyof typeof PLAN_DETAILS;
    const [copied, setCopied] = useState<string | null>(null);

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

    if (!planId || !PLAN_DETAILS[planId]) {
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

    const plan = PLAN_DETAILS[planId];

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopied(field);
        setTimeout(() => setCopied(null), 2000);
    };

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

                    {/* Bank Info */}
                    <div className="space-y-4 mb-6">
                        <div className="bg-[#12141A] rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm text-[#64748B]">Bank</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-blue-400">{BANK_INFO.bank}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm text-[#64748B]">Nomor Rekening</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-lg font-bold">{BANK_INFO.accountNumber}</span>
                                    <button
                                        onClick={() => copyToClipboard(BANK_INFO.accountNumber, 'account')}
                                        className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs hover:bg-blue-500/30 transition-colors"
                                    >
                                        {copied === 'account' ? '✓ Copied!' : 'Copy'}
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-[#64748B]">Atas Nama</span>
                                <span className="font-semibold">{BANK_INFO.accountName}</span>
                            </div>
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
                                    <li>Transfer sesuai nominal di atas</li>
                                    <li>Simpan bukti transfer</li>
                                    <li>Klik tombol konfirmasi di bawah</li>
                                    <li>Kirim bukti transfer via Telegram</li>
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
                                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                                </svg>
                                Konfirmasi via Telegram
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
