'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession, signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { CheckIcon, XIcon, SparklesIcon, StarSolidIcon } from '@/components/PremiumIcons';

// Helper to construct exact IDR strings
const priceStr = (amount: number) => {
    return `Rp ${amount.toLocaleString('id-ID')}`;
};

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
    const t = useTranslations('nav');
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const [stats, setStats] = useState({ users: 100, predictions: 5000, accuracy: 95.8 });

    const [selectedDuration, setSelectedDuration] = useState<Record<string, string>>({
        PRO: '3months',
        VVIP: '3months',
    });

    const [promoSlots, setPromoSlots] = useState<Record<string, Record<string, { used: number; remaining: number; max: number }>> | null>(null);

    useEffect(() => {
        fetch('/api/public/stats')
            .then(res => res.json())
            .then(data => {
                if (data && data.users) {
                    setStats(data);
                }
            })
            .catch(err => console.error('Failed to fetch stats', err));

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
            window.location.href = '/analisa-market';
            return;
        }

        setIsProcessing(planId);
        const duration = selectedDuration[planId] || '1month';
        const durationOption = DURATION_OPTIONS[planId]?.find(d => d.duration === duration);
        const days = durationOption?.days || 30;

        window.location.href = `/payment/transfer?plan=${planId}&duration=${duration}&days=${days}`;
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
        <div className="min-h-screen bg-[#fafbfc] text-slate-900 pt-24 pb-20 font-sans selection:bg-blue-100">
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
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
                        Pilih Paket Trading <br className="hidden md:block" /> Sesuai <span className="text-blue-600">Gaya Anda</span>
                    </h1>
                    <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                        Mulai dari yang gratis hingga fitur tak terbatas untuk akun institusional. Tingkatkan Win Rate Anda dengan dukungan Neural Ensemble AI.
                    </p>
                </motion.div>
            </header>

            {/* Pricing Section */}
            <section className="px-4 max-w-7xl mx-auto mb-32">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-start">
                    {PRICING_PLANS.map((plan, index) => {
                        const pricing = getPlanPricing(plan.id);

                        // Theme utilities mapping
                        let cardStyle = 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xl';
                        let headerBg = 'bg-slate-50 border-b border-slate-200';
                        let ctaStyle = 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200';
                        let checkStyle = 'bg-emerald-100 text-emerald-700';

                        if (plan.theme === 'blue') {
                            cardStyle = 'bg-white border-blue-200 shadow-xl shadow-blue-900/5 ring-1 ring-blue-100 md:-translate-y-4';
                            headerBg = 'bg-blue-50/50 border-b border-blue-100';
                            ctaStyle = 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20';
                            checkStyle = 'bg-blue-100 text-blue-600';
                        } else if (plan.theme === 'amber') {
                            cardStyle = 'bg-white border-amber-200 hover:border-amber-300 hover:shadow-xl shadow-amber-900/5';
                            headerBg = 'bg-amber-50/50 border-b border-amber-100';
                            ctaStyle = 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20';
                            checkStyle = 'bg-amber-100 text-amber-700';
                        }

                        return (
                            <motion.div
                                key={plan.id}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.15, duration: 0.5 }}
                                className={`relative flex flex-col rounded-3xl border transition-all duration-300 ${cardStyle}`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-4 inset-x-0 flex justify-center">
                                        <div className="bg-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 uppercase tracking-wider">
                                            <StarSolidIcon size="xs" /> Paling Laris
                                        </div>
                                    </div>
                                )}

                                {/* Card Header */}
                                <div className={`p-8 md:p-10 rounded-t-3xl ${headerBg}`}>
                                    <div className="flex items-center gap-4 mb-3">
                                        <span className="text-4xl">{plan.icon}</span>
                                        <h3 className="text-2xl font-bold text-slate-900">{plan.name}</h3>
                                    </div>
                                    <p className="text-slate-600 text-sm leading-relaxed min-h-[40px]">
                                        {plan.description}
                                    </p>
                                </div>

                                {/* Card Body */}
                                <div className="p-8 md:p-10 flex-grow flex flex-col bg-white rounded-b-3xl">
                                    {(plan.id === 'PRO' || plan.id === 'VVIP') && DURATION_OPTIONS[plan.id] && (
                                        <div className="mb-8">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Pilih Durasi</label>
                                            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
                                                {DURATION_OPTIONS[plan.id].map((option) => {
                                                    const isSelected = selectedDuration[plan.id] === option.duration;
                                                    const slotInfo = promoSlots?.[plan.id]?.[option.duration];
                                                    const isSoldOut = !!(option.promoSlots && slotInfo && slotInfo.remaining <= 0);

                                                    return (
                                                        <button
                                                            key={option.duration}
                                                            onClick={() => setSelectedDuration({ ...selectedDuration, [plan.id]: option.duration })}
                                                            disabled={isSoldOut}
                                                            className={`
                                                                flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors
                                                                ${isSelected
                                                                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                                                                    : 'text-slate-500 hover:text-slate-700'
                                                                }
                                                                ${isSoldOut ? 'opacity-40 cursor-not-allowed' : ''}
                                                            `}
                                                        >
                                                            {option.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Pricing Display */}
                                    <div className="mb-8 pb-8 border-b border-slate-100">
                                        {pricing.badge && (
                                            <div className="mb-3">
                                                <span className={`
                                                    inline-block px-3 py-1 rounded-full text-xs font-bold
                                                    ${pricing.badge.includes('HABIS')
                                                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                    }
                                                `}>
                                                    {pricing.badge}
                                                </span>
                                            </div>
                                        )}

                                        {pricing.originalPrice && (
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="text-slate-400 line-through decoration-slate-300 font-medium">{pricing.originalPrice}</span>
                                                {pricing.savingsText && (
                                                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                                        {pricing.savingsText}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex items-baseline gap-2">
                                            <span className={`text-4xl lg:text-5xl font-extrabold tracking-tight ${plan.id === 'BASIC' ? 'text-slate-700' : 'text-slate-900'}`}>
                                                {pricing.price}
                                            </span>
                                            {pricing.period && (
                                                <span className="text-slate-500 font-medium">{pricing.period}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Features List */}
                                    <div className="flex-grow">
                                        <ul className="space-y-4 mb-8">
                                            {plan.features.map((feature, i) => (
                                                <li key={i} className="flex items-start gap-3">
                                                    {feature.included ? (
                                                        <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${checkStyle}`}>
                                                            <CheckIcon size="xs" />
                                                        </span>
                                                    ) : (
                                                        <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 bg-slate-100 text-slate-400">
                                                            <XIcon size="xs" />
                                                        </span>
                                                    )}
                                                    <span className={`
                                                        text-sm leading-relaxed
                                                        ${feature.highlight ? 'font-semibold text-slate-900' : feature.included ? 'text-slate-700' : 'text-slate-400'}
                                                    `}>
                                                        {feature.text}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Button CTA */}
                                    <button
                                        onClick={() => handleSubscribe(plan.id)}
                                        disabled={isProcessing === plan.id}
                                        className={`
                                            w-full py-3.5 rounded-xl font-bold text-lg transition-transform active:scale-[0.98] flex items-center justify-center gap-2
                                            ${ctaStyle}
                                            ${isProcessing === plan.id ? 'opacity-70 cursor-wait' : ''}
                                        `}
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
                </div>

                <p className="text-center text-slate-500 text-sm mt-8">
                    * Pembayaran menggunakan QRIS otomatis. Mendukung semua e-wallet dan mobile banking.
                </p>
            </section>

            {/* Bottom Section */}
            <section className="px-4 text-center max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Masih Butuh Waktu?</h2>
                <p className="text-slate-600 mb-8">
                    Anda selalu dapat mencoba akun Basic secara gratis untuk melakukan analisis harian XAUUSD.
                </p>
                <Link href={session ? '/analisa-market' : '/login?callbackUrl=/analisa-market'}>
                    <button className="px-8 py-3 rounded-full border-2 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 font-bold transition-all">
                        Lanjut dengan Akun Gratis
                    </button>
                </Link>
            </section>
        </div>
    );
}
