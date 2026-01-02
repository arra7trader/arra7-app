'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface SocialFeedItem {
    id: number;
    userHash: string;
    symbol: string;
    timeframe?: string;
    direction?: string;
    confidence?: number;
    entryPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
    analysisSummary?: string;
    likes: number;
    createdAt: string;
}

interface TrendingPair {
    symbol: string;
    count: number;
    direction: 'BULLISH' | 'BEARISH' | 'MIXED';
    avgConfidence: number;
}

export default function SocialPage() {
    const [feed, setFeed] = useState<SocialFeedItem[]>([]);
    const [trending, setTrending] = useState<TrendingPair[]>([]);
    const [loading, setLoading] = useState(true);
    const [likedSignals, setLikedSignals] = useState<Set<number>>(new Set());

    useEffect(() => {
        fetchSocialFeed();
    }, []);

    const fetchSocialFeed = async () => {
        try {
            const res = await fetch('/api/social');
            const data = await res.json();
            if (data.status === 'success') {
                setFeed(data.feed);
                setTrending(data.trending);
            }
        } catch (error) {
            console.error('Fetch social feed error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLike = async (signalId: number) => {
        if (likedSignals.has(signalId)) return;

        try {
            const res = await fetch('/api/social', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'like', signalId }),
            });
            const data = await res.json();
            if (data.status === 'success') {
                setLikedSignals(new Set([...likedSignals, signalId]));
                setFeed(feed.map(item =>
                    item.id === signalId ? { ...item, likes: item.likes + 1 } : item
                ));
            }
        } catch (error) {
            console.error('Like error:', error);
        }
    };

    const formatTimeAgo = (dateString: string) => {
        const now = new Date();
        const date = new Date(dateString);
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="relative min-h-screen pt-24 lg:pt-28 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="absolute inset-0 bg-grid opacity-20" />
            <div className="bg-orb bg-orb-cyan w-[500px] h-[500px] -top-20 -right-40 opacity-20" />

            <div className="relative max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                            <span className="text-2xl">🌐</span>
                        </div>
                        <div>
                            <h1 className="text-2xl lg:text-3xl font-bold">Social Feed</h1>
                            <p className="text-sm text-[#64748B]">Lihat analisa dari trader lain secara anonim</p>
                        </div>
                    </div>
                    <Link href="/analisa-market">
                        <button className="px-4 py-2 bg-[#1F2937] hover:bg-[#374151] rounded-lg text-sm">
                            ← Back
                        </button>
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Trending Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="glass rounded-2xl p-5 border border-[#1F2937] sticky top-24">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                🔥 Trending Pairs
                            </h3>
                            {trending.length > 0 ? (
                                <div className="space-y-3">
                                    {trending.map((pair, idx) => (
                                        <div key={pair.symbol} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-mono text-[#64748B]">#{idx + 1}</span>
                                                <span className="font-medium">{pair.symbol}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs px-2 py-0.5 rounded ${pair.direction === 'BULLISH' ? 'bg-green-500/20 text-green-400' :
                                                        pair.direction === 'BEARISH' ? 'bg-red-500/20 text-red-400' :
                                                            'bg-slate-500/20 text-slate-400'
                                                    }`}>
                                                    {pair.direction === 'BULLISH' ? '📈' : pair.direction === 'BEARISH' ? '📉' : '➡️'}
                                                </span>
                                                <span className="text-xs text-[#64748B]">{pair.count} analyses</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-[#64748B]">No trending data yet</p>
                            )}

                            <div className="mt-6 pt-4 border-t border-[#1F2937]">
                                <h4 className="text-sm font-medium text-[#94A3B8] mb-3">Quick Stats</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-[#12141A] rounded-lg p-3">
                                        <p className="text-xs text-[#64748B]">Total Signals</p>
                                        <p className="text-lg font-bold">{feed.length}</p>
                                    </div>
                                    <div className="bg-[#12141A] rounded-lg p-3">
                                        <p className="text-xs text-[#64748B]">Avg Confidence</p>
                                        <p className="text-lg font-bold text-blue-400">
                                            {feed.length > 0
                                                ? Math.round(feed.reduce((sum, f) => sum + (f.confidence || 0), 0) / feed.length)
                                                : 0}%
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Feed */}
                    <div className="lg:col-span-3 space-y-4">
                        {feed.length > 0 ? (
                            feed.map((item, idx) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="glass rounded-2xl p-5 border border-[#1F2937] hover:border-[#374151] transition-all"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                                                <span className="text-sm">🦊</span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">Trader #{item.userHash}</p>
                                                <p className="text-xs text-[#64748B]">{formatTimeAgo(item.createdAt)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {item.confidence && (
                                                <span className={`text-xs px-2 py-1 rounded-full ${item.confidence >= 80 ? 'bg-green-500/20 text-green-400' :
                                                        item.confidence >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                                                            'bg-slate-500/20 text-slate-400'
                                                    }`}>
                                                    {item.confidence}% confidence
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 mb-3">
                                        <span className="text-lg font-bold">{item.symbol}</span>
                                        {item.timeframe && (
                                            <span className="text-xs px-2 py-1 bg-[#1F2937] rounded">{item.timeframe}</span>
                                        )}
                                        {item.direction && (
                                            <span className={`text-sm px-3 py-1 rounded-full font-medium ${item.direction === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                                }`}>
                                                {item.direction === 'BUY' ? '📈 BUY' : '📉 SELL'}
                                            </span>
                                        )}
                                    </div>

                                    {/* Price Levels */}
                                    {(item.entryPrice || item.stopLoss || item.takeProfit) && (
                                        <div className="flex flex-wrap gap-4 mb-3 text-sm">
                                            {item.entryPrice && (
                                                <div>
                                                    <span className="text-[#64748B]">Entry: </span>
                                                    <span className="font-mono text-blue-400">{item.entryPrice}</span>
                                                </div>
                                            )}
                                            {item.stopLoss && (
                                                <div>
                                                    <span className="text-[#64748B]">SL: </span>
                                                    <span className="font-mono text-red-400">{item.stopLoss}</span>
                                                </div>
                                            )}
                                            {item.takeProfit && (
                                                <div>
                                                    <span className="text-[#64748B]">TP: </span>
                                                    <span className="font-mono text-green-400">{item.takeProfit}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {item.analysisSummary && (
                                        <p className="text-sm text-[#94A3B8] mb-4 line-clamp-2">
                                            {item.analysisSummary}
                                        </p>
                                    )}

                                    <div className="flex items-center justify-between pt-3 border-t border-[#1F2937]">
                                        <button
                                            onClick={() => handleLike(item.id)}
                                            disabled={likedSignals.has(item.id)}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${likedSignals.has(item.id)
                                                    ? 'bg-pink-500/20 text-pink-400'
                                                    : 'bg-[#1F2937] text-[#94A3B8] hover:bg-[#374151] hover:text-white'
                                                }`}
                                        >
                                            <span>{likedSignals.has(item.id) ? '❤️' : '🤍'}</span>
                                            <span>{item.likes}</span>
                                        </button>
                                        <Link href={`/analisa-market?pair=${item.symbol}&tf=${item.timeframe || '1h'}`}>
                                            <button className="text-sm text-blue-400 hover:text-blue-300">
                                                Analyze this pair →
                                            </button>
                                        </Link>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="glass rounded-2xl p-12 border border-[#1F2937] text-center">
                                <span className="text-5xl block mb-4">🌐</span>
                                <h3 className="text-xl font-semibold mb-2">No Signals Yet</h3>
                                <p className="text-[#64748B] mb-4">
                                    Be the first to share! Analisa market Anda akan muncul di sini secara anonim.
                                </p>
                                <Link href="/analisa-market">
                                    <button className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-semibold">
                                        Mulai Analisa
                                    </button>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
