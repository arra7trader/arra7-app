'use client';

import { useState, useEffect, useRef } from 'react';
import { MLPrediction } from '@/types/ml-prediction';
import { ChevronUpIcon, ChevronDownIcon, ClockIcon, ShieldCheckIcon } from '@heroicons/react/24/solid';

interface TradeSetupPanelProps {
    prediction: MLPrediction | null;
    isLoading: boolean;
}

export default function TradeSetupPanel({ prediction, isLoading }: TradeSetupPanelProps) {
    // Stability State
    const [stableSetup, setStableSetup] = useState<typeof prediction.tradeSetup | null>(null);
    const lastUpdateRef = useRef<number>(0);
    const pendingSetupRef = useRef<typeof prediction.tradeSetup | null>(null);

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

    }, [prediction]);

    if (!stableSetup || stableSetup.action === 'WAIT') {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-4 h-[120px] flex items-center justify-center">
                <div className="text-center text-gray-400">
                    <ClockIcon className="w-6 h-6 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium">Scanning for High Confidence Setup...</p>
                    <p className="text-xs mt-1">AI ensures > 65% stability</p>
                </div>
            </div>
        );
    }

    const isLong = stableSetup.action === 'LONG';
    const colorClass = isLong ? 'text-green-600 bg-green-50 border-green-200' : 'text-red-600 bg-red-50 border-red-200';
    const btnColor = isLong ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700';

    return (
        <div className={`rounded-xl border p-4 ${isLong ? 'border-green-100 bg-green-50/30' : 'border-red-100 bg-red-50/30'}`}>
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isLong ? 'bg-green-100' : 'bg-red-100'}`}>
                        {isLong ? <ChevronUpIcon className="w-6 h-6 text-green-700" /> : <ChevronDownIcon className="w-6 h-6 text-red-700" />}
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
                    <ShieldCheckIcon className="w-3 h-3" />
                    <span>AI Validated Strategy</span>
                </div>
                <span>Updates every 3s</span>
            </div>
        </div>
    );
}
