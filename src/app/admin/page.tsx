'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ChartIcon, GlobeIcon, CurrencyIcon, BellIcon, TrendUpIcon, LightbulbIcon } from '@/components/PremiumIcons';
import AdminStats from '@/components/admin/AdminStats';
import TelegramMarketing from '@/components/admin/TelegramMarketing';
import UserTable, { User } from '@/components/admin/UserTable';
import UserDetailModal from '@/components/admin/UserDetailModal';
import UserFormModal from '@/components/admin/UserFormModal';
import BroadcastModal from '@/components/admin/BroadcastModal';
import MarketingBot from '@/components/admin/MarketingBot';
import UpgradeDurationModal, { DurationOption } from '@/components/admin/UpgradeDurationModal';
import ProviderApproval from '@/components/admin/ProviderApproval';

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
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isUserFormOpen, setIsUserFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);

    // Upgrade Duration Modal
    const [isDurationModalOpen, setIsDurationModalOpen] = useState(false);
    const [upgradeTargetUser, setUpgradeTargetUser] = useState<User | null>(null);
    const [upgradeTargetMembership, setUpgradeTargetMembership] = useState<'PRO' | 'VVIP'>('PRO');

    // Bulk Selection
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

    // Telegram Marketing
    const [telegramConfigured, setTelegramConfigured] = useState(false);

    // Tabs
    const [activeTab, setActiveTab] = useState<'users' | 'broadcast' | 'marketing'>('users');

    // ... (rest of state)

    // ... (useEffect and other functions)

    const handleSendBroadcast = async (data: { title: string; message: string; target: string; channels: string[] }) => {
        // ... (existing)
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${selectedUserIds.length} users? This action cannot be undone.`)) return;

        try {
            const res = await fetch('/api/admin/users/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'delete',
                    userIds: selectedUserIds
                })
            });
            const data = await res.json();

            if (data.status === 'success') {
                setMessage({ type: 'success', text: data.message });
                fetchUsers();
                setSelectedUserIds([]);
            } else {
                throw new Error(data.message);
            }
        } catch (e: any) {
            console.error('Bulk delete error:', e);
            setMessage({ type: 'error', text: e.message || 'Failed to delete users' });
        }
    };

    const handleBulkUpgrade = async () => {
        const membership = prompt('Enter membership level (PRO/VVIP/BASIC):', 'PRO');
        if (!membership || !['PRO', 'VVIP', 'BASIC'].includes(membership.toUpperCase())) return;

        try {
            const res = await fetch('/api/admin/users/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'upgrade',
                    userIds: selectedUserIds,
                    data: { membership: membership.toUpperCase(), duration: 30 }
                })
            });
            const data = await res.json();

            if (data.status === 'success') {
                setMessage({ type: 'success', text: data.message });
                fetchUsers();
                setSelectedUserIds([]);
            } else {
                throw new Error(data.message);
            }
        } catch (e: any) {
            console.error('Bulk upgrade error:', e);
            setMessage({ type: 'error', text: e.message || 'Failed to upgrade users' });
        }
    };

    const handleAddUser = () => {
        setEditingUser(null);
        setIsUserFormOpen(true);
    };

    const handleEditUser = (user: User) => {
        setEditingUser(user);
        setIsUserFormOpen(true);
    };

    const handleSaveUser = async (userData: Partial<User> & { password?: string }) => {
        try {
            const url = '/api/admin/users';
            const method = 'POST';
            const body = {
                action: userData.id ? 'update' : 'create',
                ...userData
            };

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (data.status === 'success') {
                setMessage({ type: 'success', text: data.message });
                fetchUsers();
                setIsUserFormOpen(false);
            } else {
                throw new Error(data.message || 'Failed to save user');
            }
        } catch (error: any) {
            console.error('Save user error:', error);
            throw error; // Re-throw for modal to handle
        }
    };
    const [sendingTelegram, setSendingTelegram] = useState(false);
    const [telegramMessage, setTelegramMessage] = useState<string | null>(null);
    const [autoPostEnabled, setAutoPostEnabled] = useState(false);

    const isAdmin = session?.user?.email && ADMIN_EMAILS.includes(session.user.email);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login?callbackUrl=/admin');
        } else if (status === 'authenticated' && !isAdmin) {
            router.push('/');
        } else if (status === 'authenticated' && isAdmin) {
            fetchUsers();
            checkTelegramConfig();
        }
    }, [status, isAdmin, router]);

    const checkTelegramConfig = async () => {
        try {
            const response = await fetch('/api/admin/telegram');
            const data = await response.json();
            if (data.status === 'success') {
                setTelegramConfigured(data.configured);
                setAutoPostEnabled(data.autoPostEnabled || false);
            }
        } catch (error) {
            console.error('Check Telegram config error:', error);
        }
    };

    const toggleAutoPost = async (action: 'start' | 'stop') => {
        setSendingTelegram(true);
        setTelegramMessage(null);
        try {
            const response = await fetch('/api/admin/telegram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: action === 'start' ? 'start_auto_post' : 'stop_auto_post' }),
            });
            const data = await response.json();
            if (data.status === 'success') {
                setAutoPostEnabled(data.autoPostEnabled);
                setTelegramMessage(action === 'start' ? '✅ Auto-posting diaktifkan!' : '⏸️ Auto-posting dihentikan.');
            } else {
                setTelegramMessage(`❌ Gagal: ${data.message}`);
            }
        } catch (error) {
            setTelegramMessage('❌ Error mengubah status auto-post');
        } finally {
            setSendingTelegram(false);
        }
    };

    const sendTelegramPromo = async (template: string) => {
        setSendingTelegram(true);
        setTelegramMessage(null);
        try {
            const response = await fetch('/api/admin/telegram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ template }),
            });
            const data = await response.json();
            if (data.status === 'success') {
                setTelegramMessage('✅ Pesan berhasil dikirim ke @arrareborn!');
            } else {
                setTelegramMessage(`❌ Gagal: ${data.message}`);
            }
        } catch (error) {
            setTelegramMessage('❌ Error mengirim pesan');
        } finally {
            setSendingTelegram(false);
        }
    };

    const downloadCSV = () => {
        const headers = ['ID', 'Name', 'Email', 'Membership', 'Expires', 'Created At', 'Last Login', 'IP', 'Country', 'City', 'Usage Total'];
        const csvContent = [
            headers.join(','),
            ...users.map(u => [
                u.id,
                `"${u.name || ''}"`,
                u.email,
                u.membership,
                u.membershipExpires || '',
                u.createdAt || '',
                u.lastLoginAt || '',
                u.lastLoginIp || '',
                u.lastLoginCountry || '',
                u.lastLoginCity || '',
                u.todayUsage
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'users_export.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/admin/users');
            const data = await response.json();
            console.log('Admin API Response:', data);

            if (data.status === 'success') {
                setUsers(data.users);
            } else {
                setMessage({
                    type: 'error',
                    text: data.message || 'Failed to fetch users'
                });
            }
        } catch (error) {
            console.error('Fetch users error:', error);
            setMessage({ type: 'error', text: 'Network error: Failed to fetch users' });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateMembership = async (user: User, membership: string) => {
        // If downgrading to BASIC, skip modal and update directly
        if (membership === 'BASIC') {
            setUpdating(user.id);
            setMessage(null);

            try {
                const response = await fetch('/api/admin/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id, membership: 'BASIC' }),
                });

                const data = await response.json();

                if (data.status === 'success') {
                    setMessage({ type: 'success', text: `✅ ${user.name} berhasil di-downgrade ke BASIC` });
                    fetchUsers();
                } else {
                    setMessage({ type: 'error', text: data.message });
                }
            } catch (error) {
                setMessage({ type: 'error', text: 'Failed to downgrade user' });
            } finally {
                setUpdating(null);
            }
            return;
        }

        // For PRO/VVIP, open duration modal
        setUpgradeTargetUser(user);
        setUpgradeTargetMembership(membership as 'PRO' | 'VVIP');
        setIsDurationModalOpen(true);
    };

    const handleDurationSelect = async (option: DurationOption) => {
        if (!upgradeTargetUser) return;

        const userId = upgradeTargetUser.id;
        const userName = upgradeTargetUser.name;
        const userEmail = upgradeTargetUser.email;
        const days = option.days;
        const durationId = option.duration; // e.g. '3months'
        const membership = upgradeTargetMembership;

        setIsDurationModalOpen(false);
        setUpdating(userId);
        setMessage(null);

        try {
            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, membership, durationDays: days, duration: durationId }),
            });

            const data = await response.json();

            if (data.status === 'success') {
                setMessage({ type: 'success', text: `✅ ${userName} berhasil di-upgrade ke ${membership} untuk ${option.label}` });
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
            setUpgradeTargetUser(null);
        }
    };

    const handleUpdateCopyTrade = async (user: User, access: 'FOLLOWER' | 'PROVIDER' | null) => {
        const actionText = access === 'PROVIDER' ? 'Provider' : access === 'FOLLOWER' ? 'Follower' : 'Revoke';
        if (!confirm(`Are you sure you want to set Copy Trade access to ${actionText} for ${user.name}?`)) return;

        setUpdating(user.id);
        setMessage(null);

        try {
            const res = await fetch('/api/admin/users/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'copytrade_update',
                    userIds: [user.id],
                    data: {
                        access: access || 'REVOKE',
                        duration: 30 // Default 30 days for manual activation? Or ask? For now default 30 days.
                    }
                })
            });
            const data = await res.json();

            if (data.status === 'success') {
                setMessage({ type: 'success', text: `✅ Copy Trade access updated for ${user.name}` });
                fetchUsers();
            } else {
                setMessage({ type: 'error', text: data.message });
            }
        } catch (error) {
            console.error('Update CT error:', error);
            setMessage({ type: 'error', text: 'Failed to update Copy Trade access' });
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
        <div className="relative min-h-screen pt-36 pb-20 px-4 sm:px-6 lg:px-8 bg-[var(--bg-primary)]">
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle, #0071e3 1px, transparent 1px)', backgroundSize: '24px 24px' }} />


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
                        {/* ... upgrade notification ... */}
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white rounded-2xl p-6 max-w-lg w-full border border-[var(--border-light)] shadow-xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">Upgrade Berhasil!</h3>
                                    <p className="text-sm text-[var(--text-secondary)]">Copy pesan ini untuk dikirim ke customer</p>
                                </div>
                            </div>

                            <div className="bg-[var(--bg-secondary)] rounded-xl p-4 mb-4 max-h-64 overflow-y-auto">
                                <pre className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap font-sans">
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
                                    className="px-6 py-3 rounded-xl border border-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                                >
                                    Tutup
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <UserDetailModal
                user={selectedUser}
                onClose={() => setSelectedUser(null)}
                onEdit={() => {
                    if (selectedUser) {
                        handleEditUser(selectedUser);
                        setSelectedUser(null);
                    }
                }}
            />

            <UserFormModal
                isOpen={isUserFormOpen}
                onClose={() => setIsUserFormOpen(false)}
                onSave={handleSaveUser}
                user={editingUser}
            />

            <BroadcastModal
                isOpen={isBroadcastOpen}
                onClose={() => setIsBroadcastOpen(false)}
                onSend={handleSendBroadcast}
            />

            <div className="relative max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Admin Dashboard</h1>
                        <p className="text-[var(--text-secondary)]">Kelola users dan membership</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => setIsBroadcastOpen(true)}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-1 shadow-lg shadow-purple-500/20"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                            </svg>
                            Broadcast
                        </button>
                        <button
                            onClick={handleAddUser}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-1 shadow-lg shadow-blue-500/20"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add User
                        </button>
                        <Link href="/admin/crm">
                            <button className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg hover:shadow-purple-500/25 rounded-lg text-sm font-medium transition-all flex items-center gap-1">
                                <ChartIcon size="sm" /> CRM
                            </button>
                        </Link>
                        <Link href="/admin/users-map">
                            <button className="px-4 py-2 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg text-sm font-medium transition-all flex items-center gap-1">
                                <GlobeIcon size="sm" /> Users Map
                            </button>
                        </Link>
                        <Link href="/admin/revenue">
                            <button className="px-4 py-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30 rounded-lg text-sm font-medium transition-all flex items-center gap-1">
                                <CurrencyIcon size="sm" /> Revenue
                            </button>
                        </Link>
                        <Link href="/admin/notifications">
                            <button className="px-4 py-2 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30 rounded-lg text-sm font-medium transition-all flex items-center gap-1">
                                <BellIcon size="sm" /> Notifikasi
                            </button>
                        </Link>
                        <Link href="/admin/report">
                            <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:shadow-lg hover:shadow-blue-500/25 rounded-lg text-sm font-medium transition-all flex items-center gap-1">
                                <ChartIcon size="sm" /> Daily Report
                            </button>
                        </Link>
                        <Link href="/performance">
                            <button className="px-4 py-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30 rounded-lg text-sm font-medium transition-all flex items-center gap-1">
                                <TrendUpIcon size="sm" /> Performance
                            </button>
                        </Link>
                        <Link href="/admin/copytrade-bridge">
                            <button className="px-4 py-2 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 border border-indigo-500/30 rounded-lg text-sm font-medium transition-all flex items-center gap-1">
                                📡 CT Bridge
                            </button>
                        </Link>
                        <button
                            onClick={async () => {
                                const btn = document.getElementById('verify-btn');
                                if (btn) {
                                    btn.innerHTML = '⏳ Checking...';
                                    (btn as HTMLButtonElement).disabled = true;
                                }
                                try {
                                    const res = await fetch('/api/admin/verify-signals', { method: 'POST' });
                                    const data = await res.json();
                                    alert(JSON.stringify(data.data, null, 2));
                                } catch (e) {
                                    alert('Error verifying');
                                } finally {
                                    if (btn) {
                                        btn.innerHTML = '⚡ Verify Signals';
                                        (btn as HTMLButtonElement).disabled = false;
                                    }
                                }
                            }}
                            id="verify-btn"
                            className="px-4 py-2 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-sm font-medium transition-all"
                        >
                            <LightbulbIcon className="inline" size="sm" /> Verify Signals
                        </button>
                        <Link href="/">
                            <button className="px-4 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-light)] rounded-lg text-sm text-[var(--text-primary)]">
                                ← Kembali
                            </button>
                        </Link>
                    </div>
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

                <AdminStats stats={stats} />

                {/* Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 mb-6 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-4 py-2 rounded-t-lg font-medium whitespace-nowrap transition-colors ${activeTab === 'users' ? 'bg-white border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        👥 User Management
                    </button>
                    <button
                        onClick={() => setActiveTab('broadcast')}
                        className={`px-4 py-2 rounded-t-lg font-medium whitespace-nowrap transition-colors ${activeTab === 'broadcast' ? 'bg-white border-b-2 border-purple-600 text-purple-600' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        📢 Forecast & Broadcast
                    </button>
                    <button
                        onClick={() => setActiveTab('marketing')}
                        className={`px-4 py-2 rounded-t-lg font-medium whitespace-nowrap transition-colors ${activeTab === 'marketing' ? 'bg-white border-b-2 border-pink-600 text-pink-600' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        🤖 Marketing Bot
                    </button>
                </div>

                {activeTab === 'marketing' && <MarketingBot />}

                {activeTab === 'broadcast' && (
                    <TelegramMarketing
                        telegramConfigured={telegramConfigured}
                        autoPostEnabled={autoPostEnabled}
                        sendingTelegram={sendingTelegram}
                        telegramMessage={telegramMessage}
                        onToggleAutoPost={toggleAutoPost}
                        onSendPromo={sendTelegramPromo}
                    />
                )}

                {activeTab === 'users' && (
                    <>
                        {/* Search & Export */}
                        <div className="mb-6 flex gap-4">
                            <div className="relative flex-1">
                                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Cari email atau nama..."
                                    className="w-full pl-12 pr-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={downloadCSV}
                                className="px-6 py-3 bg-white border border-[var(--border-light)] hover:bg-[var(--bg-secondary)] rounded-xl font-medium text-[var(--text-primary)] flex items-center gap-2 transition-all shadow-sm"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Export CSV
                            </button>
                        </div>
                        {searchQuery && (
                            <p className="mt-2 text-sm text-[var(--text-muted)]">
                                Ditemukan {filteredUsers.length} dari {users.length} users
                            </p>
                        )}

                        {selectedUserIds.length > 0 && (
                            <div className="bg-white rounded-xl shadow-lg border border-purple-100 p-4 mb-6 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center gap-3">
                                    <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-lg text-sm font-medium">
                                        {selectedUserIds.length} Selected
                                    </div>
                                    <button
                                        onClick={() => setSelectedUserIds([])}
                                        className="text-gray-500 hover:text-gray-700 text-sm underline"
                                    >
                                        Clear
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleBulkUpgrade}
                                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Upgrade Selected
                                    </button>
                                    <button
                                        onClick={handleBulkDelete}
                                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Delete Selected
                                    </button>
                                </div>
                            </div>
                        )}

                        <UserTable
                            users={filteredUsers}
                            loading={loading}
                            onUpdateMembership={handleUpdateMembership}
                            updating={updating}
                            onUserClick={setSelectedUser}
                            selectedIds={selectedUserIds}
                            onSelectionChange={setSelectedUserIds}
                            onUpdateCopyTrade={handleUpdateCopyTrade}
                        />
                    </>
                )}
            </div>

            {/* Upgrade Duration Modal */}
            <UpgradeDurationModal
                isOpen={isDurationModalOpen}
                membership={upgradeTargetMembership}
                onSelect={handleDurationSelect}
                onClose={() => {
                    setIsDurationModalOpen(false);
                    setUpgradeTargetUser(null);
                }}
            />
        </div >
    );
}
