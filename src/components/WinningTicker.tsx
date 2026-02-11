'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const MOCK_WINS = [
    { type: 'signal', pair: 'XAUUSD', action: 'HIT TP3', pips: '+150 pips', time: '10m ago' },
    { type: 'profit', user: 'agu*****@gmail.com', amount: '$540', time: '15m ago' },
    { type: 'signal', pair: 'GBPJPY', action: 'HIT TP2', pips: '+85 pips', time: '22m ago' },
    { type: 'profit', user: 'budi.san*****@gmail.com', amount: '$1,250', time: '30m ago' },
    { type: 'signal', pair: 'BTCUSD', action: 'HIT TP4', pips: '+450 pips', time: '45m ago' },
    { type: 'profit', user: 'rizky*****@gmail.com', amount: '$2,800', time: '1h ago' },
    { type: 'signal', pair: 'NAS100', action: 'Sniper Entry', pips: 'Zero Drawdown', time: '1h 15m ago' },
    { type: 'profit', user: 'dewi.pu*****@gmail.com', amount: '$920', time: '1h 30m ago' },
];

export default function WinningTicker() {
    return (
        <div className="fixed top-14 left-0 right-0 z-40 w-full bg-gradient-to-r from-blue-900/40 via-purple-900/40 to-blue-900/40 border-y border-white/5 backdrop-blur-sm overflow-hidden py-2 shadow-lg">
            <div className="flex whitespace-nowrap">
                <motion.div
                    className="flex gap-12 px-4"
                    animate={{ x: [0, -1000] }}
                    transition={{
                        repeat: Infinity,
                        duration: 30, // Adjust speed
                        ease: "linear",
                    }}
                >
                    {[...MOCK_WINS, ...MOCK_WINS, ...MOCK_WINS].map((win, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                            {win.type === 'signal' ? (
                                <>
                                    <span className="text-xs font-bold bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                                        SIGNAL
                                    </span>
                                    <span className="font-semibold text-white">{win.pair}</span>
                                    <span className="text-gray-300">{win.action}</span>
                                    <span className="text-green-400 font-bold">{win.pips}</span>
                                </>
                            ) : (
                                <>
                                    <span className="text-xs font-bold bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
                                        PROFIT
                                    </span>
                                    <span className="font-semibold text-white">{win.user}</span>
                                    <span className="text-gray-300">profit</span>
                                    <span className="text-green-400 font-bold">{win.amount}</span>
                                </>
                            )}
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
