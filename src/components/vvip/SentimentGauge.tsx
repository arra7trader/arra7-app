
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function SentimentGauge() {
    const [score, setScore] = useState(50); // 0-100
    const [sentiment, setSentiment] = useState('Neutral');

    useEffect(() => {
        const fetchSentiment = async () => {
            try {
                const res = await fetch('/api/vvip/analytics');
                if (res.ok) {
                    const data = await res.json();
                    if (data.sentiment) {
                        setScore(data.sentiment.score);
                        setSentiment(data.sentiment.label);
                    }
                }
            } catch (e) {
                console.error(e);
            }
        };

        fetchSentiment();
        const interval = setInterval(fetchSentiment, 10000);
        return () => clearInterval(interval);
    }, []);

    // Rotation mapping: 0 = -90deg, 100 = 90deg
    const rotation = (score / 100) * 180 - 90;

    const getColor = (s: number) => {
        if (s <= 25) return 'text-red-500';
        if (s <= 45) return 'text-orange-500';
        if (s <= 55) return 'text-[var(--text-secondary)]';
        if (s <= 75) return 'text-green-500';
        return 'text-green-600';
    };

    return (
        <div className="bg-[var(--bg-primary)] p-6 rounded-2xl border border-[var(--border-light)] shadow-sm h-full flex flex-col">
            <h3 className="font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                <span>🧠</span> Gold Sentiment (XAUUSD)
            </h3>

            <div className="flex-1 flex flex-col items-center justify-center relative min-h-[180px]">
                {/* Gauge Background */}
                <div className="relative w-48 h-24 bg-[var(--bg-secondary)] rounded-t-full overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 opacity-20"></div>
                </div>

                {/* Needle */}
                <motion.div
                    className="absolute w-1 h-24 bg-gray-800 origin-bottom rounded-t-full z-10"
                    style={{ bottom: '20px', left: 'calc(50% - 2px)' }}
                    animate={{ rotate: rotation }}
                    initial={{ rotate: -90 }}
                    transition={{ type: 'spring', damping: 20 }}
                />

                {/* Center Pivot */}
                <div className="absolute bottom-[16px] w-4 h-4 bg-[var(--bg-primary)] border-4 border-gray-800 rounded-full z-20"></div>

                {/* Score Text */}
                <div className="mt-8 text-center space-y-1">
                    <div className={`text-3xl font-black ${getColor(score)} transition-colors`}>
                        {score}
                    </div>
                    <div className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-widest">
                        {sentiment}
                    </div>
                </div>
            </div>

            <p className="text-xs text-gray-400 text-center mt-2">
                Combined RSI, Volatility & Volume Analysis
            </p>
        </div>
    );
}
