'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useSession } from 'next-auth/react';
import { useFormatter } from 'next-intl';
import FollowModal from '@/components/copytrade/FollowModal';
import EquityChart from '@/components/copytrade/EquityChart';

export default function ProviderDetailPage() {
    const { id } = useParams();
    const { data: session } = useSession();
    const router = useRouter();
    const format = useFormatter();

    const [provider, setProvider] = useState<any>(null);
    const [recentTrades, setRecentTrades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFollowModalOpen, setIsFollowModalOpen] = useState(false);
    const [notification, setNotification] = useState<any>(null);

    useEffect(() => {
        if (id) {
            fetchProviderDetails();
        }
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

    const handleFollow = async (allocation: number, riskMultiplier: number, maxDrawdown: number) => {
        if (!session) {
            router.push('/login');
            return;
        }

        try {
            const res = await fetch('/api/copytrade/follow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    providerId: provider.id,
                    allocatedCapital: allocation,
                    riskMultiplier,
                    maxDrawdownPercent: maxDrawdown
                })
            });

            const data = await res.json();

            if (res.ok) {
                setIsFollowModalOpen(false);
                setNotification({ type: 'success', message: 'Successfully started copying!' });
                // Redirect to dashboard after 2s
                setTimeout(() => router.push('/copytrade/dashboard'), 2000);
            } else {
                setNotification({ type: 'error', message: data.error || 'Failed to follow' });
            }
        } catch (error) {
            setNotification({ type: 'error', message: 'Something went wrong' });
        }
    };

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;
    if (!provider) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Provider not found</div>;

    return (
        <main className="min-h-screen bg-[#000000] text-white">
            <Navbar />

            {notification && (
                <div className={`fixed top-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl z-50 text-sm font-medium ${notification.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                    {notification.message}
                </div>
            )}

            <div className="pt-32 pb-20 container-wide">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 p-[3px]">
                            <div className="w-full h-full rounded-full bg-[#1c1c1e] flex items-center justify-center overflow-hidden">
                                {provider.user_image ? (
                                    <img src={provider.user_image} alt={provider.display_name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-3xl font-bold text-white">{provider.display_name.charAt(0)}</span>
                                )}
                            </div>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">{provider.display_name}</h1>
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                                <span>{provider.broker_name || 'Multi-Broker'}</span>
                                <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                <span>{provider.total_followers} Copiers</span>
                                <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                <span className="text-green-400">{((provider.win_rate || 0)).toFixed(1)}% Win Rate</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsFollowModalOpen(true)}
                        className="px-8 py-3 rounded-xl bg-[var(--accent-blue)] hover:bg-blue-600 text-white font-bold transition-all shadow-lg shadow-blue-500/20"
                    >
                        Copy Strategy
                    </button>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Chart & Bio */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Equity Chart */}
                        <div className="bg-[#1c1c1e] p-6 rounded-2xl border border-white/5">
                            <h3 className="text-lg font-semibold mb-6">Performance Growth</h3>
                            <EquityChart data={[]} />
                        </div>

                        {/* Recent Trades */}
                        <div className="bg-[#1c1c1e] p-6 rounded-2xl border border-white/5">
                            <h3 className="text-lg font-semibold mb-4">Recent Trades</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-gray-500 border-b border-white/5">
                                            <th className="text-left py-3 px-4 font-medium">Symbol</th>
                                            <th className="text-left py-3 px-4 font-medium">Type</th>
                                            <th className="text-right py-3 px-4 font-medium">Entry</th>
                                            <th className="text-right py-3 px-4 font-medium">Profit</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentTrades.length > 0 ? (
                                            recentTrades.map((trade: any) => (
                                                <tr key={trade.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                                    <td className="py-3 px-4 font-medium">{trade.symbol}</td>
                                                    <td className={`py-3 px-4 ${trade.position_type === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                                                        {trade.position_type}
                                                    </td>
                                                    <td className="py-3 px-4 text-right">{trade.entry_price}</td>
                                                    <td className={`py-3 px-4 text-right font-medium ${trade.profit_loss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {trade.profit_loss >= 0 ? '+' : ''}${trade.profit_loss}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="py-8 text-center text-gray-500 italic">
                                                    No recent trades available
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Stats & Bio */}
                    <div className="space-y-6">
                        {/* Key Stats */}
                        <div className="bg-[#1c1c1e] p-6 rounded-2xl border border-white/5">
                            <h3 className="text-lg font-semibold mb-4">Statistics</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between py-2 border-b border-white/5">
                                    <span className="text-gray-400">Total Profit</span>
                                    <span className="text-white font-medium">${(provider.total_profit_usd || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-white/5">
                                    <span className="text-gray-400">Max Drawdown</span>
                                    <span className="text-red-400 font-medium">{(provider.max_drawdown || 0).toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-white/5">
                                    <span className="text-gray-400">Total Trades</span>
                                    <span className="text-white font-medium">{provider.total_trades || 0}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-white/5">
                                    <span className="text-gray-400">Sharpe Ratio</span>
                                    <span className="text-white font-medium">{(provider.sharpe_ratio || 0).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Bio */}
                        <div className="bg-[#1c1c1e] p-6 rounded-2xl border border-white/5">
                            <h3 className="text-lg font-semibold mb-2">Strategy Description</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                {provider.bio || 'No description provided.'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <FollowModal
                isOpen={isFollowModalOpen}
                onClose={() => setIsFollowModalOpen(false)}
                provider={provider}
                onConfirm={handleFollow}
            />
        </main>
    );
}
