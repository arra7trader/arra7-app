'use client';

import { motion, AnimatePresence } from 'framer-motion';
import PremiumGuard from '@/components/layout/PremiumGuard';
import { useTranslations, useLocale } from 'next-intl';
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface Trade {
    ticket: string;
    openTime: string;
    type: string;
    size: number;
    symbol: string;
    openPrice: number;
    sl: number;
    tp: number;
    closeTime: string;
    closePrice: number;
    profit: number;
}

interface Summary {
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    totalProfit: number;
    totalLoss: number;
}

interface Diagnosis {
    type: string;
    title: string;
    severity?: string;
    description: string;
    prescription: string;
    count?: number;
    winRate?: number;
    avgRR?: number;
}

export default function AITradeDoctorPage() {
    const t = useTranslations('aiDoctor');
    const locale = useLocale();

    const [isUploading, setIsUploading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [trades, setTrades] = useState<Trade[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [analysis, setAnalysis] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setError(null);
        setIsUploading(true);
        setUploadProgress(0);

        try {
            // Simulate progress
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => Math.min(prev + 10, 90));
            }, 200);

            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/ai-doctor/upload', {
                method: 'POST',
                body: formData
            });

            clearInterval(progressInterval);
            setUploadProgress(100);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Upload failed');
            }

            const data = await response.json();
            setTrades(data.trades);
            setSummary(data.summary);

            // Auto-start analysis
            await analyzeData(data.trades);

        } catch (err: any) {
            setError(err.message || 'Failed to upload file');
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    }, []);

    const analyzeData = async (tradesToAnalyze: Trade[]) => {
        setIsAnalyzing(true);
        setError(null);

        try {
            const response = await fetch('/api/ai-doctor/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ trades: tradesToAnalyze, locale })
            });

            if (!response.ok) {
                throw new Error('Analysis failed');
            }

            const data = await response.json();
            setAnalysis(data);

        } catch (err: any) {
            setError(err.message || 'Failed to analyze trades');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'text/html': ['.html', '.htm'] },
        multiple: false
    });

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pt-36 pb-12">
            <div className="container-apple">
                <PremiumGuard
                    title={t('title')}
                    description={t('description').replace(/<[^>]*>/g, '')}
                    minTier="PRO"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-6xl mx-auto"
                    >
                        {/* Header */}
                        <div className="text-center mb-12">
                            <span className="px-3 py-1 bg-blue-500/10 border-blue-500/20 dark:bg-blue-900/30 text-blue-400 dark:text-blue-400 rounded-full text-xs font-bold tracking-wide uppercase mb-4 inline-block">
                                {t('subtitle')}
                            </span>
                            <h1 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-4">
                                {t('title')} 🩺
                            </h1>
                            <p
                                className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto"
                                dangerouslySetInnerHTML={{ __html: t('description') }}
                            />
                        </div>

                        {/* Tutorial Section */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-3xl p-8 mb-8 border border-indigo-500/20 dark:border-indigo-800"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center">
                                    <span className="text-2xl">📖</span>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-[var(--text-primary)] dark:text-white">Cara Export Trading Statement</h2>
                                    <p className="text-sm text-[var(--text-secondary)] dark:text-slate-400">Panduan lengkap untuk MT4 & MT5</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* MT4 Tutorial */}
                                <div className="bg-[var(--bg-primary)] dark:bg-gray-800 rounded-2xl p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="text-2xl">📊</span>
                                        <h3 className="text-xl font-bold text-[var(--text-primary)] dark:text-white">MetaTrader 4</h3>
                                    </div>
                                    <ol className="space-y-3 text-sm text-[var(--text-primary)] dark:text-gray-300">
                                        <li className="flex gap-3">
                                            <span className="flex-shrink-0 w-6 h-6 bg-indigo-500/10 border-indigo-500/20 dark:bg-indigo-900/50 text-indigo-400 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold text-xs">1</span>
                                            <span>Buka <strong>MetaTrader 4</strong></span>
                                        </li>
                                        <li className="flex gap-3">
                                            <span className="flex-shrink-0 w-6 h-6 bg-indigo-500/10 border-indigo-500/20 dark:bg-indigo-900/50 text-indigo-400 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold text-xs">2</span>
                                            <span>Buka tab <strong>"Account History"</strong> di bagian bawah</span>
                                        </li>
                                        <li className="flex gap-3">
                                            <span className="flex-shrink-0 w-6 h-6 bg-indigo-500/10 border-indigo-500/20 dark:bg-indigo-900/50 text-indigo-400 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold text-xs">3</span>
                                            <span>Klik kanan di area history → pilih <strong>"Save as Report"</strong></span>
                                        </li>
                                        <li className="flex gap-3">
                                            <span className="flex-shrink-0 w-6 h-6 bg-indigo-500/10 border-indigo-500/20 dark:bg-indigo-900/50 text-indigo-400 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold text-xs">4</span>
                                            <span>Pilih format <strong>"Open HTML"</strong></span>
                                        </li>
                                        <li className="flex gap-3">
                                            <span className="flex-shrink-0 w-6 h-6 bg-indigo-500/10 border-indigo-500/20 dark:bg-indigo-900/50 text-indigo-400 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold text-xs">5</span>
                                            <span>Save file (akan otomatis terbuka di browser)</span>
                                        </li>
                                        <li className="flex gap-3">
                                            <span className="flex-shrink-0 w-6 h-6 bg-indigo-500/10 border-indigo-500/20 dark:bg-indigo-900/50 text-indigo-400 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold text-xs">6</span>
                                            <span>Upload file <strong>.html</strong> tersebut di sini</span>
                                        </li>
                                    </ol>
                                </div>

                                {/* MT5 Tutorial */}
                                <div className="bg-[var(--bg-primary)] dark:bg-gray-800 rounded-2xl p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="text-2xl">📈</span>
                                        <h3 className="text-xl font-bold text-[var(--text-primary)] dark:text-white">MetaTrader 5</h3>
                                    </div>
                                    <ol className="space-y-3 text-sm text-[var(--text-primary)] dark:text-gray-300">
                                        <li className="flex gap-3">
                                            <span className="flex-shrink-0 w-6 h-6 bg-purple-500/10 border-purple-500/20 dark:bg-purple-900/50 text-purple-400 dark:text-purple-400 rounded-full flex items-center justify-center font-bold text-xs">1</span>
                                            <span>Buka <strong>MetaTrader 5</strong></span>
                                        </li>
                                        <li className="flex gap-3">
                                            <span className="flex-shrink-0 w-6 h-6 bg-purple-500/10 border-purple-500/20 dark:bg-purple-900/50 text-purple-400 dark:text-purple-400 rounded-full flex items-center justify-center font-bold text-xs">2</span>
                                            <span>Buka tab <strong>"History"</strong> atau tekan <strong>Ctrl+T</strong></span>
                                        </li>
                                        <li className="flex gap-3">
                                            <span className="flex-shrink-0 w-6 h-6 bg-purple-500/10 border-purple-500/20 dark:bg-purple-900/50 text-purple-400 dark:text-purple-400 rounded-full flex items-center justify-center font-bold text-xs">3</span>
                                            <span>Klik kanan di area trades → pilih <strong>"Report"</strong></span>
                                        </li>
                                        <li className="flex gap-3">
                                            <span className="flex-shrink-0 w-6 h-6 bg-purple-500/10 border-purple-500/20 dark:bg-purple-900/50 text-purple-400 dark:text-purple-400 rounded-full flex items-center justify-center font-bold text-xs">4</span>
                                            <span>Pilih template <strong>"Standard"</strong> atau <strong>"Detailed"</strong></span>
                                        </li>
                                        <li className="flex gap-3">
                                            <span className="flex-shrink-0 w-6 h-6 bg-purple-500/10 border-purple-500/20 dark:bg-purple-900/50 text-purple-400 dark:text-purple-400 rounded-full flex items-center justify-center font-bold text-xs">5</span>
                                            <span>Klik <strong>"Open in browser"</strong> atau save as HTML</span>
                                        </li>
                                        <li className="flex gap-3">
                                            <span className="flex-shrink-0 w-6 h-6 bg-purple-500/10 border-purple-500/20 dark:bg-purple-900/50 text-purple-400 dark:text-purple-400 rounded-full flex items-center justify-center font-bold text-xs">6</span>
                                            <span>Upload file <strong>.html</strong> tersebut di sini</span>
                                        </li>
                                    </ol>
                                </div>
                            </div>

                            {/* Important Notes */}
                            <div className="mt-6 p-4 bg-amber-500/10 border-amber-500/20 dark:bg-amber-900/20 border border-amber-500/20 dark:border-amber-800 rounded-xl">
                                <div className="flex gap-2 items-start">
                                    <span className="text-xl">⚠️</span>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-amber-400 dark:text-amber-300 mb-1">Penting:</h4>
                                        <ul className="text-sm text-amber-400 dark:text-amber-200 space-y-1">
                                            <li>✅ Format yang diterima: <strong>.html</strong> atau <strong>.htm</strong></li>
                                            <li>❌ Format yang TIDAK diterima: .pdf, .xlsx, .csv, .txt</li>
                                            <li>💡 Pastikan file berisi minimal <strong>10 trades</strong> untuk analisis yang akurat</li>
                                            <li>🔒 Data Anda <strong>tidak disimpan</strong> - hanya diproses sementara untuk analisis</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Upload Area */}
                        <div
                            {...getRootProps()}
                            className={`bg-[var(--bg-primary)] dark:bg-gray-800 rounded-3xl border-dashed border-2 p-12 text-center mb-12 transition-all cursor-pointer ${isDragActive
                                ? 'border-blue-500 bg-blue-500/10 border-blue-500/20 dark:bg-blue-900/20'
                                : 'border-[var(--border-light)] hover:border-blue-500/20'
                                }`}
                        >
                            <input {...getInputProps()} />
                            <div className="w-20 h-20 bg-blue-500/10 border-blue-500/20 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6 transition-transform hover:scale-110">
                                <svg className="w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold mb-2">
                                {isDragActive ? 'Drop file here' : t('uploadTitle')}
                            </h3>
                            <p className="text-[var(--text-muted)] text-sm mb-6">{t('uploadDesc')}</p>
                            {!isDragActive && (
                                <button className="btn-primary">
                                    {t('selectFile')}
                                </button>
                            )}
                        </div>

                        {/* Upload Progress */}
                        <AnimatePresence>
                            {isUploading && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="mb-8 p-4 bg-blue-500/10 border-blue-500/20 dark:bg-blue-900/20 rounded-2xl"
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                        <span className="font-semibold text-blue-400 dark:text-blue-300">Uploading and parsing...</span>
                                    </div>
                                    <div className="w-full bg-slate-800 dark:bg-gray-700 rounded-full h-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${uploadProgress}%` }}
                                        ></div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Error Message */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="mb-8 p-4 bg-red-500/10 border-red-500/20 dark:bg-red-900/20 border border-red-500/20 dark:border-red-800 rounded-2xl"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">⚠️</span>
                                        <p className="text-red-400 dark:text-red-300 font-semibold">{error}</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Summary Stats */}
                        <AnimatePresence>
                            {summary && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
                                >
                                    <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-500/20 dark:border-blue-800">
                                        <div className="text-2xl font-bold text-blue-400 dark:text-blue-300">{summary.totalTrades}</div>
                                        <div className="text-xs text-[var(--text-secondary)] dark:text-slate-400">Total Trades</div>
                                    </div>
                                    <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-500/20 dark:border-green-800">
                                        <div className="text-2xl font-bold text-green-400 dark:text-green-300">{summary.winRate.toFixed(1)}%</div>
                                        <div className="text-xs text-[var(--text-secondary)] dark:text-slate-400">Win Rate</div>
                                    </div>
                                    <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border border-purple-500/20 dark:border-purple-800">
                                        <div className="text-2xl font-bold text-purple-400 dark:text-purple-300">{summary.profitFactor.toFixed(2)}</div>
                                        <div className="text-xs text-[var(--text-secondary)] dark:text-slate-400">Profit Factor</div>
                                    </div>
                                    <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl border border-amber-500/20 dark:border-amber-800">
                                        <div className="text-2xl font-bold text-amber-400 dark:text-amber-300">${summary.totalProfit.toFixed(0)}</div>
                                        <div className="text-xs text-[var(--text-secondary)] dark:text-slate-400">Total Profit</div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Analysis Loading */}
                        <AnimatePresence>
                            {isAnalyzing && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="text-center py-12"
                                >
                                    <div className="inline-flex items-center gap-3 px-6 py-3 bg-indigo-500/10 border-indigo-500/20 dark:bg-indigo-900/20 rounded-full">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                                        <span className="font-semibold text-indigo-400 dark:text-indigo-300">AI analyzing your patterns...</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Analysis Results */}
                        <AnimatePresence>
                            {analysis && !isAnalyzing && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-6"
                                >
                                    {/* Critical Flaws */}
                                    {analysis.criticalFlaws && analysis.criticalFlaws.length > 0 && (
                                        <div>
                                            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                                                <span>🚨</span>
                                                <span>Critical Flaws Detected</span>
                                            </h2>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {analysis.criticalFlaws.map((flaw: Diagnosis, index: number) => (
                                                    <motion.div
                                                        key={index}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: index * 0.1 }}
                                                        className="p-6 bg-red-500/10 border-red-500/20 dark:bg-red-900/20 rounded-2xl border border-red-500/20 dark:border-red-900/30"
                                                    >
                                                        <div className="flex items-center justify-between mb-4">
                                                            <h3 className="font-bold text-red-400 dark:text-red-400">{flaw.title}</h3>
                                                            {flaw.severity && (
                                                                <span className={`text-xs font-bold px-2 py-1 rounded ${flaw.severity === 'high'
                                                                    ? 'bg-red-200 text-red-400'
                                                                    : 'bg-orange-200 text-orange-800'
                                                                    }`}>
                                                                    {flaw.severity.toUpperCase()}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-[var(--text-primary)] dark:text-gray-300 mb-4">
                                                            {flaw.description}
                                                        </p>
                                                        <div className="bg-[var(--bg-primary)] dark:bg-black/20 p-3 rounded-xl">
                                                            <p className="text-xs font-mono text-[var(--text-secondary)] dark:text-slate-400 mb-1">💊 PRESCRIPTION:</p>
                                                            <p className="text-sm font-semibold text-[var(--text-primary)] dark:text-white">{flaw.prescription}</p>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Hidden Strengths */}
                                    {analysis.strengths && analysis.strengths.length > 0 && (
                                        <div>
                                            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                                                <span>✨</span>
                                                <span>Hidden Superpowers</span>
                                            </h2>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {analysis.strengths.map((strength: Diagnosis, index: number) => (
                                                    <motion.div
                                                        key={index}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: index * 0.1 }}
                                                        className="p-6 bg-green-500/10 border-green-500/20 dark:bg-green-900/20 rounded-2xl border border-green-500/20 dark:border-green-900/30"
                                                    >
                                                        <div className="flex items-center justify-between mb-4">
                                                            <h3 className="font-bold text-green-400 dark:text-green-400">{strength.title}</h3>
                                                            {strength.winRate && (
                                                                <span className="text-xs font-bold bg-green-200 text-green-400 px-2 py-1 rounded">
                                                                    {strength.winRate.toFixed(0)}% WR
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-[var(--text-primary)] dark:text-gray-300 mb-4">
                                                            {strength.description}
                                                        </p>
                                                        <div className="bg-[var(--bg-primary)] dark:bg-black/20 p-3 rounded-xl">
                                                            <p className="text-xs font-mono text-[var(--text-secondary)] dark:text-slate-400 mb-1">💎 AMPLIFY:</p>
                                                            <p className="text-sm font-semibold text-[var(--text-primary)] dark:text-white">{strength.prescription}</p>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* No Issues Found */}
                                    {analysis.criticalFlaws.length === 0 && analysis.strengths.length === 0 && (
                                        <div className="text-center py-12 bg-[var(--bg-secondary)] dark:bg-gray-800/50 rounded-3xl">
                                            <span className="text-6xl mb-4 block">🎯</span>
                                            <h3 className="text-2xl font-bold mb-2">Looking Good!</h3>
                                            <p className="text-[var(--text-secondary)] dark:text-slate-400">
                                                No critical issues detected. Keep up the disciplined trading!
                                            </p>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </PremiumGuard>
            </div>
        </div>
    );
}
