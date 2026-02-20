'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface FollowSettingsModalProps {
    provider: { id: string; display_name: string; subscription_fee: number; profit_sharing_percent: number; broker_name?: string };
    onClose: () => void;
}

export default function FollowSettingsModal({ provider, onClose }: FollowSettingsModalProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleFollow = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/copytrade/follow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    providerId: provider.id,
                    allocatedCapital: 0,
                    riskMultiplier: 1,
                    maxDrawdownPercent: 0,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Gagal mengikuti provider');
            setSuccess(true);
            setTimeout(() => { onClose(); router.push('/copytrade/dashboard'); }, 1500);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600" />

                    {/* Header */}
                    <button onClick={onClose} className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 rounded-full p-1.5 hover:bg-gray-100">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <div className="mb-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-blue-500/30 mx-auto mb-4 border-4 border-white">
                            {provider.display_name?.charAt(0) ?? 'P'}
                        </div>
                        <h2 className="text-xl font-black text-gray-900 mb-1">{provider.display_name}</h2>
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">Official Master Trader</span>
                    </div>

                    {success ? (
                        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center py-6">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="font-bold text-gray-900 text-lg">Berhasil Mengikuti!</p>
                            <p className="text-sm text-gray-500 mt-1">Mengalihkan ke Signal Feed...</p>
                        </motion.div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-center">
                                <h3 className="font-bold text-slate-800 text-sm mb-2">Ingin mengikuti Master ini?</h3>
                                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                                    Anda akan menerima Notifikasi Telegram Gratis setiap kali {provider.display_name} merilis sinyal trading baru. Anda bebas memilih sinyal mana yang ingin dibeli menggunakan Koin.
                                </p>
                                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100">
                                    🪙 Pay-Per-Signal
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm font-medium text-red-600 text-center">{error}</div>
                            )}

                            <button
                                onClick={handleFollow}
                                disabled={loading}
                                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-60 flex justify-center items-center gap-2"
                            >
                                {loading && <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                                {loading ? 'Memproses...' : `Ya, Ikuti ${provider.display_name}`}
                            </button>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
