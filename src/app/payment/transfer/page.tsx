'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

const PRICING_OPTIONS: Record<
    string,
    Record<string, { durationLabel: string; price: number; priceDisplay: string; originalPrice: string | null; period: string }>
> = {
    PRO: {
        '1month': { durationLabel: '1 Bulan', price: 99000, priceDisplay: 'Rp 99.000', originalPrice: 'Rp 149.000', period: '/bulan' },
        '3months': { durationLabel: '3 Bulan', price: 290000, priceDisplay: 'Rp 290.000', originalPrice: 'Rp 447.000', period: '/3 bulan' },
        '6months': { durationLabel: '6 Bulan', price: 590000, priceDisplay: 'Rp 590.000', originalPrice: 'Rp 894.000', period: '/6 bulan' },
        '1year': { durationLabel: '1 Tahun', price: 1000000, priceDisplay: 'Rp 1.000.000', originalPrice: 'Rp 1.788.000', period: '/tahun' },
    },
    VVIP: {
        '1month': { durationLabel: '1 Bulan', price: 249000, priceDisplay: 'Rp 249.000', originalPrice: 'Rp 399.000', period: '/bulan' },
        '3months': { durationLabel: '3 Bulan', price: 740000, priceDisplay: 'Rp 740.000', originalPrice: 'Rp 1.197.000', period: '/3 bulan' },
        '6months': { durationLabel: '6 Bulan', price: 1490000, priceDisplay: 'Rp 1.490.000', originalPrice: 'Rp 2.394.000', period: '/6 bulan' },
        '1year': { durationLabel: '1 Tahun', price: 2800000, priceDisplay: 'Rp 2.800.000', originalPrice: 'Rp 4.788.000', period: '/tahun' },
    },
    CT_FOLLOWER: {
        '1month': { durationLabel: '1 Bulan', price: 49000, priceDisplay: 'Rp 49.000', originalPrice: null, period: '/bulan' },
        '3months': { durationLabel: '3 Bulan', price: 130000, priceDisplay: 'Rp 130.000', originalPrice: 'Rp 147.000', period: '/3 bulan' },
        '6months': { durationLabel: '6 Bulan', price: 249000, priceDisplay: 'Rp 249.000', originalPrice: 'Rp 294.000', period: '/6 bulan' },
        '1year': { durationLabel: '1 Tahun', price: 449000, priceDisplay: 'Rp 449.000', originalPrice: 'Rp 588.000', period: '/tahun' },
    },
    CT_PROVIDER: {
        '1month': { durationLabel: '1 Bulan', price: 99000, priceDisplay: 'Rp 99.000', originalPrice: null, period: '/bulan' },
        '3months': { durationLabel: '3 Bulan', price: 270000, priceDisplay: 'Rp 270.000', originalPrice: 'Rp 297.000', period: '/3 bulan' },
        '6months': { durationLabel: '6 Bulan', price: 499000, priceDisplay: 'Rp 499.000', originalPrice: 'Rp 594.000', period: '/6 bulan' },
        '1year': { durationLabel: '1 Tahun', price: 899000, priceDisplay: 'Rp 899.000', originalPrice: 'Rp 1.188.000', period: '/tahun' },
    },
    TELEBOT: {
        '1month': { durationLabel: '1 Bulan', price: 175000, priceDisplay: 'Rp 175.000', originalPrice: 'Rp 249.000', period: '/bulan' },
    },
};

