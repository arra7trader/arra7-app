'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { XMarkIcon, PaperAirplaneIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export default function PicaBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: "Halo Kak! 👋 Ada yang bisa PICA bantu seputar trading atau aplikasi hari ini?" }
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

            if (res.ok) {
                if (data.reply) {
                    setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
                } else {
                    setMessages(prev => [...prev, { role: 'assistant', content: "Maaf Kak, jawaban kosong. Coba tanya lagi ya!" }]);
                }
            } else {
                const errorMsg = data.reply || data.error || "Maaf Kak, lagi ada gangguan sistem. Coba refresh ya! 🔄";
                setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
            }

        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Jaringan bermasalah atau server sibuk. Coba 1 menit lagi ya. 📡" }]);
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
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center text-white cursor-pointer"
            >
                {isOpen ? (
                    <XMarkIcon className="w-6 h-6" />
                ) : (
                    <ChatBubbleLeftRightIcon className="w-7 h-7" />
                )}
            </motion.button>

            {/* CHAT WINDOW - PURE LIGHT THEME */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="fixed bottom-24 right-6 z-50 w-[90vw] max-w-[380px] h-[520px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
                    >
                        {/* HEADER */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between text-white">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-base">
                                    🤖
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">PICA Bot Assistant</h3>
                                    <p className="text-xs text-blue-100 flex items-center gap-1">
                                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                        Online • Neural AI
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* MESSAGES AREA */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`
                                            max-w-[82%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-xs
                                            ${msg.role === 'user'
                                                ? 'bg-blue-600 text-white rounded-tr-none'
                                                : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none'
                                            }
                                        `}
                                    >
                                        {msg.role === 'user' ? (
                                            msg.content
                                        ) : (
                                            <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 text-slate-800 prose-a:text-blue-600 font-sans">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {msg.content}
                                                </ReactMarkdown>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-200 shadow-xs flex items-center gap-1.5">
                                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce duration-500" />
                                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce duration-500 delay-100" />
                                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce duration-500 delay-200" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* INPUT AREA */}
                        <div className="p-3 bg-white border-t border-slate-200">
                            <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2 border border-slate-200 focus-within:border-blue-500 focus-within:bg-white transition-all">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                    placeholder="Tanya PICA sesuatu..."
                                    className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || isTyping}
                                    className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
                                >
                                    <PaperAirplaneIcon className="w-4 h-4" />
                                </button>
                            </div>
                            <p className="text-[10px] text-center text-slate-400 mt-2">
                                Didukung PICA Neural Intelligence. Selalu lakukan analisis mandiri (DYOR).
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
