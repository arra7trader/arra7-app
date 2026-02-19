'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useSession } from 'next-auth/react';
import FollowSettingsModal from '@/components/copytrade/FollowSettingsModal';
import EquityChart from '@/components/copytrade/EquityChart';
import Link from 'next/link';

export default function ProviderDetailPage() {
    const { id } = useParams();
    const { data: session } = useSession();
    const router = useRouter();

    const [provider, setProvider] = useState<any>(null);
    const [recentTrades, setRecentTrades] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        if (id) fetchProviderDetails();
    }, [id]);

    const fetchProviderDetails = async () => {
        try {
            const res = await fetch(`/api/copytrade/providers/${id}`);
            const data = await res.json();
            if (data.provider) {
                setProvider(data.provider);
                setRecentTrades(data.recentTrades || []);
            }
        } catch (error) {
            console.error('Failed to fetch details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyClick = () => {
        if (!session) { router.push('/login'); return; }
        setShowModal(true);
    };

    if (loading) return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-400 text-sm">Memuat profil trader...</p>
            </div>
        </div>
    );

    if (!provider) return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center text-center p-4">
            <div>
                <h2 className="text-2xl font-bold text-gray-700 mb-2">Provider tidak ditemukan</h2>
                <Link href="/copytrade" className="text-blue-600 hover:underline text-sm">← Kembali ke marketplace</Link>
            </div>
        </div>
    );

    const winRate = Number(provider.win_rate ?? 0);
    const netProfit = Number(provider.net_profit_usd ?? 0);
    const maxDD = Number(provider.max_drawdown ?? 0);
    const totalTrades = Number(provider.total_trades ?? 0);
    const winTrades = Number(provider.winning_trades ?? 0);
    const lossTrades = Number(provider.losing_trades ?? 0);
    const sharpe = Number(provider.sharpe_ratio ?? 0);

    return (
        <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
            <Navbar />

            <div className="pt-24 pb-20 container mx-auto px-4 max-w-6xl">

                {/* Breadcrumb */}
                <Link href="/copytrade" className="flex items-center gap-1 text-sm text-gray-400 hover:text-blue-600 mb-6 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Marketplace
                </Link>

                {/* Header Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6"
                >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shrink-0">
                                {provider.display_name?.charAt(0) ?? 'P'}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h1 className="text-2xl font-bold text-gray-900">{provider.display_name}</h1>
                                    <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold border border-green-200">VERIFIED</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                                    <span>🏦 {provider.broker_name || 'Multi-Broker'}</span>
                                    <span>·</span>
                                    <span>👥 {provider.total_followers ?? 0} copier</span>
                                    <span>·</span>
                                    <span className="text-green-600 font-semibold">✓ {winRate.toFixed(1)}% Win Rate</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <span>
                                    {provider.subscription_fee > 0
                                        ? `Rp ${Number(provider.subscription_fee).toLocaleString('id-ID')}/bln`
                                        : 'Gratis'}
                                </span>
                                <span>·</span>
                                <span>Profit Share {provider.profit_sharing_percent}%</span>
                            </div>
                            <button
                                onClick={handleCopyClick}
                                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:shadow-lg hover:shadow-blue-500/25 transition-all"
                            >
                                Copy Strategy
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[
                        { label: 'Net Profit', value: `${netProfit >= 0 ? '+' : ''}$${netProfit.toFixed(2)}`, color: netProfit >= 0 ? 'text-green-600' : 'text-red-500' },
                        { label: 'Win Rate', value: `${winRate.toFixed(1)}%`, color: 'text-blue-600' },
                        { label: 'Max Drawdown', value: `${maxDD.toFixed(1)}%`, color: 'text-orange-500' },
                        { label: 'Total Trades', value: String(totalTrades), color: 'text-gray-900' },
                    ].map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-center"
                        >
                            <div className={`text-2xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
                            <div className="text-xs text-gray-400 uppercase tracking-wider">{stat.label}</div>
                        </motion.div>
                    ))}
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Chart + Recent Trades */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Equity Chart */}
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                            <h3 className="text-base font-bold text-gray-900 mb-4">📈 Pertumbuhan Equity</h3>
                            <EquityChart data={[]} />
                        </div>

                        {/* Win/Loss Distribution */}
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                            <h3 className="text-base font-bold text-gray-900 mb-4">📊 Distribution Trades</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-gray-500 w-20">Win</span>
                                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-green-500 rounded-full transition-all duration-700"
                                            style={{ width: totalTrades > 0 ? `${(winTrades / totalTrades) * 100}%` : '0%' }}
                                        />
                                    </div>
                                    <span className="text-sm font-bold text-green-600 w-12 text-right">{winTrades}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-gray-500 w-20">Loss</span>
                                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-red-400 rounded-full transition-all duration-700"
                                            style={{ width: totalTrades > 0 ? `${(lossTrades / totalTrades) * 100}%` : '0%' }}
                                        />
                                    </div>
                                    <span className="text-sm font-bold text-red-500 w-12 text-right">{lossTrades}</span>
                                </div>
                            </div>
                        </div>

                        {/* Recent Trades */}
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                            <h3 className="text-base font-bold text-gray-900 mb-4">🕐 Riwayat Trade Terakhir</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-gray-400 border-b border-gray-100 text-xs uppercase tracking-wider">
                                            <th className="text-left py-3 font-medium">Symbol</th>
                                            <th className="text-left py-3 font-medium">Type</th>
                                            <th className="text-right py-3 font-medium">Entry</th>
                                            <th className="text-right py-3 font-medium">P/L</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentTrades.length > 0 ? (
                                            recentTrades.map((trade: any, i: number) => (
                                                <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                                                    <td className="py-3 font-semibold text-gray-900">{trade.symbol}</td>
                                                    <td className={`py-3 font-medium ${trade.position_type === 'BUY' ? 'text-green-600' : 'text-red-500'}`}>
                                                        {trade.position_type}
                                                    </td>
                                                    <td className="py-3 text-right text-gray-600">{trade.entry_price}</td>
                                                    <td className={`py-3 text-right font-bold ${Number(trade.profit_loss) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                        {Number(trade.profit_loss) >= 0 ? '+' : ''}${Number(trade.profit_loss).toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="py-8 text-center text-gray-400 text-sm italic">
                                                    Belum ada riwayat trade
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Right: Stats + Bio + CTA */}
                    <div className="space-y-5">
                        {/* Full Stats */}
                        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Statistik Lengkap</h3>
                            <div className="space-y-3">
                                {[
                                    { label: 'Winning Trades', value: winTrades, color: 'text-green-600' },
                                    { label: 'Losing Trades', value: lossTrades, color: 'text-red-500' },
                                    { label: 'Total Profit', value: `$${Number(provider.total_profit_usd ?? 0).toFixed(2)}`, color: 'text-green-600' },
                                    { label: 'Total Loss', value: `$${Number(provider.total_loss_usd ?? 0).toFixed(2)}`, color: 'text-red-500' },
                                    { label: 'Sharpe Ratio', value: sharpe.toFixed(2), color: 'text-blue-600' },
                                    { label: 'Avg Profit/Trade', value: `$${Number(provider.avg_profit_per_trade ?? 0).toFixed(2)}`, color: 'text-gray-900' },
                                ].map((stat, i) => (
                                    <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                                        <span className="text-xs text-gray-400">{stat.label}</span>
                                        <span className={`text-sm font-bold ${stat.color}`}>{stat.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Bio */}
                        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">Strategi</h3>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                {provider.bio || 'Tidak ada deskripsi strategi.'}
                            </p>
                        </div>

                        {/* Sticky CTA */}
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white">
                            <p className="font-bold text-lg mb-1">Mulai Copy Sekarang</p>
                            <p className="text-blue-100 text-sm mb-4">
                                {provider.subscription_fee > 0
                                    ? `Rp ${Number(provider.subscription_fee).toLocaleString('id-ID')}/bulan`
                                    : 'Gratis — tidak ada biaya tersembunyi'}
                            </p>
                            <button
                                onClick={handleCopyClick}
                                className="w-full py-3 rounded-xl bg-white text-blue-700 font-bold hover:bg-blue-50 transition-colors text-sm"
                            >
                                Copy Strategy
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {showModal && (
                <FollowSettingsModal
                    provider={provider}
                    onClose={() => setShowModal(false)}
                />
            )}
        </main>
    );
}
