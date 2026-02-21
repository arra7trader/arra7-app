'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import {
    DocumentDuplicateIcon, ArrowPathIcon, CheckCircleIcon,
    XCircleIcon, CurrencyDollarIcon, CogIcon, ClockIcon,
    ArrowTrendingUpIcon, ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';

const CT_PLANS = [
    { id: 'CT_50', credits: 50, priceLabel: 'Rp 50.000', badge: '' },
    { id: 'CT_100', credits: 100, priceLabel: 'Rp 90.000', badge: 'Hemat 10%' },
    { id: 'CT_200', credits: 200, priceLabel: 'Rp 160.000', badge: 'Hemat 20%' },
];

interface Signal {
    id: string; pair: string; type: string; entry_price: number;
    tp: number; sl: number; created_at: string;
}
interface TradeLog {
    id: string; status: string; profit: number; timestamp: string;
}

function CopytradeBridgeContent() {
    const { data: session, status } = useSession();
    const [licenseKey, setLicenseKey] = useState<string | null>(null);
    const [balance, setBalance] = useState(0);
    const [isConnected, setIsConnected] = useState(false);
    const [lastActive, setLastActive] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [copied, setCopied] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<typeof CT_PLANS[0] | null>(null);
    const [activeTab, setActiveTab] = useState<'signals' | 'trades'>('signals');
    const [signals, setSignals] = useState<Signal[]>([]);
    const [tradeLogs, setTradeLogs] = useState<TradeLog[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    useEffect(() => {
        if (status === 'authenticated') {
            fetchUserInfo();
            fetchHistory();
        }
    }, [status]);

    const fetchUserInfo = async () => {
        try {
            const res = await fetch('/api/copytrade-bridge/user/info');
            const data = await res.json();
            if (data.success) {
                setLicenseKey(data.licenseKey);
                setBalance(data.balance || 0);
                setIsConnected(data.isConnected);
                setLastActive(data.lastActive);
            }
        } finally { setLoading(false); }
    };

    const fetchHistory = async () => {
        setHistoryLoading(true);
        try {
            const [sigRes, logRes] = await Promise.all([
                fetch('/api/copytrade-bridge/signals?limit=20'),
                fetch('/api/copytrade-bridge/trade/history?limit=30'),
            ]);
            const [sigData, logData] = await Promise.all([sigRes.json(), logRes.json()]);
            if (sigData.success) setSignals(sigData.signals);
            if (logData.success) setTradeLogs(logData.logs);
        } finally { setHistoryLoading(false); }
    };

    const generateKey = async () => {
        setGenerating(true);
        try {
            const res = await fetch('/api/copytrade-bridge/user/generate-key', { method: 'POST' });
            const data = await res.json();
            if (data.success) setLicenseKey(data.licenseKey);
        } finally { setGenerating(false); }
    };

    const copyToClipboard = () => {
        if (!licenseKey) return;
        navigator.clipboard.writeText(licenseKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const confirmViaTelegram = (plan: typeof CT_PLANS[0]) => {
        const msg = `Halo Admin ARRA7! 👋\n\nSaya ingin Top-Up Kredit Copytrade Bridge:\n\n📧 Email: ${session?.user?.email || '-'}\n💰 Paket: ${plan.credits} Kredit\n🏷️ Nominal: ${plan.priceLabel}\n\nMohon diproses penambahan kreditnya. Terima kasih! 🙏`;
        window.open(`https://t.me/arra7trader?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const signalTypeColor = (type: string) => {
        if (type.includes('BUY')) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    };

    if (loading) return (
        <div className="flex justify-center items-center min-h-screen">
            <ArrowPathIcon className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 pt-24 pb-24">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">📡 AI Copytrade Bridge</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Hubungkan MT4/MT5 Anda dengan sinyal AI secara otomatis.</p>
            </div>

            {/* Top Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

                {/* Config Card */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-5">
                    <div className="flex items-center gap-3">
                        <CogIcon className="w-6 h-6 text-indigo-500" />
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Konfigurasi</h2>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">License Key</label>
                        {licenseKey ? (
                            <div className="flex items-center gap-2">
                                <input readOnly value={licenseKey}
                                    className="flex-1 p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-200 font-mono text-xs" />
                                <button onClick={copyToClipboard}
                                    className="p-2.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 hover:bg-indigo-100 transition rounded-lg">
                                    <DocumentDuplicateIcon className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <button onClick={generateKey} disabled={generating}
                                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition flex justify-center items-center gap-2 disabled:bg-indigo-400">
                                {generating ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : '🔑 Generate License Key'}
                            </button>
                        )}
                        {copied && <p className="text-xs text-green-500 mt-1.5 font-medium">✅ Tersalin!</p>}
                        {licenseKey && (
                            <button onClick={generateKey} disabled={generating}
                                className="mt-2 text-xs text-gray-400 hover:text-gray-600 transition">
                                {generating ? 'Generating...' : '↻ Generate ulang'}
                            </button>
                        )}
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Status Koneksi EA</p>
                        <div className="flex items-center gap-2">
                            {isConnected
                                ? <><CheckCircleIcon className="w-5 h-5 text-green-500" /><span className="text-sm text-green-600 font-medium">Online</span></>
                                : <><XCircleIcon className="w-5 h-5 text-gray-400" /><span className="text-sm text-gray-500">Offline / Belum terhubung</span></>
                            }
                        </div>
                        {lastActive && <p className="text-xs text-gray-400 mt-1.5">Terakhir aktif: {new Date(lastActive).toLocaleString('id-ID')}</p>}
                    </div>
                </div>

                {/* Balance Card */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <CurrencyDollarIcon className="w-6 h-6 text-green-500" />
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Saldo Kredit</h2>
                        </div>
                        <button onClick={fetchUserInfo} className="p-1.5 text-gray-400 hover:text-gray-600 transition">
                            <ArrowPathIcon className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex flex-col items-center justify-center py-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-100 dark:border-green-900/50 mb-4">
                        <span className="text-5xl font-bold text-green-600 dark:text-green-400">{balance}</span>
                        <span className="text-xs text-gray-400 font-semibold tracking-widest uppercase mt-2">Kredit Tersisa</span>
                    </div>
                    <p className="text-xs text-gray-400 text-center mb-4">1 Kredit = 1 order tereksekusi</p>
                    <button onClick={() => setSelectedPlan(selectedPlan ? null : CT_PLANS[0])}
                        className="w-full py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90 text-white rounded-xl text-sm font-medium transition shadow-md shadow-green-500/20">
                        {selectedPlan ? '✕ Tutup Top-up' : '💳 Top-up Kredit'}
                    </button>
                </div>
            </div>

            {/* Top-up section */}
            {selectedPlan !== null && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">💳 Top-up via QRIS</h3>
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        <div className="flex-shrink-0 mx-auto md:mx-0">
                            <div className="border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-3 bg-white">
                                <img src="/qris-payment.jpg" alt="QRIS Copytrade Bridge ARRA7" className="w-52 h-52 object-contain rounded-xl" />
                            </div>
                            <p className="text-xs text-center font-semibold text-gray-600 dark:text-gray-400 mt-2">ARRA7 FULLSTACK DEVELOPER</p>
                            <p className="text-xs text-center text-gray-400 font-mono">NMID: ID1025468752486</p>
                        </div>
                        <div className="flex-1 space-y-4">
                            <div className="grid grid-cols-3 gap-3">
                                {CT_PLANS.map(plan => (
                                    <div key={plan.id} onClick={() => setSelectedPlan(plan)}
                                        className={`relative border-2 rounded-xl p-3 cursor-pointer transition ${selectedPlan?.id === plan.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-100 dark:border-gray-700 hover:border-indigo-300'}`}>
                                        {plan.badge && <span className="absolute -top-2 right-2 bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-semibold">{plan.badge}</span>}
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{plan.credits}</p>
                                        <p className="text-[10px] text-gray-400">Kredit</p>
                                        <p className="text-xs font-semibold text-indigo-600 mt-1">{plan.priceLabel}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
                                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2">Cara bayar:</p>
                                <ol className="text-xs text-blue-600 dark:text-blue-400 list-decimal list-inside space-y-1">
                                    <li>Scan QRIS · GoPay / OVO / Dana / BCA</li>
                                    <li>Masukkan nominal: <b>{selectedPlan?.priceLabel}</b></li>
                                    <li>Screenshot bukti pembayaran</li>
                                    <li>Klik konfirmasi → kirim ke Admin</li>
                                </ol>
                            </div>
                            <button onClick={() => selectedPlan && confirmViaTelegram(selectedPlan)}
                                className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-500 to-cyan-500 hover:opacity-90 transition flex items-center justify-center gap-2 shadow-md shadow-blue-500/20">
                                📨 Konfirmasi {selectedPlan?.credits} Kredit via Telegram
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Signal History & Trade Logs Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-6">
                <div className="flex border-b border-gray-100 dark:border-gray-700">
                    <button onClick={() => setActiveTab('signals')}
                        className={`flex-1 py-3.5 text-sm font-semibold transition ${activeTab === 'signals' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/10' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                        📡 Riwayat Sinyal ({signals.length})
                    </button>
                    <button onClick={() => setActiveTab('trades')}
                        className={`flex-1 py-3.5 text-sm font-semibold transition ${activeTab === 'trades' ? 'text-green-600 border-b-2 border-green-600 bg-green-50/50 dark:bg-green-900/10' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                        📒 Trade Log Saya ({tradeLogs.length})
                    </button>
                    <button onClick={fetchHistory} className="px-4 text-gray-400 hover:text-gray-600 transition">
                        <ArrowPathIcon className={`w-4 h-4 ${historyLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Signals Tab */}
                {activeTab === 'signals' && (
                    <div className="overflow-x-auto">
                        {signals.length === 0 ? (
                            <div className="py-16 text-center text-gray-400">
                                <ClockIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">Belum ada sinyal. Admin akan broadcast sinyal segera.</p>
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-900/50">
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
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${signalTypeColor(sig.type)}`}>
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

                {/* Trade Logs Tab */}
                {activeTab === 'trades' && (
                    <div className="overflow-x-auto">
                        {tradeLogs.length === 0 ? (
                            <div className="py-16 text-center text-gray-400">
                                <ClockIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">Belum ada trade yang tereksekusi oleh EA kamu.</p>
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-900/50">
                                    <tr>
                                        {['Status', 'Profit/Loss', 'Waktu'].map(h => (
                                            <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                    {tradeLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                                            <td className="py-3 px-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${log.status === 'SUCCESS' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                    {log.status === 'SUCCESS' ? <CheckCircleIcon className="w-3.5 h-3.5" /> : <XCircleIcon className="w-3.5 h-3.5" />}
                                                    {log.status}
                                                </span>
                                            </td>
                                            <td className={`py-3 px-4 font-mono font-semibold ${(log.profit || 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                {(log.profit || 0) >= 0 ? '+' : ''}{(log.profit || 0).toFixed(2)}
                                            </td>
                                            <td className="py-3 px-4 text-gray-400 text-xs">{new Date(log.timestamp).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>

            {/* Guide */}
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                <h3 className="text-sm font-semibold text-indigo-800 dark:text-indigo-300 mb-2">📘 Panduan Singkat</h3>
                <ol className="list-decimal list-inside text-sm text-indigo-700 dark:text-indigo-400 space-y-1.5">
                    <li>Generate <b>License Key</b> di panel konfigurasi di atas.</li>
                    <li>Download <code className="bg-indigo-100 dark:bg-indigo-800/50 px-1 rounded text-xs">Arra-Copytrade-Bridge.mq5</code> dan pasang di <code className="bg-indigo-100 dark:bg-indigo-800/50 px-1 rounded text-xs">MQL5/Experts/</code> di MetaTrader 5.</li>
                    <li>Di MT5: <b>Tools → Options → Expert Advisors</b> → Allow WebRequest untuk URL ARRA7.</li>
                    <li>Attach EA di chart, masukkan License Key, atur Lot Size & Max Drawdown.</li>
                    <li>Top-up kredit via QRIS → konfirmasi ke Admin → Admin tambahkan kredit.</li>
                </ol>
            </div>
        </div>
    );
}

export default function CopytradeBridgeDashboard() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center min-h-screen">
                <ArrowPathIcon className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        }>
            <CopytradeBridgeContent />
        </Suspense>
    );
}
