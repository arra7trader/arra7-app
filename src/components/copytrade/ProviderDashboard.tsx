'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SignalCard from './SignalCard';
import PostSignalModal from './PostSignalModal';

interface ProviderStats {
    total_trades: number;
    winning_trades: number;
    losing_trades: number;
    win_rate: number;
    net_profit_usd: number;
}

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
}

interface ProviderProfile {
    id: string;
    display_name: string;
    total_followers: number;
    is_active: number;
    is_approved: number;
}

export default function ProviderDashboard() {
    const [profile, setProfile] = useState<ProviderProfile | null>(null);
    const [stats, setStats] = useState<ProviderStats | null>(null);
    const [signals, setSignals] = useState<Signal[]>([]);
    const [loading, setLoading] = useState(true);
    const [showPostModal, setShowPostModal] = useState(false);
    const [filterStatus, setFilterStatus] = useState<'active' | 'all'>('active');
    const [toast, setToast] = useState<string | null>(null);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [profileRes, signalsRes] = await Promise.all([
                fetch('/api/copytrade/providers?myProfile=true'),
                fetch('/api/copytrade/signals?mode=provider')
            ]);
            const profileData = await profileRes.json();
            const signalsData = await signalsRes.json();

            if (profileData.provider) setProfile(profileData.provider);
            if (profileData.stats) setStats(profileData.stats);
            setSignals(signalsData.signals || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSignalPosted = () => {
        setToast('✅ Sinyal berhasil diposting & notifikasi Telegram terkirim!');
        fetchData();
        setTimeout(() => setToast(null), 5000);
    };

    const filteredSignals = filterStatus === 'active'
        ? signals.filter(s => s.status === 'active')
        : signals;

    if (loading) return (
        <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
    );

    if (!profile || !profile.is_active) return (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
            <div className="text-5xl mb-3">📡</div>
            <h3 className="text-lg font-bold text-gray-700 mb-2">Kamu belum jadi provider aktif</h3>
            <p className="text-sm text-gray-400 mb-5">Daftarkan diri sebagai signal provider dan tunggu approval dari admin.</p>
            <a href="/copytrade/become-provider"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors">
                Daftar Jadi Provider →
            </a>
        </div>
    );

    return (
        <div className="space-y-5">
            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-green-600 text-white text-sm font-medium rounded-xl shadow-lg">
                        {toast}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Provider Header Card */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <div className="text-xs text-blue-200 mb-1 font-medium uppercase tracking-wider">Provider Dashboard</div>
                        <h2 className="text-xl font-black">{profile.display_name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] bg-green-400/20 text-green-200 border border-green-400/30 px-2 py-0.5 rounded-md font-bold">✅ AKTIF</span>
                            <span className="text-xs text-blue-200">{profile.total_followers} follower</span>
                        </div>
                    </div>
                    <button onClick={() => setShowPostModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 rounded-xl text-sm font-bold transition-all hover:shadow-lg">
                        📡 Post Sinyal
                    </button>
                </div>

                {/* Stats Row */}
                {stats && (
                    <div className="grid grid-cols-4 gap-3">
                        {[
                            { label: 'Total Sinyal', value: stats.total_trades },
                            { label: 'Win Rate', value: `${stats.win_rate?.toFixed(0)}%` },
                            { label: 'Menang', value: stats.winning_trades, color: 'text-green-300' },
                            { label: 'Kalah', value: stats.losing_trades, color: 'text-red-300' },
                        ].map(({ label, value, color }) => (
                            <div key={label} className="bg-white/10 rounded-xl p-3 text-center">
                                <div className={`text-xl font-black ${color || 'text-white'}`}>{value}</div>
                                <div className="text-[10px] text-blue-300 mt-0.5">{label}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Signal List */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-800">Sinyal Kamu</h3>
                    <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                        {(['active', 'all'] as const).map(f => (
                            <button key={f} onClick={() => setFilterStatus(f)}
                                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${filterStatus === f ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                                {f === 'active' ? '🟢 Aktif' : '📋 Semua'}
                            </button>
                        ))}
                    </div>
                </div>

                {filteredSignals.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-2xl">
                        <div className="text-3xl mb-2">{filterStatus === 'active' ? '🎯' : '📭'}</div>
                        <p className="text-gray-400 text-sm">
                            {filterStatus === 'active' ? 'Tidak ada sinyal aktif saat ini' : 'Belum ada sinyal yang diposting'}
                        </p>
                        <button onClick={() => setShowPostModal(true)}
                            className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors">
                            📡 Post Sinyal Pertama
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredSignals.map(signal => (
                            <SignalCard
                                key={signal.id}
                                signal={signal}
                                isProvider={true}
                                onStatusUpdate={fetchData}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Post Signal Modal */}
            <AnimatePresence>
                {showPostModal && (
                    <PostSignalModal onClose={() => setShowPostModal(false)} onSuccess={handleSignalPosted} />
                )}
            </AnimatePresence>
        </div>
    );
}
