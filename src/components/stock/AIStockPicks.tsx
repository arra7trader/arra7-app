'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SparklesIcon, ChartIcon, LockIcon } from '@/components/PremiumIcons';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';

interface Recommendation {
    symbol: string;
    name: string;
    confidence: number;
    entryPrice: number;
    prediction: {
        direction: 'UP' | 'DOWN' | 'NEUTRAL';
        confidence: number;
        tradeSetup?: {
            tp: number;
            sl: number;
        }
    };
}

export default function AIStockPicks() {
    const { data: session } = useSession();
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPremium, setIsPremium] = useState(false);

    useEffect(() => {
        // Check membership
        /*
        // In a real app we'd check from session or API
        if (session?.user?.membership === 'PRO' || session?.user?.membership === 'VVIP') {
            setIsPremium(true);
        }
        */
        // For now, let's assume everyone can see it or we show a locked state for some
        setIsPremium(true);

        const fetchRecommendations = async () => {
            try {
                const res = await fetch('/api/stock/recommendations');
                const data = await res.json();
                if (data.status === 'success') {
                    setRecommendations(data.recommendations);
                }
            } catch (err) {
                console.error('Failed to fetch recommendations:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchRecommendations();
    }, [session]);

    if (loading) {
        return (
            <div className="mb-10 animate-pulse">
                <div className="h-8 w-48 bg-gray-200 rounded-lg mb-4"></div>
                <div className="flex gap-4 overflow-x-auto pb-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="min-w-[280px] h-40 bg-gray-100 rounded-xl"></div>
                    ))}
                </div>
            </div>
        );
    }

    const t = useTranslations('stockPicks');

    if (recommendations.length === 0) return null;

    return (
        <div className="mb-10">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <SparklesIcon className="text-amber-500" size="md" />
                        {t('title')}
                    </h2>
                    <p className="text-[var(--text-secondary)] text-sm mt-1">
                        {t('subtitle')} <span className="text-green-600 font-bold">{t('accuracy')}</span>.
                    </p>
                </div>
                {!isPremium && (
                    <div className="hidden md:flex items-center gap-2 text-xs font-semibold bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
                        <LockIcon size="sm" /> {t('premium')}
                    </div>
                )}
            </div>

            <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide snap-x">
                {recommendations.map((rec, index) => (
                    <motion.div
                        key={rec.symbol}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="min-w-[280px] bg-white rounded-2xl p-5 border border-[var(--border-light)] relative overflow-hidden shadow-sm hover:shadow-md transition-shadow snap-start"
                    >
                        {/* Background Effect */}
                        <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-50 -mr-4 -mt-4 ${rec.confidence > 0.75 ? 'bg-gradient-to-br from-green-200 to-transparent' : 'bg-gradient-to-br from-amber-100 to-transparent'
                            }`}></div>

                        <div className="relative z-10">
                            {rec.confidence > 0.75 && (
                                <div className="absolute top-0 right-0 -mr-5 -mt-5">
                                    <div className="bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                                        {t('highAccuracy').toUpperCase()}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                                        {rec.symbol}
                                        {rec.confidence > 0.8 && <SparklesIcon className="text-amber-500 w-4 h-4" />}
                                    </h3>
                                    <p className="text-xs text-[var(--text-secondary)] truncate w-32">{rec.name}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-[var(--text-muted)]">{t('confidence')}</div>
                                    <div className={`text-lg font-bold ${rec.confidence > 0.75 ? 'text-green-600' : 'text-amber-500'}`}>
                                        {(rec.confidence * 100).toFixed(1)}%
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-[var(--text-muted)]">{t('entry')}</span>
                                    <span className="font-semibold">Rp {rec.entryPrice?.toLocaleString('id-ID')}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-[var(--text-muted)]">{t('target')}</span>
                                    <span className="font-semibold text-green-600">
                                        Rp {rec.prediction.tradeSetup?.tp ? rec.prediction.tradeSetup.tp.toLocaleString('id-ID') : (rec.entryPrice * 1.05).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-[var(--text-muted)]">{t('stopLoss')}</span>
                                    <span className="font-semibold text-red-500">
                                        Rp {rec.prediction.tradeSetup?.sl ? rec.prediction.tradeSetup.sl.toLocaleString('id-ID') : (rec.entryPrice * 0.95).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-3 pt-3 border-t border-dashed border-gray-100">
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-400">{t('direction')}</span>
                                    <span className="font-bold text-green-600 flex items-center gap-1">
                                        <ChartIcon size="sm" /> UP
                                    </span>
                                </div>
                            </div>

                            <button
                                className="w-full mt-4 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--accent-blue)] hover:text-white text-[var(--text-secondary)] text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                                onClick={() => {
                                    const event = new CustomEvent('populateStock', { detail: rec.symbol });
                                    // @ts-ignore
                                    (window as any).dispatchEvent(event);
                                }}
                            >
                                <ChartIcon size="sm" />
                                {t('analyze')}
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
