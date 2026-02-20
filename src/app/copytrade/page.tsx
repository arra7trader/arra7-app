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
                            <SparklesIcon size="xs" /> ARRA7 Social Trading
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 leading-tight">
                            Copy Trade <span className="text-blue-600">Hub</span>
                        </h1>
                        <p className="text-slate-600 text-lg mb-8 max-w-xl leading-relaxed">
                            Temukan trader profesional untuk disalin secara otomatis, atau jadilah penyedia sinyal dan dapatkan penghasilan tambahan dari follower Anda.
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
                                            Masuk Dashboard Saya <ArrowRightIcon size="sm" />
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

                    {/* --- AI GENESIS PREMIUM CARD --- */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="w-full md:w-[400px] bg-gradient-to-br from-emerald-50 to-teal-100/50 rounded-3xl p-8 border border-emerald-100 shadow-xl shadow-emerald-900/5 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-xl">
                            Official ARRA7
                        </div>

                        <div className="flex items-center gap-3 mb-6 mt-2">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center text-white text-2xl shadow-md">
                                🚀
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900">AI Genesis</h3>
                                <div className="text-emerald-600 text-sm font-bold flex items-center gap-1">
                                    <SparklesIcon size="xs" /> Automated Trading
                                </div>
                            </div>
                        </div>

                        <div className="flex items-baseline gap-2 mb-6">
                            <span className="text-4xl font-black text-emerald-600">+1,240</span>
                            <span className="text-slate-500 font-medium">Pips / 30 Hari</span>
                        </div>

                        <ul className="space-y-3 text-sm text-slate-700 mb-8 font-medium">
                            <li className="flex items-center gap-3">
                                <CheckIcon size="xs" className="text-emerald-500" /> Eksekusi instan 24/5
                            </li>
                            <li className="flex items-center gap-3">
                                <CheckIcon size="xs" className="text-emerald-500" /> Stop Loss protection dinamis
                            </li>
                            <li className="flex items-center gap-3">
                                <CheckIcon size="xs" className="text-emerald-500" /> Compound Growth Logic
                            </li>
                        </ul>

                        {isActive ? (
                            <Link href="/copytrade/dashboard">
                                <button className="w-full py-3 bg-white text-emerald-700 border border-emerald-200 rounded-xl font-bold transition hover:bg-emerald-50 shadow-sm flex items-center justify-center gap-2">
                                    <span className="text-emerald-500">✅</span> Langganan Aktif
                                </button>
                            </Link>
                        ) : (
                            <Link href="/pricing#copytrade">
                                <button className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow-lg shadow-emerald-600/20">
                                    Langganan Sekarang - Rp 49k
                                </button>
                            </Link>
                        )}
                    </motion.div>
                </div>

                <hr className="border-slate-200 mb-16" />

                {/* --- MARKETPLACE SECTION --- */}
                <div className="mb-8 flex items-end justify-between">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Marketplace Provider</h2>
                        <p className="text-slate-500">Pilih trader profesional dengan performa terbaik untuk disalin.</p>
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
