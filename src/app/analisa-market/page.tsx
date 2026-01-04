'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { SparklesIcon, ChartIcon, RocketIcon, LightbulbIcon } from '@/components/PremiumIcons';

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
    { value: '1m', label: 'M1' },
    { value: '5m', label: 'M5' },
    { value: '15m', label: 'M15' },
    { value: '30m', label: 'M30' },
    { value: '1h', label: 'H1' },
    { value: '4h', label: 'H4' },
    { value: '1d', label: 'D1' },
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
        trackLocation();
    }, []);

    const trackLocation = async () => {
        try {
            await fetch('/api/location', { method: 'POST' });
        } catch (err) {
            // Silent fail
        }
    };

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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pair: selectedPair, timeframe: selectedTimeframe }),
            });

            const data = await response.json();

            if (data.status === 'success') {
                setAnalysisResult(data.result);
                setMarketInfo(data.marketInfo);
                if (data.quotaStatus) {
                    setQuotaStatus(data.quotaStatus);
                } else {
                    fetchQuota();
                }
            } else {
                setError(data.message || 'Analysis failed');
                if (data.quotaStatus) {
                    setQuotaStatus(data.quotaStatus);
                }
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
                <div className="w-10 h-10 border-2 border-[var(--accent-blue)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!session) {
        return null;
    }

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pt-20">
            <div className="container-wide section-padding pt-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                            <SparklesIcon className="text-white" size="lg" />
                        </div>
                        <div>
                            <h1 className="text-2xl lg:text-3xl font-bold text-[var(--text-primary)]">{t('title')}</h1>
                            <p className="text-sm text-[var(--text-secondary)]">
                                {t('welcome')}, <span className="text-[var(--text-primary)] font-medium">{session.user?.name}</span>
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
                        <div className="bg-white rounded-2xl p-4 border border-[var(--border-light)]">
                            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-2">
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
                                                ? 'bg-[var(--accent-blue)] text-white'
                                                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                                            }
                                        `}
                                    >
                                        <span>{category.icon}</span>
                                        <span className="hidden sm:inline">{category.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Pair Selection Grid */}
                        <div className="bg-white rounded-2xl p-4 border border-[var(--border-light)]">
                            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                                <span>{currentCategory?.icon}</span> {currentCategory?.name} Pairs
                                <span className="text-xs text-[var(--text-muted)]">({currentPairs.length})</span>
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2 max-h-[280px] overflow-y-auto pr-1">
                                {currentPairs.map((pair) => (
                                    <button
                                        key={pair.value}
                                        onClick={() => setSelectedPair(pair.value)}
                                        className={`
                                            px-3 py-2 rounded-lg text-xs font-medium transition-all text-left truncate
                                            ${selectedPair === pair.value
                                                ? 'bg-[var(--accent-blue)] text-white'
                                                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
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
                        <div className="bg-white rounded-2xl p-4 border border-[var(--border-light)]">
                            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-2">
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
                                                ? 'bg-[var(--accent-blue)] text-white'
                                                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                                            }
                                        `}
                                    >
                                        {tf.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Selected Pair Display */}
                        <div className="bg-white rounded-2xl p-4 border border-[var(--border-light)]">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm text-[var(--text-secondary)]">Trading:</span>
                                <span className="text-lg font-bold gradient-text">{selectedPair}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-[var(--text-secondary)]">Timeframe:</span>
                                <span className="text-[var(--text-primary)] font-medium">{selectedTimeframe.toUpperCase()}</span>
                            </div>
                        </div>

                        {/* Quota Status */}
                        {quotaStatus && (
                            <div className={`rounded-2xl p-4 border ${quotaStatus.membership === 'VVIP'
                                ? 'bg-amber-50 border-amber-200'
                                : quotaStatus.membership === 'PRO'
                                    ? 'bg-blue-50 border-blue-200'
                                    : 'bg-white border-[var(--border-light)]'
                                }`}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-[var(--text-secondary)] flex items-center gap-1"><ChartIcon size="sm" /> Quota Hari Ini</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${quotaStatus.membership === 'VVIP'
                                        ? 'bg-amber-100 text-amber-700'
                                        : quotaStatus.membership === 'PRO'
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'bg-gray-100 text-gray-600'
                                        }`}>
                                        {quotaStatus.membership}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all ${quotaStatus.remaining === 0
                                                ? 'bg-red-500'
                                                : quotaStatus.membership === 'VVIP'
                                                    ? 'bg-amber-500'
                                                    : 'bg-[var(--accent-blue)]'
                                                }`}
                                            style={{
                                                width: (quotaStatus.dailyLimit === -1 || quotaStatus.dailyLimit === null)
                                                    ? '100%'
                                                    : `${Math.min(100, (quotaStatus.used / (quotaStatus.dailyLimit || 1)) * 100)}%`
                                            }}
                                        />
                                    </div>
                                    <span className="text-sm font-mono text-[var(--text-primary)]">
                                        {(quotaStatus.dailyLimit === -1 || quotaStatus.dailyLimit === null)
                                            ? '∞'
                                            : `${quotaStatus.used}/${quotaStatus.dailyLimit}`
                                        }
                                    </span>
                                </div>
                                {quotaStatus.membership === 'BASIC' && quotaStatus.remaining <= 1 && (
                                    <a
                                        href="/pricing"
                                        className="mt-3 block text-center text-xs text-[var(--accent-blue)] hover:underline"
                                    >
                                        <LightbulbIcon className="inline" size="sm" /> Upgrade untuk lebih banyak analisa
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
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'btn-primary'
                                }
                            `}
                        >
                            {isAnalyzing ? (
                                <span className="flex items-center justify-center gap-3">
                                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                    Analyzing...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <RocketIcon size="md" /> Analisa Market
                                </span>
                            )}
                        </motion.button>

                        {/* Market Info */}
                        {marketInfo && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-2xl p-4 border border-[var(--border-light)]"
                            >
                                <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-2"><ChartIcon size="sm" /> Market Info</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-[var(--text-secondary)]">Symbol</span>
                                        <span className="font-medium text-[var(--text-primary)]">{marketInfo.symbol}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[var(--text-secondary)]">Price</span>
                                        <span className="font-mono font-medium text-[var(--text-primary)]">{marketInfo.price.toFixed(5)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[var(--text-secondary)]">Change</span>
                                        <span className={`font-medium ${marketInfo.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {marketInfo.change >= 0 ? '+' : ''}{marketInfo.change.toFixed(4)}%
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[var(--text-secondary)]">Data</span>
                                        <span className={`text-xs px-2 py-0.5 rounded ${marketInfo.isRealtime ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {marketInfo.isRealtime ? 'LIVE' : 'DELAYED'}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* News */}
                        <div className="bg-white rounded-2xl p-4 border border-[var(--border-light)]">
                            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                                <span>📰</span> Economic News
                            </h3>
                            <div
                                className="text-sm space-y-1 max-h-32 overflow-y-auto text-[var(--text-secondary)]"
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
                        <div className="bg-white rounded-2xl p-6 border border-[var(--border-light)] min-h-[600px]">
                            <AnimatePresence mode="wait">
                                {error ? (
                                    <motion.div
                                        key="error"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex flex-col items-center justify-center h-full py-20"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                                            <span className="text-2xl">❌</span>
                                        </div>
                                        <p className="text-red-600 text-center">{error}</p>
                                        <button
                                            onClick={() => setError(null)}
                                            className="mt-4 px-4 py-2 rounded-lg bg-[var(--bg-secondary)] text-sm hover:bg-[var(--bg-tertiary)] transition-colors"
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
                                            <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
                                            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[var(--accent-blue)] animate-spin" />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-2xl">🔮</span>
                                            </div>
                                        </div>
                                        <p className="text-[var(--text-secondary)] animate-pulse">ARRA Quantum Strategist is analyzing...</p>
                                        <p className="text-[var(--text-muted)] text-sm mt-2">Analyzing <span className="text-[var(--text-primary)] font-medium">{selectedPair}</span> on <span className="text-[var(--text-primary)]">{selectedTimeframe}</span></p>
                                    </motion.div>
                                ) : analysisResult ? (
                                    <motion.div
                                        key="result"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="analysis-result-light"
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
                                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center mb-6">
                                            <span className="text-4xl">📊</span>
                                        </div>
                                        <h3 className="text-xl font-semibold mb-2 text-[var(--text-primary)]">Ready to Analyze</h3>
                                        <p className="text-[var(--text-secondary)] text-center max-w-md">
                                            Pilih kategori, pair, dan timeframe. Lalu klik <strong className="text-[var(--accent-blue)]">"Analisa Market"</strong> untuk mendapatkan insights dari AI.
                                        </p>
                                        <div className="mt-6 flex flex-wrap gap-2 justify-center">
                                            {PAIR_CATEGORIES.map(cat => (
                                                <span key={cat.id} className="text-xs px-3 py-1 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
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

            {/* Analysis Result Styles - Light Theme */}
            <style jsx global>{`
                .analysis-result-light .analysis-container {
                    color: #1d1d1f;
                }
                
                .analysis-result-light .analysis-header {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #1d1d1f;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 1rem;
                    padding-bottom: 0.75rem;
                    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
                }
                
                .analysis-result-light .meta-row {
                    display: flex;
                    gap: 0.5rem;
                    margin-bottom: 0.75rem;
                }
                
                .analysis-result-light .badge {
                    padding: 0.25rem 0.75rem;
                    border-radius: 9999px;
                    font-size: 0.75rem;
                    font-weight: 600;
                }
                
                .analysis-result-light .badge.pair {
                    background: rgba(0, 113, 227, 0.1);
                    border: 1px solid rgba(0, 113, 227, 0.2);
                    color: #0071e3;
                }
                
                .analysis-result-light .badge.tf {
                    background: rgba(0, 0, 0, 0.05);
                    border: 1px solid rgba(0, 0, 0, 0.08);
                    color: #86868b;
                }
                
                .analysis-result-light .tech-row {
                    color: #86868b;
                    margin-bottom: 0.5rem;
                }
                
                .analysis-result-light .risk-badge {
                    display: inline-block;
                    padding: 0.25rem 0.75rem;
                    border-radius: 0.5rem;
                    font-size: 0.75rem;
                    font-weight: 700;
                    margin-bottom: 1rem;
                }
                
                .analysis-result-light .risk-badge.risk-LOW,
                .analysis-result-light .risk-badge.risk-low {
                    background: rgba(34, 197, 94, 0.1);
                    color: #16a34a;
                    border: 1px solid rgba(34, 197, 94, 0.2);
                }
                
                .analysis-result-light .risk-badge.risk-MID,
                .analysis-result-light .risk-badge.risk-mid {
                    background: rgba(245, 158, 11, 0.1);
                    color: #d97706;
                    border: 1px solid rgba(245, 158, 11, 0.2);
                }
                
                .analysis-result-light .risk-badge.risk-HIGH,
                .analysis-result-light .risk-badge.risk-high {
                    background: rgba(239, 68, 68, 0.1);
                    color: #dc2626;
                    border: 1px solid rgba(239, 68, 68, 0.2);
                }
                
                .analysis-result-light .section-divider {
                    height: 1px;
                    background: rgba(0, 0, 0, 0.08);
                    margin: 1.5rem 0;
                }
                
                .analysis-result-light .signal-box {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1rem;
                    border-radius: 0.75rem;
                    margin-bottom: 1rem;
                }
                
                .analysis-result-light .signal-box.signal-buy {
                    background: rgba(34, 197, 94, 0.08);
                    border: 1px solid rgba(34, 197, 94, 0.2);
                }
                
                .analysis-result-light .signal-box.signal-sell {
                    background: rgba(239, 68, 68, 0.08);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                }
                
                .analysis-result-light .signal-type {
                    font-size: 1.5rem;
                    font-weight: 800;
                }
                
                .analysis-result-light .signal-box.signal-buy .signal-type { color: #16a34a; }
                .analysis-result-light .signal-box.signal-sell .signal-type { color: #dc2626; }
                
                .analysis-result-light .trade-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.5rem 0;
                    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
                }
                
                .analysis-result-light .trade-row .label {
                    color: #86868b;
                    font-size: 0.875rem;
                }
                
                .analysis-result-light .trade-row .value {
                    font-family: 'SF Mono', monospace;
                    font-weight: 600;
                    color: #1d1d1f;
                }
                
                .analysis-result-light .trade-row.sl .value { color: #dc2626; }
                .analysis-result-light .trade-row.tp .value { color: #16a34a; }
                .analysis-result-light .trade-row .value.entry { color: #0071e3; }
                
                .analysis-result-light .analysis-section {
                    margin-top: 1.5rem;
                    padding: 1rem;
                    background: rgba(0, 0, 0, 0.02);
                    border-radius: 0.75rem;
                    border: 1px solid rgba(0, 0, 0, 0.05);
                }
                
                .analysis-result-light .analysis-text {
                    color: #86868b;
                    line-height: 1.6;
                    font-size: 0.9rem;
                }
            `}</style>
        </div>
    );
}
