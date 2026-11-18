'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BoltIcon, CrownIcon, CheckIcon, SparklesIcon, TrendUpIcon, StarSolidIcon, KeyIcon } from '@/components/PremiumIcons';
import { usePicaDevice } from '@/context/PicaDeviceContext';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

const MENTOR_FEATURES = [
    {
        icon: '🧠',
        title: 'Personal Trading Coach',
        desc: 'AI yang memahami gaya trading, modal, dan tujuanmu. Bukan bot template — ini mentor PERSONAL.',
    },
    {
        icon: '📊',
        title: 'Deep Market Analysis',
        desc: 'Analisa SMC, Order Block, FVG, dan Liquidity Pool dengan penjelasan mendalam yang mudah dipahami.',
    },
    {
        icon: '🛡️',
        title: 'Risk Management Architect',
        desc: 'Hitung position sizing, money management plan, dan drawdown recovery strategy sesuai modalmu.',
    },
    {
        icon: '🧘',
        title: 'Psychology Coach',
        desc: 'Atasi revenge trading, FOMO, dan overtrading. Bangun mindset trader profesional.',
    },
    {
        icon: '⚙️',
        title: 'Strategy Builder',
        desc: 'Desain trading system dari nol. Entry rules, exit rules, dan checklist sebelum entry.',
    },
    {
        icon: '📓',
        title: 'Journal Reviewer',
        desc: 'Kirim screenshot trading journal-mu, Hermes akan review dan identifikasi pola kelemahan.',
    },
];

const TESTIMONIALS = [
    { name: 'Andi R.', text: 'Hermes bantu saya bikin trading plan yang proper. Sebelumnya saya asal entry, sekarang punya checklist jelas.', profit: '+15%/bulan' },
    { name: 'Dewi S.', text: 'Akhirnya ada AI yang bisa jelasin SMC dengan bahasa yang mudah. Kayak punya mentor pribadi 24/7.', profit: 'Konsisten profit' },
    { name: 'Budi W.', text: 'Position sizing calculation dari Hermes bikin risk management saya jauh lebih baik. No more blown account.', profit: 'Max DD 3%' },
];

