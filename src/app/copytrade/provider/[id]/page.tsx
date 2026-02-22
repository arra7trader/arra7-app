'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import FollowSettingsModal from '@/components/copytrade/FollowSettingsModal';

interface ProviderData {
    id: string;
    display_name: string;
    bio?: string | null;
    broker_name?: string | null;
    subscription_fee?: number | null;
    profit_sharing_percent?: number | null;
    total_followers?: number | null;
    win_rate?: number | null;
    total_trades?: number | null;
    winning_trades?: number | null;
    losing_trades?: number | null;
    max_drawdown?: number | null;
    total_profit_usd?: number | null;
}

interface RecentTrade {
    id: string;
    symbol: string;
    position_type: string;
    entry_price: number | null;
    profit_loss: number | null;
    status: string;
    closed_at: string;
}

export default function ProviderDetailPage() {
    const params = useParams<{ id: string }>();
    const { data: session } = useSession();

    const [loading, setLoading] = useState(true);
    const [provider, setProvider] = useState<ProviderData | null>(null);
    const [trades, setTrades] = useState<RecentTrade[]>([]);
    const [openFollowModal, setOpenFollowModal] = useState(false);

    useEffect(() => {
        if (!params?.id) return;
        void fetchDetail(params.id);
    }, [params?.id]);

    const fetchDetail = async (providerId: string) => {
        setLoading(true);
        try {
            const response = await fetch(`/api/copytrade/providers/${providerId}`);
            const data = await response.json();
            setProvider((data.provider || null) as ProviderData | null);
            setTrades((data.recentTrades || []) as RecentTrade[]);
        } catch (error) {
            console.error('[ProviderDetail] fetch failed', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <section className="min-h-screen bg-[var(--bg-primary)] px-4 pb-12 pt-8" />;
    }

    if (!provider) {
        return (
            <section className="min-h-screen bg-[var(--bg-primary)] px-4 pb-12 pt-8">
                <div className="mx-auto max-w-3xl rounded-2xl border border-[var(--border-light)] bg-white p-8 text-center">
                    <h1 className="text-xl font-bold text-[var(--text-primary)]">Provider tidak ditemukan</h1>
                    <Link href="/copytrade" className="mt-3 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                        Kembali ke marketplace
                    </Link>
                </div>
            </section>
        );
    }

    const totalTrades = Number(provider.total_trades || 0);
    const winningTrades = Number(provider.winning_trades || 0);
    const losingTrades = Number(provider.losing_trades || 0);
    const handleFollow = () => {
        if (!session?.user?.email) {
            void signIn();
            return;
        }
        setOpenFollowModal(true);
    };

    return (
        <section className="min-h-screen bg-[var(--bg-primary)] px-4 pb-12 pt-8">
            <div className="mx-auto max-w-6xl">
                <Link href="/copytrade" className="text-sm font-semibold text-blue-600">
                    Back to marketplace
                </Link>

                <div className="mt-4 rounded-3xl border border-[var(--border-light)] bg-white p-6">
                    <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-black text-[var(--text-primary)]">{provider.display_name}</h1>
                            <p className="mt-1 text-sm text-[var(--text-secondary)]">
                                {provider.broker_name || 'Multi Broker'} | Followers {Number(provider.total_followers || 0)} | Win Rate{' '}
                                {Number(provider.win_rate || 0).toFixed(1)}%
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={handleFollow}
                                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                            >
                                Follow Provider
                            </button>
                            <Link href="/copytrade/dashboard" className="rounded-xl border border-[var(--border-light)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]">
                                Go to dashboard
                            </Link>
                        </div>
                    </div>

                    {provider.bio && <p className="mt-4 rounded-xl bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-secondary)]">{provider.bio}</p>}
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-4">
                    {[
                        { label: 'Subscription Fee', value: `Rp ${Number(provider.subscription_fee || 0).toLocaleString('id-ID')}` },
                        { label: 'Profit Share', value: `${Number(provider.profit_sharing_percent || 0)}%` },
                        { label: 'Max Drawdown', value: `${Number(provider.max_drawdown || 0).toFixed(2)}%` },
                        { label: 'Total Profit', value: `$${Number(provider.total_profit_usd || 0).toFixed(2)}` },
                    ].map((item) => (
                        <div key={item.label} className="rounded-2xl border border-[var(--border-light)] bg-white p-4">
                            <p className="text-xs text-[var(--text-muted)]">{item.label}</p>
                            <p className="mt-1 text-lg font-black text-[var(--text-primary)]">{item.value}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-3">
                    <div className="rounded-2xl border border-[var(--border-light)] bg-white p-5">
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">Trade Distribution</h3>
                        <div className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                            <div className="flex items-center justify-between"><span>Total Trades</span><span className="font-bold text-[var(--text-primary)]">{totalTrades}</span></div>
                            <div className="flex items-center justify-between"><span>Winning</span><span className="font-bold text-green-600">{winningTrades}</span></div>
                            <div className="flex items-center justify-between"><span>Losing</span><span className="font-bold text-red-600">{losingTrades}</span></div>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-[var(--border-light)] bg-white lg:col-span-2">
                        <div className="border-b border-[var(--border-light)] bg-[var(--bg-secondary)] px-4 py-3">
                            <h3 className="text-sm font-bold text-[var(--text-primary)]">Recent Closed Trades</h3>
                        </div>
                        {trades.length === 0 ? (
                            <div className="p-6 text-sm text-[var(--text-secondary)]">Belum ada data trade tertutup.</div>
                        ) : (
                            <div className="max-h-[420px] overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-[var(--border-light)]">
                                            {['Pair', 'Side', 'Entry', 'Profit/Loss', 'Closed'].map((item) => (
                                                <th key={item} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                                                    {item}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {trades.map((trade) => (
                                            <tr key={trade.id} className="border-b border-[var(--border-light)] last:border-0">
                                                <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">{trade.symbol}</td>
                                                <td className="px-4 py-3">{trade.position_type}</td>
                                                <td className="px-4 py-3">{trade.entry_price ?? '-'}</td>
                                                <td className={`px-4 py-3 font-semibold ${Number(trade.profit_loss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {Number(trade.profit_loss || 0) >= 0 ? '+' : ''}
                                                    {Number(trade.profit_loss || 0).toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                                                    {trade.closed_at ? new Date(trade.closed_at).toLocaleString('id-ID') : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {openFollowModal && (
                <FollowSettingsModal
                    provider={provider}
                    onClose={() => setOpenFollowModal(false)}
                />
            )}
        </section>
    );
}
