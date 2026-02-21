'use client';

import { motion } from 'framer-motion';
import PremiumGuard from '@/components/layout/PremiumGuard';
import { useTranslations } from 'next-intl';

export default function SentimentSnifferPage() {
    const t = useTranslations('sentiment');

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pt-36 pb-12">
            <div className="container-apple">
                <PremiumGuard
                    title={t('title')}
                    description={t('subtitle')}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-6xl mx-auto"
                    >
                        {/* Header */}
                        <div className="flex flex-col md:flex-row items-end justify-between mb-8 gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                                    {t('title')} 📡
                                </h1>
                                <p className="text-[var(--text-secondary)]">{t('subtitle')}</p>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-green-500 bg-green-50 px-3 py-1 rounded-full">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                {t('liveStream')}
                            </div>
                        </div>

                        {/* Top Section: Gauges */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            {/* Gauge USD */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-[var(--border-light)] shadow-sm">
                                <h3 className="text-sm font-bold text-[var(--text-muted)] mb-2">{t('usdSentiment')}</h3>
                                <div className="text-4xl font-bold text-green-600 mb-1">{t('strongBullish')}</div>
                                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                                </div>
                                <p className="text-xs text-[var(--text-secondary)]">{t('drivenBy')} <span className="font-semibold">NFP Expectation</span></p>
                            </div>

                            {/* Gauge GOLD */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-[var(--border-light)] shadow-sm">
                                <h3 className="text-sm font-bold text-[var(--text-muted)] mb-2">{t('goldSentiment')}</h3>
                                <div className="text-4xl font-bold text-red-600 mb-1">{t('bearish')}</div>
                                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                    <div className="bg-red-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                                </div>
                                <p className="text-xs text-[var(--text-secondary)]">{t('drivenBy')} <span className="font-semibold">Strong Dollar</span></p>
                            </div>

                            {/* Gauge RISK */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-[var(--border-light)] shadow-sm">
                                <h3 className="text-sm font-bold text-[var(--text-muted)] mb-2">{t('marketMood')}</h3>
                                <div className="text-4xl font-bold text-amber-500 mb-1">{t('riskOff')}</div>
                                <p className="text-sm mt-3 text-[var(--text-secondary)]">
                                    {t('riskOffDesc')}
                                </p>
                            </div>
                        </div>

                        {/* Bottom Section: News Feed */}
                        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-[var(--border-light)] overflow-hidden">
                            <div className="p-6 border-b border-[var(--border-light)] flex justify-between items-center">
                                <h3 className="font-bold">{t('newsFeed')}</h3>
                                <div className="flex gap-2">
                                    <button className="px-3 py-1 text-xs font-bold bg-blue-100 text-blue-700 rounded-lg">{t('all')}</button>
                                    <button className="px-3 py-1 text-xs font-bold text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] rounded-lg">{t('highImpact')}</button>
                                </div>
                            </div>
                            <div className="divide-y divide-[var(--border-light)]">
                                {/* News Item 1 */}
                                <div className="p-4 hover:bg-[var(--bg-secondary)] transition-colors flex gap-4">
                                    <div className="w-16 text-xs text-[var(--text-muted)] font-mono pt-1">Just Now</div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded uppercase">USD High Impact</span>
                                            <span className="font-semibold text-[var(--text-primary)]">Fed Chair Powell Hints at Rate Hikes</span>
                                        </div>
                                        <p className="text-sm text-[var(--text-secondary)]">
                                            "Inflation remains sticky," Powell states in latest press conference. Market pricing in a 50bps hike for next meeting significantly increased.
                                        </p>
                                        <div className="mt-2 flex gap-2">
                                            <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded">Source: Bloomberg Terminal</span>
                                            <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded">AI Sentiment: -0.8 (Negative)</span>
                                        </div>
                                    </div>
                                </div>

                                {/* News Item 2 */}
                                <div className="p-4 hover:bg-[var(--bg-secondary)] transition-colors flex gap-4">
                                    <div className="w-16 text-xs text-[var(--text-muted)] font-mono pt-1">2m ago</div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase">BTC Bullish</span>
                                            <span className="font-semibold text-[var(--text-primary)]">Bitcoin Spot ETF Volumes Spike</span>
                                        </div>
                                        <p className="text-sm text-[var(--text-secondary)]">
                                            BlackRock report shows record inflow into IBIT. Institutional interest returning despite macro headwinds.
                                        </p>
                                    </div>
                                </div>

                                {/* News Item 3 */}
                                <div className="p-4 hover:bg-[var(--bg-secondary)] transition-colors flex gap-4">
                                    <div className="w-16 text-xs text-[var(--text-muted)] font-mono pt-1">5m ago</div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-bold rounded uppercase">EUR Neutral</span>
                                            <span className="font-semibold text-[var(--text-primary)]">ECB Consumer Expectations Survey Released</span>
                                        </div>
                                        <p className="text-sm text-[var(--text-secondary)]">
                                            Inflation expectations unchanged at 2.4% for the next 12 months.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </PremiumGuard>
            </div>
        </div>
    );
}
