'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface ModelRank {
    model: string;
    accuracy: number;
    total: number;
    correct: number;
}

interface MLDashboardData {
    symbol: string;
    period: string;
    overview: {
        totalPredictions: number;
        accuracy: number;
        avgConfidence: number;
        maxWinStreak: number;
    };
    modelRanking: ModelRank[];
    directionPerformance: Record<string, { total: number; correct: number; accuracy: number }>;
    confidenceAnalysis: {
        avgConfidence: number;
        highConfidenceAccuracy: number;
        highConfidenceCount: number;
    };
    recentPredictions: Array<{
        id: number;
        direction: string;
        confidence: number;
        model: string;
        isCorrect: boolean;
        createdAt: string;
    }>;
}

export default function AdminMLDashboard() {
    const [data, setData] = useState<MLDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [symbol, setSymbol] = useState('BTCUSD');
    const [days, setDays] = useState(7);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/admin/ml-dashboard?symbol=${symbol}&days=${days}`);
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (error) {
                console.error('Failed to fetch ML dashboard:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [symbol, days]);

    if (loading) {
        return (
            <div className="bg-white rounded-2xl p-8 border border-gray-200">
                <div className="flex items-center justify-center h-64">
                    <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center text-gray-500">
                Failed to load ML dashboard data
            </div>
        );
    }

    const getAccuracyColor = (acc: number) => {
        if (acc >= 70) return 'text-green-600 bg-green-50';
        if (acc >= 50) return 'text-amber-600 bg-amber-50';
        return 'text-red-600 bg-red-50';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">🤖 ML Performance Dashboard</h2>
                    <div className="flex gap-2">
                        <select
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value)}
                            className="px-3 py-2 bg-gray-100 rounded-lg text-sm"
                        >
                            <option value="BTCUSD">BTCUSD</option>
                            <option value="XAUUSD">XAUUSD</option>
                        </select>
                        <select
                            value={days}
                            onChange={(e) => setDays(Number(e.target.value))}
                            className="px-3 py-2 bg-gray-100 rounded-lg text-sm"
                        >
                            <option value={1}>24h</option>
                            <option value={7}>7 Days</option>
                            <option value={30}>30 Days</option>
                        </select>
                    </div>
                </div>

                {/* Overview Stats */}
                <div className="grid grid-cols-4 gap-4">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-4 text-white"
                    >
                        <p className="text-3xl font-bold">{data.overview.totalPredictions}</p>
                        <p className="text-sm opacity-80">Total Predictions</p>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className={`rounded-xl p-4 ${getAccuracyColor(data.overview.accuracy)}`}
                    >
                        <p className="text-3xl font-bold">{data.overview.accuracy}%</p>
                        <p className="text-sm opacity-80">Accuracy</p>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-blue-50 text-blue-600 rounded-xl p-4"
                    >
                        <p className="text-3xl font-bold">{data.overview.avgConfidence}%</p>
                        <p className="text-sm opacity-80">Avg Confidence</p>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-green-50 text-green-600 rounded-xl p-4"
                    >
                        <p className="text-3xl font-bold">{data.overview.maxWinStreak}</p>
                        <p className="text-sm opacity-80">Max Win Streak</p>
                    </motion.div>
                </div>
            </div>

            {/* Model Ranking & Direction Performance */}
            <div className="grid grid-cols-2 gap-6">
                {/* Model Ranking */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-4">🏆 Model Ranking</h3>
                    <div className="space-y-3">
                        {data.modelRanking.map((model, idx) => (
                            <div key={model.model} className="flex items-center gap-3">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                                        idx === 1 ? 'bg-gray-300 text-gray-700' :
                                            idx === 2 ? 'bg-amber-600 text-white' :
                                                'bg-gray-100 text-gray-500'
                                    }`}>
                                    {idx + 1}
                                </span>
                                <span className="flex-1 font-medium text-gray-700">{model.model}</span>
                                <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-purple-500 rounded-full"
                                        style={{ width: `${model.accuracy * 100}%` }}
                                    />
                                </div>
                                <span className="w-16 text-right text-sm font-medium">
                                    {Math.round(model.accuracy * 100)}%
                                </span>
                                <span className="text-xs text-gray-400">
                                    ({model.correct}/{model.total})
                                </span>
                            </div>
                        ))}
                        {data.modelRanking.length === 0 && (
                            <p className="text-gray-400 text-center py-4">No model data yet</p>
                        )}
                    </div>
                </div>

                {/* Direction Performance */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-4">📊 Direction Accuracy</h3>
                    <div className="space-y-4">
                        {[
                            { dir: 'UP', color: '#22c55e', emoji: '↑' },
                            { dir: 'NEUTRAL', color: '#f59e0b', emoji: '→' },
                            { dir: 'DOWN', color: '#ef4444', emoji: '↓' }
                        ].map(({ dir, color, emoji }) => {
                            const perf = data.directionPerformance[dir] || { total: 0, correct: 0, accuracy: 0 };
                            return (
                                <div key={dir} className="flex items-center gap-3">
                                    <span className="text-2xl">{emoji}</span>
                                    <span className="w-20 font-medium" style={{ color }}>{dir}</span>
                                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full rounded-full"
                                            style={{ backgroundColor: color }}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(perf.accuracy || 0) * 100}%` }}
                                            transition={{ duration: 0.5 }}
                                        />
                                    </div>
                                    <span className="w-12 text-right font-bold">
                                        {Math.round((perf.accuracy || 0) * 100)}%
                                    </span>
                                    <span className="text-xs text-gray-400 w-16 text-right">
                                        {perf.correct}/{perf.total}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Confidence Analysis */}
                    <div className="mt-6 pt-4 border-t border-gray-100">
                        <h4 className="text-sm font-medium text-gray-600 mb-3">High Confidence Analysis (>70%)</h4>
                        <div className="grid grid-cols-2 gap-3 text-center">
                            <div className="bg-blue-50 rounded-lg p-3">
                                <p className="text-2xl font-bold text-blue-600">
                                    {data.confidenceAnalysis.highConfidenceAccuracy}%
                                </p>
                                <p className="text-xs text-blue-500">Accuracy</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-2xl font-bold text-gray-700">
                                    {data.confidenceAnalysis.highConfidenceCount}
                                </p>
                                <p className="text-xs text-gray-500">Predictions</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Predictions */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">📜 Recent Predictions</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-gray-500 border-b border-gray-100">
                                <th className="pb-2 font-medium">Direction</th>
                                <th className="pb-2 font-medium">Confidence</th>
                                <th className="pb-2 font-medium">Model</th>
                                <th className="pb-2 font-medium">Result</th>
                                <th className="pb-2 font-medium">Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.recentPredictions.map((pred) => (
                                <tr key={pred.id} className="border-b border-gray-50 hover:bg-gray-50">
                                    <td className="py-2">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${pred.direction === 'UP' ? 'bg-green-100 text-green-700' :
                                                pred.direction === 'DOWN' ? 'bg-red-100 text-red-700' :
                                                    'bg-amber-100 text-amber-700'
                                            }`}>
                                            {pred.direction}
                                        </span>
                                    </td>
                                    <td className="py-2">{pred.confidence}%</td>
                                    <td className="py-2 text-gray-600">{pred.model}</td>
                                    <td className="py-2">
                                        {pred.isCorrect !== undefined ? (
                                            pred.isCorrect ? (
                                                <span className="text-green-600">✓ Correct</span>
                                            ) : (
                                                <span className="text-red-600">✗ Wrong</span>
                                            )
                                        ) : (
                                            <span className="text-gray-400">Pending</span>
                                        )}
                                    </td>
                                    <td className="py-2 text-gray-400 text-xs">
                                        {new Date(pred.createdAt).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
