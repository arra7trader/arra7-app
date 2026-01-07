'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MLPrediction } from '@/types/ml-prediction';

interface AccuracyRecord {
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
    last20: number;  // Accuracy of last 20 predictions
}

// Hook for tracking prediction accuracy
export function useAccuracyTracker() {
    const [records, setRecords] = useState<AccuracyRecord[]>([]);
    const [pendingPredictions, setPendingPredictions] = useState<Map<number, MLPrediction>>(new Map());
    const [initialPrices, setInitialPrices] = useState<Map<number, number>>(new Map());

    // Add a new prediction to track
    const trackPrediction = useCallback((prediction: MLPrediction, currentPrice: number) => {
        const timestamp = Date.now();

        setPendingPredictions(prev => {
            const next = new Map(prev);
            next.set(timestamp, prediction);
            return next;
        });

        setInitialPrices(prev => {
            const next = new Map(prev);
            next.set(timestamp, currentPrice);
            return next;
        });

        // Schedule verification after prediction horizon
        const horizonMs = prediction.horizon * 1000;
        setTimeout(() => {
            // This will be called externally with the actual price at that time
        }, horizonMs);

    }, []);

    // Verify a prediction with the actual price
    const verifyPrediction = useCallback((timestamp: number, actualPrice: number) => {
        const prediction = pendingPredictions.get(timestamp);
        const initialPrice = initialPrices.get(timestamp);

        if (!prediction || initialPrice === undefined) return;

        // Calculate actual direction
        const priceChange = actualPrice - initialPrice;
        const priceChangePct = (priceChange / initialPrice) * 10000; // bps

        let actualDirection: -1 | 0 | 1;
        if (priceChangePct > 1) {
            actualDirection = 1; // UP
        } else if (priceChangePct < -1) {
            actualDirection = -1; // DOWN
        } else {
            actualDirection = 0; // NEUTRAL
        }

        // Check if prediction was correct
        const isCorrect = prediction.direction_code === actualDirection;

        // Add to records
        setRecords(prev => [{
            timestamp,
            prediction,
            actualDirection,
            isCorrect
        }, ...prev].slice(0, 100)); // Keep last 100

        // Clean up pending
        setPendingPredictions(prev => {
            const next = new Map(prev);
            next.delete(timestamp);
            return next;
        });

        setInitialPrices(prev => {
            const next = new Map(prev);
            next.delete(timestamp);
            return next;
        });

    }, [pendingPredictions, initialPrices]);

    // Calculate stats
    const stats: AccuracyStats = {
        total: records.length,
        correct: records.filter(r => r.isCorrect).length,
        accuracy: records.length > 0 ? records.filter(r => r.isCorrect).length / records.length : 0,
        byDirection: {
            up: {
                total: records.filter(r => r.prediction.direction_code === 1).length,
                correct: records.filter(r => r.prediction.direction_code === 1 && r.isCorrect).length,
                accuracy: 0
            },
            down: {
                total: records.filter(r => r.prediction.direction_code === -1).length,
                correct: records.filter(r => r.prediction.direction_code === -1 && r.isCorrect).length,
                accuracy: 0
            },
            neutral: {
                total: records.filter(r => r.prediction.direction_code === 0).length,
                correct: records.filter(r => r.prediction.direction_code === 0 && r.isCorrect).length,
                accuracy: 0
            }
        },
        last20: 0
    };

    // Calculate per-direction accuracy
    if (stats.byDirection.up.total > 0) {
        stats.byDirection.up.accuracy = stats.byDirection.up.correct / stats.byDirection.up.total;
    }
    if (stats.byDirection.down.total > 0) {
        stats.byDirection.down.accuracy = stats.byDirection.down.correct / stats.byDirection.down.total;
    }
    if (stats.byDirection.neutral.total > 0) {
        stats.byDirection.neutral.accuracy = stats.byDirection.neutral.correct / stats.byDirection.neutral.total;
    }

    // Last 20 accuracy
    const last20 = records.slice(0, 20);
    stats.last20 = last20.length > 0
        ? last20.filter(r => r.isCorrect).length / last20.length
        : 0;

    return {
        records,
        pendingCount: pendingPredictions.size,
        stats,
        trackPrediction,
        verifyPrediction
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
