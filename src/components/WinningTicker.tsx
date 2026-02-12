'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

type TickerItem = {
    id: string; // Unique ID for key
    type: 'signal' | 'profit' | 'loss';
    pair?: string;
    user?: string;
    action: string;
    pips: string;
    time: string;
};

// Data pools for randomization
const PAIRS = ['XAUUSD', 'GBPUSD', 'EURUSD', 'USDJPY', 'NAS100', 'US30', 'BTCUSD', 'ETHUSD', 'GBPJPY', 'AUDUSD'];
const ACTIONS_PROFIT = ['HIT TP1', 'HIT TP2', 'HIT TP3', 'Bagged', 'Profit', 'Scalp', 'Snipe', 'Big Win', 'Smash'];
const ACTIONS_SIGNAL = ['Running', 'Breakout', 'Entry', 'Potential', 'Setup', 'Signal'];
const NAMES = ['Start', 'Agus', 'Budi', 'Citra', 'Dewi', 'Eko', 'Fajar', 'Gita', 'Hendra', 'Indra', 'Joko', 'Kartika', 'Lina', 'Made', 'Nina', 'Oscar', 'Putri', 'Rizky', 'Siti', 'Tono', 'Wahyu', 'Yulia', 'Zain'];

// Helper to generate random item
const generateRandomWin = (): TickerItem => {
    const typeRoll = Math.random();
    let type: 'signal' | 'profit' | 'loss' = 'profit';

    // 70% Profit, 20% Signal, 10% Loss (Marketing mode)
    if (typeRoll > 0.9) type = 'loss';
    else if (typeRoll > 0.7) type = 'signal';

    const pair = PAIRS[Math.floor(Math.random() * PAIRS.length)];
    const id = Math.random().toString(36).substr(2, 9);

    // Time: "Just now", "1m ago", etc.
    const timeRoll = Math.floor(Math.random() * 5);
    const time = timeRoll === 0 ? 'Just now' : `${timeRoll}m ago`;

    if (type === 'profit') {
        const user = `${NAMES[Math.floor(Math.random() * NAMES.length)]}.${Math.random().toString(36).substr(2, 3)}***`;
        const action = ACTIONS_PROFIT[Math.floor(Math.random() * ACTIONS_PROFIT.length)];
        const pips = pair.includes('USD') && !pair.includes('XAU') ? `+${Math.floor(Math.random() * 40) + 10} pips`
            : pair.includes('JPY') ? `+${Math.floor(Math.random() * 60) + 20} pips`
                : pair === 'XAUUSD' ? `+${Math.floor(Math.random() * 150) + 30} pips`
                    : `+${Math.floor(Math.random() * 300) + 50} pts`; // Indices/Crypto

        return { id, type, user, pair, action, pips, time };
    } else if (type === 'loss') {
        const user = `${NAMES[Math.floor(Math.random() * NAMES.length)]}.${Math.random().toString(36).substr(2, 3)}***`;
        return { id, type, user, pair, action: 'Hit SL', pips: `-${Math.floor(Math.random() * 30) + 10} pips`, time };
    } else {
        // Signal
        const action = ACTIONS_SIGNAL[Math.floor(Math.random() * ACTIONS_SIGNAL.length)];
        return { id, type, pair, action, pips: 'Active', time };
    }
};

export default function WinningTicker() {
    const [wins, setWins] = useState<TickerItem[]>([]);

    // Initialize with some data
    useEffect(() => {
        const initial = Array.from({ length: 20 }).map(generateRandomWin);
        setWins(initial);
    }, []);

    // Add new win periodically
    useEffect(() => {
        const interval = setInterval(() => {
            setWins(prev => {
                const newWin = generateRandomWin();
                // Keep list at 20 items, add to start, remove from end
                return [newWin, ...prev.slice(0, 19)];
            });
        }, 3000); // Update every 3 seconds

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed top-14 left-0 right-0 z-40 w-full bg-gradient-to-r from-blue-900/40 via-purple-900/40 to-blue-900/40 border-y border-white/5 backdrop-blur-sm overflow-hidden py-2 shadow-lg">
            <div className="flex whitespace-nowrap">
                <motion.div
                    className="flex gap-12 px-4"
                    animate={{ x: [0, -1000] }}
                    transition={{
                        repeat: Infinity,
                        duration: 60, // Slower for readability
                        ease: "linear",
                    }}
                >
                    {/* Duplicate list for infinite scroll illusion */}
                    {[...wins, ...wins].map((win, i) => (
                        <div key={`${win.id}-${i}`} className="flex items-center gap-2 text-sm">
                            {/* BADGE TYPE */}
                            {win.type === 'signal' && (
                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${win.action.includes('SL') ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                    SIGNAL
                                </span>
                            )}
                            {win.type === 'profit' && (
                                <span className="text-xs font-bold bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
                                    PROFIT
                                </span>
                            )}
                            {win.type === 'loss' && (
                                <span className="text-xs font-bold bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">
                                    LOSS
                                </span>
                            )}

                            {/* USER OR PAIR */}
                            <span className="font-semibold text-white">
                                {win.user || win.pair}
                            </span>

                            {/* PAIR for USER (if exists) */}
                            {win.user && win.pair && (
                                <span className="text-xs text-gray-400">({win.pair})</span>
                            )}

                            {/* ACTION TEXT */}
                            <span className="text-gray-300">{win.action}</span>

                            {/* PIPS/VALUE */}
                            <span className={`font-bold ${win.pips.includes('-') ? 'text-red-400' : 'text-green-400'}`}>
                                {win.pips}
                            </span>

                            {/* TIME */}
                            <span className="text-xs text-gray-500 border-l border-white/10 pl-2 ml-1">
                                {win.time}
                            </span>
                        </div>
                    ))}
                </motion.div>
            </div>
        </div>
    );
}
