'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
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

const ADMIN_EMAILS = ['apmexplore@gmail.com'];

export default function AdminDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
            if (data.status === 'success') {
                setUsers(data.users);
            }
        } catch (error) {
            console.error('Fetch users error:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateMembership = async (userId: string, membership: string, days: number = 30) => {
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
            } else {
                setMessage({ type: 'error', text: data.message });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to update' });
        } finally {
            setUpdating(null);
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

    const stats = {
        total: users.length,
        basic: users.filter(u => u.membership === 'BASIC').length,
        pro: users.filter(u => u.membership === 'PRO').length,
        vvip: users.filter(u => u.membership === 'VVIP').length,
    };

    return (
        <div className="relative min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8">
            <div className="absolute inset-0 bg-grid opacity-20" />

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

                {/* Users Table */}
                <div className="glass rounded-2xl border border-[#1F2937] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[#12141A]">
                                <tr>
                                    <th className="text-left p-4 text-sm text-[#64748B]">User</th>
                                    <th className="text-left p-4 text-sm text-[#64748B]">Membership</th>
                                    <th className="text-left p-4 text-sm text-[#64748B]">Expires</th>
                                    <th className="text-left p-4 text-sm text-[#64748B]">Usage Today</th>
                                    <th className="text-left p-4 text-sm text-[#64748B]">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id} className="border-t border-[#1F2937] hover:bg-[#1A1D24]">
                                        <td className="p-4">
                                            <div>
                                                <p className="font-medium">{user.name || 'No Name'}</p>
                                                <p className="text-sm text-[#64748B]">{user.email}</p>
                                            </div>
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
                                                        onClick={() => updateMembership(user.id, 'PRO')}
                                                        disabled={updating === user.id}
                                                        className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded text-xs disabled:opacity-50"
                                                    >
                                                        {updating === user.id ? '...' : '→ PRO'}
                                                    </button>
                                                )}
                                                {user.membership !== 'VVIP' && (
                                                    <button
                                                        onClick={() => updateMembership(user.id, 'VVIP')}
                                                        disabled={updating === user.id}
                                                        className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded text-xs disabled:opacity-50"
                                                    >
                                                        {updating === user.id ? '...' : '→ VVIP'}
                                                    </button>
                                                )}
                                                {user.membership !== 'BASIC' && (
                                                    <button
                                                        onClick={() => updateMembership(user.id, 'BASIC')}
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
