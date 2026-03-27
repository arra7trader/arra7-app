export type TelebotSetupStyle = 'conservative' | 'standard' | 'aggressive';

export interface TelebotTradePlan {
  riskAmount: number;
  recommendedLot: number;
  projectedProfit: number | null;
  stopDistance: number;
  rr: number | null;
  setupLabel: string;
  sizingNote: string;
}

export function formatTelebotSetupStyle(style: string | null | undefined): string {
  const value = String(style || '').trim().toLowerCase();
  if (value === 'conservative') return 'Conservative';
  if (value === 'aggressive') return 'Aggressive';
  return 'Standard';
}

function roundSize(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value < 0.1) return Number(value.toFixed(2));
  if (value < 1) return Number(value.toFixed(2));
  if (value < 10) return Number(value.toFixed(2));
  return Number(value.toFixed(1));
}

function estimateUsdRiskPerLot(symbol: string, entryPrice: number, stopLoss: number): { amount: number; note: string } {
  const stopDistance = Math.abs(entryPrice - stopLoss);
  if (!(stopDistance > 0) || !(entryPrice > 0)) {
    return { amount: 0, note: 'SL belum cukup jelas untuk sizing.' };
  }

  const normalized = symbol.toUpperCase();

  if (normalized.includes('XAU') || normalized.includes('GOLD')) {
    return { amount: stopDistance * 100, note: 'Estimasi sizing XAUUSD memakai kontrak 100 oz per 1.00 lot.' };
  }

  if (normalized.endsWith('USD') && normalized.length === 6) {
    return { amount: stopDistance * 100000, note: 'Estimasi forex major memakai kontrak 100k per 1.00 lot.' };
  }

  if (normalized.endsWith('JPY') && normalized.length === 6) {
    return {
      amount: (stopDistance * 100000) / entryPrice,
      note: 'Estimasi forex JPY disesuaikan ke USD secara kasar dari harga saat ini.'
    };
  }

  if (normalized.includes('BTC') || normalized.includes('ETH') || normalized.includes('SOL') || normalized.includes('CRYPTO')) {
    return { amount: stopDistance, note: 'Estimasi crypto memakai 1 unit kontrak per 1.00 size.' };
  }

  if (normalized.includes('US30') || normalized.includes('NAS') || normalized.includes('SPX') || normalized.includes('WTI') || normalized.includes('BRENT')) {
    return { amount: stopDistance, note: 'Estimasi index/commodity memakai 1 unit kontrak per 1.00 size.' };
  }

  return { amount: stopDistance * 10000, note: 'Estimasi generik dipakai karena kontrak pair ini tidak standar USD.' };
}

export function calculateTelebotTradePlan(params: {
  symbol: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  balanceAmount: number;
  riskPercent: number;
  setupStyle: string;
}): TelebotTradePlan | null {
  const entryPrice = Number(params.entryPrice || 0);
  const stopLoss = Number(params.stopLoss || 0);
  const takeProfit1 = Number(params.takeProfit1 || 0);
  const balanceAmount = Number(params.balanceAmount || 0);
  const riskPercent = Number(params.riskPercent || 0);

  if (!(entryPrice > 0) || !(stopLoss > 0) || !(balanceAmount > 0) || !(riskPercent > 0)) {
    return null;
  }

  const riskAmount = balanceAmount * (riskPercent / 100);
  const stopDistance = Math.abs(entryPrice - stopLoss);
  const reward = Math.abs(takeProfit1 - entryPrice);
  const rr = stopDistance > 0 && reward > 0 ? reward / stopDistance : null;

  const sizing = estimateUsdRiskPerLot(params.symbol, entryPrice, stopLoss);
  if (!(sizing.amount > 0)) {
    return null;
  }

  const recommendedLot = roundSize(riskAmount / sizing.amount);
  const projectedProfit = rr !== null ? riskAmount * rr : null;

  return {
    riskAmount,
    recommendedLot,
    projectedProfit,
    stopDistance,
    rr,
    setupLabel: formatTelebotSetupStyle(params.setupStyle),
    sizingNote: sizing.note
  };
}
