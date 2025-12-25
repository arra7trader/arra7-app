'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function PrivacyPage() {
    return (
        <div className="relative min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8">
            {/* Background */}
            <div className="absolute inset-0 bg-grid opacity-20" />
            <div className="bg-orb bg-orb-purple w-[600px] h-[600px] -top-40 right-1/4 opacity-20" />

            <div className="relative max-w-4xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <h1 className="text-3xl lg:text-4xl font-bold mb-3">
                        Privacy <span className="gradient-text">Policy</span>
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
                        <h2 className="text-xl font-bold mb-4 text-white">1. Pendahuluan</h2>
                        <p className="text-[#94A3B8] leading-relaxed">
                            ARRA7 ("kami", "kita") berkomitmen untuk melindungi privasi Anda. Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi informasi pribadi Anda ketika menggunakan layanan kami.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold mb-4 text-white">2. Informasi yang Kami Kumpulkan</h2>
                        <p className="text-[#94A3B8] leading-relaxed">
                            Kami mengumpulkan informasi berikut:
                        </p>

                        <h3 className="text-lg font-semibold mt-4 mb-2 text-white">a. Informasi Akun Google</h3>
                        <ul className="list-disc list-inside text-[#94A3B8] space-y-1">
                            <li>Nama lengkap</li>
                            <li>Alamat email</li>
                            <li>Foto profil</li>
                        </ul>

                        <h3 className="text-lg font-semibold mt-4 mb-2 text-white">b. Data Penggunaan</h3>
                        <ul className="list-disc list-inside text-[#94A3B8] space-y-1">
                            <li>Riwayat analisa yang diminta</li>
                            <li>Kuota penggunaan harian</li>
                            <li>Tanggal pendaftaran</li>
                            <li>Status dan durasi membership</li>
                        </ul>

                        <h3 className="text-lg font-semibold mt-4 mb-2 text-white">c. Data Teknis</h3>
                        <ul className="list-disc list-inside text-[#94A3B8] space-y-1">
                            <li>Alamat IP</li>
                            <li>Jenis browser dan perangkat</li>
                            <li>Halaman yang dikunjungi</li>
                            <li>Waktu akses</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold mb-4 text-white">3. Penggunaan Informasi</h2>
                        <p className="text-[#94A3B8] leading-relaxed">
                            Kami menggunakan informasi Anda untuk:
                        </p>
                        <ul className="list-disc list-inside text-[#94A3B8] mt-2 space-y-1">
                            <li>Menyediakan dan memelihara layanan</li>
                            <li>Mengelola akun dan membership Anda</li>
                            <li>Menghitung dan menerapkan kuota penggunaan</li>
                            <li>Mengirim notifikasi terkait layanan</li>
                            <li>Meningkatkan kualitas layanan</li>
                            <li>Mencegah penyalahgunaan</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold mb-4 text-white">4. Penyimpanan Data</h2>
                        <p className="text-[#94A3B8] leading-relaxed">
                            Data Anda disimpan dengan aman menggunakan:
                        </p>
                        <ul className="list-disc list-inside text-[#94A3B8] mt-2 space-y-1">
                            <li>Turso Database (SQLite berbasis cloud)</li>
                            <li>Hosting di Vercel dengan enkripsi SSL/TLS</li>
                            <li>Autentikasi terenkripsi via Google OAuth</li>
                        </ul>
                        <p className="text-[#94A3B8] mt-2">
                            Kami tidak menyimpan password Anda karena menggunakan autentikasi Google.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold mb-4 text-white">5. Berbagi Informasi</h2>
                        <p className="text-[#94A3B8] leading-relaxed">
                            Kami TIDAK menjual, menyewakan, atau membagikan informasi pribadi Anda kepada pihak ketiga, kecuali:
                        </p>
                        <ul className="list-disc list-inside text-[#94A3B8] mt-2 space-y-1">
                            <li>Jika diwajibkan oleh hukum</li>
                            <li>Untuk melindungi hak dan keamanan kami</li>
                            <li>Dengan persetujuan eksplisit Anda</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold mb-4 text-white">6. Cookies</h2>
                        <p className="text-[#94A3B8] leading-relaxed">
                            Kami menggunakan cookies untuk:
                        </p>
                        <ul className="list-disc list-inside text-[#94A3B8] mt-2 space-y-1">
                            <li>Menjaga sesi login Anda</li>
                            <li>Menyimpan preferensi bahasa</li>
                            <li>Mengukur penggunaan layanan</li>
                        </ul>
                        <p className="text-[#94A3B8] mt-2">
                            Anda dapat menonaktifkan cookies melalui pengaturan browser, namun beberapa fitur mungkin tidak berfungsi optimal.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold mb-4 text-white">7. Keamanan Data</h2>
                        <p className="text-[#94A3B8] leading-relaxed">
                            Kami menerapkan langkah-langkah keamanan untuk melindungi data Anda:
                        </p>
                        <ul className="list-disc list-inside text-[#94A3B8] mt-2 space-y-1">
                            <li>Enkripsi data saat transit (HTTPS/SSL)</li>
                            <li>Akses terbatas ke database</li>
                            <li>Autentikasi OAuth 2.0</li>
                            <li>Monitoring keamanan berkala</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold mb-4 text-white">8. Hak Pengguna</h2>
                        <p className="text-[#94A3B8] leading-relaxed">
                            Anda memiliki hak untuk:
                        </p>
                        <ul className="list-disc list-inside text-[#94A3B8] mt-2 space-y-1">
                            <li><strong className="text-white">Akses</strong>: Meminta salinan data pribadi Anda</li>
                            <li><strong className="text-white">Koreksi</strong>: Meminta perbaikan data yang tidak akurat</li>
                            <li><strong className="text-white">Penghapusan</strong>: Meminta penghapusan akun dan data Anda</li>
                            <li><strong className="text-white">Pembatasan</strong>: Membatasi pemrosesan data tertentu</li>
                        </ul>
                        <p className="text-[#94A3B8] mt-2">
                            Untuk menggunakan hak-hak ini, hubungi kami via Telegram @arra7trader.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold mb-4 text-white">9. Retensi Data</h2>
                        <p className="text-[#94A3B8] leading-relaxed">
                            Kami menyimpan data Anda selama akun Anda aktif atau selama diperlukan untuk menyediakan layanan. Jika Anda meminta penghapusan akun, data akan dihapus dalam 30 hari kecuali diwajibkan untuk disimpan oleh hukum.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold mb-4 text-white">10. Perubahan Kebijakan</h2>
                        <p className="text-[#94A3B8] leading-relaxed">
                            Kami dapat memperbarui Kebijakan Privasi ini sewaktu-waktu. Perubahan signifikan akan diinformasikan melalui website atau email. Tanggal "Terakhir diperbarui" di bagian atas menunjukkan revisi terbaru.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-4 text-white">11. Kontak</h2>
                        <p className="text-[#94A3B8] leading-relaxed">
                            Untuk pertanyaan atau permintaan terkait privasi, hubungi kami:
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
                    <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                    <span className="mx-2">•</span>
                    <Link href="/" className="hover:text-white transition-colors">Kembali ke Beranda</Link>
                </div>
            </div>
        </div>
    );
}
