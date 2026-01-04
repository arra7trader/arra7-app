'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function PrivacyPage() {
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
                            Privacy <span className="gradient-text">Policy</span>
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
                        {[
                            {
                                title: '1. Pendahuluan',
                                content: 'ARRA7 berkomitmen untuk melindungi privasi Anda. Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi informasi pribadi Anda.'
                            },
                            {
                                title: '2. Informasi yang Kami Kumpulkan',
                                content: 'Kami mengumpulkan: Informasi akun Google (nama, email, foto profil), data penggunaan (riwayat analisa, kuota), dan data teknis (IP, browser, waktu akses).'
                            },
                            {
                                title: '3. Penggunaan Informasi',
                                content: 'Informasi digunakan untuk: menyediakan layanan, mengelola akun dan membership, menghitung kuota, mengirim notifikasi, meningkatkan kualitas, dan mencegah penyalahgunaan.'
                            },
                            {
                                title: '4. Penyimpanan Data',
                                content: 'Data disimpan dengan aman menggunakan Turso Database, hosting di Vercel dengan enkripsi SSL/TLS, dan autentikasi terenkripsi via Google OAuth. Kami tidak menyimpan password Anda.'
                            },
                            {
                                title: '5. Berbagi Informasi',
                                content: 'Kami TIDAK menjual atau membagikan informasi pribadi Anda kepada pihak ketiga, kecuali diwajibkan oleh hukum atau dengan persetujuan eksplisit Anda.'
                            },
                            {
                                title: '6. Cookies',
                                content: 'Kami menggunakan cookies untuk menjaga sesi login, menyimpan preferensi bahasa, dan mengukur penggunaan layanan.'
                            },
                            {
                                title: '7. Hak Pengguna',
                                content: 'Anda berhak mengakses, mengoreksi, menghapus, atau membatasi pemrosesan data Anda. Hubungi kami via Telegram @arra7trader.'
                            },
                            {
                                title: '8. Kontak',
                                content: 'Untuk pertanyaan terkait privasi, hubungi kami via Telegram: @arra7trader'
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
                <Link href="/terms" className="hover:text-[var(--accent-blue)] transition-colors">Terms of Service</Link>
                <span className="mx-2">•</span>
                <Link href="/" className="hover:text-[var(--accent-blue)] transition-colors">Kembali ke Beranda</Link>
            </div>
        </div>
    );
}
