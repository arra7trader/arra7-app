'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { CheckIcon, SparklesIcon, ArrowRightIcon } from '@/components/PremiumIcons';
import ProviderCard from '@/components/copytrade/ProviderCard';

export default function CopyTradeHub() {
    const { data: session, status } = useSession();
    const isLoading = status === 'loading';
    const [providers, setProviders] = useState<any[]>([]);
    const [fetchingProviders, setFetchingProviders] = useState(true);

    // Extract subscription data
    const subscriptionStatus = session?.user?.subscriptionStatus || 'free';
    const isActive = subscriptionStatus === 'active';

    useEffect(() => {
        const fetchProviders = async () => {
            try {
                const res = await fetch('/api/copytrade/providers');
                const data = await res.json();
                if (data.providers) {
                    setProviders(data.providers);
                }
            } catch (err) {
                console.error('Failed to fetch providers', err);
            } finally {
                setFetchingProviders(false);
            }
        };

        fetchProviders();
    }, []);

    return (
        <main className="min-h-screen bg-[#fafbfc] text-slate-900 pb-20">
            <Navbar />

            <div className="pt-28 container mx-auto px-4 max-w-6xl">

                {/* --- HEADER & HERO SECTION --- */}
                <div className="flex flex-col md:flex-row gap-8 items-center mb-16">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex-1"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-4 border border-blue-100">
                            <SparklesIcon size="xs" /> ARRA7 Premium Signals
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 leading-tight">
                            Signal <span className="text-blue-600">Marketplace</span>
                        </h1>
                        <p className="text-slate-600 text-lg mb-8 max-w-xl leading-relaxed">
                            Temukan sinyal trading berakurasi tinggi dari para profesional. Ikuti Master favorit Anda secara gratis dan akses sinyal premium hanya saat Anda membutuhkannya dengan Koin ARRA.
                        </p>

                        <div className="flex flex-wrap gap-4">
                            {!session ? (
                                <button
                                    onClick={() => signIn()}
                                    className="px-6 py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-600/20"
                                >
                                    Login untuk Memulai
                                </button>
                            ) : (
                                <>
                                    <Link href="/copytrade/dashboard">
                                        <button className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-md shadow-blue-600/20 flex items-center gap-2">
                                            Masuk Signal Feed <ArrowRightIcon size="sm" />
                                        </button>
                                    </Link>
                                    <Link href="/copytrade/become-provider">
                                        <button className="px-6 py-3.5 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 rounded-xl font-bold transition">
                                            Daftar Jadi Provider
                                        </button>
                                    </Link>
                                </>
                            )}
                        </div>
                    </motion.div>

                    {/* --- HOW IT WORKS (CARA KERJA) --- */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="w-full md:w-[400px] bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/50"
                    >
                        <h3 className="text-lg font-extrabold text-slate-900 mb-6 flex items-center gap-2">
                            <span>💡</span> Cara Kerja
                        </h3>

                        <ul className="space-y-6 relative before:content-[''] before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                            {[
                                { step: 1, title: 'Pilih Master', desc: 'Cari trader dengan akurasi dan profit konsisten di bawah.' },
                                { step: 2, title: 'Ikuti (Gratis)', desc: 'Klik Follow untuk mendapatkan notifikasi instan saat Master posting.' },
                                { step: 3, title: 'Buka Sinyal Pilihan', desc: 'Buka gembok sinyal yang Anda sukai menggunakan Koin ARRA.' },
                                { step: 4, title: 'Eksekusi & Profit', desc: 'Salin Entry, SL, dan TP ke MT4/MT5 Anda dan nikmati hasilnya!' }
                            ].map((item, idx) => (
                                <li key={idx} className="relative pl-10">
                                    <div className="absolute left-0 top-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center border-4 border-white shadow-sm">
                                        {item.step}
                                    </div>
                                    <h4 className="font-bold text-slate-900 text-sm mb-1">{item.title}</h4>
                                    <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                </div>

                <hr className="border-slate-200 mb-16" />

                {/* --- MARKETPLACE SECTION --- */}
                <div className="mb-8 flex items-end justify-between">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Master Traders</h2>
                        <p className="text-slate-500">Pilih ahli strategi dengan performa terbaik dan dapatkan sinyal premium mereka.</p>
                    </div>
                </div>

                {fetchingProviders ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-2xl border border-slate-200" />
                        ))}
                    </div>
                ) : providers.length === 0 ? (
                    <div className="text-center py-24 bg-white border-2 border-dashed border-slate-200 rounded-3xl">
                        <div className="text-5xl mb-4">🔍</div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Belum ada Provider Aktif</h3>
                        <p className="text-slate-500 max-w-md mx-auto">
                            Saat ini belum ada trader publik yang membagikan sinyal mereka. Jadilah yang pertama dan bangun pengikut Anda!
                        </p>
                        <Link href="/copytrade/become-provider">
                            <button className="mt-6 px-6 py-3 bg-slate-900 hover:bg-blue-600 text-white rounded-xl font-bold transition shadow-md">
                                Mulai Jadi Provider
                            </button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {providers.map((provider: any, i: number) => (
                            <motion.div
                                key={provider.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                            >
                                <ProviderCard provider={provider} />
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
