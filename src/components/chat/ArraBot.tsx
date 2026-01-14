'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, PaperAirplaneIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'; // Adjust import based on your icon library
// If PremiumIcons.tsx has specific icons, we can use those too, but heroicons is standard.
// Using standard SVGs to be safe if icons are missing.

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export default function ArraBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: "Halo Kak! 👋 Ada yang bisa ARRA bantu seputar trading atau aplikasi hari ini?" }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsTyping(true);

        try {
            const history = messages.map(m => ({ role: m.role, content: m.content }));

            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg,
                    conversationHistory: history
                }),
            });

            const data = await res.json();

            if (data.reply) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: "Maaf Kak, lagi ada gangguan sinyal nih. Coba lagi ya!" }]);
            }
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Error koneksi Kak. Cek internetnya dulu ya. 📡" }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            {/* FLOATING TOGGLE BUTTON */}
            <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-full shadow-lg flex items-center justify-center text-white"
            >
                {isOpen ? (
                    <XMarkIcon className="w-6 h-6" />
                ) : (
                    <ChatBubbleLeftRightIcon className="w-7 h-7" />
                )}
            </motion.button>

            {/* CHAT WINDOW */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="fixed bottom-24 right-6 z-50 w-[90vw] max-w-[380px] h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
                    >
                        {/* HEADER */}
                        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-4 flex items-center justify-between text-white">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                    🤖
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">ARRA Bot Support</h3>
                                    <p className="text-xs text-blue-100 flex items-center gap-1">
                                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                        Online
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* MESSAGES AREA */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`
                                            max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed
                                            ${msg.role === 'user'
                                                ? 'bg-blue-600 text-white rounded-tr-none'
                                                : 'bg-white text-gray-700 border border-gray-200 rounded-tl-none shadow-sm'
                                            }
                                        `}
                                    >
                                        {msg.content}
                                    </div>
                                </div>
                            ))}

                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-gray-200 shadow-sm flex items-center gap-1">
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce duration-500" />
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce duration-500 delay-100" />
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce duration-500 delay-200" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* INPUT AREA */}
                        <div className="p-3 bg-white border-t border-gray-100">
                            <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                    placeholder="Tanya ARRA sesuatu..."
                                    className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || isTyping}
                                    className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                    <PaperAirplaneIcon className="w-4 h-4" />
                                </button>
                            </div>
                            <p className="text-[10px] text-center text-gray-400 mt-2">
                                AI bisa salah. Selalu cek ulang (DYOR).
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

// Simple Icon Components to avoid dependency issues if heroicons isn't installed
function XMarkIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
    )
}

function ChatBubbleLeftRightIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
        </svg>
    )
}

function PaperAirplaneIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
        </svg>
    )
}
