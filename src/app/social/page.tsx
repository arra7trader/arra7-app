'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { GlobeIcon, FireIcon, TrendUpIcon, TrendDownIcon, ArrowRightIcon, HeartIcon, HeartSolidIcon, UsersIcon } from '@/components/PremiumIcons';

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
                setFeed(feed.map(item => item.id === signalId ? { ...item, likes: item.likes + 1 } : item));
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
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
                <div className="w-10 h-10 border-2 border-[var(--accent-blue)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pt-20">
            <div className="container-wide section-padding pt-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                            <GlobeIcon className="text-white" size="lg" />
                        </div>
                        <div>
                            <h1 className="text-2xl lg:text-3xl font-bold text-[var(--text-primary)]">Social Feed</h1>
                            <p className="text-sm text-[var(--text-secondary)]">Lihat analisa dari trader lain secara anonim</p>
                        </div>
                    </div>
                    <Link href="/analisa-market">
                        <button className="px-4 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-light)] rounded-lg text-sm text-[var(--text-secondary)]">← Back</button>
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Trending Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl p-5 border border-[var(--border-light)] sticky top-24">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-[var(--text-primary)]">
                                <FireIcon className="text-orange-500" size="md" /> Trending Pairs
                            </h3>
                            {trending.length > 0 ? (
                                <div className="space-y-3">
                                    {trending.map((pair, idx) => (
                                        <div key={pair.symbol} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-mono text-[var(--text-muted)]">#{idx + 1}</span>
                                                <span className="font-medium text-[var(--text-primary)]">{pair.symbol}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs px-2 py-0.5 rounded ${pair.direction === 'BULLISH' ? 'bg-green-100 text-green-700' : pair.direction === 'BEARISH' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {pair.direction === 'BULLISH' ? <TrendUpIcon className="text-green-600" size="sm" /> : pair.direction === 'BEARISH' ? <TrendDownIcon className="text-red-600" size="sm" /> : <ArrowRightIcon className="text-gray-500" size="sm" />}
                                                </span>
                                                <span className="text-xs text-[var(--text-muted)]">{pair.count} analyses</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-[var(--text-muted)]">No trending data yet</p>
                            )}

                            <div className="mt-6 pt-4 border-t border-[var(--border-light)]">
                                <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Quick Stats</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-[var(--bg-secondary)] rounded-lg p-3">
                                        <p className="text-xs text-[var(--text-muted)]">Total Signals</p>
                                        <p className="text-lg font-bold text-[var(--text-primary)]">{feed.length}</p>
                                    </div>
                                    <div className="bg-[var(--bg-secondary)] rounded-lg p-3">
                                        <p className="text-xs text-[var(--text-muted)]">Avg Confidence</p>
                                        <p className="text-lg font-bold text-[var(--accent-blue)]">
                                            {feed.length > 0 ? Math.round(feed.reduce((sum, f) => sum + (f.confidence || 0), 0) / feed.length) : 0}%
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
                                    className="bg-white rounded-2xl p-5 border border-[var(--border-light)] hover:shadow-md transition-all"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                                                <UsersIcon className="text-purple-500" size="sm" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-[var(--text-primary)]">Trader #{item.userHash}</p>
                                                <p className="text-xs text-[var(--text-muted)]">{formatTimeAgo(item.createdAt)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {item.confidence && (
                                                <span className={`text-xs px-2 py-1 rounded-full ${item.confidence >= 80 ? 'bg-green-100 text-green-700' : item.confidence >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {item.confidence}% confidence
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 mb-3">
                                        <span className="text-lg font-bold text-[var(--text-primary)]">{item.symbol}</span>
                                        {item.timeframe && <span className="text-xs px-2 py-1 bg-[var(--bg-secondary)] rounded text-[var(--text-secondary)]">{item.timeframe}</span>}
                                        {item.direction && (
                                            <span className={`text-sm px-3 py-1 rounded-full font-medium ${item.direction === 'BUY' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {item.direction === 'BUY' ? <><TrendUpIcon className="inline mr-1" size="sm" /> BUY</> : <><TrendDownIcon className="inline mr-1" size="sm" /> SELL</>}
                                            </span>
                                        )}
                                    </div>

                                    {(item.entryPrice || item.stopLoss || item.takeProfit) && (
                                        <div className="flex flex-wrap gap-4 mb-3 text-sm">
                                            {item.entryPrice && <div><span className="text-[var(--text-muted)]">Entry: </span><span className="font-mono text-[var(--accent-blue)]">{item.entryPrice}</span></div>}
                                            {item.stopLoss && <div><span className="text-[var(--text-muted)]">SL: </span><span className="font-mono text-red-600">{item.stopLoss}</span></div>}
                                            {item.takeProfit && <div><span className="text-[var(--text-muted)]">TP: </span><span className="font-mono text-green-600">{item.takeProfit}</span></div>}
                                        </div>
                                    )}

                                    {item.analysisSummary && <p className="text-sm text-[var(--text-secondary)] mb-4 line-clamp-2">{item.analysisSummary}</p>}

                                    <div className="flex items-center justify-between pt-3 border-t border-[var(--border-light)]">
                                        <button
                                            onClick={() => handleLike(item.id)}
                                            disabled={likedSignals.has(item.id)}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${likedSignals.has(item.id) ? 'bg-pink-100 text-pink-600' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}
                                        >
                                            <span>{likedSignals.has(item.id) ? <HeartSolidIcon className="text-pink-500" size="sm" /> : <HeartIcon size="sm" />}</span>
                                            <span>{item.likes}</span>
                                        </button>
                                        <Link href={`/analisa-market?pair=${item.symbol}&tf=${item.timeframe || '1h'}`}>
                                            <button className="text-sm text-[var(--accent-blue)] hover:underline">Analyze this pair →</button>
                                        </Link>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="bg-white rounded-2xl p-12 border border-[var(--border-light)] text-center">
                                <div className="mb-4"><GlobeIcon className="text-cyan-500 mx-auto" size="xl" /></div>
                                <h3 className="text-xl font-semibold mb-2 text-[var(--text-primary)]">No Signals Yet</h3>
                                <p className="text-[var(--text-secondary)] mb-4">Be the first to share! Analisa market Anda akan muncul di sini secara anonim.</p>
                                <Link href="/analisa-market"><button className="btn-primary">Mulai Analisa</button></Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
