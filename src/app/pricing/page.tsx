'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useSession, signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { CheckIcon, XIcon, ChevronDownIcon, ArrowRightIcon, SparklesIcon, FireIcon, StarSolidIcon, CpuChipIcon } from '@/components/PremiumIcons';

const PRICING_PLANS = [
    {
        id: 'BASIC',
        name: 'Basic',
        price: 'FREE',
        originalPrice: null,
        period: '',
        description: 'Untuk trader pemula yang ingin mencoba platform',
        icon: '🆓',
        gradient: 'from-slate-500 to-gray-600',
        bgGradient: 'from-slate-50 to-gray-100',
        features: [
            { text: '2x analisa per 3 hari', included: true, highlight: false },
            { text: 'Timeframe M5 dan M15', included: true, highlight: false },
            { text: 'Akses Gold & Major Pairs', included: true, highlight: false },
            { text: '🔥 Bookmap ARRA7 - Trial 3 hari terbatas', included: true, highlight: true },
        ],
        cta: 'Mulai Gratis',
        popular: false,
    },
    {
        id: 'PRO',
        name: 'Pro',
        price: 'Rp 149K',
        originalPrice: 'Rp 299K',
        period: '/bulan',
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
        ],
        cta: 'Upgrade ke Pro',
        popular: true,
    },
    {
        id: 'VVIP',
        name: 'VVIP',
        price: 'Rp 399K',
        originalPrice: 'Rp 799K',
        period: '/bulan',
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
        ],
        cta: 'Jadi VVIP',
        popular: false,
    },
];

export default function PricingPage() {
    const { data: session } = useSession();
    const t = useTranslations('nav');
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    const handleSubscribe = async (planId: string) => {
        if (!session) {
            signIn('google', { callbackUrl: `/pricing?plan=${planId}` });
            return;
        }

        if (planId === 'BASIC') {
            window.location.href = '/analisa-market';
            return;
        }

        window.location.href = `/payment/transfer?plan=${planId}`;
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
                            Promo Tahun Baru - Diskon hingga 50%
                        </span>
                        <h1 className="headline-lg mb-4">
                            Investasi Trading dengan{' '}
                            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-amber-600 bg-clip-text text-transparent">
                                AI Terbaik
                            </span>
                        </h1>
                        <p className="body-lg max-w-2xl mx-auto text-[var(--text-secondary)]">
                            Platform trading dengan teknologi AI Neural Ensemble yang terverifikasi 90%+ akurasi.
                            Bergabung dengan 500+ trader Indonesia yang sudah profit!
                        </p>

                        {/* Trust Badges */}
                        <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
                            {['✓ Garansi 7 Hari', '✓ Enkripsi Bank Level', '✓ Support 24/7'].map((badge, i) => (
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

                                    {/* Price */}
                                    <div className="mb-6 pb-6 border-b border-white/20">
                                        {plan.originalPrice && (
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-lg line-through ${plan.popular || plan.id === 'VVIP' ? 'text-white/50' : 'text-[var(--text-muted)]'}`}>
                                                    {plan.originalPrice}
                                                </span>
                                                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xs font-bold shadow-lg shadow-green-500/30">
                                                    HEMAT 50%
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-5xl font-black">{plan.price}</span>
                                            <span className={plan.popular || plan.id === 'VVIP' ? 'text-white/70' : 'text-[var(--text-secondary)]'}>
                                                {plan.period}
                                            </span>
                                        </div>
                                    </div>

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
