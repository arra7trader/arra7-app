
import React, { useState } from 'react';

interface TelegramMarketingProps {
    telegramConfigured: boolean;
    autoPostEnabled: boolean;
    sendingTelegram: boolean;
    telegramMessage: string | null;
    onToggleAutoPost: (action: 'start' | 'stop') => void;
    onSendPromo: (template: string) => void;
}

export default function TelegramMarketing({
    telegramConfigured,
    autoPostEnabled,
    sendingTelegram,
    telegramMessage,
    onToggleAutoPost,
    onSendPromo
}: TelegramMarketingProps) {
    return (
        <div className="mb-8 bg-white rounded-2xl border border-[var(--border-light)] p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">📢</span>
                    <div>
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Telegram Marketing</h3>
                        <p className="text-sm text-[var(--text-secondary)]">
                            2 templates • Auto-post setiap 5 jam
                            {telegramConfigured ? (
                                <span className="ml-2 text-green-400">● Connected</span>
                            ) : (
                                <span className="ml-2 text-red-400">● Not configured</span>
                            )}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {autoPostEnabled ? (
                        <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                            ✅ Auto-posting Active
                        </span>
                    ) : (
                        <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
                            ⏸️ Auto-posting Paused
                        </span>
                    )}
                </div>
            </div>

            {telegramMessage && (
                <div className={`mb-4 p-3 rounded-lg ${telegramMessage.includes('✅') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {telegramMessage}
                </div>
            )}

            {/* Start/Stop Auto-Post Toggle */}
            <div className="mb-6 p-4 bg-[var(--bg-secondary)] rounded-xl flex items-center justify-between">
                <div>
                    <p className="font-medium text-[var(--text-primary)]">Auto-Posting Control</p>
                    <p className="text-sm text-[var(--text-secondary)]">Toggle auto-posting setiap 5 jam</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => onToggleAutoPost('start')}
                        disabled={sendingTelegram || !telegramConfigured || autoPostEnabled}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${autoPostEnabled
                            ? 'bg-green-500/20 text-green-400 cursor-default'
                            : 'bg-green-500 hover:bg-green-600 text-white'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        ▶️ Start
                    </button>
                    <button
                        onClick={() => onToggleAutoPost('stop')}
                        disabled={sendingTelegram || !telegramConfigured || !autoPostEnabled}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${!autoPostEnabled
                            ? 'bg-red-500/20 text-red-400 cursor-default'
                            : 'bg-red-500 hover:bg-red-600 text-white'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        ⏹️ Stop
                    </button>
                </div>
            </div>

            {/* 2 Marketing Templates */}
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => onSendPromo('arra7')}
                    disabled={sendingTelegram || !telegramConfigured}
                    className="flex flex-col items-center gap-2 p-4 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl text-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    <span className="text-3xl">🔮</span>
                    <span className="font-medium">ARRA7</span>
                    <span className="text-xs text-purple-500">AI Trading Analysis</span>
                </button>

                <button
                    onClick={() => onSendPromo('saham')}
                    disabled={sendingTelegram || !telegramConfigured}
                    className="flex flex-col items-center gap-2 p-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl text-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    <span className="text-3xl">📈</span>
                    <span className="font-medium">Saham Indonesia</span>
                    <span className="text-xs text-green-500">Analisa IDX AI</span>
                </button>

                <button
                    onClick={() => onSendPromo('bookmap_ai')}
                    disabled={sendingTelegram || !telegramConfigured}
                    className="col-span-2 flex flex-col items-center gap-2 p-4 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    <span className="text-3xl">🚀</span>
                    <span className="font-medium">Bookmap X AI</span>
                    <span className="text-xs text-amber-600">Promo Heatmap & AI (Short & Cool)</span>
                </button>
            </div>

            {/* Content Series Section */}
            <div className="mt-8 pt-6 border-t border-[var(--border-light)]">
                <h4 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
                    📢 Content Series (Part 1-4)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { id: 'series_part1', label: 'Part 1: Teaser', icon: '⚠️', color: 'bg-slate-50 border-slate-200 text-slate-700' },
                        { id: 'series_part2', label: 'Part 2: Solution', icon: '💡', color: 'bg-blue-50 border-blue-200 text-blue-700' },
                        { id: 'series_part3', label: 'Part 3: Proof', icon: '🔥', color: 'bg-amber-50 border-amber-200 text-amber-700' },
                        { id: 'series_part4', label: 'Part 4: Offer', icon: '💎', color: 'bg-green-50 border-green-200 text-green-700' },
                    ].map((series) => (
                        <button
                            key={series.id}
                            onClick={() => onSendPromo(series.id)}
                            disabled={sendingTelegram || !telegramConfigured}
                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed ${series.color}`}
                        >
                            <span className="text-2xl">{series.icon}</span>
                            <span className="text-sm font-bold">{series.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <p className="mt-4 text-xs text-[var(--text-muted)] text-center">
                {sendingTelegram ? '⏳ Mengirim...' : '👆 Klik template untuk kirim manual • Auto-post bergantian setiap 5 jam'}
            </p>

            {!telegramConfigured && (
                <p className="mt-2 text-sm text-red-400 text-center">
                    ⚠️ Tambahkan TELEGRAM_BOT_TOKEN dan TELEGRAM_CHANNEL_ID di Vercel Environment Variables
                </p>
            )}
        </div>
    );
}
