'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PAIRS = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'GBPJPY', 'AUDUSD', 'USDCAD', 'BTCUSDT', 'ETHUSDT', 'NAS100', 'US30'];
const TIMEFRAMES = ['15M', '30M', '1H', '4H', 'D1'];

interface PostSignalModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export default function PostSignalModal({ onClose, onSuccess }: PostSignalModalProps) {
    const [pair, setPair] = useState('XAUUSD');
    const [action, setAction] = useState<'BUY' | 'SELL'>('BUY');
    const [entryPrice, setEntryPrice] = useState('');
    const [stopLoss, setStopLoss] = useState('');
    const [takeProfit, setTakeProfit] = useState('');
    const [lotSize, setLotSize] = useState('0.1');
    const [timeframe, setTimeframe] = useState('1H');
    const [commentary, setCommentary] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Calculate RR ratio preview
    const rrRatio = (() => {
        const entry = parseFloat(entryPrice);
        const sl = parseFloat(stopLoss);
        const tp = parseFloat(takeProfit);
        if (!entry || !sl || !tp) return null;
        const risk = Math.abs(entry - sl);
        const reward = Math.abs(tp - entry);
        if (risk === 0) return null;
        return (reward / risk).toFixed(1);
    })();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/copytrade/signals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pair,
                    action,
                    entryPrice: entryPrice ? parseFloat(entryPrice) : null,
                    stopLoss: stopLoss ? parseFloat(stopLoss) : null,
                    takeProfit: takeProfit ? parseFloat(takeProfit) : null,
                    lotSize: parseFloat(lotSize),
                    timeframe,
                    commentary: commentary.trim() || null,
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Gagal posting sinyal');
        } finally {
            setLoading(false);
        }
    };

    const inputCls = "w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 text-sm focus:outline-none focus:border-blue-400 focus:bg-white transition-all";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">📡 Post Sinyal Baru</h2>
                        <p className="text-xs text-gray-400">Sinyal akan dikirim ke semua follower via Telegram</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Pair + Action */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Pair</label>
                            <select value={pair} onChange={e => setPair(e.target.value)} className={inputCls}>
                                {PAIRS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Arah</label>
                            <div className="flex rounded-xl overflow-hidden border border-gray-200">
                                <button type="button" onClick={() => setAction('BUY')}
                                    className={`flex-1 py-2.5 text-sm font-bold transition-all ${action === 'BUY' ? 'bg-green-500 text-white' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                                    🟢 BUY
                                </button>
                                <button type="button" onClick={() => setAction('SELL')}
                                    className={`flex-1 py-2.5 text-sm font-bold transition-all ${action === 'SELL' ? 'bg-red-500 text-white' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                                    🔴 SELL
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Entry / SL / TP */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Entry</label>
                            <input type="number" step="any" placeholder="Market" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} className={inputCls} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Stop Loss</label>
                            <input type="number" step="any" placeholder="0.00" value={stopLoss} onChange={e => setStopLoss(e.target.value)} className={inputCls} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Take Profit</label>
                            <input type="number" step="any" placeholder="0.00" value={takeProfit} onChange={e => setTakeProfit(e.target.value)} className={inputCls} />
                        </div>
                    </div>

                    {/* RR Preview */}
                    <AnimatePresence>
                        {rrRatio && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl">
                                <span className="text-blue-500 text-sm font-semibold">📊 Risk/Reward Ratio:</span>
                                <span className={`text-sm font-bold ${parseFloat(rrRatio) >= 2 ? 'text-green-600' : parseFloat(rrRatio) >= 1 ? 'text-orange-500' : 'text-red-500'}`}>
                                    1:{rrRatio} {parseFloat(rrRatio) >= 2 ? '✅ Bagus' : parseFloat(rrRatio) >= 1 ? '⚠️ Cukup' : '❌ Terlalu rendah'}
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Lot + Timeframe */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Lot Size</label>
                            <input type="number" step="0.01" min="0.01" value={lotSize} onChange={e => setLotSize(e.target.value)} className={inputCls} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Timeframe</label>
                            <div className="flex gap-1">
                                {TIMEFRAMES.map(tf => (
                                    <button key={tf} type="button" onClick={() => setTimeframe(tf)}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${timeframe === tf ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                                        {tf}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Commentary */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Analisa / Commentary (opsional)</label>
                        <textarea value={commentary} onChange={e => setCommentary(e.target.value)} rows={3}
                            placeholder="Contoh: Price rejection dari supply zone H4, confluence dengan FVG H1..."
                            className={`${inputCls} resize-none`} />
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="px-4 py-2.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">{error}</div>
                    )}

                    {/* Submit */}
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
                            Batal
                        </button>
                        <button type="submit" disabled={loading} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all shadow-sm hover:shadow-blue-500/30 hover:shadow-md disabled:opacity-60 flex items-center justify-center gap-2">
                            {loading ? (
                                <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Mengirim...</>
                            ) : (
                                <>📡 Post & Kirim Notifikasi</>
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
