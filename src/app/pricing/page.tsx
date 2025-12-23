'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession, signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Script from 'next/script';

declare global {
    interface Window {
        snap: {
            pay: (token: string, options: {
                onSuccess: (result: unknown) => void;
                onPending: (result: unknown) => void;
                onError: (result: unknown) => void;
                onClose: () => void;
            }) => void;
        };
    }
}

const PRICING_PLANS = [
    {
        id: 'BASIC',
        name: 'Basic',
        price: 'FREE',
        period: '',
        description: 'Untuk pemula yang ingin mencoba',
        features: [
            { text: '2x Analisa per hari', included: true },
            { text: 'Timeframe M1 - M30', included: true },
            { text: 'Akses Gold & Major Pairs', included: true },
            { text: 'Economic Calendar', included: true },
            { text: 'Semua Timeframe', included: false },
            { text: 'Free Custom Indikator/EA', included: false },
        ],
        cta: 'Mulai Gratis',
        popular: false,
        gradient: 'from-slate-500 to-slate-600',
    },
    {
        id: 'PRO',
        name: 'Pro',
        price: 'Rp 149K',
        period: '/bulan',
        description: 'Untuk trader aktif',
        features: [
            { text: '25x Analisa per hari', included: true },
            { text: 'Semua Timeframe', included: true },
            { text: 'Akses Semua Pairs + Crypto', included: true },
            { text: 'Economic Calendar', included: true },
            { text: 'Free Custom Indikator', included: true },
            { text: 'Free Custom EA', included: false },
        ],
        cta: 'Upgrade ke Pro',
        popular: true,
        gradient: 'from-blue-500 to-purple-500',
    },
    {
        id: 'VVIP',
        name: 'VVIP',
        price: 'Rp 399K',
        period: '/bulan',
        description: 'Untuk trader profesional',
        features: [
            { text: 'UNLIMITED Analisa', included: true },
            { text: 'Semua Timeframe', included: true },
            { text: 'Akses Semua Pairs + Crypto', included: true },
            { text: 'Economic Calendar', included: true },
            { text: 'Free Custom Indikator', included: true },
            { text: 'Free Custom EA', included: true },
        ],
        cta: 'Jadi VVIP',
        popular: false,
        gradient: 'from-amber-500 to-orange-500',
    },
];

