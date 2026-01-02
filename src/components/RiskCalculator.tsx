'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface RiskCalculatorProps {
    entryPrice?: number;
    stopLoss?: number;
    symbol?: string;
    onCalculate?: (lotSize: number) => void;
}

export default function RiskCalculator({ entryPrice, stopLoss, symbol, onCalculate }: RiskCalculatorProps) {
    const [accountBalance, setAccountBalance] = useState<number>(1000);
    const [riskPercent, setRiskPercent] = useState<number>(2);
    const [entry, setEntry] = useState<number>(entryPrice || 0);
    const [sl, setSl] = useState<number>(stopLoss || 0);
    const [lotSize, setLotSize] = useState<number>(0);
    const [positionValue, setPositionValue] = useState<number>(0);
    const [maxLoss, setMaxLoss] = useState<number>(0);
    const [pipValue, setPipValue] = useState<number>(0);

    // Update entry/sl when props change
    useEffect(() => {
        if (entryPrice) setEntry(entryPrice);
        if (stopLoss) setSl(stopLoss);
    }, [entryPrice, stopLoss]);

    // Calculate pip value based on symbol
    const getPipSize = (sym: string): number => {
        if (sym?.includes('JPY')) return 0.01;
        if (sym?.includes('XAU')) return 0.1;
        if (sym?.includes('BTC')) return 1;
        return 0.0001;
    };

    // Get lot multiplier based on symbol
    const getLotMultiplier = (sym: string): number => {
        if (sym?.includes('XAU')) return 100; // 1 lot = 100 oz
        if (sym?.includes('BTC')) return 1; // 1 lot = 1 BTC
        return 100000; // Standard forex lot
    };

    // Calculate lot size
    const calculate = () => {
        if (!entry || !sl || entry === sl) return;

        const pipSize = getPipSize(symbol || '');
        const lotMultiplier = getLotMultiplier(symbol || '');

        // Calculate pip distance
        const pipsDistance = Math.abs(entry - sl) / pipSize;

        // Calculate max loss amount based on risk %
        const maxLossAmount = (accountBalance * riskPercent) / 100;

        // Calculate pip value for 1 standard lot
        const pipValuePerLot = pipSize * lotMultiplier;

        // Calculate lot size
        const calculatedLotSize = maxLossAmount / (pipsDistance * pipValuePerLot);

        // Round to 2 decimal places
        const roundedLotSize = Math.round(calculatedLotSize * 100) / 100;

        setLotSize(roundedLotSize);
        setPipValue(pipValuePerLot * roundedLotSize);
        setPositionValue(entry * roundedLotSize * lotMultiplier);
        setMaxLoss(maxLossAmount);

        if (onCalculate) {
            onCalculate(roundedLotSize);
        }
    };

    // Auto-calculate when inputs change
    useEffect(() => {
        if (entry && sl && accountBalance && riskPercent) {
            calculate();
        }
    }, [entry, sl, accountBalance, riskPercent, symbol]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-4 border border-[#1F2937]"
        >
            <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">⚠️</span>
                <h3 className="text-lg font-semibold">Risk Calculator</h3>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Account Balance */}
                <div>
                    <label className="text-xs text-[#64748B] mb-1 block">Account Balance ($)</label>
                    <input
                        type="number"
                        value={accountBalance}
                        onChange={(e) => setAccountBalance(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-[#12141A] border border-[#1F2937] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                        placeholder="10000"
                    />
                </div>

                {/* Risk Percentage */}
                <div>
                    <label className="text-xs text-[#64748B] mb-1 block">Risk (%)</label>
                    <input
                        type="number"
                        value={riskPercent}
                        onChange={(e) => setRiskPercent(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-[#12141A] border border-[#1F2937] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                        placeholder="2"
                        step="0.5"
                        min="0.5"
                        max="10"
                    />
                </div>

                {/* Entry Price */}
                <div>
                    <label className="text-xs text-[#64748B] mb-1 block">Entry Price</label>
                    <input
                        type="number"
                        value={entry || ''}
                        onChange={(e) => setEntry(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-[#12141A] border border-[#1F2937] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                        placeholder="0.00000"
                        step="0.00001"
                    />
                </div>

                {/* Stop Loss */}
                <div>
                    <label className="text-xs text-[#64748B] mb-1 block">Stop Loss</label>
                    <input
                        type="number"
                        value={sl || ''}
                        onChange={(e) => setSl(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-[#12141A] border border-[#1F2937] rounded-lg text-red-400 text-sm focus:outline-none focus:border-red-500"
                        placeholder="0.00000"
                        step="0.00001"
                    />
                </div>
            </div>

            {/* Results */}
            {lotSize > 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-4 border border-blue-500/20"
                >
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-[#64748B]">Recommended Lot Size</p>
                            <p className="text-2xl font-bold gradient-text">{lotSize.toFixed(2)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-[#64748B]">Max Loss</p>
                            <p className="text-xl font-semibold text-red-400">${maxLoss.toFixed(2)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-[#64748B]">Pip Value</p>
                            <p className="text-lg font-medium text-white">${pipValue.toFixed(2)}/pip</p>
                        </div>
                        <div>
                            <p className="text-xs text-[#64748B]">Position Value</p>
                            <p className="text-lg font-medium text-[#94A3B8]">${positionValue.toFixed(2)}</p>
                        </div>
                    </div>

                    {/* Risk Warning */}
                    {riskPercent > 5 && (
                        <div className="mt-3 p-2 bg-red-500/20 border border-red-500/30 rounded-lg">
                            <p className="text-xs text-red-400">
                                ⚠️ Risk di atas 5% sangat berisiko! Disarankan 1-2% per trade.
                            </p>
                        </div>
                    )}
                </motion.div>
            )}

            {/* Instructions */}
            <div className="mt-3 text-xs text-[#64748B]">
                <p>💡 <strong>Tips:</strong> Risiko 1-2% per trade adalah standar profesional.</p>
            </div>
        </motion.div>
    );
}
