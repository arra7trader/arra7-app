'use client';

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
        { id: 'day1_story', label: 'Hari 1: Story', icon: '📖', color: 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20' },
        { id: 'day2_stepbystep', label: 'Hari 2: Tutorial', icon: '📚', color: 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20' },
        { id: 'day3_faq', label: 'Hari 3: FAQ', icon: '❓', color: 'bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20' },
        { id: 'day4_checklist', label: 'Hari 4: Checklist', icon: '✅', color: 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20' },
        { id: 'day5_visual', label: 'Hari 5: Visual', icon: '🎨', color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' },
        { id: 'day6_mistakes', label: 'Hari 6: Mistakes', icon: '⚠️', color: 'bg-[var(--bg-secondary)] border-[var(--border-light)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]' },
        { id: 'day7_blueprint', label: 'Hari 7: Blueprint', icon: '🗺️', color: 'bg-pink-500/10 border-pink-500/20 text-pink-400 hover:bg-pink-500/20' },
    ];

    return (
        <div className="mb-8 glass-card p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <span className="text-3xl drop-shadow-md">📢</span>
                    <div>
                        <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Telegram Marketing</h3>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">
                            Copytrade ARRA77 • 1 Core Message • 7 Delivery Styles
                            {telegramConfigured ? (
                                <span className="ml-2 inline-flex items-center gap-1 text-green-400"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span> Connected</span>
                            ) : (
                                <span className="ml-2 inline-flex items-center gap-1 text-red-400"><span className="w-1.5 h-1.5 rounded-full bg-red-400"></span> Not configured</span>
                            )}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {autoPostEnabled ? (
                        <span className="px-3 py-1.5 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-semibold uppercase tracking-wider shadow-[0_0_10px_rgba(34,197,94,0.2)]">
                            ⚡ Auto-posting Active
                        </span>
                    ) : (
                        <span className="px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold uppercase tracking-wider">
                            ⏸️ Auto-posting Paused
                        </span>
                    )}
                </div>
            </div>

            {telegramMessage && (
                <div className={`mb-6 p-4 rounded-xl border ${telegramMessage.includes('✅') ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                    {telegramMessage}
                </div>
            )}

            {/* Start/Stop Auto-Post Toggle */}
            <div className="mb-6 p-5 bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-xl flex items-center justify-between">
                <div>
                    <h4 className="font-semibold text-[var(--text-primary)]">Auto-Posting Control</h4>
                    <p className="text-sm text-[var(--text-muted)] mt-1">Kirim template harian otomatis ke channel Telegram setiap hari.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => onToggleAutoPost('start')}
                        disabled={sendingTelegram || !telegramConfigured || autoPostEnabled}
                        className={`admin-btn ${autoPostEnabled
                            ? 'bg-green-500/10 text-green-500 opacity-50 cursor-default'
                            : 'bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.15)]'
                            } disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5`}
                    >
                        ▶️ Start
                    </button>
                    <button
                        onClick={() => onToggleAutoPost('stop')}
                        disabled={sendingTelegram || !telegramConfigured || !autoPostEnabled}
                        className={`admin-btn ${!autoPostEnabled
                            ? 'bg-red-500/10 text-red-500 opacity-50 cursor-default'
                            : 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                            } disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5`}
                    >
                        ⏹️ Stop
                    </button>
                </div>
            </div>

            {/* Info Box */}
            <div className="admin-info-box mb-8 shadow-inner">
                <p className="font-semibold flex items-center gap-2 mb-2"><span className="text-lg">💡</span> Information</p>
                <ul className="list-disc list-inside space-y-1 text-[var(--text-secondary)]">
                    <li>Sistem otomatis merotasi 1 dari 7 gaya template setiap hari untuk menjaga engagement.</li>
                    <li>Notifikasi upgrade VVIP/PRO dikirim otomatis <i>realtime</i> tanpa menunggu jadwal.</li>
                    <li>Pastikan Bot berada di Channel sebagai Admin dengan hak akses memposting pesan.</li>
                </ul>
            </div>

            {/* 7 Daily Templates - Manual Send */}
            <div>
                <h4 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-widest mb-4 flex items-center gap-2">
                    📅 Template Harian <span className="text-[10px] bg-[var(--bg-secondary)] px-2 py-0.5 rounded text-[var(--text-muted)]">Kirim Manual</span>
                </h4>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {dailyTemplates.map((template) => (
                        <button
                            key={template.id}
                            onClick={() => onSendPromo(template.id)}
                            disabled={sendingTelegram || !telegramConfigured}
                            className={`flex flex-col items-center justify-center gap-3 p-5 rounded-xl border transition-all hover:-translate-y-1 disabled:opacity-50 disabled:-translate-y-0 disabled:cursor-not-allowed ${template.color}`}
                        >
                            <span className="text-4xl drop-shadow-sm">{template.icon}</span>
                            <span className="text-sm font-bold text-center tracking-wide">{template.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[var(--border-light)] text-center">
                <p className="text-sm text-[var(--text-muted)] font-medium">
                    {sendingTelegram ? (
                        <span className="inline-flex items-center gap-2 text-[var(--text-primary)]">
                            <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin"></span>
                            Memproses pengiriman ke Telegram...
                        </span>
                    ) : (
                        '👆 Klik salah satu template di atas untuk memicu pengiriman bypass jadwal hari ini.'
                    )}
                </p>

                {!telegramConfigured && (
                    <div className="mt-4 p-3 inline-block bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 font-medium">
                        ⚠️ Konfigurasi TELEGRAM_BOT_TOKEN dan TELEGRAM_CHANNEL_ID hilang di sistem.
                    </div>
                )}
            </div>
        </div>
    );
}
