'use client';

import { motion } from 'framer-motion';
import PremiumGuard from '@/components/layout/PremiumGuard';
import { useTranslations } from 'next-intl';

export default function AITradeDoctorPage() {
    const t = useTranslations('aiDoctor');

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pt-24 pb-12">
            <div className="container-apple">
                <PremiumGuard
                    title={t('title')}
                    description={t('description').replace(/<[^>]*>/g, '')}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-4xl mx-auto"
                    >
                        {/* Header */}
                        <div className="text-center mb-12">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold tracking-wide uppercase mb-4 inline-block">
                                {t('subtitle')}
                            </span>
                            <h1 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-4">
                                {t('title')} 🩺
                            </h1>
                            <p
                                className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto"
                                dangerouslySetInnerHTML={{ __html: t('description') }}
                            />
                        </div>

                        {/* Upload Area */}
                        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-2 border-[var(--border-light)] p-12 text-center mb-12 hover:border-blue-400 transition-colors cursor-pointer group">
                            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                                <svg className="w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold mb-2">{t('uploadTitle')}</h3>
                            <p className="text-[var(--text-muted)] text-sm mb-6">{t('uploadDesc')}</p>
                            <button className="btn-primary">
                                {t('selectFile')}
                            </button>
                        </div>

                        {/* Sample Diagnosis (Placeholders) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Card 1 */}
                            <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-900/30">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-red-700 dark:text-red-400">🚨 {t('criticalFlaw')}</h3>
                                    <span className="text-xs font-bold bg-red-200 text-red-800 px-2 py-1 rounded">{t('revengeTrading')}</span>
                                </div>
                                <p className="text-sm text-[var(--text-secondary)] mb-4">
                                    {t('revengeDesc')}
                                </p>
                                <div className="bg-white dark:bg-black/20 p-3 rounded-xl">
                                    <p className="text-xs font-mono text-[var(--text-muted)]">{t('prescription')}</p>
                                    <p className="text-sm font-semibold">{t('revengeFix')}</p>
                                </div>
                            </div>

                            {/* Card 2 */}
                            <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-900/30">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-green-700 dark:text-green-400">✨ {t('hiddenSuperpower')}</h3>
                                    <span className="text-xs font-bold bg-green-200 text-green-800 px-2 py-1 rounded">{t('londonSession')}</span>
                                </div>
                                <p className="text-sm text-[var(--text-secondary)] mb-4">
                                    {t('londonDesc')}
                                </p>
                                <div className="bg-white dark:bg-black/20 p-3 rounded-xl">
                                    <p className="text-xs font-mono text-[var(--text-muted)]">{t('prescription')}</p>
                                    <p className="text-sm font-semibold">{t('londonFix')}</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </PremiumGuard>
            </div>
        </div>
    );
}
