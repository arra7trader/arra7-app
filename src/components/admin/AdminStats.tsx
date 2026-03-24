'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface Stats {
    total: number;
    basic: number;
    pro: number;
    vvip: number;
}

function AnimatedNumber({ value, delay = 0 }: { value: number; delay?: number }) {
    const [displayed, setDisplayed] = useState(0);

    useEffect(() => {
        const timeout = setTimeout(() => {
            let start = 0;
            const end = value;
            if (end === 0) { setDisplayed(0); return; }
            const duration = 800;
            const stepTime = Math.max(Math.floor(duration / end), 10);
            const timer = setInterval(() => {
                start += Math.ceil(end / (duration / stepTime));
                if (start >= end) {
                    setDisplayed(end);
                    clearInterval(timer);
                } else {
                    setDisplayed(start);
                }
            }, stepTime);
            return () => clearInterval(timer);
        }, delay);
        return () => clearTimeout(timeout);
    }, [value, delay]);

    return <span>{displayed}</span>;
}

const statCards = [
    {
        key: 'total' as const,
        label: 'Total Users',
        icon: '👥',
        gradient: 'from-slate-500/20 to-slate-600/10',
        glowClass: 'glow-blue',
        textColor: 'text-[#F8FAFC]',
        labelColor: 'text-[#94A3B8]',
    },
    {
        key: 'basic' as const,
        label: 'Basic Members',
        icon: '📘',
        gradient: 'from-cyan-500/20 to-cyan-600/10',
        glowClass: 'glow-cyan',
        textColor: 'text-[#22D3EE]',
        labelColor: 'text-[#67E8F9]',
    },
    {
        key: 'pro' as const,
        label: 'PRO Members',
        icon: '⚡',
        gradient: 'from-blue-500/20 to-blue-600/10',
        glowClass: 'glow-blue',
        textColor: 'text-[#60A5FA]',
        labelColor: 'text-[#93C5FD]',
    },
    {
        key: 'vvip' as const,
        label: 'VVIP Members',
        icon: '👑',
        gradient: 'from-amber-500/20 to-amber-600/10',
        glowClass: 'glow-amber',
        textColor: 'text-[#FBBF24]',
        labelColor: 'text-[#FCD34D]',
    },
];

export default function AdminStats({ stats }: { stats: Stats }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8 mt-6">
            {statCards.map((card, index) => (
                <motion.div
                    key={card.key}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                    className={`glass-card ${card.glowClass} relative overflow-hidden p-7`}
                >
                    {/* Gradient background overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} pointer-events-none`} />

                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <span className={`uppercase tracking-[1.5px] ${card.labelColor} font-semibold text-xs`}>
                                {card.label}
                            </span>
                            <span className="text-2xl opacity-80">{card.icon}</span>
                        </div>
                        <div className={`${card.textColor} font-bold text-4xl md:text-5xl tracking-tight`}>
                            <AnimatedNumber value={stats[card.key]} delay={index * 100} />
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
