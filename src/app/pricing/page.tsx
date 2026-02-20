'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession, signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { CheckIcon, XIcon, ChevronDownIcon, ArrowRightIcon, SparklesIcon, FireIcon, StarSolidIcon, CpuChipIcon } from '@/components/PremiumIcons';

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
        gradient: 'from-slate-800 to-slate-900',
        bgGradient: 'from-slate-800 to-slate-900',
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
        gradient: 'from-blue-500 to-indigo-600',
        bgGradient: 'from-[#0d142b] to-[#161c38]',
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
        gradient: 'from-orange-400 to-rose-600',
        bgGradient: 'from-[#2e1511] to-[#1f0f0c]',
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

        const duration = selectedDuration[planId] || '1month';
        const durationOption = DURATION_OPTIONS[planId]?.find(d => d.duration === duration);
        const days = durationOption?.days || 30;

        window.location.href = `/payment/transfer?plan=${planId}&duration=${duration}&days=${days}`;
    };

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
            period: option.duration === '1month' ? '/bln' : '',
            badge,
            savingsText: option.savingsText,
        };
    };

    return (
        <div className="min-h-screen bg-[#070b14] text-white pt-24 pb-12 selection:bg-blue-500/30 overflow-hidden relative font-sans">
            {/* Ambient Background Glows */}
            <div className="fixed inset-0 pointer-events-none z-0 mix-blend-screen">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full" />
                <div className="absolute top-[40%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[150px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] bg-emerald-600/10 blur-[150px] rounded-full" />
            </div>

            <div className="relative z-10">
                {/* Hero Section */}
                <section className="text-center px-4 mb-20">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                        className="max-w-4xl mx-auto"
                    >
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8 shadow-[0_0_15px_rgba(251,191,36,0.2)]"
                        >
                            <SparklesIcon size="sm" className="text-amber-400" />
                            <span className="text-sm font-semibold bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-transparent">Promo Spesial - Diskon Hingga 60%</span>
                        </motion.div>
                        <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight leading-tight">
                            Investasi Cerdas dengan <br className="hidden md:block" />
                            <span className="bg-gradient-to-br from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                                AI Trading Terbaik
                            </span>
                        </h1>
                        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                            Eksekusi market dengan akurasi tinggi menggunakan <strong className="text-indigo-400">Neural Ensemble AI</strong>.
                            Bergabung dengan <span className="text-white font-bold">{stats.users}+</span> trader pro lainnya.
                        </p>
                    </motion.div>
                </section>

                {/* Pricing Cards */}
                <section className="px-4 mb-24">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch pt-10">
                            {PRICING_PLANS.map((plan, index) => (
                                <motion.div
                                    key={plan.id}
                                    initial={{ opacity: 0, y: 40 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 + index * 0.1, duration: 0.5 }}
                                    className={`
                                        relative group rounded-[2rem] p-px overflow-hidden 
                                        ${plan.popular ? 'z-20 md:-mt-8 md:mb-8' : 'z-10'}
                                    `}
                                >
                                    {/* Animated Border Gradient */}
                                    <div className={`absolute inset-0 bg-gradient-to-br ${plan.gradient} ${plan.popular ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'} transition-opacity duration-500 rounded-[2rem]`} />

                                    {/* Glassmorphic Inner Card */}
                                    <div className={`
                                        relative h-full rounded-[calc(2rem-1px)] p-8 md:p-10 flex flex-col
                                        backdrop-blur-xl bg-gradient-to-b ${plan.bgGradient} ${plan.popular ? 'shadow-[0_0_40px_rgba(79,70,229,0.3)]' : 'shadow-2xl shadow-black/50'}
                                    `}>

                                        {plan.popular && (
                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 px-6 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-b-xl shadow-lg border-b border-x border-white/20">
                                                <span className="text-xs font-bold text-white tracking-widest uppercase flex items-center gap-1">
                                                    <StarSolidIcon size="xs" /> MOST POPULAR
                                                </span>
                                            </div>
                                        )}

                                        {plan.id === 'VVIP' && (
                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 px-6 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 rounded-b-xl shadow-lg border-b border-x border-white/20">
                                                <span className="text-xs font-bold text-white tracking-widest uppercase flex items-center gap-1">
                                                    👑 EXCLUSIVE
                                                </span>
                                            </div>
                                        )}

                                        <div className="mt-4 mb-2">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl bg-white/10 shadow-inner border border-white/5`}>
                                                    {plan.icon}
                                                </div>
                                                <div>
                                                    <h3 className="text-3xl font-bold text-white">{plan.name}</h3>
                                                </div>
                                            </div>
                                            <p className="text-slate-400 text-sm mb-6 h-10">{plan.description}</p>
                                        </div>

                                        {(plan.id === 'PRO' || plan.id === 'VVIP') && DURATION_OPTIONS[plan.id] && (
                                            <div className="mb-8 p-1.5 bg-black/40 rounded-xl flex gap-1 border border-white/10 backdrop-blur-md">
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
                                                                flex-1 py-2 rounded-lg text-xs font-bold transition-all
                                                                ${isSelected
                                                                    ? 'bg-white/15 text-white shadow-lg border border-white/20'
                                                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                                                }
                                                                ${isSoldOut ? 'opacity-30 cursor-not-allowed' : ''}
                                                            `}
                                                        >
                                                            {option.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {(() => {
                                            const pricing = getPlanPricing(plan.id);
                                            return (
                                                <div className="mb-8 flex-shrink-0">
                                                    {pricing.badge && (
                                                        <div className="mb-3">
                                                            <span className={`
                                                                inline-flex px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider
                                                                ${pricing.badge.includes('SOLD OUT')
                                                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                                                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                                }
                                                            `}>
                                                                {pricing.badge}
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div className="flex flex-col gap-1">
                                                        {pricing.originalPrice && (
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-lg line-through text-slate-500 decoration-slate-500/50">
                                                                    {pricing.originalPrice}
                                                                </span>
                                                                {pricing.savingsText && (
                                                                    <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                                                                        {pricing.savingsText}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                        <div className="flex items-baseline gap-2">
                                                            <span className="text-5xl font-black text-white tracking-tight">{pricing.price}</span>
                                                            <span className="text-slate-400 font-medium">{pricing.period}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        <div className="flex-grow">
                                            <ul className="space-y-4">
                                                {plan.features.map((feature, i) => (
                                                    <li key={i} className="flex items-start gap-3">
                                                        {feature.included ? (
                                                            <span className={`
                                                                flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5
                                                                ${feature.highlight
                                                                    ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_0_10px_rgba(251,191,36,0.3)]'
                                                                    : 'bg-white/10 text-emerald-400'
                                                                }
                                                            `}>
                                                                <CheckIcon size="xs" />
                                                            </span>
                                                        ) : (
                                                            <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 bg-black/20 text-slate-600">
                                                                <XIcon size="xs" />
                                                            </span>
                                                        )}
                                                        <span className={`
                                                            text-sm leading-relaxed
                                                            ${feature.highlight ? 'text-white font-medium' : feature.included ? 'text-slate-300' : 'text-slate-600'}
                                                        `}>
                                                            {feature.text}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="mt-10 pt-8 border-t border-white/10">
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => handleSubscribe(plan.id)}
                                                disabled={isProcessing === plan.id}
                                                className={`
                                                    w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2
                                                    ${plan.popular
                                                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:shadow-[0_0_30px_rgba(79,70,229,0.6)]'
                                                        : plan.id === 'VVIP'
                                                            ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)]'
                                                            : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                                                    }
                                                    ${isProcessing === plan.id ? 'opacity-50 cursor-not-allowed' : ''}
                                                `}
                                            >
                                                {isProcessing === plan.id ? (
                                                    <>
                                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        Memproses...
                                                    </>
                                                ) : (
                                                    <>
                                                        {plan.cta}
                                                        <ArrowRightIcon size="sm" />
                                                    </>
                                                )}
                                            </motion.button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                        <p className="text-center text-slate-500 text-sm mt-12">* Semua paket termasuk akses ke Economic Calendar dan Support via Telegram</p>
                    </div>
                </section>

                {/* AI Technology Section */}
                <section className="px-4 mb-24">
                    <div className="max-w-6xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="relative rounded-[2.5rem] p-1 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 opacity-50" />
                            <div className="relative bg-[#0d1326] rounded-[2.4rem] p-10 md:p-16 text-center shadow-2xl overflow-hidden">
                                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />

                                <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 mb-8 backdrop-blur-md">
                                    <CpuChipIcon size="sm" />
                                    <span className="text-sm font-bold tracking-wide">NN ARCHITECTURE</span>
                                </div>
                                <h2 className="text-4xl md:text-5xl font-black mb-6 text-white leading-tight">
                                    Teknologi AI dengan <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Akurasi 90%+</span>
                                </h2>
                                <p className="text-lg text-slate-400 max-w-3xl mx-auto mb-12">
                                    Sistem kami menggunakan hybrid neural networks (LSTM + GRU + Transformer) yang dilatih menggunakan data pasar selama 5 tahun untuk mengidentifikasi pola probabilitas tinggi.
                                </p>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                                    {['LSTM Engine', 'GRU Memory', 'Transformer', 'Ensemble Logic'].map((tech, i) => (
                                        <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                                            <div className="text-blue-400 font-bold mb-1">Module 0{i + 1}</div>
                                            <div className="text-slate-300 text-sm">{tech}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* AI Copytrade Section */}
                <section id="copytrade" className="px-4 mb-24">
                    <div className="max-w-6xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            className="relative rounded-[3rem] bg-gradient-to-br from-[#064e3b] to-[#020617] border border-emerald-900/50 p-8 md:p-16 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-[url('/bg-grid.svg')] opacity-10 mix-blend-overlay" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-full bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
                                <div>
                                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-6 tracking-widest uppercase">
                                        <SparklesIcon size="xs" /> Eksklusif
                                    </div>
                                    <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">AI Genesis</span> Copytrade
                                    </h2>
                                    <p className="text-lg text-emerald-100/70 mb-10 leading-relaxed">
                                        Profit autopilot 100%. Sinkronisasikan akun MT4/MT5 Anda dengan sinyal eksekusi langsung dari *Deep Learning Agent* kami (Fokus XAUUSD).
                                    </p>

                                    <div className="space-y-6">
                                        {[
                                            { t: 'Eksekusi Otomatis Milidetik', i: '⚡' },
                                            { t: 'Target Winrate >80% & Max DD Rendah', i: '🛡️' },
                                            { t: 'Notifikasi Langsung via Telegram', i: '📱' },
                                        ].map((f, i) => (
                                            <div key={i} className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                                                    {f.i}
                                                </div>
                                                <span className="text-emerald-50 font-medium">{f.t}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl blur-xl opacity-20" />
                                    <div className="relative bg-[#022c22]/80 backdrop-blur-xl border border-emerald-500/30 rounded-3xl p-8 md:p-10 shadow-2xl">
                                        <div className="absolute -top-4 -right-4 bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-900 font-black text-xs px-4 py-2 rounded-xl shadow-lg transform rotate-3">
                                            EARLY ACCESS
                                        </div>

                                        <div className="text-center mb-10">
                                            <div className="text-emerald-400/80 text-sm font-bold tracking-widest uppercase mb-3">Harga Spesial</div>
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="text-6xl font-black text-white">Rp 49K</span>
                                                <span className="text-emerald-400/60 font-medium">/bln</span>
                                            </div>
                                        </div>

                                        <ul className="space-y-4 mb-10">
                                            {['Akses Master AI Genesis', 'Auto-Copy Exness / FBS', 'Bebas Cancel Kapan Saja'].map((item, i) => (
                                                <li key={i} className="flex items-center gap-3 text-emerald-100/90 text-sm">
                                                    <CheckIcon className="text-emerald-400" size="sm" /> {item}
                                                </li>
                                            ))}
                                        </ul>

                                        <button
                                            onClick={() => handleSubscribe('CT_FOLLOWER')}
                                            disabled={isProcessing === 'CT_FOLLOWER'}
                                            className="w-full py-4 rounded-xl font-bold text-lg bg-emerald-500 hover:bg-emerald-400 text-emerald-950 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all"
                                        >
                                            {isProcessing === 'CT_FOLLOWER' ? 'Memproses...' : 'Gabung Copytrade Sekarang'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* FAQ Section */}
                <section className="px-4 mb-24">
                    <div className="max-w-3xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Pertanyaan Umum</h2>
                            <p className="text-slate-400">Informasi detail seputar layanan premium ARRA7</p>
                        </div>

                        <div className="space-y-4">
                            {[
                                { q: 'Metode pembayaran apa yang tersedia?', a: 'Kami menggunakan QRIS otomatis. Mendukung semua e-wallet (GoPay, OVO, DANA) & Mobile Banking.' },
                                { q: 'Apa itu fitur Bookmap ARRA7?', a: 'Visualisasi order flow sekelas institusi untuk mendeteksi pergerakan whale (institusi besar) di market.' },
                                { q: 'Bisa upgrade paket di tengah jalan?', a: 'Tentu. Sisa masa aktif paket sebelumnya akan diakumulasikan otomatis ke paket baru.' }
                            ].map((faq, index) => (
                                <motion.details
                                    key={index}
                                    initial={{ opacity: 0, y: 10 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1 }}
                                    className="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm"
                                >
                                    <summary className="flex items-center justify-between p-6 cursor-pointer list-none hover:bg-white/5 transition-colors">
                                        <span className="font-semibold text-white">{faq.q}</span>
                                        <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-open:rotate-180 transition-transform duration-300 shrink-0">
                                            <ChevronDownIcon size="sm" className="text-slate-300" />
                                        </span>
                                    </summary>
                                    <div className="px-6 pb-6 pt-0 text-slate-400 leading-relaxed">
                                        {faq.a}
                                    </div>
                                </motion.details>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Bottom CTA */}
                <section className="px-4 mb-20 text-center">
                    <p className="text-slate-400 mb-6">Masih ragu? Anda selalu bisa mencoba versi gratis kami.</p>
                    <Link href={session ? '/analisa-market' : '/login?callbackUrl=/analisa-market'}>
                        <button className="px-8 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold transition-all shadow-lg">
                            Coba {t('analisaMarket')} Gratis
                        </button>
                    </Link>
                </section>
            </div>
        </div>
    );
}
