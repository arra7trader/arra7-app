'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CalculatedLevel {
    level: number;
    price: string;
    label: string;
    desc: string;
    color: string;
}

interface TradeWizardProps {
    levels: CalculatedLevel[];
    currentPrice: number | null;
    trend: 'UP' | 'DOWN';
    onTrendChange: (trend: 'UP' | 'DOWN') => void;
}

export default function TradeWizard({ levels, currentPrice, trend, onTrendChange }: TradeWizardProps) {
    const [step, setStep] = useState<1 | 2 | 3>(1);

    // Find current zone
    const getCurrentZone = () => {
        if (!currentPrice) return null;
        const sortedLevels = [...levels].sort((a, b) => parseFloat(b.price) - parseFloat(a.price));

        for (let i = 0; i < sortedLevels.length - 1; i++) {
            const upper = parseFloat(sortedLevels[i].price);
            const lower = parseFloat(sortedLevels[i + 1].price);
            if (currentPrice <= upper && currentPrice >= lower) {
                return sortedLevels[i];
            }
        }

        // Check if above highest or below lowest
        if (currentPrice > parseFloat(sortedLevels[0].price)) {
            return { ...sortedLevels[0], label: 'Above ' + sortedLevels[0].label };
        }
        return { ...sortedLevels[sortedLevels.length - 1], label: 'Below ' + sortedLevels[sortedLevels.length - 1].label };
    };

    // Calculate trade setup
    const getTradeSetup = () => {
        const entryZone = levels.find(l => l.level === 0.559);
        const tp1 = levels.find(l => l.level === 1.618);
        const tp2 = levels.find(l => l.level === 2.0);
        const sl = levels.find(l => l.level === 0.382);

        if (!entryZone || !tp1 || !sl) return null;

        const entry = parseFloat(entryZone.price);
        const stopLoss = parseFloat(sl.price);
        const takeProfit1 = parseFloat(tp1.price);
        const takeProfit2 = tp2 ? parseFloat(tp2.price) : null;

        const risk = Math.abs(entry - stopLoss);
        const reward = Math.abs(takeProfit1 - entry);
        const rr = reward / risk;

        return {
            entry,
            entryLabel: entryZone.label,
            stopLoss,
            slLabel: sl.label,
            takeProfit1,
            tp1Label: tp1.label,
            takeProfit2,
            tp2Label: tp2?.label,
            risk,
            reward,
            rr,
        };
    };

    const currentZone = getCurrentZone();
    const tradeSetup = getTradeSetup();

    return (
        <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-3xl p-6 shadow-2xl border-2 border-indigo-200">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="text-3xl">🧙‍♂️</div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Trade Wizard</h2>
                        <p className="text-xs text-gray-500">Step-by-step trade setup</p>
                    </div>
                </div>

                {/* Step Indicator */}
                <div className="flex gap-2">
                    {[1, 2, 3].map((s) => (
                        <div
                            key={s}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${step >= s
                                    ? 'bg-indigo-600 text-white shadow-lg'
                                    : 'bg-white text-gray-400 border-2 border-gray-200'
                                }`}
                        >
                            {s}
                        </div>
                    ))}
                </div>
            </div>

            {/* Steps */}
            <AnimatePresence mode="wait">
                {step === 1 && (
                    <motion.div
                        key="step1"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-4"
                    >
                        <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-700 mb-3">📍 Step 1: Where Are You?</h3>

                            {currentPrice ? (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-200">
                                        <span className="text-xs text-gray-600">Current Price:</span>
                                        <span className="text-xl font-mono font-bold text-blue-700">{currentPrice.toFixed(2)}</span>
                                    </div>

                                    {currentZone && (
                                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-200">
                                            <span className="text-xs text-gray-600">You are in:</span>
                                            <span className="text-sm font-bold text-green-700">{currentZone.label}</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200 text-center">
                                    <p className="text-sm text-yellow-700">⏳ Waiting for price data...</p>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setStep(2)}
                            disabled={!currentPrice}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg transition flex items-center justify-center gap-2"
                        >
                            Next: Choose Direction →
                        </button>
                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div
                        key="step2"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-4"
                    >
                        <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-700 mb-4">🎯 Step 2: Choose Your Direction</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => {
                                        onTrendChange('UP');
                                    }}
                                    className={`p-6 rounded-xl border-2 transition ${trend === 'UP'
                                            ? 'bg-green-500 border-green-600 text-white shadow-xl shadow-green-200'
                                            : 'bg-white border-gray-200 text-gray-600 hover:border-green-300'
                                        }`}
                                >
                                    <div className="text-4xl mb-2">📈</div>
                                    <div className="font-bold">BULLISH</div>
                                    <div className="text-xs opacity-80 mt-1">Expecting rise</div>
                                </button>

                                <button
                                    onClick={() => {
                                        onTrendChange('DOWN');
                                    }}
                                    className={`p-6 rounded-xl border-2 transition ${trend === 'DOWN'
                                            ? 'bg-red-500 border-red-600 text-white shadow-xl shadow-red-200'
                                            : 'bg-white border-gray-200 text-gray-600 hover:border-red-300'
                                        }`}
                                >
                                    <div className="text-4xl mb-2">📉</div>
                                    <div className="font-bold">BEARISH</div>
                                    <div className="text-xs opacity-80 mt-1">Expecting drop</div>
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep(1)}
                                className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold transition"
                            >
                                ← Back
                            </button>
                            <button
                                onClick={() => setStep(3)}
                                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg transition"
                            >
                                Get Trade Setup →
                            </button>
                        </div>
                    </motion.div>
                )}

                {step === 3 && (
                    <motion.div
                        key="step3"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-4"
                    >
                        <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-700 mb-4">✅ Step 3: Your Trade Setup</h3>

                            {tradeSetup ? (
                                <div className="space-y-3">
                                    {/* Entry & SL */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                                            <div className="text-[10px] text-gray-500 font-bold mb-1">🎯 ENTRY</div>
                                            <div className="text-lg font-mono font-bold text-indigo-700">{tradeSetup.entry.toFixed(2)}</div>
                                            <div className="text-[9px] text-gray-500">{tradeSetup.entryLabel}</div>
                                        </div>

                                        <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                                            <div className="text-[10px] text-gray-500 font-bold mb-1">🛡️ STOP LOSS</div>
                                            <div className="text-lg font-mono font-bold text-red-600">{tradeSetup.stopLoss.toFixed(2)}</div>
                                            <div className="text-[9px] text-gray-500">-{tradeSetup.risk.toFixed(2)} pips</div>
                                        </div>
                                    </div>

                                    {/* Take Profits */}
                                    <div className="p-3 bg-green-50 rounded-xl border border-green-200">
                                        <div className="text-[10px] text-gray-500 font-bold mb-2">💰 TAKE PROFIT</div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-gray-600">TP1 ({tradeSetup.tp1Label}):</span>
                                                <span className="font-mono font-bold text-green-700">{tradeSetup.takeProfit1.toFixed(2)}</span>
                                            </div>
                                            {tradeSetup.takeProfit2 && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs text-gray-600">TP2 ({tradeSetup.tp2Label}):</span>
                                                    <span className="font-mono font-bold text-green-700">{tradeSetup.takeProfit2.toFixed(2)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* R/R */}
                                    <div className={`p-3 rounded-xl border-2 ${tradeSetup.rr >= 2
                                            ? 'bg-green-100 border-green-400'
                                            : 'bg-yellow-100 border-yellow-400'
                                        }`}>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-bold text-gray-700">Risk/Reward Ratio:</span>
                                            <span className={`text-xl font-bold ${tradeSetup.rr >= 2 ? 'text-green-700' : 'text-yellow-700'
                                                }`}>
                                                1:{tradeSetup.rr.toFixed(2)} {tradeSetup.rr >= 2 ? '✅' : '⚠️'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-2">
                                        <button
                                            onClick={() => {
                                                const text = `
🎯 TRADE SETUP (${trend === 'UP' ? 'BULLISH 📈' : 'BEARISH 📉'})
Entry: ${tradeSetup.entry.toFixed(2)}
SL: ${tradeSetup.stopLoss.toFixed(2)}
TP1: ${tradeSetup.takeProfit1.toFixed(2)}
${tradeSetup.takeProfit2 ? `TP2: ${tradeSetup.takeProfit2.toFixed(2)}` : ''}
R/R: 1:${tradeSetup.rr.toFixed(2)}
                                                `.trim();
                                                navigator.clipboard.writeText(text);
                                            }}
                                            className="flex-1 py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-bold transition flex items-center justify-center gap-2"
                                        >
                                            📋 Copy Setup
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-gray-50 rounded-xl text-center">
                                    <p className="text-sm text-gray-600">Unable to generate trade setup</p>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setStep(1)}
                            className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold transition"
                        >
                            ← Start Over
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
