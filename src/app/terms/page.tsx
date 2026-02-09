'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pt-20">
            {/* Header */}
            <section className="section-padding text-center">
                <div className="container-apple">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <h1 className="headline-lg mb-4">
                            Terms of <span className="gradient-text">Service</span>
                        </h1>
                        <p className="body-md">
                            Terakhir diperbarui: 26 Desember 2024
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Content */}
            <section className="section-padding pt-0">
                <div className="container-apple">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-2xl border border-[var(--border-light)] p-8 prose max-w-none"
                    >
                        {/* Warning Box */}
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                            <p className="text-amber-800 font-semibold mb-2 flex items-center gap-2">
                                ⚠️ PERINGATAN RISIKO
                            </p>
                            <p className="text-amber-700 text-sm leading-relaxed">
                                Trading Forex dan Saham melibatkan risiko tinggi. Analisa ARRA7 bersifat edukatif, BUKAN saran investasi. Keputusan trading sepenuhnya tanggung jawab Anda.
                            </p>
                        </div>

                        {[
                            {
                                title: '1. Penerimaan Ketentuan',
                                content: 'Dengan menggunakan ARRA7, Anda menyetujui ketentuan ini. Jika tidak setuju, mohon untuk tidak menggunakan layanan kami.'
                            },
                            {
                                title: '2. Deskripsi Layanan',
                                content: 'ARRA7 menyediakan analisa pasar trading berbasis AI untuk Forex dan Saham Indonesia, termasuk rekomendasi entry, stop loss, take profit, dan confidence level.'
                            },
                            {
                                title: '3. Paket Berlangganan',
                                content: 'Tersedia paket: BASIC (gratis, 2x/hari), PRO (berbayar, 25x/hari), VVIP (berbayar, unlimited). Pembayaran di muka dan non-refundable.'
                            },
                            {
                                title: '4. Batasan Tanggung Jawab',
                                content: 'ARRA7 tidak bertanggung jawab atas kerugian finansial dari keputusan trading, ketidakakuratan data, atau gangguan layanan teknis.'
                            },
                            {
                                title: '5. Penggunaan yang Dilarang',
                                content: 'Dilarang: tujuan ilegal, menyebarluaskan konten tanpa izin, mengakses sistem secara tidak sah, menggunakan bot/scraper, berbagi akun.'
                            },
                            {
                                title: '6. Hukum yang Berlaku',
                                content: 'Ketentuan ini diatur sesuai hukum Republik Indonesia. Perselisihan diselesaikan melalui musyawarah atau pengadilan yang berwenang.'
                            },
                            {
                                title: '7. Kontak',
                                content: 'Untuk pertanyaan, hubungi kami via Telegram: @arra7trader'
                            }
                        ].map((section, i) => (
                            <section key={i} className="mb-6">
                                <h2 className="text-lg font-bold mb-2 text-[var(--text-primary)]">{section.title}</h2>
                                <p className="text-[var(--text-secondary)] leading-relaxed">{section.content}</p>
                            </section>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Footer Links */}
            <div className="py-6 text-center text-sm text-[var(--text-secondary)]">
                <Link href="/faq" className="hover:text-[var(--accent-blue)] transition-colors">FAQ</Link>
                <span className="mx-2">•</span>
                <Link href="/privacy" className="hover:text-[var(--accent-blue)] transition-colors">Privacy Policy</Link>
                <span className="mx-2">•</span>
                <Link href="/" className="hover:text-[var(--accent-blue)] transition-colors">Kembali ke Beranda</Link>
            </div>
        </div>
    );
}
