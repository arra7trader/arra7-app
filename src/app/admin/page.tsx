'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface User {
    id: string;
    email: string;
    name: string;
    membership: string;
    membershipExpires: string | null;
    createdAt: string;
    todayUsage: number;
}

interface UpgradeNotification {
    userName: string;
    userEmail: string;
    membership: string;
    expiresDate: string;
}

const ADMIN_EMAILS = ['apmexplore@gmail.com'];

export default function AdminDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [notification, setNotification] = useState<UpgradeNotification | null>(null);
    const [copied, setCopied] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const isAdmin = session?.user?.email && ADMIN_EMAILS.includes(session.user.email);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login?callbackUrl=/admin');
        } else if (status === 'authenticated' && !isAdmin) {
            router.push('/');
        } else if (status === 'authenticated' && isAdmin) {
            fetchUsers();
        }
    }, [status, isAdmin, router]);

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/admin/users');
            const data = await response.json();
            console.log('Admin API Response:', data);

            if (data.status === 'success') {
                setUsers(data.users);
            } else {
                // Show error message from API
                setMessage({
                    type: 'error',
                    text: data.message || 'Failed to fetch users'
                });
                console.error('API Error:', data);
            }
        } catch (error) {
            console.error('Fetch users error:', error);
            setMessage({ type: 'error', text: 'Network error: Failed to fetch users' });
        } finally {
            setLoading(false);
        }
    };

    const updateMembership = async (userId: string, membership: string, userName: string, userEmail: string, days: number = 30) => {
        setUpdating(userId);
        setMessage(null);

        try {
            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, membership, durationDays: days }),
            });

            const data = await response.json();

            if (data.status === 'success') {
                setMessage({ type: 'success', text: data.message });
                fetchUsers();

                // Show notification modal
                const expiresDate = new Date();
                expiresDate.setDate(expiresDate.getDate() + days);
                setNotification({
                    userName,
                    userEmail,
                    membership,
                    expiresDate: expiresDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
                });
            } else {
                setMessage({ type: 'error', text: data.message });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to update' });
        } finally {
            setUpdating(null);
        }
    };

    const getNotificationMessage = () => {
        if (!notification) return '';
        return `✅ Akun Anda sudah diupgrade ke ${notification.membership}! 🎉

Halo ${notification.userName || 'Kak'},

Terima kasih telah melakukan pembayaran. Akun Anda (${notification.userEmail}) telah berhasil diupgrade.

📦 Paket: ${notification.membership}
📅 Berlaku hingga: ${notification.expiresDate}

Silakan refresh halaman atau login ulang untuk melihat perubahan.

Selamat trading dan semoga profit! 💰🚀

Best regards,
Tim ARRA7`;
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(getNotificationMessage());
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Copy failed:', err);
        }
    };

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAdmin) {
        return null;
    }

    // Filter users by search query
    const filteredUsers = users.filter(user =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const stats = {
        total: users.length,
        basic: users.filter(u => u.membership === 'BASIC').length,
        pro: users.filter(u => u.membership === 'PRO').length,
        vvip: users.filter(u => u.membership === 'VVIP').length,
    };

    return (
        <div className="relative min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8">
            <div className="absolute inset-0 bg-grid opacity-20" />

            {/* Notification Modal */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setNotification(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="glass rounded-2xl p-6 max-w-lg w-full border border-green-500/30"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">Upgrade Berhasil!</h3>
                                    <p className="text-sm text-[#94A3B8]">Copy pesan ini untuk dikirim ke customer</p>
                                </div>
                            </div>

                            <div className="bg-[#12141A] rounded-xl p-4 mb-4 max-h-64 overflow-y-auto">
                                <pre className="text-sm text-[#94A3B8] whitespace-pre-wrap font-sans">
                                    {getNotificationMessage()}
                                </pre>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={copyToClipboard}
                                    className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${copied
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                                        }`}
                                >
                                    {copied ? (
                                        <>
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Tersalin!
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                            </svg>
                                            Copy Pesan
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => setNotification(null)}
                                    className="px-6 py-3 rounded-xl border border-[#374151] text-[#94A3B8] hover:text-white transition-colors"
                                >
                                    Tutup
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="relative max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                        <p className="text-[#94A3B8]">Kelola users dan membership</p>
                    </div>
                    <Link href="/">
                        <button className="px-4 py-2 bg-[#1F2937] hover:bg-[#374151] rounded-lg text-sm">
                            ← Kembali
                        </button>
                    </Link>
                </div>

                {/* Message */}
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`mb-6 p-4 rounded-xl ${message.type === 'success'
                            ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                            : 'bg-red-500/10 border border-red-500/30 text-red-400'
                            }`}
                    >
                        {message.text}
                    </motion.div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="glass rounded-xl p-4 border border-[#1F2937]">
                        <p className="text-sm text-[#64748B]">Total Users</p>
                        <p className="text-2xl font-bold">{stats.total}</p>
                    </div>
                    <div className="glass rounded-xl p-4 border border-[#1F2937]">
                        <p className="text-sm text-[#64748B]">Basic</p>
                        <p className="text-2xl font-bold text-slate-400">{stats.basic}</p>
                    </div>
                    <div className="glass rounded-xl p-4 border border-[#1F2937]">
                        <p className="text-sm text-[#64748B]">Pro</p>
                        <p className="text-2xl font-bold text-blue-400">{stats.pro}</p>
                    </div>
                    <div className="glass rounded-xl p-4 border border-[#1F2937]">
                        <p className="text-sm text-[#64748B]">VVIP</p>
                        <p className="text-2xl font-bold text-amber-400">{stats.vvip}</p>
                    </div>
                </div>

                {/* Search */}
                <div className="mb-6">
                    <div className="relative max-w-md">
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari email atau nama..."
                            className="w-full pl-12 pr-4 py-3 bg-[#12141A] border border-[#1F2937] rounded-xl text-white placeholder-[#64748B] focus:outline-none focus:border-blue-500 transition-colors"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-white"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                    {searchQuery && (
                        <p className="mt-2 text-sm text-[#64748B]">
                            Ditemukan {filteredUsers.length} dari {users.length} users
                        </p>
                    )}
                </div>

                {/* Users Table */}
                <div className="glass rounded-2xl border border-[#1F2937] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[#12141A]">
                                <tr>
                                    <th className="text-left p-4 text-sm text-[#64748B]">User</th>
                                    <th className="text-left p-4 text-sm text-[#64748B]">Tanggal Daftar</th>
                                    <th className="text-left p-4 text-sm text-[#64748B]">Membership</th>
                                    <th className="text-left p-4 text-sm text-[#64748B]">Expires</th>
                                    <th className="text-left p-4 text-sm text-[#64748B]">Usage Today</th>
                                    <th className="text-left p-4 text-sm text-[#64748B]">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="border-t border-[#1F2937] hover:bg-[#1A1D24]">
                                        <td className="p-4">
                                            <div>
                                                <p className="font-medium">{user.name || 'No Name'}</p>
                                                <p className="text-sm text-[#64748B]">{user.email}</p>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-[#94A3B8]">
                                            {user.createdAt
                                                ? new Date(user.createdAt).toLocaleDateString('id-ID', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })
                                                : '-'
                                            }
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${user.membership === 'VVIP' ? 'bg-amber-500/20 text-amber-400' :
                                                user.membership === 'PRO' ? 'bg-blue-500/20 text-blue-400' :
                                                    'bg-slate-500/20 text-slate-400'
                                                }`}>
                                                {user.membership}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-[#94A3B8]">
                                            {user.membershipExpires
                                                ? new Date(user.membershipExpires).toLocaleDateString('id-ID')
                                                : '-'
                                            }
                                        </td>
                                        <td className="p-4 text-sm">{user.todayUsage}x</td>
                                        <td className="p-4">
                                            <div className="flex gap-2">
                                                {user.membership !== 'PRO' && (
                                                    <button
                                                        onClick={() => updateMembership(user.id, 'PRO', user.name, user.email)}
                                                        disabled={updating === user.id}
                                                        className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded text-xs disabled:opacity-50"
                                                    >
                                                        {updating === user.id ? '...' : '→ PRO'}
                                                    </button>
                                                )}
                                                {user.membership !== 'VVIP' && (
                                                    <button
                                                        onClick={() => updateMembership(user.id, 'VVIP', user.name, user.email)}
                                                        disabled={updating === user.id}
                                                        className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded text-xs disabled:opacity-50"
                                                    >
                                                        {updating === user.id ? '...' : '→ VVIP'}
                                                    </button>
                                                )}
                                                {user.membership !== 'BASIC' && (
                                                    <button
                                                        onClick={() => updateMembership(user.id, 'BASIC', user.name, user.email)}
                                                        disabled={updating === user.id}
                                                        className="px-3 py-1 bg-slate-500/20 hover:bg-slate-500/30 text-slate-400 rounded text-xs disabled:opacity-50"
                                                    >
                                                        {updating === user.id ? '...' : '→ BASIC'}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {users.length === 0 && (
                        <div className="p-8 text-center text-[#64748B]">
                            Belum ada users terdaftar
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
