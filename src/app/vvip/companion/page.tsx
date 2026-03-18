'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    SparklesIcon,
    ChartBarIcon,
    NewspaperIcon,
    CpuChipIcon,
    ClockIcon,
    BriefcaseIcon,
    ChartPieIcon,
    BoltIcon,
    XMarkIcon,
    PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import ToolInvocationRenderer from '@/components/chat/ToolInvocationRenderer';

type Message = {
    role: 'user' | 'assistant';
    content: string;
    toolInvocations?: any[];
};

export default function CompanionPage() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [showWelcome, setShowWelcome] = useState(true);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);
        setShowWelcome(false);

        try {
            const res = await fetch('/api/chat/vvip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: [...messages, userMessage] }),
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`HTTP ${res.status}: ${errorText}`);
            }

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) throw new Error('No response body');

            let assistantContent = '';
            let currentTools: any[] = [];
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim() || !line.startsWith('0:')) continue;

                    try {
                        const jsonStr = line.slice(2).trim();
                        if (!jsonStr) continue;

                        const data = JSON.parse(jsonStr);

                        // Handle text delta
                        if (data.type === 'text-delta' && data.textDelta) {
                            assistantContent += data.textDelta;
                            // Update in real-time
                            setMessages(prev => {
                                const newMessages = [...prev];
                                const lastMsg = newMessages[newMessages.length - 1];
                                if (lastMsg && lastMsg.role === 'assistant') {
                                    lastMsg.content = assistantContent;
                                } else {
                                    newMessages.push({ role: 'assistant', content: assistantContent, toolInvocations: [] });
                                }
                                return newMessages;
                            });
                        }

                        // Handle tool calls
                        if (data.type === 'tool-call' && data.toolCall) {
                            currentTools.push({
                                toolName: data.toolCall.toolName,
                                toolCallId: data.toolCall.toolCallId,
                                state: 'call',
                                args: data.toolCall.args,
                            });
                        }

                        // Handle tool results
                        if (data.type === 'tool-result' && data.toolResult) {
                            const toolIdx = currentTools.findIndex(t => t.toolCallId === data.toolResult.toolCallId);
                            if (toolIdx !== -1) {
                                currentTools[toolIdx] = {
                                    ...currentTools[toolIdx],
                                    state: 'result',
                                    result: data.toolResult.result,
                                };
                            }
                            // Update messages with tools
                            setMessages(prev => {
                                const newMessages = [...prev];
                                const lastMsg = newMessages[newMessages.length - 1];
                                if (lastMsg && lastMsg.role === 'assistant') {
                                    lastMsg.toolInvocations = [...currentTools];
                                }
                                return newMessages;
                            });
                        }
                    } catch (parseErr) {
                        console.warn('Failed to parse SSE line:', line, parseErr);
                    }
                }
            }

            // Final update
            setMessages(prev => {
                const newMessages = [...prev];
                const lastMsg = newMessages[newMessages.length - 1];
                if (lastMsg && lastMsg.role === 'assistant') {
                    lastMsg.content = assistantContent || '(No text response)';
                    lastMsg.toolInvocations = currentTools;
                } else if (assistantContent || currentTools.length > 0) {
                    newMessages.push({
                        role: 'assistant',
                        content: assistantContent || '(No text response)',
                        toolInvocations: currentTools
                    });
                }
                return newMessages;
            });

        } catch (err: any) {
            console.error('Chat error:', err);
            setError(err);
        } finally {
            setIsLoading(false);
        }
    };

    // Quick Actions
    const quickActions = [
        { icon: ChartBarIcon, label: 'Analisa XAUUSD', prompt: 'Analisa XAUUSD lengkap' },
        { icon: ChartPieIcon, label: 'Cek Portfolio', prompt: 'Tampilkan portfolio saya' },
        { icon: NewspaperIcon, label: 'News Hari Ini', prompt: 'Berita high impact hari ini' },
        { icon: CpuChipIcon, label: 'ML Prediction', prompt: 'Prediksi ML untuk BTCUSD' },
        { icon: ClockIcon, label: 'Market Hours', prompt: 'Status market sekarang' },
        { icon: BoltIcon, label: 'Signal History', prompt: 'Riwayat sinyal 7 hari terakhir' },
    ];

    // Skills with live status (simulated)
    const skills = [
        { name: 'Price Checker', icon: '💰', status: 'active' },
        { name: 'News Monitor', icon: '📰', status: 'active' },
        { name: 'Forex Analysis', icon: '📊', status: 'idle' },
        { name: 'Stock Analysis', icon: '📈', status: 'idle' },
        { name: 'ML Predictor', icon: '🤖', status: 'active' },
        { name: 'Signal Tracker', icon: '🎯', status: 'idle' },
        { name: 'Portfolio Manager', icon: '💼', status: 'idle' },
        { name: 'Hours Monitor', icon: '⏰', status: 'active' },
    ];

    const handleQuickAction = (prompt: string) => {
        setInput(prompt);
        setShowWelcome(false);
        setTimeout(() => {
            const form = document.querySelector('form');
            if (form) form.requestSubmit();
        }, 50);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white flex">
            {/* Left Sidebar */}
            <motion.aside
                initial={{ x: 0 }}
                animate={{ x: sidebarCollapsed ? -280 : 0 }}
                className="w-72 bg-slate-900/40 backdrop-blur-xl border-r border-slate-700/50 p-6 space-y-6 overflow-y-auto"
            >
                {/* Header */}
                <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        ARRA7 PI
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">Private Intelligence Terminal</p>
                    <span className="inline-block mt-2 px-3 py-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/50 rounded-full text-xs text-amber-300 font-semibold">
                        ⭐ VVIP ACCESS
                    </span>
                </div>

                {/* Live Skills */}
                <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                        Live Skills
                    </h3>
                    <div className="space-y-2">
                        {skills.map((skill, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800/60 transition-colors border border-slate-700/30"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{skill.icon}</span>
                                    <span className="text-sm text-slate-300">{skill.name}</span>
                                </div>
                                <div className={`w-2 h-2 rounded-full ${skill.status === 'active' ? 'bg-green-400 animate-pulse' : 'bg-slate-600'}`} />
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* System Health */}
                <div className="pt-4 border-t border-slate-700/50">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        System Status
                    </h3>
                    <div className="space-y-1 text-xs text-slate-400">
                        <div className="flex justify-between">
                            <span>AI Model</span>
                            <span className="text-green-400">Llama 3.1 8B</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Tools</span>
                            <span className="text-green-400">8/8 Active</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Max Steps</span>
                            <span className="text-blue-400">8 (Chain)</span>
                        </div>
                    </div>
                </div>
            </motion.aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {/* Top Header */}
                <header className="bg-slate-900/60 backdrop-blur-xl border-b border-slate-700/50 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <div>
                            <h1 className="text-lg font-semibold flex items-center gap-2">
                                <SparklesIcon className="w-5 h-5 text-blue-400" />
                                VVIP Companion
                            </h1>
                            <p className="text-xs text-slate-400">OpenClaw-powered AI Agent</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                            <span className="text-slate-300">Online</span>
                        </div>
                    </div>
                </header>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto px-6 py-8 space-y-4">
                    {/* Welcome Screen */}
                    {showWelcome && messages.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="max-w-3xl mx-auto"
                        >
                            <div className="text-center mb-8">
                                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl mb-4 border border-blue-500/30">
                                    <SparklesIcon className="w-10 h-10 text-blue-400" />
                                </div>
                                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                                    Selamat Datang di ARRA7 PI
                                </h2>
                                <p className="text-slate-400 text-lg">
                                    AI trading companion elite dengan 8 kapabilitas canggih
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                {[
                                    { icon: '🔍', title: 'Real-Time Market Data', desc: 'Price, charts, dan order flow' },
                                    { icon: '🤖', title: 'ML Predictions', desc: 'SmartPredictor dengan 8 signals' },
                                    { icon: '📊', title: 'Deep AI Analysis', desc: 'Entry, SL, TP, dan RR calculation' },
                                    { icon: '💼', title: 'Portfolio Tracking', desc: 'Monitor posisi dan P&L real-time' },
                                ].map((feature, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="p-4 bg-gradient-to-br from-slate-800/40 to-slate-900/40 rounded-xl border border-slate-700/50 backdrop-blur-sm"
                                    >
                                        <div className="text-3xl mb-2">{feature.icon}</div>
                                        <h3 className="font-semibold text-slate-200 mb-1">{feature.title}</h3>
                                        <p className="text-sm text-slate-400">{feature.desc}</p>
                                    </motion.div>
                                ))}
                            </div>

                            <p className="text-center text-[var(--text-secondary)] text-sm">
                                Tanya apa saja — AI akan otomatis chain tools untuk insight komprehensif
                            </p>
                        </motion.div>
                    )}

                    {/* Messages */}
                    <AnimatePresence>
                        {messages.map((msg, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-3xl p-4 rounded-2xl ${msg.role === 'user'
                                        ? 'bg-gradient-to-br from-blue-600/90 to-blue-700/90 text-white'
                                        : 'bg-slate-800/60 backdrop-blur-sm border border-slate-700/50'
                                        }`}
                                >
                                    {msg.role === 'assistant' && msg.toolInvocations && msg.toolInvocations.length > 0 && (
                                        <div className="space-y-2 mb-3">
                                            {msg.toolInvocations.map((tool: any, i: number) => (
                                                <ToolInvocationRenderer key={i} toolInvocation={tool} />
                                            ))}
                                        </div>
                                    )}
                                    {msg.content && (
                                        <div className={`prose prose-invert prose-sm max-w-none ${msg.role === 'user' ? 'prose-headings:text-white prose-p:text-white' : ''}`}>
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex justify-start"
                        >
                            <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4">
                                <div className="flex items-center gap-2 text-slate-400">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                    <span className="text-sm">PI sedang berpikir...</span>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {error && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 text-red-300 text-sm"
                        >
                            ⚠️ Error: {error.message}
                        </motion.div>
                    )}
                </div>

                {/* Input Area */}
                <div className="border-t border-slate-700/50 bg-slate-900/60 backdrop-blur-xl p-6 space-y-4">
                    {/* Quick Actions */}
                    <div className="flex flex-wrap gap-2">
                        {quickActions.map((action, i) => (
                            <button
                                key={i}
                                onClick={() => handleQuickAction(action.prompt)}
                                disabled={isLoading}
                                className="flex items-center gap-2 px-3 py-2 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 rounded-lg text-sm text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <action.icon className="w-4 h-4" />
                                {action.label}
                            </button>
                        ))}
                    </div>

                    {/* Input Form */}
                    <form onSubmit={handleFormSubmit} className="flex gap-3">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleFormSubmit(e as any);
                                }
                            }}
                            placeholder="Tanya apa saja... (Shift+Enter untuk baris baru)"
                            disabled={isLoading}
                            rows={3}
                            className="flex-1 bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className="self-end px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-blue-500/20"
                        >
                            <PaperAirplaneIcon className="w-5 h-5" />
                            Kirim
                        </button>
                    </form>

                    <p className="text-xs text-[var(--text-secondary)] text-center">
                        Powered by OpenClaw principles • Multi-step reasoning • 8 tools active
                    </p>
                </div>
            </div>
        </div>
    );
}
