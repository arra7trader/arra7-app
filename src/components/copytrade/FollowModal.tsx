'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
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

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <AnimatePresence>
                {isOpen && (
                    <Dialog.Portal forceMount>
                        <Dialog.Overlay asChild>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
                            />
                        </Dialog.Overlay>
                        <Dialog.Content asChild>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#1c1c1e] 
                                         border border-white/10 rounded-2xl p-6 shadow-2xl z-50"
                            >
                                <Dialog.Title className="text-xl font-bold text-white mb-2">
                                    Copy {provider?.display_name}
                                </Dialog.Title>
                                <Dialog.Description className="text-sm text-gray-400 mb-6">
                                    Configure your copy trading settings. You can stop copying at any time.
                                </Dialog.Description>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Allocation */}
                                    <div>
                                        <label className="flex justify-between text-sm text-gray-300 mb-2">
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
                                            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--accent-blue)]"
                                        />
                                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                                            <span>$10</span>
                                            <span>$5,000</span>
                                        </div>
                                    </div>

                                    {/* Risk Multiplier */}
                                    <div>
                                        <label className="flex justify-between text-sm text-gray-300 mb-2">
                                            <span>Risk Multiplier</span>
                                            <span className={`font-medium ${riskMultiplier > 1 ? 'text-red-400' : 'text-green-400'}`}>
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
                                            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--accent-blue)]"
                                        />
                                        <p className="text-xs text-gray-500 mt-2">
                                            0.5x = Lower risk (half lot sizes)<br />
                                            2.0x = Higher risk (double lot sizes)
                                        </p>
                                    </div>

                                    {/* Max Drawdown Protection */}
                                    <div>
                                        <label className="flex justify-between text-sm text-gray-300 mb-2">
                                            <span>Max Drawdown Stop</span>
                                            <span className="text-red-400 font-medium">{maxDrawdown}%</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="5"
                                            max="50"
                                            step="1"
                                            value={maxDrawdown}
                                            onChange={(e) => setMaxDrawdown(Number(e.target.value))}
                                            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-red-500"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Automatically stop copying if equity drops by this percentage.
                                        </p>
                                    </div>

                                    {/* Fee Summary */}
                                    <div className="p-4 bg-black/20 rounded-xl border border-white/5 space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Subscription Fee</span>
                                            <span className="text-white">
                                                {provider?.subscription_fee > 0
                                                    ? format.number(provider.subscription_fee, { style: 'currency', currency: 'IDR' }) + '/mo'
                                                    : 'Free'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Profit Share</span>
                                            <span className="text-white">{provider?.profit_sharing_percent}%</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
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
                        </Dialog.Content>
                    </Dialog.Portal>
                )}
            </AnimatePresence>
        </Dialog.Root>
    );
}
