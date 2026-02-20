'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Signal {
    id: string;
    pair: string;
    action: string;
    entry_price: number | null;
    stop_loss: number | null;
    take_profit: number | null;
    lot_size: number;
    timeframe: string;
    commentary: string | null;
    status: string;
    result_pips: number | null;
    created_at: string;
    provider_name?: string;
    broker_name?: string;
    price_koin?: number;
    is_unlocked?: boolean;
}

interface SignalCardProps {
    signal: Signal;
    isProvider?: boolean; // Provider sees update buttons
    onStatusUpdate?: () => void;
}

const STATUS_CONFIG = {
    active: { label: '🟢 Active', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100' },
    tp_hit: { label: '✅ TP Hit', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100' },
    sl_hit: { label: '❌ SL Hit', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100' },
    cancelled: { label: '🚫 Dibatalkan', bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-100' },
};

function timeAgo(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = Math.floor((now - then) / 1000);
    if (diff < 60) return `${diff}s lalu`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
    return `${Math.floor(diff / 86400)}h lalu`;
}

export default function SignalCard({ signal: initialSignal, isProvider = false, onStatusUpdate }: SignalCardProps) {
    const [updating, setUpdating] = useState(false);
    const [unlocking, setUnlocking] = useState(false);
    const [signal, setSignal] = useState(initialSignal);

    const isLocked = !isProvider && (signal.price_koin ?? 0) > 0 && !signal.is_unlocked;

    const status = STATUS_CONFIG[signal.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.cancelled;
    const isClosed = signal.status !== 'active';

    // RR Ratio
    const rrRatio = (() => {
        const entry = signal.entry_price;
        const sl = signal.stop_loss;
        const tp = signal.take_profit;
        if (!entry || !sl || !tp) return null;
        const risk = Math.abs(entry - sl);
        const reward = Math.abs(tp - entry);
        return risk > 0 ? (reward / risk).toFixed(1) : null;
    })();

    const handleUpdateStatus = async (newStatus: string) => {
        if (!confirm(`Update status sinyal ke "${newStatus}"?`)) return;
        setUpdating(true);
        try {
            await fetch(`/api/copytrade/signals/${signal.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            onStatusUpdate?.();
        } finally {
            setUpdating(false);
        }
    };

    const handleUnlock = async () => {
        if (!confirm(`Buka sinyal ini seharga ${signal.price_koin} Koin?`)) return;
        setUnlocking(true);
        try {
            const res = await fetch('/api/copytrade/purchase-signal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ signalId: signal.id })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Gagal membeli sinyal');

            // Unlocked successfully! Let's update the local signal state.
            // Typically we should re-fetch to get the actual prices since they might have been redacted by the server.
            // We'll call onStatusUpdate to trigger a parent refetch if possible.
            alert('Sinyal berhasil dibuka!');
            if (onStatusUpdate) onStatusUpdate();
            else window.location.reload();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setUnlocking(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white rounded-2xl border overflow-hidden transition-all ${isClosed ? 'opacity-75' : 'shadow-sm hover:shadow-md'} ${status.border}`}
        >
            {/* Top stripe */}
            <div className={`h-1 w-full ${signal.action === 'BUY' ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-red-400 to-rose-500'}`} />

            <div className="p-4">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* BUY/SELL badge */}
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black tracking-wider ${signal.action === 'BUY' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                            {signal.action === 'BUY' ? '🟢' : '🔴'} {signal.action}
                        </span>
                        <span className="text-base font-black text-gray-900">{signal.pair}</span>
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md font-medium">{signal.timeframe}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${status.bg} ${status.text} ${status.border}`}>{status.label}</span>
                        {signal.result_pips != null && (
                            <span className={`text-xs font-bold px-2 py-1 rounded-lg ${signal.result_pips >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                {signal.result_pips >= 0 ? '+' : ''}{signal.result_pips.toFixed(1)} pips
                            </span>
                        )}
                    </div>
                </div>

                {/* Price grid & Commentary Container */}
                <div className="relative">
                    {/* The Data (Blurred if locked) */}
                    <div className={isLocked ? "filter blur-[6px] opacity-60 select-none pointer-events-none transition-all duration-500" : ""}>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                            {[
                                { label: 'Entry', value: isLocked ? '1.XXXXX' : (signal.entry_price ?? 'Market'), icon: '📍' },
                                { label: 'Stop Loss', value: isLocked ? '1.XXXXX' : signal.stop_loss, icon: '🛑' },
                                { label: 'Take Profit', value: isLocked ? '1.XXXXX' : signal.take_profit, icon: '🎯' },
                            ].map(({ label, value, icon }) => (
                                <div key={label} className="rounded-xl p-2.5 text-center bg-gray-50 border border-gray-100">
                                    <div className="text-[10px] text-gray-400 font-medium mb-0.5">{icon} {label}</div>
                                    <div className="text-sm font-bold text-gray-800">{value ?? '—'}</div>
                                </div>
                            ))}
                        </div>

                        {/* RR + Lot badge row */}
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                            {rrRatio && (
                                <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-1 rounded-lg font-bold">
                                    📊 RR 1:{rrRatio}
                                </span>
                            )}
                            <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg font-medium">
                                📦 Lot {signal.lot_size}
                            </span>
                            {signal.provider_name && (
                                <span className="text-xs text-gray-400">by <b className="text-gray-600">{signal.provider_name}</b></span>
                            )}
                            <span className="ml-auto text-xs text-gray-400">{timeAgo(signal.created_at)}</span>
                        </div>

                        {/* Commentary */}
                        {signal.commentary && (
                            <div className="text-xs text-gray-600 bg-gray-50 rounded-xl px-3 py-2 leading-relaxed border-l-2 border-blue-300 mb-3">
                                💬 {isLocked ? "Sinyal eksklusif ini memiliki panduan arah market yang detail. Buka sinyal untuk membacanya." : signal.commentary}
                            </div>
                        )}
                    </div>

                    {/* Lock Overlay */}
                    {isLocked && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/20 rounded-xl border border-white/50">
                            <div className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center mb-3 text-2xl border border-amber-100">
                                🔒
                            </div>
                            <h4 className="font-extrabold text-gray-900 text-sm mb-1 drop-shadow-md">Premium Signal</h4>
                            <p className="text-[10px] text-gray-800 font-medium mb-3 px-4 text-center drop-shadow-md">Buka gembok untuk melihat Entry, TP, SL.</p>
                            <button
                                onClick={handleUnlock}
                                disabled={unlocking}
                                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-xl shadow-amber-500/40 transition-all text-xs flex items-center gap-2 disabled:opacity-70 disabled:cursor-wait"
                            >
                                {unlocking ? (
                                    <>
                                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                                        Membuka...
                                    </>
                                ) : (
                                    <>🪙 Buka Akses ({signal.price_koin} Koin)</>
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {/* Provider action buttons */}
                {isProvider && !isClosed && (
                    <div className="flex gap-2 pt-1">
                        <button onClick={() => handleUpdateStatus('tp_hit')} disabled={updating}
                            className="flex-1 py-2 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold border border-green-100 transition-colors disabled:opacity-50">
                            ✅ TP Hit
                        </button>
                        <button onClick={() => handleUpdateStatus('sl_hit')} disabled={updating}
                            className="flex-1 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold border border-red-100 transition-colors disabled:opacity-50">
                            ❌ SL Hit
                        </button>
                        <button onClick={() => handleUpdateStatus('cancelled')} disabled={updating}
                            className="flex-1 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500 text-xs font-bold border border-gray-100 transition-colors disabled:opacity-50">
                            🚫 Cancel
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
