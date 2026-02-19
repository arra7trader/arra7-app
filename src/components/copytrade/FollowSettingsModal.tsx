'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface FollowSettingsModalProps {
    provider: { id: string; display_name: string; subscription_fee: number; profit_sharing_percent: number };
    onClose: () => void;
}

export default function FollowSettingsModal({ provider, onClose }: FollowSettingsModalProps) {
    const router = useRouter();
    const [allocatedCapital, setAllocatedCapital] = useState(100);
    const [riskMultiplier, setRiskMultiplier] = useState(1.0);
    const [maxDrawdown, setMaxDrawdown] = useState(20);
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
                    allocatedCapital,
                    riskMultiplier,
                    maxDrawdownPercent: maxDrawdown,
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
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-gray-900">Copy <span className="text-blue-600">{provider.display_name}</span></h2>
                        <p className="text-sm text-gray-500 mt-1">Atur preferensi copy trading kamu</p>
                    </div>

                    {success ? (
                        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center py-8">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="font-semibold text-gray-900">Berhasil! Mengalihkan ke dashboard...</p>
                        </motion.div>
                    ) : (
                        <div className="space-y-5">
                            {/* Allocated Capital */}
                            <div>
                                <label className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                                    <span>Modal Dialokasikan</span>
                                    <span className="text-blue-600 font-bold">${allocatedCapital}</span>
                                </label>
                                <input
                                    type="range" min={10} max={10000} step={10}
                                    value={allocatedCapital}
                                    onChange={(e) => setAllocatedCapital(Number(e.target.value))}
                                    className="w-full accent-blue-600"
                                />
                                <div className="flex justify-between text-xs text-gray-400 mt-1"><span>$10</span><span>$10,000</span></div>
                            </div>

                            {/* Risk Multiplier */}
                            <div>
                                <label className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                                    <span>Risk Multiplier</span>
                                    <span className={`font-bold ${riskMultiplier > 1.5 ? 'text-red-500' : riskMultiplier > 1 ? 'text-yellow-500' : 'text-green-600'}`}>{riskMultiplier}x</span>
                                </label>
                                <input
                                    type="range" min={0.1} max={2.0} step={0.1}
                                    value={riskMultiplier}
                                    onChange={(e) => setRiskMultiplier(Number(e.target.value))}
                                    className="w-full accent-blue-600"
                                />
                                <div className="flex justify-between text-xs text-gray-400 mt-1"><span>0.1x (Lebih Aman)</span><span>2x (Agresif)</span></div>
                            </div>

                            {/* Max Drawdown */}
                            <div>
                                <label className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                                    <span>Stop Loss Otomatis</span>
                                    <span className="text-orange-500 font-bold">{maxDrawdown}%</span>
                                </label>
                                <input
                                    type="range" min={5} max={50} step={5}
                                    value={maxDrawdown}
                                    onChange={(e) => setMaxDrawdown(Number(e.target.value))}
                                    className="w-full accent-blue-600"
                                />
                                <div className="flex justify-between text-xs text-gray-400 mt-1"><span>5% (Konservatif)</span><span>50% (Agresif)</span></div>
                            </div>

                            {/* Fee Info */}
                            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-700 space-y-1">
                                <div className="flex justify-between">
                                    <span>Biaya Langganan:</span>
                                    <span className="font-bold">{provider.subscription_fee > 0 ? `Rp ${provider.subscription_fee.toLocaleString()}/bln` : 'Gratis'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Profit Sharing:</span>
                                    <span className="font-bold">{provider.profit_sharing_percent}%</span>
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">{error}</div>
                            )}

                            <button
                                onClick={handleFollow}
                                disabled={loading}
                                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Memproses...' : `Mulai Copy ${provider.display_name}`}
                            </button>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
