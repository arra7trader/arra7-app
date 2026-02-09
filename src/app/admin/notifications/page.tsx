'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface NotificationLog {
    id: number;
    title: string;
    body: string;
    sent_count: number;
    failed_count: number;
    sent_at: string;
}

const ADMIN_EMAILS = ['apmexplore@gmail.com'];

// Quick notification templates
const TEMPLATES = [
    { id: 'signal', title: '🔔 Sinyal Trading Baru!', body: 'Ada sinyal trading baru dari AI. Cek sekarang untuk entry terbaik!', icon: '📈' },
    { id: 'gold', title: '🥇 Gold Alert!', body: 'Pergerakan signifikan di XAUUSD. Lihat analisa AI sekarang.', icon: '💰' },
    { id: 'update', title: '🚀 Update Baru!', body: 'ARRA7 baru saja diupdate dengan fitur baru. Cek sekarang!', icon: '✨' },
    { id: 'promo', title: '🎁 Promo Spesial!', body: 'Dapatkan diskon spesial untuk upgrade membership. Terbatas!', icon: '🎉' },
    { id: 'reminder', title: '⏰ Jangan Lewatkan!', body: 'Market akan buka sebentar lagi. Siapkan strategi Anda!', icon: '🔔' },
];

export default function AdminNotificationsPage() {
    const { data: session, status } = useSession();
    const [subscriberCount, setSubscriberCount] = useState(0);
    const [recentNotifications, setRecentNotifications] = useState<NotificationLog[]>([]);
    const [vapidConfigured, setVapidConfigured] = useState(false);
    const [loading, setLoading] = useState(true);

    // Send form
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const isAdmin = session?.user?.email && ADMIN_EMAILS.includes(session.user.email);

    useEffect(() => {
        if (isAdmin) {
            fetchStats();
        }
    }, [isAdmin]);

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/push/send');
            const data = await res.json();
            if (data.status === 'success') {
                setSubscriberCount(data.subscriberCount);
                setRecentNotifications(data.recentNotifications || []);
                setVapidConfigured(data.vapidConfigured);
            }
        } catch (error) {
            console.error('Fetch stats error:', error);
        } finally {
            setLoading(false);
        }
    };

    const sendNotification = async (customTitle?: string, customBody?: string) => {
        setSending(true);
        setMessage(null);

        try {
            const res = await fetch('/api/push/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: customTitle || title,
                    body: customBody || body,
                    url: '/analisa-market'
                })
            });

            const data = await res.json();

            if (data.status === 'success') {
                setMessage({ type: 'success', text: `✅ ${data.message}` });
                setTitle('');
                setBody('');
                fetchStats(); // Refresh stats
            } else {
                setMessage({ type: 'error', text: `❌ ${data.message}` });
            }
        } catch (error) {
            setMessage({ type: 'error', text: '❌ Failed to send notification' });
        } finally {
            setSending(false);
        }
    };

    const useTemplate = (template: typeof TEMPLATES[0]) => {
        setTitle(template.title);
        setBody(template.body);
    };

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-500 mb-2">🚫 Access Denied</h1>
                    <p className="text-[var(--text-muted)]">Admin only.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pt-24 pb-12">
            <div className="max-w-4xl mx-auto px-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">🔔 Push Notifications</h1>
                        <p className="text-[var(--text-secondary)] text-sm">Kirim notifikasi ke semua subscriber</p>
                    </div>
                    <Link href="/admin">
                        <button className="px-4 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-light)] rounded-lg text-sm text-[var(--text-primary)]">
                            ← Kembali
                        </button>
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white rounded-xl p-4 border border-[var(--border-light)]">
                        <p className="text-sm text-[var(--text-muted)]">Subscribers</p>
                        <p className="text-3xl font-bold text-blue-600">{subscriberCount}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-[var(--border-light)]">
                        <p className="text-sm text-[var(--text-muted)]">VAPID Config</p>
                        <p className={`text-lg font-bold ${vapidConfigured ? 'text-green-600' : 'text-red-600'}`}>
                            {vapidConfigured ? '✅ Ready' : '❌ Not Set'}
                        </p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-[var(--border-light)]">
                        <p className="text-sm text-[var(--text-muted)]">Total Sent</p>
                        <p className="text-3xl font-bold text-purple-600">
                            {recentNotifications.reduce((acc, n) => acc + n.sent_count, 0)}
                        </p>
                    </div>
                </div>

                {/* Message */}
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`mb-6 p-4 rounded-xl ${message.type === 'success'
                            ? 'bg-green-50 border border-green-200 text-green-700'
                            : 'bg-red-50 border border-red-200 text-red-700'
                            }`}
                    >
                        {message.text}
                    </motion.div>
                )}

                {/* Quick Templates */}
                <div className="bg-white rounded-2xl border border-[var(--border-light)] p-6 mb-6">
                    <h3 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">⚡ Quick Templates</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {TEMPLATES.map((template) => (
                            <button
                                key={template.id}
                                onClick={() => useTemplate(template)}
                                className="flex flex-col items-center gap-2 p-3 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] rounded-xl transition-colors"
                            >
                                <span className="text-2xl">{template.icon}</span>
                                <span className="text-xs text-center text-[var(--text-secondary)]">{template.title.split('!')[0]}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Send Form */}
                <div className="bg-white rounded-2xl border border-[var(--border-light)] p-6 mb-6">
                    <h3 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">📤 Kirim Notifikasi</h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-[var(--text-muted)] mb-2">Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Judul notifikasi..."
                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-lg px-4 py-3 focus:border-blue-500 outline-none text-[var(--text-primary)]"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-[var(--text-muted)] mb-2">Body</label>
                            <textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                placeholder="Isi pesan notifikasi..."
                                rows={3}
                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-lg px-4 py-3 focus:border-blue-500 outline-none resize-none text-[var(--text-primary)]"
                            />
                        </div>

                        <button
                            onClick={() => sendNotification()}
                            disabled={sending || !title || !body || !vapidConfigured}
                            className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {sending ? '⏳ Mengirim...' : `🚀 Kirim ke ${subscriberCount} Subscriber`}
                        </button>

                        {!vapidConfigured && (
                            <p className="text-sm text-red-600 text-center">
                                ⚠️ Set VAPID_PRIVATE_KEY di Vercel Environment Variables
                            </p>
                        )}
                    </div>
                </div>

                {/* Recent Notifications */}
                <div className="bg-white rounded-2xl border border-[var(--border-light)] p-6">
                    <h3 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">📋 Recent Notifications</h3>

                    {recentNotifications.length > 0 ? (
                        <div className="space-y-3">
                            {recentNotifications.map((notif) => (
                                <div key={notif.id} className="p-3 bg-[var(--bg-secondary)] rounded-lg">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-medium text-[var(--text-primary)]">{notif.title}</p>
                                            <p className="text-sm text-[var(--text-secondary)]">{notif.body}</p>
                                        </div>
                                        <div className="text-right text-xs">
                                            <p className="text-green-600">✅ {notif.sent_count}</p>
                                            {notif.failed_count > 0 && (
                                                <p className="text-red-600">❌ {notif.failed_count}</p>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-xs text-[var(--text-muted)] mt-2">
                                        {new Date(notif.sent_at).toLocaleString('id-ID')}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-[var(--text-muted)] text-center py-8">Belum ada notifikasi dikirim</p>
                    )}
                </div>
            </div>
        </div>
    );
}
