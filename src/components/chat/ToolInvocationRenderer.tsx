import React from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { LockIcon } from '@/components/PremiumIcons'; // Assuming this exists, or use generic logic
import QuotaExceededCard from './QuotaExceededCard';
import { useLowBalancePopup } from '@/components/LowBalancePopup';

// ═══════════════════════════════════════════════════════
// TOOL INVOCATION RENDERER (8 Tools)
// ═══════════════════════════════════════════════════════
export default function ToolInvocationRenderer({ toolInvocation }: { toolInvocation: any }) {
    const { data: session } = useSession();
    const isBasic = session?.user?.tier === 'BASIC';
    // Admin override just in case
    const isAdmin = session?.user?.email === 'apmexplore@gmail.com';
    const isLocked = isBasic && !isAdmin;

    const { openPopup } = useLowBalancePopup();
    const { toolName, toolCallId, state } = toolInvocation;

    // Trigger Popup on Quota Exceeded
    React.useEffect(() => {
        if (state === 'result' && toolInvocation.result?.error === 'QUOTA_EXCEEDED') {
            openPopup();
        }
    }, [state, toolInvocation.result, openPopup]);

    // Pending state
    if (state === 'partial-call' || (state !== 'result' && state !== 'call')) {
        return (
            <div className="animate-pulse bg-slate-700/30 border border-slate-600/50 rounded-lg px-4 py-3 text-sm text-slate-400">
                🔄 Calling {toolName}...
            </div>
        );
    }

    // Result state
    if (state === 'result') {
        const { result } = toolInvocation;

        // 1. getPrice
        if (toolName === 'getPrice') {
            if (result.error) {
                return <div className="text-sm text-red-400">❌ {result.error}</div>;
            }
            const changeColor = result.change >= 0 ? 'text-green-400' : 'text-red-400';
            return (
                <div className="bg-gradient-to-br from-emerald-900/30 to-teal-900/30 border border-emerald-700/50 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">💰</span>
                            <div>
                                <h3 className="font-bold text-emerald-300">Live Price</h3>
                                <p className="text-xs text-slate-400">{result.symbol} • {result.source}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-white">${result.price?.toFixed(2)}</div>
                            <div className={`text-sm font-semibold ${changeColor}`}>{result.change >= 0 ? '+' : ''}{result.change?.toFixed(2)}%</div>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 bg-slate-900/60 rounded-lg p-3 text-sm">
                        <div>
                            <div className="text-xs text-slate-400 mb-1">High</div>
                            <div className="font-semibold text-green-400">{result.high?.toFixed(2)}</div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-400 mb-1">Low</div>
                            <div className="font-semibold text-red-400">{result.low?.toFixed(2)}</div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-400 mb-1">Open</div>
                            <div className="font-semibold text-slate-300">{result.open?.toFixed(2)}</div>
                        </div>
                    </div>
                </div>
            );
        }

        // 2. getNews
        if (toolName === 'getNews') {
            if (result.message) {
                return <div className="text-sm text-slate-400">{result.message}</div>;
            }
            if (result.news && result.news.length > 0) {
                return (
                    <div className="bg-gradient-to-br from-orange-900/30 to-red-900/30 border border-orange-700/50 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">📰</span>
                            <div>
                                <h3 className="font-bold text-orange-300">High-Impact News</h3>
                                <p className="text-xs text-slate-400">Forex Factory • Today/Tomorrow</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {result.news.slice(0, 8).map((item: any, i: number) => (
                                <div key={i} className="bg-slate-900/60 rounded-lg p-3 flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="text-sm font-semibold text-slate-200">{item.title}</div>
                                        <div className="text-xs text-slate-400 mt-1">
                                            {item.currency} • {item.time}
                                        </div>
                                    </div>
                                    <div className={`ml-3 px-2 py-1 rounded text-xs font-bold ${item.impact === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                        {item.impact}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            }
            return <div className="text-sm text-slate-400">No news available.</div>;
        }


        // 3. analyzeForex (Deep AI Analysis)
        if (toolName === 'analyzeForex') {
            if (result.error === 'QUOTA_EXCEEDED') {
                return <QuotaExceededCard message={result.message} limitType="FOREX" />;
            }
            if (result.error) {
                return <div className="text-sm text-red-400">❌ {result.error}</div>;
            }
            return (
                <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-700/50 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">📊</span>
                            <div>
                                <h3 className="font-bold text-blue-300">AI Forex Analysis</h3>
                                <p className="text-xs text-slate-400">
                                    {result.symbol} • {result.timeframe} • Price: ${result.price?.toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-900/60 rounded-lg p-4 text-sm text-slate-200 prose prose-invert prose-sm max-w-none">
                        {result.analysis ? (
                            isLocked ? (
                                <div className="relative">
                                    <div className="blur-sm select-none" dangerouslySetInnerHTML={{ __html: result.analysis }} />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/50 backdrop-blur-[2px]">
                                        <LockIcon size="lg" className="text-blue-400 mb-2" />
                                        <p className="text-white font-bold mb-1">Premium Analysis</p>
                                        <Link href="/pricing" className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-full transition-colors">
                                            Unlock Full Analysis
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <div dangerouslySetInnerHTML={{ __html: result.analysis }} />
                            )
                        ) : (
                            <p>No analysis available.</p>
                        )}
                    </div>
                </div>
            );
        }

        // 4. analyzeStock (Stock Analysis)
        if (toolName === 'analyzeStock') {
            if (result.error === 'QUOTA_EXCEEDED') {
                return <QuotaExceededCard message={result.message} limitType="STOCK" />;
            }
            if (result.error) {
                return <div className="text-sm text-red-400">❌ {result.error}</div>;
            }
            return (
                <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 border border-green-700/50 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">📈</span>
                            <div>
                                <h3 className="font-bold text-green-300">AI Stock Analysis (LONG-ONLY)</h3>
                                <p className="text-xs text-slate-400">
                                    {result.symbol} • {result.market} Market
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-900/60 rounded-lg p-4 text-sm text-slate-200 prose prose-invert prose-sm max-w-none relative overflow-hidden">
                        {result.analysis ? (
                            isLocked ? (
                                <div className="relative">
                                    <div className="blur-sm select-none" dangerouslySetInnerHTML={{ __html: result.analysis }} />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/50 backdrop-blur-[2px]">
                                        <LockIcon size="lg" className="text-green-400 mb-2" />
                                        <p className="text-white font-bold mb-1">Premium Stock Analysis</p>
                                        <Link href="/pricing" className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-4 py-2 rounded-full transition-colors">
                                            Unlock Full Analysis
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <div dangerouslySetInnerHTML={{ __html: result.analysis }} />
                            )
                        ) : (
                            <p>No analysis available.</p>
                        )}
                    </div>
                </div>
            );
        }

        // 5. getMLPrediction (ML Prediction via SmartPredictor)
        if (toolName === 'getMLPrediction') {
            if (result.error) {
                return <div className="text-sm text-red-400">❌ {result.error}</div>;
            }

            const directionColor =
                result.direction === 'UP' ? 'text-green-400' : result.direction === 'DOWN' ? 'text-red-400' : 'text-yellow-400';
            const confidenceColor = result.confidence >= 75 ? 'text-green-400' : result.confidence >= 60 ? 'text-yellow-400' : 'text-orange-400';

            return (
                <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-700/50 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">🤖</span>
                            <div>
                                <h3 className="font-bold text-purple-300">ML Prediction (SmartPredictor)</h3>
                                <p className="text-xs text-slate-400">{result.symbol} • {result.model}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className={`text-2xl font-bold ${directionColor}`}>{result.direction}</div>
                            <div className={`text-sm ${confidenceColor}`}>{result.confidence}% Confidence</div>
                        </div>
                    </div>

                    {/* Probabilities */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
                            <div className="text-xs text-slate-400 mb-1">UP</div>
                            <div className="text-lg font-bold text-green-400">{result.probabilities?.UP}%</div>
                        </div>
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
                            <div className="text-xs text-slate-400 mb-1">DOWN</div>
                            <div className="text-lg font-bold text-red-400">{result.probabilities?.DOWN}%</div>
                        </div>
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-center">
                            <div className="text-xs text-slate-400 mb-1">NEUTRAL</div>
                            <div className="text-lg font-bold text-yellow-400">{result.probabilities?.NEUTRAL}%</div>
                        </div>
                    </div>

                    {/* Signals */}
                    {result.signals && result.signals.length > 0 && (
                        <div className="bg-slate-900/60 rounded-lg p-3 space-y-1">
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Signals Breakdown</div>
                            {result.signals.map((s: any, i: number) => (
                                <div key={i} className="flex justify-between text-sm">
                                    <span className="text-slate-300">{s.name}</span>
                                    <span className={`font-semibold ${s.signal === 'BULLISH' ? 'text-green-400' : s.signal === 'BEARISH' ? 'text-red-400' : 'text-slate-500'}`}>
                                        {s.signal} ({s.weight})
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Trade Setup */}
                    {result.tradeSetup && result.tradeSetup.action !== 'WAIT' && (
                        <div className="bg-slate-900/60 rounded-lg p-3 relative overflow-hidden">
                            {/* BLUR OVERLAY FOR BASIC USERS */}
                            {isLocked && (
                                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-[3px]">
                                    <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 shadow-xl flex flex-col items-center">
                                        <LockIcon size="md" className="text-purple-400 mb-1" />
                                        <span className="text-xs font-bold text-white mb-2">Trade Setup Locked</span>
                                        <Link href="/pricing" className="bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full transition-colors">
                                            Upgrade to View
                                        </Link>
                                    </div>
                                </div>
                            )}

                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Trade Setup</div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-slate-400">Action:</span>{' '}
                                    <span className={`font-bold ${result.tradeSetup.action === 'LONG' ? 'text-green-400' : 'text-red-400'}`}>
                                        {result.tradeSetup.action}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400">Quality:</span>{' '}
                                    <span className="text-white font-bold">{result.tradeSetup.quality}</span>
                                </div>
                                {/* ENTRY - BLURRED IF LOCKED */}
                                <div className={isLocked ? "blur-sm select-none" : ""}>
                                    <span className="text-slate-400">Entry:</span> <span className="text-white">{result.tradeSetup.entry}</span>
                                </div>
                                {/* TP - BLURRED IF LOCKED */}
                                <div className={isLocked ? "blur-sm select-none" : ""}>
                                    <span className="text-slate-400">TP:</span> <span className="text-green-400">{result.tradeSetup.tp}</span>
                                </div>
                                {/* SL - BLURRED IF LOCKED */}
                                <div className={isLocked ? "blur-sm select-none" : ""}>
                                    <span className="text-slate-400">SL:</span> <span className="text-red-400">{result.tradeSetup.sl}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400">R:R:</span> <span className="text-blue-400">{result.tradeSetup.rr}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // 6. getSignalHistory (Signal Performance)
        if (toolName === 'getSignalHistory') {
            if (result.error) {
                return <div className="text-sm text-red-400">❌ {result.error}</div>;
            }
            return (
                <div className="bg-gradient-to-br from-amber-900/30 to-orange-900/30 border border-amber-700/50 rounded-xl p-5 space-y-3">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">🎯</span>
                        <div>
                            <h3 className="font-bold text-amber-300">Signal History</h3>
                            <p className="text-xs text-slate-400">Period: {result.period}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900/60 rounded-lg p-4">
                        <div className="text-center">
                            <div className="text-xs text-slate-400 mb-1">Total</div>
                            <div className="text-xl font-bold text-white">{result.total || 0}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs text-slate-400 mb-1">Win</div>
                            <div className="text-xl font-bold text-green-400">{result.wins || 0}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs text-slate-400 mb-1">Loss</div>
                            <div className="text-xl font-bold text-red-400">{result.losses || 0}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs text-slate-400 mb-1">Win Rate</div>
                            <div className="text-xl font-bold text-blue-400">{result.winRate ? `${result.winRate}%` : 'N/A'}</div>
                        </div>
                    </div>
                </div>
            );
        }

        // 7. getPortfolio (Portfolio Summary)
        if (toolName === 'getPortfolio') {
            if (result.error) {
                return <div className="text-sm text-red-400">❌ {result.error}</div>;
            }
            const { summary, positions } = result;
            const pnlColor = summary.unrealizedPL >= 0 ? 'text-green-400' : 'text-red-400';

            return (
                <div className="bg-gradient-to-br from-indigo-900/30 to-blue-900/30 border border-indigo-700/50 rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">💼</span>
                        <div>
                            <h3 className="font-bold text-indigo-300">Portfolio Summary</h3>
                            <p className="text-xs text-slate-400">{summary.openPositions} positions open</p>
                        </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-900/60 rounded-lg p-4">
                        <div className="text-center">
                            <div className="text-xs text-slate-400 mb-1">Total Equity</div>
                            <div className="text-lg font-bold text-white">${summary.totalEquity?.toFixed(2) || '0.00'}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs text-slate-400 mb-1">Unrealized P&L</div>
                            <div className={`text-lg font-bold ${pnlColor}`}>${summary.unrealizedPL?.toFixed(2) || '0.00'}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs text-slate-400 mb-1">Realized P&L</div>
                            <div className="text-lg font-bold text-blue-400">${summary.realizedPL?.toFixed(2) || '0.00'}</div>
                        </div>
                    </div>

                    {/* Positions Table */}
                    {positions && positions.length > 0 && (
                        <div className="bg-slate-900/60 rounded-lg p-4 overflow-x-auto">
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Open Positions</div>
                            <table className="w-full text-sm">
                                <thead className="text-xs text-slate-400 border-b border-slate-700">
                                    <tr>
                                        <th className="text-left pb-2">Symbol</th>
                                        <th className="text-left pb-2">Type</th>
                                        <th className="text-right pb-2">Entry</th>
                                        <th className="text-right pb-2">Current</th>
                                        <th className="text-right pb-2">P&L</th>
                                    </tr>
                                </thead>
                                <tbody className="text-slate-300">
                                    {positions.map((pos: any, i: number) => (
                                        <tr key={i} className="border-b border-slate-800 last:border-0">
                                            <td className="py-2 font-semibold">{pos.symbol}</td>
                                            <td className={`py-2 ${pos.direction === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>{pos.direction}</td>
                                            <td className="py-2 text-right">{pos.entry?.toFixed(2)}</td>
                                            <td className="py-2 text-right">{pos.current?.toFixed(2)}</td>
                                            <td className={`py-2 text-right font-semibold ${(pos.pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                ${pos.pnl?.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            );
        }

        // 8. getMarketHours (Market Status + Sessions)
        if (toolName === 'getMarketHours') {
            if (result.error) {
                return <div className="text-sm text-red-400">❌ {result.error}</div>;
            }
            return (
                <div className="bg-gradient-to-br from-cyan-900/30 to-teal-900/30 border border-cyan-700/50 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">⏰</span>
                            <div>
                                <h3 className="font-bold text-cyan-300">Market Hours</h3>
                                <p className="text-xs text-slate-400">{result.symbol} • {result.currentTimeWIB}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${result.isOpen ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {result.isOpen ? '✓ OPEN' : '✗ CLOSED'}
                            </div>
                            {!result.isOpen && result.nextOpen && (
                                <div className="text-xs text-slate-400 mt-1">Opens: {new Date(result.nextOpen).toLocaleString('id-ID')}</div>
                            )}
                        </div>
                    </div>

                    {/* Active Session */}
                    <div className="bg-slate-900/60 rounded-lg p-4">
                        <div className="text-sm font-semibold text-cyan-300 mb-2">Active Session</div>
                        <div className="text-2xl font-bold text-white">{result.activeSession}</div>
                    </div>

                    {/* Session Status */}
                    {result.sessions && result.sessions.length > 0 && (
                        <div className="bg-slate-900/60 rounded-lg p-4 space-y-2">
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Global Sessions</div>
                            {result.sessions.map((session: any, i: number) => (
                                <div key={i} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${session.active ? 'bg-green-400 animate-pulse' : 'bg-slate-600'}`} />
                                        <span className="text-slate-300">{session.name}</span>
                                    </div>
                                    <span className="text-slate-400 text-xs">{session.hours}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        // Fallback for unknown tools
        return (
            <div className="bg-slate-700/30 border border-slate-600/50 rounded-lg px-4 py-3 text-sm text-slate-300">
                <div className="font-semibold mb-1">🔧 {toolName}</div>
                <pre className="text-xs text-slate-400 overflow-auto">{JSON.stringify(result, null, 2)}</pre>
            </div>
        );
    }

    // Default fallback
    return (
        <div className="text-sm text-slate-500 italic">
            Tool invocation: {toolName} ({state})
        </div>
    );
}
