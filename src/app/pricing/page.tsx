'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession, signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

const PRICING_PLANS = [
    {
        id: 'BASIC',
        name: 'Basic',
        price: 'FREE',
        originalPrice: null,
        period: '',
        description: 'Untuk pemula yang ingin mencoba',
        features: [
            { text: '2x Analisa Forex per hari', included: true },
            { text: '2x Analisa Saham IDX per hari', included: true },
            { text: 'Timeframe M1 - M30', included: true },
            { text: 'Akses Gold & Major Pairs', included: true },
            { text: 'Economic Calendar', included: true },
            { text: 'Semua Timeframe', included: false },
            { text: 'Free Custom Indikator/EA', included: false },
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
        description: 'Untuk trader aktif',
        features: [
            { text: '25x Analisa Forex per hari', included: true },
            { text: '25x Analisa Saham IDX per hari', included: true },
            { text: 'Semua Timeframe', included: true },
            { text: 'Akses Semua Pairs + Crypto', included: true },
            { text: 'Economic Calendar', included: true },
            { text: 'Free 1 Indikator ATAU 1 EA', included: false },
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
        description: 'Untuk trader profesional',
        features: [
            { text: 'UNLIMITED Analisa Forex', included: true },
            { text: 'UNLIMITED Analisa Saham IDX', included: true },
            { text: 'Semua Timeframe', included: true },
            { text: 'Akses Semua Pairs + Crypto', included: true },
            { text: 'Economic Calendar', included: true },
            { text: 'Free 1 Indikator ATAU 1 EA', included: true },
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

    const fadeInUp = {
        initial: { opacity: 0, y: 30 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }
    };

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pt-20">
            {/* Header */}
            <section className="section-padding text-center">
                <div className="container-apple">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <span className="badge-apple mb-6 inline-flex">
                            💎 Simple Pricing
                        </span>
                        <h1 className="headline-lg mb-4">
                            Pilih Paket yang{' '}
                            <span className="gradient-text">Tepat untuk Anda</span>
                        </h1>
                        <p className="body-lg max-w-2xl mx-auto">
                            Tingkatkan trading Anda dengan analisa AI yang powerful.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Pricing Cards */}
            <section className="section-padding pt-0">
                <div className="container-wide">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                        {PRICING_PLANS.map((plan, index) => (
                            <motion.div
                                key={plan.id}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 + index * 0.1 }}
                                className={`
                                    relative rounded-2xl p-8
                                    ${plan.popular
                                        ? 'bg-[var(--text-primary)] text-white ring-2 ring-[var(--accent-blue)] shadow-xl'
                                        : 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                                    }
                                `}
                            >
                                {/* Popular Badge */}
                                {plan.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <span className="px-4 py-1 rounded-full bg-[var(--accent-blue)] text-white text-sm font-medium">
                                            Most Popular
                                        </span>
                                    </div>
                                )}

                                {/* Plan Header */}
                                <div className="mb-6">
                                    <h3 className="text-xl font-semibold mb-1">{plan.name}</h3>
                                    <p className={`text-sm ${plan.popular ? 'text-white/70' : 'text-[var(--text-secondary)]'}`}>
                                        {plan.description}
                                    </p>
                                </div>

                                {/* Price */}
                                <div className="mb-8">
                                    {plan.originalPrice && (
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-lg line-through ${plan.popular ? 'text-white/50' : 'text-[var(--text-muted)]'}`}>
                                                {plan.originalPrice}
                                            </span>
                                            <span className="px-2 py-0.5 rounded bg-green-500 text-white text-xs font-medium">
                                                50% OFF
                                            </span>
                                        </div>
                                    )}
                                    <span className="text-4xl font-bold">{plan.price}</span>
                                    <span className={plan.popular ? 'text-white/70' : 'text-[var(--text-secondary)]'}>
                                        {plan.period}
                                    </span>
                                </div>

                                {/* Features */}
                                <ul className="space-y-4 mb-8">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-center gap-3">
                                            {feature.included ? (
                                                <span className={`w-5 h-5 rounded-full flex items-center justify-center ${plan.popular ? 'bg-white/20' : 'bg-green-100'}`}>
                                                    <svg className={`w-3 h-3 ${plan.popular ? 'text-white' : 'text-green-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </span>
                                            ) : (
                                                <span className={`w-5 h-5 rounded-full flex items-center justify-center ${plan.popular ? 'bg-white/10' : 'bg-gray-100'}`}>
                                                    <svg className={`w-3 h-3 ${plan.popular ? 'text-white/40' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </span>
                                            )}
                                            <span className={feature.included ? '' : (plan.popular ? 'text-white/40' : 'text-[var(--text-muted)]')}>
                                                {feature.text}
                                            </span>
                                        </li>
                                    ))}
                                </ul>

                                {/* CTA Button */}
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleSubscribe(plan.id)}
                                    disabled={isProcessing === plan.id}
                                    className={`
                                        w-full py-3.5 rounded-full font-medium transition-all
                                        ${plan.popular
                                            ? 'bg-white text-[var(--text-primary)] hover:bg-gray-100'
                                            : 'bg-[var(--text-primary)] text-white hover:bg-gray-800'
                                        }
                                        ${isProcessing === plan.id ? 'opacity-50 cursor-not-allowed' : ''}
                                    `}
                                >
                                    {isProcessing === plan.id ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                                            Memproses...
                                        </span>
                                    ) : (
                                        plan.cta
                                    )}
                                </motion.button>
                            </motion.div>
                        ))}
                    </div>
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
                                question: 'Bisakah upgrade atau downgrade paket?',
                                answer: 'Ya! Anda bisa upgrade kapan saja. Sisa waktu paket lama akan di-prorate ke paket baru.',
                            },
                            {
                                question: 'Apa itu ARRA Quantum Strategist?',
                                answer: 'AI trading assistant yang menganalisa market menggunakan teknik profesional: SMC/ICT, Price Action, Chart Patterns, dan Fibonacci.',
                            },
                        ].map((faq, index) => (
                            <motion.details
                                key={index}
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className="group bg-white rounded-xl border border-[var(--border-light)] overflow-hidden"
                            >
                                <summary className="flex items-center justify-between p-5 cursor-pointer list-none hover:bg-[var(--bg-secondary)] transition-colors">
                                    <span className="font-medium">{faq.question}</span>
                                    <span className="ml-4 flex-shrink-0 w-6 h-6 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center group-open:rotate-180 transition-transform duration-300">
                                        <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
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
                            <button className="btn-primary">
                                Coba {t('analisaMarket')} Gratis
                                <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </button>
                        </Link>
                    </motion.div>
                </div>
            </section>
        </div>
    );
}
