'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const PLAN_DETAILS = {
    PRO: {
        name: 'Pro',
        price: 149000,
        priceDisplay: 'Rp 149.000',
        period: '/bulan',
    },
    VVIP: {
        name: 'VVIP',
        price: 399000,
        priceDisplay: 'Rp 399.000',
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

    const whatsappLink = `https://wa.me/6281234567890?text=${encodeURIComponent(
        `Halo Admin ARRA7!\n\nSaya sudah transfer untuk paket ${plan.name}:\n\n` +
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
                                    <li>Kirim bukti transfer via WhatsApp</li>
                                    <li>Tunggu aktivasi (maks 1x24 jam)</li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    {/* CTA Buttons */}
                    <div className="space-y-3">
                        <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl text-center hover:shadow-lg hover:shadow-green-500/25 transition-all"
                        >
                            <span className="flex items-center justify-center gap-2">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                                Konfirmasi via WhatsApp
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
