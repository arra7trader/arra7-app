'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import type { CryptoToken, TokenSecurity } from '@/lib/crypto-hunter/types';
import { formatNumber, formatAge, formatPercent, getGradeConfig, getTierConfig, calculateOGScore } from '@/lib/crypto-hunter/og-score';
import { getTokenSnapshot, calculatePerformance } from '@/lib/crypto-hunter/performance-tracker';
import type { TokenSnapshot, PerformanceMetrics } from '@/lib/crypto-hunter/performance-tracker';
import OGScoreGauge from './OGScoreGauge';
import SecurityBadges from './SecurityBadges';
import PerformanceTracker from './PerformanceTracker';

interface TokenDetailModalProps {
  token: CryptoToken | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function TokenDetailModal({ token, isOpen, onClose }: TokenDetailModalProps) {
  const [security, setSecurity] = useState<TokenSecurity | null>(null);
  const [loadingSecurity, setLoadingSecurity] = useState(false);

  useEffect(() => {
    if (token && isOpen) {
      fetchSecurity(token.chain, token.address);
    }
  }, [token, isOpen]);

  const fetchSecurity = async (chain: string, address: string) => {
    setLoadingSecurity(true);
    try {
      const res = await fetch(`/api/crypto-hunter/security?chain=${chain}&address=${address}`);
      const data = await res.json();
      if (data.success && data.security) {
        setSecurity(data.security);
      }
    } catch (error) {
      console.error('Security fetch failed:', error);
    } finally {
      setLoadingSecurity(false);
    }
  };

  if (!token) return null;

  const ogBreakdown = calculateOGScore(token);
  const gradeConfig = getGradeConfig(ogBreakdown.grade);
  const tierConfig = getTierConfig(token.tier);
  const displaySecurity = security || token.security;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 top-[5vh] bottom-[5vh] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg z-50 bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200/80 flex items-center justify-center text-xl font-black text-slate-600 overflow-hidden">
                  {token.imageUrl ? (
                    <img src={token.imageUrl} alt={token.symbol} className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    token.symbol.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{token.name}</h2>
                  <p className="text-xs text-slate-500 font-semibold">${token.symbol} · {token.chain.toUpperCase()}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <span className="text-slate-600 text-sm">✕</span>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* OG Score Section */}
              <div className={`p-4 rounded-2xl border ${gradeConfig.borderColor} ${gradeConfig.bgColor}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`text-lg font-black ${gradeConfig.color} flex items-center gap-2`}>
                      <span>{gradeConfig.emoji}</span>
                      <span>OG Score: {ogBreakdown.totalScore}</span>
                    </div>
                    <p className={`text-xs ${gradeConfig.color} opacity-80 mt-0.5`}>{gradeConfig.label}</p>
                  </div>
                  <OGScoreGauge score={ogBreakdown.totalScore} size="lg" showLabel={false} />
                </div>

                {/* Score Breakdown */}
                <div className="mt-3 space-y-1.5">
                  <ScoreBar label="🛡️ Security" value={ogBreakdown.securityScore} max={30} />
                  <ScoreBar label="🐋 Smart Money" value={ogBreakdown.smartMoneyScore} max={25} />
                  <ScoreBar label="📈 Momentum" value={ogBreakdown.momentumScore} max={20} />
                  <ScoreBar label="👥 Distribution" value={ogBreakdown.distributionScore} max={15} />
                  <ScoreBar label="🎯 Narrative" value={ogBreakdown.narrativeScore} max={10} />
                </div>
              </div>

              {/* Tier & Risk Info */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">{tierConfig.emoji} {tierConfig.label} — {tierConfig.riskLabel}</span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Target: {tierConfig.targetReturn}</span>
                </div>
              </div>

              {/* Price & Market Data */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span>📊</span><span>Market Data</span>
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <MetricCard label="Price" value={`$${token.priceUsd < 0.001 ? token.priceUsd.toExponential(2) : token.priceUsd.toFixed(6)}`} />
                  <MetricCard label="Market Cap" value={formatNumber(token.marketCap)} />
                  <MetricCard label="Liquidity" value={formatNumber(token.liquidity)} />
                  <MetricCard label="Volume 24h" value={formatNumber(token.volume24h)} />
                  <MetricCard label="VMC Ratio" value={`${token.vmcRatio.toFixed(2)}x`} highlight={token.vmcRatio >= 1} />
                  <MetricCard label="Age" value={formatAge(token.age)} />
                  <MetricCard label="Holders" value={token.holders > 0 ? token.holders.toString() : 'N/A'} />
                  <MetricCard label="Txs 24h" value={`${token.txCount24h} (B:${token.buyCount24h} S:${token.sellCount24h})`} />
                </div>
              </div>

              {/* Price Changes */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-700">📈 Price Changes</h3>
                <div className="grid grid-cols-4 gap-1.5">
                  <PriceBox label="5m" value={token.priceChange5m} />
                  <PriceBox label="1h" value={token.priceChange1h} />
                  <PriceBox label="6h" value={token.priceChange6h} />
                  <PriceBox label="24h" value={token.priceChange24h} />
                </div>
              </div>

              {/* Buy/Sell Ratio Visual */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-700">🔄 Buy/Sell Ratio</h3>
                <div className="relative h-6 rounded-full overflow-hidden bg-red-200">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${token.buySellRatio}%` }}
                    transition={{ duration: 0.8 }}
                    className="absolute inset-y-0 left-0 bg-emerald-500 rounded-l-full"
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                    Buy {token.buySellRatio.toFixed(0)}% / Sell {(100 - token.buySellRatio).toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* Security Analysis */}
              <div className="space-y-2">
                {loadingSecurity ? (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
                    <span className="text-xs text-slate-500 font-semibold">Running Security Analysis...</span>
                  </div>
                ) : (
                  <SecurityBadges security={displaySecurity} />
                )}
              </div>

              {/* Performance Tracker - Before/After */}
              {(() => {
                if (!token) return null;
                const snap = getTokenSnapshot(token.address, token.chain);
                if (!snap) return null;
                const perf = calculatePerformance(token, snap);
                return (
                  <div className="space-y-2">
                    <PerformanceTracker token={token} snapshot={snap} performance={perf} />
                  </div>
                );
              })()}

              {/* Take Profit Guide */}
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/80">
                <h3 className="text-xs font-bold text-emerald-800 mb-2">💰 Take Profit Strategy (4-Quarter Method)</h3>
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  <div className="bg-white/80 rounded-lg px-2 py-1.5 text-emerald-700 font-semibold">
                    At 2x → Sell 25%
                  </div>
                  <div className="bg-white/80 rounded-lg px-2 py-1.5 text-emerald-700 font-semibold">
                    At 3x → Sell 25%
                  </div>
                  <div className="bg-white/80 rounded-lg px-2 py-1.5 text-emerald-700 font-semibold">
                    At 5x → Sell 25%
                  </div>
                  <div className="bg-white/80 rounded-lg px-2 py-1.5 text-emerald-700 font-semibold">
                    At 10x+ → Sell/Hold 25%
                  </div>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80">
                <p className="text-[9px] text-amber-700 font-medium leading-relaxed">
                  ⚠️ <strong>DISCLAIMER:</strong> Crypto Hunter adalah alat ANALISIS dan RISET. Semua informasi bersifat edukatif dan BUKAN merupakan saran investasi. Trading cryptocurrency memiliki risiko sangat tinggi. Selalu lakukan riset mandiri (DYOR).
                </p>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-100 flex gap-2">
              <a
                href={token.pairUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold text-center transition-colors flex items-center justify-center gap-1.5"
              >
                <span>📊</span>
                <span>Lihat di DexScreener</span>
              </a>
              {token.chain === 'solana' && (
                <a
                  href={`https://jup.ag/swap/SOL-${token.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-bold text-center transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>⚡</span>
                  <span>Jupiter</span>
                </a>
              )}
            </div>

            {/* Social Links */}
            {(token.websiteUrl || token.twitterUrl || token.telegramUrl) && (
              <div className="px-4 pb-3 flex items-center gap-2">
                {token.websiteUrl && (
                  <a href={token.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline font-semibold">🌐 Website</a>
                )}
                {token.twitterUrl && (
                  <a href={token.twitterUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline font-semibold">𝕏 Twitter</a>
                )}
                {token.telegramUrl && (
                  <a href={token.telegramUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline font-semibold">✈️ Telegram</a>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const percent = (value / max) * 100;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-semibold text-slate-600 w-28 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className={`h-full rounded-full ${
            percent >= 70 ? 'bg-emerald-500' : percent >= 40 ? 'bg-yellow-500' : 'bg-red-400'
          }`}
        />
      </div>
      <span className="text-[10px] font-bold text-slate-700 w-10 text-right">{value}/{max}</span>
    </div>
  );
}

function MetricCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`p-2 rounded-lg border ${highlight ? 'bg-emerald-50 border-emerald-200/80' : 'bg-slate-50 border-slate-200/80'}`}>
      <div className="text-[9px] text-slate-400 font-medium">{label}</div>
      <div className={`text-xs font-bold ${highlight ? 'text-emerald-700' : 'text-slate-800'}`}>{value}</div>
    </div>
  );
}

function PriceBox({ label, value }: { label: string; value: number }) {
  return (
    <div className={`p-2 rounded-lg text-center ${
      value > 0 ? 'bg-emerald-50 border border-emerald-200/80' :
      value < 0 ? 'bg-red-50 border border-red-200/80' :
      'bg-slate-50 border border-slate-200/80'
    }`}>
      <div className="text-[9px] text-slate-400 font-medium">{label}</div>
      <div className={`text-xs font-bold ${value > 0 ? 'text-emerald-700' : value < 0 ? 'text-red-700' : 'text-slate-500'}`}>
        {formatPercent(value)}
      </div>
    </div>
  );
}
