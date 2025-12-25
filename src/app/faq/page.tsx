'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';

const FAQ_DATA = [
    {
        category: 'Umum',
        questions: [
            {
                q: 'Apa itu ARRA7?',
                a: 'ARRA7 adalah platform analisa trading berbasis AI yang menyediakan analisa pasar Forex dan Saham Indonesia dengan metodologi institutional-grade. AI kami dilatih dengan teknik Smart Money Concepts, ICT, dan analisa fundamental profesional.'
            },
            {
                q: 'Apakah ARRA7 gratis?',
                a: 'Ya! Akun BASIC gratis selamanya dengan kuota 2x analisa Forex dan 2x analisa Saham per hari. Untuk kuota lebih banyak, Anda bisa upgrade ke paket PRO (25x/hari) atau VVIP (Unlimited).'
            },
            {
                q: 'Bagaimana cara mendaftar?',
                a: 'Cukup klik tombol "Login" dan pilih "Continue with Google". Akun Anda akan otomatis terdaftar dengan paket BASIC gratis.'
            },
        ]
    },
    {
        category: 'Analisa & Fitur',
        questions: [
            {
                q: 'Pair apa saja yang bisa dianalisa?',
                a: 'Untuk Forex: Gold (XAUUSD), Major Pairs (EUR, GBP, JPY, CHF, AUD, CAD, NZD), Minor Pairs, Crypto, dan Indices. Untuk Saham: Semua emiten yang terdaftar di Bursa Efek Indonesia (IDX).'
            },
            {
                q: 'Timeframe apa yang tersedia?',
                a: 'Akun BASIC: M1, M5, M15, M30. Akun PRO & VVIP: Semua timeframe termasuk H1, H4, dan D1.'
            },
            {
                q: 'Apa yang termasuk dalam hasil analisa?',
                a: 'Hasil analisa mencakup: Overall Score, Trend Direction, Entry Zone, Stop Loss, Take Profit (TP1 & TP2), Risk/Reward Ratio, Confidence Level, dan Investment Thesis beserta Key Risks.'
            },
            {
                q: 'Berapa akurasi analisa AI?',
                a: 'AI kami memberikan Confidence Level pada setiap analisa. Namun perlu diingat bahwa trading memiliki risiko dan hasil masa lalu tidak menjamin hasil di masa depan. Selalu gunakan money management yang baik.'
            },
        ]
    },
    {
        category: 'Pembayaran & Membership',
        questions: [
            {
                q: 'Bagaimana cara upgrade ke PRO atau VVIP?',
                a: '1) Klik "Pricing" di menu, 2) Pilih paket PRO atau VVIP, 3) Transfer ke rekening BCA yang tertera, 4) Konfirmasi via Telegram @arra7trader dengan bukti transfer, 5) Aktivasi akan diproses maksimal 1x24 jam.'
            },
            {
                q: 'Apa metode pembayaran yang tersedia?',
                a: 'Saat ini kami menerima pembayaran via Transfer Bank BCA. Pembayaran via QRIS dan E-Wallet akan segera tersedia.'
            },
            {
                q: 'Berapa lama durasi membership?',
                a: 'Semua paket berbayar (PRO & VVIP) berlaku selama 30 hari sejak aktivasi.'
            },
            {
                q: 'Apakah ada garansi uang kembali?',
                a: 'Karena layanan digital bersifat langsung digunakan, kami tidak menyediakan refund. Namun Anda bisa mencoba fitur GRATIS terlebih dahulu sebelum memutuskan upgrade.'
            },
        ]
    },
    {
        category: 'Teknis',
        questions: [
            {
                q: 'Kuota analisa di-reset kapan?',
                a: 'Kuota analisa di-reset setiap hari pada pukul 00:00 WIB.'
            },
            {
                q: 'Apakah bisa diakses di HP?',
                a: 'Ya! Website kami responsive dan bisa diakses di semua perangkat: Desktop, Tablet, dan Smartphone.'
            },
            {
                q: 'Browser apa yang didukung?',
                a: 'Kami mendukung semua browser modern: Google Chrome, Mozilla Firefox, Safari, Microsoft Edge, dan Opera.'
            },
        ]
    },
    {
        category: 'Bantuan',
        questions: [
            {
                q: 'Bagaimana cara menghubungi support?',
                a: 'Anda bisa menghubungi kami via Telegram @arra7trader untuk pertanyaan, kendala teknis, atau konfirmasi pembayaran.'
            },
            {
                q: 'Apakah ada grup komunitas?',
                a: 'Ya! Bergabung dengan channel Telegram kami untuk mendapatkan update, tips trading, dan diskusi dengan trader lainnya.'
            },
        ]
    },
];