function TransferContent() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const planId = searchParams.get('plan');
    const duration = searchParams.get('duration') || '1month';
    const [telegramUsername, setTelegramUsername] = useState('');
    const [savingTelegramProfile, setSavingTelegramProfile] = useState(false);
    const [telegramProfileMessage, setTelegramProfileMessage] = useState<string | null>(null);

    const plan = useMemo(() => {
        if (!planId || !PRICING_OPTIONS[planId] || !PRICING_OPTIONS[planId][duration]) return null;

        const details = PRICING_OPTIONS[planId][duration];
        const nameMap: Record<string, string> = {
            PRO: 'Pro',
            VVIP: 'VVIP',
            CT_FOLLOWER: 'CT Follower',
            CT_PROVIDER: 'CT Provider',
            TELEBOT: 'TELEBOT'
        };

        return {
            id: planId,
            name: nameMap[planId] || planId,
            ...details
        };
    }, [planId, duration]);

    const normalizedTelegramUsername = telegramUsername.trim().replace(/^@+/, '');
    const requiresTelegramUsername = plan?.id === 'TELEBOT';
    const canConfirmPayment = !requiresTelegramUsername || normalizedTelegramUsername.length > 0;

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push(`/login?callbackUrl=/payment/transfer?plan=${planId}&duration=${duration}`);
        }
    }, [status, router, planId, duration]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
                <div className="w-10 h-10 border-2 border-[var(--accent-blue)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!planId || !plan) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">Paket tidak ditemukan</h1>
                    <Link href="/pricing" className="text-[var(--accent-blue)] hover:underline">
                        Kembali ke Pricing
                    </Link>
                </div>
            </div>
        );
    }

    const telegramText = [
        'Halo Admin ARRA7!',
        '',
        `Saya sudah melakukan pembayaran via QRIS untuk paket *${plan.name} ${plan.durationLabel}*:`,
        '',
        `Email: ${session?.user?.email}`,
        `Nama: ${session?.user?.name}`,
        `Paket: ${plan.name} (${plan.durationLabel})`,
        `Nominal: ${plan.priceDisplay}`,
        requiresTelegramUsername ? `Username Telegram: @${normalizedTelegramUsername}` : null,
        '',
        requiresTelegramUsername
            ? 'Mohon approve akses TELEBOT saya. Berikut bukti pembayarannya: (Lampirkan Screenshot)'
            : 'Mohon diproses. Berikut bukti pembayarannya: (Lampirkan Screenshot)',
    ]
        .filter(Boolean)
        .join('\n');

    const telegramLink = `https://t.me/arra7trader?text=${encodeURIComponent(telegramText)}`;

    async function handleConfirmPayment() {
        if (!canConfirmPayment || savingTelegramProfile) return;

        setTelegramProfileMessage(null);

        if (requiresTelegramUsername) {
            try {
                setSavingTelegramProfile(true);
                const profileResponse = await fetch('/api/user/telebot/profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ telegramUsername: normalizedTelegramUsername })
                });
                const profileData = await profileResponse.json();

                if (!profileResponse.ok || !profileData?.ok) {
                    setTelegramProfileMessage(profileData?.message || 'Gagal menyimpan username Telegram.');
                    return;
                }

                const confirmationResponse = await fetch('/api/user/telebot/payment-confirmation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        planCode: plan.id,
                        durationCode: duration,
                        amountIdr: plan.price,
                        telegramUsername: normalizedTelegramUsername
                    })
                });
                const confirmationData = await confirmationResponse.json();

                if (!confirmationResponse.ok || !confirmationData?.ok) {
                    setTelegramProfileMessage(confirmationData?.message || 'Gagal menyimpan konfirmasi pembayaran.');
                    return;
                }
            } catch {
                setTelegramProfileMessage('Network error saat menyimpan data pembayaran TELEBOT.');
                return;
            } finally {
                setSavingTelegramProfile(false);
            }
        }

        window.open(telegramLink, '_blank', 'noopener,noreferrer');
    }

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pt-36">
            <div className="container-apple section-padding pt-8 max-w-lg mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[var(--bg-primary)] rounded-2xl p-6 border border-[var(--border-light)] shadow-lg"
                >
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                            <span className="text-3xl">QR</span>
                        </div>
                        <h1 className="text-2xl font-bold mb-2 text-[var(--text-primary)]">Pembayaran QRIS</h1>
                        <p className="text-[var(--text-secondary)]">
                            Upgrade ke paket <span className="text-[var(--text-primary)] font-semibold">{plan.name} ({plan.durationLabel})</span>
                        </p>
                    </div>

                    <div className="bg-[var(--bg-secondary)] rounded-xl p-4 mb-6 text-center">
                        <p className="text-sm text-[var(--text-muted)] mb-1">Total Pembayaran</p>
                        {plan.originalPrice && (
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <span className="text-lg text-[var(--text-muted)] line-through">{plan.originalPrice}</span>
                                <span className="px-2 py-0.5 rounded bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-bold">PROMO</span>
                            </div>
                        )}
                        <p className="text-3xl font-bold gradient-text">{plan.priceDisplay}</p>
                        <p className="text-sm text-[var(--text-muted)]">{plan.period}</p>
                    </div>

                    <div className="space-y-4 mb-6">
                        <div className="bg-[var(--bg-primary)] p-4 rounded-xl text-center border border-[var(--border-light)]">
                            <p className="text-[var(--text-primary)] font-bold mb-3 text-lg">Scan QRIS untuk Bayar</p>
                            <div className="relative aspect-square w-full max-w-[280px] mx-auto border-2 border-[var(--border-light)] rounded-lg overflow-hidden">
                                <img src="/qris-payment.jpg" alt="QRIS Payment ARRA7" className="w-full h-full object-contain" />
                            </div>
                            <p className="text-[var(--text-muted)] text-xs mt-2 font-mono">ARRA7 FULLSTACK DEVELOPER</p>
                            <p className="text-[var(--text-muted)] text-xs font-mono">NMID: ID1025468752486</p>
                        </div>
                    </div>

                    {requiresTelegramUsername && (
                        <div className="bg-[var(--bg-secondary)] rounded-xl p-4 mb-6">
                            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                                Username Telegram untuk approval TELEBOT
                            </label>
                            <input
                                value={telegramUsername}
                                onChange={(e) => {
                                    setTelegramUsername(e.target.value);
                                    if (telegramProfileMessage) setTelegramProfileMessage(null);
                                }}
                                placeholder="@username_telegram"
                                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] outline-none"
                            />
                            <p className="text-xs text-[var(--text-muted)] mt-2">
                                Setelah bayar, admin akan approve akses TELEBOT berdasarkan username ini.
                            </p>
                            {telegramProfileMessage && (
                                <p className="text-xs text-red-400 mt-2">{telegramProfileMessage}</p>
                            )}
                        </div>
                    )}

                    <div className="bg-[var(--bg-secondary)] rounded-xl p-4 mb-6">
                        <p className="text-sm text-[var(--text-muted)] mb-2">Akun Anda</p>
                        <div className="flex items-center gap-3">
                            {session?.user?.image && (
                                <img src={session.user.image} alt="" className="w-10 h-10 rounded-full" />
                            )}
                            <div>
                                <p className="font-semibold text-[var(--text-primary)]">{session?.user?.name}</p>
                                <p className="text-sm text-[var(--text-muted)]">{session?.user?.email}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
                        <div className="flex gap-3">
                            <span className="text-xl">!</span>
                            <div className="text-sm">
                                <p className="font-semibold text-amber-400 mb-2">Langkah Selanjutnya:</p>
                                <ol className="list-decimal list-inside space-y-1 text-[var(--text-secondary)]">
                                    <li>Scan QRIS di atas dengan aplikasi e-wallet atau mobile banking.</li>
                                    <li>Masukkan nominal sesuai total pembayaran: <strong className="text-[var(--text-primary)]">{plan.priceDisplay}</strong></li>
                                    <li>Setelah berhasil, screenshot bukti pembayaran.</li>
                                    {requiresTelegramUsername && <li>Masukkan username Telegram Anda di form atas.</li>}
                                    <li>Klik tombol konfirmasi di bawah untuk kirim bukti ke admin.</li>
                                    <li>Tunggu approval admin dan aktivasi akses maksimal 1x24 jam.</li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <button
                            type="button"
                            onClick={() => void handleConfirmPayment()}
                            disabled={!canConfirmPayment || savingTelegramProfile}
                            className={`block w-full py-4 text-white font-semibold rounded-xl text-center transition-all ${canConfirmPayment
                                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:shadow-lg hover:shadow-blue-500/25'
                                : 'bg-slate-600 cursor-not-allowed opacity-60'
                                }`}
                        >
                            <span className="flex items-center justify-center gap-2">
                                {savingTelegramProfile ? 'Menyimpan username...' : 'Konfirmasi & Kirim Bukti Transfer'}
                            </span>
                        </button>
                        {requiresTelegramUsername && !canConfirmPayment && (
                            <p className="text-center text-xs text-amber-400">
                                Isi username Telegram dulu sebelum kirim konfirmasi pembayaran.
                            </p>
                        )}
                        <Link
                            href="/pricing"
                            className="block w-full py-3 border border-[var(--border-light)] text-[var(--text-secondary)] font-semibold rounded-xl text-center hover:bg-[var(--bg-secondary)] transition-colors"
                        >
                            Kembali ke Pricing
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

export default function TransferPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
                    <div className="w-10 h-10 border-2 border-[var(--accent-blue)] border-t-transparent rounded-full animate-spin" />
                </div>
            }
        >
            <TransferContent />
        </Suspense>
    );
}
