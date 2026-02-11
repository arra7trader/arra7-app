'use client';

import { useState } from 'react';
import GoldHeatmap from '@/components/vvip/GoldHeatmap';
import { motion } from 'framer-motion';

export default function VvipAssistantPage() {
    const [connected, setConnected] = useState(true);
    const [alerts, setAlerts] = useState({
        whale: true,
        news: true,
        zones: true,
        session: false,
    });

    const toggleAlert = (key: keyof typeof alerts) => {
        setAlerts(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-12">
            <div className="container-wide">
                <div className="max-w-6xl mx-auto space-y-8">

                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">
                                VVIP Personal Assistant
                            </h1>
                            <p className="text-[var(--text-secondary)] text-lg">
                                Konfigurasi asisten trading pribadi Anda.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-semibold border border-green-200">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                            Bot Active
                        </div>
                    </div>

                    {/* Top Panel: Connection & Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* 1. WhatsApp Connection */}
                        <div className="bg-white p-6 rounded-2xl border border-[var(--border-light)] shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" /></svg>
                            </div>
                            <h3 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2 relative z-10">
                                WhatsApp Integration
                            </h3>
                            <div className="space-y-4 relative z-10">
                                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
                                        <span className="text-sm font-medium text-gray-700">
                                            {connected ? '+62 812-xxxx-xxxx' : 'Not Connected'}
                                        </span>
                                    </div>
                                    <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                                        Change
                                    </button>
                                </div>
                                <button className="w-full py-2 bg-[var(--text-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                                    <span>Test Notification</span>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M12 14v4m0-4v-4m0 0L8 8m4-2 4 2" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* 2. Alert Configuration (Spans 2 cols) */}
                        <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-[var(--border-light)] shadow-sm">
                            <h3 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                                <span>🔔</span> Notification Settings
                                <span className="text-xs font-normal text-gray-500 ml-auto">Pilih notifikasi yang masuk ke WhatsApp</span>
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <ToggleItem
                                    label="Whale Activity"
                                    desc="Alert jika ada order > $10M"
                                    active={alerts.whale}
                                    onClick={() => toggleAlert('whale')}
                                />
                                <ToggleItem
                                    label="Strong Zones"
                                    desc="Alert saat harga menyentuh zona > 80%"
                                    active={alerts.zones}
                                    onClick={() => toggleAlert('zones')}
                                />
                                <ToggleItem
                                    label="High Impact News"
                                    desc="Notifikasi 15 menit sebelum news"
                                    active={alerts.news}
                                    onClick={() => toggleAlert('news')}
                                />
                                <ToggleItem
                                    label="Session Updates"
                                    desc="Rekap saat market open/close"
                                    active={alerts.session}
                                    onClick={() => toggleAlert('session')}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Bottom Panel: Live Monitor */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">
                                Live Market Monitor
                            </h2>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                LIVE FEED
                            </div>
                        </div>

                        <div className="bg-white p-1 rounded-3xl border border-[var(--border-light)] shadow-sm">
                            <div className="bg-gray-50 rounded-[20px] p-6">
                                <p className="text-sm text-gray-500 mb-6 flex items-center gap-2">
                                    <span className="text-lg">🤖</span>
                                    <span>
                                        "Ini adalah data real-time yang sedang saya pantau untuk Anda. Jika ada anomali, saya akan kirim pesan ke WhatsApp."
                                    </span>
                                </p>
                                <GoldHeatmap />
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

function ToggleItem({ label, desc, active, onClick }: { label: string, desc: string, active: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${active
                    ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-500/20'
                    : 'bg-white border-gray-100 hover:border-gray-200'
                }`}
        >
            <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${active ? 'bg-blue-500 border-blue-500' : 'bg-gray-100 border-gray-300'
                }`}>
                {active && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
            </div>
            <div>
                <div className={`font-medium text-sm ${active ? 'text-blue-900' : 'text-gray-700'}`}>{label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
            </div>
        </button>
    );
}
