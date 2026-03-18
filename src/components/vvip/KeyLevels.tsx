
'use client';

import { useState, useEffect } from 'react';

const PIVOT_DATA = [
    { label: 'R3', price: '2045.20', type: 'res' },
    { label: 'R2', price: '2038.50', type: 'res' },
    { label: 'R1', price: '2032.10', type: 'res' },
    { label: 'PIVOT', price: '2025.00', type: 'neutral' },
    { label: 'S1', price: '2018.80', type: 'sup' },
    { label: 'S2', price: '2012.40', type: 'sup' },
    { label: 'S3', price: '2005.60', type: 'sup' },
];

export default function KeyLevels() {
    const [levels, setLevels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLevels = async () => {
            try {
                const res = await fetch('/api/vvip/analytics');
                if (res.ok) {
                    const data = await res.json();
                    const L = data.levels;
                    if (L) {
                        setLevels([
                            { label: 'R3', price: L.r3.toFixed(2), type: 'res' },
                            { label: 'R2', price: L.r2.toFixed(2), type: 'res' },
                            { label: 'R1', price: L.r1.toFixed(2), type: 'res' },
                            { label: 'PIVOT', price: L.pivot.toFixed(2), type: 'neutral' },
                            { label: 'S1', price: L.s1.toFixed(2), type: 'sup' },
                            { label: 'S2', price: L.s2.toFixed(2), type: 'sup' },
                            { label: 'S3', price: L.s3.toFixed(2), type: 'sup' },
                        ]);
                    }
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        fetchLevels();
    }, []);

    if (loading) return <div className="p-6 bg-[var(--bg-primary)] rounded-2xl animate-pulse h-full">Loading Levels...</div>;

    return (
        <div className="bg-[var(--bg-primary)] p-6 rounded-2xl border border-[var(--border-light)] shadow-sm h-full">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <span>🔑</span> Key Levels (Live)
                </h3>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold">Today</span>
            </div>

            <div className="space-y-3">
                {levels.length > 0 ? levels.map((level) => (
                    <div
                        key={level.label}
                        className={`flex items-center justify-between p-3 rounded-lg border ${level.type === 'res' ? 'bg-red-50 border-red-100 text-red-700' :
                            level.type === 'sup' ? 'bg-green-50 border-green-100 text-green-700' :
                                'bg-[var(--bg-secondary)] border-[var(--border-light)] text-[var(--text-primary)] font-bold'
                            }`}
                    >
                        <span className="font-mono font-semibold text-sm">{level.label}</span>
                        <span className="font-mono font-bold tracking-tight">{level.price}</span>
                    </div>
                )) : (
                    <div className="text-center text-gray-400 py-4">Data Unavailable</div>
                )}
            </div>

            <div className="mt-6 p-3 bg-blue-50 rounded-lg text-xs text-blue-700 leading-relaxed border border-blue-100">
                <strong>Strategy:</strong> Watch for reversals at S1/R1. Breakout above R2 suggests strong bullish trend.
            </div>
        </div>
    );
}
