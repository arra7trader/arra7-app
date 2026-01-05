'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const ADMIN_EMAILS = ['apmexplore@gmail.com'];

export default function AdminReportPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [report, setReport] = useState<string>('');
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [channelId, setChannelId] = useState('');

    const isAdmin = session?.user?.email && ADMIN_EMAILS.includes(session.user.email);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login?callbackUrl=/admin/report');
        } else if (status === 'authenticated' && !isAdmin) {
            router.push('/');
        }
    }, [status, isAdmin, router]);

    const generateReport = async () => {
        setLoading(true);
        setMessage(null);
        try {
            const res = await fetch('/api/admin/report?action=generate');
            const data = await res.json();
            if (data.status === 'success') {
                setReport(data.data.report);
                setSummary(data.data.summary);
            } else {
                setMessage({ type: 'error', text: data.message });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to generate report' });
        } finally {
            setLoading(false);
        }
    };

    const sendToTelegram = async () => {
        if (!report) {
            setMessage({ type: 'error', text: 'Generate report terlebih dahulu' });
            return;
        }

        setSending(true);
        setMessage(null);
        try {
            const res = await fetch('/api/admin/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'send_telegram',
                    report,
                    channelId: channelId || undefined,
                }),
            });
            const data = await res.json();
            if (data.status === 'success') {
                setMessage({ type: 'success', text: 'Report berhasil dikirim ke Telegram!' });
            } else {
                setMessage({ type: 'error', text: data.message });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to send to Telegram' });
        } finally {
            setSending(false);
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
                <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAdmin) {
        return null;
    }

    return (
        <div className="relative min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8 bg-[var(--bg-primary)]">
            <div className="relative max-w-4xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex items-center gap-4 mb-4">
                        <Link href="/admin" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                            ← Back to Admin
                        </Link>
                    </div>
                    <h1 className="text-3xl font-bold mb-2 text-[var(--text-primary)]">
                        📊 Daily Report <span className="gradient-text">Manager</span>
                    </h1>
                    <p className="text-[var(--text-secondary)]">
                        Generate dan kirim report harian ke channel Telegram
                    </p>
                </motion.div>

                {/* Message */}
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 rounded-xl mb-6 ${message.type === 'success'
                            ? 'bg-green-50 border border-green-200 text-green-700'
                            : 'bg-red-50 border border-red-200 text-red-700'
                            }`}
                    >
                        {message.text}
                    </motion.div>
                )}

                {/* Summary Stats */}
                {summary && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6"
                    >
                        <div className="bg-white rounded-xl p-4 border border-[var(--border-light)] text-center">
                            <p className="text-2xl font-bold text-[var(--text-primary)]">{summary.total}</p>
                            <p className="text-xs text-[var(--text-muted)]">Total</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-[var(--border-light)] text-center">
                            <p className="text-2xl font-bold text-green-600">{summary.tpHit}</p>
                            <p className="text-xs text-[var(--text-muted)]">TP Hit</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-[var(--border-light)] text-center">
                            <p className="text-2xl font-bold text-red-600">{summary.slHit}</p>
                            <p className="text-xs text-[var(--text-muted)]">SL Hit</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-[var(--border-light)] text-center">
                            <p className="text-2xl font-bold text-amber-600">{summary.pending}</p>
                            <p className="text-xs text-[var(--text-muted)]">Pending</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-[var(--border-light)] text-center">
                            <p className="text-2xl font-bold gradient-text">{summary.winRate}%</p>
                            <p className="text-xs text-[var(--text-muted)]">Win Rate</p>
                        </div>
                    </motion.div>
                )}

                {/* Generate Button */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-xl p-6 border border-[var(--border-light)] mb-6"
                >
                    <h2 className="text-lg font-bold mb-4 text-[var(--text-primary)]">Step 1: Generate Report</h2>
                    <button
                        onClick={generateReport}
                        disabled={loading}
                        className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
                    >
                        {loading ? 'Generating...' : '🔄 Generate Daily Report'}
                    </button>
                </motion.div>

                {/* Report Preview */}
                {report && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-xl p-6 border border-[var(--border-light)] mb-6"
                    >
                        <h2 className="text-lg font-bold mb-4 text-[var(--text-primary)]">Step 2: Preview & Edit</h2>
                        <textarea
                            value={report}
                            onChange={(e) => setReport(e.target.value)}
                            rows={15}
                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-xl p-4 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-[var(--text-primary)]"
                        />
                    </motion.div>
                )}

                {/* Send to Telegram */}
                {report && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-xl p-6 border border-[var(--border-light)]"
                    >
                        <h2 className="text-lg font-bold mb-4 text-[var(--text-primary)]">Step 3: Send to Telegram</h2>

                        <div className="mb-4">
                            <label className="block text-sm text-[var(--text-secondary)] mb-2">
                                Channel ID (optional, uses default if empty)
                            </label>
                            <input
                                type="text"
                                value={channelId}
                                onChange={(e) => setChannelId(e.target.value)}
                                placeholder="@arra7trader atau -100xxxxxxxxxx"
                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-[var(--text-primary)]"
                            />
                        </div>

                        <button
                            onClick={sendToTelegram}
                            disabled={sending}
                            className="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {sending ? (
                                'Sending...'
                            ) : (
                                <>
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                                    </svg>
                                    Kirim ke Telegram Channel
                                </>
                            )}
                        </button>

                        <p className="text-xs text-[var(--text-muted)] mt-4 text-center">
                            ⚠️ Pastikan Bot Telegram sudah dikonfigurasi di environment variables
                        </p>
                    </motion.div>
                )}

                {/* Info */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl"
                >
                    <h3 className="font-semibold text-blue-700 mb-2">ℹ️ Setup Telegram Bot</h3>
                    <ol className="list-decimal list-inside text-sm text-blue-600 space-y-1">
                        <li>Buat bot di @BotFather di Telegram</li>
                        <li>Dapatkan Bot Token</li>
                        <li>Add bot ke channel sebagai Admin</li>
                        <li>Set environment variables: TELEGRAM_BOT_TOKEN dan TELEGRAM_CHANNEL_ID</li>
                    </ol>
                </motion.div>
            </div>
        </div>
    );
}
