'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { MLPrediction } from '@/types/ml-prediction';

interface AccuracyRecord {
    id?: number;
    timestamp: number;
    prediction: MLPrediction;
    actualDirection: -1 | 0 | 1;
    isCorrect: boolean;
}

interface AccuracyStats {
    total: number;
    correct: number;
    accuracy: number;
    byDirection: {
        up: { total: number; correct: number; accuracy: number };
        down: { total: number; correct: number; accuracy: number };
        neutral: { total: number; correct: number; accuracy: number };
    };
    last20: number;
}

interface PendingPrediction {
    id: number;
    initialPrice: number;
    prediction: MLPrediction;
    timestamp: number;
}

// Hook for tracking prediction accuracy with Turso persistence
export function useAccuracyTracker(symbol: string = 'BTCUSD') {
    const [records, setRecords] = useState<AccuracyRecord[]>([]);
    const [pendingPredictions, setPendingPredictions] = useState<PendingPrediction[]>([]);
    const [dbStats, setDbStats] = useState<AccuracyStats | null>(null);
    const getCurrentPriceRef = useRef<(() => number) | null>(null);
    // Use ref to track pending predictions - prevents closure issues in setTimeout callbacks
    const pendingPredictionsRef = useRef<PendingPrediction[]>([]);

    // Keep ref in sync with state
    useEffect(() => {
        pendingPredictionsRef.current = pendingPredictions;
    }, [pendingPredictions]);

    // Set price getter function
    const setGetCurrentPrice = useCallback((fn: () => number) => {
        getCurrentPriceRef.current = fn;
    }, []);


    // Load stats from database on mount
    useEffect(() => {
        const loadStats = async () => {
            try {
                const res = await fetch(`/api/ml/track?symbol=${symbol}&days=7&type=stats`);
                if (res.ok) {
                    const data = await res.json();
                    setDbStats({
                        total: data.total || 0,
                        correct: data.correct || 0,
                        accuracy: data.accuracy || 0,
                        byDirection: {
                            up: data.byDirection?.UP || { total: 0, correct: 0, accuracy: 0 },
                            down: data.byDirection?.DOWN || { total: 0, correct: 0, accuracy: 0 },
                            neutral: data.byDirection?.NEUTRAL || { total: 0, correct: 0, accuracy: 0 }
                        },
                        last20: 0
                    });
                }
            } catch (error) {
                console.error('Failed to load accuracy stats:', error);
            }
        };
        loadStats();
    }, [symbol]);

    // Track a new prediction - save to Turso
    const trackPrediction = useCallback(async (prediction: MLPrediction, currentPrice: number) => {
        const timestamp = Date.now();

        try {
            // Save to database
            const res = await fetch('/api/ml/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save',
                    prediction: {
                        symbol: prediction.symbol,
                        horizon: prediction.horizon,
                        direction: prediction.direction,
                        direction_code: prediction.direction_code,
                        confidence: prediction.confidence,
                        model_used: prediction.model_used,
                        initial_price: currentPrice
                    }
                })
            });

            if (res.ok) {
                const { id } = await res.json();

                // Add to pending for verification
                setPendingPredictions(prev => [...prev, {
                    id,
                    initialPrice: currentPrice,
                    prediction,
                    timestamp
                }]);

                // Schedule auto-verification after horizon
                const horizonMs = prediction.horizon * 1000;
                setTimeout(() => {
                    verifyPendingPrediction(id);
                }, horizonMs);
            }
        } catch (error) {
            console.error('Failed to track prediction:', error);
        }
    }, []);

    // Verify a pending prediction - uses ref to prevent stale closure issues
    const verifyPendingPrediction = useCallback(async (predictionId: number) => {
        // Use ref for fresh data (prevents stale closure in setTimeout)
        const pending = pendingPredictionsRef.current.find(p => p.id === predictionId);
        if (!pending) return;

        // Get current price
        const currentPrice = getCurrentPriceRef.current?.() || 0;
        if (currentPrice === 0) return;

        try {
            // Verify in database
            await fetch('/api/ml/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'verify',
                    predictionId,
                    actualPrice: currentPrice
                })
            });

            // Calculate result locally for immediate UI update
            const priceChange = currentPrice - pending.initialPrice;
            const priceChangePct = (priceChange / pending.initialPrice) * 10000;

            let actualDirection: -1 | 0 | 1;
            if (priceChangePct > 1) actualDirection = 1;
            else if (priceChangePct < -1) actualDirection = -1;
            else actualDirection = 0;

            const isCorrect = pending.prediction.direction_code === actualDirection;

            // Add to local records
            setRecords(prev => [{
                id: predictionId,
                timestamp: pending.timestamp,
                prediction: pending.prediction,
                actualDirection,
                isCorrect
            }, ...prev].slice(0, 50));

            // Remove from pending
            setPendingPredictions(prev => prev.filter(p => p.id !== predictionId));

        } catch (error) {
            console.error('Failed to verify prediction:', error);
        }
    }, []); // Empty deps - uses refs for fresh data

    // Combine local and DB stats
    const stats: AccuracyStats = {
        total: (dbStats?.total || 0) + records.length,
        correct: (dbStats?.correct || 0) + records.filter(r => r.isCorrect).length,
        accuracy: 0,
        byDirection: {
            up: {
                total: (dbStats?.byDirection.up.total || 0) + records.filter(r => r.prediction.direction_code === 1).length,
                correct: (dbStats?.byDirection.up.correct || 0) + records.filter(r => r.prediction.direction_code === 1 && r.isCorrect).length,
                accuracy: 0
            },
            down: {
                total: (dbStats?.byDirection.down.total || 0) + records.filter(r => r.prediction.direction_code === -1).length,
                correct: (dbStats?.byDirection.down.correct || 0) + records.filter(r => r.prediction.direction_code === -1 && r.isCorrect).length,
                accuracy: 0
            },
            neutral: {
                total: (dbStats?.byDirection.neutral.total || 0) + records.filter(r => r.prediction.direction_code === 0).length,
                correct: (dbStats?.byDirection.neutral.correct || 0) + records.filter(r => r.prediction.direction_code === 0 && r.isCorrect).length,
                accuracy: 0
            }
        },
        last20: 0
    };

    // Calculate percentages
    stats.accuracy = stats.total > 0 ? stats.correct / stats.total : 0;
    if (stats.byDirection.up.total > 0) {
        stats.byDirection.up.accuracy = stats.byDirection.up.correct / stats.byDirection.up.total;
    }
    if (stats.byDirection.down.total > 0) {
        stats.byDirection.down.accuracy = stats.byDirection.down.correct / stats.byDirection.down.total;
    }
    if (stats.byDirection.neutral.total > 0) {
        stats.byDirection.neutral.accuracy = stats.byDirection.neutral.correct / stats.byDirection.neutral.total;
    }

    // Last 20 from local records
    const last20 = records.slice(0, 20);
    stats.last20 = last20.length > 0 ? last20.filter(r => r.isCorrect).length / last20.length : 0;

    return {
        records,
        pendingCount: pendingPredictions.length,
        stats,
        trackPrediction,
        setGetCurrentPrice,
        verifyPendingPrediction
    };
}

