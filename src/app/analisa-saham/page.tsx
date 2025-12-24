'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface StockData {
    symbol: string;
    name: string;
    currentPrice: number;
    previousClose: number;
    change: number;
    changePercent: number;
    high52Week: number;
    low52Week: number;
    volume: number;
    avgVolume: number;
    marketCap: number;
    historicalData: Array<{ date: string; close: number }>;
}

interface QuotaStatus {
    membership: string;
    dailyLimit: number | string;
    used: number;
    remaining: number | string;
    canAnalyze: boolean;
}

export default function AnalisaSahamPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [symbol, setSymbol] = useState('');
    const [stockData, setStockData] = useState<StockData | null>(null);
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [quota, setQuota] = useState<QuotaStatus | null>(null);

    // Fetch quota on mount and after analysis
    const fetchQuota = async () => {
        try {
            const res = await fetch('/api/stock/quota');
            const data = await res.json();
            if (data.status === 'success') {
                setQuota(data.data);
            }
        } catch (err) {
            console.error('Failed to fetch quota:', err);
        }
    };

    useEffect(() => {
        if (session?.user) {
            fetchQuota();
        }
    }, [session]);

    // Redirect if not authenticated
    if (status === 'unauthenticated') {
        router.push('/login?callbackUrl=/analisa-saham');
        return null;
    }

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const fetchStockData = async (stockSymbol: string) => {
        setLoading(true);
        setError(null);
        setAnalysis(null);
        setStockData(null);

        try {
            const res = await fetch(`/api/stock/data?symbol=${stockSymbol}`);
            const data = await res.json();

            if (data.status === 'success') {
                setStockData(data.data);
            } else {
                setError(data.message || 'Gagal mengambil data saham');
            }
        } catch (err) {
            setError('Gagal mengambil data saham. Coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    const analyzeStock = async () => {
        if (!stockData) return;

        setAnalyzing(true);
        setError(null);

        try {
            const res = await fetch('/api/stock/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol: stockData.symbol, stockData }),
            });

            const data = await res.json();

            if (data.status === 'success') {
                setAnalysis(data.analysis);
                // Refresh quota after successful analysis
                fetchQuota();
            } else {
                setError(data.message || 'Gagal menganalisa saham');
            }
        } catch (err) {
            setError('Gagal menganalisa saham. Coba lagi.');
        } finally {
            setAnalyzing(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (symbol.trim()) {
            fetchStockData(symbol.trim());
        }
    };

    const handleQuickSelect = (stockSymbol: string) => {
        setSymbol(stockSymbol);
        fetchStockData(stockSymbol);
    };

    return (
        <div className="relative min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8">
            {/* Background */}
            <div className="absolute inset-0 bg-grid opacity-20" />
            <div className="bg-orb bg-orb-blue w-[600px] h-[600px] -top-40 left-1/4 opacity-20" />
            <div className="bg-orb bg-orb-purple w-[500px] h-[500px] bottom-0 right-1/4 opacity-15" />

            <div className="relative max-w-4xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-10"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#1F2937] bg-[#12141A]/50 backdrop-blur-sm mb-6">
                        <span className="text-xl">📊</span>
                        <span className="text-sm text-[#94A3B8]">AI Stock Analysis</span>
                    </div>
                    <h1 className="text-3xl lg:text-4xl font-bold mb-3">
                        Analisa <span className="gradient-text">Saham Indonesia</span>
                    </h1>
                    <p className="text-[#94A3B8]">
                        Analisa fundamental & teknikal saham IDX dengan AI
                    </p>
                </motion.div>

                {/* Quota Indicator */}
                {quota && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                        className="glass rounded-xl p-4 border border-[#1F2937] mb-6"
                    >
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${quota.membership === 'VVIP'
                                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                        : quota.membership === 'PRO'
                                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                            : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                                    }`}>
                                    {quota.membership}
                                </div>
                                <span className="text-sm text-[#94A3B8]">Quota Analisa Saham Hari Ini</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <div className="text-lg font-bold">
                                        {typeof quota.remaining === 'string' ? (
                                            <span className="text-amber-400">∞ Unlimited</span>
                                        ) : (
                                            <>
                                                <span className={quota.remaining > 0 ? 'text-green-400' : 'text-red-400'}>
                                                    {quota.remaining}
                                                </span>
                                                <span className="text-[#64748B]">/{quota.dailyLimit}</span>
                                            </>
                                        )}
                                    </div>
                                    <div className="text-xs text-[#64748B]">
                                        {typeof quota.remaining === 'string'
                                            ? 'Analisa tanpa batas'
                                            : `${quota.used} sudah digunakan`
                                        }
                                    </div>
                                </div>
                                {typeof quota.dailyLimit === 'number' && (
                                    <div className="w-24 h-2 bg-[#1F2937] rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${quota.remaining === 0
                                                    ? 'bg-red-500'
                                                    : (quota.used / quota.dailyLimit) > 0.7
                                                        ? 'bg-yellow-500'
                                                        : 'bg-green-500'
                                                }`}
                                            style={{
                                                width: `${Math.max(0, 100 - (quota.used / quota.dailyLimit * 100))}%`
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Search Box */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass rounded-2xl p-6 border border-[#1F2937] mb-6"
                >
                    <form onSubmit={handleSubmit} className="flex gap-4">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={symbol}
                                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                                placeholder="Masukkan kode saham (contoh: BBCA)"
                                className="w-full px-4 py-3 bg-[#12141A] border border-[#1F2937] rounded-xl text-white placeholder-[#64748B] focus:outline-none focus:border-blue-500 transition-colors uppercase"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading || !symbol.trim()}
                            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-xl disabled:opacity-50 hover:shadow-lg hover:shadow-blue-500/25 transition-all flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Mencari...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    Cari
                                </>
                            )}
                        </button>
                    </form>
                </motion.div>

                {/* Error */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400"
                        >
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Stock Data */}
                <AnimatePresence>
                    {stockData && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass rounded-2xl p-6 border border-[#1F2937] mb-6"
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold">{stockData.symbol}</h2>
                                    <p className="text-[#94A3B8]">{stockData.name}</p>
                                </div>
                                <div className="text-right mt-4 md:mt-0">
                                    <p className="text-3xl font-bold">
                                        Rp {stockData.currentPrice?.toLocaleString('id-ID')}
                                    </p>
                                    <p className={`text-lg font-semibold ${stockData.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {stockData.change >= 0 ? '+' : ''}{stockData.change?.toFixed(0)} ({stockData.changePercent >= 0 ? '+' : ''}{stockData.changePercent?.toFixed(2)}%)
                                    </p>
                                </div>
                            </div>

                            {/* Key Metrics */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="bg-[#12141A] rounded-xl p-4">
                                    <p className="text-sm text-[#64748B]">High 52 Week</p>
                                    <p className="text-lg font-semibold">Rp {stockData.high52Week?.toLocaleString('id-ID')}</p>
                                </div>
                                <div className="bg-[#12141A] rounded-xl p-4">
                                    <p className="text-sm text-[#64748B]">Low 52 Week</p>
                                    <p className="text-lg font-semibold">Rp {stockData.low52Week?.toLocaleString('id-ID')}</p>
                                </div>
                                <div className="bg-[#12141A] rounded-xl p-4">
                                    <p className="text-sm text-[#64748B]">Volume</p>
                                    <p className="text-lg font-semibold">{(stockData.volume / 1e6)?.toFixed(2)}M</p>
                                </div>
                                <div className="bg-[#12141A] rounded-xl p-4">
                                    <p className="text-sm text-[#64748B]">Market Cap</p>
                                    <p className="text-lg font-semibold">
                                        {stockData.marketCap ? `Rp ${(stockData.marketCap / 1e12).toFixed(2)}T` : 'N/A'}
                                    </p>
                                </div>
                            </div>

                            {/* Analyze Button */}
                            <button
                                onClick={analyzeStock}
                                disabled={analyzing}
                                className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl disabled:opacity-50 hover:shadow-lg hover:shadow-green-500/25 transition-all flex items-center justify-center gap-2"
                            >
                                {analyzing ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        AI Sedang Menganalisa...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                        </svg>
                                        🤖 Analisa Market Saham Indonesia
                                    </>
                                )}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Analysis Result */}
                <AnimatePresence>
                    {analysis && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass rounded-2xl border border-[#1F2937] overflow-hidden"
                        >
                            {/* Header */}
                            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 p-4 border-b border-[#1F2937]">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <span className="text-2xl">🤖</span>
                                    ARRA Institutional Research
                                </h3>
                            </div>

                            {/* Analysis Content */}
                            <div className="p-6">
                                <div
                                    className="stock-analysis-content"
                                    dangerouslySetInnerHTML={{
                                        __html: formatStockAnalysis(analysis)
                                    }}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Custom Styles for Stock Analysis */}
            <style jsx global>{`
                .stock-analysis-content {
                    font-size: 14px;
                    line-height: 1.7;
                    color: #E2E8F0;
                }
                
                .stock-analysis-content .section {
                    margin-bottom: 20px;
                    padding: 16px;
                    background: #12141A;
                    border-radius: 12px;
                    border: 1px solid #1F2937;
                }
                
                .stock-analysis-content .section-title {
                    font-size: 16px;
                    font-weight: 700;
                    margin-bottom: 12px;
                    padding-bottom: 8px;
                    border-bottom: 1px solid #1F2937;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .stock-analysis-content .verdict-box {
                    background: linear-gradient(135deg, #059669 0%, #10B981 100%);
                    padding: 16px 24px;
                    border-radius: 12px;
                    text-align: center;
                    margin: 16px 0;
                }
                
                .stock-analysis-content .verdict-box.sell {
                    background: linear-gradient(135deg, #DC2626 0%, #EF4444 100%);
                }
                
                .stock-analysis-content .verdict-box.hold {
                    background: linear-gradient(135deg, #D97706 0%, #F59E0B 100%);
                }
                
                .stock-analysis-content .verdict-text {
                    font-size: 24px;
                    font-weight: 800;
                    color: white;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
                
                .stock-analysis-content .score-box {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%);
                    padding: 12px 20px;
                    border-radius: 12px;
                    font-size: 20px;
                    font-weight: 700;
                    color: white;
                    margin: 8px 0;
                }
                
                .stock-analysis-content .metric-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 12px;
                    margin: 12px 0;
                }
                
                .stock-analysis-content .metric-item {
                    background: #1A1D24;
                    padding: 12px;
                    border-radius: 8px;
                    border: 1px solid #1F2937;
                }
                
                .stock-analysis-content .metric-label {
                    font-size: 12px;
                    color: #64748B;
                    margin-bottom: 4px;
                }
                
                .stock-analysis-content .metric-value {
                    font-size: 14px;
                    font-weight: 600;
                    color: #E2E8F0;
                }
                
                .stock-analysis-content .stars {
                    color: #F59E0B;
                }
                
                .stock-analysis-content .bullish {
                    color: #10B981;
                }
                
                .stock-analysis-content .bearish {
                    color: #EF4444;
                }
                
                .stock-analysis-content .neutral {
                    color: #F59E0B;
                }
                
                .stock-analysis-content ul {
                    list-style: none;
                    padding: 0;
                    margin: 8px 0;
                }
                
                .stock-analysis-content li {
                    padding: 6px 0;
                    padding-left: 20px;
                    position: relative;
                }
                
                .stock-analysis-content li::before {
                    content: "•";
                    position: absolute;
                    left: 0;
                    color: #3B82F6;
                }
                
                .stock-analysis-content .risk-item::before {
                    content: "⚠️";
                }
                
                .stock-analysis-content .thesis-item::before {
                    content: "💡";
                }
                
                .stock-analysis-content .action-table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0;
                    margin: 12px 0;
                }
                
                .stock-analysis-content .action-table th,
                .stock-analysis-content .action-table td {
                    padding: 10px 12px;
                    text-align: left;
                    border-bottom: 1px solid #1F2937;
                }
                
                .stock-analysis-content .action-table th {
                    background: #1A1D24;
                    font-weight: 600;
                    color: #94A3B8;
                    font-size: 12px;
                    text-transform: uppercase;
                }
                
                .stock-analysis-content .action-table tr:last-child td {
                    border-bottom: none;
                }
                
                .stock-analysis-content .highlight {
                    background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    font-weight: 700;
                }
                
                .stock-analysis-content .bottom-line {
                    background: linear-gradient(135deg, #1E3A5F 0%, #1E293B 100%);
                    padding: 16px;
                    border-radius: 12px;
                    border-left: 4px solid #3B82F6;
                    font-weight: 500;
                }
                
                .stock-analysis-content .disclaimer {
                    font-size: 12px;
                    color: #64748B;
                    font-style: italic;
                    margin-top: 16px;
                    padding-top: 16px;
                    border-top: 1px solid #1F2937;
                }
            `}</style>
        </div>
    );
}

// Function to format analysis text to HTML
function formatStockAnalysis(text: string): string {
    let html = text;

    // Clean markdown
    html = html.replace(/\*\*/g, '');
    html = html.replace(/\*/g, '');
    html = html.replace(/`/g, '');

    // Overall Score
    html = html.replace(
        /📊 OVERALL SCORE:\s*(\d+)\/10/gi,
        '<div class="section"><div class="score-box">📊 OVERALL SCORE: $1/10</div></div>'
    );

    // Verdict detection
    const isSell = /SELL/i.test(html) && !/BUY/i.test(html);
    const isHold = /HOLD/i.test(html) && !/BUY/i.test(html) && !/SELL/i.test(html);
    const verdictClass = isSell ? 'sell' : isHold ? 'hold' : '';

    // Verdict box
    html = html.replace(
        /🚀\s*(STRONG BUY|BUY|HOLD|SELL|STRONG SELL)/gi,
        `<div class="verdict-box ${verdictClass}"><div class="verdict-text">🚀 $1</div></div>`
    );

    // Section headers
    html = html.replace(/🏢 COMPANY SNAPSHOT/gi, '<div class="section"><div class="section-title">🏢 Company Snapshot</div>');
    html = html.replace(/📊 FUNDAMENTAL SCORECARD/gi, '<div class="section"><div class="section-title">📊 Fundamental Scorecard</div>');
    html = html.replace(/📈 TECHNICAL OUTLOOK/gi, '<div class="section"><div class="section-title">📈 Technical Outlook</div>');
    html = html.replace(/🎯 VERDICT & ACTION/gi, '<div class="section"><div class="section-title">🎯 Verdict & Action</div>');
    html = html.replace(/💡 INVESTMENT THESIS/gi, '<div class="section"><div class="section-title">💡 Investment Thesis</div>');
    html = html.replace(/⚠️ KEY RISKS/gi, '<div class="section"><div class="section-title">⚠️ Key Risks</div>');
    html = html.replace(/📌 BOTTOM LINE/gi, '<div class="section"><div class="section-title">📌 Bottom Line</div><div class="bottom-line">');

    // Stars
    html = html.replace(/⭐/g, '<span class="stars">⭐</span>');

    // Trend colors
    html = html.replace(/🟢\s*BULLISH/gi, '<span class="bullish">🟢 BULLISH</span>');
    html = html.replace(/🔴\s*BEARISH/gi, '<span class="bearish">🔴 BEARISH</span>');
    html = html.replace(/🟡\s*SIDEWAYS/gi, '<span class="neutral">🟡 SIDEWAYS</span>');

    // Clean separators
    html = html.replace(/━+/g, '');

    // Disclaimer
    html = html.replace(
        /⚠️\s*_?Disclaimer:?\s*(.*?)_?$/gim,
        '</div><div class="disclaimer">⚠️ Disclaimer: $1</div>'
    );

    // Close sections properly
    html = html.replace(/\n\n/g, '</div><div class="section">');

    // Line breaks
    html = html.replace(/\n/g, '<br>');

    // Clean up empty sections
    html = html.replace(/<div class="section"><\/div>/g, '');
    html = html.replace(/<div class="section"><br>/g, '<div class="section">');

    return html;
}
