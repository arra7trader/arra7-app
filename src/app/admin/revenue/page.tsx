'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface RevenueData {
    totalRevenue: number;
    monthlyRevenue: number;
    weeklyRevenue: number;
    todayRevenue: number;
    proCount: number;
    vvipCount: number;
    recentTransactions: Transaction[];
    monthlyStats: MonthStat[];
}

interface Transaction {
    id: string;
    userName: string;
    userEmail: string;
    membership: string;
    amount: number;
    date: string;
}

interface MonthStat {
    month: string;
    revenue: number;
    proCount: number;
    vvipCount: number;
}

const ADMIN_EMAILS = ['apmexplore@gmail.com'];

// Harga membership
const PRICES = {
    PRO: 99000,
    VVIP: 399000
};

export default function RevenueDashboard() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<RevenueData | null>(null);

    const isAdmin = session?.user?.email && ADMIN_EMAILS.includes(session.user.email);

    useEffect(() => {
        if (isAdmin) {
            fetchRevenueData();
        }
    }, [isAdmin]);

    const fetchRevenueData = async () => {
        try {
            const res = await fetch('/api/admin/revenue');
            const result = await res.json();
            if (result.status === 'success') {
                setData(result.data);
            }
        } catch (error) {
            console.error('Fetch revenue error:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-500 mb-2">🚫 Access Denied</h1>
                    <p className="text-gray-400">Admin only.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0B0C10] text-white pt-24 pb-12">
            <div className="max-w-6xl mx-auto px-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold">💰 Revenue Dashboard</h1>
                        <p className="text-gray-400 text-sm">Track pendapatan dari membership</p>
                    </div>
                    <Link href="/admin">
                        <button className="px-4 py-2 bg-[#1F2937] hover:bg-[#374151] rounded-lg text-sm">
                            ← Kembali
                        </button>
                    </Link>
                </div>

                {/* Main Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 rounded-xl p-5 border border-green-500/30"
                    >
                        <p className="text-sm text-green-400 mb-1">Total Revenue</p>
                        <p className="text-2xl font-bold text-white">{formatCurrency(data?.totalRevenue || 0)}</p>
                        <p className="text-xs text-gray-400 mt-1">All time</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-[#12141A] rounded-xl p-5 border border-[#1F2937]"
                    >
                        <p className="text-sm text-gray-400 mb-1">Bulan Ini</p>
                        <p className="text-2xl font-bold text-blue-400">{formatCurrency(data?.monthlyRevenue || 0)}</p>
                        <p className="text-xs text-gray-500 mt-1">{new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-[#12141A] rounded-xl p-5 border border-[#1F2937]"
                    >
                        <p className="text-sm text-gray-400 mb-1">Minggu Ini</p>
                        <p className="text-2xl font-bold text-purple-400">{formatCurrency(data?.weeklyRevenue || 0)}</p>
                        <p className="text-xs text-gray-500 mt-1">7 hari terakhir</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-[#12141A] rounded-xl p-5 border border-[#1F2937]"
                    >
                        <p className="text-sm text-gray-400 mb-1">Hari Ini</p>
                        <p className="text-2xl font-bold text-amber-400">{formatCurrency(data?.todayRevenue || 0)}</p>
                        <p className="text-xs text-gray-500 mt-1">{new Date().toLocaleDateString('id-ID')}</p>
                    </motion.div>
                </div>

                {/* Membership Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* PRO Stats */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-[#12141A] rounded-2xl p-6 border border-[#1F2937]"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                <span className="text-2xl">💎</span>
                            </div>
                            <div>
                                <h3 className="font-semibold">PRO Members</h3>
                                <p className="text-sm text-gray-400">{formatCurrency(PRICES.PRO)} / bulan</p>
                            </div>
                        </div>
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-4xl font-bold text-blue-400">{data?.proCount || 0}</p>
                                <p className="text-sm text-gray-500">total members</p>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-semibold text-green-400">
                                    {formatCurrency((data?.proCount || 0) * PRICES.PRO)}
                                </p>
                                <p className="text-xs text-gray-500">potential monthly</p>
                            </div>
                        </div>
                    </motion.div>

                    {/* VVIP Stats */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-[#12141A] rounded-2xl p-6 border border-[#1F2937]"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                                <span className="text-2xl">👑</span>
                            </div>
                            <div>
                                <h3 className="font-semibold">VVIP Members</h3>
                                <p className="text-sm text-gray-400">{formatCurrency(PRICES.VVIP)} / bulan</p>
                            </div>
                        </div>
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-4xl font-bold text-amber-400">{data?.vvipCount || 0}</p>
                                <p className="text-sm text-gray-500">total members</p>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-semibold text-green-400">
                                    {formatCurrency((data?.vvipCount || 0) * PRICES.VVIP)}
                                </p>
                                <p className="text-xs text-gray-500">potential monthly</p>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Monthly Chart Placeholder */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#12141A] rounded-2xl p-6 border border-[#1F2937] mb-8"
                >
                    <h3 className="font-semibold mb-4">📊 Revenue Trend</h3>
                    <div className="h-48 flex items-end justify-between gap-2">
                        {(data?.monthlyStats || []).slice(-6).map((stat, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center">
                                <div
                                    className="w-full bg-gradient-to-t from-blue-500 to-purple-500 rounded-t-lg transition-all"
                                    style={{
                                        height: `${Math.max(20, (stat.revenue / Math.max(...(data?.monthlyStats || []).map(s => s.revenue), 1)) * 150)}px`
                                    }}
                                />
                                <p className="text-xs text-gray-500 mt-2">{stat.month}</p>
                                <p className="text-xs text-gray-400">{formatCurrency(stat.revenue).replace('Rp', '')}</p>
                            </div>
                        ))}
                        {(!data?.monthlyStats || data.monthlyStats.length === 0) && (
                            <div className="w-full text-center text-gray-500 py-16">
                                Belum ada data revenue
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Recent Transactions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#12141A] rounded-2xl border border-[#1F2937] overflow-hidden"
                >
                    <div className="p-6 border-b border-[#1F2937]">
                        <h3 className="font-semibold">📋 Recent Upgrades</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[#0B0C10]">
                                <tr>
                                    <th className="text-left p-4 text-sm text-gray-400">User</th>
                                    <th className="text-left p-4 text-sm text-gray-400">Membership</th>
                                    <th className="text-left p-4 text-sm text-gray-400">Amount</th>
                                    <th className="text-left p-4 text-sm text-gray-400">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(data?.recentTransactions || []).map((tx, i) => (
                                    <tr key={tx.id || i} className="border-t border-[#1F2937]">
                                        <td className="p-4">
                                            <p className="font-medium">{tx.userName || 'User'}</p>
                                            <p className="text-xs text-gray-500">{tx.userEmail}</p>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${tx.membership === 'VVIP'
                                                    ? 'bg-amber-500/20 text-amber-400'
                                                    : 'bg-blue-500/20 text-blue-400'
                                                }`}>
                                                {tx.membership}
                                            </span>
                                        </td>
                                        <td className="p-4 text-green-400 font-medium">
                                            {formatCurrency(tx.amount)}
                                        </td>
                                        <td className="p-4 text-sm text-gray-400">
                                            {new Date(tx.date).toLocaleDateString('id-ID')}
                                        </td>
                                    </tr>
                                ))}
                                {(!data?.recentTransactions || data.recentTransactions.length === 0) && (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-gray-500">
                                            Belum ada transaksi upgrade
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>

                {/* Quick Stats Footer */}
                <div className="mt-8 p-4 bg-[#12141A] rounded-xl border border-[#1F2937] flex items-center justify-between flex-wrap gap-4">
                    <div className="text-sm text-gray-400">
                        💡 PRO: {formatCurrency(PRICES.PRO)} | VVIP: {formatCurrency(PRICES.VVIP)}
                    </div>
                    <button
                        onClick={fetchRevenueData}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm"
                    >
                        🔄 Refresh Data
                    </button>
                </div>
            </div>
        </div>
    );
}
