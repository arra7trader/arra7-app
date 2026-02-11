'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { LockIcon, GemIcon, XIcon } from '@/components/PremiumIcons';
import { create } from 'zustand';

// Store to trigger popup globally
interface PopupState {
    isOpen: boolean;
    openPopup: () => void;
    closePopup: () => void;
}

export const useLowBalancePopup = create<PopupState>((set: any) => ({
    isOpen: false,
    openPopup: () => set({ isOpen: true }),
    closePopup: () => set({ isOpen: false }),
}));

export default function LowBalancePopup() {
    const { isOpen, closePopup } = useLowBalancePopup();
    const { data: session } = useSession();

    // Re-check session on open, though popup should only trigger if needed
    if (!session || session.user.tier !== 'BASIC') return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closePopup}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-md bg-[#0B0C10] border border-red-500/30 rounded-2xl shadow-2xl overflow-hidden"
                    >
                        {/* Header/Banner */}
                        <div className="bg-gradient-to-r from-red-900/80 to-slate-900 p-6 text-center relative">
                            <div className="absolute top-4 right-4 bg-black/40 rounded-full p-1 cursor-pointer hover:bg-black/60 transition-colors" onClick={closePopup}>
                                <XIcon size="sm" className="text-white/70" />
                            </div>

                            <div className="bg-red-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-offset-2 ring-offset-[#0B0C10] ring-red-500/30">
                                <LockIcon size="xl" className="text-red-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-1">Daily Limit Reached</h2>
                            <p className="text-red-200 text-sm">You've used your free daily analysis.</p>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-6">
                            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                                <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
                                    <span className="text-slate-400 text-sm">Your Plan</span>
                                    <span className="text-slate-200 font-bold bg-slate-800 px-2 py-0.5 rounded text-xs">BASIC</span>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-300">Daily Analysis</span>
                                        <span className="text-red-400 font-bold">1 / 1 (Max)</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-300">Deep AI Access</span>
                                        <span className="text-red-400 font-bold">LIMITED</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-300">Stocks & Crypto</span>
                                        <span className="text-red-400 font-bold">LOCKED 🔒</span>
                                    </div>
                                </div>
                            </div>

                            <div className="text-center space-y-3">
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    Unlock <strong>UNLIMITED</strong> analysis, access to all stocks & crypto, and get high-accuracy ML predictions.
                                </p>

                                <Link href="/pricing" onClick={closePopup} className="block w-full">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 transition-all"
                                    >
                                        <GemIcon size="sm" className="text-yellow-300" />
                                        <span>Upgrade to PRO - Rp 99k</span>
                                    </motion.button>
                                </Link>

                                <button
                                    onClick={closePopup}
                                    className="text-slate-500 text-xs hover:text-slate-300 transition-colors"
                                >
                                    Maybe later, I'll wait for tomorrow
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
