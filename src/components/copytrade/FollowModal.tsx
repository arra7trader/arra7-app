'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFormatter } from 'next-intl';

interface FollowModalProps {
    isOpen: boolean;
    onClose: () => void;
    provider: any;
    onConfirm: (allocation: number, riskMultiplier: number, maxDrawdown: number) => void;
}

export default function FollowModal({ isOpen, onClose, provider, onConfirm }: FollowModalProps) {
    const format = useFormatter();
    const [allocation, setAllocation] = useState(100);
    const [riskMultiplier, setRiskMultiplier] = useState(1.0);
    const [maxDrawdown, setMaxDrawdown] = useState(20);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(allocation, riskMultiplier, maxDrawdown);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md bg-white border border-[var(--border-light)] rounded-2xl p-6 shadow-2xl z-50 max-h-[90vh] overflow-y-auto"
                    >
                        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                            Copy {provider?.display_name}
                        </h2>
                        <p className="text-sm text-[var(--text-secondary)] mb-6">
                            Configure your copy trading settings. You can stop copying at any time.
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Allocation */}
                            <div>
                                <label className="flex justify-between text-sm text-[var(--text-secondary)] mb-2">
                                    <span>Allocated Capital (USD)</span>
                                    <span className="text-[var(--accent-blue)] font-medium">${allocation}</span>
                                </label>
                                <input
                                    type="range"
                                    min="10"
                                    max="5000"
                                    step="10"
                                    value={allocation}
                                    onChange={(e) => setAllocation(Number(e.target.value))}
                                    className="w-full h-2 bg-[var(--bg-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-blue)]"
                                />
                                <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
                                    <span>$10</span>
                                    <span>$5,000</span>
                                </div>
                            </div>

                            {/* Risk Multiplier */}
                            <div>
                                <label className="flex justify-between text-sm text-[var(--text-secondary)] mb-2">
                                    <span>Risk Multiplier</span>
                                    <span className={`font-medium ${riskMultiplier > 1 ? 'text-red-500' : 'text-green-500'}`}>
                                        {riskMultiplier}x
                                    </span>
                                </label>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="2.0"
                                    step="0.1"
                                    value={riskMultiplier}
                                    onChange={(e) => setRiskMultiplier(Number(e.target.value))}
                                    className="w-full h-2 bg-[var(--bg-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-blue)]"
                                />
                                <p className="text-xs text-[var(--text-muted)] mt-2">
                                    0.5x = Lower risk (half lot sizes)<br />
                                    2.0x = Higher risk (double lot sizes)
                                </p>
                            </div>

                            {/* Max Drawdown Protection */}
                            <div>
                                <label className="flex justify-between text-sm text-[var(--text-secondary)] mb-2">
                                    <span>Max Drawdown Stop</span>
                                    <span className="text-red-500 font-medium">{maxDrawdown}%</span>
                                </label>
                                <input
                                    type="range"
                                    min="5"
                                    max="50"
                                    step="1"
                                    value={maxDrawdown}
                                    onChange={(e) => setMaxDrawdown(Number(e.target.value))}
                                    className="w-full h-2 bg-[var(--bg-secondary)] rounded-lg appearance-none cursor-pointer accent-red-500"
                                />
                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                    Automatically stop copying if equity drops by this percentage.
                                </p>
                            </div>

                            {/* Fee Summary */}
                            <div className="p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-light)] space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-[var(--text-secondary)]">Subscription Fee</span>
                                    <span className="text-[var(--text-primary)] font-medium">
                                        {provider?.subscription_fee > 0
                                            ? format.number(provider.subscription_fee, { style: 'currency', currency: 'IDR' }) + '/mo'
                                            : 'Free'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-[var(--text-secondary)]">Profit Share</span>
                                    <span className="text-[var(--text-primary)] font-medium">{provider?.profit_sharing_percent}%</span>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--border-light)] text-[var(--text-primary)] font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 rounded-xl bg-[var(--accent-blue)] hover:bg-blue-600 text-white font-bold transition-colors shadow-lg shadow-blue-500/20"
                                >
                                    Confirm Copy
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
