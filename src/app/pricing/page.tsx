'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession, signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { CheckIcon, XIcon, ChevronDownIcon, ArrowRightIcon, SparklesIcon, FireIcon, StarSolidIcon, CpuChipIcon } from '@/components/PremiumIcons';

// Duration options for PRO and VVIP
const DURATION_OPTIONS: Record<string, Array<{ duration: string; days: number; label: string; price: string; originalPrice?: string; savingsText?: string; promoSlots?: number }>> = {
    PRO: [
        { duration: '1month', days: 30, label: '1 Bulan', price: 'Rp 99K', originalPrice: 'Rp 149K' },
        { duration: '3months', days: 90, label: '3 Bulan', price: 'Rp 290K', originalPrice: 'Rp 447K', savingsText: 'Hemat Rp 157K', promoSlots: 15 },
        { duration: '6months', days: 180, label: '6 Bulan', price: 'Rp 590K', originalPrice: 'Rp 894K', savingsText: 'Hemat Rp 304K', promoSlots: 15 },
        { duration: '1year', days: 365, label: '1 Tahun', price: 'Rp 1,000K', originalPrice: 'Rp 1,788K', savingsText: 'Hemat Rp 788K', promoSlots: 15 },
    ],
    VVIP: [
        { duration: '1month', days: 30, label: '1 Bulan', price: 'Rp 249K', originalPrice: 'Rp 399K' },
        { duration: '3months', days: 90, label: '3 Bulan', price: 'Rp 740K', originalPrice: 'Rp 1,197K', savingsText: 'Hemat Rp 457K', promoSlots: 15 },
        { duration: '6months', days: 180, label: '6 Bulan', price: 'Rp 1,490K', originalPrice: 'Rp 2,394K', savingsText: 'Hemat Rp 904K', promoSlots: 15 },
        { duration: '1year', days: 365, label: '1 Tahun', price: 'Rp 2,800K', originalPrice: 'Rp 4,788K', savingsText: 'Hemat Rp 1,988K', promoSlots: 15 },
    ],
};

const PRICING_PLANS = [
    {
        id: 'BASIC',
        name: 'Basic',
        description: 'Untuk trader pemula yang ingin mencoba platform',
        icon: '🆓',
        gradient: 'from-slate-500 to-gray-600',
        bgGradient: 'from-slate-50 to-gray-100',
        features: [
            { text: '1x Analisa per Hari', included: true, highlight: true },
            { text: 'Hanya Pair XAUUSD', included: true, highlight: true },
            { text: 'Timeframe M5 dan M15', included: true, highlight: false },
            { text: 'Akses Gold Only', included: true, highlight: false },
            { text: '🔥 Bookmap ARRA7 - Trial Terbatas', included: true, highlight: false },
        ],
        cta: 'Mulai Gratis',
        popular: false,
    },
    {
        id: 'PRO',
        name: 'Pro',
        description: 'Untuk trader aktif yang serius profit',
        icon: '⚡',
        gradient: 'from-blue-600 to-cyan-500',
        bgGradient: 'from-blue-600 to-indigo-700',
        features: [
            { text: '25x Analisa Forex per hari', included: true, highlight: false },
            { text: '25x Analisa Saham IDX per hari', included: true, highlight: false },
            { text: 'Semua Timeframe (M1 - D1)', included: true, highlight: false },
            { text: 'Akses Semua Pairs + Crypto', included: true, highlight: false },
            { text: '🔥 Bookmap ARRA7 - UNLIMITED', included: true, highlight: true },
            { text: 'AI Neural Ensemble (90%+ Accuracy)', included: true, highlight: true },
            { text: 'Fibonacci Kanji Geometry', included: true, highlight: false },
            { text: 'AI Trade Doctor (Journal Review)', included: true, highlight: false },
            { text: 'Real-time News Sentiment', included: true, highlight: false },
        ],
        cta: 'Upgrade ke Pro',
        popular: true,
    },
    {
        id: 'VVIP',
        name: 'VVIP',
        description: 'Untuk trader profesional & institusi',
        icon: '👑',
        gradient: 'from-amber-500 to-orange-600',
        bgGradient: 'from-amber-500 to-orange-600',
        features: [
            { text: 'UNLIMITED Analisa Forex', included: true, highlight: false },
            { text: 'UNLIMITED Analisa Saham IDX', included: true, highlight: false },
            { text: 'Semua Timeframe (M1 - D1)', included: true, highlight: false },
            { text: 'Akses Semua Pairs + Crypto + Indices', included: true, highlight: false },
            { text: '🔥 Bookmap ARRA7 - UNLIMITED', included: true, highlight: true },
            { text: 'AI Neural Ensemble (90%+ Accuracy)', included: true, highlight: true },
            { text: 'Fibonacci Kanji Geometry', included: true, highlight: false },
            { text: 'AI Trade Doctor (Journal Review)', included: true, highlight: false },
            { text: 'Real-time News Sentiment', included: true, highlight: false },
        ],
        cta: 'Jadi VVIP',
        popular: false,
    },
];

