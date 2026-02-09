'use client';

import { useState, useEffect, useRef } from 'react';
import { MLPrediction } from '@/types/ml-prediction';

// TradeSetup type (matches MLPrediction.tradeSetup)
interface TradeSetup {
    action: 'LONG' | 'SHORT' | 'WAIT';
    entry: number;
    tp: number;
    sl: number;
    riskRewardRatio: number;
    quality: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface TradeSetupPanelProps {
    prediction: MLPrediction | null;
    isLoading: boolean;
}

export default function TradeSetupPanel({ prediction, isLoading }: TradeSetupPanelProps) {
    // Stability State - Use explicit type instead of typeof
    const [stableSetup, setStableSetup] = useState<TradeSetup | null>(null);
    const lastUpdateRef = useRef<number>(0);

    // Filter Logic:
    // Only update the displayed setup if the new signal persists for > 2 seconds
    // or if the quality improves (Low -> High)
    useEffect(() => {
        if (!prediction?.tradeSetup) return;

        const newSetup = prediction.tradeSetup;
        const now = Date.now();

        // Immediate update if quality is High and we are currently waiting
        if (newSetup.quality === 'HIGH' && (!stableSetup || stableSetup.action === 'WAIT')) {
            setStableSetup(newSetup);
            lastUpdateRef.current = now;
            return;
        }

        // Otherwise, simple debounce/throttle
        // If action changed, wait.
        if (stableSetup && newSetup.action !== stableSetup.action) {
            // Pending change...
            const timer = setTimeout(() => {
                setStableSetup(newSetup);
                lastUpdateRef.current = Date.now();
            }, 1500); // 1.5s stability check
            return () => clearTimeout(timer);
        } else {
            // Same action, just update levels instantly
            setStableSetup(newSetup);
        }

    }, [prediction, stableSetup]);

    if (!stableSetup || stableSetup.action === 'WAIT') {
        const currentConfidence = prediction?.confidence ? Math.round(prediction.confidence * 100) : 0;
        const currentDirection = prediction?.direction || 'NEUTRAL';
        const dirColor = currentDirection === 'UP' ? 'text-green-600' : currentDirection === 'DOWN' ? 'text-red-600' : 'text-gray-500';

        return (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="text-center text-gray-500 mb-3">
                    <div className="text-2xl mb-1">⏳</div>
                    <p className="text-sm font-medium">Scanning for High Confidence Setup...</p>
                    <p className="text-xs text-gray-400">Signal appears when AI &gt; 75%</p>
                </div>

                {/* Live ML Confidence Display */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-medium text-gray-500">Current AI Reading</span>
                        <span className={`text-xs font-bold ${dirColor}`}>{currentDirection}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 ${currentConfidence >= 75 ? 'bg-green-500' : currentConfidence >= 50 ? 'bg-yellow-500' : 'bg-red-400'}`}
                                style={{ width: `${currentConfidence}%` }}
                            />
                        </div>
                        <span className="text-sm font-bold text-gray-700">{currentConfidence}%</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 text-center">Threshold: 75% for signal</p>
                </div>
            </div>
        );
    }

    const isLong = stableSetup.action === 'LONG';

    return (
        <div className={`rounded-xl border p-4 ${isLong ? 'border-green-100 bg-green-50/30' : 'border-red-100 bg-red-50/30'}`}>
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg text-xl ${isLong ? 'bg-green-100' : 'bg-red-100'}`}>
                        {isLong ? '📈' : '📉'}
                    </div>
                    <div>
                        <h3 className={`text-lg font-bold ${isLong ? 'text-green-700' : 'text-red-700'}`}>
                            {stableSetup.action} SIGNAL
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs font-semibold text-gray-500">Quality:</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${stableSetup.quality === 'HIGH' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                {stableSetup.quality}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-sm text-gray-500">Entry Zone</div>
                    <div className="text-xl font-bold text-gray-800">{stableSetup.entry.toLocaleString()}</div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-lg border border-gray-200 p-2.5 shadow-sm">
                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                        🎯 Take Profit (TP)
                    </div>
                    <div className="text-lg font-bold text-green-600">{stableSetup.tp.toLocaleString()}</div>
                    <div className="text-[10px] text-gray-400">Risk/Reward {stableSetup.riskRewardRatio}</div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-2.5 shadow-sm">
                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                        🛡️ Stop Loss (SL)
                    </div>
                    <div className="text-lg font-bold text-red-600">{stableSetup.sl.toLocaleString()}</div>
                    <div className="text-[10px] text-gray-400">Strict Exit</div>
                </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-400 px-1">
                <div className="flex items-center gap-1">
                    <span>🤖</span>
                    <span>AI Validated Strategy</span>
                </div>
                <span>Updates every 3s</span>
            </div>
        </div>
    );
}
