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
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
                <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAdmin) return null;

    return (
        <div className="relative min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8 bg-[var(--bg-primary)]">
            <div className="relative max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between mb-8"
                >
                    <div>
                        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
                            📊 Member <span className="gradient-text">CRM</span>
                        </h1>
                        <p className="text-[var(--text-secondary)]">Kelola member, pantau revenue, tingkatkan retention</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={fetchCRMData}
                            className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-lg text-sm font-medium transition-all"
                        >
                            🔄 Refresh
                        </button>
                        <Link href="/admin">
                            <button className="px-4 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-light)] rounded-lg text-sm text-[var(--text-primary)]">
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
                    <div className="bg-white rounded-xl p-5 border border-[var(--border-light)]">
                        <p className="text-sm text-[var(--text-muted)] mb-1">Total Member</p>
                        <p className="text-3xl font-bold text-[var(--text-primary)]">{data?.memberStats.total || 0}</p>
                    </div>
                    <div className="bg-white rounded-xl p-5 border border-[var(--border-light)]">
                        <p className="text-sm text-[var(--text-muted)] mb-1">BASIC</p>
                        <p className="text-3xl font-bold text-slate-500">{data?.memberStats.basic || 0}</p>
                    </div>
                    <div className="bg-white rounded-xl p-5 border border-[var(--border-light)]">
                        <p className="text-sm text-[var(--text-muted)] mb-1">PRO</p>
                        <p className="text-3xl font-bold text-blue-600">{data?.memberStats.pro || 0}</p>
                    </div>
                    <div className="bg-white rounded-xl p-5 border border-[var(--border-light)]">
                        <p className="text-sm text-[var(--text-muted)] mb-1">VVIP</p>
                        <p className="text-3xl font-bold text-amber-600">{data?.memberStats.vvip || 0}</p>
                    </div>
                    <div className="bg-white rounded-xl p-5 border border-[var(--border-light)]">
                        <p className="text-sm text-[var(--text-muted)] mb-1">Conversion</p>
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
                        className="bg-white rounded-2xl border border-[var(--border-light)] p-6"
                    >
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-[var(--text-primary)]">
                            💰 Revenue Overview
                        </h2>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-[var(--text-secondary)]">Monthly Recurring (MRR)</span>
                                <span className="text-2xl font-bold text-green-600">
                                    {formatCurrency(data?.revenueStats.mrr || 0)}
                                </span>
                            </div>
                            <div className="h-px bg-[var(--border-light)]" />
                            <div className="flex justify-between items-center">
                                <span className="text-[var(--text-secondary)]">PRO Members ({data?.memberStats.pro || 0})</span>
                                <span className="font-semibold text-blue-600">
                                    {formatCurrency(data?.revenueStats.proRevenue || 0)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[var(--text-secondary)]">VVIP Members ({data?.memberStats.vvip || 0})</span>
                                <span className="font-semibold text-amber-600">
                                    {formatCurrency(data?.revenueStats.vvipRevenue || 0)}
                                </span>
                            </div>
                            <div className="h-px bg-[var(--border-light)]" />
                            <div className="flex justify-between items-center">
                                <span className="text-[var(--text-secondary)]">Paid Members</span>
                                <span className="font-semibold text-[var(--text-primary)]">{data?.revenueStats.paidMembers || 0}</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Alerts Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white rounded-2xl border border-[var(--border-light)] p-6"
                    >
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-[var(--text-primary)]">
                            ⚠️ Attention Needed
                        </h2>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">⏰</span>
                                    <div>
                                        <p className="font-semibold text-amber-700">Expiring Soon</p>
                                        <p className="text-sm text-amber-600">Member akan expired 7 hari</p>
                                    </div>
                                </div>
                                <span className="text-2xl font-bold text-amber-700">
                                    {data?.retentionAlerts.counts.expiring || 0}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">😴</span>
                                    <div>
                                        <p className="font-semibold text-red-700">Inactive Members</p>
                                        <p className="text-sm text-red-600">Tidak login 7+ hari</p>
                                    </div>
                                </div>
                                <span className="text-2xl font-bold text-red-700">
                                    {data?.retentionAlerts.counts.inactive || 0}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">🆕</span>
                                    <div>
                                        <p className="font-semibold text-green-700">New Signups</p>
                                        <p className="text-sm text-green-600">7 hari terakhir</p>
                                    </div>
                                </div>
                                <span className="text-2xl font-bold text-green-700">
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
                        className="bg-white rounded-2xl border border-amber-200 p-6 mb-8"
                    >
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-amber-700">
                            🔔 Members Expiring Soon
                        </h2>
                        <div className="space-y-2">
                            {data.retentionAlerts.expiringSoon.map((user) => (
                                <div key={user.id} className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold">
                                            {(user.name || user.email)?.[0]?.toUpperCase() || '?'}
                                        </div>
                                        <div>
                                            <p className="font-medium text-[var(--text-primary)]">{user.name || 'No Name'}</p>
                                            <p className="text-sm text-[var(--text-muted)]">{user.email}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${user.membership === 'VVIP'
                                            ? 'bg-amber-100 text-amber-700'
                                            : 'bg-blue-100 text-blue-700'
                                            }`}>
                                            {user.membership}
                                        </span>
                                        <p className="text-sm text-amber-600 mt-1">
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
                        className="bg-white rounded-2xl border border-red-200 p-6"
                    >
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-red-700">
                            😴 Inactive Members (7+ days)
                        </h2>
                        <div className="space-y-2">
                            {data.retentionAlerts.inactive.slice(0, 5).map((user) => (
                                <div key={user.id} className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold">
                                            {(user.name || user.email)?.[0]?.toUpperCase() || '?'}
                                        </div>
                                        <div>
                                            <p className="font-medium text-[var(--text-primary)]">{user.name || 'No Name'}</p>
                                            <p className="text-sm text-[var(--text-muted)]">{user.email}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${user.membership === 'VVIP'
                                            ? 'bg-amber-100 text-amber-700'
                                            : 'bg-blue-100 text-blue-700'
                                            }`}>
                                            {user.membership}
                                        </span>
                                        <p className="text-sm text-red-600 mt-1">
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
