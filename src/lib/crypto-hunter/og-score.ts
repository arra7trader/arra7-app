import { CryptoToken, OGScoreBreakdown, OGGrade, TokenSecurity, SmartMoneyData, TierLevel } from './types';

/**
 * OG SCORE FORMULA:
 * Total = Security (30) + SmartMoney (25) + Momentum (20) + Distribution (15) + Narrative (10)
 */
export function calculateOGScore(token: Partial<CryptoToken>): OGScoreBreakdown {
  const securityScore = token.security?.securityScore ?? 5;
  const smartMoneyScore = calculateSmartMoneyScore(token.smartMoney);
  const momentumScore = calculateMomentumScore(token);
  const distributionScore = calculateDistributionScore(token);
  const narrativeScore = calculateNarrativeScore(token);

  const totalScore = Math.min(100, Math.round(
    securityScore + smartMoneyScore + momentumScore + distributionScore + narrativeScore
  ));

  return {
    securityScore,
    smartMoneyScore,
    momentumScore,
    distributionScore,
    narrativeScore,
    totalScore,
    grade: getGrade(totalScore),
  };
}

function calculateSmartMoneyScore(sm?: SmartMoneyData): number {
  if (!sm) return 0;
  let score = 0;

  // Smart wallet count (0-15)
  if (sm.smartWalletCount >= 5) score += 15;
  else if (sm.smartWalletCount >= 3) score += 12;
  else if (sm.smartWalletCount >= 2) score += 8;
  else if (sm.smartWalletCount >= 1) score += 4;

  // Average win rate of smart wallets (0-5)
  if (sm.avgSmartWalletWinRate >= 80) score += 5;
  else if (sm.avgSmartWalletWinRate >= 60) score += 3;
  else if (sm.avgSmartWalletWinRate >= 40) score += 1;

  // Total invested by smart money (0-5)
  if (sm.totalSmartMoneyInvested >= 10000) score += 5;
  else if (sm.totalSmartMoneyInvested >= 5000) score += 3;
  else if (sm.totalSmartMoneyInvested >= 1000) score += 1;

  return Math.min(score, 25);
}

function calculateMomentumScore(token: Partial<CryptoToken>): number {
  let score = 0;

  // VMC Ratio (0-7)
  const vmc = token.vmcRatio ?? 0;
  if (vmc >= 3.0) score += 7;
  else if (vmc >= 1.5) score += 5;
  else if (vmc >= 1.0) score += 3;
  else if (vmc >= 0.5) score += 1;

  // Holder growth rate (0-5)
  const hgr = token.holderGrowthRate ?? 0;
  if (hgr >= 10) score += 5;
  else if (hgr >= 5) score += 3;
  else if (hgr >= 1) score += 1;

  // Buy/Sell ratio (0-4)
  const bsr = token.buySellRatio ?? 50;
  if (bsr >= 70) score += 4;
  else if (bsr >= 60) score += 3;
  else if (bsr >= 55) score += 1;

  // Price momentum (0-4)
  const pc1h = token.priceChange1h ?? 0;
  if (pc1h >= 50) score += 4;
  else if (pc1h >= 20) score += 3;
  else if (pc1h >= 5) score += 1;
  else if (pc1h < -20) score -= 1;

  return Math.max(0, Math.min(score, 20));
}

