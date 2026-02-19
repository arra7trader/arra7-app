'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Provider {
    id: string;
    display_name: string;
    bio: string;
    broker_name: string;
    broker_account_id: string;
    subscription_fee: number;
    profit_sharing_percent: number;
    is_active: number;
    is_approved: number;
    total_followers: number;
    created_at: string;
    user_name: string;
    user_email: string;
    user_membership: string;
}

const FILTERS = [
    { id: 'pending', label: '⏳ Pending', color: 'orange' },
    { id: 'active', label: '✅ Aktif', color: 'green' },
    { id: 'rejected', label: '❌ Ditolak', color: 'red' },
    { id: 'all', label: '📋 Semua', color: 'gray' },
];

export default function ProviderApproval() {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending');
    const [processing, setProcessing] = useState<string | null>(null);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => { fetchProviders(); }, [filter]);

    const fetchProviders = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/copytrade?filter=${filter}`);
            const data = await res.json();
            setProviders(data.providers || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (providerId: string, action: 'approve' | 'reject' | 'deactivate') => {
        const labels = { approve: 'approve', reject: 'reject', deactivate: 'deactivate' };
        if (action === 'reject' && !confirm('Yakin mau reject provider ini?')) return;

        setProcessing(providerId + '-' + action);
        try {
            const res = await fetch('/api/admin/copytrade', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ providerId, action })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setToast({ type: 'success', message: data.message });
            fetchProviders();
            setTimeout(() => setToast(null), 4000);
        } catch (err: any) {
            setToast({ type: 'error', message: err.message || 'Gagal memproses' });
            setTimeout(() => setToast(null), 4000);
        } finally {
            setProcessing(null);
        }
    };

    const getMembershipBadge = (membership: string) => {
        const colors: Record<string, string> = {
            VVIP: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            PRO: 'bg-blue-100 text-blue-700 border-blue-200',
            BASIC: 'bg-gray-100 text-gray-600 border-gray-200',
        };
        return colors[membership] || colors.BASIC;
    };

    return (
        <div className="relative">
            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-lg ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}
                    >
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">📡 Provider Approval</h2>
                    <p className="text-sm text-gray-500">Kelola pendaftaran signal provider dari member PRO/VVIP</p>
                </div>
                <button
                    onClick={fetchProviders}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
                >
                    <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-5 p-1 bg-gray-100 rounded-xl w-fit">
                {FILTERS.map((f) => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === f.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Table */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : providers.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
                    <div className="text-4xl mb-3">
                        {filter === 'pending' ? '🎉' : filter === 'active' ? '📡' : '📋'}
                    </div>
                    <p className="text-gray-400 text-sm">
                        {filter === 'pending'
                            ? 'Tidak ada provider yang menunggu approval'
                            : filter === 'active'
                                ? 'Belum ada provider yang aktif'
                                : 'Tidak ada data'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {providers.map((provider) => (
                        <motion.div
                            key={provider.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
                        >
                            {/* Main Row */}
                            <div className="flex items-center gap-4 p-4">
                                {/* Avatar */}
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-base shrink-0">
                                    {provider.display_name?.charAt(0) || '?'}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                        <span className="font-semibold text-gray-900 text-sm">{provider.display_name}</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-bold ${getMembershipBadge(provider.user_membership)}`}>
                                            {provider.user_membership}
                                        </span>
                                        {provider.is_approved === 1 && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-md border bg-green-50 text-green-700 border-green-200 font-bold">AKTIF</span>
                                        )}
                                        {provider.is_approved === 0 && provider.is_active === 0 && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-md border bg-orange-50 text-orange-700 border-orange-200 font-bold">PENDING</span>
                                        )}
                                        {provider.is_approved as any === -1 && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-md border bg-red-50 text-red-700 border-red-200 font-bold">DITOLAK</span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                                        <span>👤 {provider.user_name} ({provider.user_email})</span>
                                        <span>🏦 {provider.broker_name}</span>
                                        <span>💰 Rp {Number(provider.subscription_fee).toLocaleString('id-ID')}/bln</span>
                                        <span>📊 {provider.profit_sharing_percent}% share</span>
                                        <span>📅 {new Date(provider.created_at).toLocaleDateString('id-ID')}</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => setExpandedId(expandedId === provider.id ? null : provider.id)}
                                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 text-xs hover:bg-gray-50 transition-colors"
                                    >
                                        {expandedId === provider.id ? 'Tutup' : 'Detail'}
                                    </button>

                                    {/* Approve */}
                                    {provider.is_approved !== 1 && (
                                        <button
                                            onClick={() => handleAction(provider.id, 'approve')}
                                            disabled={processing === provider.id + '-approve'}
                                            className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition-colors disabled:opacity-60 flex items-center gap-1"
                                        >
                                            {processing === provider.id + '-approve' ? (
                                                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                            ) : '✓'} Approve
                                        </button>
                                    )}

                                    {/* Deactivate (for active providers) */}
                                    {provider.is_approved === 1 && (
                                        <button
                                            onClick={() => handleAction(provider.id, 'deactivate')}
                                            disabled={processing === provider.id + '-deactivate'}
                                            className="px-3 py-1.5 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-700 text-xs font-bold transition-colors disabled:opacity-60"
                                        >
                                            ⏸ Nonaktifkan
                                        </button>
                                    )}

                                    {/* Reject (for pending/active) */}
                                    {(provider.is_approved as any) !== -1 && (
                                        <button
                                            onClick={() => handleAction(provider.id, 'reject')}
                                            disabled={processing === provider.id + '-reject'}
                                            className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold border border-red-100 transition-colors disabled:opacity-60"
                                        >
                                            ✕ Reject
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Expanded Bio */}
                            <AnimatePresence>
                                {expandedId === provider.id && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="px-4 pb-4 pt-0 border-t border-gray-50">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                                                {/* Bio */}
                                                <div className="md:col-span-2">
                                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Strategi / Bio</h4>
                                                    <p className="text-sm text-gray-600 leading-relaxed">
                                                        {provider.bio || <em className="text-gray-400">Tidak ada deskripsi</em>}
                                                    </p>
                                                </div>
                                                {/* Details */}
                                                <div>
                                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Detail</h4>
                                                    <div className="space-y-1.5 text-xs">
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-400">Broker Account ID</span>
                                                            <span className="font-mono font-medium text-gray-700">{provider.broker_account_id || '-'}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-400">Total Followers</span>
                                                            <span className="font-medium text-gray-700">{provider.total_followers || 0}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-400">Provider ID</span>
                                                            <span className="font-mono text-gray-400 text-[10px] truncate ml-2 max-w-[100px]">{provider.id}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
