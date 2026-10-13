'use client';

import { Suspense, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function PaymentCheckoutContent() {
    const { data: session } = useSession();
    const searchParams = useSearchParams();
    const planId = searchParams.get('plan');

    const [copiedAccount, setCopiedAccount] = useState(false);
    const handleCopyAccount = () => {
        navigator.clipboard.writeText('1392698188');
        setCopiedAccount(true);
        setTimeout(() => setCopiedAccount(false), 2500);
    };

    const plan = useMemo(() => {
        if (planId === 'ALL_ACCESS') {
            return {
                id: 'ALL_ACCESS',
                name: 'Semua Produk Lifetime (Flash Sale 2 Hari)',
                price: 125000,
                priceFormatted: 'Rp 125.000',
                description: 'Akses Selamanya ke Seluruh Produk ARRA 7 / PICA',
                color: 'from-amber-500 via-rose-500 to-indigo-600'
            };
        } else if (planId === 'PRO') {
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
        const message = `Halo Admin ARRA7! 👋\n\nSaya ingin konfirmasi pembayaran Transfer Bank BCA:\n\n📦 Paket: ${plan.name}\n💰 Nominal: ${plan.priceFormatted}\n📧 Email: ${session?.user?.email || '-'}\n\nMohon diproses aktivasi/upgrade saya. Berikut bukti transfernya: (Lampirkan Bukti Transfer) 🙏`;
        window.open(`https://t.me/arra7trader?text=${encodeURIComponent(message)}`, '_blank');
    };

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pt-36">
            <div className="container-apple section-padding pt-8 max-w-lg mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[var(--bg-primary)] rounded-3xl p-6 md:p-8 border border-[var(--border-light)] shadow-lg"
                >
                    <div className="text-center mb-6">
                        <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3 bg-gradient-to-br ${plan.color} text-2xl`}>
                            {planId === 'ALL_ACCESS' ? '👑' : planId === 'PRO' ? '🚀' : '👑'}
                        </div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                            Upgrade ke <span className="gradient-text">{plan.name}</span>
                        </h1>
                    </div>

                    <div className="bg-[var(--bg-secondary)] rounded-2xl p-4 mb-6 text-center">
                        <p className="text-sm text-[var(--text-muted)] mb-1">Total Pembayaran</p>
                        <p className="text-4xl font-bold gradient-text">{plan.priceFormatted}</p>
                    </div>

                    {/* Bank BCA Details Card - QRIS is Hidden */}
                    <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white p-5 rounded-2xl mb-6 border border-blue-500/30 shadow-xl relative overflow-hidden">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center font-black text-blue-300 text-lg">
                                    BCA
                                </div>
                                <div>
                                    <p className="font-extrabold text-white text-base leading-tight">Bank Central Asia (BCA)</p>
                                    <p className="text-[11px] text-blue-300">m-BCA / KlikBCA / ATM / Antar Bank</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                ● REKENING RESMI
                            </span>
                        </div>

                        <div className="mb-4">
                            <p className="text-xs text-slate-300 mb-1 font-medium">Nomor Rekening Tujuan:</p>
                            <div className="flex items-center justify-between bg-black/50 rounded-xl px-4 py-3 border border-blue-400/30">
                                <span className="text-xl sm:text-2xl font-mono font-black tracking-widest text-amber-300 select-all">
                                    1392698188
                                </span>
                                <button
                                    type="button"
                                    onClick={handleCopyAccount}
                                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                                >
                                    {copiedAccount ? '✓ Tersalin!' : 'Salin Nomor'}
                                </button>
                            </div>
                        </div>

                        <div>
                            <p className="text-xs text-slate-300 mb-0.5 font-medium">Atas Nama Penerima:</p>
                            <p className="text-base sm:text-lg font-extrabold text-white tracking-wide">
                                Arland Pratama Muldiawan
                            </p>
                        </div>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
                        <h3 className="font-semibold text-blue-400 mb-2 flex items-center gap-2">
                            <span>ℹ️</span> Cara Pembayaran:
                        </h3>
                        <ol className="text-sm text-blue-400 list-decimal list-inside space-y-1">
                            <li>Transfer ke rekening <strong>BCA 1392698188 (a.n. Arland Pratama Muldiawan)</strong>.</li>
                            <li>Input nominal sesuai total: <strong>{plan.priceFormatted}</strong></li>
                            <li>Screenshot bukti transfer yang berhasil.</li>
                            <li>Klik tombol konfirmasi via Telegram di bawah dan lampirkan bukti.</li>
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