export default function PricingPage() {
    const { data: session } = useSession();
    const t = useTranslations('nav');
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const [stats, setStats] = useState({ users: 100, predictions: 5000, accuracy: 95.8 });

    // Duration selector state
    const [selectedDuration, setSelectedDuration] = useState<Record<string, string>>({
        PRO: '3months',
        VVIP: '3months',
    });

    // Promo slots state
    const [promoSlots, setPromoSlots] = useState<Record<string, Record<string, { used: number; remaining: number; max: number }>> | null>(null);

    useEffect(() => {
        // Fetch real stats
        fetch('/api/public/stats')
            .then(res => res.json())
            .then(data => {
                if (data && data.users) {
                    setStats(data);
                }
            })
            .catch(err => console.error('Failed to fetch stats', err));

        // Fetch promo slots
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

        // Get selected duration for this plan
        const duration = selectedDuration[planId] || '1month';
        const durationOption = DURATION_OPTIONS[planId]?.find(d => d.duration === duration);
        const days = durationOption?.days || 30;

        window.location.href = `/payment/transfer?plan=${planId}&duration=${duration}&days=${days}`;
    };

    // Get current pricing info for a plan based on selected duration
    const getPlanPricing = (planId: string) => {
        if (planId === 'BASIC') {
            return { price: 'FREE', originalPrice: null, period: '', badge: null };
        }

        const duration = selectedDuration[planId] || '1month';
        const option = DURATION_OPTIONS[planId]?.find(d => d.duration === duration);

        if (!option) {
            return { price: 'Rp 99K', originalPrice: 'Rp 149K', period: '/bulan', badge: null };
        }

        let badge = null;
        if (option.promoSlots && promoSlots) {
            const slotInfo = promoSlots[planId]?.[duration];
            if (slotInfo) {
                if (slotInfo.remaining > 0) {
                    badge = `Promo: Sisa ${slotInfo.remaining}/${slotInfo.max} Slot`;
                } else {
                    badge = 'SOLD OUT';
                }
            }
        }

        return {
            price: option.price,
            originalPrice: option.originalPrice,
            period: option.duration === '1month' ? '/bulan' : '',
            badge,
            savingsText: option.savingsText,
        };
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-[var(--bg-primary)] via-[var(--bg-primary)] to-slate-100 pt-20">
            {/* Header with Enhanced Design */}
            <section className="section-padding text-center relative overflow-hidden">
                {/* Background Decorations */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-20 left-1/4 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl" />
                    <div className="absolute top-40 right-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl" />
                    <div className="absolute -bottom-20 left-1/2 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl" />
                </div>

                <div className="container-apple relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-blue-100 border border-purple-200 text-purple-700 text-sm font-medium mb-6">
                            <SparklesIcon size="sm" />
                            Promo Spesial - Diskon Hingga 60% (Terbatas 30 Orang)
                        </span>
                        <h1 className="headline-lg mb-4">
                            Investasi Trading dengan{' '}
                            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-amber-600 bg-clip-text text-transparent">
                                AI Terbaik
                            </span>
                        </h1>
                        <p className="body-lg max-w-2xl mx-auto text-[var(--text-secondary)]">
                            Platform trading dengan teknologi AI Neural Ensemble yang terverifikasi 90%+ akurasi.
                            Bergabung dengan {stats.users}+ trader Indonesia yang sudah profit!
                        </p>

                        {/* Trust Badges */}
                        <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
                            {['✓ Enkripsi Bank Level', '✓ Support 24/7'].map((badge, i) => (
                                <span key={i} className="px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-sm">
                                    {badge}
                                </span>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Premium Pricing Cards */}
            <section className="section-padding pt-8">
                <div className="container-wide">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-start">
                        {PRICING_PLANS.map((plan, index) => (
                            <motion.div
                                key={plan.id}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 + index * 0.1 }}
                                className={`
                                    relative rounded-3xl overflow-hidden
                                    ${plan.popular
                                        ? 'ring-4 ring-blue-500/30 shadow-2xl shadow-blue-500/20 scale-105 z-10'
                                        : 'shadow-xl'
                                    }
                                `}
                            >
                                {/* Card Background */}
                                <div className={`
                                    absolute inset-0
                                    ${plan.popular
                                        ? `bg-gradient-to-br ${plan.bgGradient}`
                                        : plan.id === 'VVIP'
                                            ? `bg-gradient-to-br ${plan.bgGradient}`
                                            : 'bg-white'
                                    }
                                `} />

                                {/* Popular Badge */}
                                {plan.popular && (
                                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-amber-400 to-orange-500 py-2 text-center">
                                        <span className="text-white text-sm font-bold flex items-center justify-center gap-1">
                                            <StarSolidIcon size="sm" />
                                            PALING POPULER - BEST VALUE
                                            <StarSolidIcon size="sm" />
                                        </span>
                                    </div>
                                )}

                                {/* VVIP Badge */}
                                {plan.id === 'VVIP' && (
                                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 py-2 text-center">
                                        <span className="text-white text-sm font-bold flex items-center justify-center gap-1">
                                            👑 PREMIUM EXCLUSIVE 👑
                                        </span>
                                    </div>
                                )}

                                {/* Card Content */}
                                <div className={`
                                    relative p-8 
                                    ${plan.popular || plan.id === 'VVIP' ? 'pt-14 text-white' : 'text-[var(--text-primary)]'}
                                `}>
                                    {/* Plan Header */}
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="text-4xl">{plan.icon}</span>
                                        <div>
                                            <h3 className="text-2xl font-bold">{plan.name}</h3>
                                            <p className={`text-sm ${plan.popular || plan.id === 'VVIP' ? 'text-white/80' : 'text-[var(--text-secondary)]'}`}>
                                                {plan.description}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Duration Selector - Only for PRO and VVIP */}
                                    {(plan.id === 'PRO' || plan.id === 'VVIP') && DURATION_OPTIONS[plan.id] && (
                                        <div className="mb-4">
                                            <div className="flex gap-2 flex-wrap">
                                                {DURATION_OPTIONS[plan.id].map((option) => {
                                                    const isSelected = selectedDuration[plan.id] === option.duration;
                                                    const slotInfo = promoSlots?.[plan.id]?.[option.duration];
                                                    // Ensure boolean type
                                                    const isSoldOut = !!(option.promoSlots && slotInfo && slotInfo.remaining <= 0);

                                                    return (
                                                        <button
                                                            key={option.duration}
                                                            onClick={() => setSelectedDuration({ ...selectedDuration, [plan.id]: option.duration })}
                                                            disabled={isSoldOut}
                                                            className={`
                                                                px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                                                                ${isSelected
                                                                    ? plan.popular || plan.id === 'VVIP'
                                                                        ? 'bg-white text-blue-600 ring-2 ring-white/50'
                                                                        : 'bg-blue-600 text-white ring-2 ring-blue-200'
                                                                    : plan.popular || plan.id === 'VVIP'
                                                                        ? 'bg-white/20 text-white hover:bg-white/30'
                                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                                }
                                                                ${isSoldOut ? 'opacity-50 cursor-not-allowed' : ''}
                                                            `}
                                                        >
                                                            {option.label}
                                                            {isSoldOut && ' 🔴'}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Price Display */}
                                    {(() => {
                                        const pricing = getPlanPricing(plan.id);
                                        return (
                                            <div className="mb-6 pb-6 border-b border-white/20">
                                                {/* Promo Badge */}
                                                {pricing.badge && (
                                                    <div className="mb-2">
                                                        <span className={`
                                                            inline-block px-3 py-1 rounded-full text-xs font-bold
                                                            ${pricing.badge.includes('SOLD OUT')
                                                                ? 'bg-red-500 text-white'
                                                                : 'bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-lg shadow-green-500/30'
                                                            }
                                                        `}>
                                                            {pricing.badge}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Original Price + Savings */}
                                                {pricing.originalPrice && (
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`text-lg line-through ${plan.popular || plan.id === 'VVIP' ? 'text-white/50' : 'text-[var(--text-muted)]'}`}>
                                                            {pricing.originalPrice}
                                                        </span>
                                                        {pricing.savingsText && (
                                                            <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold">
                                                                {pricing.savingsText}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Current Price */}
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-5xl font-black">{pricing.price}</span>
                                                    <span className={plan.popular || plan.id === 'VVIP' ? 'text-white/70' : 'text-[var(--text-secondary)]'}>
                                                        {pricing.period}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Features */}
                                    <ul className="space-y-3 mb-8">
                                        {plan.features.map((feature, i) => (
                                            <li key={i} className="flex items-start gap-3">
                                                {feature.included ? (
                                                    <span className={`
                                                        flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5
                                                        ${feature.highlight
                                                            ? 'bg-gradient-to-r from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30'
                                                            : plan.popular || plan.id === 'VVIP'
                                                                ? 'bg-white/20'
                                                                : 'bg-green-100'
                                                        }
                                                    `}>
                                                        <CheckIcon className={feature.highlight ? 'text-white' : plan.popular || plan.id === 'VVIP' ? 'text-white' : 'text-green-600'} size="xs" />
                                                    </span>
                                                ) : (
                                                    <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${plan.popular || plan.id === 'VVIP' ? 'bg-white/10' : 'bg-gray-100'}`}>
                                                        <XIcon className={plan.popular || plan.id === 'VVIP' ? 'text-white/40' : 'text-gray-400'} size="xs" />
                                                    </span>
                                                )}
                                                <span className={`
                                                    text-sm leading-relaxed
                                                    ${feature.highlight ? 'font-semibold' : ''}
                                                    ${!feature.included ? (plan.popular || plan.id === 'VVIP' ? 'text-white/40' : 'text-[var(--text-muted)]') : ''}
                                                `}>
                                                    {feature.text}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>

                                    {/* CTA Button */}
                                    <motion.button
                                        whileHover={{ scale: 1.03, y: -2 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleSubscribe(plan.id)}
                                        disabled={isProcessing === plan.id}
                                        className={`
                                            w-full py-4 rounded-2xl font-bold text-lg transition-all shadow-lg
                                            ${plan.popular
                                                ? 'bg-white text-blue-600 hover:bg-gray-50 shadow-white/30'
                                                : plan.id === 'VVIP'
                                                    ? 'bg-white text-amber-600 hover:bg-gray-50 shadow-white/30'
                                                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/30'
                                            }
                                            ${isProcessing === plan.id ? 'opacity-50 cursor-not-allowed' : ''}
                                        `}
                                    >
                                        {isProcessing === plan.id ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                                                Memproses...
                                            </span>
                                        ) : (
                                            <span className="flex items-center justify-center gap-2">
                                                {plan.cta}
                                                <ArrowRightIcon size="sm" />
                                            </span>
                                        )}
                                    </motion.button>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Comparison Note */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="text-center mt-12"
                    >
                        <p className="text-[var(--text-muted)] text-sm">
                            * Semua paket termasuk akses ke Economic Calendar dan Support via Telegram
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* AI Technology Section */}
            <section className="section-padding">
                <div className="container-apple">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 rounded-3xl p-8 md:p-12 text-white text-center relative overflow-hidden"
                    >
                        {/* Decorative Elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl" />

                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm mb-6">
                                <CpuChipIcon size="sm" />
                                <span className="text-sm font-medium">Powered by Neural Ensemble AI</span>
                            </div>
                            <h2 className="text-3xl md:text-4xl font-bold mb-4">
                                Teknologi AI dengan Akurasi 90%+
                            </h2>
                            <p className="text-white/80 max-w-2xl mx-auto mb-8">
                                Model LSTM + GRU + Transformer kami dilatih dengan data market 5 tahun.
                                Verifikasi akurasi secara real-time dengan Accuracy Tracker di dashboard.
                            </p>
                            <div className="flex flex-wrap items-center justify-center gap-4">
                                {['LSTM Neural Network', 'GRU Predictor', 'Transformer Attention', 'Ensemble Voting'].map((tech, i) => (
                                    <span key={i} className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-sm">
                                        {tech}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="section-padding bg-[var(--bg-secondary)]">
                <div className="container-apple">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-12"
                    >
                        <h2 className="headline-md mb-4">Pertanyaan Umum</h2>
                        <p className="body-md">Temukan jawaban atas pertanyaan yang sering diajukan</p>
                    </motion.div>

                    <div className="space-y-4 max-w-2xl mx-auto">
                        {[
                            {
                                question: 'Metode pembayaran apa yang tersedia?',
                                answer: 'Kami menggunakan metode pembayaran QRIS yang dapat di-scan melalui semua aplikasi e-wallet (GoPay, OVO, Dana, ShopeePay) dan mobile banking.',
                            },
                            {
                                question: 'Apa itu Bookmap ARRA7?',
                                answer: 'Bookmap ARRA7 adalah fitur order flow visualization yang menampilkan pergerakan whale (order institusi besar) secara real-time. Data yang sama dengan yang digunakan hedge fund profesional.',
                            },
                            {
                                question: 'Bagaimana cara kerja AI Neural Ensemble?',
                                answer: 'AI kami menggunakan 3 model deep learning (LSTM, GRU, Transformer) yang voting secara ensemble untuk menghasilkan prediksi dengan akurasi 90%+. Akurasi dapat dilacak secara live di dashboard.',
                            },
                            {
                                question: 'Bisakah upgrade atau downgrade paket?',
                                answer: 'Ya! Anda bisa upgrade kapan saja. Sisa waktu paket lama akan di-prorate ke paket baru.',
                            },
                        ].map((faq, index) => (
                            <motion.details
                                key={index}
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className="group bg-white rounded-2xl border border-[var(--border-light)] overflow-hidden shadow-sm"
                            >
                                <summary className="flex items-center justify-between p-5 cursor-pointer list-none hover:bg-[var(--bg-secondary)] transition-colors">
                                    <span className="font-semibold">{faq.question}</span>
                                    <span className="ml-4 flex-shrink-0 w-8 h-8 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center group-open:rotate-180 transition-transform duration-300">
                                        <ChevronDownIcon className="text-[var(--text-secondary)]" size="sm" />
                                    </span>
                                </summary>
                                <div className="px-5 pb-5 pt-0">
                                    <p className="text-[var(--text-secondary)] leading-relaxed">{faq.answer}</p>
                                </div>
                            </motion.details>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== COPY TRADE SECTION ===== */}
            <section id="copytrade" className="section-padding bg-gradient-to-b from-teal-50/50 to-emerald-50/30">
                <div className="container-apple">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-12"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-100 text-teal-700 text-sm font-semibold mb-4">
                            📡 Copy Trade Marketplace
                        </div>
                        <h2 className="heading-lg text-[var(--text-primary)] mb-3">Sinyal Trading Premium — Terpisah dari Membership</h2>
                        <p className="body-md max-w-xl mx-auto">
                            Ikuti sinyal dari trader terbaik. Tidak perlu PRO atau VVIP — ini sistem tersendiri.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                        {/* CT FOLLOWER */}
                        {[
                            {
                                id: 'CT_FOLLOWER',
                                icon: '👥',
                                name: 'CT Follower',
                                tagline: 'Ikuti sinyal trader terbaik',
                                color: 'from-teal-500 to-cyan-600',
                                lightColor: 'from-teal-50 to-cyan-50',
                                borderColor: 'border-teal-200',
                                textColor: 'text-teal-600',
                                features: [
                                    '✅ Lihat sinyal real-time (Entry, SL, TP)',
                                    '✅ Feed sinyal dari semua provider yang di-follow',
                                    '✅ Notifikasi sinyal baru via Telegram',
                                    '✅ Histori & statistik provider',
                                    '✅ Bisa follow unlimited provider',
                                ],
                                prices: { '1month': 'Rp 49K', '3months': 'Rp 130K', '6months': 'Rp 249K', '1year': 'Rp 449K' },
                                savings: { '3months': 'Hemat Rp 17K', '6months': 'Hemat Rp 45K', '1year': 'Hemat Rp 139K' },
                            },
                            {
                                id: 'CT_PROVIDER',
                                icon: '📡',
                                name: 'CT Provider',
                                tagline: 'Jual sinyal ke ratusan follower',
                                color: 'from-purple-500 to-indigo-600',
                                lightColor: 'from-purple-50 to-indigo-50',
                                borderColor: 'border-purple-200',
                                textColor: 'text-purple-600',
                                features: [
                                    '✅ Posting sinyal ke semua follower',
                                    '✅ Auto-broadcast ke Telegram channel',
                                    '✅ Halaman profil provider publik',
                                    '✅ Track win rate & statistik otomatis',
                                    '✅ Bangun reputasi & follower base',
                                    '✅ Bisa set subscription fee sendiri (soon)',
                                ],
                                prices: { '1month': 'Rp 99K', '3months': 'Rp 270K', '6months': 'Rp 499K', '1year': 'Rp 899K' },
                                savings: { '3months': 'Hemat Rp 27K', '6months': 'Hemat Rp 95K', '1year': 'Hemat Rp 289K' },
                            },
                        ].map((plan, idx) => {
                            const durOpts = ['1month', '3months', '6months', '1year'] as const;
                            const durLabels = { '1month': '1 Bulan', '3months': '3 Bulan', '6months': '6 Bulan', '1year': '1 Tahun' };
                            const dur = (selectedDuration[plan.id] || '1month') as keyof typeof plan.prices;

                            return (
                                <motion.div
                                    key={plan.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: idx * 0.1 }}
                                    className={`bg-gradient-to-br ${plan.lightColor} border ${plan.borderColor} rounded-2xl p-6 shadow-sm hover:shadow-md transition-all`}
                                >
                                    {/* Header */}
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center text-white text-2xl shadow-sm`}>
                                            {plan.icon}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-gray-900 text-lg">{plan.name}</h3>
                                            <p className={`text-xs font-medium ${plan.textColor}`}>{plan.tagline}</p>
                                        </div>
                                    </div>

                                    {/* Duration selector */}
                                    <div className="flex gap-1 p-1 bg-white/70 rounded-xl mb-4">
                                        {durOpts.map(d => (
                                            <button key={d}
                                                onClick={() => setSelectedDuration(prev => ({ ...prev, [plan.id]: d }))}
                                                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${dur === d ? `bg-gradient-to-r ${plan.color} text-white shadow-sm` : 'text-gray-500 hover:text-gray-700'}`}>
                                                {durLabels[d]}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Price */}
                                    <div className="mb-4">
                                        <span className={`text-3xl font-black ${plan.textColor}`}>{plan.prices[dur]}</span>
                                        <span className="text-gray-400 text-sm ml-1">{dur === '1month' ? '/bulan' : `/${durLabels[dur].toLowerCase()}`}</span>
                                        {plan.savings[dur as keyof typeof plan.savings] && (
                                            <div className="inline-flex items-center bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full ml-2">
                                                🎉 {plan.savings[dur as keyof typeof plan.savings]}
                                            </div>
                                        )}
                                    </div>

                                    {/* Features */}
                                    <ul className="space-y-2 mb-5">
                                        {plan.features.map((f, i) => (
                                            <li key={i} className="text-sm text-gray-700">{f}</li>
                                        ))}
                                    </ul>

                                    {/* CTA */}
                                    <button
                                        onClick={() => handleSubscribe(plan.id)}
                                        disabled={isProcessing === plan.id}
                                        className={`w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r ${plan.color} hover:opacity-90 transition-all shadow-sm hover:shadow-md text-sm`}
                                    >
                                        {isProcessing === plan.id ? '🔄 Memproses...' : `Mulai ${plan.name} →`}
                                    </button>
                                </motion.div>
                            );
                        })}
                    </div>

                    <p className="text-center text-xs text-gray-400 mt-6">
                        Pembayaran via QRIS / Transfer Bank. Konfirmasi manual via Telegram untuk aktivasi.
                    </p>
                </div>
            </section>

            {/* Bottom CTA */}

            <section className="section-padding">
                <div className="container-apple text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <p className="body-md mb-6">Masih ragu? Coba gratis dulu!</p>
                        <Link href={session ? '/analisa-market' : '/login?callbackUrl=/analisa-market'}>
                            <button className="btn-primary bg-gradient-to-r from-blue-600 to-indigo-600 border-none shadow-lg shadow-blue-500/30">
                                Coba {t('analisaMarket')} Gratis
                                <ArrowRightIcon className="ml-2" size="sm" />
                            </button>
                        </Link>
                    </motion.div>
                </div>
            </section>
        </div>
    );
}
