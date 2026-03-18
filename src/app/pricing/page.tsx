'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession, signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckIcon, XIcon, SparklesIcon, StarSolidIcon } from '@/components/PremiumIcons';

const DURATION_OPTIONS: Record<string, Array<{ duration: string; days: number; label: string; price: string; originalPrice?: string; savingsText?: string; promoSlots?: number }>> = {
    PRO: [
        { duration: '1month', days: 30, label: '1 Bulan', price: 'Rp 99.000', originalPrice: 'Rp 149.000' },
        { duration: '3months', days: 90, label: '3 Bulan', price: 'Rp 290.000', originalPrice: 'Rp 447.000', savingsText: 'Hemat Rp 157Rb', promoSlots: 15 },
        { duration: '6months', days: 180, label: '6 Bulan', price: 'Rp 590.000', originalPrice: 'Rp 894.000', savingsText: 'Hemat Rp 304Rb', promoSlots: 15 },
        { duration: '1year', days: 365, label: '1 Tahun', price: 'Rp 1.000.000', originalPrice: 'Rp 1.788.000', savingsText: 'Hemat Rp 788Rb', promoSlots: 15 },
    ],
    VVIP: [
        { duration: '1month', days: 30, label: '1 Bulan', price: 'Rp 249.000', originalPrice: 'Rp 399.000' },
        { duration: '3months', days: 90, label: '3 Bulan', price: 'Rp 740.000', originalPrice: 'Rp 1.197.000', savingsText: 'Hemat Rp 457Rb', promoSlots: 15 },
        { duration: '6months', days: 180, label: '6 Bulan', price: 'Rp 1.490.000', originalPrice: 'Rp 2.394.000', savingsText: 'Hemat Rp 904Rb', promoSlots: 15 },
        { duration: '1year', days: 365, label: '1 Tahun', price: 'Rp 2.800.000', originalPrice: 'Rp 4.788.000', savingsText: 'Hemat Rp 1.98M', promoSlots: 15 },
    ],
};

const PRICING_PLANS = [
    {
        id: 'BASIC',
        name: 'Basic',
        description: 'Untuk trader pemula yang ingin mencoba platform ARRA7.',
        icon: '🆓',
        theme: 'slate',
        features: [
            { text: '1x Analisa per Hari', included: true, highlight: true },
            { text: 'Hanya Pair XAUUSD', included: true, highlight: true },
            { text: 'Timeframe M5 dan M15', included: true, highlight: false },
            { text: 'Akses Gold Only', included: true, highlight: false },
            { text: '🔥 Bookmap ARRA7 - Trial Terbatas', included: true, highlight: false },
            { text: 'Analisa Saham IDX', included: false, highlight: false },
            { text: 'Semua Timeframe (M1 - D1)', included: false, highlight: false },
            { text: 'AI Neural Ensemble', included: false, highlight: false },
        ],
        cta: 'Mulai Gratis',
        popular: false,
    },
    {
        id: 'PRO',
        name: 'Pro',
        description: 'Untuk trader aktif yang serius meningkatkan profit harian.',
        icon: '⚡',
        theme: 'blue',
        features: [
            { text: '25x Analisa Forex per hari', included: true, highlight: false },
            { text: '25x Analisa Saham IDX per hari', included: true, highlight: false },
            { text: 'Semua Timeframe (M1 - D1)', included: true, highlight: false },
            { text: 'Akses Semua Pairs + Crypto', included: true, highlight: false },
            { text: '🔥 Bookmap ARRA7 - UNLIMITED', included: true, highlight: true },
            { text: 'AI Neural Ensemble (90%+ Accuracy)', included: true, highlight: true },
            { text: 'Fibonacci Kanji Geometry', included: true, highlight: false },
            { text: 'AI Trade Doctor (Journal Review)', included: true, highlight: false },
        ],
        cta: 'Upgrade ke Pro',
        popular: true,
    },
    {
        id: 'VVIP',
        name: 'VVIP',
        description: 'Untuk trader profesional & institusi tanpa batas analisa.',
        icon: '👑',
        theme: 'amber',
        features: [
            { text: 'UNLIMITED Analisa Forex', included: true, highlight: false },
            { text: 'UNLIMITED Analisa Saham IDX', included: true, highlight: false },
            { text: 'Semua Timeframe (M1 - D1)', included: true, highlight: false },
            { text: 'Akses Semua Pairs + Crypto + Indices', included: true, highlight: false },
            { text: '🔥 Bookmap ARRA7 - UNLIMITED', included: true, highlight: true },
            { text: 'AI Neural Ensemble (90%+ Accuracy)', included: true, highlight: true },
            { text: 'Fibonacci Kanji Geometry', included: true, highlight: false },
            { text: 'AI Trade Doctor (Journal Review)', included: true, highlight: false },
        ],
        cta: 'Daftar VVIP',
        popular: false,
    },
];

