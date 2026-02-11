
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const CURRENCIES = [
    { code: 'USD', name: 'US Dollar', color: 'bg-green-500' },
    { code: 'EUR', name: 'Euro', color: 'bg-blue-500' },
    { code: 'GBP', name: 'British Pound', color: 'bg-purple-500' },
    { code: 'JPY', name: 'Japanese Yen', color: 'bg-red-500' },
    { code: 'AUD', name: 'Australian Dollar', color: 'bg-yellow-500' },
    { code: 'CAD', name: 'Canadian Dollar', color: 'bg-teal-500' },
    { code: 'CHF', name: 'Swiss Franc', color: 'bg-orange-500' },
    { code: 'NZD', name: 'New Zealand Dollar', color: 'bg-indigo-500' },
];

export default function CurrencyStrength() {
    const [strengths, setStrengths] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate Logic: In a real app, this would calculate from pairs (e.g. EURUSD, GBPUSD)
        // For now, we simulate "live" movement
        const updateStrengths = () => {
            const newStrengths: Record<string, number> = {};
            CURRENCIES.forEach(c => {
                // Random strength 1-10
                newStrengths[c.code] = Math.floor(Math.random() * 9) + 1;
            });
            setStrengths(newStrengths);
            setLoading(false);
        };

        updateStrengths();
        const interval = setInterval(updateStrengths, 5000); // Update every 5s
        return () => clearInterval(interval);
    }, []);

    const maxStrength = 10;

    return (
        <div className="bg-white p-6 rounded-2xl border border-[var(--border-light)] shadow-sm h-full">
            <h3 className="font-semibold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                <span>📊</span> Currency Strength Meter
                <span className="text-xs font-normal text-gray-500 ml-auto">Real-time Power</span>
            </h3>

            <div className="space-y-4">
                {CURRENCIES.map((currency) => {
                    const strength = strengths[currency.code] || 0;
                    const percentage = (strength / maxStrength) * 100;

                    return (
                        <div key={currency.code} className="flex items-center gap-4">
                            <div className="w-8 font-bold text-sm text-[var(--text-secondary)]">
                                {currency.code}
                            </div>
                            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden relative">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentage}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className={`h-full rounded-full ${currency.color} opacity-80`}
                                />
                            </div>
                            <div className="w-6 text-right text-xs font-mono font-medium text-[var(--text-primary)]">
                                {strength.toFixed(1)}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between text-xs text-gray-400">
                <span>Weak</span>
                <span>Strong</span>
            </div>
        </div>
    );
}
