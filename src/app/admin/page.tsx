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
import UpgradeDurationModal from '@/components/admin/UpgradeDurationModal';

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

    const handleDurationSelect = async (option: any) => {
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
            const payload: Record<string, unknown> = {
                userId,
                membership,
                durationDays: days,
                duration: durationId,
                extendFromCurrent: true,
            };

            if (option.customExpiresAt) {
                payload.expiresAt = option.customExpiresAt;
            }

            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (data.status === 'success') {
                setMessage({ type: 'success', text: `✅ ${userName} berhasil di-upgrade ke ${membership} untuk ${option.label}` });
                fetchUsers();

                // Show notification modal
                const responseExpiry = typeof data.membershipExpires === 'string'
                    ? new Date(data.membershipExpires)
                    : null;
                const hasResponseExpiry = responseExpiry && !Number.isNaN(responseExpiry.getTime());

                let expiresDate: Date;
                if (hasResponseExpiry && responseExpiry) {
                    expiresDate = responseExpiry;
                } else if (option.customExpiresAt) {
                    expiresDate = new Date(option.customExpiresAt);
                } else {
                    expiresDate = new Date();
                    expiresDate.setDate(expiresDate.getDate() + days);
                }
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
                            className="bg-[var(--bg-primary)] rounded-2xl p-6 max-w-lg w-full border border-[var(--border-light)] shadow-xl"
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
                {/* Header Section */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-6">
                    <div className="flex flex-col gap-2">
                        <h1 className="[letter-spacing:-1px] font-['Space_Grotesk',system-ui,sans-serif] font-bold text-4xl text-[#F8FAFC]">Admin Dashboard</h1>
                        <p className="text-[#94A3B8] font-['Inter',system-ui,sans-serif] text-base">Kelola users dan kontrol sistem ARRA7</p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={handleAddUser}
                            className="flex items-center rounded-xl py-2.5 px-5 gap-2 bg-[#3B82F61A] hover:bg-[#3B82F633] transition-colors border border-solid border-[#3B82F633]"
                        >
                            <svg className="text-[#60A5FA]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            <div className="inline-block text-[#60A5FA] font-['Inter',system-ui,sans-serif] font-semibold text-sm">Add User</div>
                        </button>
                        
                        <button
                            onClick={() => setIsBroadcastOpen(true)}
                            className="flex items-center rounded-xl py-2.5 px-5 gap-2 bg-[#A855F71A] hover:bg-[#A855F733] transition-colors border border-solid border-[#A855F733]"
                        >
                            <svg className="text-[#C084FC]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                            </svg>
                            <div className="inline-block text-[#C084FC] font-['Inter',system-ui,sans-serif] font-semibold text-sm">Broadcast</div>
                        </button>

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
                                        btn.innerHTML = 'Verify Signals';
                                        (btn as HTMLButtonElement).disabled = false;
                                    }
                                }
                            }}
                            id="verify-btn"
                            className="flex items-center rounded-xl py-2.5 px-5 gap-2 bg-[#FFFFFF0D] hover:bg-[#FFFFFF1A] transition-colors border border-solid border-[#FFFFFF1A]"
                        >
                            <div className="text-[#E2E8F0] font-['Inter',system-ui,sans-serif] font-semibold text-sm">Verify Signals</div>
                        </button>

                        <Link href="/">
                            <button className="flex items-center rounded-xl py-2.5 px-5 gap-2 bg-[#FFFFFF0D] hover:bg-[#FFFFFF1A] transition-colors border border-solid border-[#FFFFFF1A]">
                                <div className="text-[#E2E8F0] font-['Inter',system-ui,sans-serif] font-semibold text-sm">Kembali</div>
                            </button>
                        </Link>
                    </div>
                </div>

                {/* Quick Access Grid Scrollable Menu */}
                <div className="flex gap-3 mb-6 overflow-x-auto pb-3 w-full" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                    <Link href="/admin/copytrade-arra77" className="admin-quick-link">
                        <div className="icon-container bg-emerald-500/15">📡</div>
                        <div className="text-[#CBD5E1] font-medium text-sm">Copytrade ARRA77</div>
                    </Link>
                    <Link href="/admin/crm" className="admin-quick-link">
                        <div className="icon-container bg-blue-500/15">📊</div>
                        <div className="text-[#CBD5E1] font-medium text-sm">CRM Dashboard</div>
                    </Link>
                    <Link href="/admin/users-map" className="admin-quick-link">
                        <div className="icon-container bg-cyan-500/15">🌍</div>
                        <div className="text-[#CBD5E1] font-medium text-sm">Users Map</div>
                    </Link>
                    <Link href="/admin/revenue" className="admin-quick-link">
                        <div className="icon-container bg-amber-500/15">💰</div>
                        <div className="text-[#CBD5E1] font-medium text-sm">Revenue</div>
                    </Link>
                    <Link href="/admin/notifications" className="admin-quick-link">
                        <div className="icon-container bg-rose-500/15">🔔</div>
                        <div className="text-[#CBD5E1] font-medium text-sm">Notifikasi Web</div>
                    </Link>
                    <Link href="/admin/bot-private" className="admin-quick-link">
                        <div className="icon-container bg-emerald-500/15">BOT</div>
                        <div className="text-[#CBD5E1] font-medium text-sm">TELEBOT</div>
                    </Link>
                    <Link href="/admin/report" className="admin-quick-link">
                        <div className="icon-container bg-blue-500/15 text-blue-400"><ChartIcon size="sm" /></div>
                        <div className="text-[#CBD5E1] font-medium text-sm">Daily Report</div>
                    </Link>
                    <Link href="/performance" className="admin-quick-link">
                        <div className="icon-container bg-green-500/15 text-green-400"><TrendUpIcon size="sm" /></div>
                        <div className="text-[#CBD5E1] font-medium text-sm">Performance Logs</div>
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

                <AdminStats stats={stats} />

                {/* Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 mb-6 p-1 rounded-2xl bg-[#FFFFFF04]">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`admin-pill-tab ${activeTab === 'users' ? 'active' : ''}`}
                    >
                        👥 User Management
                    </button>
                    <button
                        onClick={() => setActiveTab('broadcast')}
                        className={`admin-pill-tab ${activeTab === 'broadcast' ? 'active' : ''}`}
                    >
                        📢 Forecast & Broadcast
                    </button>
                    <button
                        onClick={() => setActiveTab('marketing')}
                        className={`admin-pill-tab ${activeTab === 'marketing' ? 'active' : ''}`}
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
                                className="px-6 py-3 bg-[var(--bg-primary)] border border-[var(--border-light)] hover:bg-[var(--bg-secondary)] rounded-xl font-medium text-[var(--text-primary)] flex items-center gap-2 transition-all shadow-sm"
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
                            <div className="admin-card p-4 mb-6 flex items-center justify-between" style={{ borderColor: 'rgba(168, 85, 247, 0.2)' }}>
                                <div className="flex items-center gap-3">
                                    <div className="bg-purple-500/15 text-purple-400 px-3 py-1 rounded-lg text-sm font-medium">
                                        {selectedUserIds.length} Selected
                                    </div>
                                    <button
                                        onClick={() => setSelectedUserIds([])}
                                        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm underline"
                                    >
                                        Clear
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleBulkUpgrade}
                                        className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm font-medium transition-colors border border-blue-500/20"
                                    >
                                        Upgrade Selected
                                    </button>
                                    <button
                                        onClick={handleBulkDelete}
                                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors border border-red-500/20"
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
                        />
                    </>
                )}
            </div>

            <UpgradeDurationModal
                isOpen={isDurationModalOpen}
                onClose={() => {
                    setIsDurationModalOpen(false);
                    setUpgradeTargetUser(null);
                }}
                membership={upgradeTargetMembership}
                userId={upgradeTargetUser?.id || ''}
                onSelect={handleDurationSelect}
                onSuccess={() => {
                    fetchUsers();
                }}
            />
        </div>
    );
}



