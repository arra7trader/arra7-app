'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';

const ADMIN_EMAILS = ['apmexplore@gmail.com'];

interface CRMData {
    memberStats: {
        total: number;
        basic: number;
        pro: number;
        vvip: number;
        active: number;
    };
    revenueStats: {
        mrr: number;
        proRevenue: number;
        vvipRevenue: number;
        paidMembers: number;
        today: number;
        thisMonth: number;
    };
    retentionAlerts: {
        expiringSoon: Array<{
            id: string;
            email: string;
            name: string;
            membership: string;
            expiresAt: string;
        }>;
        inactive: Array<{
            id: string;
            email: string;
            name: string;
            membership: string;
            lastLoginAt: string;
        }>;
        counts: {
            expiring: number;
            inactive: number;
        };
    };
    metrics: {
        recentSignups: number;
        conversionRate: string;
        churnRisk: number;
    };
}

export default function CRMDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [data, setData] = useState<CRMData | null>(null);
    const [loading, setLoading] = useState(true);

    const isAdmin = session?.user?.email && ADMIN_EMAILS.includes(session.user.email);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login?callbackUrl=/admin/crm');
        } else if (status === 'authenticated' && !isAdmin) {
            router.push('/');
        } else if (status === 'authenticated' && isAdmin) {
            fetchCRMData();
        }
    }, [status, isAdmin, router]);

    const fetchCRMData = async () => {
        try {
            const res = await fetch('/api/admin/crm/stats');
            const result = await res.json();
            if (result.status === 'success') {
                setData(result.data);
            }
        } catch (error) {
            console.error('Failed to fetch CRM data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAdmin) return null;

    return (
        <div className="relative min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8">
            <div className="absolute inset-0 bg-grid opacity-20" />
            <div className="bg-orb bg-orb-blue w-[600px] h-[600px] -top-40 left-1/4 opacity-20" />
            <div className="bg-orb bg-orb-purple w-[500px] h-[500px] bottom-0 right-1/4 opacity-15" />

            <div className="relative max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between mb-8"
                >
                    <div>
                        <h1 className="text-3xl font-bold">
                            📊 Member <span className="gradient-text">CRM</span>
                        </h1>
                        <p className="text-[#94A3B8]">Kelola member, pantau revenue, tingkatkan retention</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={fetchCRMData}
                            className="px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-sm font-medium transition-all"
                        >
                            🔄 Refresh
                        </button>
                        <Link href="/admin">
                            <button className="px-4 py-2 bg-[#1F2937] hover:bg-[#374151] rounded-lg text-sm">
                                ← Admin
                            </button>
                        </Link>
                    </div>
                </motion.div>

                {/* Member Stats Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8"
                >
                    <div className="glass rounded-xl p-5 border border-[#1F2937]">
                        <p className="text-sm text-[#64748B] mb-1">Total Member</p>
                        <p className="text-3xl font-bold">{data?.memberStats.total || 0}</p>
                    </div>
                    <div className="glass rounded-xl p-5 border border-[#1F2937]">
                        <p className="text-sm text-[#64748B] mb-1">BASIC</p>
                        <p className="text-3xl font-bold text-slate-400">{data?.memberStats.basic || 0}</p>
                    </div>
                    <div className="glass rounded-xl p-5 border border-[#1F2937]">
                        <p className="text-sm text-[#64748B] mb-1">PRO</p>
                        <p className="text-3xl font-bold text-blue-400">{data?.memberStats.pro || 0}</p>
                    </div>
                    <div className="glass rounded-xl p-5 border border-[#1F2937]">
                        <p className="text-sm text-[#64748B] mb-1">VVIP</p>
                        <p className="text-3xl font-bold text-amber-400">{data?.memberStats.vvip || 0}</p>
                    </div>
                    <div className="glass rounded-xl p-5 border border-[#1F2937]">
                        <p className="text-sm text-[#64748B] mb-1">Conversion</p>
                        <p className="text-3xl font-bold gradient-text">{data?.metrics.conversionRate || 0}%</p>
                    </div>
                </motion.div>

                {/* Revenue + Alerts Row */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    {/* Revenue Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="glass rounded-2xl border border-[#1F2937] p-6"
                    >
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            💰 Revenue Overview
                        </h2>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-[#94A3B8]">Monthly Recurring (MRR)</span>
                                <span className="text-2xl font-bold text-green-400">
                                    {formatCurrency(data?.revenueStats.mrr || 0)}
                                </span>
                            </div>
                            <div className="h-px bg-[#1F2937]" />
                            <div className="flex justify-between items-center">
                                <span className="text-[#94A3B8]">PRO Members ({data?.memberStats.pro || 0})</span>
                                <span className="font-semibold text-blue-400">
                                    {formatCurrency(data?.revenueStats.proRevenue || 0)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[#94A3B8]">VVIP Members ({data?.memberStats.vvip || 0})</span>
                                <span className="font-semibold text-amber-400">
                                    {formatCurrency(data?.revenueStats.vvipRevenue || 0)}
                                </span>
                            </div>
                            <div className="h-px bg-[#1F2937]" />
                            <div className="flex justify-between items-center">
                                <span className="text-[#94A3B8]">Paid Members</span>
                                <span className="font-semibold">{data?.revenueStats.paidMembers || 0}</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Alerts Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="glass rounded-2xl border border-[#1F2937] p-6"
                    >
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            ⚠️ Attention Needed
                        </h2>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">⏰</span>
                                    <div>
                                        <p className="font-semibold text-amber-400">Expiring Soon</p>
                                        <p className="text-sm text-[#94A3B8]">Member akan expired 7 hari</p>
                                    </div>
                                </div>
                                <span className="text-2xl font-bold text-amber-400">
                                    {data?.retentionAlerts.counts.expiring || 0}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">😴</span>
                                    <div>
                                        <p className="font-semibold text-red-400">Inactive Members</p>
                                        <p className="text-sm text-[#94A3B8]">Tidak login 7+ hari</p>
                                    </div>
                                </div>
                                <span className="text-2xl font-bold text-red-400">
                                    {data?.retentionAlerts.counts.inactive || 0}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">🆕</span>
                                    <div>
                                        <p className="font-semibold text-green-400">New Signups</p>
                                        <p className="text-sm text-[#94A3B8]">7 hari terakhir</p>
                                    </div>
                                </div>
                                <span className="text-2xl font-bold text-green-400">
                                    {data?.metrics.recentSignups || 0}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Expiring Members List */}
                {data?.retentionAlerts.expiringSoon && data.retentionAlerts.expiringSoon.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="glass rounded-2xl border border-amber-500/30 p-6 mb-8"
                    >
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-amber-400">
                            🔔 Members Expiring Soon
                        </h2>
                        <div className="space-y-2">
                            {data.retentionAlerts.expiringSoon.map((user) => (
                                <div key={user.id} className="flex items-center justify-between p-3 bg-[#12141A] rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                                            {(user.name || user.email)?.[0]?.toUpperCase() || '?'}
                                        </div>
                                        <div>
                                            <p className="font-medium">{user.name || 'No Name'}</p>
                                            <p className="text-sm text-[#64748B]">{user.email}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${user.membership === 'VVIP'
                                                ? 'bg-amber-500/20 text-amber-400'
                                                : 'bg-blue-500/20 text-blue-400'
                                            }`}>
                                            {user.membership}
                                        </span>
                                        <p className="text-sm text-amber-400 mt-1">
                                            Expires: {formatDate(user.expiresAt)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Inactive Members List */}
                {data?.retentionAlerts.inactive && data.retentionAlerts.inactive.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="glass rounded-2xl border border-red-500/30 p-6"
                    >
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-red-400">
                            😴 Inactive Members (7+ days)
                        </h2>
                        <div className="space-y-2">
                            {data.retentionAlerts.inactive.slice(0, 5).map((user) => (
                                <div key={user.id} className="flex items-center justify-between p-3 bg-[#12141A] rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-bold">
                                            {(user.name || user.email)?.[0]?.toUpperCase() || '?'}
                                        </div>
                                        <div>
                                            <p className="font-medium">{user.name || 'No Name'}</p>
                                            <p className="text-sm text-[#64748B]">{user.email}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${user.membership === 'VVIP'
                                                ? 'bg-amber-500/20 text-amber-400'
                                                : 'bg-blue-500/20 text-blue-400'
                                            }`}>
                                            {user.membership}
                                        </span>
                                        <p className="text-sm text-red-400 mt-1">
                                            Last: {formatDate(user.lastLoginAt)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
