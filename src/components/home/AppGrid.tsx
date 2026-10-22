'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useState } from 'react';
import {
    BrainIcon,
    ChartIcon,
    FireIcon,
    AcademicCapIcon,
    CrosshairIcon,
} from '@/components/PremiumIcons';
import MaintenanceModal from '@/components/MaintenanceModal';

export default function AppGrid() {
    const [maintenanceModal, setMaintenanceModal] = useState({ isOpen: false, featureName: '' });

    const apps = [
        {
            id: 'neural-lab',
            label: 'PICA Neural Lab',
            sublabel: 'Bi-LSTM + Institutional SMC',
            badge: 'SMC + AI',
            badgeColor: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white',
            icon: <BrainIcon size="lg" className="text-blue-600" />,
            href: '/xauusd-neural-lab',
            color: 'bg-blue-100/80 border-blue-300/80',
            highlight: true,
        },
        {
            id: 'crypto-hunter',
            label: 'Crypto Hunter',
            sublabel: 'OG Smart Money Scanner',
            badge: 'NEW 🔥',
            badgeColor: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white',
            icon: <CrosshairIcon size="lg" className="text-emerald-600" />,
            href: '/crypto-hunter',
            color: 'bg-emerald-100/80 border-emerald-300/80',
            highlight: true,
        },
        {
            id: 'kursus-fibo',
            label: 'Kursus Fibo Kyoko',
            sublabel: '3 Video HD + MT5 + PineScript',
            badge: 'MASTERCLASS',
            badgeColor: 'bg-indigo-600 text-white',
            icon: <AcademicCapIcon size="lg" className="text-indigo-600" />,
            href: '/kursus-fibo-kyoko',
            color: 'bg-indigo-50 border-indigo-200',
            highlight: true,
        },
        {
            id: 'dom-arra',
            label: 'DOM ARRA',
            sublabel: 'Order Flow & Whale Radar',
            badge: 'ORDER FLOW',
            badgeColor: 'bg-amber-100 text-amber-800 border border-amber-300',
            icon: <FireIcon size="lg" className="text-amber-600" />,
            href: '/dom-arra',
            color: 'bg-amber-50 border-amber-200',
        },
        {
            id: 'analisa-market',
            label: 'Analisis Market',
            sublabel: 'Quant AI Forex & Saham',
            badge: 'QUANT AI',
            badgeColor: 'bg-blue-100 text-blue-700 border border-blue-200',
            icon: <ChartIcon size="lg" className="text-blue-600" />,
            href: '/analisa-market',
            color: 'bg-blue-50 border-blue-200',
        },
    ];

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="w-full max-w-5xl mx-auto mt-6"
            >
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 p-5 sm:p-6 bg-white/95 backdrop-blur-xl rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/60">
                    {apps.map((app) => (
                        <Link key={app.id} href={app.href} className="group">
                            <motion.div
                                whileHover={{ scale: 1.03, y: -2 }}
                                whileTap={{ scale: 0.97 }}
                                className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl transition-all duration-300 relative border ${
                                    app.highlight
                                        ? 'bg-blue-50/60 border-blue-300 shadow-sm'
                                        : 'bg-slate-50/80 hover:bg-white border-slate-200/70 hover:border-slate-300 shadow-xs'
                                }`}
                            >
                                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${app.color} border flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform`}>
                                    {app.icon}
                                </div>
                                <span className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-blue-600 text-center line-clamp-1 transition-colors">
                                    {app.label}
                                </span>
                                <span className="text-[10px] text-slate-500 text-center line-clamp-1 mt-0.5 hidden sm:block">
                                    {app.sublabel}
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
