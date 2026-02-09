'use client';

import { useChat } from '@ai-sdk/react';
import VipGate from '@/components/vvip/VipGate';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function CompanionPage() {
    return (
        <VipGate>
            <ChatInterface />
        </VipGate>
    );
}

function ChatInterface() {
    const [input, setInput] = useState('');

    // @ts-ignore - sendMessage is available but maybe typed oddly in this version
    const { messages, sendMessage, isLoading } = useChat({
        // @ts-ignore - api option might be missing from strict types
        api: '/api/chat/vvip',
        onError: (error: any) => {
            console.error('Chat error details:', error);
            let msg = 'Gagal terhubung ke AI.';
            try {
                // Combine parsing attempts
                const errorObj = JSON.parse(error.message);
                msg = errorObj.error || errorObj.message || msg;
                if (errorObj.details) console.warn('Backend Error Details:', errorObj.details);
            } catch (e) {
                msg = error.message || msg;
            }

            // Clean up common Vercel/Next.js error prefixes
            msg = msg.replace(/^An error occurred in the Server Components render.*/, 'Gangguan koneksi server.');

            alert(`⚠️ Sistem AI: ${msg}`);
        }
    });

    const scrollRef = useRef<HTMLDivElement>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        // @ts-ignore - sendMessage expects message object
        await sendMessage({ role: 'user', content: input });
        setInput('');
    };

    const activeSkills = [
        { id: '1', name: 'Wait-and-See', status: 'active', color: 'green' },
        { id: '2', name: 'Sentiment Sniffer', status: 'idle', color: 'gray' },
        { id: '3', name: 'Whale Alert', status: 'active', color: 'blue' },
    ];

    return (
        <div className="flex h-[calc(100vh-64px)] bg-gray-50 text-gray-900 overflow-hidden relative">
            {/* Sidebar (Skills / Context) */}
            <AnimatePresence mode="wait">
                {isSidebarOpen && (
                    <motion.aside
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 280, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        className="hidden md:flex flex-col border-r border-gray-200 bg-white/50 backdrop-blur-md"
                    >
                        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                            <h2 className="font-bold text-amber-600 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                ARRA7 PI
                            </h2>
                            <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-4 space-y-6 overflow-y-auto flex-1">
                            {/* System Status */}
                            <div>
                                <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-3 font-semibold">System Status</h3>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">Waktu Respon</span>
                                        <span className="text-green-600 font-mono">12ms</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">Jendela Konteks</span>
                                        <span className="text-blue-600 font-mono">128k</span>
                                    </div>
                                </div>
                            </div>

                            {/* Active Skills */}
                            <div>
                                <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-3 font-semibold">Skill Aktif</h3>
                                <div className="space-y-2">
                                    {activeSkills.map((skill) => (
                                        <div key={skill.id} className="flex items-center gap-3 p-2 rounded-lg bg-white border border-gray-200 hover:border-gray-300 transition-colors shadow-sm">
                                            <div className={`w-2 h-2 rounded-full ${skill.status === 'active' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-gray-400'}`} />
                                            <div className="flex-1">
                                                <div className="text-sm font-medium text-gray-700">{skill.name}</div>
                                                <div className="text-[10px] text-gray-500 uppercase">{skill.status}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Recent Analysis (Mock) */}
                            <div>
                                <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-3 font-semibold">Live Feed</h3>
                                <div className="relative pl-4 border-l border-gray-200 space-y-4">
                                    <div className="relative">
                                        <div className="absolute -left-[21px] top-1 w-2 h-2 rounded-full bg-blue-500" />
                                        <div className="text-[10px] text-gray-400 mb-1">10:42 WIB</div>
                                        <p className="text-xs text-gray-600">Volatilitas BTC terdeteksi. Memantau level kunci 64,200.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* Main Chat Area */}
            <main className="flex-1 flex flex-col h-full relative bg-white">
                {/* Header */}
                <header className="h-14 border-b border-gray-200 flex items-center px-6 bg-white/80 backdrop-blur justify-between z-10 sticky top-0">
                    <div className="flex items-center gap-4">
                        {!isSidebarOpen && (
                            <button onClick={() => setIsSidebarOpen(true)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                        )}
                        <h1 className="font-semibold text-gray-800">Private Intelligence Terminal</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200">VVIP SECURE</span>
                    </div>
                </header>

                {/* Messages */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth bg-gray-50"
                >
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 space-y-4">
                            <div className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                                <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-medium text-gray-800">Menunggu Perintah</h3>
                            <p className="max-w-md mx-auto text-sm text-gray-500">
                                "Siap menganalisis pasar global, mengeksekusi kueri kompleks, atau meninjau strategi portofolio Anda."
                            </p>
                        </div>
                    )}

                    {messages.map((m: any) => (
                        <motion.div
                            key={m.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-4 shadow-sm ${m.role === 'user'
                                ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-tr-sm shadow-amber-500/10'
                                : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'
                                }`}>
                                <div className={`text-xs font-bold mb-1 opacity-70 uppercase tracking-wider ${m.role === 'user' ? 'text-amber-100' : 'text-gray-500'
                                    }`}>
                                    {m.role === 'user' ? 'Anda' : 'Arra7 PI'}
                                </div>
                                <div className={`prose max-w-none text-sm prose-p:leading-relaxed ${m.role === 'user' ? 'prose-invert' : 'prose-gray'
                                    }`}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {m.content}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </motion.div>
                    ))}

                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white border border-gray-200 rounded-2xl p-4 rounded-tl-sm flex items-center gap-2 shadow-sm">
                                <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce"></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-gray-200 z-20">
                    <form onSubmit={handleSubmit} className="flex gap-4 max-w-4xl mx-auto relative group">

                        <input
                            className="flex-1 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder-gray-400 transition-all relative z-10"
                            value={input}
                            onChange={handleInputChange}
                            placeholder="Tanyakan analisis pasar, setup trading, atau wawasan portofolio..."
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 relative z-10 shadow-lg shadow-amber-500/20"
                        >
                            <span>Kirim</span>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </button>
                    </form>
                    <div className="text-center mt-2 text-[10px] text-gray-400">
                        AI dapat membuat kesalahan. Pertimbangkan untuk memeriksa informasi penting.
                    </div>
                </div>
            </main>
        </div>
    );
}
