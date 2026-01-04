'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronDownIcon, TelegramIcon } from '@/components/PremiumIcons';

const FAQ_DATA = [
    {
        category: 'Umum',
        questions: [
            { q: 'Apa itu ARRA7?', a: 'ARRA7 adalah platform analisa trading berbasis AI yang menyediakan analisa pasar Forex dan Saham Indonesia dengan metodologi institutional-grade.' },
            { q: 'Apakah ARRA7 gratis?', a: 'Ya! Akun BASIC gratis selamanya dengan kuota 2x analisa Forex dan 2x analisa Saham per hari.' },
            { q: 'Bagaimana cara mendaftar?', a: 'Cukup klik tombol "Login" dan pilih "Continue with Google". Akun Anda akan otomatis terdaftar.' },
        ]
    },
    {
        category: 'Analisa & Fitur',
        questions: [
            { q: 'Pair apa saja yang bisa dianalisa?', a: 'Forex: Gold, Major & Minor Pairs, Crypto, Indices. Saham: Semua emiten di IDX.' },
            { q: 'Timeframe apa yang tersedia?', a: 'BASIC: M1-M30. PRO & VVIP: Semua timeframe termasuk H1, H4, D1.' },
            { q: 'Apa yang termasuk dalam hasil analisa?', a: 'Overall Score, Trend, Entry Zone, Stop Loss, Take Profit, Risk/Reward, dan Investment Thesis.' },
        ]
    },
    {
        category: 'Pembayaran',
        questions: [
            { q: 'Bagaimana cara upgrade?', a: 'Pilih paket di halaman Pricing, transfer, konfirmasi via Telegram @arra7trader.' },
            { q: 'Metode pembayaran apa yang tersedia?', a: 'Transfer Bank BCA, QRIS, dan E-Wallet.' },
            { q: 'Berapa lama durasi membership?', a: 'Semua paket berbayar berlaku 30 hari sejak aktivasi.' },
        ]
    },
    {
        category: 'Teknis',
        questions: [
            { q: 'Kuota di-reset kapan?', a: 'Setiap hari pada pukul 00:00 WIB.' },
            { q: 'Apakah bisa diakses di HP?', a: 'Ya! Website responsive untuk semua perangkat.' },
        ]
    },
];

export default function FAQPage() {
    const [openItems, setOpenItems] = useState<string[]>([]);

    const toggleItem = (id: string) => {
        setOpenItems(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pt-20">
            {/* Header */}
            <section className="section-padding text-center">
                <div className="container-apple">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <span className="badge-apple mb-6 inline-flex">
                            ❓ Help Center
                        </span>
                        <h1 className="headline-lg mb-4">
                            Frequently Asked <span className="gradient-text">Questions</span>
                        </h1>
                        <p className="body-lg">
                            Temukan jawaban untuk pertanyaan umum tentang ARRA7
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* FAQ Sections */}
            <section className="section-padding pt-0">
                <div className="container-apple">
                    <div className="space-y-6">
                        {FAQ_DATA.map((section, sectionIndex) => (
                            <motion.div
                                key={section.category}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: sectionIndex * 0.1 }}
                                className="bg-white rounded-2xl border border-[var(--border-light)] overflow-hidden"
                            >
                                <div className="p-6 border-b border-[var(--border-light)] bg-[var(--bg-secondary)]">
                                    <h2 className="font-semibold flex items-center gap-3">
                                        <span className="w-8 h-8 rounded-lg bg-[var(--accent-blue)] text-white flex items-center justify-center text-sm">
                                            {sectionIndex + 1}
                                        </span>
                                        {section.category}
                                    </h2>
                                </div>
                                <div className="divide-y divide-[var(--border-light)]">
                                    {section.questions.map((item, itemIndex) => {
                                        const itemId = `${sectionIndex}-${itemIndex}`;
                                        const isOpen = openItems.includes(itemId);
                                        return (
                                            <div key={itemId}>
                                                <button
                                                    onClick={() => toggleItem(itemId)}
                                                    className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-[var(--bg-secondary)] transition-colors"
                                                >
                                                    <span className="font-medium pr-4">{item.q}</span>
                                                    <ChevronDownIcon
                                                        className={`text-[var(--text-secondary)] transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                                                        size="md"
                                                    />
                                                </button>
                                                {isOpen && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        className="px-6 pb-4"
                                                    >
                                                        <p className="text-[var(--text-secondary)] leading-relaxed">
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
                </div>
            </section>

            {/* Contact CTA */}
            <section className="section-padding bg-[var(--bg-secondary)]">
                <div className="container-apple text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h3 className="headline-md mb-4">Masih ada pertanyaan?</h3>
                        <p className="body-md mb-6">Hubungi kami langsung untuk bantuan lebih lanjut</p>
                        <a
                            href="https://t.me/arra7trader"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary inline-flex"
                        >
                            <TelegramIcon className="mr-2" size="md" />
                            Hubungi via Telegram
                        </a>
                    </motion.div>
                </div>
            </section>

            {/* Footer Links */}
            <div className="py-6 text-center text-sm text-[var(--text-secondary)]">
                <Link href="/terms" className="hover:text-[var(--accent-blue)] transition-colors">Terms of Service</Link>
                <span className="mx-2">•</span>
                <Link href="/privacy" className="hover:text-[var(--accent-blue)] transition-colors">Privacy Policy</Link>
            </div>
        </div>
    );
}
