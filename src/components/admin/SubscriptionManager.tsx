
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface SubscriptionManagerProps {
    userId: string;
    initialStatus: 'free' | 'active' | 'expired';
    initialTelegramId?: string;
    onUpdate?: () => void;
}

export default function SubscriptionManager({ userId, initialStatus, initialTelegramId, onUpdate }: SubscriptionManagerProps) {
    const [status, setStatus] = useState<'free' | 'active' | 'expired'>(initialStatus);
    const [telegramId, setTelegramId] = useState(initialTelegramId || '');
    const [duration, setDuration] = useState(30); // Default 30 days
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleUpdate = async () => {
        setLoading(true);
        setMessage(null);

        try {
            const res = await fetch(`/api/admin/users/${userId}/subscription`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status,
                    telegramChatId: telegramId,
                    durationDays: status === 'active' ? duration : undefined
                })
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: 'Subscription updated successfully' });
                if (onUpdate) onUpdate();
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to update' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Network error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                💎 Exclusive Subscription
            </h3>

            {/* Status Select */}
            <div>
                <label className="block text-xs text-slate-400 mb-1">Status</label>
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white outline-none focus:border-blue-500"
                >
                    <option value="free">Free</option>
                    <option value="active">Active (Premium)</option>
                    <option value="expired">Expired</option>
                </select>
            </div>

            {/* Telegram ID Input */}
            <div>
                <label className="block text-xs text-slate-400 mb-1">Telegram Chat ID</label>
                <input
                    type="text"
                    value={telegramId}
                    onChange={(e) => setTelegramId(e.target.value)}
                    placeholder="e.g. 123456789"
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white outline-none focus:border-blue-500"
                />
                <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                    User must chat to bot first to get ID.
                </p>
            </div>

            {/* Duration Input (Only if active) */}
            {status === 'active' && (
                <div>
                    <label className="block text-xs text-slate-400 mb-1">Duration (Days)</label>
                    <input
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white outline-none focus:border-blue-500"
                    />
                </div>
            )}

            {/* Submit Button */}
            <button
                onClick={handleUpdate}
                disabled={loading}
                className={`w-full py-2 rounded font-medium transition-colors ${loading ? 'bg-slate-700 text-slate-400' : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
            >
                {loading ? 'Updating...' : 'Save Changes'}
            </button>

            {/* Feedback Message */}
            {message && (
                <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-2 rounded text-xs text-center ${message.type === 'success' ? 'bg-green-900/50 text-green-300 border border-green-800' : 'bg-red-900/50 text-red-300 border border-red-800'
                        }`}
                >
                    {message.text}
                </motion.div>
            )}
        </div>
    );
}
