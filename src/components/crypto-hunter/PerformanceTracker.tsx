'use client';

import { motion } from 'framer-motion';
import type { CryptoToken } from '@/lib/crypto-hunter/types';
import type { TokenSnapshot, PerformanceMetrics } from '@/lib/crypto-hunter/performance-tracker';
import { formatNumber, formatAge } from '@/lib/crypto-hunter/og-score';

interface PerformanceTrackerProps {
  token: CryptoToken;
  snapshot: TokenSnapshot;
  performance: PerformanceMetrics;
  compact?: boolean;
}

export default function PerformanceTracker({ token, snapshot, performance, compact = false }: PerformanceTrackerProps) {
  if (compact) {
    return <CompactView token={token} snapshot={snapshot} performance={performance} />;
  }

  return <FullView token={token} snapshot={snapshot} performance={performance} />;
}

// === COMPACT VIEW (for TokenCard) ===
function CompactView({ token, snapshot, performance }: PerformanceTrackerProps) {
  const isPositive = performance.mcMultiplier >= 1;

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border ${
      performance.mcMultiplier >= 5 ? 'bg-emerald-50 text-emerald-800 border-emerald-200 animate-pulse' :
      performance.mcMultiplier >= 2 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
      isPositive ? 'bg-blue-50 text-blue-700 border-blue-200' :
      'bg-red-50 text-red-700 border-red-200'
    }`}>
      <span>{performance.statusEmoji}</span>
      <span>
        {formatNumber(snapshot.snapshotMarketCap)} → {formatNumber(token.marketCap)}
      </span>
      <span className={`font-black ${isPositive ? 'text-emerald-700' : 'text-red-700'}`}>
        ({performance.mcMultiplier >= 2 ? `${performance.mcMultiplier.toFixed(1)}x` : `${performance.mcChangePercent >= 0 ? '+' : ''}${performance.mcChangePercent.toFixed(0)}%`})
      </span>
    </div>
  );
}

// === FULL VIEW (for TokenDetailModal) ===
function FullView({ token, snapshot, performance }: PerformanceTrackerProps) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <span>📊</span>
          <span>Performance Tracker</span>
        </h3>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
          performance.status === 'rocket' ? 'bg-emerald-100 text-emerald-700' :
          performance.status === 'growing' ? 'bg-blue-100 text-blue-700' :
          performance.status === 'stable' ? 'bg-slate-100 text-slate-600' :
          performance.status === 'declining' ? 'bg-amber-100 text-amber-700' :
          'bg-red-100 text-red-700'
        }`}>
          {performance.statusEmoji} {performance.statusLabel}
        </span>
      </div>

      {/* Detection info */}
      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[10px] text-slate-500">
        🔍 Terdeteksi oleh scanner <strong className="text-slate-700">{performance.timeSinceDetectionFormatted}</strong> · Updated {snapshot.updateCount}x
      </div>

      {/* Main Before/After Card */}
      <div className="rounded-xl border-2 border-dashed border-slate-200 overflow-hidden">
        {/* MC Before/After */}
        <BeforeAfterRow
          label="Market Cap"
          emoji="💰"
          before={formatNumber(snapshot.snapshotMarketCap)}
          after={formatNumber(token.marketCap)}
          changePercent={performance.mcChangePercent}
          multiplier={performance.mcMultiplier}
          highlight
        />

        {/* Price Before/After */}
        <BeforeAfterRow
          label="Harga"
          emoji="💵"
          before={formatPrice(snapshot.snapshotPrice)}
          after={formatPrice(token.priceUsd)}
          changePercent={performance.priceChangePercent}
          multiplier={performance.priceMultiplier}
        />

        {/* Liquidity */}
        <BeforeAfterRow
          label="Liquidity"
          emoji="🏊"
          before={formatNumber(snapshot.snapshotLiquidity)}
          after={formatNumber(token.liquidity)}
          changePercent={performance.liquidityChangePercent}
        />

        {/* Holders */}
        {(snapshot.snapshotHolders > 0 || token.holders > 0) && (
          <BeforeAfterRow
            label="Holders"
            emoji="👥"
            before={snapshot.snapshotHolders.toLocaleString()}
            after={token.holders > 0 ? token.holders.toLocaleString() : 'N/A'}
            changePercent={performance.holdersChangePercent}
          />
        )}

        {/* OG Score */}
        <BeforeAfterRow
          label="OG Score"
          emoji="🎯"
          before={snapshot.snapshotOgScore.toString()}
          after={token.ogScore.toString()}
          changePercent={0}
          scoreChange={performance.ogScoreChange}
        />
      </div>

      {/* Peak Performance */}
      {performance.peakMultiplier > 1.1 && (
        <div className={`p-3 rounded-xl border ${
          performance.peakMultiplier >= 10 ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300' :
          performance.peakMultiplier >= 5 ? 'bg-emerald-50 border-emerald-200' :
          'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-500 font-medium">🏔️ Peak Tertinggi (All-Time)</div>
              <div className="text-sm font-black text-slate-900 mt-0.5">
                {performance.peakMultiplier.toFixed(1)}x dari deteksi awal
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-500 font-medium">Peak MC</div>
              <div className="text-xs font-bold text-slate-800">{formatNumber(snapshot.peakMarketCap)}</div>
            </div>
          </div>
          {performance.currentVsPeak < -10 && (
            <div className="mt-1.5 text-[9px] text-amber-700 font-semibold">
              📉 Saat ini {performance.currentVsPeak.toFixed(0)}% dari peak — {performance.currentVsPeak < -50 ? 'Jauh dari ATH' : 'Pullback dari ATH'}
            </div>
          )}
        </div>
      )}

      {/* Mini Price History Chart */}
      {snapshot.priceHistory.length > 2 && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold text-slate-500">📈 Riwayat Market Cap Sejak Deteksi</div>
          <MiniChart history={snapshot.priceHistory} />
        </div>
      )}

      {/* Investment Simulator */}
      <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200/80">
        <div className="text-[10px] font-bold text-indigo-700 mb-1.5">💡 Simulasi Investasi</div>
        <div className="grid grid-cols-3 gap-2 text-[10px]">
          <SimCard amount={100000} multiplier={performance.mcMultiplier} label="Rp 100K" />
          <SimCard amount={500000} multiplier={performance.mcMultiplier} label="Rp 500K" />
          <SimCard amount={1000000} multiplier={performance.mcMultiplier} label="Rp 1 Juta" />
        </div>
        <p className="text-[8px] text-indigo-500 mt-1.5 italic">* Simulasi berdasarkan perubahan MC, hasil aktual bisa berbeda</p>
      </div>
    </div>
  );
}

// === SUB-COMPONENTS ===

function BeforeAfterRow({ label, emoji, before, after, changePercent, multiplier, highlight, scoreChange }: {
  label: string;
  emoji: string;
  before: string;
  after: string;
  changePercent: number;
  multiplier?: number;
  highlight?: boolean;
  scoreChange?: number;
}) {
  const isPositive = multiplier ? multiplier >= 1 : changePercent >= 0;
  const showMultiplier = multiplier && multiplier >= 2;

  return (
    <div className={`flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 last:border-b-0 ${
      highlight ? 'bg-slate-50/50' : ''
    }`}>
      <span className="text-sm">{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[9px] text-slate-400 font-medium mb-0.5">{label}</div>
        <div className="flex items-center gap-1.5">
          {/* BEFORE */}
          <span className="text-[11px] font-semibold text-slate-500">{before}</span>
          {/* Arrow */}
          <motion.span
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            className={`text-[11px] font-bold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}
          >
            →
          </motion.span>
          {/* AFTER */}
          <span className={`text-[11px] font-bold ${isPositive ? 'text-emerald-700' : 'text-red-700'}`}>
            {after}
          </span>
        </div>
      </div>
      {/* Change badge */}
      <div className="text-right shrink-0">
        {scoreChange !== undefined ? (
          <span className={`text-[10px] font-bold ${scoreChange > 0 ? 'text-emerald-700' : scoreChange < 0 ? 'text-red-700' : 'text-slate-500'}`}>
            {scoreChange > 0 ? '+' : ''}{scoreChange}
          </span>
        ) : showMultiplier ? (
          <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
            {multiplier!.toFixed(1)}x
          </span>
        ) : (
          <span className={`text-[10px] font-bold ${isPositive ? 'text-emerald-700' : 'text-red-700'}`}>
            {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
}

function MiniChart({ history }: { history: { time: string; price: number; marketCap: number; }[] }) {
  const values = history.map(h => h.marketCap);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const height = 48;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 100;
    const y = height - ((v - min) / range) * (height - 4);
    return `${x},${y}`;
  }).join(' ');

  const isUp = values[values.length - 1] >= values[0];

  return (
    <div className="relative w-full bg-slate-50 rounded-lg p-2 border border-slate-200/80" style={{ height: `${height + 16}px` }}>
      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        {/* Area fill */}
        <polygon
          points={`0,${height} ${points} 100,${height}`}
          fill={isUp ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}
        />
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={isUp ? '#10B981' : '#EF4444'}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function SimCard({ amount, multiplier, label }: { amount: number; multiplier: number; label: string }) {
  const result = amount * multiplier;
  const profit = result - amount;
  const isPositive = multiplier >= 1;

  return (
    <div className={`p-2 rounded-lg text-center ${isPositive ? 'bg-white/80' : 'bg-red-50/50'}`}>
      <div className="text-[9px] text-indigo-400 font-medium">{label}</div>
      <div className={`text-xs font-black ${isPositive ? 'text-emerald-700' : 'text-red-700'}`}>
        Rp {(result / 1000).toFixed(0)}K
      </div>
      <div className={`text-[8px] font-bold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
        {profit >= 0 ? '+' : ''}{(profit / 1000).toFixed(0)}K
      </div>
    </div>
  );
}

function formatPrice(price: number): string {
  if (price < 0.000001) return `$${price.toExponential(2)}`;
  if (price < 0.001) return `$${price.toFixed(8)}`;
  if (price < 1) return `$${price.toFixed(6)}`;
  return `$${price.toFixed(4)}`;
}

// === EXPORTED: Performance Badge for TokenCard ===
export function PerformanceBadge({ performance }: { performance: PerformanceMetrics }) {
  if (performance.mcMultiplier < 1.05 && performance.mcMultiplier > 0.95) return null; // No significant change

  const isUp = performance.mcMultiplier >= 1;

  return (
    <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[8px] font-black ${
      performance.mcMultiplier >= 10 ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-950 animate-pulse shadow-sm' :
      performance.mcMultiplier >= 5 ? 'bg-emerald-500 text-white' :
      performance.mcMultiplier >= 2 ? 'bg-emerald-100 text-emerald-800' :
      isUp ? 'bg-blue-100 text-blue-800' :
      'bg-red-100 text-red-800'
    }`}>
      <span>{performance.statusEmoji}</span>
      <span>
        {performance.mcMultiplier >= 2 ? `${performance.mcMultiplier.toFixed(1)}x` :
         `${performance.mcChangePercent >= 0 ? '+' : ''}${performance.mcChangePercent.toFixed(0)}%`}
      </span>
    </div>
  );
}
