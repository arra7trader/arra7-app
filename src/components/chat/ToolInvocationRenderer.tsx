'use client';

import { motion } from 'framer-motion';

export default function ToolInvocationRenderer({ toolInvocation }: { toolInvocation: any }) {
    const { toolName, toolCallId, state } = toolInvocation;

    if (state === 'result') {
        const { result } = toolInvocation;

        if (toolName === 'getPrice') {
            return (
                <div className="mt-2 mb-2">
                    <PriceCard data={result} />
                </div>
            );
        }

        if (toolName === 'getNews') {
            return (
                <div className="mt-2 mb-2">
                    <NewsCard data={result} />
                </div>
            );
        }

        return (
            <div className="bg-gray-100 p-2 rounded text-xs text-gray-500 font-mono">
                ✅ Action Complete: {toolName}
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 text-xs text-gray-400 animate-pulse my-1">
            <div className="w-2 h-2 bg-amber-500 rounded-full" />
            <span>AI executing {toolName}...</span>
        </div>
    );
}

function PriceCard({ data }: { data: any }) {
    if (data.error) return <div className="text-red-500 text-xs">Error: {data.error}</div>;

    const isUp = data.change >= 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm max-w-sm"
        >
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="text-lg font-bold text-gray-800">{data.symbol}</h3>
                    <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Market Data</span>
                </div>
                <div className={`text-xs px-2 py-1 rounded font-bold ${isUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {isUp ? '+' : ''}{data.change}%
                </div>
            </div>

            <div className="text-2xl font-mono font-bold text-gray-900 mb-1">
                {data.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}
            </div>

            <div className="flex justify-between text-xs text-gray-500 border-t border-gray-100 pt-2 mt-2">
                <div>H: {data.high.toLocaleString()}</div>
                <div>L: {data.low.toLocaleString()}</div>
            </div>

            <div className="mt-2 text-[10px] text-gray-400 text-right">
                {data.is_realtime ? '⚡ Realtime' : '🕒 Delayed'} • {data.source || 'Unknown'}
            </div>
        </motion.div>
    );
}

function NewsCard({ data }: { data: any }) {
    if (data.error) return <div className="text-red-500 text-xs">{data.error}</div>;
    if (data.message) return <div className="text-gray-500 text-xs italic">{data.message}</div>;

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm max-w-md"
        >
            <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex justify-between items-center">
                <span className="text-xs font-bold text-gray-600 uppercase">High Impact News</span>
                <span className="text-[10px] text-gray-400">ForexFactory</span>
            </div>
            <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
                {data.news.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between mb-1">
                            <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1 rounded">{item.time}</span>
                            <span className={`text-[10px] font-bold px-1.5 rounded ${item.impact === 'High' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                                {item.impact}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-gray-700 w-8">{item.currency}</span>
                            <span className="text-sm text-gray-800 line-clamp-1">{item.title}</span>
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}
