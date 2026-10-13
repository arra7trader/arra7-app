'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckIcon, XIcon, SparklesIcon, StarSolidIcon, BoltIcon, CrownIcon, RobotIcon, GemIcon, TrendUpIcon } from '@/components/PremiumIcons';

const DURATION_OPTIONS: Record<string, Array<{ duration: string; days: number; label: string; price: string; originalPrice?: string | null; savingsText?: string; promoSlots?: number; period?: string }>> = {
    ALL_ACCESS: [
        { duration: 'lifetime', days: 0, label: 'Lifetime Selamanya', price: 'Rp 125.000', originalPrice: 'Rp 1.499.000', savingsText: 'Hemat Rp 1.374.000 • Diskon 90%', promoSlots: 100, period: '/ sekali bayar' },
    ],
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
    TELEBOT: [
        { duration: '1month', days: 30, label: '1 Bulan', price: 'Rp 175.000', originalPrice: 'Rp 249.000', savingsText: 'Promo Launch + Bonus PRO', promoSlots: 50, period: '/ bulan' },
        { duration: 'lifetime', days: 0, label: 'Lifetime', price: 'Rp 375.000', originalPrice: null, savingsText: '100 Slot Saja + Bonus PRO', promoSlots: 100, period: '/ sekali bayar' },
    ],
    FIBO_KYOKO: [
        { duration: 'lifetime', days: 0, label: 'Sekali Bayar', price: 'Rp 169.000', originalPrice: 'Rp 499.000', savingsText: 'Hemat Rp 330.000 • Akses Selamanya', period: '/ sekali bayar' },
    ],
};

function PlanIcon({ planId }: { planId: string }) {
    switch (planId) {
        case 'BASIC':
            return <SparklesIcon size="lg" className="text-slate-600" />;
        case 'PRO':
            return <BoltIcon size="lg" className="text-blue-600" />;
        case 'VVIP':
            return <CrownIcon size="lg" className="text-amber-500" />;
        case 'TELEBOT_MONTHLY':
            return <RobotIcon size="lg" className="text-emerald-600" />;
        case 'TELEBOT_LIFETIME':
            return <GemIcon size="lg" className="text-amber-500" />;
        case 'FIBO_KYOKO':
            return <TrendUpIcon size="lg" className="text-indigo-600" />;
        default:
            return <SparklesIcon size="lg" className="text-blue-600" />;
    }
}