export default function FAQPage() {
    const [openItems, setOpenItems] = useState<string[]>([]);

    const toggleItem = (id: string) => {
        setOpenItems(prev =>
            prev.includes(id)
                ? prev.filter(item => item !== id)
                : [...prev, id]
        );
    };

    return (
        <div className="relative min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8">
            {/* Background */}
            <div className="absolute inset-0 bg-grid opacity-20" />
            <div className="bg-orb bg-orb-blue w-[600px] h-[600px] -top-40 left-1/4 opacity-20" />
            <div className="bg-orb bg-orb-purple w-[500px] h-[500px] bottom-0 right-1/4 opacity-15" />

            <div className="relative max-w-4xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#1F2937] bg-[#12141A]/50 backdrop-blur-sm mb-6">
                        <span className="text-xl">❓</span>
                        <span className="text-sm text-[#94A3B8]">Help Center</span>
                    </div>
                    <h1 className="text-3xl lg:text-4xl font-bold mb-3">
                        Frequently Asked <span className="gradient-text">Questions</span>
                    </h1>
                    <p className="text-[#94A3B8]">
                        Temukan jawaban untuk pertanyaan umum tentang ARRA7
                    </p>
                </motion.div>

                {/* FAQ Sections */}
                <div className="space-y-8">
                    {FAQ_DATA.map((section, sectionIndex) => (
                        <motion.div
                            key={section.category}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: sectionIndex * 0.1 }}
                            className="glass rounded-2xl p-6 border border-[#1F2937]"
                        >
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-sm">
                                    {sectionIndex + 1}
                                </span>
                                {section.category}
                            </h2>
                            <div className="space-y-3">
                                {section.questions.map((item, itemIndex) => {
                                    const itemId = `${sectionIndex}-${itemIndex}`;
                                    const isOpen = openItems.includes(itemId);
                                    return (
                                        <div
                                            key={itemId}
                                            className="bg-[#12141A] rounded-xl overflow-hidden"
                                        >
                                            <button
                                                onClick={() => toggleItem(itemId)}
                                                className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-[#1F2937]/50 transition-colors"
                                            >
                                                <span className="font-medium pr-4">{item.q}</span>
                                                <svg
                                                    className={`w-5 h-5 text-[#64748B] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>
                                            {isOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    className="px-4 pb-4"
                                                >
                                                    <p className="text-[#94A3B8] text-sm leading-relaxed">
                                                        {item.a}
                                                    </p>
                                                </motion.div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Still need help? */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-12 text-center glass rounded-2xl p-8 border border-[#1F2937]"
                >
                    <h3 className="text-xl font-bold mb-2">Masih ada pertanyaan?</h3>
                    <p className="text-[#94A3B8] mb-4">Hubungi kami langsung untuk bantuan lebih lanjut</p>
                    <a
                        href="https://t.me/arra7trader"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                        </svg>
                        Hubungi via Telegram
                    </a>
                </motion.div>

                {/* Footer Links */}
                <div className="mt-8 text-center text-sm text-[#64748B]">
                    <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                    <span className="mx-2">•</span>
                    <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                </div>
            </div>
        </div>
    );
}
