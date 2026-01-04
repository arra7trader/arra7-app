'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ChartIcon, CpuChipIcon, SearchIcon } from '@/components/PremiumIcons';

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

    if (status === 'unauthenticated') {
        router.push('/login?callbackUrl=/analisa-saham');
        return null;
    }

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
                <div className="w-10 h-10 border-2 border-[var(--accent-blue)] border-t-transparent rounded-full animate-spin" />
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

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pt-20">
            <div className="container-wide section-padding pt-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-10"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--border-light)] bg-white mb-6">
                        <ChartIcon className="text-[var(--accent-blue)]" size="lg" />
                        <span className="text-sm text-[var(--text-secondary)]">AI Stock Analysis</span>
                    </div>
                    <h1 className="text-3xl lg:text-4xl font-bold text-[var(--text-primary)] mb-3">
                        Analisa <span className="gradient-text">Saham Indonesia</span>
                    </h1>
                    <p className="text-[var(--text-secondary)]">
                        Analisa fundamental & teknikal saham IDX dengan AI
                    </p>
                </motion.div>

                {/* Quota Indicator */}
                {quota && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                        className="bg-white rounded-xl p-4 border border-[var(--border-light)] mb-6 max-w-2xl mx-auto"
                    >
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${quota.membership === 'VVIP'
                                    ? 'bg-amber-100 text-amber-700'
                                    : quota.membership === 'PRO'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-gray-100 text-gray-600'
                                    }`}>
                                    {quota.membership}
                                </div>
                                <span className="text-sm text-[var(--text-secondary)]">Quota Analisa Saham Hari Ini</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <div className="text-lg font-bold">
                                        {typeof quota.remaining === 'string' ? (
                                            <span className="text-amber-600">∞ Unlimited</span>
                                        ) : (
                                            <>
                                                <span className={quota.remaining > 0 ? 'text-green-600' : 'text-red-600'}>
                                                    {quota.remaining}
                                                </span>
                                                <span className="text-[var(--text-muted)]">/{quota.dailyLimit}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Search Box */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl p-6 border border-[var(--border-light)] mb-6 max-w-2xl mx-auto"
                >
                    <form onSubmit={handleSubmit} className="flex gap-4">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={symbol}
                                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                                placeholder="Masukkan kode saham (contoh: BBCA)"
                                className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-blue)] transition-colors uppercase"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading || !symbol.trim()}
                            className="btn-primary flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Mencari...
                                </>
                            ) : (
                                <>
                                    <SearchIcon size="md" />
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
                            className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 max-w-2xl mx-auto"
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
                            className="bg-white rounded-2xl p-6 border border-[var(--border-light)] mb-6 max-w-4xl mx-auto"
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">{stockData.symbol}</h2>
                                    <p className="text-[var(--text-secondary)]">{stockData.name}</p>
                                </div>
                                <div className="text-right mt-4 md:mt-0">
                                    <p className="text-3xl font-bold text-[var(--text-primary)]">
                                        Rp {stockData.currentPrice?.toLocaleString('id-ID')}
                                    </p>
                                    <p className={`text-lg font-semibold ${stockData.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {stockData.change >= 0 ? '+' : ''}{stockData.change?.toFixed(0)} ({stockData.changePercent >= 0 ? '+' : ''}{stockData.changePercent?.toFixed(2)}%)
                                    </p>
                                </div>
                            </div>

                            {/* Key Metrics */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="bg-[var(--bg-secondary)] rounded-xl p-4">
                                    <p className="text-sm text-[var(--text-muted)]">High 52 Week</p>
                                    <p className="text-lg font-semibold text-[var(--text-primary)]">Rp {stockData.high52Week?.toLocaleString('id-ID')}</p>
                                </div>
                                <div className="bg-[var(--bg-secondary)] rounded-xl p-4">
                                    <p className="text-sm text-[var(--text-muted)]">Low 52 Week</p>
                                    <p className="text-lg font-semibold text-[var(--text-primary)]">Rp {stockData.low52Week?.toLocaleString('id-ID')}</p>
                                </div>
                                <div className="bg-[var(--bg-secondary)] rounded-xl p-4">
                                    <p className="text-sm text-[var(--text-muted)]">Volume</p>
                                    <p className="text-lg font-semibold text-[var(--text-primary)]">{(stockData.volume / 1e6)?.toFixed(2)}M</p>
                                </div>
                                <div className="bg-[var(--bg-secondary)] rounded-xl p-4">
                                    <p className="text-sm text-[var(--text-muted)]">Market Cap</p>
                                    <p className="text-lg font-semibold text-[var(--text-primary)]">
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
                                        <CpuChipIcon size="md" /> Analisa dengan AI
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
                            className="bg-white rounded-2xl border border-[var(--border-light)] overflow-hidden max-w-4xl mx-auto"
                        >
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 border-b border-[var(--border-light)]">
                                <h3 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                                    <CpuChipIcon className="text-green-600" size="lg" />
                                    ARRA Institutional Research
                                </h3>
                            </div>
                            <div className="p-6">
                                <div
                                    className="stock-analysis-light"
                                    dangerouslySetInnerHTML={{ __html: formatStockAnalysis(analysis) }}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Light Theme Styles */}
            <style jsx global>{`
                .stock-analysis-light {
                    font-size: 14px;
                    line-height: 1.7;
                    color: #1d1d1f;
                }
                
                .stock-analysis-light .section {
                    margin-bottom: 20px;
                    padding: 16px;
                    background: #f5f5f7;
                    border-radius: 12px;
                    border: 1px solid rgba(0,0,0,0.05);
                }
                
                .stock-analysis-light .section-title {
                    font-size: 16px;
                    font-weight: 700;
                    margin-bottom: 12px;
                    padding-bottom: 8px;
                    border-bottom: 1px solid rgba(0,0,0,0.08);
                    color: #1d1d1f;
                }
                
                .stock-analysis-light .verdict-box {
                    background: linear-gradient(135deg, #059669 0%, #10B981 100%);
                    padding: 16px 24px;
                    border-radius: 12px;
                    text-align: center;
                    margin: 16px 0;
                }
                
                .stock-analysis-light .verdict-box.sell {
                    background: linear-gradient(135deg, #DC2626 0%, #EF4444 100%);
                }
                
                .stock-analysis-light .verdict-box.hold {
                    background: linear-gradient(135deg, #D97706 0%, #F59E0B 100%);
                }
                
                .stock-analysis-light .verdict-text {
                    font-size: 24px;
                    font-weight: 800;
                    color: white;
                }
                
                .stock-analysis-light .score-box {
                    display: inline-flex;
                    background: linear-gradient(135deg, #0071e3 0%, #00c7be 100%);
                    padding: 12px 20px;
                    border-radius: 12px;
                    font-size: 20px;
                    font-weight: 700;
                    color: white;
                    margin: 8px 0;
                }
                
                .stock-analysis-light .bullish { color: #16a34a; }
                .stock-analysis-light .bearish { color: #dc2626; }
                .stock-analysis-light .neutral { color: #d97706; }
                
                .stock-analysis-light .bottom-line {
                    background: rgba(0, 113, 227, 0.08);
                    padding: 16px;
                    border-radius: 12px;
                    border-left: 4px solid #0071e3;
                }
                
                .stock-analysis-light .disclaimer {
                    font-size: 12px;
                    color: #86868b;
                    font-style: italic;
                    margin-top: 16px;
                    padding-top: 16px;
                    border-top: 1px solid rgba(0,0,0,0.08);
                }
            `}</style>
        </div>
    );
}

