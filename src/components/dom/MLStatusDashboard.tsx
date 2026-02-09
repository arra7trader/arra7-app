'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface ModelStats {
    name: string;
    accuracy: number;
    total: number;
    correct: number;
    weight: number;
}

interface MLStatus {
    available: boolean;
    models_loaded: number;
    symbols: string[];
    default_model: string;
    performance?: {
        [model: string]: ModelStats;
    };
}

export default function MLStatusDashboard() {
    const [status, setStatus] = useState<MLStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch('/api/ml/status');
                if (res.ok) {
                    const data = await res.json();
                    setStatus(data);
                } else {
                    setError('ML backend tidak tersedia');
                }
            } catch (err) {
                setError('Gagal koneksi ke ML backend');
            } finally {
                setLoading(false);
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="bg-white rounded-2xl p-6 border border-[var(--border-light)]">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
                    🤖 ML Model Status
                </h3>
                <div className="flex items-center justify-center h-32">
                    <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    if (error || !status) {
        return (
            <div className="bg-white rounded-2xl p-6 border border-[var(--border-light)]">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
                    🤖 ML Model Status
                </h3>
                <div className="text-center py-4">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                        <span className="text-2xl">⚠️</span>
                    </div>
                    <p className="text-sm text-[var(--text-muted)]">{error || 'Status tidak tersedia'}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                        Menggunakan heuristic fallback
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl p-6 border border-[var(--border-light)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                🤖 ML Model Status
                <span className={`ml-auto text-xs px-2 py-1 rounded-full ${status.available
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                    {status.available ? '🟢 Online' : '🔴 Offline'}
                </span>
            </h3>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-purple-600">{status.models_loaded}</p>
                    <p className="text-xs text-[var(--text-muted)]">Models Loaded</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">{status.symbols.length}</p>
                    <p className="text-xs text-[var(--text-muted)]">Symbols</p>
                </div>
            </div>

            {/* Model Performance */}
            {status.performance && Object.keys(status.performance).length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">
                        Model Performance
                    </p>
                    {Object.entries(status.performance).map(([name, stats]) => (
                        <motion.div
                            key={name}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-2"
                        >
                            <span className="w-16 text-xs font-medium text-[var(--text-primary)]">
                                {name}
                            </span>
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full rounded-full"
                                    style={{
                                        backgroundColor: stats.accuracy > 0.7 ? '#22c55e' :
                                            stats.accuracy > 0.5 ? '#f59e0b' : '#ef4444',
                                        width: `${stats.accuracy * 100}%`
                                    }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${stats.accuracy * 100}%` }}
                                    transition={{ duration: 0.5 }}
                                />
                            </div>
                            <span className="w-12 text-xs text-right text-[var(--text-muted)]">
                                {Math.round(stats.accuracy * 100)}%
                            </span>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Default Model */}
            <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-muted)]">Default Model:</span>
                    <span className="font-medium text-[var(--text-primary)]">
                        {status.default_model}
                    </span>
                </div>
            </div>
        </div>
    );
}
