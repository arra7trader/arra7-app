'use client';

import { useState } from 'react';
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

// Popular Indonesian stocks for quick selection
const POPULAR_STOCKS = [
    { symbol: 'BBCA', name: 'Bank Central Asia' },
    { symbol: 'BBRI', name: 'Bank Rakyat Indonesia' },
    { symbol: 'BMRI', name: 'Bank Mandiri' },
    { symbol: 'TLKM', name: 'Telkom Indonesia' },
    { symbol: 'ASII', name: 'Astra International' },
    { symbol: 'UNVR', name: 'Unilever Indonesia' },
    { symbol: 'ICBP', name: 'Indofood CBP' },
    { symbol: 'GOTO', name: 'GoTo Gojek Tokopedia' },
    { symbol: 'BUKA', name: 'Bukalapak' },
    { symbol: 'ACES', name: 'Ace Hardware' },
    { symbol: 'ANTM', name: 'Aneka Tambang' },
    { symbol: 'INCO', name: 'Vale Indonesia' },
];

export default function AnalisaSahamPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [symbol, setSymbol] = useState('');
    const [stockData, setStockData] = useState<StockData | null>(null);
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

                    {/* Quick Select */}
                    <div className="mt-4">
                        <p className="text-sm text-[#64748B] mb-2">Saham Populer:</p>
                        <div className="flex flex-wrap gap-2">
                            {POPULAR_STOCKS.map((stock) => (
                                <button
                                    key={stock.symbol}
                                    onClick={() => handleQuickSelect(stock.symbol)}
                                    className="px-3 py-1.5 bg-[#1F2937] hover:bg-[#374151] rounded-lg text-sm transition-colors"
                                    title={stock.name}
                                >
                                    {stock.symbol}
                                </button>
                            ))}
                        </div>
                    </div>
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
                                        🤖 Analisa dengan AI
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
                            className="glass rounded-2xl p-6 border border-[#1F2937]"
                        >
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span className="text-2xl">🤖</span>
                                Hasil Analisa AI
                            </h3>
                            <div className="bg-[#12141A] rounded-xl p-6 overflow-x-auto">
                                <pre className="whitespace-pre-wrap text-sm text-[#E2E8F0] font-sans leading-relaxed">
                                    {analysis}
                                </pre>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