export default function HermesMentorPage() {
    const { data: session } = useSession();
    const { openActivation, tier, deviceId, isVvip, isPro } = usePicaDevice();

    const getEffectiveDeviceId = () => {
        if (deviceId) return deviceId;
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('pica_device_id');
            if (stored) return stored;
        }
        return '';
    };

    const isDeviceActive = isVvip || isPro || ['PRO', 'VVIP', 'HERMES_MENTOR', 'LIFETIME', 'ALL_ACCESS'].includes((tier || '').toUpperCase());
    const [showChat, setShowChat] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [hasAccess, setHasAccess] = useState<boolean | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Check access when user opens chat
    const handleStartChat = async () => {
        if (!isDeviceActive) {
            openActivation();
            return;
        }

        setShowChat(true);
        setMessages([{
            role: 'assistant',
            content: `🧠 **Halo Trader! Saya HERMES — AI Private Mentor Trading kamu.**

Senang bertemu! Saya di sini untuk membimbing kamu menjadi trader yang lebih baik, bukan cuma kasih sinyal, tapi kasih **PEMAHAMAN MENDALAM**.

Sebelum kita mulai, boleh ceritakan:
1. 📊 Sudah **berapa lama** kamu trading?
2. 💰 **Pair favorit** apa yang sering kamu tradingkan?
3. 🎯 **Modal** berapa dan **target bulanan** kamu?
4. 😤 Apa **kesulitan terbesar** kamu saat ini?

Jawab satu-satu juga boleh, kita ngobrol santai aja! 🤝`
        }]);

        // Scroll to chat section
        setTimeout(() => {
            chatContainerRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 300);
    };

    const handleSend = async () => {
        if (!input.trim() || isTyping) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsTyping(true);

        const activeDevId = getEffectiveDeviceId();
        if (activeDevId && typeof document !== 'undefined') {
            try {
                document.cookie = `pica_device_id=${activeDevId}; path=/; max-age=315360000; SameSite=Lax`;
            } catch (_) {}
        }

        try {
            const history = messages.map(m => ({ role: m.role, content: m.content }));

            const res = await fetch('/api/hermes-mentor/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-pica-device-id': activeDevId,
                },
                body: JSON.stringify({
                    message: userMsg,
                    conversationHistory: history,
                    deviceId: activeDevId,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
                setHasAccess(true);
            } else if (res.status === 403) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
                setHasAccess(false);
            } else {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: data.reply || 'Maaf ada gangguan. Coba lagi ya! 🙏'
                }]);
            }
        } catch {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Koneksi bermasalah. Coba 1 menit lagi ya 🙏'
            }]);
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
        <div className="min-h-screen bg-slate-50 text-slate-900 pt-24 pb-20 font-sans">
            {/* Hero Section */}
            <section className="max-w-5xl mx-auto px-4 sm:px-6 text-center mb-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 text-amber-700 font-bold text-xs mb-4 border border-amber-200">
                        <SparklesIcon size="xs" className="text-amber-600" />
                        <span>PRODUK BARU — LAUNCH PROMO</span>
                        <span className="px-2 py-0.5 rounded bg-amber-600 text-white text-[10px] font-black">TERBATAS</span>
                    </div>

                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 mb-3">
                        HERMES
                    </h1>
                    <p className="text-lg sm:text-xl font-bold bg-clip-text text-transparent mb-4" style={{ backgroundImage: 'linear-gradient(135deg, #D97706 0%, #F59E0B 50%, #EF4444 100%)' }}>
                        AI Private Mentor Trading
                    </p>
                    <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed mb-8">
                        Bukan chatbot biasa. HERMES adalah <strong>mentor pribadi AI</strong> yang memahami gaya trading, modal, 
                        dan tujuanmu. Seperti punya mentor profesional 24/7 — tapi dengan harga <strong>secangkir kopi</strong>.
                    </p>

                    {/* Price Card */}
                    <div className="inline-block bg-white rounded-2xl border border-slate-200 shadow-lg p-6 sm:p-8 mb-8">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <span className="text-slate-400 line-through text-lg font-medium">Rp 299.000</span>
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                HEMAT 83%
                            </span>
                        </div>
                        <div className="flex items-baseline justify-center gap-1 mb-1">
                            <span className="text-5xl sm:text-6xl font-black text-slate-900">Rp 49.000</span>
                        </div>
                        <p className="text-sm text-slate-500 font-medium mb-4">Sekali bayar · Akses SELAMANYA</p>
                        
                        <button
                            onClick={handleStartChat}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-base shadow-lg shadow-amber-500/30 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                        >
                            <BoltIcon size="sm" className="text-white" />
                            <span>{isDeviceActive ? 'Mulai Chat dengan HERMES →' : '🔑 Aktivasi Lisensi untuk Chat →'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => openActivation()}
                            className="w-full mt-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 border border-slate-300 cursor-pointer shadow-2xs"
                        >
                            <KeyIcon size="xs" className="text-amber-600" />
                            <span>Punya Kode Lisensi? Klik Di Sini untuk Aktivasi</span>
                        </button>
                        
                        <p className="text-xs text-slate-400 mt-3">
                            💳 Transfer BCA: 1392698188 a.n. Arland Pratama Muldiawan
                            <br />Konfirmasi via Telegram <a href="https://t.me/arra7trader" className="text-blue-600 hover:underline">@arra7trader</a>
                        </p>
                    </div>
                </motion.div>
            </section>

            {/* Comparison: Bot Biasa vs Hermes */}
            <section className="max-w-4xl mx-auto px-4 sm:px-6 mb-16">
                <h2 className="text-2xl font-bold text-center text-slate-900 mb-8">
                    Kenapa HERMES Berbeda?
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Bot Biasa */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">🤖</span>
                            <h3 className="font-bold text-slate-500">Chatbot Biasa</h3>
                        </div>
                        <ul className="space-y-3 text-sm text-slate-500">
                            <li className="flex items-start gap-2">
                                <span className="text-red-400 mt-0.5">✕</span>
                                <span>Jawaban template & generik</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-red-400 mt-0.5">✕</span>
                                <span>Tidak ingat konteks percakapan</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-red-400 mt-0.5">✕</span>
                                <span>Jawaban pendek & dangkal</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-red-400 mt-0.5">✕</span>
                                <span>Tidak bisa hitung position sizing</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-red-400 mt-0.5">✕</span>
                                <span>Tidak bisa review journal</span>
                            </li>
                        </ul>
                    </div>

                    {/* Hermes */}
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-300 p-6 relative">
                        <div className="absolute -top-3 right-4">
                            <span className="text-xs font-black px-3 py-1 rounded-full bg-amber-500 text-white shadow">RECOMMENDED</span>
                        </div>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">🧠</span>
                            <h3 className="font-bold text-amber-800">HERMES Mentor</h3>
                        </div>
                        <ul className="space-y-3 text-sm text-amber-900">
                            <li className="flex items-start gap-2">
                                <CheckIcon size="xs" className="text-emerald-600 mt-0.5 shrink-0" />
                                <span><strong>Personal & kontekstual</strong> — tahu gaya tradingmu</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckIcon size="xs" className="text-emerald-600 mt-0.5 shrink-0" />
                                <span><strong>Deep memory</strong> — ingat 20 pesan terakhir</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckIcon size="xs" className="text-emerald-600 mt-0.5 shrink-0" />
                                <span><strong>Jawaban mendalam</strong> — analisa 3-5 paragraf</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckIcon size="xs" className="text-emerald-600 mt-0.5 shrink-0" />
                                <span><strong>Position sizing calculator</strong> built-in</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckIcon size="xs" className="text-emerald-600 mt-0.5 shrink-0" />
                                <span><strong>Journal reviewer & strategy builder</strong></span>
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="max-w-5xl mx-auto px-4 sm:px-6 mb-16">
                <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">
                    6 Kemampuan Utama HERMES
                </h2>
                <p className="text-sm text-slate-500 text-center mb-8">
                    Setiap fitur dirancang untuk membuat trading-mu lebih profitable dan terstruktur
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {MENTOR_FEATURES.map((f, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-amber-300 hover:shadow-md transition-all"
                        >
                            <span className="text-3xl mb-3 block">{f.icon}</span>
                            <h3 className="font-bold text-slate-900 text-sm mb-1">{f.title}</h3>
                            <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Social Proof */}
            <section className="max-w-4xl mx-auto px-4 sm:px-6 mb-16">
                <h2 className="text-2xl font-bold text-center text-slate-900 mb-8">
                    Apa Kata Trader yang Sudah Pakai?
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {TESTIMONIALS.map((t, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5">
                            <div className="flex items-center gap-1 mb-3">
                                {[1,2,3,4,5].map(s => (
                                    <StarSolidIcon key={s} size="xs" className="text-amber-400" />
                                ))}
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed mb-3 italic">&ldquo;{t.text}&rdquo;</p>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-900">{t.name}</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    {t.profit}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* FAQ */}
            <section className="max-w-3xl mx-auto px-4 sm:px-6 mb-16">
                <h2 className="text-2xl font-bold text-center text-slate-900 mb-8">FAQ</h2>
                <div className="space-y-4">
                    {[
                        {
                            q: 'Apa bedanya dengan PICA Bot yang sudah ada (gratis)?',
                            a: 'PICA Bot adalah chatbot navigasi ringkas. HERMES adalah mentor AI mendalam yang ingat konteks percakapan, bisa hitung position sizing, review journal, dan memberikan analisa 3-5 paragraf per jawaban.',
                        },
                        {
                            q: 'Apakah benar-benar lifetime?',
                            a: 'Ya! Rp 49.000 sekali bayar, akses HERMES Mentor selamanya. Tidak ada biaya bulanan.',
                        },
                        {
                            q: 'Bagaimana cara bayar?',
                            a: 'Transfer ke BCA 1392698188 a.n. Arland Pratama Muldiawan, lalu konfirmasi ke @arra7trader di Telegram. Aktivasi instan!',
                        },
                        {
                            q: 'Apakah Hermes bisa kasih sinyal trading?',
                            a: 'Hermes fokus sebagai MENTOR & COACH — bukan signal provider. Untuk sinyal real-time, gunakan PICA Neural Lab atau Copytrade ARRA77.',
                        },
                    ].map((faq, i) => (
                        <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
                            <h3 className="font-bold text-sm text-slate-900 mb-1">{faq.q}</h3>
                            <p className="text-xs text-slate-600 leading-relaxed">{faq.a}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Final CTA */}
            <section className="max-w-2xl mx-auto px-4 sm:px-6 text-center mb-12">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-8 text-white">
                    <h2 className="text-2xl font-black mb-2">Mulai Sekarang Rp 49.000</h2>
                    <p className="text-sm text-amber-100 mb-6">Sekali bayar. Selamanya. Tanpa biaya bulanan.</p>
                    <button
                        onClick={handleStartChat}
                        className="px-8 py-3.5 rounded-xl bg-white text-amber-700 font-black text-sm hover:bg-amber-50 transition-all shadow-lg active:scale-95 cursor-pointer"
                    >
                        {isDeviceActive ? '🧠 Chat HERMES Sekarang' : '🔑 Aktivasi Lisensi Sekarang'}
                    </button>
                </div>
            </section>

            {/* Chat Interface (shown after clicking CTA) */}
            <AnimatePresence>
                {showChat && (
                    <motion.section
                        ref={chatContainerRef}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 30 }}
                        className="max-w-3xl mx-auto px-4 sm:px-6 mb-20"
                    >
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
                            {/* Chat Header */}
                            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 flex items-center justify-between text-white">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">
                                        🧠
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm">HERMES Private Mentor</h3>
                                        <p className="text-xs text-amber-100 flex items-center gap-1">
                                            <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
                                            Online · Ultra-fast AI
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowChat(false)}
                                    className="text-white/70 hover:text-white transition-colors cursor-pointer text-sm font-bold"
                                >
                                    Minimize ↓
                                </button>
                            </div>

                            {/* Messages */}
                            <div className="h-[500px] overflow-y-auto p-4 space-y-4 bg-slate-50">
                                {messages.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`
                                                max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-xs
                                                ${msg.role === 'user'
                                                    ? 'bg-amber-500 text-white rounded-tr-none'
                                                    : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none'
                                                }
                                            `}
                                        >
                                            {msg.role === 'user' ? (
                                                msg.content
                                            ) : (
                                                <div>
                                                    <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1 prose-li:my-0.5 prose-headings:my-2 text-slate-800 prose-a:text-amber-600 font-sans prose-strong:text-slate-900">
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                            {msg.content}
                                                        </ReactMarkdown>
                                                    </div>

                                                    {/* Instant Activate Button if locked message shown */}
                                                    {msg.content.includes('Akses Hermes Mentor terkunci') && (
                                                        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                                                            <button
                                                                onClick={() => openActivation()}
                                                                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95"
                                                            >
                                                                <KeyIcon size="xs" className="text-white" />
                                                                <span>Masukkan Kode Lisensi VVIP</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {isTyping && (
                                    <div className="flex justify-start">
                                        <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-200 shadow-xs flex items-center gap-2">
                                            <span className="text-xs text-slate-400">HERMES sedang berpikir</span>
                                            <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" />
                                            <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce delay-100" />
                                            <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce delay-200" />
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="p-4 bg-white border-t border-slate-200">
                                <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-4 py-3 border border-slate-200 focus-within:border-amber-400 focus-within:bg-white transition-all">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={handleKeyPress}
                                        placeholder="Tanya Hermes sesuatu... (misal: bantu hitung lot untuk modal 1 juta)"
                                        className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={!input.trim() || isTyping}
                                        className="px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 transition-colors cursor-pointer font-bold text-xs"
                                    >
                                        Kirim →
                                    </button>
                                </div>
                                <p className="text-[10px] text-center text-slate-400 mt-2">
                                    HERMES AI Private Mentor · Didukung PICA Neural Intelligence · DYOR
                                </p>
                            </div>
                        </div>
                    </motion.section>
                )}
            </AnimatePresence>
        </div>
    );
}
