'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import { useSession } from 'next-auth/react';
import { useFormatter } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function FollowerDashboardPage() {
    const { data: session } = useSession();
    const format = useFormatter();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [relationships, setRelationships] = useState<any[]>([]);
    const [totalEquity, setTotalEquity] = useState(0);
    const [totalPnL, setTotalPnL] = useState(0);

    useEffect(() => {
        if (session) {
            fetchRelationships();
        }
    }, [session]);

    const fetchRelationships = async () => {
        try {
            const res = await fetch('/api/copytrade/relationships');
            const data = await res.json();

            if (data.relationships) {
                setRelationships(data.relationships);

                // Calculate totals
                const equity = data.relationships.reduce((acc: number, r: any) => acc + r.allocated_capital + (r.total_profit_loss || 0), 0);
                const pnl = data.relationships.reduce((acc: number, r: any) => acc + (r.total_profit_loss || 0), 0);

                setTotalEquity(equity);
                setTotalPnL(pnl);
            }
        } catch (error) {
            console.error('Failed to fetch relationships:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        try {
            const res = await fetch('/api/copytrade/relationships', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ relationshipId: id, status: newStatus })
            });

            if (res.ok) {
                // Optimistic update
                setRelationships(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));

                // If stopped, maybe refresh to clear potential cache issues or just let it be
                if (newStatus === 'stopped') {
                    // Optionally show a notification
                }
            }
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;

    return (
        <main className="min-h-screen bg-[#000000] text-white">
            <Navbar />

            <div className="pt-32 pb-20 container-wide">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">My Portfolio</h1>
                        <p className="text-gray-400">Manage your active copy trading investments</p>
                    </div>
                    <Link href="/copytrade">
                        <button className="px-5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white font-medium transition-colors border border-white/10">
                            + Find Trader
                        </button>
                    </Link>
                </div>

                {/* Portfolio Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="bg-[#1c1c1e] p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
                        <div className="z-10 relative">
                            <div className="text-gray-400 text-sm mb-2">Total Equity</div>
                            <div className="text-3xl font-bold text-white">
                                {format.number(totalEquity, { style: 'currency', currency: 'USD' })}
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px] rounded-full group-hover:bg-blue-500/20 transition-all" />
                    </div>
                    <div className="bg-[#1c1c1e] p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
                        <div className="z-10 relative">
                            <div className="text-gray-400 text-sm mb-2">Total Profit/Loss</div>
                            <div className={`text-3xl font-bold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {totalPnL >= 0 ? '+' : ''}{format.number(totalPnL, { style: 'currency', currency: 'USD' })}
                            </div>
                        </div>
                        <div className={`absolute top-0 right-0 w-32 h-32 blur-[50px] rounded-full transition-all ${totalPnL >= 0 ? 'bg-green-500/10 group-hover:bg-green-500/20' : 'bg-red-500/10 group-hover:bg-red-500/20'}`} />
                    </div>
                    <div className="bg-[#1c1c1e] p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
                        <div className="z-10 relative">
                            <div className="text-gray-400 text-sm mb-2">Active Traders</div>
                            <div className="text-3xl font-bold text-[var(--accent-blue)]">
                                {relationships.filter((r: any) => r.status === 'active').length}
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-[50px] rounded-full group-hover:bg-purple-500/20 transition-all" />
                    </div>
                </div>

                {/* Relationships List */}
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    Active Subscriptions
                    <span className="bg-white/10 text-xs px-2 py-0.5 rounded-full text-gray-300">{relationships.length}</span>
                </h2>

                {relationships.length === 0 ? (
                    <div className="text-center py-20 bg-[#1c1c1e] rounded-2xl border border-dashed border-white/10">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-white mb-2">No Active Traders</h3>
                        <p className="text-gray-400 mb-6 max-w-sm mx-auto">You haven't started copying anyone yet. Browse the marketplace to find top traders.</p>
                        <Link href="/copytrade">
                            <button className="px-6 py-2.5 rounded-xl bg-[var(--accent-blue)] hover:bg-blue-600 text-white font-bold transition-all shadow-lg shadow-blue-500/20">
                                Browse Marketplace
                            </button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {relationships.map((rel: any) => (
                            <motion.div
                                key={rel.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-[#1c1c1e] p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-colors"
                            >
                                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                    <div className="flex items-center gap-4 flex-1 w-full md:w-auto">
                                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-[2px]">
                                            <div className="w-full h-full rounded-full bg-[#1c1c1e] flex items-center justify-center font-bold text-xl overflow-hidden">
                                                {rel.display_name?.charAt(0)}
                                            </div>
                                        </div>
                                        <div>
                                            <Link href={`/copytrade/provider/${rel.provider_id}`} className="hover:text-[var(--accent-blue)] transition-colors flex items-center gap-2">
                                                <h3 className="font-bold text-lg">{rel.display_name}</h3>
                                                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                </svg>
                                            </Link>
                                            <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                                                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${rel.status === 'active' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                                        rel.status === 'paused' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                                                            'bg-red-500/10 text-red-500 border border-red-500/20'
                                                    }`}>
                                                    {rel.status}
                                                </span>
                                                <span>Started: {new Date(rel.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between w-full md:w-auto gap-8 md:gap-16 bg-white/5 rounded-xl px-6 py-3 md:bg-transparent md:px-0 md:py-0">
                                        <div className="text-center">
                                            <div className="text-xs text-gray-500 mb-1">Allocated</div>
                                            <div className="font-bold text-white text-lg">${rel.allocated_capital}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-xs text-gray-500 mb-1">Profit/Loss</div>
                                            <div className={`font-bold text-lg ${rel.total_profit_loss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {rel.total_profit_loss >= 0 ? '+' : ''}${rel.total_profit_loss}
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-xs text-gray-500 mb-1">Risk</div>
                                            <div className="font-bold text-white text-lg">{rel.risk_multiplier}x</div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 w-full md:w-auto">
                                        {rel.status === 'active' ? (
                                            <button
                                                onClick={() => handleUpdateStatus(rel.id, 'paused')}
                                                className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 text-sm font-medium transition-colors border border-yellow-500/20"
                                            >
                                                Pause
                                            </button>
                                        ) : rel.status === 'paused' ? (
                                            <button
                                                onClick={() => handleUpdateStatus(rel.id, 'active')}
                                                className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-500 text-sm font-medium transition-colors border border-green-500/20"
                                            >
                                                Resume
                                            </button>
                                        ) : (
                                            <div className="flex-1 md:flex-none px-4 py-2.5 text-center text-gray-500 text-sm italic">Stopped</div>
                                        )}

                                        {rel.status !== 'stopped' && (
                                            <button
                                                onClick={() => {
                                                    if (window.confirm('Are you sure you want to stop copying? This will close all open positions.')) {
                                                        handleUpdateStatus(rel.id, 'stopped');
                                                    }
                                                }}
                                                className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-medium transition-colors border border-red-500/20"
                                            >
                                                Stop
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
