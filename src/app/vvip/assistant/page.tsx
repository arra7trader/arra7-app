'use client';

import GoldHeatmap from '@/components/vvip/GoldHeatmap';
import CurrencyStrength from '@/components/vvip/CurrencyStrength';
import SentimentGauge from '@/components/vvip/SentimentGauge';
import KeyLevels from '@/components/vvip/KeyLevels';

export default function VvipAssistantPage() {
    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-12">
            <div className="container-wide">
                <div className="max-w-7xl mx-auto space-y-8">

                    {/* Header Section */}
                    <div>
                        <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">
                            VVIP Pro Dashboard
                        </h1>
                        <p className="text-[var(--text-secondary)] text-lg">
                            Institutional-grade market analysis & tools.
                        </p>
                    </div>

                    {/* Main Grid Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                        {/* Left Column: Sentiment & Currency (Spans 1 col on LG) */}
                        <div className="lg:col-span-1 space-y-6">
                            <SentimentGauge />
                            <CurrencyStrength />
                        </div>

                        {/* Middle Column: Heatmap (Spans 2 cols on LG) */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white p-1 rounded-3xl border border-[var(--border-light)] shadow-sm h-full">
                                <div className="bg-gray-50 rounded-[20px] p-6 h-full flex flex-col">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-bold text-[var(--text-primary)]">Live Market Monitor</h3>
                                        <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                            REAL-TIME
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <GoldHeatmap />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Key Levels (Spans 1 col on LG) */}
                        <div className="lg:col-span-1">
                            <KeyLevels />
                        </div>

                    </div>

                    {/* Bottom Disclaimer */}
                    <div className="text-center text-xs text-gray-400 mt-12 max-w-2xl mx-auto">
                        Disclaimer: Tools provided are for educational purposes only. Market data may be delayed.
                        Trading carries high risk.
                    </div>

                </div>
            </div>
        </div>
    );
}

