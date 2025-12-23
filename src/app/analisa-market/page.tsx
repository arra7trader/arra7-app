'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

// Pair Categories with icons
const PAIR_CATEGORIES = [
    {
        id: 'major',
        name: 'Forex Major',
        icon: '💱',
        pairs: [
            { value: 'EURUSD', label: 'EUR/USD' },
            { value: 'GBPUSD', label: 'GBP/USD' },
            { value: 'USDJPY', label: 'USD/JPY' },
            { value: 'USDCHF', label: 'USD/CHF' },
            { value: 'AUDUSD', label: 'AUD/USD' },
            { value: 'USDCAD', label: 'USD/CAD' },
            { value: 'NZDUSD', label: 'NZD/USD' },
        ],
    },
    {
        id: 'minor',
        name: 'Forex Minor',
        icon: '📊',
        pairs: [
            { value: 'EURGBP', label: 'EUR/GBP' },
            { value: 'EURJPY', label: 'EUR/JPY' },
            { value: 'GBPJPY', label: 'GBP/JPY' },
            { value: 'EURCHF', label: 'EUR/CHF' },
            { value: 'EURAUD', label: 'EUR/AUD' },
            { value: 'EURCAD', label: 'EUR/CAD' },
            { value: 'GBPCHF', label: 'GBP/CHF' },
            { value: 'GBPAUD', label: 'GBP/AUD' },
            { value: 'AUDJPY', label: 'AUD/JPY' },
            { value: 'CADJPY', label: 'CAD/JPY' },
            { value: 'CHFJPY', label: 'CHF/JPY' },
            { value: 'NZDJPY', label: 'NZD/JPY' },
            { value: 'AUDCAD', label: 'AUD/CAD' },
            { value: 'AUDCHF', label: 'AUD/CHF' },
            { value: 'AUDNZD', label: 'AUD/NZD' },
            { value: 'EURNZD', label: 'EUR/NZD' },
            { value: 'GBPCAD', label: 'GBP/CAD' },
            { value: 'GBPNZD', label: 'GBP/NZD' },
        ],
    },
    {
        id: 'commodities',
        name: 'Komoditas',
        icon: '🥇',
        pairs: [
            { value: 'XAUUSD', label: 'XAU/USD (Gold)' },
            { value: 'XAGUSD', label: 'XAG/USD (Silver)' },
            { value: 'XPTUSD', label: 'XPT/USD (Platinum)' },
            { value: 'XPDUSD', label: 'XPD/USD (Palladium)' },
            { value: 'XTIUSD', label: 'WTI Oil' },
            { value: 'XBRUSD', label: 'Brent Oil' },
            { value: 'XNGUSD', label: 'Natural Gas' },
            { value: 'XCUUSD', label: 'Copper' },
        ],
    },
    {
        id: 'crypto',
        name: 'Crypto',
        icon: '₿',
        pairs: [
            { value: 'BTCUSD', label: 'BTC/USD' },
            { value: 'ETHUSD', label: 'ETH/USD' },
            { value: 'XRPUSD', label: 'XRP/USD' },
            { value: 'SOLUSD', label: 'SOL/USD' },
            { value: 'BNBUSD', label: 'BNB/USD' },
            { value: 'ADAUSD', label: 'ADA/USD' },
            { value: 'DOGEUSD', label: 'DOGE/USD' },
            { value: 'DOTUSD', label: 'DOT/USD' },
            { value: 'MATICUSD', label: 'MATIC/USD' },
            { value: 'LINKUSD', label: 'LINK/USD' },
            { value: 'AVAXUSD', label: 'AVAX/USD' },
            { value: 'LTCUSD', label: 'LTC/USD' },
        ],
    },
    {
        id: 'indices',
        name: 'Indices',
        icon: '📈',
        pairs: [
            { value: 'US30', label: 'US30 (Dow Jones)' },
            { value: 'US500', label: 'US500 (S&P 500)' },
            { value: 'USTEC', label: 'USTEC (Nasdaq)' },
            { value: 'DE40', label: 'DE40 (DAX)' },
            { value: 'UK100', label: 'UK100 (FTSE)' },
            { value: 'JP225', label: 'JP225 (Nikkei)' },
        ],
    },
];

const TIMEFRAMES = [
    { value: '1m', label: 'M1', description: '1 Minute' },
    { value: '5m', label: 'M5', description: '5 Minutes' },
    { value: '15m', label: 'M15', description: '15 Minutes' },
    { value: '30m', label: 'M30', description: '30 Minutes' },
    { value: '1h', label: 'H1', description: '1 Hour' },
    { value: '4h', label: 'H4', description: '4 Hours' },
    { value: '1d', label: 'D1', description: 'Daily' },
];

