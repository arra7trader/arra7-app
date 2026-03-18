
import React from 'react';

interface Stats {
    total: number;
    basic: number;
    pro: number;
    vvip: number;
}

export default function AdminStats({ stats }: { stats: Stats }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-[var(--bg-primary)] rounded-xl p-4 border border-[var(--border-light)]">
                <p className="text-sm text-[var(--text-muted)]">Total Users</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</p>
            </div>
            <div className="bg-[var(--bg-primary)] rounded-xl p-4 border border-[var(--border-light)]">
                <p className="text-sm text-[var(--text-muted)]">Basic</p>
                <p className="text-2xl font-bold text-[var(--text-secondary)]">{stats.basic}</p>
            </div>
            <div className="bg-[var(--bg-primary)] rounded-xl p-4 border border-[var(--border-light)]">
                <p className="text-sm text-[var(--text-muted)]">Pro</p>
                <p className="text-2xl font-bold text-blue-600">{stats.pro}</p>
            </div>
            <div className="bg-[var(--bg-primary)] rounded-xl p-4 border border-[var(--border-light)]">
                <p className="text-sm text-[var(--text-muted)]">VVIP</p>
                <p className="text-2xl font-bold text-amber-600">{stats.vvip}</p>
            </div>
        </div>
    );
}
