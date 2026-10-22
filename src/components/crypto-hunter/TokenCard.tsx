'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import type { CryptoToken } from '@/lib/crypto-hunter/types';
import { formatNumber, formatAge, formatPercent, getGradeConfig, getTierConfig } from '@/lib/crypto-hunter/og-score';
import OGScoreGauge from './OGScoreGauge';
import SecurityBadges from './SecurityBadges';
import { PerformanceBadge } from './PerformanceTracker';
import type { PerformanceMetrics } from '@/lib/crypto-hunter/performance-tracker';

interface TokenCardProps {
  token: CryptoToken;
  onSelect: (token: CryptoToken) => void;
  onWatchlist: (token: CryptoToken) => void;
  isWatchlisted?: boolean;
  index?: number;
  performance?: PerformanceMetrics | null;
}

export default function TokenCard({ token, onSelect, onWatchlist, isWatchlisted = false, index = 0, performance }: TokenCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const gradeConfig = getGradeConfig(token.ogScore >= 90 ? 'DIAMOND' : token.ogScore >= 75 ? 'HOT' : token.ogScore >= 60 ? 'INTERESTING' : token.ogScore >= 40 ? 'CAUTION' : 'AVOID');
  const tierConfig = getTierConfig(token.tier);

  const chainColors: Record<string, string> = {
    solana: 'bg-purple-100 text-purple-700 border-purple-200',
    base: 'bg-blue-100 text-blue-700 border-blue-200',
    ethereum: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    bsc: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative bg-white rounded-2xl border transition-all duration-200 cursor-pointer hover:shadow-lg ${
        gradeConfig.borderColor
      } ${isHovered ? 'shadow-md border-opacity-100 scale-[1.01]' : 'shadow-sm border-opacity-60'}`}
      onClick={() => onSelect(token)}
    >
      {/* Header */}
      <div className="flex items-start justify-between p-3 pb-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Token icon/avatar */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200/80 flex items-center justify-center text-lg font-black text-slate-600 shrink-0 overflow-hidden">
            {token.imageUrl ? (
              <img src={token.imageUrl} alt={token.symbol} className="w-full h-full object-cover rounded-xl" />
            ) : (
              token.symbol.slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-slate-900 truncate">{token.name}</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold border ${chainColors[token.chain]}`}>
                {token.chain.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[11px] text-slate-500 font-semibold">${token.symbol}</span>
              <span className="text-[9px] text-slate-400">•</span>
              <span className="text-[10px] text-slate-400 font-medium">{formatAge(token.age)} ago</span>
            </div>
          </div>
        </div>
        <OGScoreGauge score={token.ogScore} size="sm" showLabel={false} />
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-1.5 px-3 py-2">
        <div className="text-center p-1.5 rounded-lg bg-slate-50/80">
          <div className="text-[9px] text-slate-400 font-medium">MC</div>
          <div className="text-[11px] font-bold text-slate-800">{formatNumber(token.marketCap)}</div>
        </div>
        <div className="text-center p-1.5 rounded-lg bg-slate-50/80">
          <div className="text-[9px] text-slate-400 font-medium">Liquidity</div>
          <div className="text-[11px] font-bold text-slate-800">{formatNumber(token.liquidity)}</div>
        </div>
        <div className="text-center p-1.5 rounded-lg bg-slate-50/80">
          <div className="text-[9px] text-slate-400 font-medium">Vol 24h</div>
          <div className="text-[11px] font-bold text-slate-800">{formatNumber(token.volume24h)}</div>
        </div>
      </div>

      {/* Price Changes */}
      <div className="flex items-center gap-1 px-3 py-1.5">
        <PriceChangeChip label="5m" value={token.priceChange5m} />
        <PriceChangeChip label="1h" value={token.priceChange1h} />
        <PriceChangeChip label="6h" value={token.priceChange6h} />
        <PriceChangeChip label="24h" value={token.priceChange24h} />
      </div>

      {/* Key Signals */}
      <div className="px-3 py-2 border-t border-slate-100">
        <div className="flex flex-wrap gap-1.5">
          {/* VMC Ratio */}
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
            token.vmcRatio >= 3 ? 'bg-emerald-100 text-emerald-700' :
            token.vmcRatio >= 1 ? 'bg-blue-100 text-blue-700' :
            'bg-slate-100 text-slate-600'
          }`}>
            VMC: {token.vmcRatio.toFixed(1)}x
          </span>

          {/* Buy/Sell Ratio */}
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
            token.buySellRatio >= 60 ? 'bg-emerald-100 text-emerald-700' :
            token.buySellRatio >= 45 ? 'bg-slate-100 text-slate-600' :
            'bg-red-100 text-red-700'
          }`}>
            B/S: {token.buySellRatio.toFixed(0)}%
          </span>

          {/* Tier */}
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 ${tierConfig.color}`}>
            {tierConfig.emoji} {tierConfig.label}
          </span>

          {/* Transactions */}
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
            Txs: {token.txCount24h}
          </span>
        </div>
      </div>

      {/* Performance Before/After */}
      {performance && (performance.mcMultiplier >= 1.05 || performance.mcMultiplier <= 0.95) && (
        <div className="px-3 py-1.5 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <PerformanceBadge performance={performance} />
            <span className="text-[9px] text-slate-400 font-medium truncate">
              sejak terdeteksi {performance.timeSinceDetectionFormatted}
            </span>
          </div>
        </div>
      )}

      {/* Security Quick Check */}
      <div className="px-3 pb-2">
        <SecurityBadges security={token.security} compact />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 px-3 pb-3">
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(token); }}
          className="flex-1 py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition-colors"
        >
          Detail & Analysis
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onWatchlist(token); }}
          className={`py-1.5 px-3 rounded-lg text-[11px] font-bold transition-colors border ${
            isWatchlisted
              ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          {isWatchlisted ? '⭐' : '☆'}
        </button>
        <a
          href={token.pairUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="py-1.5 px-3 rounded-lg bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 text-[11px] font-bold transition-colors"
        >
          📊
        </a>
      </div>

      {/* Grade indicator strip at top */}
      <div className={`absolute top-0 left-4 right-4 h-0.5 rounded-b-full ${
        token.ogScore >= 90 ? 'bg-gradient-to-r from-cyan-400 to-cyan-600' :
        token.ogScore >= 75 ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
        token.ogScore >= 60 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
        token.ogScore >= 40 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
        'bg-gradient-to-r from-red-400 to-red-500'
      }`} />
    </motion.div>
  );
}

function PriceChangeChip({ label, value }: { label: string; value: number }) {
  const isPositive = value > 0;
  const isNegative = value < 0;

  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md flex-1 text-center ${
      isPositive ? 'bg-emerald-50 text-emerald-700' :
      isNegative ? 'bg-red-50 text-red-700' :
      'bg-slate-50 text-slate-500'
    }`}>
      {label}: {formatPercent(value)}
    </span>
  );
}