interface AccuracyTrackerPanelProps {
    stats: AccuracyStats;
    pendingCount: number;
}

export default function AccuracyTrackerPanel({ stats, pendingCount }: AccuracyTrackerPanelProps) {
    const accuracyPct = Math.round(stats.accuracy * 100);
    const last20Pct = Math.round(stats.last20 * 100);

    // Color based on accuracy
    const getColor = (acc: number) => {
        if (acc >= 0.7) return '#22c55e'; // green
        if (acc >= 0.5) return '#f59e0b'; // amber
        return '#ef4444'; // red
    };

    return (
        <div className="bg-white rounded-2xl p-6 border border-[var(--border-light)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                📊 Accuracy Tracker
                {pendingCount > 0 && (
                    <span className="ml-auto text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                        {pendingCount} pending
                    </span>
                )}
            </h3>

            {stats.total === 0 ? (
                <p className="text-center text-[var(--text-muted)] text-sm py-4">
                    No predictions tracked yet
                </p>
            ) : (
                <div className="space-y-4">
                    {/* Overall Accuracy */}
                    <div className="text-center">
                        <div className="relative w-24 h-24 mx-auto">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle
                                    cx="48"
                                    cy="48"
                                    r="40"
                                    stroke="#e5e7eb"
                                    strokeWidth="8"
                                    fill="none"
                                />
                                <motion.circle
                                    cx="48"
                                    cy="48"
                                    r="40"
                                    stroke={getColor(stats.accuracy)}
                                    strokeWidth="8"
                                    fill="none"
                                    strokeLinecap="round"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: stats.accuracy }}
                                    transition={{ duration: 1 }}
                                    style={{
                                        strokeDasharray: 251.2,
                                        strokeDashoffset: 251.2 * (1 - stats.accuracy)
                                    }}
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center flex-col">
                                <span className="text-2xl font-bold" style={{ color: getColor(stats.accuracy) }}>
                                    {accuracyPct}%
                                </span>
                                <span className="text-xs text-gray-400">Overall</span>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="bg-gray-50 rounded-lg p-2">
                            <p className="text-lg font-bold text-[var(--text-primary)]">{stats.total}</p>
                            <p className="text-xs text-gray-400">Total</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2">
                            <p className="text-lg font-bold" style={{ color: getColor(stats.last20) }}>
                                {last20Pct}%
                            </p>
                            <p className="text-xs text-gray-400">Last 20</p>
                        </div>
                    </div>

                    {/* Per Direction */}
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-[var(--text-secondary)]">By Direction</p>

                        {[
                            { key: 'up', label: '↑ UP', color: '#22c55e', stats: stats.byDirection.up },
                            { key: 'neutral', label: '→ NEU', color: '#f59e0b', stats: stats.byDirection.neutral },
                            { key: 'down', label: '↓ DOWN', color: '#ef4444', stats: stats.byDirection.down },
                        ].map(({ key, label, color, stats: dirStats }) => (
                            <div key={key} className="flex items-center gap-2">
                                <span className="text-xs w-16" style={{ color }}>{label}</span>
                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full rounded-full"
                                        style={{ backgroundColor: color }}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${dirStats.accuracy * 100}%` }}
                                        transition={{ duration: 0.5 }}
                                    />
                                </div>
                                <span className="text-xs w-16 text-right text-gray-400">
                                    {dirStats.correct}/{dirStats.total}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
