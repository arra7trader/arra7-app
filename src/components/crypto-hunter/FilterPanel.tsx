'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import type { FilterConfig, ChainType, TierLevel, SortOption } from '@/lib/crypto-hunter/types';
import { TIER_PRESETS, DEFAULT_FILTER } from '@/lib/crypto-hunter/types';

interface FilterPanelProps {
  filters: FilterConfig;
  onFilterChange: (filters: FilterConfig) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function FilterPanel({ filters, onFilterChange, isOpen, onToggle }: FilterPanelProps) {
  const updateFilter = <K extends keyof FilterConfig>(key: K, value: FilterConfig[K]) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const applyTierPreset = (tier: string) => {
    const preset = TIER_PRESETS[tier];
    if (preset) {
      onFilterChange({ ...filters, ...preset, tier: parseInt(tier.replace('tier', '')) as TierLevel });
    }
  };

  const resetFilters = () => {
    onFilterChange(DEFAULT_FILTER);
  };

  return (
    <div className="w-full">
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 hover:border-slate-300 text-xs font-bold text-slate-700 transition-all shadow-xs"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
        </svg>
        <span>Filter OG</span>
        <span className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 p-4 bg-white rounded-2xl border border-slate-200/80 shadow-lg space-y-4">
              {/* Chain Selector */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Chain</label>
                <div className="flex gap-1.5">
                  {(['solana', 'base', 'ethereum', 'bsc'] as const).map((chain) => (
                    <button
                      key={chain}
                      onClick={() => updateFilter('chain', chain)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                        filters.chain === chain
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {chain === 'solana' ? '◎ SOL' : chain === 'base' ? '🔵 BASE' : chain === 'ethereum' ? '⟠ ETH' : '⬡ BSC'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tier Presets */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Quick Tier Preset</label>
                <div className="grid grid-cols-4 gap-1.5">
                  <button onClick={() => { applyTierPreset('tier1'); }} className={`p-2 rounded-lg text-center transition-all ${filters.tier === 1 ? 'bg-red-50 border-2 border-red-300 text-red-700' : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                    <div className="text-sm">🏴‍☠️</div>
                    <div className="text-[9px] font-bold mt-0.5">TIER 1</div>
                    <div className="text-[8px] text-slate-400">Ultra-Early</div>
                  </button>
                  <button onClick={() => { applyTierPreset('tier2'); }} className={`p-2 rounded-lg text-center transition-all ${filters.tier === 2 ? 'bg-orange-50 border-2 border-orange-300 text-orange-700' : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                    <div className="text-sm">⚡</div>
                    <div className="text-[9px] font-bold mt-0.5">TIER 2</div>
                    <div className="text-[8px] text-slate-400">Early</div>
                  </button>
                  <button onClick={() => { applyTierPreset('tier3'); }} className={`p-2 rounded-lg text-center transition-all ${filters.tier === 3 ? 'bg-yellow-50 border-2 border-yellow-300 text-yellow-700' : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                    <div className="text-sm">🎯</div>
                    <div className="text-[9px] font-bold mt-0.5">TIER 3</div>
                    <div className="text-[8px] text-slate-400">Momentum</div>
                  </button>
                  <button onClick={() => { applyTierPreset('tier4'); }} className={`p-2 rounded-lg text-center transition-all ${filters.tier === 4 ? 'bg-green-50 border-2 border-green-300 text-green-700' : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                    <div className="text-sm">🏦</div>
                    <div className="text-[9px] font-bold mt-0.5">TIER 4</div>
                    <div className="text-[8px] text-slate-400">Established</div>
                  </button>
                </div>
              </div>

              {/* Market Cap Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Min Market Cap</label>
                  <select
                    value={filters.minMarketCap}
                    onChange={(e) => updateFilter('minMarketCap', parseInt(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 bg-white"
                  >
                    <option value={0}>Any</option>
                    <option value={5000}>$5K</option>
                    <option value={10000}>$10K</option>
                    <option value={50000}>$50K</option>
                    <option value={100000}>$100K</option>
                    <option value={300000}>$300K</option>
                    <option value={1000000}>$1M</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Max Market Cap</label>
                  <select
                    value={filters.maxMarketCap}
                    onChange={(e) => updateFilter('maxMarketCap', parseInt(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 bg-white"
                  >
                    <option value={50000}>$50K</option>
                    <option value={300000}>$300K</option>
                    <option value={2000000}>$2M</option>
                    <option value={20000000}>$20M</option>
                    <option value={100000000}>$100M</option>
                    <option value={999999999}>Unlimited</option>
                  </select>
                </div>
              </div>

              {/* Liquidity & Age */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Min Liquidity</label>
                  <select
                    value={filters.minLiquidity}
                    onChange={(e) => updateFilter('minLiquidity', parseInt(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 bg-white"
                  >
                    <option value={0}>Any</option>
                    <option value={3000}>$3K</option>
                    <option value={5000}>$5K</option>
                    <option value={10000}>$10K</option>
                    <option value={30000}>$30K</option>
                    <option value={100000}>$100K</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Max Age</label>
                  <select
                    value={filters.maxAge}
                    onChange={(e) => updateFilter('maxAge', parseInt(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 bg-white"
                  >
                    <option value={30}>30 menit</option>
                    <option value={60}>1 jam</option>
                    <option value={360}>6 jam</option>
                    <option value={1440}>24 jam</option>
                    <option value={4320}>3 hari</option>
                    <option value={10080}>7 hari</option>
                    <option value={999999}>Unlimited</option>
                  </select>
                </div>
              </div>

              {/* Min OG Score & Sort */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Min OG Score</label>
                  <select
                    value={filters.minOgScore}
                    onChange={(e) => updateFilter('minOgScore', parseInt(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 bg-white"
                  >
                    <option value={0}>Any</option>
                    <option value={40}>40+ (Caution)</option>
                    <option value={60}>60+ (Interesting)</option>
                    <option value={75}>75+ (Hot)</option>
                    <option value={90}>90+ (Diamond)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Sort By</label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => updateFilter('sortBy', e.target.value as SortOption)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 bg-white"
                  >
                    <option value="ogScore">OG Score</option>
                    <option value="marketCap">Market Cap</option>
                    <option value="volume24h">Volume 24h</option>
                    <option value="age">Newest First</option>
                    <option value="priceChange1h">Price Change 1h</option>
                    <option value="vmcRatio">VMC Ratio</option>
                  </select>
                </div>
              </div>

              {/* Security Only Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-700">🛡️ Security-Verified Only</span>
                  <span className="text-[9px] text-slate-400">(Hide honeypots & mintable tokens)</span>
                </div>
                <button
                  onClick={() => updateFilter('securityOnly', !filters.securityOnly)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    filters.securityOnly ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                    filters.securityOnly ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {/* Reset Button */}
              <button
                onClick={resetFilters}
                className="w-full py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold transition-colors"
              >
                Reset Semua Filter
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