export default function PricingPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    const [selectedDuration, setSelectedDuration] = useState<Record<string, string>>({
        PRO: '3months',
        VVIP: '3months',
    });

    const [promoSlots, setPromoSlots] = useState<Record<string, Record<string, { used: number; remaining: number; max: number }>> | null>(null);

    useEffect(() => {
        fetch('/api/pricing/slots')
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    setPromoSlots(data.slots);
                }
            })
            .catch(err => console.error('Failed to fetch promo slots', err));
    }, []);

    const handleSubscribe = async (planId: string) => {
        if (!session) {
            signIn('google', { callbackUrl: `/pricing?plan=${planId}` });
            return;
        }

        if (planId === 'BASIC') {
            router.push('/analisa-market');
            return;
        }

        setIsProcessing(planId);
        const duration = selectedDuration[planId] || '1month';
        const durationOption = DURATION_OPTIONS[planId]?.find(d => d.duration === duration);
        const days = durationOption?.days || 30;

        router.push(`/payment/transfer?plan=${planId}&duration=${duration}&days=${days}`);
    };

    const getPlanPricing = (planId: string) => {
        if (planId === 'BASIC') {
            return { price: 'Gratis', originalPrice: null, period: '', badge: null };
        }

        const duration = selectedDuration[planId] || '1month';
        const option = DURATION_OPTIONS[planId]?.find(d => d.duration === duration);

        if (!option) {
            return { price: 'Rp 99.000', originalPrice: 'Rp 149.000', period: '/ bulan', badge: null };
        }

        let badge = null;
        if (option.promoSlots && promoSlots) {
            const slotInfo = promoSlots[planId]?.[duration];
            if (slotInfo) {
                if (slotInfo.remaining > 0) {
                    badge = `Tersisa ${slotInfo.remaining} Slot Promo`;
                } else {
                    badge = 'SLOT HABIS';
                }
            }
        }

        return {
            price: option.price,
            originalPrice: option.originalPrice,
            period: option.duration === '1month' ? '/ bulan' : '',
            badge,
            savingsText: option.savingsText,
        };
    };

    return (
        <div className="min-h-screen bg-[#fafbfc] text-[var(--text-primary)] pt-36 pb-20 font-sans selection:bg-blue-100">
            {/* Header / Hero */}
            <header className="text-center px-4 max-w-4xl mx-auto mb-16 md:mb-24">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 font-semibold text-sm mb-6 border border-blue-200">
                        <SparklesIcon size="sm" className="text-blue-500" />
                        Diskon Spesial Terbatas
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-[var(--text-primary)] mb-6 leading-tight">
                        Pilih Paket Trading <br className="hidden md:block" /> Sesuai <span className="text-blue-600">Gaya Anda</span>
                    </h1>
                    <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
                        Mulai dari yang gratis hingga fitur tak terbatas untuk akun institusional. Tingkatkan Win Rate Anda dengan dukungan Neural Ensemble AI.
                    </p>
                </motion.div>
            </header>

            {/* Pricing Section */}
            <section className="px-4 max-w-5xl mx-auto mb-32 flex flex-col gap-12">
                {PRICING_PLANS.map((plan, index) => {
                    const pricing = getPlanPricing(plan.id);
                    const isReversed = index % 2 !== 0; // Reverse middle card

                    // Theme styles
                    let leftBg = 'bg-[var(--bg-secondary)]/50';
                    let titleColor = 'text-[var(--text-primary)]';
                    let ctaStyle = 'bg-slate-800 hover:bg-slate-900 text-white';
                    let checkStyle = 'bg-slate-200 text-[var(--text-secondary)]';

                    if (plan.theme === 'blue') {
                        leftBg = 'bg-blue-50/50';
                        titleColor = 'text-blue-700';
                        ctaStyle = 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20';
                        checkStyle = 'bg-blue-100 text-blue-600';
                    } else if (plan.theme === 'amber') {
                        leftBg = 'bg-amber-50/50';
                        titleColor = 'text-amber-600';
                        ctaStyle = 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20';
                        checkStyle = 'bg-amber-100 text-amber-600';
                    }

                    return (
                        <motion.div
                            key={plan.id}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.15, duration: 0.5 }}
                            className={`bg-[var(--bg-primary)] rounded-[2.5rem] border ${plan.id === 'PRO' ? 'border-blue-200 ring-2 ring-blue-100 shadow-2xl shadow-blue-900/10' : 'border-[var(--border-light)] shadow-xl'} overflow-hidden flex flex-col md:flex-row items-stretch ${isReversed ? 'md:flex-row-reverse' : ''}`}
                        >
                            {/* Left Pane (Details & Features) */}
                            <div className={`w-full md:w-3/5 p-8 md:p-14 ${leftBg} h-full flex flex-col justify-center border-b md:border-b-0 ${isReversed ? 'md:border-l' : 'md:border-r'} border-[var(--border-light)]`}>
                                <div className="flex flex-wrap items-center gap-4 mb-4">
                                    <span className="text-4xl">{plan.icon}</span>
                                    <h2 className={`text-3xl md:text-4xl font-extrabold ${titleColor}`}>
                                        {plan.name}
                                    </h2>
                                    {plan.popular && (
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-bold uppercase tracking-wider ml-auto md:ml-4">
                                            <StarSolidIcon size="xs" /> Paling Laris
                                        </div>
                                    )}
                                </div>

                                <p className="text-[var(--text-secondary)] leading-relaxed mb-8 max-w-lg">
                                    {plan.description}
                                </p>

                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className={`flex items-start gap-3 text-sm leading-snug ${feature.included ? 'text-[var(--text-secondary)]' : 'text-slate-400 opacity-60'}`}>
                                            {feature.included ? (
                                                <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${checkStyle}`}>
                                                    <CheckIcon size="xs" />
                                                </span>
                                            ) : (
                                                <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-[var(--bg-secondary)]">
                                                    <XIcon size="xs" />
                                                </span>
                                            )}
                                            <span className={`mt-0.5 ${feature.highlight ? 'font-semibold text-[var(--text-primary)]' : ''}`}>
                                                {feature.text}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Right Pane (Pricing & CTA) */}
                            <div className="w-full md:w-2/5 p-8 md:p-14 text-center bg-[var(--bg-primary)] flex flex-col justify-center items-center">
                                {(plan.id === 'PRO' || plan.id === 'VVIP') && DURATION_OPTIONS[plan.id] && (
                                    <div className="mb-8 w-full">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Pilih Durasi</label>
                                        <div className="flex bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-light)]/50">
                                            {DURATION_OPTIONS[plan.id].map((option) => {
                                                const isSelected = selectedDuration[plan.id] === option.duration;
                                                const slotInfo = promoSlots?.[plan.id]?.[option.duration];
                                                const isSoldOut = !!(option.promoSlots && slotInfo && slotInfo.remaining <= 0);

                                                return (
                                                    <button
                                                        key={option.duration}
                                                        onClick={() => setSelectedDuration({ ...selectedDuration, [plan.id]: option.duration })}
                                                        disabled={isSoldOut}
                                                        className={`flex-1 py-1.5 px-1 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors ${isSelected ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm border border-[var(--border-light)]/50' : 'text-[var(--text-secondary)] hover:text-[var(--text-secondary)]'} ${isSoldOut ? 'opacity-40 cursor-not-allowed' : ''}`}
                                                    >
                                                        {option.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-col items-center justify-center mb-8">
                                    {pricing.badge && (
                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-3 ${pricing.badge.includes('HABIS') ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>
                                            {pricing.badge}
                                        </span>
                                    )}

                                    {pricing.originalPrice && (
                                        <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
                                            <span className="text-slate-400 line-through decoration-slate-300 font-medium">{pricing.originalPrice}</span>
                                            {pricing.savingsText && (
                                                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                                    {pricing.savingsText}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex items-baseline justify-center gap-1">
                                        <span className={`text-4xl xl:text-5xl font-black tracking-tight ${plan.id === 'BASIC' ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>{pricing.price}</span>
                                        {pricing.period && (
                                            <span className="text-[var(--text-secondary)] font-medium whitespace-nowrap">{pricing.period}</span>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleSubscribe(plan.id)}
                                    disabled={isProcessing === plan.id}
                                    className={`w-full py-4 rounded-xl font-bold text-lg transition-transform active:scale-95 flex items-center justify-center gap-2 ${ctaStyle} ${isProcessing === plan.id ? 'opacity-70 cursor-wait' : ''}`}
                                >
                                    {isProcessing === plan.id ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                                            Memproses...
                                        </>
                                    ) : (
                                        <>
                                            {plan.cta}
                                            <span className="ml-1 text-xl">→</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    );
                })}

                <p className="text-center text-[var(--text-secondary)] text-sm mt-4">
                    * Pembayaran menggunakan QRIS via qris.id. Mendukung semua e-wallet dan mobile banking yang support QRIS.
                </p>
            </section>

            {/* Bottom Section */}
            <section className="px-4 text-center max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Masih Butuh Waktu?</h2>
                <p className="text-[var(--text-secondary)] mb-8">
                    Anda selalu dapat mencoba akun Basic secara gratis untuk melakukan analisis harian XAUUSD.
                </p>
                <Link href={session ? '/analisa-market' : '/login?callbackUrl=/analisa-market'}>
                    <button className="px-8 py-3 rounded-full border-2 border-[var(--border-light)] text-[var(--text-secondary)] hover:border-[var(--border-medium)] hover:bg-[var(--bg-secondary)] font-bold transition-all">
                        Lanjut dengan Akun Gratis
                    </button>
                </Link>
            </section>
        </div>
    );
}