function calculateDistributionScore(token: Partial<CryptoToken>): number {
  let score = 0;
  const sec = token.security;

  // Top 10 holder concentration (0-6)
  const top10 = sec?.top10HoldingPercent;
  if (top10 !== null && top10 !== undefined) {
    if (top10 < 20) score += 6;
    else if (top10 < 30) score += 4;
    else if (top10 < 40) score += 2;
    else if (top10 < 50) score += 1;
  }

  // Dev holding (0-4)
  const devH = sec?.devHoldingPercent;
  if (devH !== null && devH !== undefined) {
    if (devH < 2) score += 4;
    else if (devH < 5) score += 3;
    else if (devH < 10) score += 1;
  }

  // Holder count relative to age (0-3)
  const holders = token.holders ?? 0;
  const ageMinutes = token.age ?? 9999;
  const holdersPerHour = holders / Math.max(1, ageMinutes / 60);
  if (holdersPerHour >= 50) score += 3;
  else if (holdersPerHour >= 20) score += 2;
  else if (holdersPerHour >= 5) score += 1;

  // Bundle percent (0-2)
  const bp = sec?.bundlePercent;
  if (bp !== null && bp !== undefined) {
    if (bp < 10) score += 2;
    else if (bp < 20) score += 1;
  } else {
    score += 1; // Unknown = partial credit
  }

  return Math.min(score, 15);
}

function calculateNarrativeScore(token: Partial<CryptoToken>): number {
  let score = 0;

  // Has website (1)
  if (token.websiteUrl) score += 1;
  // Has twitter (2)
  if (token.twitterUrl) score += 2;
  // Has telegram (2)
  if (token.telegramUrl) score += 2;
  // Has image/logo (1)
  if (token.imageUrl) score += 1;

  // Token name/symbol narrative bonus (0-4)
  // Check for trending narratives
  const name = (token.name || '').toLowerCase();
  const symbol = (token.symbol || '').toLowerCase();
  const combined = name + ' ' + symbol;

  const trendingKeywords = ['ai', 'agent', 'gpt', 'neural', 'meme', 'pepe', 'doge', 'cat', 'elon', 'trump', 'sol', 'base', 'defi', 'rwa', 'gaming'];
  const matchCount = trendingKeywords.filter(kw => combined.includes(kw)).length;
  if (matchCount >= 2) score += 4;
  else if (matchCount >= 1) score += 2;

  return Math.min(score, 10);
}

function getGrade(score: number): OGGrade {
  if (score >= 90) return 'DIAMOND';
  if (score >= 75) return 'HOT';
  if (score >= 60) return 'INTERESTING';
  if (score >= 40) return 'CAUTION';
  return 'AVOID';
}

export function getGradeConfig(grade: OGGrade): { label: string; emoji: string; color: string; bgColor: string; borderColor: string; } {
  switch (grade) {
    case 'DIAMOND': return { label: 'DIAMOND GEM', emoji: '💎', color: 'text-cyan-700', bgColor: 'bg-cyan-50', borderColor: 'border-cyan-300' };
    case 'HOT': return { label: 'HOT PICK', emoji: '🔥', color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-300' };
    case 'INTERESTING': return { label: 'INTERESTING', emoji: '⚡', color: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-300' };
    case 'CAUTION': return { label: 'CAUTION', emoji: '⚠️', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-300' };
    case 'AVOID': return { label: 'AVOID', emoji: '🚫', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-300' };
  }
}

export function determineTier(marketCap: number): TierLevel {
  if (marketCap < 50000) return 1;
  if (marketCap < 300000) return 2;
  if (marketCap < 2000000) return 3;
  return 4;
}

export function getTierConfig(tier: TierLevel): { label: string; emoji: string; color: string; riskLabel: string; targetReturn: string } {
  switch (tier) {
    case 1: return { label: 'TIER 1', emoji: '🏴‍☠️', color: 'text-red-600', riskLabel: 'Ultra-Early', targetReturn: '10-100x' };
    case 2: return { label: 'TIER 2', emoji: '⚡', color: 'text-orange-600', riskLabel: 'Early Entry', targetReturn: '5-20x' };
    case 3: return { label: 'TIER 3', emoji: '🎯', color: 'text-yellow-600', riskLabel: 'Momentum', targetReturn: '3-10x' };
    case 4: return { label: 'TIER 4', emoji: '🏦', color: 'text-green-600', riskLabel: 'Established', targetReturn: '2-5x' };
  }
}

// Utility: format numbers
export function formatNumber(num: number): string {
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

export function formatAge(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}
