'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TelegramWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');

    const telegramUsername = 'arra7trader';

    const handleSendMessage = () => {
        if (message.trim()) {
            const encodedMessage = encodeURIComponent(message);
            window.open(`https://t.me/${telegramUsername}?text=${encodedMessage}`, '_blank');
            setMessage('');
            setIsOpen(false);
        } else {
            window.open(`https://t.me/${telegramUsername}`, '_blank');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        transition={{ type: 'spring', duration: 0.4 }}
                        className="absolute bottom-16 right-0 w-80 glass rounded-2xl border border-[#1F2937] overflow-hidden shadow-2xl"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-[#0088cc] to-[#00a2e8] p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                                    <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-white font-semibold">Chat dengan Kami</h3>
                                    <p className="text-white/80 text-sm">@{telegramUsername}</p>
                                </div>
                            </div>
                        </div>

                        {/* Chat Body */}
                        <div className="p-4 bg-[#0D1117]">
                            {/* Welcome Message */}
                            <div className="flex gap-3 mb-4">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0088cc] to-[#00a2e8] flex items-center justify-center flex-shrink-0">
                                    <span className="text-white text-xs font-bold">A7</span>
                                </div>
                                <div className="bg-[#1F2937] rounded-2xl rounded-tl-md px-4 py-3 max-w-[220px]">
                                    <p className="text-sm text-white">Halo! 👋</p>
                                    <p className="text-sm text-[#94A3B8] mt-1">Ada yang bisa kami bantu? Ketik pesan Anda di bawah.</p>
                                </div>
                            </div>

                            {/* Input */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Ketik pesan..."
                                    className="flex-1 bg-[#1F2937] border border-[#374151] rounded-xl px-4 py-3 text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#0088cc] transition-colors"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#0088cc] to-[#00a2e8] flex items-center justify-center hover:opacity-90 transition-opacity"
                                >
                                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                    </svg>
                                </button>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex flex-wrap gap-2 mt-3">
                                {['Tanya Harga', 'Bantuan', 'Demo'].map((text) => (
                                    <button
                                        key={text}
                                        onClick={() => setMessage(text)}
                                        className="px-3 py-1.5 bg-[#1F2937] hover:bg-[#374151] rounded-full text-xs text-[#94A3B8] hover:text-white transition-colors"
                                    >
                                        {text}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Button */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="relative w-14 h-14 rounded-full bg-gradient-to-r from-[#0088cc] to-[#00a2e8] flex items-center justify-center shadow-lg shadow-[#0088cc]/30 hover:shadow-[#0088cc]/50 transition-shadow"
            >
                <AnimatePresence mode="wait">
                    {isOpen ? (
                        <motion.svg
                            key="close"
                            initial={{ rotate: -90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: 90, opacity: 0 }}
                            className="w-6 h-6 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </motion.svg>
                    ) : (
                        <motion.svg
                            key="telegram"
                            initial={{ rotate: 90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: -90, opacity: 0 }}
                            className="w-7 h-7 text-white"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                        >
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                        </motion.svg>
                    )}
                </AnimatePresence>

                {/* Pulse Animation */}
                {!isOpen && (
                    <span className="absolute inset-0 rounded-full bg-[#0088cc] animate-ping opacity-25" />
                )}
            </motion.button>
        </div>
    );
}
