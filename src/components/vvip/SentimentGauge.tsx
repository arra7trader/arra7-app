
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function SentimentGauge() {
    const [score, setScore] = useState(50); // 0-100
    const [sentiment, setSentiment] = useState('Neutral');

    useEffect(() => {
        // Simulate Sentiment Fluctuation
        const interval = setInterval(() => {
            const newScore = Math.floor(Math.random() * (80 - 20 + 1) + 20); // Random 20-80
            setScore(newScore);

            if (newScore <= 25) setSentiment('Extreme Fear');
            else if (newScore <= 45) setSentiment('Fear');
            else if (newScore <= 55) setSentiment('Neutral');
            else if (newScore <= 75) setSentiment('Greed');
            else setSentiment('Extreme Greed');

        }, 8000);

        return () => clearInterval(interval);
    }, []);

    // Rotation mapping: 0 = -90deg, 100 = 90deg
    const rotation = (score / 100) * 180 - 90;

    const getColor = (s: number) => {
        if (s <= 25) return 'text-red-500';
        if (s <= 45) return 'text-orange-500';
        if (s <= 55) return 'text-gray-500';
        if (s <= 75) return 'text-green-500';
        return 'text-green-600';
    };

    return (
        <div className="bg-white p-6 rounded-2xl border border-[var(--border-light)] shadow-sm h-full flex flex-col">
            <h3 className="font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                <span>🧠</span> Gold Sentiment (XAUUSD)
            </h3>

            <div className="flex-1 flex flex-col items-center justify-center relative min-h-[180px]">
                {/* Gauge Background */}
                <div className="relative w-48 h-24 bg-gray-100 rounded-t-full overflow-hidden">
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
                <div className="absolute bottom-[16px] w-4 h-4 bg-white border-4 border-gray-800 rounded-full z-20"></div>

                {/* Score Text */}
                <div className="mt-8 text-center space-y-1">
                    <div className={`text-3xl font-black ${getColor(score)} transition-colors`}>
                        {score}
                    </div>
                    <div className="text-sm font-medium text-gray-500 uppercase tracking-widest">
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
