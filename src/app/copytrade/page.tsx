'use client';

import { useSession, signIn } from 'next-auth/react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { CheckIcon, SparklesIcon } from '@/components/PremiumIcons';

export default function CopyTradeDashboard() {
    const { data: session, status } = useSession();
    const isLoading = status === 'loading';

    // Extract subscription data
    const subscriptionStatus = session?.user?.subscriptionStatus || 'free';
    const subscriptionEndDate = session?.user?.subscriptionEndDate;
    const telegramChatId = session?.user?.telegramChatId;
    const isActive = subscriptionStatus === 'active';

    // Format date
    const formattedDate = subscriptionEndDate
        ? new Date(subscriptionEndDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
        : '-';

    // Calculate days remaining
    const daysRemaining = subscriptionEndDate
        ? Math.ceil((new Date(subscriptionEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    return (
        <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
            <Navbar />

            <div className="pt-28 pb-20 container mx-auto px-4 max-w-4xl">

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-12"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/10 text-teal-600 text-sm font-semibold mb-4 border border-teal-500/20">
                        <SparklesIcon size="xs" />
                        Exclusive AI Genesis
                    </div>
                    <h1 className="text-3xl md:text-5xl font-bold mb-4">
                        My Copytrade Dashboard
                    </h1>
                    <p className="text-[var(--text-secondary)] text-lg">
                        Manage your AI Copytrade subscription and signal status.
                    </p>
                </motion.div>

                {/* Loading State */}
                {isLoading && (
                    <div className="flex justify-center py-20">
                        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}

                {/* Unauthenticated State */}
                {!isLoading && !session && (
                    <div className="bg-white rounded-3xl p-8 border border-gray-200 text-center shadow-sm">
                        <h2 className="text-xl font-bold mb-4">Please Login</h2>
                        <p className="text-gray-500 mb-6">You need to be logged in to view your dashboard.</p>
                        <button
                            onClick={() => signIn()}
                            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition"
                        >
                            Login Now
                        </button>
                    </div>
                )}

                {/* Authenticated State */}
                {!isLoading && session && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                        {/* Status Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="md:col-span-2 bg-gradient-to-br from-white to-gray-50 rounded-3xl p-8 border border-gray-200 shadow-sm relative overflow-hidden"
                        >
                            <h3 className="text-lg font-bold text-gray-500 mb-6 uppercase tracking-wider">Subscription Status</h3>

                            <div className="flex items-center gap-4 mb-8">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm
                                    ${isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                    {isActive ? '✅' : '🔒'}
                                </div>
                                <div>
                                    <div className={`text-3xl font-black ${isActive ? 'text-green-600' : 'text-gray-800'}`}>
                                        {isActive ? 'ACTIVE' : subscriptionStatus === 'expired' ? 'EXPIRED' : 'INACTIVE'}
                                    </div>
                                    <p className="text-gray-500 text-sm">
                                        {isActive
                                            ? `Valid until ${formattedDate}`
                                            : 'You do not have an active subscription.'}
                                    </p>
                                </div>
                            </div>

                            {isActive ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                                🗓️
                                            </div>
                                            <div>
                                                <div className="text-xs text-gray-400 font-bold uppercase">Days Remaining</div>
                                                <div className="font-bold text-gray-800">{daysRemaining} Days</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center 
                                                ${telegramChatId ? 'bg-blue-500 text-white' : 'bg-yellow-100 text-yellow-600'}`}>
                                                ✈️
                                            </div>
                                            <div>
                                                <div className="text-xs text-gray-400 font-bold uppercase">Telegram Connection</div>
                                                <div className="font-bold text-gray-800">
                                                    {telegramChatId ? 'Connected' : 'Not Connected'}
                                                </div>
                                            </div>
                                        </div>
                                        {telegramChatId && (
                                            <div className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                                                ID: {telegramChatId}
                                            </div>
                                        )}
                                    </div>

                                    {!telegramChatId && (
                                        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-100 rounded-xl text-sm text-yellow-800">
                                            <strong>Action Required:</strong> Please contact Admin (@admin) to connect your Telegram ID and start receiving signals.
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <p className="text-gray-600 mb-6 leading-relaxed">
                                        Unlock automated XAUUSD signals with 90%+ accuracy.
                                        Join the AI Genesis Exclusive Copytrade program today.
                                    </p>
                                    <Link href="/pricing#copytrade">
                                        <button className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-600 hover:to-emerald-700 text-white rounded-xl font-bold transition shadow-lg shadow-teal-500/20">
                                            Subscribe Now - Rp 49K/mo
                                        </button>
                                    </Link>
                                </div>
                            )}
                        </motion.div>

                        {/* Recent Signals / Info Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm flex flex-col h-full"
                        >
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Latest Performance</h3>

                            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-gray-50 rounded-2xl mb-4 border border-dashed border-gray-200">
                                <span className="text-4xl">🚀</span>
                                <h4 className="font-bold text-gray-900 mt-2">AI Genesis</h4>
                                <div className="text-2xl font-black text-green-500 my-2">+1,240 Pips</div>
                                <p className="text-xs text-gray-500">Last 30 Days Performance</p>
                            </div>

                            <ul className="space-y-3 text-sm text-gray-600">
                                <li className="flex items-center gap-2">
                                    <CheckIcon size="xs" className="text-green-500" />
                                    <span>Real-time Execution</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckIcon size="xs" className="text-green-500" />
                                    <span>Stop Loss Protection</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckIcon size="xs" className="text-green-500" />
                                    <span>Compound Growth Logic</span>
                                </li>
                            </ul>
                        </motion.div>
                    </div>
                )}
            </div>
        </main>
    );
}
