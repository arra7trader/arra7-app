'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface JournalEntry {
    id: number;
    symbol: string;
    direction: 'BUY' | 'SELL';
    entryPrice: number;
    stopLoss?: number;
    takeProfit?: number;
    lotSize?: number;
    status: 'OPEN' | 'CLOSED' | 'CANCELLED';
    exitPrice?: number;
    profitLoss?: number;
    notes?: string;
    createdAt: string;
    closedAt?: string;
}

interface JournalStats {
    totalTrades: number;
    openTrades: number;
    closedTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalProfitLoss: number;
    avgWin: number;
    avgLoss: number;
}

export default function JournalPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [stats, setStats] = useState<JournalStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showCloseModal, setShowCloseModal] = useState<JournalEntry | null>(null);

    // Form states
    const [formSymbol, setFormSymbol] = useState('XAUUSD');
    const [formDirection, setFormDirection] = useState<'BUY' | 'SELL'>('BUY');
    const [formEntryPrice, setFormEntryPrice] = useState('');
    const [formStopLoss, setFormStopLoss] = useState('');
    const [formTakeProfit, setFormTakeProfit] = useState('');
    const [formLotSize, setFormLotSize] = useState('0.1');
    const [formNotes, setFormNotes] = useState('');
    const [formExitPrice, setFormExitPrice] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login?callbackUrl=/journal');
        } else if (status === 'authenticated') {
            fetchJournal();
        }
    }, [status, router]);

    const fetchJournal = async () => {
        try {
            const res = await fetch('/api/journal');
            const data = await res.json();
            if (data.status === 'success') {
                setEntries(data.entries);
                setStats(data.stats);
            }
        } catch (error) {
            console.error('Fetch journal error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTrade = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch('/api/journal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol: formSymbol,
                    direction: formDirection,
                    entryPrice: parseFloat(formEntryPrice),
                    stopLoss: formStopLoss ? parseFloat(formStopLoss) : null,
                    takeProfit: formTakeProfit ? parseFloat(formTakeProfit) : null,
                    lotSize: parseFloat(formLotSize),
                    notes: formNotes,
                }),
            });
            const data = await res.json();
            if (data.status === 'success') {
                setShowAddModal(false);
                resetForm();
                fetchJournal();
            }
        } catch (error) {
            console.error('Add trade error:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleCloseTrade = async () => {
        if (!showCloseModal) return;
        setSubmitting(true);
        try {
            const exitPrice = parseFloat(formExitPrice);
            const profitLoss = showCloseModal.direction === 'BUY'
                ? (exitPrice - showCloseModal.entryPrice) * (showCloseModal.lotSize || 1) * 100
                : (showCloseModal.entryPrice - exitPrice) * (showCloseModal.lotSize || 1) * 100;

            const res = await fetch('/api/journal', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: showCloseModal.id,
                    action: 'close',
                    exitPrice,
                    profitLoss,
                }),
            });
            const data = await res.json();
            if (data.status === 'success') {
                setShowCloseModal(null);
                setFormExitPrice('');
                fetchJournal();
            }
        } catch (error) {
            console.error('Close trade error:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteTrade = async (id: number) => {
        if (!confirm('Hapus entry ini?')) return;
        try {
            await fetch(`/api/journal?id=${id}`, { method: 'DELETE' });
            fetchJournal();
        } catch (error) {
            console.error('Delete trade error:', error);
        }
    };

    const resetForm = () => {
        setFormSymbol('XAUUSD');
        setFormDirection('BUY');
        setFormEntryPrice('');
        setFormStopLoss('');
        setFormTakeProfit('');
        setFormLotSize('0.1');
        setFormNotes('');
    };

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!session) return null;

    return (
        <div className="relative min-h-screen pt-24 lg:pt-28 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="absolute inset-0 bg-grid opacity-20" />
            <div className="bg-orb bg-orb-blue w-[500px] h-[500px] -top-20 -right-40 opacity-20" />

            <div className="relative max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                            <span className="text-2xl">📓</span>
                        </div>
                        <div>
                            <h1 className="text-2xl lg:text-3xl font-bold">Trade Journal</h1>
                            <p className="text-sm text-[#64748B]">Track dan analisa semua trade Anda</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:shadow-lg hover:shadow-green-500/25 rounded-lg text-sm font-medium transition-all"
                        >
                            + Add Trade
                        </button>
                        <Link href="/analisa-market">
                            <button className="px-4 py-2 bg-[#1F2937] hover:bg-[#374151] rounded-lg text-sm">
                                ← Back
                            </button>
                        </Link>
                    </div>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
                        <div className="glass rounded-xl p-4 border border-[#1F2937]">
                            <p className="text-xs text-[#64748B]">Total Trades</p>
                            <p className="text-2xl font-bold">{stats.totalTrades}</p>
                        </div>
                        <div className="glass rounded-xl p-4 border border-[#1F2937]">
                            <p className="text-xs text-[#64748B]">Open</p>
                            <p className="text-2xl font-bold text-blue-400">{stats.openTrades}</p>
                        </div>
                        <div className="glass rounded-xl p-4 border border-[#1F2937]">
                            <p className="text-xs text-[#64748B]">Win Rate</p>
                            <p className="text-2xl font-bold text-green-400">{stats.winRate.toFixed(1)}%</p>
                        </div>
                        <div className="glass rounded-xl p-4 border border-[#1F2937]">
                            <p className="text-xs text-[#64748B]">Wins</p>
                            <p className="text-2xl font-bold text-green-400">{stats.winningTrades}</p>
                        </div>
                        <div className="glass rounded-xl p-4 border border-[#1F2937]">
                            <p className="text-xs text-[#64748B]">Losses</p>
                            <p className="text-2xl font-bold text-red-400">{stats.losingTrades}</p>
                        </div>
                        <div className="glass rounded-xl p-4 border border-[#1F2937]">
                            <p className="text-xs text-[#64748B]">Total P/L</p>
                            <p className={`text-2xl font-bold ${stats.totalProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                ${stats.totalProfitLoss.toFixed(2)}
                            </p>
                        </div>
                    </div>
                )}

                {/* Journal Table */}
                <div className="glass rounded-2xl border border-[#1F2937] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[#12141A]">
                                <tr>
                                    <th className="text-left p-4 text-sm text-[#64748B]">Symbol</th>
                                    <th className="text-left p-4 text-sm text-[#64748B]">Direction</th>
                                    <th className="text-left p-4 text-sm text-[#64748B]">Entry</th>
                                    <th className="text-left p-4 text-sm text-[#64748B]">SL/TP</th>
                                    <th className="text-left p-4 text-sm text-[#64748B]">Lot</th>
                                    <th className="text-left p-4 text-sm text-[#64748B]">Status</th>
                                    <th className="text-left p-4 text-sm text-[#64748B]">P/L</th>
                                    <th className="text-left p-4 text-sm text-[#64748B]">Date</th>
                                    <th className="text-left p-4 text-sm text-[#64748B]">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map((entry) => (
                                    <tr key={entry.id} className="border-t border-[#1F2937] hover:bg-[#1A1D24]">
                                        <td className="p-4 font-medium">{entry.symbol}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${entry.direction === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                                }`}>
                                                {entry.direction}
                                            </span>
                                        </td>
                                        <td className="p-4 font-mono">{entry.entryPrice}</td>
                                        <td className="p-4 text-sm">
                                            <span className="text-red-400">{entry.stopLoss || '-'}</span>
                                            <span className="text-[#64748B]"> / </span>
                                            <span className="text-green-400">{entry.takeProfit || '-'}</span>
                                        </td>
                                        <td className="p-4">{entry.lotSize || '-'}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${entry.status === 'OPEN' ? 'bg-blue-500/20 text-blue-400' :
                                                    entry.status === 'CLOSED' ? 'bg-slate-500/20 text-slate-400' :
                                                        'bg-yellow-500/20 text-yellow-400'
                                                }`}>
                                                {entry.status}
                                            </span>
                                        </td>
                                        <td className={`p-4 font-medium ${(entry.profitLoss || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                                            }`}>
                                            {entry.profitLoss ? `$${entry.profitLoss.toFixed(2)}` : '-'}
                                        </td>
                                        <td className="p-4 text-sm text-[#94A3B8]">
                                            {new Date(entry.createdAt).toLocaleDateString('id-ID')}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex gap-2">
                                                {entry.status === 'OPEN' && (
                                                    <button
                                                        onClick={() => setShowCloseModal(entry)}
                                                        className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/30"
                                                    >
                                                        Close
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteTrade(entry.id)}
                                                    className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {entries.length === 0 && (
                        <div className="p-12 text-center text-[#64748B]">
                            <span className="text-4xl block mb-4">📓</span>
                            Belum ada trade. Klik "Add Trade" untuk mulai tracking.
                        </div>
                    )}
                </div>
            </div>

            {/* Add Trade Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowAddModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="glass rounded-2xl p-6 max-w-md w-full border border-[#1F2937]"
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 className="text-xl font-semibold mb-4">Add New Trade</h3>
                            <form onSubmit={handleAddTrade} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm text-[#64748B] block mb-1">Symbol</label>
                                        <input
                                            type="text"
                                            value={formSymbol}
                                            onChange={e => setFormSymbol(e.target.value.toUpperCase())}
                                            className="w-full px-3 py-2 bg-[#12141A] border border-[#1F2937] rounded-lg text-white"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-[#64748B] block mb-1">Direction</label>
                                        <select
                                            value={formDirection}
                                            onChange={e => setFormDirection(e.target.value as 'BUY' | 'SELL')}
                                            className="w-full px-3 py-2 bg-[#12141A] border border-[#1F2937] rounded-lg text-white"
                                        >
                                            <option value="BUY">BUY</option>
                                            <option value="SELL">SELL</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm text-[#64748B] block mb-1">Entry Price</label>
                                        <input
                                            type="number"
                                            step="0.00001"
                                            value={formEntryPrice}
                                            onChange={e => setFormEntryPrice(e.target.value)}
                                            className="w-full px-3 py-2 bg-[#12141A] border border-[#1F2937] rounded-lg text-white"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-[#64748B] block mb-1">Lot Size</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formLotSize}
                                            onChange={e => setFormLotSize(e.target.value)}
                                            className="w-full px-3 py-2 bg-[#12141A] border border-[#1F2937] rounded-lg text-white"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm text-[#64748B] block mb-1">Stop Loss</label>
                                        <input
                                            type="number"
                                            step="0.00001"
                                            value={formStopLoss}
                                            onChange={e => setFormStopLoss(e.target.value)}
                                            className="w-full px-3 py-2 bg-[#12141A] border border-[#1F2937] rounded-lg text-red-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-[#64748B] block mb-1">Take Profit</label>
                                        <input
                                            type="number"
                                            step="0.00001"
                                            value={formTakeProfit}
                                            onChange={e => setFormTakeProfit(e.target.value)}
                                            className="w-full px-3 py-2 bg-[#12141A] border border-[#1F2937] rounded-lg text-green-400"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm text-[#64748B] block mb-1">Notes</label>
                                    <textarea
                                        value={formNotes}
                                        onChange={e => setFormNotes(e.target.value)}
                                        className="w-full px-3 py-2 bg-[#12141A] border border-[#1F2937] rounded-lg text-white"
                                        rows={2}
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-semibold disabled:opacity-50"
                                    >
                                        {submitting ? 'Saving...' : 'Add Trade'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="px-6 py-3 border border-[#374151] rounded-xl text-[#94A3B8] hover:text-white"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Close Trade Modal */}
            <AnimatePresence>
                {showCloseModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowCloseModal(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="glass rounded-2xl p-6 max-w-sm w-full border border-[#1F2937]"
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 className="text-xl font-semibold mb-4">Close Trade</h3>
                            <p className="text-sm text-[#94A3B8] mb-4">
                                {showCloseModal.symbol} {showCloseModal.direction} @ {showCloseModal.entryPrice}
                            </p>
                            <div className="mb-4">
                                <label className="text-sm text-[#64748B] block mb-1">Exit Price</label>
                                <input
                                    type="number"
                                    step="0.00001"
                                    value={formExitPrice}
                                    onChange={e => setFormExitPrice(e.target.value)}
                                    className="w-full px-3 py-2 bg-[#12141A] border border-[#1F2937] rounded-lg text-white"
                                    required
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleCloseTrade}
                                    disabled={submitting || !formExitPrice}
                                    className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-semibold disabled:opacity-50"
                                >
                                    {submitting ? 'Closing...' : 'Close Trade'}
                                </button>
                                <button
                                    onClick={() => setShowCloseModal(null)}
                                    className="px-6 py-3 border border-[#374151] rounded-xl text-[#94A3B8] hover:text-white"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
