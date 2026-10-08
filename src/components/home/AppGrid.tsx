'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import {
    ChartBarIcon,
    PresentationChartLineIcon,
    FireIcon,
    BookOpenIcon,
    BriefcaseIcon,
    NewspaperIcon,
    HeartIcon,
    BeakerIcon
} from '@heroicons/react/24/solid';
import MaintenanceModal from '@/components/MaintenanceModal';

export default function AppGrid() {
    const tNav = useTranslations('nav');
    const tAI = useTranslations('aiDoctor');
    const tSent = useTranslations('sentiment');

    const [maintenanceModal, setMaintenanceModal] = useState({ isOpen: false, featureName: '' });

    const apps = [
        {
            id: 'neural-lab',
            label: 'PICA Neural Lab',
            badge: 'FLAGSHIP AI',
            badgeColor: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
            icon: <BeakerIcon className="w-8 h-8 text-blue-600" />,
            href: '/xauusd-neural-lab',
            color: 'bg-blue-100/80 border-blue-300/80',
            highlight: true,
        },
        {
            id: 'forex',
            label: tNav('analisaMarket'),
            icon: <PresentationChartLineIcon className="w-8 h-8 text-blue-600" />,
            href: '/analisa-market',
            color: 'bg-blue-50 border-blue-200',
        },
        {
            id: 'bookmap',
            label: 'Bookmap PICA',
            badge: 'LIVE DOM',
            badgeColor: 'bg-amber-100 text-amber-800 border border-amber-300',
            icon: <FireIcon className="w-8 h-8 text-amber-600" />,
            href: '/dom-arra',
            color: 'bg-amber-50 border-amber-200',
        },
        {
            id: 'stock',
            label: tNav('analisaSaham'),
            icon: <ChartBarIcon className="w-8 h-8 text-emerald-600" />,
            href: '/analisa-saham',
            color: 'bg-emerald-50 border-emerald-200',
        },
        {
            id: 'doctor',
            label: "AI Trade Doctor",
            subLabel: tAI('title'),
            icon: <HeartIcon className="w-8 h-8 text-rose-500" />,
            href: '/ai-trade-doctor',
            color: 'bg-rose-50 border-rose-200',
        },
        {
            id: 'sentiment',
            label: "Sentiment AI",
            subLabel: tSent('title'),
            icon: <NewspaperIcon className="w-8 h-8 text-purple-600" />,
            href: '/sentiment-sniffer',
            color: 'bg-purple-50 border-purple-200',
        },
        {
            id: 'journal',
            label: tNav('tradeJournal'),
            icon: <BookOpenIcon className="w-8 h-8 text-cyan-600" />,
            href: '/journal',
            color: 'bg-cyan-50 border-cyan-200',
        },
        {
            id: 'portfolio',
            label: tNav('portfolio'),
            icon: <BriefcaseIcon className="w-8 h-8 text-indigo-600" />,
            href: '/portfolio',
            color: 'bg-indigo-50 border-indigo-200',
        },
    ];

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="w-full max-w-4xl mx-auto mt-6"
            >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 p-5 sm:p-6 bg-white/95 backdrop-blur-xl rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/60">
                    {apps.map((app) => (
                        <Link key={app.id} href={app.href} className="group">
                            <motion.div
                                whileHover={{ scale: 1.03, y: -2 }}
                                whileTap={{ scale: 0.97 }}
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-300 relative border ${
                                    app.highlight
                                        ? 'bg-blue-50/60 border-blue-300 shadow-sm'
                                        : 'bg-slate-50/80 hover:bg-white border-slate-200/70 hover:border-slate-300 shadow-xs'
                                }`}
                            >
                                <div className={`w-14 h-14 rounded-2xl ${app.color} border flex items-center justify-center mb-2.5 shadow-xs group-hover:scale-105 transition-transform`}>
                                    {app.icon}
                                </div>
                                <span className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-blue-600 text-center line-clamp-1 transition-colors">
                                    {app.label}
                                </span>
                                {app.badge && (
                                    <span className={`absolute -top-1.5 -right-1 text-[9px] font-bold px-2 py-0.5 rounded-full shadow-xs ${app.badgeColor}`}>
                                        {app.badge}
                                    </span>
                                )}
                            </motion.div>
                        </Link>
                    ))}
                </div>
            </motion.div>

            {/* Maintenance Modal */}
            <MaintenanceModal
                isOpen={maintenanceModal.isOpen}
                onClose={() => setMaintenanceModal({ isOpen: false, featureName: '' })}
                featureName={maintenanceModal.featureName}
            />
        </>
    );
}