const PRICING_PLANS = [
    {
        id: 'BASIC',
        name: 'Basic',
        description: 'Untuk trader pemula yang ingin mencoba platform PICA AI.',
        theme: 'slate',
        features: [
            { text: '1x Analisa per Hari', included: true, highlight: true },
            { text: 'Hanya Pair XAUUSD', included: true, highlight: true },
            { text: 'Timeframe M5 dan M15', included: true, highlight: false },
            { text: 'Akses Gold Only', included: true, highlight: false },
            { text: 'DOM ARRA - Trial Terbatas', included: true, highlight: false },
            { text: 'PICA Neural Lab Demo Simulation', included: true, highlight: true },
            { text: 'Analisa Saham IDX', included: false, highlight: false },
            { text: 'Semua Timeframe (M1 - D1)', included: false, highlight: false },
        ],
        cta: 'Mulai Gratis',
        popular: false,
    },
    {
        id: 'PRO',
        name: 'Pro',
        description: 'Untuk trader aktif yang serius meningkatkan profit harian dengan AI.',
        theme: 'blue',
        features: [
            { text: '25x Analisa Forex per hari', included: true, highlight: false },
            { text: '25x Analisa Saham IDX per hari', included: true, highlight: false },
            { text: 'Semua Timeframe (M1 - D1)', included: true, highlight: false },
            { text: 'Akses Semua Pairs + Crypto', included: true, highlight: false },
            { text: 'DOM ARRA - UNLIMITED', included: true, highlight: true },
            { text: 'PICA Neural Lab (Akses Prediksi Gold)', included: true, highlight: true },
            { text: 'AI Neural Ensemble (90%+ Accuracy)', included: true, highlight: true },
            { text: 'Analisis Market Real-time', included: true, highlight: false },
        ],
        cta: 'Upgrade ke Pro',
        popular: true,
    },
    {
        id: 'VVIP',
        name: 'VVIP',
        description: 'Untuk trader profesional & institusi tanpa batas analisa kuantitatif.',
        theme: 'amber',
        features: [
            { text: 'UNLIMITED Analisa Forex', included: true, highlight: false },
            { text: 'UNLIMITED Analisa Saham IDX', included: true, highlight: false },
            { text: 'Semua Timeframe (M1 - D1)', included: true, highlight: false },
            { text: 'Akses Semua Pairs + Crypto + Indices', included: true, highlight: false },
            { text: 'DOM ARRA - UNLIMITED', included: true, highlight: true },
            { text: 'PICA Neural Lab UNLIMITED Real-time', included: true, highlight: true },
            { text: 'Multi-Timeframe Neural Confluence (M15-D1)', included: true, highlight: true },
            { text: 'Akses Penuh Seluruh Fitur Platform', included: true, highlight: true },
        ],
        cta: 'Daftar VVIP',
        popular: false,
    },
    {
        id: 'TELEBOT_MONTHLY',
        name: 'TELEBOT 1 Bulan',
        description: 'Private AI execution desk untuk trader yang ingin langsung signal Telegram premium PICA dengan live status, bonus akun PRO website 1 bulan, dan video Edukasi Sniper Entry.',
        theme: 'emerald',
        features: [
            { text: 'Akses TELEBOT khusus member approved 1 bulan', included: true, highlight: true },
            { text: 'Bonus akun PRO website 1 bulan', included: true, highlight: true },
            { text: 'Bonus video eksklusif: Edukasi Sniper Entry', included: true, highlight: true },
            { text: 'Menu Signal semua pair dan timeframe', included: true, highlight: false },
            { text: 'Menu Hasil + Live Status signal', included: true, highlight: false },
            { text: 'Format signal profesional: NOW / LIMIT / STOP', included: true, highlight: true },
            { text: 'Approval by username Telegram', included: true, highlight: false },
            { text: 'Fokus penuh ke signal, tanpa chat bebas', included: true, highlight: false },
        ],
        cta: 'Ambil TELEBOT 1 Bulan',
        popular: false,
    },
    {
        id: 'TELEBOT_LIFETIME',
        name: 'TELEBOT Lifetime',
        description: 'Promo eksklusif sekali bayar untuk 100 orang tercepat. Akses TELEBOT lifetime, bonus akun PRO website 1 bulan, dan bonus video Edukasi Sniper Entry.',
        theme: 'amber',
        features: [
            { text: 'Akses TELEBOT lifetime selamanya', included: true, highlight: true },
            { text: 'Bonus akun PRO website 1 bulan', included: true, highlight: true },
            { text: 'Bonus video eksklusif: Edukasi Sniper Entry', included: true, highlight: true },
            { text: 'Signal multi-market + live monitoring', included: true, highlight: false },
            { text: 'Menu Hasil untuk progress TP / SL', included: true, highlight: false },
            { text: 'Format signal profesional: NOW / LIMIT / STOP', included: true, highlight: true },
            { text: 'Hanya 100 slot lifetime, rebutan tercepat', included: true, highlight: true },
            { text: 'Approval by username Telegram', included: true, highlight: false },
        ],
        cta: 'Ambil TELEBOT Lifetime',
        popular: false,
    },
    {
        id: 'FIBO_KYOKO',
        name: 'Kursus Digital Fibo Kyoko',
        description: 'Paket lengkap 3 video masterclass Fibo Kyoko + File Indikator Auto MT5 (.ex5) + Script TradingView Pine Script v6.',
        theme: 'indigo',
        features: [
            { text: '3 Video Masterclass HD (Basic, Pola Trend, Tarik Garis)', included: true, highlight: true },
            { text: 'File Indikator FIBO KYOKO AUTO MT5 (.ex5)', included: true, highlight: true },
            { text: 'Script TradingView Pine Script v6 Full Akses', included: true, highlight: true },
            { text: 'Bonus Akses PRO PICA Platform (Analisa AI)', included: true, highlight: true },
            { text: 'Akses Selamanya (Sekali Bayar, Tanpa Iuran Bulanan)', included: true, highlight: true },
            { text: 'Panduan Instalasi Lengkap MT5 & TradingView', included: true, highlight: false },
        ],
        cta: 'Beli Kursus Sekarang (Rp 169.000)',
        popular: true,
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

    const handleSubscribe = async (planId: string, durationOverride?: string) => {
        if (planId === 'BASIC') {
            router.push('/analisa-market');
            return;
        }

        const catalogPlanId =
            planId === 'TELEBOT_MONTHLY' || planId === 'TELEBOT_LIFETIME'
                ? 'TELEBOT'
                : planId;
        const duration =
            durationOverride ||
            (planId === 'TELEBOT_MONTHLY'
                ? '1month'
                : planId === 'TELEBOT_LIFETIME' || planId === 'FIBO_KYOKO' || planId === 'ALL_ACCESS'
                    ? 'lifetime'
                    : selectedDuration[planId] || '1month');
        setIsProcessing(planId);
        const durationOption = DURATION_OPTIONS[catalogPlanId]?.find(d => d.duration === duration);
        const days = durationOption?.days ?? (duration === 'lifetime' ? 0 : 30);

        router.push(`/payment/transfer?plan=${catalogPlanId}&duration=${duration}&days=${days}`);
    };

    const getPlanPricing = (planId: string) => {
        if (planId === 'BASIC') {
            return { price: 'Gratis', originalPrice: null, period: '', badge: null };
        }

        const catalogPlanId =
            planId === 'TELEBOT_MONTHLY' || planId === 'TELEBOT_LIFETIME'
                ? 'TELEBOT'
                : planId;
        const duration =
            planId === 'TELEBOT_MONTHLY'
                ? '1month'
                : planId === 'TELEBOT_LIFETIME' || planId === 'FIBO_KYOKO' || planId === 'ALL_ACCESS'
                    ? 'lifetime'
                    : selectedDuration[planId] || '1month';
        const option = DURATION_OPTIONS[catalogPlanId]?.find(d => d.duration === duration);

        if (!option) {
            return { price: 'Rp 99.000', originalPrice: 'Rp 149.000', period: '/ bulan', badge: null };
        }

        let badge = null;
        if (option.promoSlots && promoSlots) {
            const slotInfo = promoSlots[catalogPlanId]?.[duration];
            if (slotInfo) {
                if (slotInfo.remaining <= 0) {
                    badge = 'SLOT HABIS';
                }
            }
        }

        return {
            price: option.price,
            originalPrice: option.originalPrice,
            period: option.period || '',
            badge,
            savingsText: option.savingsText,
        };
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pt-32 pb-20 font-sans">
            {/* Header / Hero */}
            <header className="text-center px-4 max-w-4xl mx-auto mb-14 md:mb-20">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 font-semibold text-sm mb-5 border border-blue-200">
                        <SparklesIcon size="sm" className="text-blue-600" />
                        PICA Neural Platform • Promo Spesial
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-5 leading-tight">
                        Pilih Paket Trading <br className="hidden md:block" /> Sesuai <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Gaya Anda</span>
                    </h1>
                    <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                        Mulai dari yang gratis hingga fitur tak terbatas untuk akun profesional. Tingkatkan Win Rate Anda dengan dukungan PICA Neural Lab &amp; Bi-LSTM Deep Learning.
                    </p>
                </motion.div>
            </header>

            {/* Pricing Section */}
            <section className="px-4 max-w-5xl mx-auto mb-24 flex flex-col gap-10">
                {/* Spotlight Flash Sale 2 Hari Card (All-Access Lifetime) */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="relative overflow-hidden rounded-3xl p-1 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 shadow-2xl"
                >
                    <div className="bg-white rounded-[22px] p-6 sm:p-10">
                        {/* Top Badge */}
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 text-white font-extrabold text-xs shadow-md uppercase tracking-wider">
                                <span className="animate-pulse">🔥</span>
                                <span>PENGUMUMAN RESMI: FLASH SALE 2 HARI</span>
                            </div>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                                <span>⏰</span>
                                <span>Hanya Berlaku 48 Jam</span>
                            </div>
                        </div>

                        {/* Title & Description */}
                        <div className="mb-8">
                            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
                                1 Harga Lifetime untuk <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-600 via-rose-600 to-indigo-600">4 PRODUK INTI PLATFORM</span>
                            </h2>
                            <p className="text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed">
                                Dapatkan akses seumur hidup (Lifetime) ke seluruh 4 produk &amp; fitur unggulan di platform ARRA 7: PICA Neural Lab, Kursus Masterclass Fibo Kyoko, DOM ARRA, dan Analisis Market. Cukup 1 kali bayar, Anda bebas menggunakan seluruh ekosistem tanpa perlu membayar iuran langganan bulanan lagi!
                            </p>
                        </div>

                        {/* Grid Fitur Yang Didapat (4 Produk Inti) */}
                        <div className="mb-8 bg-slate-50/80 rounded-2xl p-5 sm:p-6 border border-slate-200/80">
                            <p className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span>DAFTAR LENGKAP 4 PRODUK &amp; FITUR YANG DIDAPATKAN:</span>
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-bold text-sm">
                                        🧠
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 text-xs sm:text-sm">1. PICA Neural Lab (Bi-LSTM + SMC)</p>
                                        <p className="text-[11px] text-slate-500">Prediksi XAUUSD real-time AI 3-Layer Bi-LSTM dipadukan dengan Smart Money Concepts (Order Block, Liquidity Sweeps, VWAP, FVG), target SL/TP terukur, &amp; akurasi tinggi di semua timeframe.</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 font-bold text-sm">
                                        🎓
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 text-xs sm:text-sm">2. Kursus Masterclass Fibo Kyoko</p>
                                        <p className="text-[11px] text-slate-500">3 Video Masterclass HD komplit (Mindset &amp; Dasar, Anatomi Reversal, Praktik Live), File Indikator Auto FIBO KYOKO MT5 (.ex5), dan Script TradingView Pine Script v6 lengkap.</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 font-bold text-sm">
                                        📊
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 text-xs sm:text-sm">3. DOM ARRA &amp; Whale Radar</p>
                                        <p className="text-[11px] text-slate-500">Depth of Market order book visualizer, Volume Profile, Spoofing Alert, dan pelacak likuiditas instan untuk mendeteksi jejak akumulasi whale serta big bank.</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 font-bold text-sm">
                                        📈
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 text-xs sm:text-sm">4. Analisis Market Real-time</p>
                                        <p className="text-[11px] text-slate-500">Pemetaan struktur market kuantitatif Forex &amp; Saham, zona Supply &amp; Demand, Support/Resistance harian, dan ringkasan momentum teknikal multi-timeframe.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Pricing Box & CTA */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2 border-t border-slate-100">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-slate-400 line-through text-base font-semibold">Rp 1.499.000</span>
                                    <span className="text-xs font-extrabold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full">
                                        HEMAT Rp 1.374.000 (DISKON 90%)
                                    </span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">Rp 125.000</span>
                                    <span className="text-sm font-semibold text-slate-500">/ sekali bayar (Lifetime)</span>
                                </div>
                                <p className="text-xs text-amber-600 font-semibold mt-1">
                                    ⚡ Promo ditutup otomatis setelah 2 hari!
                                </p>
                            </div>

                            <div className="w-full sm:w-auto">
                                <button
                                    onClick={() => handleSubscribe('ALL_ACCESS', 'lifetime')}
                                    disabled={isProcessing === 'ALL_ACCESS'}
                                    className="w-full sm:w-auto px-8 py-4 rounded-2xl font-extrabold text-base text-white bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:opacity-95 shadow-lg shadow-rose-500/25 transition-all transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                                >
                                    <span>Ambil Promo Semua Produk (Rp 125.000)</span>
                                    <span className="text-xl">&rarr;</span>
                                </button>
                                <p className="text-[11px] text-center text-slate-500 mt-2">
                                    Bank BCA: <strong>1392698188</strong> a.n. Arland Pratama Muldiawan
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {PRICING_PLANS.map((plan, index) => {
                    const pricing = getPlanPricing(plan.id);
                    const isReversed = index % 2 !== 0;

                    let leftBg = 'bg-slate-50/70';
                    let titleColor = 'text-slate-900';
                    let ctaStyle = 'bg-slate-900 hover:bg-slate-800 text-white';
                    let checkStyle = 'bg-slate-100 text-slate-600';

                    if (plan.theme === 'blue') {
                        leftBg = 'bg-blue-50/50';
                        titleColor = 'text-blue-700';
                        ctaStyle = 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20';
                        checkStyle = 'bg-blue-100 text-blue-700';
                    } else if (plan.theme === 'amber') {
                        leftBg = 'bg-amber-50/50';
                        titleColor = 'text-amber-800';
                        ctaStyle = 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-500/20';
                        checkStyle = 'bg-amber-100 text-amber-700';
                    } else if (plan.theme === 'emerald') {
                        leftBg = 'bg-emerald-50/50';
                        titleColor = 'text-emerald-800';
                        ctaStyle = 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20';
                        checkStyle = 'bg-emerald-100 text-emerald-700';
                    }

                    return (
                        <motion.div
                            key={plan.id}
                            id={plan.id === 'TELEBOT_MONTHLY' ? 'telebot-plan' : undefined}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1, duration: 0.5 }}
                            className={`bg-white rounded-3xl border ${plan.id === 'PRO' ? 'border-blue-400 ring-2 ring-blue-100 shadow-xl' : 'border-slate-200/90 shadow-sm'} overflow-hidden flex flex-col md:flex-row items-stretch ${isReversed ? 'md:flex-row-reverse' : ''}`}
                        >
                            {/* Left Pane (Details & Features) */}
                            <div className={`w-full md:w-3/5 p-8 md:p-12 ${leftBg} flex flex-col justify-center border-b md:border-b-0 ${isReversed ? 'md:border-l' : 'md:border-r'} border-slate-200`}>
                                <div className="flex flex-wrap items-center gap-3 mb-3">
                                    <div className="p-2.5 rounded-2xl bg-white shadow-xs border border-slate-200/80">
                                        <PlanIcon planId={plan.id} />
                                    </div>
                                    <h2 className={`text-2xl md:text-3xl font-extrabold ${titleColor}`}>
                                        {plan.name}
                                    </h2>
                                    {plan.popular && (
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-bold uppercase tracking-wider ml-auto">
                                            <StarSolidIcon size="xs" /> Paling Laris
                                        </div>
                                    )}
                                </div>

                                <p className="text-slate-600 leading-relaxed mb-6 text-sm max-w-lg">
                                    {plan.description}
                                </p>

                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className={`flex items-start gap-2.5 text-xs sm:text-sm leading-snug ${feature.included ? 'text-slate-700' : 'text-slate-400 opacity-60'}`}>
                                            {feature.included ? (
                                                <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${checkStyle}`}>
                                                    <CheckIcon size="xs" />
                                                </span>
                                            ) : (
                                                <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center bg-slate-100 text-slate-400">
                                                    <XIcon size="xs" />
                                                </span>
                                            )}
                                            <span className={`mt-0.5 ${feature.highlight ? 'font-bold text-slate-900' : ''}`}>
                                                {feature.text}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Right Pane (Pricing & CTA) */}
                            <div className="w-full md:w-2/5 p-8 md:p-12 text-center bg-white flex flex-col justify-center items-center">
                                {DURATION_OPTIONS[plan.id] && DURATION_OPTIONS[plan.id].length > 1 && (
                                    <div className="mb-6 w-full">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Pilih Durasi</label>
                                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                                            {DURATION_OPTIONS[plan.id].map((option) => {
                                                const isSelected = selectedDuration[plan.id] === option.duration;
                                                const slotInfo = promoSlots?.[plan.id]?.[option.duration];
                                                const isSoldOut = !!(option.promoSlots && slotInfo && slotInfo.remaining <= 0);

                                                return (
                                                    <button
                                                        key={option.duration}
                                                        onClick={() => setSelectedDuration({ ...selectedDuration, [plan.id]: option.duration })}
                                                        disabled={isSoldOut}
                                                        className={`flex-1 py-1.5 px-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${isSelected ? 'bg-white text-slate-900 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'} ${isSoldOut ? 'opacity-40 cursor-not-allowed' : ''}`}
                                                    >
                                                        {option.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-col items-center justify-center mb-6">
                                    {pricing.badge && (
                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-2 ${pricing.badge.includes('HABIS') ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                                            {pricing.badge}
                                        </span>
                                    )}

                                    {pricing.originalPrice && (
                                        <div className="flex flex-wrap items-center justify-center gap-2 mb-1.5">
                                            <span className="text-slate-400 line-through text-sm font-medium">{pricing.originalPrice}</span>
                                            {pricing.savingsText && (
                                                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                    {pricing.savingsText}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex items-baseline justify-center gap-1">
                                        <span className="text-3xl xl:text-4xl font-black tracking-tight text-slate-900">{pricing.price}</span>
                                        {pricing.period && (
                                            <span className="text-slate-500 font-medium text-sm whitespace-nowrap">{pricing.period}</span>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleSubscribe(plan.id)}
                                    disabled={isProcessing === plan.id}
                                    className={`w-full py-3.5 rounded-xl font-bold text-base transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${ctaStyle} ${isProcessing === plan.id ? 'opacity-70 cursor-wait' : ''}`}
                                >
                                    {isProcessing === plan.id ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                                            Memproses...
                                        </>
                                    ) : (
                                        <>
                                            {plan.cta}
                                            <span className="ml-1 text-lg">→</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    );
                })}

                <p className="text-center text-slate-500 text-xs mt-2">
                    * Pembayaran melalui Transfer Bank BCA: 1392698188 a.n. Arland Pratama Muldiawan. Konfirmasi instan via Telegram @arra7trader.
                </p>
            </section>

            {/* Bottom Free Section */}
            <section className="px-4 text-center max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Ingin Mencoba Dulu?</h2>
                <p className="text-slate-600 mb-6 text-sm">
                    Anda selalu dapat mencoba akun Basic secara gratis untuk melakukan analisis harian XAUUSD dan simulasi PICA Neural Lab.
                </p>
                <Link href={session ? '/xauusd-neural-lab' : '/login'}>
                    <button className="px-8 py-3 rounded-full border border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-white font-bold text-sm transition-all shadow-xs cursor-pointer">
                        Mulai dengan Akun Gratis
                    </button>
                </Link>
            </section>
        </div>
    );
}
