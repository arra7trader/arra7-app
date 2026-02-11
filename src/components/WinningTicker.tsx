'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

type TickerItem = {
    type: 'signal' | 'profit' | 'loss';
    pair?: string;
    user?: string;
    action: string;
    pips: string;
    time: string;
};

const MOCK_WINS: TickerItem[] = [
    { type: 'signal', pair: 'XAUUSD', action: 'HIT TP1', pips: '+40 pips', time: '2m ago' },
    { type: 'profit', user: 'ekasap*****@gmail.com', pair: 'XAUUSD', action: 'TP Hit', pips: '+35 pips', time: '3m ago' },
    { type: 'profit', user: 'dian.w*****@gmail.com', pair: 'GBPUSD', action: 'Bagged', pips: '+22 pips', time: '5m ago' },
    { type: 'signal', pair: 'GBPJPY', action: 'HIT TP2', pips: '+65 pips', time: '7m ago' },
    { type: 'profit', user: 'hendra*****@yahoo.com', pair: 'XAUUSD', action: 'Profit', pips: '+110 pips', time: '8m ago' },
    { type: 'loss', pair: 'EURUSD', action: 'HIT SL', pips: '-15 pips', time: '9m ago' },
    { type: 'profit', user: 'siti.nur*****@gmail.com', pair: 'NAS100', action: 'TP2', pips: '+45 pts', time: '10m ago' },
    { type: 'signal', pair: 'BTCUSD', action: 'Running', pips: '+120 pips', time: '12m ago' },
    { type: 'profit', user: 'bagus.p*****@gmail.com', pair: 'XAUUSD', action: 'Profit', pips: '+85 pips', time: '14m ago' },
    { type: 'profit', user: 'wahyu*****@gmail.com', pair: 'USDJPY', action: 'Scalp', pips: '+18 pips', time: '15m ago' },
    { type: 'signal', pair: 'NAS100', action: 'HIT TP1', pips: '+30 pts', time: '18m ago' },
    { type: 'profit', user: 'agus.t*****@gmail.com', pair: 'BTCUSD', action: 'Big Win', pips: '+2500 pts', time: '20m ago' },
    { type: 'profit', user: 'rlni.s*****@gmail.com', pair: 'EURUSD', action: 'TP1', pips: '+25 pips', time: '22m ago' },
    { type: 'loss', user: 'joko.w*****@gmail.com', pair: 'XAUUSD', action: 'Cut Loss', pips: '-12 pips', time: '24m ago' },
    { type: 'profit', user: 'putri.a*****@gmail.com', pair: 'GBPJPY', action: 'TP Hit', pips: '+60 pips', time: '25m ago' },
    { type: 'signal', pair: 'XAUUSD', action: 'Breakout', pips: 'Potential', time: '28m ago' },
    { type: 'profit', user: 'fajar*****@gmail.com', pair: 'XAUUSD', action: 'Profit', pips: '+35 pips', time: '30m ago' },
    { type: 'profit', user: 'bambang*****@yahoo.com', pair: 'US30', action: 'TP', pips: '+150 pts', time: '32m ago' },
    { type: 'signal', pair: 'DJI30', action: 'HIT TP3', pips: '+200 pts', time: '35m ago' },
    { type: 'profit', user: 'citra.m*****@gmail.com', pair: 'XAUUSD', action: 'Scalping', pips: '+90 pips', time: '40m ago' },
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
                        duration: 40, // Slower for readability
                        ease: "linear",
                    }}
                >
                    {[...MOCK_WINS, ...MOCK_WINS, ...MOCK_WINS].map((win, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                            {/* BADGE TYPE */}
                            {win.type === 'signal' && (
                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${win.action.includes('SL') ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                    {win.action.includes('SL') ? 'STOP LOSS' : 'SIGNAL'}
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
