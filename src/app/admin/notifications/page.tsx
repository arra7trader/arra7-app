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
            <div className="max-w-4xl mx-auto px-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold">🔔 Push Notifications</h1>
                        <p className="text-gray-400 text-sm">Kirim notifikasi ke semua subscriber</p>
                    </div>
                    <Link href="/admin">
                        <button className="px-4 py-2 bg-[#1F2937] hover:bg-[#374151] rounded-lg text-sm">
                            ← Kembali
                        </button>
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-[#12141A] rounded-xl p-4 border border-[#1F2937]">
                        <p className="text-sm text-gray-400">Subscribers</p>
                        <p className="text-3xl font-bold text-blue-400">{subscriberCount}</p>
                    </div>
                    <div className="bg-[#12141A] rounded-xl p-4 border border-[#1F2937]">
                        <p className="text-sm text-gray-400">VAPID Config</p>
                        <p className={`text-lg font-bold ${vapidConfigured ? 'text-green-400' : 'text-red-400'}`}>
                            {vapidConfigured ? '✅ Ready' : '❌ Not Set'}
                        </p>
                    </div>
                    <div className="bg-[#12141A] rounded-xl p-4 border border-[#1F2937]">
                        <p className="text-sm text-gray-400">Total Sent</p>
                        <p className="text-3xl font-bold text-purple-400">
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
                                ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                                : 'bg-red-500/20 border border-red-500/30 text-red-400'
                            }`}
                    >
                        {message.text}
                    </motion.div>
                )}

                {/* Quick Templates */}
                <div className="bg-[#12141A] rounded-2xl border border-[#1F2937] p-6 mb-6">
                    <h3 className="text-lg font-semibold mb-4">⚡ Quick Templates</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {TEMPLATES.map((template) => (
                            <button
                                key={template.id}
                                onClick={() => useTemplate(template)}
                                className="flex flex-col items-center gap-2 p-3 bg-[#1F2937] hover:bg-[#374151] rounded-xl transition-colors"
                            >
                                <span className="text-2xl">{template.icon}</span>
                                <span className="text-xs text-center">{template.title.split('!')[0]}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Send Form */}
                <div className="bg-[#12141A] rounded-2xl border border-[#1F2937] p-6 mb-6">
                    <h3 className="text-lg font-semibold mb-4">📤 Kirim Notifikasi</h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Judul notifikasi..."
                                className="w-full bg-[#1F2937] border border-[#374151] rounded-lg px-4 py-3 focus:border-blue-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Body</label>
                            <textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                placeholder="Isi pesan notifikasi..."
                                rows={3}
                                className="w-full bg-[#1F2937] border border-[#374151] rounded-lg px-4 py-3 focus:border-blue-500 outline-none resize-none"
                            />
                        </div>

                        <button
                            onClick={() => sendNotification()}
                            disabled={sending || !title || !body || !vapidConfigured}
                            className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {sending ? '⏳ Mengirim...' : `🚀 Kirim ke ${subscriberCount} Subscriber`}
                        </button>

                        {!vapidConfigured && (
                            <p className="text-sm text-red-400 text-center">
                                ⚠️ Set VAPID_PRIVATE_KEY di Vercel Environment Variables
                            </p>
                        )}
                    </div>
                </div>

                {/* Recent Notifications */}
                <div className="bg-[#12141A] rounded-2xl border border-[#1F2937] p-6">
                    <h3 className="text-lg font-semibold mb-4">📋 Recent Notifications</h3>

                    {recentNotifications.length > 0 ? (
                        <div className="space-y-3">
                            {recentNotifications.map((notif) => (
                                <div key={notif.id} className="p-3 bg-[#1F2937] rounded-lg">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-medium">{notif.title}</p>
                                            <p className="text-sm text-gray-400">{notif.body}</p>
                                        </div>
                                        <div className="text-right text-xs">
                                            <p className="text-green-400">✅ {notif.sent_count}</p>
                                            {notif.failed_count > 0 && (
                                                <p className="text-red-400">❌ {notif.failed_count}</p>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        {new Date(notif.sent_at).toLocaleString('id-ID')}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-8">Belum ada notifikasi dikirim</p>
                    )}
                </div>
            </div>
        </div>
    );
}
