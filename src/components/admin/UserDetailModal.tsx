
import React, { useState, useEffect } from 'react';
import { User } from './UserTable';
import SubscriptionManager from './SubscriptionManager';
import { motion, AnimatePresence } from 'framer-motion';

interface Log {
    id: number;
    action: string;
    details: Record<string, unknown> | null;
    createdAt: string;
}

interface UserDetailModalProps {
    user: User | null;
    onClose: () => void;
    onEdit?: () => void;
}

export default function UserDetailModal({ user, onClose, onEdit }: UserDetailModalProps) {
    const [logs, setLogs] = useState<Log[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(true);

    useEffect(() => {
        if (user?.id) {
            fetch(`/api/admin/activity?userId=${user.id}&limit=10`)
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'success') {
                        setLogs(data.logs);
                    }
                })
                .catch(err => console.error('Fetch logs error:', err))
                .finally(() => setLoadingLogs(false));
        }
    }, [user?.id]);

    if (!user) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-[var(--bg-primary)] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="p-6 border-b border-[var(--border-light)] flex justify-between items-center sticky top-0 bg-[var(--bg-primary)] z-10">
                        <h2 className="text-xl font-bold text-[var(--text-primary)]">User Details</h2>
                        <button onClick={onClose} className="p-2 hover:bg-[var(--bg-secondary)] rounded-full transition-colors">
                            <svg className="w-6 h-6 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="p-6 space-y-8">
                        {/* Header Profile */}
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                                {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-[var(--text-primary)]">{user.name || 'No Name'}</h3>
                                <p className="text-[var(--text-secondary)]">{user.email}</p>
                                <div className="flex gap-2 mt-2">
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${user.membership === 'VVIP' ? 'bg-amber-100 text-amber-700' : user.membership === 'PRO' ? 'bg-blue-100 text-blue-700' : 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'}`}>
                                        {user.membership}
                                    </span>
                                    {user.downloadedApk && (
                                        <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-700">
                                            APK User
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Subscription Manager */}
                        <div className="bg-slate-900/5 p-4 rounded-xl border border-[var(--border-light)]">
                            <SubscriptionManager
                                userId={user.id}
                                initialStatus={user.subscriptionStatus || 'free'}
                                initialTelegramId={user.telegramChatId || ''}
                                onUpdate={() => {
                                    // Ideally refresh user data here
                                    if (onEdit) onEdit(); // Trigger refresh if parent supports it
                                }}
                            />
                        </div>

                        {/* Recent Activity Grid */}
                        <div>
                            <h4 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Recent Activity</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-[var(--bg-secondary)] p-4 rounded-xl">
                                    <p className="text-xs text-[var(--text-secondary)] mb-1">Last Login</p>
                                    <p className="font-medium text-[var(--text-primary)]">
                                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('id-ID') : 'Never'}
                                    </p>
                                </div>
                                <div className="bg-[var(--bg-secondary)] p-4 rounded-xl">
                                    <p className="text-xs text-[var(--text-secondary)] mb-1">Registered On</p>
                                    <p className="font-medium text-[var(--text-primary)]">
                                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('id-ID') : 'Unknown'}
                                    </p>
                                </div>
                                <div className="bg-[var(--bg-secondary)] p-4 rounded-xl">
                                    <p className="text-xs text-[var(--text-secondary)] mb-1">Location</p>
                                    <p className="font-medium text-[var(--text-primary)] flex items-center gap-2">
                                        {user.lastLoginCity || user.lastLoginCountry ? (
                                            <>
                                                <span>📍</span>
                                                {user.lastLoginCity}, {user.lastLoginCountry}
                                            </>
                                        ) : (
                                            <span className="text-gray-400">Unknown Location</span>
                                        )}
                                    </p>
                                    {user.lastLoginIp && <p className="text-xs text-gray-400 font-mono mt-1">{user.lastLoginIp}</p>}
                                </div>
                                <div className="bg-[var(--bg-secondary)] p-4 rounded-xl">
                                    <p className="text-xs text-[var(--text-secondary)] mb-1">Telegram Chat ID</p>
                                    <p className="font-medium text-[var(--text-primary)]">
                                        {user.telegramChatId || 'Belum diisi'}
                                    </p>
                                </div>
                                <div className="bg-[var(--bg-secondary)] p-4 rounded-xl">
                                    <p className="text-xs text-[var(--text-secondary)] mb-1">Usage Today</p>
                                    <div className="flex items-end gap-2">
                                        <span className="text-2xl font-bold text-[var(--text-primary)]">{user.todayUsage}</span>
                                        <span className="text-sm text-[var(--text-secondary)] mb-1">requests</span>
                                    </div>
                                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                                        Forex: {user.forexUsage} • Stocks: {user.stockUsage}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Analysis History / Logs */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Activity Logs</h4>

                            {loadingLogs ? (
                                <div className="text-center py-8 text-gray-400">Loading activity...</div>
                            ) : logs.length > 0 ? (
                                <div className="bg-[var(--bg-secondary)] rounded-xl overflow-hidden border border-[var(--border-light)]">
                                    <table className="w-full text-sm">
                                        <thead className="bg-[var(--bg-secondary)]/50">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">Time</th>
                                                <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">Action</th>
                                                <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">Details</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {logs.map((log) => (
                                                <tr key={log.id} className="hover:bg-[var(--bg-secondary)]/50 transition-colors">
                                                    <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">
                                                        {new Date(log.createdAt).toLocaleString('id-ID', {
                                                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </td>
                                                    <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                                                        <span className={`px-2 py-1 rounded text-xs ${log.action === 'REGISTER_ADMIN' ? 'bg-green-100 text-green-700' :
                                                            log.action === 'UPDATE_ADMIN' ? 'bg-blue-100 text-blue-700' :
                                                                log.action === 'LOGIN' ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)]' :
                                                                    'bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                                                            }`}>
                                                            {log.action}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-[var(--text-secondary)] max-w-xs truncate" title={JSON.stringify(log.details, null, 2)}>
                                                        {typeof log.details?.message === 'string'
                                                            ? log.details.message
                                                            : JSON.stringify(log.details)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="bg-[var(--bg-secondary)] rounded-xl p-8 text-center border-dashed border-[var(--border-light)]">
                                    <p className="text-gray-400">No activity logs found.</p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-4 gap-3">
                            <button
                                onClick={() => {
                                    onClose();
                                    onEdit?.();
                                }}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                Edit User
                            </button>
                            <button
                                onClick={onClose}
                                className="px-6 py-2 bg-[var(--bg-secondary)] hover:bg-gray-200 text-[var(--text-primary)] rounded-lg font-medium transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div >
        </AnimatePresence >
    );
}
