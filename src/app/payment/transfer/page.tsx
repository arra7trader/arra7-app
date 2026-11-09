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
    ARRA_CRONOS: {
        'lifetime': { durationLabel: 'Lifetime Sekali Bayar', price: 150000, priceDisplay: 'Rp 150.000', originalPrice: null, period: '/sekali bayar (+ ARRA GROK & Bonus Indikator TradingView)' },
    },
    WEBSITE_LIFETIME: {
        'lifetime': { durationLabel: 'Lifetime Website', price: 125000, priceDisplay: 'Rp 125.000', originalPrice: null, period: '/sekali bayar (tanpa ARRA Cronos & ARRA Grok)' },
    },
    ALL_ACCESS: {
        'lifetime': { durationLabel: 'Lifetime Full Access Website + Cronos & Grok', price: 229000, priceDisplay: 'Rp 229.000', originalPrice: null, period: '/sekali bayar' },
    },
};

function TransferContent() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const planId = searchParams.get('plan');
    const duration = searchParams.get('duration') || '1month';
    const [telegramUsername, setTelegramUsername] = useState('');
    const [guestName, setGuestName] = useState('');
    const [guestContact, setGuestContact] = useState('');
    const [savingTelegramProfile, setSavingTelegramProfile] = useState(false);
    const [telegramProfileMessage, setTelegramProfileMessage] = useState<string | null>(null);
    const [copiedAccount, setCopiedAccount] = useState(false);

    const handleCopyAccount = () => {
        navigator.clipboard.writeText('1392698188');
        setCopiedAccount(true);
        setTimeout(() => setCopiedAccount(false), 2500);
    };

    const plan = useMemo(() => {
        if (!planId || !PRICING_OPTIONS[planId] || !PRICING_OPTIONS[planId][duration]) return null;

        const details = PRICING_OPTIONS[planId][duration];
        const nameMap: Record<string, string> = {
            ARRA_CRONOS: 'ARRA Cronos AI Quant Engine + ARRA GROK Terminal + Bonus Indikator TradingView',
            ALL_ACCESS: 'Semua Produk Website ARRA 7 + ARRA Cronos & ARRA Grok (Lifetime)',
            WEBSITE_LIFETIME: 'PICA Website Lifetime (tanpa ARRA Cronos & ARRA Grok)',
        };

        return {
            id: planId,
            name: nameMap[planId] || planId,
            ...details
        };
    }, [planId, duration]);

    const normalizedTelegramUsername = telegramUsername.trim().replace(/^@+/, '');
    const requiresTelegramUsername = plan?.id === 'TELEBOT';
    const hasBuyerInfo = Boolean(session) || (guestName.trim().length > 0 && guestContact.trim().length > 0);
    const canConfirmPayment = (!requiresTelegramUsername || normalizedTelegramUsername.length > 0) && hasBuyerInfo;
    const buyerName = session?.user?.name || guestName.trim() || 'Pembeli';
    const buyerContact = session?.user?.email || guestContact.trim() || '-';

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
        'Halo Admin ARRA 7!',
        '',
        `Saya sudah melakukan pembayaran via Transfer Bank BCA untuk paket *${plan.name} (${plan.durationLabel})*:`,
        '',
        `Nama: ${buyerName}`,
        `Kontak / Email: ${buyerContact}`,
        `Paket: ${plan.name} (${plan.durationLabel})`,
        `Nominal: ${plan.priceDisplay}`,
        requiresTelegramUsername ? `Username Telegram: @${normalizedTelegramUsername}` : null,
        plan.id === 'ALL_ACCESS' ? '★ Lifetime full access website ARRA 7/PICA termasuk ARRA Cronos dan ARRA Grok.' : null,
        plan.id === 'ARRA_CRONOS' ? '🎯 Paket ARRA Cronos Lifetime + ARRA GROK auto scanner 5 pair + Bonus Indikator TradingView. Analisis saja; tanpa simulasi atau order broker.' : null,
        plan.id === 'WEBSITE_LIFETIME' ? '♾️ Paket PICA Website Lifetime Rp125.000. Aktivasi lisensi WEBSITE_LIFETIME (9999 hari). Hanya akses website; jangan aktifkan ARRA Cronos atau ARRA Grok.' : null,
        '',
        requiresTelegramUsername
            ? 'Mohon approve akses TELEBOT saya. Berikut bukti transfernya: (Lampirkan Bukti Transfer)'
            : 'Mohon diproses aktivasi lisensi/akun saya. Berikut bukti transfernya: (Lampirkan Bukti Transfer)',
    ]
        .filter(Boolean)
        .join('\n');

    const telegramLink = `https://t.me/arra7trader?text=${encodeURIComponent(telegramText)}`;

    async function handleConfirmPayment() {
        if (!canConfirmPayment || savingTelegramProfile) return;

        setTelegramProfileMessage(null);

        window.open(telegramLink, '_blank', 'noopener,noreferrer');

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
                        telegramUsername: normalizedTelegramUsername,
                        email: buyerContact,
                        name: buyerName,
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
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-black text-2xl">
                            BCA
                        </div>
                        <h1 className="text-2xl font-bold mb-2 text-[var(--text-primary)]">Pembayaran Transfer Bank BCA</h1>
                        <p className="text-[var(--text-secondary)]">
                            Upgrade ke paket <span className="text-[var(--text-primary)] font-semibold">{plan.name} ({plan.durationLabel})</span>
                        </p>
                    </div>

                    <div className="bg-[var(--bg-secondary)] rounded-xl p-4 mb-6 text-center">
                        <p className="text-sm text-[var(--text-muted)] mb-1">Total Pembayaran</p>
                        {plan.originalPrice && (
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <span className="text-lg text-[var(--text-muted)] line-through">{plan.originalPrice}</span>
                                <span className="px-2 py-0.5 rounded bg-gradient-to-r from-amber-500 to-rose-500 text-white text-xs font-bold">PROMO 2 HARI</span>
                            </div>
                        )}
                        <p className="text-3xl font-bold gradient-text">{plan.priceDisplay}</p>
                        <p className="text-sm text-[var(--text-muted)]">{plan.period}</p>
                    </div>

                    {/* All-Access Features Summary Badge */}
                    {plan.id === 'ALL_ACCESS' && (
                        <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-indigo-500/10 border border-amber-500/30 rounded-2xl p-4 mb-6 text-left">
                            <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-2 flex items-center gap-1.5">
                                <span>🎉</span> FULL ACCESS LIFETIME:
                            </p>
                            <ul className="text-xs text-[var(--text-secondary)] space-y-1.5">
                                <>
                                <li className="flex items-start gap-1.5">
                                    <span className="text-emerald-500 font-bold shrink-0">✓</span>
                                    <span><strong>PICA Neural Lab:</strong> Sinyal AI Bi-LSTM + Institutional SMC &amp; Order Flow SL/TP real-time</span>
                                </li>
                                <li className="flex items-start gap-1.5">
                                    <span className="text-emerald-500 font-bold shrink-0">✓</span>
                                    <span><strong>Kursus Fibo Kyoko:</strong> 3 Masterclass HD + File Indikator MT5 (.ex5) &amp; Pine Script v6</span>
                                </li>
                                <li className="flex items-start gap-1.5">
                                    <span className="text-emerald-500 font-bold shrink-0">✓</span>
                                    <span><strong>DOM ARRA &amp; Whale Radar:</strong> Order book depth &amp; deteksi akumulasi institusi</span>
                                </li>
                                <li className="flex items-start gap-1.5">
                                    <span className="text-emerald-500 font-bold shrink-0">✓</span>
                                    <span><strong>Analisis Market:</strong> Struktur Trend, Area Supply &amp; Demand, S/R Key Levels Harian</span>
                                </li>
                                <li className="flex items-start gap-1.5">
                                    <span className="text-emerald-500 font-bold shrink-0">✓</span>
                                    <span><strong>Semua Timeframe (M1-D1)</strong> &amp; Free Update Semua Fitur Selamanya</span>
                                </li>
                                <li className="flex items-start gap-1.5">
                                    <span className="text-emerald-500 font-bold shrink-0">✓</span>
                                    <span><strong>ARRA Cronos + ARRA Grok:</strong> forecast/setup teknikal dan auto scan 5 pair; analisis saja tanpa simulasi maupun order broker</span>
                                </li>
                                </>
                            </ul>
                        </div>
                    )}

                    {/* Bank BCA Details Card - QRIS is Hidden */}
                    <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white p-5 rounded-2xl mb-6 border border-blue-500/30 shadow-xl relative overflow-hidden">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center font-black text-blue-300 text-lg">
                                    BCA
                                </div>
                                <div className="text-left">
                                    <p className="font-extrabold text-white text-base leading-tight">Bank Central Asia (BCA)</p>
                                    <p className="text-[11px] text-blue-300">m-BCA / KlikBCA / ATM / Antar Bank</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                ● REKENING RESMI
                            </span>
                        </div>

                        <div className="mb-4 text-left">
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

                        <div className="text-left">
                            <p className="text-xs text-slate-300 mb-0.5 font-medium">Atas Nama Penerima:</p>
                            <p className="text-base sm:text-lg font-extrabold text-white tracking-wide">
                                Arland Pratama Muldiawan
                            </p>
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
                                <p className="text-xs text-amber-400 mt-2">
                                    {telegramProfileMessage} Telegram admin sudah dibuka, jadi Anda tetap bisa kirim bukti pembayaran secara manual.
                                </p>
                            )}
                        </div>
                    )}

                    {session ? (
                        <div className="bg-[var(--bg-secondary)] rounded-xl p-4 mb-6 text-left">
                            <p className="text-sm text-[var(--text-muted)] mb-2">Akun Anda</p>
                            <div className="flex items-center gap-3">
                                {session.user?.image && (
                                    <img src={session.user.image} alt="" className="w-10 h-10 rounded-full" />
                                )}
                                <div>
                                    <p className="font-semibold text-[var(--text-primary)]">{session.user?.name}</p>
                                    <p className="text-sm text-[var(--text-muted)]">{session.user?.email}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-[var(--bg-secondary)] rounded-xl p-4 mb-6 space-y-3 text-left">
                            <p className="text-sm font-bold text-[var(--text-primary)]">Data Pembeli (Tanpa Perlu Login)</p>
                            <div>
                                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                                    Nama Lengkap
                                </label>
                                <input
                                    value={guestName}
                                    onChange={(e) => setGuestName(e.target.value)}
                                    placeholder="Contoh: Budi Santoso"
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-xs text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                                    No. WhatsApp atau Email
                                </label>
                                <input
                                    value={guestContact}
                                    onChange={(e) => setGuestContact(e.target.value)}
                                    placeholder="Contoh: 08123456789 atau email@gmail.com"
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-xs text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                                    Admin akan mengirimkan konfirmasi aktivasi lisensi ke kontak ini.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 text-left">
                        <div className="flex gap-3">
                            <span className="text-xl">ℹ️</span>
                            <div className="text-sm">
                                <p className="font-semibold text-amber-400 mb-2">Instruksi Pembayaran Transfer Bank:</p>
                                <ol className="list-decimal list-inside space-y-1 text-[var(--text-secondary)] text-xs sm:text-sm">
                                    <li>Transfer ke rekening <strong>BCA 1392698188 (a.n. Arland Pratama Muldiawan)</strong>.</li>
                                    <li>Masukkan nominal sesuai total pembayaran: <strong className="text-[var(--text-primary)]">{plan.priceDisplay}</strong></li>
                                    <li>Simpan screenshot bukti transfer yang berhasil.</li>
                                    {requiresTelegramUsername && <li>Masukkan username Telegram Anda di form atas.</li>}
                                    {plan.id === 'ALL_ACCESS' && <li>Paket All-Access Lifetime mencakup akses website ARRA 7/PICA serta ARRA Cronos dan ARRA Grok.</li>}
                                    <li>Klik tombol konfirmasi di bawah untuk mengirim bukti transfer ke Telegram admin.</li>
                                    <li>Admin akan memverifikasi dan mengaktifkan akun serta lisensi Anda.</li>
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
                                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:shadow-lg hover:shadow-blue-500/25 cursor-pointer'
                                : 'bg-slate-600 cursor-not-allowed opacity-60'
                                }`}
                        >
                            <span className="flex items-center justify-center gap-2">
                                {savingTelegramProfile ? 'Menyimpan username...' : 'Konfirmasi & Kirim Bukti Transfer'}
                            </span>
                        </button>
                        {!hasBuyerInfo && (
                            <p className="text-center text-xs text-amber-500">
                                Lengkapi Nama dan No. WhatsApp/Email di atas untuk melanjutkan.
                            </p>
                        )}
                        {requiresTelegramUsername && !normalizedTelegramUsername && (
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
