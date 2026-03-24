
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
        const fetchStrength = async () => {
            try {
                const res = await fetch('/api/vvip/analytics');
                if (!res.ok) throw new Error('API Error');
                const data = await res.json();

                // Scale strength for visualization (0-2 range -> 0-10 range roughly)
                // Real percentage changes are small (e.g. 0.5%), so we scale them up
                const scaled: Record<string, number> = {};
                if (data.strength) {
                    Object.entries(data.strength).forEach(([code, val]) => {
                        // @ts-ignore
                        const numVal = typeof val === 'number' ? val : 0;
                        // Map -1% to 1% range to 0-10 score. 0% = 5 score.
                        // val is percent change. e.g. 0.25
                        let score = 5 + (numVal * 5);
                        score = Math.max(1, Math.min(10, score));
                        scaled[code] = score;
                    });
                    setStrengths(scaled);
                }
            } catch (err) {
                console.error('Failed to fetch strength:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchStrength();
        const interval = setInterval(fetchStrength, 10000); // 10s refresh
        return () => clearInterval(interval);
    }, []);

    const maxStrength = 10;

    return (
        <div className="bg-[var(--bg-primary)] p-6 rounded-2xl border border-[var(--border-light)] shadow-sm h-full">
            <h3 className="font-semibold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                <span>📊</span> Currency Strength Meter
                <span className="text-xs font-normal text-[var(--text-secondary)] ml-auto">Real-time Power</span>
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
                            <div className="flex-1 h-3 bg-[var(--bg-secondary)] rounded-full overflow-hidden relative">
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

            <div className="mt-6 pt-4 border-t border-[var(--border-light)] flex justify-between text-xs text-slate-400">
                <span>Weak</span>
                <span>Strong</span>
            </div>
        </div>
    );
}
