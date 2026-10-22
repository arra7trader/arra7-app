'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CryptoToken, FilterConfig, ChainType } from '@/lib/crypto-hunter/types';
import { DEFAULT_FILTER } from '@/lib/crypto-hunter/types';
import TokenCard from './TokenCard';
import TokenDetailModal from './TokenDetailModal';
import FilterPanel from './FilterPanel';
import OGScoreGauge from './OGScoreGauge';
import { processTokenBatch, getTokenSnapshot, calculatePerformance, getTopPerformers, getTrackerStats } from '@/lib/crypto-hunter/performance-tracker';
import type { PerformanceMetrics, TokenSnapshot } from '@/lib/crypto-hunter/performance-tracker';
import PerformanceTracker from './PerformanceTracker';
import { formatNumber } from '@/lib/crypto-hunter/og-score';
import { CryptoHunterIcon } from '@/components/PremiumIcons';

type TabType = 'live' | 'trending' | 'watchlist' | 'performance';

export default function CryptoHunterDashboard() {
  const [tokens, setTokens] = useState<CryptoToken[]>([]);
  const [trendingTokens, setTrendingTokens] = useState<CryptoToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('live');
  const [filters, setFilters] = useState<FilterConfig>(DEFAULT_FILTER);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState<CryptoToken | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [watchlist, setWatchlist] = useState<CryptoToken[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [snapshots, setSnapshots] = useState<Map<string, TokenSnapshot>>(new Map());
  const [trackerStats, setTrackerStats] = useState({ totalTracked: 0, totalRockets: 0, totalPumping: 0, totalGrowing: 0, bestMultiplier: 0, bestToken: '' });

  // Load watchlist from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cryptoHunterWatchlist');
      if (saved) setWatchlist(JSON.parse(saved));
    } catch {}
  }, []);

  // Save watchlist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('cryptoHunterWatchlist', JSON.stringify(watchlist));
    } catch {}
  }, [watchlist]);

  // Fetch tokens
  const fetchTokens = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams({
        chain: filters.chain === 'all' ? 'solana' : filters.chain,
        minMc: filters.minMarketCap.toString(),
        maxMc: filters.maxMarketCap.toString(),
        minLiq: filters.minLiquidity.toString(),
        maxAge: filters.maxAge.toString(),
        minScore: filters.minOgScore.toString(),
        minHolders: filters.minHolders.toString(),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        securityOnly: filters.securityOnly.toString(),
        ...(filters.tier !== 'all' ? { tier: filters.tier.toString() } : {}),
      });

      const res = await fetch(`/api/crypto-hunter/scan?${params}`);
      const data = await res.json();

      if (data.success) {
        setTokens(data.tokens);
        setLastUpdate(new Date());
        // Process snapshots for performance tracking
        const newSnapshots = processTokenBatch(data.tokens);
        setSnapshots(newSnapshots);
        setTrackerStats(getTrackerStats());
      } else {
        setError(data.error || 'Failed to fetch tokens');
      }
    } catch (err) {
      setError('Network error â€” API tidak dapat diakses');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Fetch trending
  const fetchTrending = useCallback(async () => {
    try {
      const chain = filters.chain === 'all' ? 'solana' : filters.chain;
      const res = await fetch(`/api/crypto-hunter/trending?chain=${chain}`);
      const data = await res.json();
      if (data.success) {
        setTrendingTokens(data.tokens);
      }
    } catch {}
  }, [filters.chain]);

  // Initial fetch
  useEffect(() => {
    fetchTokens();
    fetchTrending();
  }, [fetchTokens, fetchTrending]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchTokens();
      }, 30000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, fetchTokens]);

  // Watchlist management
  const toggleWatchlist = (token: CryptoToken) => {
    setWatchlist(prev => {
      const exists = prev.find(t => t.address === token.address && t.chain === token.chain);
      if (exists) {
        return prev.filter(t => !(t.address === token.address && t.chain === token.chain));
      }
      return [...prev, token];
    });
  };

  const isWatchlisted = (token: CryptoToken) => {
    return watchlist.some(t => t.address === token.address && t.chain === token.chain);
  };

  // Get performance data for a token
  const getPerformance = (token: CryptoToken): PerformanceMetrics | null => {
    const snapshot = getTokenSnapshot(token.address, token.chain);
    if (!snapshot || snapshot.updateCount < 2) return null;
    return calculatePerformance(token, snapshot);
  };

  const openDetail = (token: CryptoToken) => {
    setSelectedToken(token);
    setDetailOpen(true);
  };

  // Filter tokens by search
  const displayTokens = activeTab === 'live' ? tokens :
    activeTab === 'trending' ? trendingTokens :
    watchlist;

  const filteredTokens = searchQuery
    ? displayTokens.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.address.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : displayTokens;

  // Stats
  const diamondCount = tokens.filter(t => t.ogScore >= 90).length;
  const hotCount = tokens.filter(t => t.ogScore >= 75 && t.ogScore < 90).length;
  const avgScore = tokens.length > 0 ? Math.round(tokens.reduce((s, t) => s + t.ogScore, 0) / tokens.length) : 0;

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <CryptoHunterIcon size="lg" className="text-emerald-600 shrink-0" />
              <span>Crypto Hunter</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              OG Smart Money Scanner â€” Temukan Crypto Gems Sebelum Meledak
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Auto Refresh Toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                autoRefresh
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <span>{autoRefresh ? 'LIVE' : 'PAUSED'}</span>
            </button>
            {/* Refresh Button */}
            <button
              onClick={() => { fetchTokens(); fetchTrending(); }}
              disabled={loading}
              className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <svg className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 shadow-xs">
            <span className="text-[10px] text-slate-400 font-medium">Total</span>
            <span className="text-xs font-bold text-slate-800">{tokens.length}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-50 border border-cyan-200/80 shadow-xs">
            <span className="text-[10px]">ðŸ’Ž</span>
            <span className="text-xs font-bold text-cyan-800">{diamondCount} Diamond</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200/80 shadow-xs">
            <span className="text-[10px]">ðŸ”¥</span>
            <span className="text-xs font-bold text-orange-800">{hotCount} Hot</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 shadow-xs">
            <span className="text-[10px] text-slate-400 font-medium">Avg Score</span>
            <span className="text-xs font-bold text-slate-800">{avgScore}</span>
          </div>
          {trackerStats.totalRockets > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/80 shadow-xs">
              <span className="text-[10px]">ðŸš€</span>
              <span className="text-xs font-bold text-emerald-800">{trackerStats.totalRockets} Rockets</span>
            </div>
          )}
          {trackerStats.bestMultiplier > 1.5 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200/80 shadow-xs">
              <span className="text-[10px]">ðŸ‘‘</span>
              <span className="text-xs font-bold text-amber-800">Best: {trackerStats.bestMultiplier.toFixed(1)}x ${trackerStats.bestToken}</span>
            </div>
          )}
          {lastUpdate && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 shadow-xs ml-auto">
              <span className="text-[10px] text-slate-400">Updated:</span>
              <span className="text-[10px] font-semibold text-slate-600">
                {lastUpdate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 mb-4">
          <TabButton active={activeTab === 'live'} onClick={() => setActiveTab('live')} emoji="ðŸ”¥" label="Live Feed" count={tokens.length} />
          <TabButton active={activeTab === 'trending'} onClick={() => setActiveTab('trending')} emoji="ðŸš€" label="Trending" count={trendingTokens.length} />
          <TabButton active={activeTab === 'watchlist'} onClick={() => setActiveTab('watchlist')} emoji="â­" label="Watchlist" count={watchlist.length} />
          <TabButton active={activeTab === 'performance'} onClick={() => setActiveTab('performance')} emoji="ðŸ“ˆ" label="Before/After" count={trackerStats.totalTracked} />
        </div>

        {/* Search & Filters Row */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search token name, symbol, or address..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200/80 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-200 transition-all shadow-xs"
            />
          </div>
          <FilterPanel
            filters={filters}
            onFilterChange={setFilters}
            isOpen={filterOpen}
            onToggle={() => setFilterOpen(!filterOpen)}
          />
        </div>
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {loading && tokens.length === 0 ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 gap-4"
          >
            <div className="w-12 h-12 border-3 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
            <div className="text-center">
              <p className="text-sm font-bold text-slate-700">Scanning Blockchain...</p>
              <p className="text-xs text-slate-400 mt-1">Menganalisis token baru dari DexScreener & GeckoTerminal</p>
            </div>
          </motion.div>
        ) : error && tokens.length === 0 ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 gap-4"
          >
            <div className="text-4xl">âš ï¸</div>
            <div className="text-center">
              <p className="text-sm font-bold text-red-700">{error}</p>
              <button
                onClick={fetchTokens}
                className="mt-3 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                Coba Lagi
              </button>
            </div>
          </motion.div>
        ) : filteredTokens.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 gap-4"
          >
            <div className="text-4xl">ðŸ”</div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-700">
                {activeTab === 'watchlist' ? 'Watchlist kosong' : 'Tidak ada token ditemukan'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {activeTab === 'watchlist' ? 'Tambahkan token ke watchlist dari Live Feed' : 'Coba ubah filter atau refresh'}
              </p>
            </div>
          </motion.div>
        ) : activeTab === 'performance' ? (
          <motion.div
            key="performance"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Performance Leaderboard Header */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80">
              <h3 className="text-sm font-black text-emerald-900 flex items-center gap-2">
                <span>ðŸ†</span>
                <span>Performance Leaderboard â€” Before vs After</span>
              </h3>
              <p className="text-[11px] text-emerald-700 mt-1">
                Semua token yang terdeteksi scanner dilacak performanya. Berikut ranking berdasarkan kenaikan Market Cap sejak pertama terdeteksi.
              </p>
            </div>

            {/* Top Performers List */}
            {(() => {
              const topPerformers = getTopPerformers([...tokens, ...trendingTokens]);
              if (topPerformers.length === 0) {
                return (
                  <div className="text-center py-12">
                    <div className="text-3xl mb-2">ðŸ“Š</div>
                    <p className="text-sm font-bold text-slate-700">Belum ada data performa</p>
                    <p className="text-xs text-slate-400 mt-1">Data akan muncul setelah scanner mendeteksi token dan melacak perubahannya seiring waktu</p>
                  </div>
                );
              }
              return (
                <div className="space-y-3">
                  {topPerformers.map((item, idx) => (
                    <motion.div
                      key={`perf-${item.token.chain}-${item.token.address}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => openDetail(item.token)}
                      className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        {/* Rank */}
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black ${
                          idx === 0 ? 'bg-amber-100 text-amber-800' :
                          idx === 1 ? 'bg-slate-200 text-slate-700' :
                          idx === 2 ? 'bg-orange-100 text-orange-800' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {idx < 3 ? ['ðŸ¥‡', 'ðŸ¥ˆ', 'ðŸ¥‰'][idx] : `#${idx + 1}`}
                        </div>
                        {/* Token Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-slate-900 truncate">{item.token.name}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">${item.token.symbol}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">{item.performance.timeSinceDetectionFormatted}</span>
                        </div>
                        {/* Performance Badge */}
                        <div className="text-right">
                          <div className={`text-lg font-black ${item.performance.statusColor}`}>
                            {item.performance.statusEmoji} {item.performance.mcMultiplier >= 2 ? `${item.performance.mcMultiplier.toFixed(1)}x` : `${item.performance.mcChangePercent >= 0 ? '+' : ''}${item.performance.mcChangePercent.toFixed(0)}%`}
                          </div>
                        </div>
                      </div>
                      {/* Before/After Mini */}
                      <div className="grid grid-cols-3 gap-2 text-[10px]">
                        <div className="p-1.5 rounded-lg bg-slate-50">
                          <div className="text-slate-400">MC Awal</div>
                          <div className="font-bold text-slate-600">{formatNumber(item.snapshot.snapshotMarketCap)}</div>
                        </div>
                        <div className="p-1.5 rounded-lg bg-slate-50">
                          <div className="text-slate-400">MC Sekarang</div>
                          <div className="font-bold text-slate-800">{formatNumber(item.token.marketCap)}</div>
                        </div>
                        <div className={`p-1.5 rounded-lg ${item.performance.mcMultiplier >= 1 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                          <div className="text-slate-400">Peak</div>
                          <div className={`font-bold ${item.performance.mcMultiplier >= 1 ? 'text-emerald-700' : 'text-red-700'}`}>{item.performance.peakMultiplier.toFixed(1)}x</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              );
            })()}
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {filteredTokens.map((token, index) => (
              <TokenCard
                key={`${token.chain}-${token.address}-${token.poolAddress}`}
                token={token}
                onSelect={openDetail}
                onWatchlist={toggleWatchlist}
                isWatchlisted={isWatchlisted(token)}
                index={index}
                performance={getPerformance(token)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Disclaimer Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-center"
      >
        <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
          âš ï¸ <strong>DISCLAIMER:</strong> Crypto Hunter adalah alat ANALISIS dan RISET. Semua informasi bersifat edukatif dan BUKAN merupakan saran investasi. Trading cryptocurrency memiliki risiko sangat tinggi â€” Anda bisa kehilangan seluruh modal. Selalu lakukan riset mandiri (DYOR) dan hanya investasikan uang yang siap Anda kehilangan.
        </p>
      </motion.div>

      {/* Token Detail Modal */}
      <TokenDetailModal
        token={selectedToken}
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}

function TabButton({ active, onClick, emoji, label, count }: {
  active: boolean; onClick: () => void; emoji: string; label: string; count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
        active
          ? 'bg-slate-900 text-white shadow-sm'
          : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
      }`}
    >
      <span>{emoji}</span>
      <span>{label}</span>
      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
        active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
      }`}>
        {count}
      </span>
    </button>
  );
}
