
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
    // Template harian untuk Copytrade ARRA77 - 1 PANDUAN LENGKAP, 7 GAYA BERBEDA
    const dailyTemplates = [
        { id: 'day1_story', label: 'Hari 1: Story', icon: '📖', color: 'bg-blue-50 border-blue-200 text-blue-700' },
        { id: 'day2_stepbystep', label: 'Hari 2: Tutorial', icon: '📚', color: 'bg-green-50 border-green-200 text-green-700' },
        { id: 'day3_faq', label: 'Hari 3: FAQ', icon: '❓', color: 'bg-purple-50 border-purple-200 text-purple-700' },
        { id: 'day4_checklist', label: 'Hari 4: Checklist', icon: '✅', color: 'bg-amber-50 border-amber-200 text-amber-700' },
        { id: 'day5_visual', label: 'Hari 5: Visual', icon: '🎨', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
        { id: 'day6_mistakes', label: 'Hari 6: Mistakes', icon: '⚠️', color: 'bg-[var(--bg-secondary)] border-[var(--border-light)] text-[var(--text-secondary)]' },
        { id: 'day7_blueprint', label: 'Hari 7: Blueprint', icon: '🗺️', color: 'bg-pink-50 border-pink-200 text-pink-700' },
    ];

    return (
        <div className="mb-8 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-light)] p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">📢</span>
                    <div>
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Telegram Marketing - Copytrade ARRA77</h3>
                        <p className="text-sm text-[var(--text-secondary)]">
                            1 Panduan Lengkap • 7 Gaya Penyampaian • Berubah setiap hari
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
                    <p className="text-sm text-[var(--text-secondary)]">Kirim template harian otomatis ke Telegram</p>
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

            {/* Info Box */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-sm text-blue-800">
                    <b>📋 Konsep Template:</b>
                </p>
                <p className="text-xs text-blue-700 mt-1">
                    <b>1 Panduan Lengkap - 7 Gaya Berbeda.</b> Setiap hari template yang sama disampaikan dengan cara berbeda agar tidak bosan. 
                    <br/><br/>
                    <b>Cycle 7 Hari:</b> Story → Tutorial → FAQ → Checklist → Visual → Mistakes → Blueprint
                </p>
            </div>

            {/* 7 Daily Templates - Manual Send */}
            <div>
                <h4 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
                    📅 Template Harian (Klik untuk Kirim Manual)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {dailyTemplates.map((template) => (
                        <button
                            key={template.id}
                            onClick={() => onSendPromo(template.id)}
                            disabled={sendingTelegram || !telegramConfigured}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed ${template.color}`}
                        >
                            <span className="text-3xl">{template.icon}</span>
                            <span className="text-sm font-bold text-center">{template.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <p className="mt-4 text-xs text-[var(--text-muted)] text-center">
                {sendingTelegram ? '⏳ Mengirim...' : '👆 Klik template untuk kirim manual • Auto-post aktif = kirim otomatis setiap hari'}
            </p>

            {!telegramConfigured && (
                <p className="mt-2 text-sm text-red-400 text-center">
                    ⚠️ Tambahkan TELEGRAM_BOT_TOKEN dan TELEGRAM_CHANNEL_ID di Vercel Environment Variables
                </p>
            )}
        </div>
    );
}
