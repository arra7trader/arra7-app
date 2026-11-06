import { CryptoToken, OGScoreBreakdown, OGGrade, TokenSecurity, TierLevel } from './types';

/**
 * MARKET SIGNAL SCORE:
 * Total = Security (30) + Market Activity (25) + Momentum (20) + Distribution (15) + Profile Completeness (10)
 * Wallet histories are not currently available from this scanner and do not contribute to this score.
 */
export function calculateOGScore(token: Partial<CryptoToken>): OGScoreBreakdown {
  const securityScore = token.security?.securityScore ?? 0;
  const activityScore = calculateActivityScore(token);
  const momentumScore = calculateMomentumScore(token);
  const distributionScore = calculateDistributionScore(token);
  const metadataScore = calculateMetadataScore(token);

  const totalScore = Math.min(100, Math.round(
    securityScore + activityScore + momentumScore + distributionScore + metadataScore
  ));

  return {
    securityScore,
    activityScore,
    momentumScore,
    distributionScore,
    metadataScore,
    totalScore,
    grade: getGrade(totalScore),
  };
}

function calculateActivityScore(token: Partial<CryptoToken>): number {
  let score = 0;

  // Observed transaction count (0-5)
  const txCount = token.txCount24h ?? 0;
  if (txCount >= 1000) score += 5;
  else if (txCount >= 500) score += 4;
  else if (txCount >= 200) score += 3;
  else if (txCount >= 50) score += 2;
  else if (txCount > 0) score += 1;

  // Volume/liquidity ratio (0-10)
  const volumeLiquidityRatio = token.liquidity && token.liquidity > 0
    ? (token.volume24h ?? 0) / token.liquidity
    : 0;
  if (volumeLiquidityRatio >= 5) score += 10;
  else if (volumeLiquidityRatio >= 3) score += 8;
  else if (volumeLiquidityRatio >= 1.5) score += 6;
  else if (volumeLiquidityRatio >= 0.75) score += 4;
  else if (volumeLiquidityRatio >= 0.25) score += 2;

  // Active buyer share (0-10); this is not a unique-wallet or smart-money metric.
  const buySellRatio = token.buySellRatio ?? 0;
  if (txCount >= 20) {
    if (buySellRatio >= 65) score += 10;
    else if (buySellRatio >= 58) score += 8;
    else if (buySellRatio >= 52) score += 5;
    else if (buySellRatio >= 48) score += 2;
  }

  return Math.min(score, 25);
}

function calculateMomentumScore(token: Partial<CryptoToken>): number {
  let score = 0;

  // Holder growth rate (0-5)
  const hgr = token.holderGrowthRate ?? 0;
  if (hgr >= 10) score += 5;
  else if (hgr >= 5) score += 3;
  else if (hgr >= 1) score += 1;

  // Short and medium horizon price action. Sharp vertical moves receive less weight.
  const pc5m = token.priceChange5m ?? 0;
  const pc1h = token.priceChange1h ?? 0;
  const pc6h = token.priceChange6h ?? 0;
  const pc24h = token.priceChange24h ?? 0;
  if (pc5m > 0 && pc5m <= 8) score += 2;
  else if (pc5m > 8 && pc5m <= 20) score += 1;
  if (pc1h >= 5 && pc1h <= 15) score += 4;
  else if (pc1h > 15 && pc1h <= 40) score += 6;
  else if (pc1h > 40 && pc1h <= 80) score += 3;
  else if (pc1h > 80) score += 1;
  if (pc6h >= 5 && pc6h <= 60) score += 3;
  else if (pc6h > 60) score += 1;
  else if (pc6h < -20) score -= 2;
  if (pc24h >= 5 && pc24h <= 100) score += 2;
  else if (pc24h > 100) score += 1;
  else if (pc24h < -30) score -= 2;

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
  const ageMinutes = token.ageIsEstimate ? 9999 : token.age ?? 9999;
  const holdersPerHour = holders / Math.max(1, ageMinutes / 60);
  if (holdersPerHour >= 50) score += 3;
  else if (holdersPerHour >= 20) score += 2;
  else if (holdersPerHour >= 5) score += 1;

  // Bundle percent (0-2)
  const bp = sec?.bundlePercent;
  if (bp !== null && bp !== undefined) {
    if (bp < 10) score += 2;
    else if (bp < 20) score += 1;
  }

  return Math.min(score, 15);
}

function calculateMetadataScore(token: Partial<CryptoToken>): number {
  let score = 0;

  // Has website (1)
  if (token.websiteUrl) score += 1;
  // Has twitter (2)
  if (token.twitterUrl) score += 2;
  // Has telegram (2)
  if (token.telegramUrl) score += 2;
  // Has image/logo (1)
  if (token.imageUrl) score += 1;

  // Project descriptions only measure profile completeness, never narrative quality.
  const descriptionLength = (token.description || '').trim().length;
  if (descriptionLength >= 200) score += 4;
  else if (descriptionLength >= 80) score += 2;

  return Math.min(score, 10);
}

function getGrade(score: number): OGGrade {
  if (score >= 90) return 'HIGH_SIGNAL';
  if (score >= 75) return 'ACTIVE';
  if (score >= 60) return 'WATCH';
  if (score >= 40) return 'LOW_SIGNAL';
  return 'INSUFFICIENT';
}

export function getGradeConfig(grade: OGGrade): { label: string; emoji: string; color: string; bgColor: string; borderColor: string; } {
  switch (grade) {
    case 'HIGH_SIGNAL': return { label: 'SKOR TINGGI', emoji: '💎', color: 'text-cyan-700', bgColor: 'bg-cyan-50', borderColor: 'border-cyan-300' };
    case 'ACTIVE': return { label: 'ACTIVE', emoji: '🔥', color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-300' };
    case 'WATCH': return { label: 'WATCH', emoji: '⚡', color: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-300' };
    case 'LOW_SIGNAL': return { label: 'LOW SIGNAL', emoji: '⚠️', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-300' };
    case 'INSUFFICIENT': return { label: 'LIMITED DATA', emoji: '▫️', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-300' };
  }
}

export function determineTier(marketCap: number): TierLevel {
  if (marketCap < 50000) return 1;
  if (marketCap < 300000) return 2;
  if (marketCap < 2000000) return 3;
  return 4;
}

export function getTierConfig(tier: TierLevel): { label: string; emoji: string; color: string; riskLabel: string } {
  switch (tier) {
    case 1: return { label: 'TIER 1', emoji: '🏴‍☠️', color: 'text-red-600', riskLabel: 'Ultra-Early' };
    case 2: return { label: 'TIER 2', emoji: '⚡', color: 'text-orange-600', riskLabel: 'Early Entry' };
    case 3: return { label: 'TIER 3', emoji: '🎯', color: 'text-yellow-600', riskLabel: 'Momentum' };
    case 4: return { label: 'TIER 4', emoji: '🏦', color: 'text-green-600', riskLabel: 'Established' };
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
