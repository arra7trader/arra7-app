'use client';

import { useState, useEffect } from 'react';
import { ArrowPathIcon, CheckCircleIcon, PlusIcon, MinusIcon, SignalIcon, UsersIcon, ChartBarIcon, ClockIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';

interface CTUser { id: string; email: string; name: string | null; license_key: string; copytrade_balance: number; }
interface Stats { totalUsers: number; activeUsers: number; totalSignals: number; }
interface Signal { id: string; pair: string; type: string; entry_price: number; tp: number; sl: number; created_at: string; }

export default function AdminCopytradeBridge() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [users, setUsers] = useState<CTUser[]>([]);
    const [signals, setSignals] = useState<Signal[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'users' | 'signals'>('users');
    const [signalForm, setSignalForm] = useState({ pair: 'XAUUSD', type: 'BUY', entry_price: '', tp: '', sl: '' });
    const [signalStatus, setSignalStatus] = useState<string | null>(null);
    const [adjusting, setAdjusting] = useState<string | null>(null);
    // Custom amount input per user
    const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [statsRes, usersRes, sigRes] = await Promise.all([
                fetch('/api/admin/copytrade-bridge/stats'),
                fetch('/api/admin/copytrade-bridge/users'),
                fetch('/api/copytrade-bridge/signals?limit=30'),
            ]);
            const [statsData, usersData, sigData] = await Promise.all([
                statsRes.json(), usersRes.json(), sigRes.json()
            ]);
            if (statsData.success) setStats(statsData);
            if (usersData.success) setUsers(usersData.users || []);
            if (sigData.success) setSignals(sigData.signals || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const broadcastSignal = async () => {
        if (!signalForm.entry_price || !signalForm.tp || !signalForm.sl) {
            setSignalStatus('❌ Lengkapi semua field'); return;
        }
        setSignalStatus('Mengirim...');
        try {
            const res = await fetch('/api/copytrade-bridge/signal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pair: signalForm.pair, type: signalForm.type,
                    entry_price: parseFloat(signalForm.entry_price),
                    tp: parseFloat(signalForm.tp), sl: parseFloat(signalForm.sl),
                }),
            });
            const data = await res.json();
            if (data.success) {
                setSignalStatus('✅ Sinyal berhasil dikirim! ID: ' + data.signalId?.slice(0, 8));
                setSignalForm({ pair: 'XAUUSD', type: 'BUY', entry_price: '', tp: '', sl: '' });
                fetchAll();
            } else setSignalStatus('❌ ' + (data.error || 'Gagal mengirim sinyal'));
        } catch (e) { setSignalStatus('❌ Terjadi error'); }
    };

    const adjustBalance = async (userId: string, amount: number) => {
        setAdjusting(userId);
        try {
            const res = await fetch('/api/admin/copytrade-bridge/users', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, amount }),
            });
            const data = await res.json();
            if (data.success) setUsers(prev => prev.map(u => u.id === userId ? { ...u, copytrade_balance: data.newBalance } : u));
        } finally { setAdjusting(null); }
    };

    const typeColor = (type: string) =>
        type.includes('BUY') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';

    if (loading) return <div className="flex justify-center items-center my-20"><ArrowPathIcon className="w-8 h-8 animate-spin text-indigo-500" /></div>;

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 pt-32 md:pt-36 pb-24">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Admin: Copytrade Bridge</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">Kelola sinyal, saldo kredit, dan monitoring EA users. Database: <span className="text-indigo-500 font-medium">Supabase</span></p>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    {[
                        { label: 'Total Users Terdaftar', value: stats.totalUsers, icon: <UsersIcon className="w-10 h-10 p-2 text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl" /> },
                        { label: 'EA Aktif (15 menit terakhir)', value: stats.activeUsers, icon: <CheckCircleIcon className="w-10 h-10 p-2 text-green-500 bg-green-50 dark:bg-green-900/30 rounded-xl" /> },
                        { label: 'Total Sinyal Dikirim', value: stats.totalSignals, icon: <SignalIcon className="w-10 h-10 p-2 text-yellow-500 bg-yellow-50 dark:bg-yellow-900/30 rounded-xl" /> },
                    ].map(s => (
                        <div key={s.label} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center gap-4 shadow-sm">
                            {s.icon}
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                                <p className="text-sm text-gray-500">{s.label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Signal Broadcaster */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <SignalIcon className="w-5 h-5 text-indigo-500" /> Signal Broadcaster
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                    <div className="col-span-1">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Pair</label>
                        <input value={signalForm.pair} onChange={e => setSignalForm({ ...signalForm, pair: e.target.value })}
                            className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-sm" placeholder="XAUUSD" />
                    </div>
                    <div className="col-span-1">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                        <select value={signalForm.type} onChange={e => setSignalForm({ ...signalForm, type: e.target.value })}
                            className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-sm">
                            {['BUY', 'SELL', 'BUY LIMIT', 'SELL LIMIT', 'BUY STOP', 'SELL STOP'].map(t => <option key={t}>{t}</option>)}
                        </select>
                    </div>
                    {['entry_price', 'tp', 'sl'].map(field => (
                        <div key={field} className="col-span-1">
                            <label className="block text-xs font-medium text-gray-500 mb-1 capitalize">{field.replace('_', ' ')}</label>
                            <input type="number" step="any" value={signalForm[field as keyof typeof signalForm]}
                                onChange={e => setSignalForm({ ...signalForm, [field]: e.target.value })}
                                className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-sm" placeholder="0.00" />
                        </div>
                    ))}
                </div>
                <button onClick={broadcastSignal} className="w-full sm:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition">
                    🚀 Broadcast Sinyal ke Semua EA
                </button>
                {signalStatus && <p className="mt-3 text-sm">{signalStatus}</p>}
            </div>

            {/* Tabs: User Management / Signal Log */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="flex border-b border-gray-100 dark:border-gray-700">
                    <button onClick={() => setActiveTab('users')}
                        className={`flex-1 py-3.5 text-sm font-semibold transition ${activeTab === 'users' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/10' : 'text-gray-500 hover:text-gray-700'}`}>
                        👥 Kelola Saldo User ({users.length})
                    </button>
                    <button onClick={() => setActiveTab('signals')}
                        className={`flex-1 py-3.5 text-sm font-semibold transition ${activeTab === 'signals' ? 'text-yellow-600 border-b-2 border-yellow-600 bg-yellow-50/50 dark:bg-yellow-900/10' : 'text-gray-500 hover:text-gray-700'}`}>
                        📡 Log Sinyal ({signals.length})
                    </button>
                    <button onClick={fetchAll} className="px-4 text-gray-400 hover:text-gray-600 transition border-l border-gray-100 dark:border-gray-700">
                        <ArrowPathIcon className="w-4 h-4" />
                    </button>
                </div>

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                        {users.length === 0 && (
                            <div className="py-16 text-center text-gray-400">
                                <UsersIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">Belum ada user yang memiliki license key.</p>
                            </div>
                        )}
                        {users.map(user => (
                            <div key={user.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.email}</p>
                                    <p className="text-xs text-gray-400 font-mono truncate">{user.license_key}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {/* Custom amount input */}
                                    <input
                                        type="number"
                                        value={customAmounts[user.id] || ''}
                                        onChange={e => setCustomAmounts(p => ({ ...p, [user.id]: e.target.value }))}
                                        className="w-16 p-1.5 text-xs text-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg"
                                        placeholder="jml"
                                    />
                                    <button onClick={() => adjustBalance(user.id, -(parseInt(customAmounts[user.id] || '10') || 10))}
                                        disabled={adjusting === user.id}
                                        className="p-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg hover:bg-red-200 transition disabled:opacity-50">
                                        <MinusIcon className="w-4 h-4" />
                                    </button>
                                    <span className="text-sm font-bold text-gray-900 dark:text-white w-10 text-center">{user.copytrade_balance}</span>
                                    <button onClick={() => adjustBalance(user.id, parseInt(customAmounts[user.id] || '10') || 10)}
                                        disabled={adjusting === user.id}
                                        className="p-1.5 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg hover:bg-green-200 transition disabled:opacity-50">
                                        <PlusIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Signals Log Tab */}
                {activeTab === 'signals' && (
                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                        {signals.length === 0 ? (
                            <div className="py-16 text-center text-gray-400">
                                <ClockIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">Belum ada sinyal yang dikirim.</p>
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0">
                                    <tr>
                                        {['Pair', 'Type', 'Entry', 'TP', 'SL', 'Waktu'].map(h => (
                                            <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                    {signals.map(sig => (
                                        <tr key={sig.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                                            <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">{sig.pair}</td>
                                            <td className="py-3 px-4">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${typeColor(sig.type)}`}>
                                                    {sig.type.includes('BUY') ? <ArrowTrendingUpIcon className="w-3 h-3" /> : <ArrowTrendingDownIcon className="w-3 h-3" />}
                                                    {sig.type}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 font-mono text-gray-700 dark:text-gray-300">{sig.entry_price}</td>
                                            <td className="py-3 px-4 font-mono text-green-600">{sig.tp}</td>
                                            <td className="py-3 px-4 font-mono text-red-500">{sig.sl}</td>
                                            <td className="py-3 px-4 text-gray-400 text-xs">{new Date(sig.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
