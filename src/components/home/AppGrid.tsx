'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import {
    ChartBarIcon,
    PresentationChartLineIcon,
    FireIcon,
    UserGroupIcon,
    BookOpenIcon,
    BriefcaseIcon,
    NewspaperIcon,
    HeartIcon,
    CurrencyYenIcon,
    WifiIcon
} from '@heroicons/react/24/solid';
import MaintenanceModal from '@/components/MaintenanceModal';

export default function AppGrid() {
    const tNav = useTranslations('nav');
    const tAI = useTranslations('aiDoctor');
    const tSent = useTranslations('sentiment');

    const [maintenanceModal, setMaintenanceModal] = useState({ isOpen: false, featureName: '' });

    const apps = [
        {
            id: 'bookmap',
            label: tNav('bookmap'),
            icon: <FireIcon className="w-8 h-8 text-amber-500" />,
            href: '/dom-arra',
            color: 'bg-amber-500/10 border-amber-500/20 group-hover:bg-amber-500/10 border-amber-500/20',
        },
        {
            id: 'forex',
            label: tNav('analisaMarket'),
            icon: <PresentationChartLineIcon className="w-8 h-8 text-blue-500" />,
            href: '/analisa-market',
            color: 'bg-blue-500/10 border-blue-500/20 group-hover:bg-blue-500/10 border-blue-500/20',
        },
        {
            id: 'stock',
            label: tNav('analisaSaham'),
            icon: <ChartBarIcon className="w-8 h-8 text-green-500" />,
            href: '/analisa-saham',
            color: 'bg-green-500/10 border-green-500/20 group-hover:bg-green-500/10 border-green-500/20',
        },
        {
            id: 'doctor',
            label: "AI Doctor",
            subLabel: tAI('title'),
            icon: <HeartIcon className="w-8 h-8 text-rose-500" />,
            href: '/ai-trade-doctor',
            color: 'bg-rose-500/10 border-rose-500/20 group-hover:bg-rose-500/10 border-rose-500/20',
        },
        {
            id: 'sentiment',
            label: "Sentiment",
            subLabel: tSent('title'),
            icon: <NewspaperIcon className="w-8 h-8 text-purple-500" />,
            href: '/sentiment-sniffer',
            color: 'bg-purple-500/10 border-purple-500/20 group-hover:bg-purple-500/10 border-purple-500/20',
        },
        {
            id: 'kanji',
            label: "Fibonacci Kanji",
            icon: <CurrencyYenIcon className="w-8 h-8 text-red-400" />,
            href: '/fibonacci-kanji',
            color: 'bg-red-500/10 border-red-500/20 group-hover:bg-red-500/10 border-red-500/20',
            isNew: true,
        },
        {
            id: 'journal',
            label: tNav('tradeJournal'),
            icon: <BookOpenIcon className="w-8 h-8 text-cyan-500" />,
            href: '/journal',
            color: 'bg-cyan-50 group-hover:bg-cyan-100',
        },
        {
            id: 'portfolio',
            label: tNav('portfolio'),
            icon: <BriefcaseIcon className="w-8 h-8 text-indigo-500" />,
            href: '/portfolio',
            color: 'bg-indigo-500/10 border-indigo-500/20 group-hover:bg-indigo-500/10 border-indigo-500/20',
        },
        {
            id: 'copytrade-arra77',
            label: 'Copytrade ARRA77',
            icon: <WifiIcon className="w-8 h-8 text-emerald-500" />,
            href: '/copytrade-arra77',
            color: 'bg-emerald-500/10 border-emerald-500/20 group-hover:bg-emerald-500/10 border-emerald-500/20',
            isNew: true,
        },
        {
            id: 'social',
            label: tNav('socialFeed'),
            icon: <UserGroupIcon className="w-8 h-8 text-teal-500" />,
            href: '/social',
            color: 'bg-teal-50 group-hover:bg-teal-100',
        },
    ];

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="w-full max-w-4xl mx-auto mt-10"
            >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 p-6 bg-[var(--bg-primary)]/50 dark:bg-black/20 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl">
                    {apps.map((app) => (
                        <Link key={app.id} href={app.href} className="group">
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-300 relative"
                            >
                                <div className={`w-16 h-16 rounded-2xl ${app.color} flex items-center justify-center mb-3 shadow-md group-hover:shadow-lg transition-all`}>
                                    {app.icon}
                                </div>
                                <span className="text-sm font-semibold text-[var(--text-primary)] text-center line-clamp-1">
                                    {app.label}
                                </span>
                                {app.isNew && (
                                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg animate-pulse">
                                        NEW
                                    </span>
                                )}
                            </motion.div>
                        </Link>
                    ))}
                </div>
            </motion.div>

            {/* Maintenance Modal (kept for future use) */}
            <MaintenanceModal
                isOpen={maintenanceModal.isOpen}
                onClose={() => setMaintenanceModal({ isOpen: false, featureName: '' })}
                featureName={maintenanceModal.featureName}
            />
        </>
    );
}