interface MarketInfo {
    symbol: string;
    name: string;
    price: number;
    change: number;
    isRealtime: boolean;
}

interface QuotaStatus {
    membership: string;
    dailyLimit: number;
    used: number;
    remaining: number;
    canAnalyze: boolean;
    allowedTimeframes: string[];
}

export default function AnalisaMarketPage() {
    const { data: session, status } = useSession();
    const t = useTranslations('analisaMarket');
    const router = useRouter();

    const [selectedCategory, setSelectedCategory] = useState('commodities');
    const [selectedPair, setSelectedPair] = useState('XAUUSD');
    const [selectedTimeframe, setSelectedTimeframe] = useState('1h');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [marketInfo, setMarketInfo] = useState<MarketInfo | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [newsHtml, setNewsHtml] = useState<string>('');
    const [quotaStatus, setQuotaStatus] = useState<QuotaStatus | null>(null);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login?callbackUrl=/analisa-market');
        }
    }, [status, router]);

    useEffect(() => {
        fetchNews();
        fetchQuota();
    }, []);

    const fetchQuota = async () => {
        try {
            const res = await fetch('/api/user/quota');
            const data = await res.json();
            if (data.status === 'success') {
                setQuotaStatus(data.quota);
            }
        } catch (err) {
            console.error('Quota fetch error:', err);
        }
    };

    // Get current category pairs
    const currentCategory = PAIR_CATEGORIES.find(c => c.id === selectedCategory);
    const currentPairs = currentCategory?.pairs || [];

    const fetchNews = async () => {
        try {
            const res = await fetch('/api/news');
            const data = await res.json();
            if (data.status === 'success') {
                setNewsHtml(data.html);
            }
        } catch (err) {
            console.error('News fetch error:', err);
        }
    };

    const handleCategoryChange = (categoryId: string) => {
        setSelectedCategory(categoryId);
        const category = PAIR_CATEGORIES.find(c => c.id === categoryId);
        if (category && category.pairs.length > 0) {
            setSelectedPair(category.pairs[0].value);
        }
    };

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        setError(null);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    pair: selectedPair,
                    timeframe: selectedTimeframe,
                }),
            });

            const data = await response.json();

            if (data.status === 'success') {
                setAnalysisResult(data.result);
                setMarketInfo(data.marketInfo);
                // Update quota status after successful analysis
                if (data.quotaStatus) {
                    setQuotaStatus(data.quotaStatus);
                } else {
                    fetchQuota();
                }
            } else {
                setError(data.message || 'Analysis failed');
                // Update quota status if provided in error response
                if (data.quotaStatus) {
                    setQuotaStatus(data.quotaStatus);
                }
            }
        } catch (err) {
            setError('Network error. Please try again.');
            console.error('Analysis error:', err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!session) {
        return null;
    }

    return (
        <div className="relative min-h-screen pt-24 lg:pt-28 pb-12 px-4 sm:px-6 lg:px-8">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-grid opacity-20" />
            <div className="bg-orb bg-orb-blue w-[500px] h-[500px] -top-20 -right-40 opacity-20" />
            <div className="bg-orb bg-orb-purple w-[400px] h-[400px] bottom-0 -left-20 opacity-20" />

            <div className="relative max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                            <span className="text-xl">🔮</span>
                        </div>
                        <div>
                            <h1 className="text-2xl lg:text-3xl font-bold">{t('title')}</h1>
                            <p className="text-sm text-[#64748B]">
                                {t('welcome')}, <span className="text-[#94A3B8]">{session.user?.name}</span>
                            </p>
                        </div>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Panel - Controls */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="lg:col-span-1 space-y-4"
                    >
                        {/* Category Tabs */}
                        <div className="glass rounded-2xl p-4 border border-[#1F2937]">
                            <h3 className="text-sm font-medium text-[#94A3B8] mb-3 flex items-center gap-2">
                                <span>📁</span> Kategori
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {PAIR_CATEGORIES.map((category) => (
                                    <button
                                        key={category.id}
                                        onClick={() => handleCategoryChange(category.id)}
                                        className={`
                      flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
                      ${selectedCategory === category.id
                                                ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/50 text-white'
                                                : 'bg-[#12141A] border-[#1F2937] text-[#64748B] hover:text-white hover:border-[#374151]'
                                            }
                      border
                    `}
                                    >
                                        <span>{category.icon}</span>
                                        <span className="hidden sm:inline">{category.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Pair Selection Grid */}
                        <div className="glass rounded-2xl p-4 border border-[#1F2937]">
                            <h3 className="text-sm font-medium text-[#94A3B8] mb-3 flex items-center gap-2">
                                <span>{currentCategory?.icon}</span> {currentCategory?.name} Pairs
                                <span className="text-xs text-[#64748B]">({currentPairs.length})</span>
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2 max-h-[280px] overflow-y-auto pr-1">
                                {currentPairs.map((pair) => (
                                    <button
                                        key={pair.value}
                                        onClick={() => setSelectedPair(pair.value)}
                                        className={`
                      px-3 py-2 rounded-lg text-xs font-medium transition-all text-left truncate
                      ${selectedPair === pair.value
                                                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/20'
                                                : 'bg-[#12141A] border border-[#1F2937] text-[#94A3B8] hover:border-[#374151] hover:text-white'
                                            }
                    `}
                                        title={pair.label}
                                    >
                                        {pair.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Timeframe Selection */}
                        <div className="glass rounded-2xl p-4 border border-[#1F2937]">
                            <h3 className="text-sm font-medium text-[#94A3B8] mb-3 flex items-center gap-2">
                                <span>⏳</span> Timeframe
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {TIMEFRAMES.map((tf) => (
                                    <button
                                        key={tf.value}
                                        onClick={() => setSelectedTimeframe(tf.value)}
                                        className={`
                      px-4 py-2 rounded-lg text-sm font-medium transition-all
                      ${selectedTimeframe === tf.value
                                                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/25'
                                                : 'bg-[#12141A] border border-[#1F2937] text-[#94A3B8] hover:border-[#374151] hover:text-white'
                                            }
                    `}
                                    >
                                        {tf.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Selected Pair Display */}
                        <div className="glass rounded-2xl p-4 border border-[#1F2937]">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm text-[#64748B]">Trading:</span>
                                <span className="text-lg font-bold gradient-text">{selectedPair}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-[#64748B]">Timeframe:</span>
                                <span className="text-white font-medium">{selectedTimeframe.toUpperCase()}</span>
                            </div>
                        </div>

                        {/* Quota Status */}
                        {quotaStatus && (
                            <div className={`rounded-2xl p-4 border ${quotaStatus.membership === 'VVIP'
                                    ? 'bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30'
                                    : quotaStatus.membership === 'PRO'
                                        ? 'bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30'
                                        : 'glass border-[#1F2937]'
                                }`}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-[#94A3B8]">📊 Quota Hari Ini</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${quotaStatus.membership === 'VVIP'
                                            ? 'bg-amber-500/20 text-amber-400'
                                            : quotaStatus.membership === 'PRO'
                                                ? 'bg-blue-500/20 text-blue-400'
                                                : 'bg-slate-500/20 text-slate-400'
                                        }`}>
                                        {quotaStatus.membership}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-[#1F2937] rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all ${quotaStatus.remaining === 0
                                                    ? 'bg-red-500'
                                                    : quotaStatus.membership === 'VVIP'
                                                        ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                                                        : 'bg-gradient-to-r from-blue-500 to-purple-500'
                                                }`}
                                            style={{
                                                width: quotaStatus.dailyLimit === Infinity
                                                    ? '100%'
                                                    : `${Math.min(100, (quotaStatus.used / quotaStatus.dailyLimit) * 100)}%`
                                            }}
                                        />
                                    </div>
                                    <span className="text-sm font-mono text-white">
                                        {quotaStatus.dailyLimit === Infinity
                                            ? '∞'
                                            : `${quotaStatus.used}/${quotaStatus.dailyLimit}`
                                        }
                                    </span>
                                </div>
                                {quotaStatus.membership === 'BASIC' && quotaStatus.remaining <= 1 && (
                                    <a
                                        href="/pricing"
                                        className="mt-3 block text-center text-xs text-blue-400 hover:text-blue-300 underline"
                                    >
                                        ⚡ Upgrade untuk lebih banyak analisa
                                    </a>
                                )}
                            </div>
                        )}

                        {/* Analyze Button */}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleAnalyze}
                            disabled={isAnalyzing}
                            className={`
                w-full py-4 rounded-xl font-semibold text-lg transition-all
                ${isAnalyzing
                                    ? 'bg-[#1F2937] text-[#64748B] cursor-not-allowed'
                                    : 'glow-button text-white'
                                }
              `}
                        >
                            {isAnalyzing ? (
                                <span className="flex items-center justify-center gap-3">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Analyzing...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <span>🚀</span> Analisa Market
                                </span>
                            )}
                        </motion.button>

                        {/* Market Info */}
                        {marketInfo && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass rounded-2xl p-4 border border-[#1F2937]"
                            >
                                <h3 className="text-sm font-medium text-[#94A3B8] mb-3">📊 Market Info</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-[#64748B]">Symbol</span>
                                        <span className="font-medium">{marketInfo.symbol}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[#64748B]">Price</span>
                                        <span className="font-mono font-medium">{marketInfo.price.toFixed(5)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[#64748B]">Change</span>
                                        <span className={`font-medium ${marketInfo.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {marketInfo.change >= 0 ? '+' : ''}{marketInfo.change.toFixed(4)}%
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[#64748B]">Data</span>
                                        <span className={`text-xs px-2 py-0.5 rounded ${marketInfo.isRealtime ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                            {marketInfo.isRealtime ? 'LIVE' : 'DELAYED'}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* News */}
                        <div className="glass rounded-2xl p-4 border border-[#1F2937]">
                            <h3 className="text-sm font-medium text-[#94A3B8] mb-3 flex items-center gap-2">
                                <span>📰</span> Economic News
                            </h3>
                            <div
                                className="text-sm space-y-1 max-h-32 overflow-y-auto"
                                dangerouslySetInnerHTML={{ __html: newsHtml || 'Loading...' }}
                            />
                        </div>
                    </motion.div>

                    {/* Right Panel - Analysis Result */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="lg:col-span-2"
                    >
                        <div className="glass rounded-2xl p-6 border border-[#1F2937] min-h-[600px]">
                            <AnimatePresence mode="wait">
                                {error ? (
                                    <motion.div
                                        key="error"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex flex-col items-center justify-center h-full py-20"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                                            <span className="text-2xl">❌</span>
                                        </div>
                                        <p className="text-red-400 text-center">{error}</p>
                                        <button
                                            onClick={() => setError(null)}
                                            className="mt-4 px-4 py-2 rounded-lg bg-[#1F2937] text-sm hover:bg-[#374151] transition-colors"
                                        >
                                            Dismiss
                                        </button>
                                    </motion.div>
                                ) : isAnalyzing ? (
                                    <motion.div
                                        key="loading"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex flex-col items-center justify-center h-full py-20"
                                    >
                                        <div className="relative w-20 h-20 mb-6">
                                            <div className="absolute inset-0 rounded-full border-4 border-blue-500/20" />
                                            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin" />
                                            <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-purple-500 animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }} />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-2xl">🔮</span>
                                            </div>
                                        </div>
                                        <p className="text-[#94A3B8] animate-pulse">ARRA Quantum Strategist is analyzing...</p>
                                        <p className="text-[#64748B] text-sm mt-2">Analyzing <span className="text-white font-medium">{selectedPair}</span> on <span className="text-white">{selectedTimeframe}</span></p>
                                    </motion.div>
                                ) : analysisResult ? (
                                    <motion.div
                                        key="result"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="analysis-result"
                                        dangerouslySetInnerHTML={{ __html: analysisResult }}
                                    />
                                ) : (
                                    <motion.div
                                        key="empty"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex flex-col items-center justify-center h-full py-20"
                                    >
                                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center mb-6">
                                            <span className="text-4xl">📊</span>
                                        </div>
                                        <h3 className="text-xl font-semibold mb-2">Ready to Analyze</h3>
                                        <p className="text-[#64748B] text-center max-w-md">
                                            Pilih kategori, pair, dan timeframe. Lalu klik <strong className="text-blue-400">"Analisa Market"</strong> untuk mendapatkan insights dari AI.
                                        </p>
                                        <div className="mt-6 flex flex-wrap gap-2 justify-center">
                                            {PAIR_CATEGORIES.map(cat => (
                                                <span key={cat.id} className="text-xs px-3 py-1 rounded-full bg-[#1F2937] text-[#94A3B8]">
                                                    {cat.icon} {cat.pairs.length} pairs
                                                </span>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Analysis Result Styles */}
            <style jsx global>{`
        .analysis-result .analysis-container {
          color: #e2e8f0;
        }
        
        .analysis-result .analysis-header {
          font-size: 1.25rem;
          font-weight: 700;
          color: #fff;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #1f2937;
        }
        
        .analysis-result .meta-row {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }
        
        .analysis-result .badge {
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        
        .analysis-result .badge.pair {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2));
          border: 1px solid rgba(59, 130, 246, 0.3);
        }
        
        .analysis-result .badge.tf {
          background: rgba(100, 116, 139, 0.2);
          border: 1px solid rgba(100, 116, 139, 0.3);
        }
        
        .analysis-result .tech-row {
          color: #94a3b8;
          margin-bottom: 0.5rem;
        }
        
        .analysis-result .risk-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 0.5rem;
          font-size: 0.75rem;
          font-weight: 700;
          margin-bottom: 1rem;
        }
        
        .analysis-result .risk-badge.risk-LOW,
        .analysis-result .risk-badge.risk-low {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
          border: 1px solid rgba(34, 197, 94, 0.3);
        }
        
        .analysis-result .risk-badge.risk-MID,
        .analysis-result .risk-badge.risk-mid {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }
        
        .analysis-result .risk-badge.risk-HIGH,
        .analysis-result .risk-badge.risk-high {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        
        .analysis-result .section-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, #374151, transparent);
          margin: 1.5rem 0;
        }
        
        .analysis-result .action-header {
          font-size: 1rem;
          font-weight: 600;
          color: #f59e0b;
          margin-bottom: 0.75rem;
        }
        
        .analysis-result .signal-box {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border-radius: 0.75rem;
          margin-bottom: 1rem;
          position: relative;
          overflow: hidden;
        }
        
        .analysis-result .signal-box.signal-buy {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05));
          border: 1px solid rgba(34, 197, 94, 0.3);
        }
        
        .analysis-result .signal-box.signal-sell {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05));
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        
        .analysis-result .signal-box.signal-neutral {
          background: linear-gradient(135deg, rgba(100, 116, 139, 0.15), rgba(100, 116, 139, 0.05));
          border: 1px solid rgba(100, 116, 139, 0.3);
        }
        
        .analysis-result .signal-type {
          font-size: 1.5rem;
          font-weight: 800;
        }
        
        .analysis-result .signal-box.signal-buy .signal-type { color: #22c55e; }
        .analysis-result .signal-box.signal-sell .signal-type { color: #ef4444; }
        
        .analysis-result .order-type {
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 0.25rem;
          text-transform: uppercase;
          font-weight: 600;
        }
        
        .analysis-result .order-reason {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 0.75rem;
          margin-bottom: 1rem;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 0.5rem;
        }
        
        .analysis-result .order-reason .label {
          font-size: 0.75rem;
          color: #3b82f6;
          font-weight: 600;
        }
        
        .analysis-result .order-reason .text {
          font-size: 0.85rem;
          color: #94a3b8;
        }
        
        .analysis-result .trade-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          border-bottom: 1px solid #1f2937;
        }
        
        .analysis-result .trade-row .label {
          color: #94a3b8;
          font-size: 0.875rem;
        }
        
        .analysis-result .trade-row .value {
          font-family: 'SF Mono', 'Monaco', monospace;
          font-weight: 600;
        }
        
        .analysis-result .trade-row.sl .value { color: #ef4444; }
        .analysis-result .trade-row.tp .value { color: #22c55e; }
        .analysis-result .trade-row .value.entry { color: #3b82f6; }
        
        .analysis-result .tag {
          font-size: 0.7rem;
          padding: 0.125rem 0.5rem;
          border-radius: 0.25rem;
          margin-left: 0.5rem;
        }
        
        .analysis-result .tag.risk {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }
        
        .analysis-result .tag.reward {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }
        
        .analysis-result .section-title {
          font-weight: 600;
          margin: 1rem 0 0.5rem;
        }
        
        .analysis-result .section-title.risk { color: #ef4444; }
        .analysis-result .section-title.reward { color: #22c55e; }
        
        .analysis-result .analysis-section {
          margin-top: 1.5rem;
          padding: 1rem;
          background: rgba(30, 41, 59, 0.5);
          border-radius: 0.75rem;
          border: 1px solid #1f2937;
        }
        
        .analysis-result .analysis-text {
          color: #94a3b8;
          line-height: 1.6;
          font-size: 0.9rem;
        }
        
        .analysis-result .disclaimer {
          margin-top: 1.5rem;
          padding: 0.75rem;
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.2);
          border-radius: 0.5rem;
          font-size: 0.75rem;
          color: #f59e0b;
        }
        
        .news-item {
          display: flex;
          gap: 0.75rem;
          padding: 0.5rem 0;
          border-bottom: 1px solid #1f2937;
          font-size: 0.8rem;
        }
        
        .news-item .time {
          color: #64748b;
          min-width: 50px;
        }
        
        .news-item .country {
          font-weight: 600;
          min-width: 35px;
        }
        
        .news-item .title {
          color: #94a3b8;
        }
      `}</style>
        </div>
    );
}
