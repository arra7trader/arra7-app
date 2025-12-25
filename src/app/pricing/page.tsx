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

// Christmas Promo ends: December 26, 2025 at 23:59:59 WIB (UTC+7)
const CHRISTMAS_PROMO_END = new Date('2025-12-26T23:59:59+07:00');
const isChristmasPromoActive = () => new Date() < CHRISTMAS_PROMO_END;

const PRICING_PLANS = [
    {
        id: 'BASIC',
        name: 'Basic',
        price: 'FREE',
        originalPrice: null,
        promoPrice: null,
        discount: null,
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
        gradient: 'from-slate-500 to-slate-600',
    },
    {
        id: 'PRO',
        name: 'Pro',
        price: 'Rp 149K',
        originalPrice: 'Rp 299K',
        promoPrice: 'Rp 99K', // Christmas promo price!
        discount: 67, // 99K dari 299K = 67% off
        period: '/bulan',
        description: 'Untuk trader aktif',
        features: [
            { text: '25x Analisa Forex per hari', included: true },
            { text: '25x Analisa Saham IDX per hari', included: true },
            { text: 'Semua Timeframe', included: true },
            { text: 'Akses Semua Pairs + Crypto', included: true },
            { text: 'Economic Calendar', included: true },
            { text: 'Free 1 Indikator ATAU 1 EA (pilih salah satu)', included: false },
        ],
        cta: '🎄 Ambil Promo Natal!',
        popular: true,
        gradient: 'from-blue-500 to-purple-500',
    },
    {
        id: 'VVIP',
        name: 'VVIP',
        price: 'Rp 399K',
        originalPrice: 'Rp 799K',
        promoPrice: null,
        discount: 50,
        period: '/bulan',
        description: 'Untuk trader profesional',
        features: [
            { text: 'UNLIMITED Analisa Forex', included: true },
            { text: 'UNLIMITED Analisa Saham IDX', included: true },
            { text: 'Semua Timeframe', included: true },
            { text: 'Akses Semua Pairs + Crypto', included: true },
            { text: 'Economic Calendar', included: true },
            { text: 'Free 1 Indikator ATAU 1 EA (pilih salah satu)', included: true },
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
    const [christmasCountdown, setChristmasCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const [isPromoActive, setIsPromoActive] = useState(false);

    // Christmas Promo Countdown - Fixed end date
    useEffect(() => {
        const updateCountdown = () => {
            const now = new Date();
            const diff = CHRISTMAS_PROMO_END.getTime() - now.getTime();

            if (diff <= 0) {
                setIsPromoActive(false);
                setChristmasCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
                return;
            }

            setIsPromoActive(true);
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setChristmasCountdown({ days, hours, minutes, seconds });
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
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

        // Redirect to bank transfer page
        window.location.href = `/payment/transfer?plan=${planId}`;
    };

    return (
        <div className="relative min-h-screen pt-28 lg:pt-36 pb-20 px-4 sm:px-6 lg:px-8">

            {/* Background */}
            <div className="absolute inset-0 bg-grid opacity-20" />
            <div className="bg-orb bg-orb-blue w-[600px] h-[600px] -top-40 left-1/4 opacity-20" />
            <div className="bg-orb bg-orb-purple w-[500px] h-[500px] bottom-0 right-1/4 opacity-15" />

            <div className="relative max-w-7xl mx-auto">
                {/* Christmas Promo Countdown Banner */}
                {isPromoActive && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-red-600/20 via-green-600/20 to-red-600/20 border-2 border-red-500/40 relative overflow-hidden"
                    >
                        {/* Festive decorations */}
                        <div className="absolute top-0 left-4 text-4xl">🎄</div>
                        <div className="absolute top-0 right-4 text-4xl">🎁</div>
                        <div className="absolute -top-2 left-1/4 text-2xl animate-bounce">❄️</div>
                        <div className="absolute -top-2 right-1/4 text-2xl animate-bounce delay-100">❄️</div>

                        <div className="flex flex-col items-center justify-center gap-4 text-center relative z-10">
                            <div className="flex flex-wrap items-center justify-center gap-2">
                                <span className="text-3xl">🎅</span>
                                <span className="font-bold text-2xl text-white">PROMO NATAL SPESIAL!</span>
                                <span className="px-3 py-1 rounded-full bg-gradient-to-r from-red-500 to-green-500 text-white text-sm font-bold animate-pulse">
                                    HEMAT 200K!
                                </span>
                            </div>

                            <div className="text-lg text-white">
                                Paket <span className="font-bold text-blue-400">PRO</span> cuma{' '}
                                <span className="font-bold text-3xl text-green-400">Rp 99K</span>
                                <span className="text-[#94A3B8] line-through ml-2">Rp 299K</span>
                            </div>

                            <div className="flex flex-col items-center gap-2">
                                <span className="text-sm text-[#94A3B8]">⏰ Promo berakhir dalam:</span>
                                <div className="flex gap-2">
                                    <div className="flex flex-col items-center">
                                        <span className="px-3 py-2 bg-red-600 rounded-lg font-mono text-2xl text-white font-bold min-w-[60px]">
                                            {String(christmasCountdown.days).padStart(2, '0')}
                                        </span>
                                        <span className="text-xs text-[#64748B] mt-1">Hari</span>
                                    </div>
                                    <span className="text-2xl text-red-400 self-start mt-2">:</span>
                                    <div className="flex flex-col items-center">
                                        <span className="px-3 py-2 bg-red-600 rounded-lg font-mono text-2xl text-white font-bold min-w-[60px]">
                                            {String(christmasCountdown.hours).padStart(2, '0')}
                                        </span>
                                        <span className="text-xs text-[#64748B] mt-1">Jam</span>
                                    </div>
                                    <span className="text-2xl text-red-400 self-start mt-2">:</span>
                                    <div className="flex flex-col items-center">
                                        <span className="px-3 py-2 bg-red-600 rounded-lg font-mono text-2xl text-white font-bold min-w-[60px]">
                                            {String(christmasCountdown.minutes).padStart(2, '0')}
                                        </span>
                                        <span className="text-xs text-[#64748B] mt-1">Menit</span>
                                    </div>
                                    <span className="text-2xl text-red-400 self-start mt-2">:</span>
                                    <div className="flex flex-col items-center">
                                        <span className="px-3 py-2 bg-green-600 rounded-lg font-mono text-2xl text-white font-bold min-w-[60px] animate-pulse">
                                            {String(christmasCountdown.seconds).padStart(2, '0')}
                                        </span>
                                        <span className="text-xs text-[#64748B] mt-1">Detik</span>
                                    </div>
                                </div>
                            </div>

                            <p className="text-xs text-[#94A3B8]">
                                🎄 Promo berlaku sampai 26 Desember 2025 pukul 23:59 WIB
                            </p>
                        </div>
                    </motion.div>
                )}

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
                                {plan.originalPrice && (
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-lg text-[#64748B] line-through">{plan.originalPrice}</span>
                                        {isPromoActive && plan.promoPrice ? (
                                            <span className="px-2 py-0.5 rounded bg-gradient-to-r from-red-500 to-green-500 text-white text-xs font-bold animate-pulse">
                                                🎄 NATAL -{plan.discount}%
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded bg-red-500 text-white text-xs font-bold">-{plan.discount}%</span>
                                        )}
                                    </div>
                                )}
                                <span className={`text-4xl font-bold ${plan.popular ? 'gradient-text' : plan.originalPrice ? 'text-green-400' : ''}`}>
                                    {isPromoActive && plan.promoPrice ? plan.promoPrice : plan.price}
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
                                    // Show promo CTA only during active promo for PRO plan
                                    isPromoActive && plan.id === 'PRO' ? '🎄 Ambil Promo Natal!' :
                                        plan.id === 'PRO' ? 'Upgrade ke Pro' : plan.cta
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
                                answer: 'Kami menggunakan metode pembayaran QRIS yang dapat di-scan melalui semua aplikasi e-wallet (GoPay, OVO, Dana, ShopeePay) dan mobile banking. Pembayaran diproses secara aman dan instan.',
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
