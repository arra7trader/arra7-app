'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { WarningIcon } from '@/components/PremiumIcons';

export default function TermsPage() {
    return (
        <div className="relative min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8">
            {/* Background */}
            <div className="absolute inset-0 bg-grid opacity-20" />
            <div className="bg-orb bg-orb-blue w-[600px] h-[600px] -top-40 left-1/4 opacity-20" />

            <div className="relative max-w-4xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <h1 className="text-3xl lg:text-4xl font-bold mb-3">
                        Terms of <span className="gradient-text">Service</span>
                    </h1>
                    <p className="text-[#94A3B8]">
                        Terakhir diperbarui: 26 Desember 2024
                    </p>
                </motion.div>

                {/* Content */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass rounded-2xl p-8 border border-[#1F2937] prose prose-invert max-w-none"
                >
                    <section className="mb-8">
                        <h2 className="text-xl font-bold mb-4 text-white">1. Penerimaan Ketentuan</h2>
                        <p className="text-[#94A3B8] leading-relaxed">
                            Dengan mengakses dan menggunakan website ARRA7 ("Layanan"), Anda menyetujui untuk terikat dengan Syarat dan Ketentuan ini. Jika Anda tidak menyetujui ketentuan ini, mohon untuk tidak menggunakan Layanan kami.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold mb-4 text-white">2. Deskripsi Layanan</h2>
                        <p className="text-[#94A3B8] leading-relaxed">
                            ARRA7 menyediakan layanan analisa pasar trading berbasis kecerdasan buatan (AI) untuk pasar Forex dan Saham Indonesia. Layanan ini meliputi:
                        </p>
                        <ul className="list-disc list-inside text-[#94A3B8] mt-2 space-y-1">
                            <li>Analisa teknikal dan fundamental berbasis AI</li>
                            <li>Rekomendasi entry, stop loss, dan take profit</li>
                            <li>Scoring dan confidence level analisa</li>
                            <li>Kalender ekonomi dan berita pasar</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold mb-4 text-white">3. Akun Pengguna</h2>
                        <p className="text-[#94A3B8] leading-relaxed">
                            Untuk menggunakan Layanan, Anda harus membuat akun menggunakan autentikasi Google. Anda bertanggung jawab untuk:
                        </p>
                        <ul className="list-disc list-inside text-[#94A3B8] mt-2 space-y-1">
                            <li>Menjaga kerahasiaan akun Anda</li>
                            <li>Semua aktivitas yang terjadi di bawah akun Anda</li>
                            <li>Memberikan informasi yang akurat dan terkini</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold mb-4 text-white">4. Paket Berlangganan</h2>
                        <p className="text-[#94A3B8] leading-relaxed">
                            Layanan tersedia dalam beberapa tingkat:
                        </p>
                        <ul className="list-disc list-inside text-[#94A3B8] mt-2 space-y-1">
                            <li><strong className="text-white">BASIC</strong>: Gratis, 2x analisa per hari</li>
                            <li><strong className="text-white">PRO</strong>: Berbayar, 25x analisa per hari</li>
                            <li><strong className="text-white">VVIP</strong>: Berbayar, unlimited analisa</li>
                        </ul>
                        <p className="text-[#94A3B8] mt-2">
                            Pembayaran dilakukan di muka dan tidak dapat dikembalikan (non-refundable).
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold mb-4 text-white">5. Disclaimer Investasi</h2>
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                            <p className="text-amber-400 font-semibold mb-2 flex items-center gap-2"><WarningIcon className="text-amber-400" size="md" /> PERINGATAN RISIKO</p>
                            <p className="text-[#94A3B8] leading-relaxed">
                                Trading Forex dan Saham melibatkan risiko tinggi dan mungkin tidak cocok untuk semua investor. Anda dapat kehilangan sebagian atau seluruh modal Anda. Analisa yang disediakan ARRA7 bersifat edukatif dan informatif, BUKAN merupakan saran investasi atau rekomendasi untuk membeli/menjual instrumen keuangan apapun.
                            </p>
                            <p className="text-[#94A3B8] leading-relaxed mt-2">
                                Keputusan investasi sepenuhnya merupakan tanggung jawab Anda sendiri. Kinerja masa lalu tidak menjamin hasil di masa depan. Selalu lakukan riset mandiri (DYOR - Do Your Own Research) sebelum mengambil keputusan trading.
                            </p>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold mb-4 text-white">6. Batasan Tanggung Jawab</h2>
                        <p className="text-[#94A3B8] leading-relaxed">
                            ARRA7 tidak bertanggung jawab atas:
                        </p>
                        <ul className="list-disc list-inside text-[#94A3B8] mt-2 space-y-1">
                            <li>Kerugian finansial akibat keputusan trading berdasarkan analisa kami</li>
                            <li>Ketidakakuratan atau keterlambatan data pasar</li>
                            <li>Gangguan layanan akibat faktor teknis di luar kendali kami</li>
                            <li>Kerugian tidak langsung, insidental, atau konsekuensial</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold mb-4 text-white">7. Penggunaan yang Dilarang</h2>
                        <p className="text-[#94A3B8] leading-relaxed">
                            Anda dilarang untuk:
                        </p>
                        <ul className="list-disc list-inside text-[#94A3B8] mt-2 space-y-1">
                            <li>Menggunakan Layanan untuk tujuan ilegal</li>
                            <li>Menyebarluaskan konten analisa tanpa izin</li>
                            <li>Mencoba mengakses sistem atau data secara tidak sah</li>
                            <li>Menggunakan bot atau scraper otomatis</li>
                            <li>Membagikan akun dengan pihak lain</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold mb-4 text-white">8. Hak Kekayaan Intelektual</h2>
                        <p className="text-[#94A3B8] leading-relaxed">
                            Semua konten, desain, logo, dan teknologi di ARRA7 merupakan hak milik kami atau pemberi lisensi kami. Anda tidak diperkenankan menyalin, memodifikasi, atau mendistribusikan tanpa izin tertulis.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold mb-4 text-white">9. Perubahan Ketentuan</h2>
                        <p className="text-[#94A3B8] leading-relaxed">
                            Kami berhak mengubah Syarat dan Ketentuan ini sewaktu-waktu. Perubahan akan berlaku efektif setelah dipublikasikan di website. Penggunaan berkelanjutan atas Layanan setelah perubahan berarti Anda menyetujui ketentuan yang diperbarui.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold mb-4 text-white">10. Hukum yang Berlaku</h2>
                        <p className="text-[#94A3B8] leading-relaxed">
                            Syarat dan Ketentuan ini diatur oleh dan ditafsirkan sesuai dengan hukum Republik Indonesia. Setiap perselisihan akan diselesaikan melalui musyawarah atau melalui pengadilan yang berwenang di Indonesia.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-4 text-white">11. Kontak</h2>
                        <p className="text-[#94A3B8] leading-relaxed">
                            Untuk pertanyaan mengenai Syarat dan Ketentuan ini, hubungi kami melalui:
                        </p>
                        <p className="text-[#94A3B8] mt-2">
                            Telegram: <a href="https://t.me/arra7trader" className="text-blue-400 hover:underline">@arra7trader</a>
                        </p>
                    </section>
                </motion.div>

                {/* Footer Links */}
                <div className="mt-8 text-center text-sm text-[#64748B]">
                    <Link href="/faq" className="hover:text-white transition-colors">FAQ</Link>
                    <span className="mx-2">•</span>
                    <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                    <span className="mx-2">•</span>
                    <Link href="/" className="hover:text-white transition-colors">Kembali ke Beranda</Link>
                </div>
            </div>
        </div>
    );
}