function formatStockAnalysis(text: string): string {
    let html = text;
    html = html.replace(/\*\*/g, '');
    html = html.replace(/\*/g, '');
    html = html.replace(/`/g, '');

    html = html.replace(/📊 OVERALL SCORE:\s*(\d+)\/10/gi, '<div class="section"><div class="score-box">📊 OVERALL SCORE: $1/10</div></div>');

    const isSell = /SELL/i.test(html) && !/BUY/i.test(html);
    const isHold = /HOLD/i.test(html) && !/BUY/i.test(html) && !/SELL/i.test(html);
    const verdictClass = isSell ? 'sell' : isHold ? 'hold' : '';

    html = html.replace(/🚀\s*(STRONG BUY|BUY|HOLD|SELL|STRONG SELL)/gi, `<div class="verdict-box ${verdictClass}"><div class="verdict-text">🚀 $1</div></div>`);

    html = html.replace(/🏢 COMPANY SNAPSHOT/gi, '<div class="section"><div class="section-title">🏢 Company Snapshot</div>');
    html = html.replace(/📊 FUNDAMENTAL SCORECARD/gi, '<div class="section"><div class="section-title">📊 Fundamental Scorecard</div>');
    html = html.replace(/📈 TECHNICAL OUTLOOK/gi, '<div class="section"><div class="section-title">📈 Technical Outlook</div>');
    html = html.replace(/🎯 VERDICT & ACTION/gi, '<div class="section"><div class="section-title">🎯 Verdict & Action</div>');
    html = html.replace(/💡 INVESTMENT THESIS/gi, '<div class="section"><div class="section-title">💡 Investment Thesis</div>');
    html = html.replace(/⚠️ KEY RISKS/gi, '<div class="section"><div class="section-title">⚠️ Key Risks</div>');
    html = html.replace(/📌 BOTTOM LINE/gi, '<div class="section"><div class="section-title">📌 Bottom Line</div><div class="bottom-line">');

    html = html.replace(/🟢\s*BULLISH/gi, '<span class="bullish">🟢 BULLISH</span>');
    html = html.replace(/🔴\s*BEARISH/gi, '<span class="bearish">🔴 BEARISH</span>');
    html = html.replace(/🟡\s*SIDEWAYS/gi, '<span class="neutral">🟡 SIDEWAYS</span>');

    html = html.replace(/━+/g, '');
    html = html.replace(/⚠️\s*_?Disclaimer:?\s*(.*?)_?$/gim, '</div><div class="disclaimer">⚠️ Disclaimer: $1</div>');
    html = html.replace(/\n\n/g, '</div><div class="section">');
    html = html.replace(/\n/g, '<br>');
    html = html.replace(/<div class="section"><\/div>/g, '');

    return html;
}
