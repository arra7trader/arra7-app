'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface Position {
    id: number;
    symbol: string;
    direction: 'BUY' | 'SELL';
    entryPrice: number;
    lotSize: number;
    stopLoss?: number;
    takeProfit?: number;
    status: 'OPEN' | 'CLOSED';
    currentPrice?: number;
    profitLoss?: number;
    profitLossPips?: number;
    createdAt: string;
}

interface PortfolioSummary {
    totalPositions: number;
    openPositions: number;
    totalEquity: number;
    unrealizedPL: number;
    realizedPL: number;
    marginUsed: number;
}

const POPULAR_SYMBOLS = ['XAUUSD', 'BTCUSD', 'EURUSD', 'GBPUSD', 'USDJPY'];

export default function PortfolioPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [positions, setPositions] = useState<Position[]>([]);
    const [summary, setSummary] = useState<PortfolioSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showCloseModal, setShowCloseModal] = useState<Position | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    // Form states
    const [formSymbol, setFormSymbol] = useState('XAUUSD');
    const [formDirection, setFormDirection] = useState<'BUY' | 'SELL'>('BUY');
    const [formEntryPrice, setFormEntryPrice] = useState('');
    const [formLotSize, setFormLotSize] = useState('0.1');
    const [formStopLoss, setFormStopLoss] = useState('');
    const [formTakeProfit, setFormTakeProfit] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login?callbackUrl=/portfolio');
        } else if (status === 'authenticated') {
            fetchPortfolio();
        }
    }, [status, router]);

    // Auto-refresh prices every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            if (!loading && !submitting) {
                fetchPortfolio(true);
            }
        }, 30000);
        return () => clearInterval(interval);
    }, [loading, submitting]);

    const fetchPortfolio = async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);

        try {
            const res = await fetch('/api/portfolio');
            const data = await res.json();
            if (data.status === 'success') {
                setPositions(data.positions);
                setSummary(data.summary);
            }
        } catch (error) {
            console.error('Fetch portfolio error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleAddPosition = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch('/api/portfolio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol: formSymbol,
                    direction: formDirection,
                    entryPrice: parseFloat(formEntryPrice),
                    lotSize: parseFloat(formLotSize),
                    stopLoss: formStopLoss ? parseFloat(formStopLoss) : null,
                    takeProfit: formTakeProfit ? parseFloat(formTakeProfit) : null,
                }),
            });
            const data = await res.json();
            if (data.status === 'success') {
                setShowAddModal(false);
                resetForm();
                fetchPortfolio();
            }
        } catch (error) {
            console.error('Add position error:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleClosePosition = async () => {
        if (!showCloseModal) return;
        setSubmitting(true);
        try {
            const res = await fetch('/api/portfolio', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: showCloseModal.id,
                    exitPrice: showCloseModal.currentPrice,
                    profitLoss: showCloseModal.profitLoss,
                }),
            });
            const data = await res.json();
            if (data.status === 'success') {
                setShowCloseModal(null);
                fetchPortfolio();
            }
        } catch (error) {
            console.error('Close position error:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeletePosition = async (id: number) => {
        if (!confirm('Hapus posisi ini?')) return;
        try {
            await fetch(`/api/portfolio?id=${id}`, { method: 'DELETE' });
            fetchPortfolio();
        } catch (error) {
            console.error('Delete position error:', error);
        }
    };

    const resetForm = () => {
        setFormSymbol('XAUUSD');
        setFormDirection('BUY');
        setFormEntryPrice('');
        setFormLotSize('0.1');
        setFormStopLoss('');
        setFormTakeProfit('');
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
            <div className="bg-orb bg-orb-purple w-[500px] h-[500px] -top-20 -left-40 opacity-20" />

            <div className="relative max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                            <span className="text-2xl">📈</span>
                        </div>
                        <div>
                            <h1 className="text-2xl lg:text-3xl font-bold">Portfolio Tracker</h1>
                            <p className="text-sm text-[#64748B]">
                                Track posisi trading Anda secara realtime
                                {refreshing && <span className="ml-2 text-blue-400">🔄 Updating...</span>}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => fetchPortfolio(true)}
                            className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-sm font-medium text-blue-400 transition-all"
                        >
                            🔄 Refresh
                        </button>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg hover:shadow-purple-500/25 rounded-lg text-sm font-medium transition-all"
                        >
                            + Add Position
                        </button>
                        <Link href="/analisa-market">
                            <button className="px-4 py-2 bg-[#1F2937] hover:bg-[#374151] rounded-lg text-sm">
                                ← Back
                            </button>
                        </Link>
                    </div>
                </div>

                {/* Summary Cards */}
                {summary && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                        <div className="glass rounded-xl p-4 border border-[#1F2937]">
                            <p className="text-xs text-[#64748B]">Open Positions</p>
                            <p className="text-2xl font-bold text-blue-400">{summary.openPositions}</p>
                        </div>
                        <div className="glass rounded-xl p-4 border border-[#1F2937]">
                            <p className="text-xs text-[#64748B]">Total Equity</p>
                            <p className={`text-2xl font-bold ${summary.totalEquity >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                ${summary.totalEquity.toFixed(2)}
                            </p>
                        </div>
                        <div className="glass rounded-xl p-4 border border-[#1F2937]">
                            <p className="text-xs text-[#64748B]">Unrealized P/L</p>
                            <p className={`text-2xl font-bold ${summary.unrealizedPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                ${summary.unrealizedPL.toFixed(2)}
                            </p>
                        </div>
                        <div className="glass rounded-xl p-4 border border-[#1F2937]">
                            <p className="text-xs text-[#64748B]">Realized P/L</p>
                            <p className={`text-2xl font-bold ${summary.realizedPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                ${summary.realizedPL.toFixed(2)}
                            </p>
                        </div>
                        <div className="glass rounded-xl p-4 border border-[#1F2937]">
                            <p className="text-xs text-[#64748B]">Margin Used</p>
                            <p className="text-2xl font-bold text-amber-400">${summary.marginUsed.toFixed(2)}</p>
                        </div>
                        <div className="glass rounded-xl p-4 border border-[#1F2937]">
                            <p className="text-xs text-[#64748B]">Total Trades</p>
                            <p className="text-2xl font-bold">{summary.totalPositions}</p>
                        </div>
                    </div>
                )}

                {/* Position Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {positions.map((pos) => (
                        <motion.div
                            key={pos.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`glass rounded-2xl p-5 border ${(pos.profitLoss || 0) >= 0 ? 'border-green-500/30' : 'border-red-500/30'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-bold">{pos.symbol}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${pos.direction === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                        }`}>
                                        {pos.direction}
                                    </span>
                                </div>
                                <span className="text-sm text-[#64748B]">{pos.lotSize} lot</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div>
                                    <p className="text-xs text-[#64748B]">Entry</p>
                                    <p className="font-mono text-sm">{pos.entryPrice}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-[#64748B]">Current</p>
                                    <p className="font-mono text-sm text-blue-400">{pos.currentPrice?.toFixed(5) || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-[#64748B]">P/L</p>
                                    <p className={`font-bold ${(pos.profitLoss || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        ${pos.profitLoss?.toFixed(2) || '0.00'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-[#64748B]">Pips</p>
                                    <p className={`font-mono ${(pos.profitLossPips || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {pos.profitLossPips?.toFixed(1) || '0'} pips
                                    </p>
                                </div>
                            </div>

                            {/* SL/TP Progress */}
                            {(pos.stopLoss || pos.takeProfit) && (
                                <div className="mb-4">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-red-400">SL: {pos.stopLoss || '-'}</span>
                                        <span className="text-green-400">TP: {pos.takeProfit || '-'}</span>
                                    </div>
                                    <div className="h-1.5 bg-[#1F2937] rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all ${(pos.profitLoss || 0) >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                                            style={{ width: '50%' }}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowCloseModal(pos)}
                                    className="flex-1 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/30 transition-all"
                                >
                                    Close Trade
                                </button>
                                <button
                                    onClick={() => handleDeletePosition(pos.id)}
                                    className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-all"
                                >
                                    🗑️
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {positions.length === 0 && (
                    <div className="glass rounded-2xl p-12 border border-[#1F2937] text-center">
                        <span className="text-5xl block mb-4">📈</span>
                        <h3 className="text-xl font-semibold mb-2">No Open Positions</h3>
                        <p className="text-[#64748B] mb-4">Klik "Add Position" untuk mulai tracking.</p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold"
                        >
                            + Add Position
                        </button>
                    </div>
                )}
            </div>

            {/* Add Position Modal */}
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
                            <h3 className="text-xl font-semibold mb-4">Add Position</h3>
                            <form onSubmit={handleAddPosition} className="space-y-4">
                                <div>
                                    <label className="text-sm text-[#64748B] block mb-2">Symbol</label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {POPULAR_SYMBOLS.map(sym => (
                                            <button
                                                type="button"
                                                key={sym}
                                                onClick={() => setFormSymbol(sym)}
                                                className={`px-3 py-1 rounded-lg text-xs transition-all ${formSymbol === sym
                                                        ? 'bg-purple-500 text-white'
                                                        : 'bg-[#1F2937] text-[#94A3B8] hover:bg-[#374151]'
                                                    }`}
                                            >
                                                {sym}
                                            </button>
                                        ))}
                                    </div>
                                    <input
                                        type="text"
                                        value={formSymbol}
                                        onChange={e => setFormSymbol(e.target.value.toUpperCase())}
                                        className="w-full px-3 py-2 bg-[#12141A] border border-[#1F2937] rounded-lg text-white"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm text-[#64748B] block mb-1">Direction</label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setFormDirection('BUY')}
                                                className={`flex-1 py-2 rounded-lg font-medium ${formDirection === 'BUY'
                                                        ? 'bg-green-500 text-white'
                                                        : 'bg-[#1F2937] text-[#94A3B8]'
                                                    }`}
                                            >
                                                BUY
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormDirection('SELL')}
                                                className={`flex-1 py-2 rounded-lg font-medium ${formDirection === 'SELL'
                                                        ? 'bg-red-500 text-white'
                                                        : 'bg-[#1F2937] text-[#94A3B8]'
                                                    }`}
                                            >
                                                SELL
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm text-[#64748B] block mb-1">Lot Size</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formLotSize}
                                            onChange={e => setFormLotSize(e.target.value)}
                                            className="w-full px-3 py-2 bg-[#12141A] border border-[#1F2937] rounded-lg text-white"
                                            required
                                        />
                                    </div>
                                </div>
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
                                <div className="flex gap-3">
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold disabled:opacity-50"
                                    >
                                        {submitting ? 'Adding...' : 'Add Position'}
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

            {/* Close Position Modal */}
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
                            <h3 className="text-xl font-semibold mb-4">Close Position</h3>
                            <div className="bg-[#12141A] rounded-xl p-4 mb-4">
                                <div className="flex justify-between mb-2">
                                    <span className="text-[#64748B]">Symbol</span>
                                    <span className="font-bold">{showCloseModal.symbol}</span>
                                </div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-[#64748B]">Direction</span>
                                    <span className={showCloseModal.direction === 'BUY' ? 'text-green-400' : 'text-red-400'}>
                                        {showCloseModal.direction}
                                    </span>
                                </div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-[#64748B]">Entry</span>
                                    <span>{showCloseModal.entryPrice}</span>
                                </div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-[#64748B]">Current Price</span>
                                    <span className="text-blue-400">{showCloseModal.currentPrice?.toFixed(5)}</span>
                                </div>
                                <div className="flex justify-between border-t border-[#1F2937] pt-2">
                                    <span className="text-[#64748B]">P/L</span>
                                    <span className={`font-bold ${(showCloseModal.profitLoss || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        ${showCloseModal.profitLoss?.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleClosePosition}
                                    disabled={submitting}
                                    className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-semibold disabled:opacity-50"
                                >
                                    {submitting ? 'Closing...' : 'Confirm Close'}
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
