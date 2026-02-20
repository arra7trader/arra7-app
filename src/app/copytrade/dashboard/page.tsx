'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SignalCard from '@/components/copytrade/SignalCard';
import ProviderDashboard from '@/components/copytrade/ProviderDashboard';

type Tab = 'portfolio' | 'signals' | 'active_trades' | 'trade_history' | 'provider';

export default function FollowerDashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>('portfolio');
    const [loading, setLoading] = useState(true);
    const [relationships, setRelationships] = useState<any[]>([]);
    const [signals, setSignals] = useState<any[]>([]);
    const [isLocked, setIsLocked] = useState(false);
    const [signalsLoading, setSignalsLoading] = useState(false);
    const [totalEquity, setTotalEquity] = useState(0);
    const [totalPnL, setTotalPnL] = useState(0);
    const [isProvider, setIsProvider] = useState(false);

    const [activeTrades, setActiveTrades] = useState<any[]>([]);
    const [tradeHistory, setTradeHistory] = useState<any[]>([]);
    const [tradesLoading, setTradesLoading] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login?redirect=/copytrade/dashboard');
        if (status === 'authenticated') {
            fetchRelationships();
            checkIfProvider();
        }
    }, [status]);

    useEffect(() => {
        if (activeTab === 'signals') fetchSignals();
        if (activeTab === 'active_trades') fetchTrades('open');
        if (activeTab === 'trade_history') fetchTrades('closed');
    }, [activeTab]);

    const fetchRelationships = async () => {
        try {
            const res = await fetch('/api/copytrade/relationships');
            const data = await res.json();
            if (data.relationships) {
                setRelationships(data.relationships);
                setTotalEquity(data.relationships.reduce((a: number, r: any) => a + r.allocated_capital + (r.total_profit_loss || 0), 0));
                setTotalPnL(data.relationships.reduce((a: number, r: any) => a + (r.total_profit_loss || 0), 0));
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const checkIfProvider = async () => {
        try {
            const res = await fetch('/api/copytrade/providers?own=true');
            const data = await res.json();
            setIsProvider(!!(data.provider?.is_active));
        } catch (e) { }
    };

    const fetchSignals = async () => {
        setSignalsLoading(true);
        try {
            const res = await fetch('/api/copytrade/signals?mode=follower');
            if (res.status === 403) {
                setIsLocked(true);
                setSignals([]);
            } else {
                setIsLocked(false);
                const data = await res.json();
                setSignals(data.signals || []);
            }
        } catch (e) { console.error(e); }
        finally { setSignalsLoading(false); }
    };

    const fetchTrades = async (statusArg: 'open' | 'closed') => {
        setTradesLoading(true);
        try {
            const res = await fetch(`/api/copytrade/trades?mode=follower&status=${statusArg}`);
            if (res.status === 403) {
                setIsLocked(true);
            } else {
                setIsLocked(false);
                const data = await res.json();
                if (statusArg === 'open') setActiveTrades(data.trades || []);
                else setTradeHistory(data.trades || []);
            }
        } catch (e) { console.error(e); }
        finally { setTradesLoading(false); }
    };

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        try {
            await fetch('/api/copytrade/relationships', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ relationshipId: id, status: newStatus })
            });
            setRelationships(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
        } catch (e) { console.error(e); }
    };

    if (status === 'loading' || loading) return (
        <main className="min-h-screen bg-[var(--bg-primary)]">
            <Navbar />
            <div className="pt-32 container mx-auto px-4 max-w-4xl">
                <div className="space-y-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
                </div>
            </div>
        </main>
    );

    return (
        <main className="min-h-screen bg-gray-50 text-gray-900">
            <Navbar />

            <div className="pt-28 pb-20 container mx-auto px-4 max-w-4xl">
                {/* Page Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900">Copy Trade Dashboard</h1>
                        <p className="text-sm text-gray-500">Kelola copy trading & sinyal kamu</p>
                    </div>
                    <Link href="/copytrade">
                        <button className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
                            + Cari Provider
                        </button>
                    </Link>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    {[
                        { label: 'Total Equity', value: `$${totalEquity.toFixed(2)}`, accent: 'text-blue-600' },
                        { label: 'Total P/L', value: `${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(2)}`, accent: totalPnL >= 0 ? 'text-green-600' : 'text-red-500' },
                        { label: 'Provider Aktif', value: relationships.filter(r => r.status === 'active').length, accent: 'text-purple-600' },
                    ].map(({ label, value, accent }) => (
                        <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                            <div className={`text-2xl font-black ${accent}`}>{value}</div>
                            <div className="text-xs text-gray-400 mt-0.5">{label}</div>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-1 p-1 bg-gray-100 rounded-xl mb-5 w-fit">
                    {([
                        { id: 'portfolio', label: '💼 Portfolio' },
                        { id: 'signals', label: '📡 Feed Sinyal' },
                        { id: 'active_trades', label: '⚡ Active Trades' },
                        { id: 'trade_history', label: '📜 Trade History' },
                        ...(isProvider ? [{ id: 'provider', label: '📊 Provider Mode' }] : []),
                    ] as { id: Tab; label: string }[]).map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                <AnimatePresence mode="wait">
                    {/* PORTFOLIO TAB */}
                    {activeTab === 'portfolio' && (
                        <motion.div key="portfolio" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <h2 className="text-base font-bold text-gray-700 mb-3">
                                Subscription Aktif <span className="text-xs font-normal text-gray-400 ml-1">({relationships.length})</span>
                            </h2>
                            {relationships.length === 0 ? (
                                <div className="text-center py-16 bg-white border-2 border-dashed border-gray-200 rounded-2xl">
                                    <div className="text-4xl mb-3">📭</div>
                                    <h3 className="text-base font-bold text-gray-700 mb-1">Belum copy siapapun</h3>
                                    <p className="text-sm text-gray-400 mb-5">Browse marketplace untuk menemukan provider terbaik</p>
                                    <Link href="/copytrade">
                                        <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors">
                                            Browse Marketplace →
                                        </button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {relationships.map((rel: any) => (
                                        <motion.div key={rel.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-base shrink-0">
                                                    {rel.display_name?.charAt(0)}
                                                </div>
                                                <div className="flex-1">
                                                    <Link href={`/copytrade/provider/${rel.provider_id}`} className="font-bold text-gray-900 hover:text-blue-600 transition-colors text-sm">
                                                        {rel.display_name}
                                                    </Link>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${rel.status === 'active' ? 'bg-green-50 text-green-600' : rel.status === 'paused' ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-100 text-gray-500'}`}>
                                                            {rel.status.toUpperCase()}
                                                        </span>
                                                        <span className="text-xs text-gray-400">Sejak {new Date(rel.created_at).toLocaleDateString('id-ID')}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`text-base font-black ${(rel.total_profit_loss || 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                        {(rel.total_profit_loss || 0) >= 0 ? '+' : ''}${(rel.total_profit_loss || 0).toFixed(2)}
                                                    </div>
                                                    <div className="text-xs text-gray-400">${rel.allocated_capital} kapital</div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {rel.status === 'active' && (
                                                    <button onClick={() => handleUpdateStatus(rel.id, 'paused')}
                                                        className="flex-1 py-2 rounded-xl bg-yellow-50 text-yellow-700 text-xs font-bold border border-yellow-100 hover:bg-yellow-100 transition-colors">
                                                        ⏸ Pause
                                                    </button>
                                                )}
                                                {rel.status === 'paused' && (
                                                    <button onClick={() => handleUpdateStatus(rel.id, 'active')}
                                                        className="flex-1 py-2 rounded-xl bg-green-50 text-green-700 text-xs font-bold border border-green-100 hover:bg-green-100 transition-colors">
                                                        ▶ Resume
                                                    </button>
                                                )}
                                                {rel.status !== 'stopped' && (
                                                    <button onClick={() => { if (confirm('Stop copy trading dengan provider ini?')) handleUpdateStatus(rel.id, 'stopped'); }}
                                                        className="flex-1 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold border border-red-100 hover:bg-red-100 transition-colors">
                                                        ⏹ Stop
                                                    </button>
                                                )}
                                                {rel.status === 'stopped' && (
                                                    <div className="flex-1 py-2 text-center text-gray-400 text-xs">Copy dihentikan</div>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* SIGNALS FEED TAB */}
                    {activeTab === 'signals' && (
                        <motion.div key="signals" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            {isLocked ? (
                                <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl shadow-sm">
                                    <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="text-3xl">🔒</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">Akses Terkunci</h3>
                                    <p className="text-gray-500 max-w-sm mx-auto mb-6">
                                        Anda perlu berlangganan <b>CT Follower</b> untuk melihat sinyal dari provider.
                                    </p>
                                    <Link href="/pricing#copytrade">
                                        <button className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all">
                                            Buka Akses (Rp 49k/bln)
                                        </button>
                                    </Link>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between mb-3">
                                        <h2 className="text-base font-bold text-gray-700">Feed Sinyal Terbaru</h2>
                                        <button onClick={fetchSignals} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                                            <svg className={`w-3.5 h-3.5 ${signalsLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            Refresh
                                        </button>
                                    </div>
                                    {signalsLoading ? (
                                        <div className="space-y-3">
                                            {[1, 2].map(i => <div key={i} className="h-36 bg-gray-100 rounded-2xl animate-pulse" />)}
                                        </div>
                                    ) : signals.length === 0 ? (
                                        <div className="text-center py-16 bg-white border-2 border-dashed border-gray-200 rounded-2xl">
                                            <div className="text-4xl mb-3">📡</div>
                                            <h3 className="text-base font-bold text-gray-700 mb-1">Belum ada sinyal</h3>
                                            <p className="text-sm text-gray-400">
                                                {relationships.length === 0
                                                    ? 'Ikuti provider dulu untuk melihat sinyal mereka di sini'
                                                    : 'Provider yang kamu ikuti belum posting sinyal'}
                                            </p>
                                            {relationships.length === 0 && (
                                                <Link href="/copytrade">
                                                    <button className="mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors">
                                                        Cari Provider →
                                                    </button>
                                                </Link>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {signals.map((signal: any) => (
                                                <SignalCard key={signal.id} signal={signal} isProvider={false} />
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </motion.div>
                    )}

                    {/* ACTIVE TRADES TAB */}
                    {activeTab === 'active_trades' && (
                        <motion.div key="active_trades" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-base font-bold text-gray-700">Posisi Berjalan (Floating)</h2>
                                <button onClick={() => fetchTrades('open')} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                                    <svg className={`w-3.5 h-3.5 ${tradesLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Refresh
                                </button>
                            </div>

                            {tradesLoading ? (
                                <div className="space-y-3">
                                    {[1, 2].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
                                </div>
                            ) : activeTrades.length === 0 ? (
                                <div className="text-center py-16 bg-white border-2 border-dashed border-gray-200 rounded-2xl">
                                    <div className="text-4xl mb-3">⚡</div>
                                    <h3 className="text-base font-bold text-gray-700 mb-1">Tidak ada trade aktif</h3>
                                    <p className="text-sm text-gray-400">Belum ada posisi yang sedang disalin saat ini.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {activeTrades.map((trade: any) => (
                                        <div key={trade.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex justify-between items-center">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${trade.position_type === 'BUY' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {trade.position_type}
                                                    </span>
                                                    <span className="font-bold text-sm">{trade.symbol}</span>
                                                    <span className="text-gray-400 text-xs text-semibold">({trade.lot_size} Lot)</span>
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    Provider: <span className="font-semibold text-gray-700">{trade.provider_name}</span>
                                                    <span className="mx-2">&bull;</span>
                                                    Entry: <span className="font-semibold text-gray-700">{trade.entry_price}</span>
                                                    <span className="mx-2">&bull;</span>
                                                    Waktu: {trade.opened_at ? new Date(trade.opened_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`text-base font-black ${(trade.profit_loss || 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                    {(trade.profit_loss || 0) >= 0 ? '+' : ''}${(trade.profit_loss || 0).toFixed(2)}
                                                </div>
                                                <div className="text-[10px] text-gray-400">Floating P/L</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* TRADE HISTORY TAB */}
                    {activeTab === 'trade_history' && (
                        <motion.div key="trade_history" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-base font-bold text-gray-700">Riwayat Trading</h2>
                                <button onClick={() => fetchTrades('closed')} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                                    <svg className={`w-3.5 h-3.5 ${tradesLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Refresh
                                </button>
                            </div>

                            {tradesLoading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
                                </div>
                            ) : tradeHistory.length === 0 ? (
                                <div className="text-center py-16 bg-white border-2 border-dashed border-gray-200 rounded-2xl">
                                    <div className="text-4xl mb-3">📜</div>
                                    <h3 className="text-base font-bold text-gray-700 mb-1">Riwayat masih kosong</h3>
                                    <p className="text-sm text-gray-400">Belum ada trade yang ditutup (close).</p>
                                </div>
                            ) : (
                                <div className="overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead className="bg-gray-50 border-b border-gray-100">
                                            <tr>
                                                <th className="px-4 py-3 font-semibold text-gray-500">Asset</th>
                                                <th className="px-4 py-3 font-semibold text-gray-500">Tipe</th>
                                                <th className="px-4 py-3 font-semibold text-gray-500">Provider</th>
                                                <th className="px-4 py-3 font-semibold text-gray-500 text-right">Profit/Loss</th>
                                                <th className="px-4 py-3 font-semibold text-gray-500">Waktu Open</th>
                                                <th className="px-4 py-3 font-semibold text-gray-500">Waktu Close</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {tradeHistory.map((trade: any) => (
                                                <tr key={trade.id} className="hover:bg-gray-50/50">
                                                    <td className="px-4 py-3 font-bold text-gray-900">{trade.symbol}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${trade.position_type === 'BUY' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                            {trade.position_type}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600 border-x border-gray-50">{trade.provider_name}</td>
                                                    <td className={`px-4 py-3 font-bold text-right ${(trade.profit_loss || 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                        {(trade.profit_loss || 0) >= 0 ? '+' : ''}${(trade.profit_loss || 0).toFixed(2)}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-500 text-xs">
                                                        {trade.opened_at ? new Date(trade.opened_at).toLocaleString('id-ID') : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-400 text-xs">
                                                        {trade.closed_at ? new Date(trade.closed_at).toLocaleString('id-ID') : '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* PROVIDER TAB */}
                    {activeTab === 'provider' && isProvider && (
                        <motion.div key="provider" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <ProviderDashboard />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </main>
    );
}