export default function PricingPage() {
    const { data: session } = useSession();
    const t = useTranslations('nav');
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const [snapReady, setSnapReady] = useState(false);

    const handleSubscribe = async (planId: string) => {
        if (!session) {
            signIn('google', { callbackUrl: `/pricing?plan=${planId}` });
            return;
        }

        if (planId === 'BASIC') {
            window.location.href = '/analisa-market';
            return;
        }

        // Redirect to QRIS checkout page
        window.location.href = `/payment/checkout?plan=${planId}`;
    };

    return (
        <div className="relative min-h-screen pt-28 lg:pt-36 pb-20 px-4 sm:px-6 lg:px-8">
            {/* Midtrans Snap Script */}
            <Script
                src="https://app.midtrans.com/snap/snap.js"
                data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
                onLoad={() => setSnapReady(true)}
            />

            {/* Background */}
            <div className="absolute inset-0 bg-grid opacity-20" />
            <div className="bg-orb bg-orb-blue w-[600px] h-[600px] -top-40 left-1/4 opacity-20" />
            <div className="bg-orb bg-orb-purple w-[500px] h-[500px] bottom-0 right-1/4 opacity-15" />

            <div className="relative max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <motion.span
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#1F2937] bg-[#12141A]/50 backdrop-blur-sm mb-6"
                    >
                        <span className="text-xl">💎</span>
                        <span className="text-sm text-[#94A3B8]">Simple, Transparent Pricing</span>
                    </motion.span>

                    <h1 className="text-4xl lg:text-5xl font-bold mb-4">
                        Pilih Paket yang{' '}
                        <span className="gradient-text">Tepat untuk Anda</span>
                    </h1>
                    <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto">
                        Tingkatkan trading Anda dengan analisa AI yang powerful.
                        Semua paket termasuk akses ke ARRA Quantum Strategist.
                    </p>
                </motion.div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                    {PRICING_PLANS.map((plan, index) => (
                        <motion.div
                            key={plan.id}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 + index * 0.1 }}
                            className={`
                relative rounded-2xl p-6 lg:p-8
                ${plan.popular
                                    ? 'bg-gradient-to-b from-[#1A1D24] to-[#12141A] border-2 border-blue-500/50 shadow-2xl shadow-blue-500/10'
                                    : 'glass border border-[#1F2937]'
                                }
              `}
                        >
                            {/* Popular Badge */}
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                    <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold shadow-lg shadow-blue-500/25">
                                        Most Popular
                                    </span>
                                </div>
                            )}

                            {/* Plan Header */}
                            <div className="mb-6">
                                <div className={`
                  inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4
                  bg-gradient-to-br ${plan.gradient} bg-opacity-20
                `}>
                                    {plan.id === 'BASIC' && <span className="text-xl">🌱</span>}
                                    {plan.id === 'PRO' && <span className="text-xl">🚀</span>}
                                    {plan.id === 'VVIP' && <span className="text-xl">👑</span>}
                                </div>

                                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                                <p className="text-sm text-[#64748B]">{plan.description}</p>
                            </div>

                            {/* Price */}
                            <div className="mb-6">
                                <span className={`text-4xl font-bold ${plan.popular ? 'gradient-text' : ''}`}>
                                    {plan.price}
                                </span>
                                <span className="text-[#64748B]">{plan.period}</span>
                            </div>

                            {/* Features */}
                            <ul className="space-y-3 mb-8">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-center gap-3">
                                        {feature.included ? (
                                            <span className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                                                <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </span>
                                        ) : (
                                            <span className="w-5 h-5 rounded-full bg-[#1F2937] flex items-center justify-center">
                                                <svg className="w-3 h-3 text-[#64748B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </span>
                                        )}
                                        <span className={feature.included ? 'text-[#E2E8F0]' : 'text-[#64748B]'}>
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
                  w-full py-3.5 rounded-xl font-semibold transition-all
                  ${plan.popular
                                        ? 'glow-button text-white'
                                        : 'bg-[#1F2937] hover:bg-[#374151] text-white border border-[#374151]'
                                    }
                  ${isProcessing === plan.id ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                            >
                                {isProcessing === plan.id ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Memproses...
                                    </span>
                                ) : (
                                    plan.cta
                                )}
                            </motion.button>
                        </motion.div>
                    ))}
                </div>

                {/* FAQ Section - Accordion Style */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="mt-20 max-w-3xl mx-auto"
                >
                    <h2 className="text-3xl font-bold text-center mb-4">Pertanyaan Umum</h2>
                    <p className="text-center text-[#94A3B8] mb-10">Temukan jawaban atas pertanyaan yang sering diajukan</p>

                    <div className="space-y-4">
                        {[
                            {
                                question: 'Metode pembayaran apa yang tersedia?',
                                answer: 'Kami menerima transfer bank, e-wallet (GoPay, OVO, Dana), dan kartu kredit/debit. Pembayaran diproses secara aman dan terenkripsi.',
                            },
                            {
                                question: 'Bisakah upgrade atau downgrade paket?',
                                answer: 'Ya! Anda bisa upgrade kapan saja. Sisa waktu paket lama akan di-prorate ke paket baru. Untuk downgrade, akan berlaku di periode berikutnya.',
                            },
                            {
                                question: 'Apa itu ARRA Quantum Strategist?',
                                answer: 'AI trading assistant yang menganalisa market menggunakan 5 teknik profesional: SMC/ICT, Price Action, Chart Patterns, Candlestick Patterns, dan Fibonacci. Memberikan rekomendasi entry, stop loss, dan take profit.',
                            },
                        ].map((faq, index) => (
                            <details
                                key={index}
                                className="group glass rounded-2xl border border-[#1F2937] overflow-hidden"
                            >
                                <summary className="flex items-center justify-between p-5 cursor-pointer list-none hover:bg-[#1A1D24] transition-colors">
                                    <span className="font-semibold text-lg">{faq.question}</span>
                                    <span className="ml-4 flex-shrink-0 w-8 h-8 rounded-full bg-[#1F2937] flex items-center justify-center group-open:rotate-180 transition-transform duration-300">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </span>
                                </summary>
                                <div className="px-5 pb-5 pt-0">
                                    <p className="text-[#94A3B8] leading-relaxed">{faq.answer}</p>
                                </div>
                            </details>
                        ))}
                    </div>
                </motion.div>

                {/* Bottom CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="mt-20 text-center"
                >
                    <p className="text-[#94A3B8] mb-4">Masih ragu? Coba gratis dulu!</p>
                    <Link href={session ? '/analisa-market' : '/login?callbackUrl=/analisa-market'}>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="px-8 py-3 rounded-xl border border-[#374151] hover:border-blue-500/50 bg-[#12141A] hover:bg-[#1A1D24] text-white font-medium transition-all"
                        >
                            Coba {t('analisaMarket')} Gratis →
                        </motion.button>
                    </Link>
                </motion.div>
            </div>
        </div>
    );
}
