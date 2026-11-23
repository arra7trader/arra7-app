import { EAStyle, EAPair, EAModule, BacktestTelemetry } from './types';

// Deterministic Pseudo-Random Generator (Linear Congruential)
function createSeededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function simulateEABacktest(
  modules: EAModule[],
  style: EAStyle,
  pair: EAPair,
  riskPercent: number = 1.0,
  initialBalance: number = 10000
): BacktestTelemetry {
  if (modules.length === 0) {
    return {
      winRate: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      totalTrades: 0,
      expectedPayoffPips: 0,
      monthlyReturnEst: 0,
      sharpeRatio: 0,
      equityCurve: [{ trade: 0, equity: initialBalance, isWin: false }]
    };
  }

  // Base metrics from selected modules
  const avgWinRate = modules.reduce((acc, m) => acc + m.baseWinRate, 0) / modules.length;
  const avgPF = modules.reduce((acc, m) => acc + m.baseProfitFactor, 0) / modules.length;
  const avgDD = modules.reduce((acc, m) => acc + m.baseDrawdown, 0) / modules.length;

  // Synergy bonus for multi-module confluence (1-3 modules)
  const count = modules.length;
  const synergyWinBonus = count === 1 ? 0 : count === 2 ? 2.4 : count >= 3 ? 3.8 : 0;
  const synergyDDReduction = count > 1 ? (count * 0.4) : 0;

  // Style adjustment
  let tradeCount = 200;
  let rewardRatio = 1.6; // Average RR
  let pipsAvg = 15;

  if (style === 'hft') {
    tradeCount = 350;
    rewardRatio = 1.25;
    pipsAvg = 6;
  } else if (style === 'scalping') {
    tradeCount = 220;
    rewardRatio = 1.65;
    pipsAvg = 18;
  } else if (style === 'intraday') {
    tradeCount = 130;
    rewardRatio = 2.40;
    pipsAvg = 45;
  }

  // Pair adjustment
  if (pair === 'XAUUSD') {
    pipsAvg *= 1.8;
  } else if (pair === 'BTCUSD') {
    pipsAvg *= 3.5;
  }

  const finalWinRate = Math.min(84.0, Math.max(65.0, avgWinRate + synergyWinBonus));
  const finalPF = Number(Math.min(3.2, Math.max(1.75, avgPF + (count > 1 ? 0.22 : 0))).toFixed(2));
  const finalDD = Number(Math.max(3.2, avgDD - synergyDDReduction).toFixed(1));

  // Seed generation based on module IDs string hash
  const seedString = modules.map(m => m.id).join('_') + '_' + style + '_' + pair;
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = (hash << 5) - hash + seedString.charCodeAt(i);
    hash |= 0;
  }
  const random = createSeededRandom(Math.abs(hash) || 777);

  // Run sequential trade simulation
  let currentEquity = initialBalance;
  let peakEquity = initialBalance;
  let maxDDVal = 0;
  let winCount = 0;

  const equityCurve: { trade: number; equity: number; isWin: boolean }[] = [
    { trade: 0, equity: initialBalance, isWin: false }
  ];

  const riskFraction = (riskPercent / 100);

  for (let t = 1; t <= tradeCount; t++) {
    const roll = random() * 100;
    const isWin = roll < finalWinRate;

    const riskAmount = currentEquity * riskFraction;
    if (isWin) {
      winCount++;
      // Slight variance in reward
      const gainMult = rewardRatio * (0.85 + random() * 0.3);
      currentEquity += riskAmount * gainMult;
    } else {
      // Risk loss (SL hit with minor slippage variance)
      const lossMult = 1.0 + (random() * 0.05);
      currentEquity -= riskAmount * lossMult;
    }

    if (currentEquity > peakEquity) {
      peakEquity = currentEquity;
    }

    const currentDD = ((peakEquity - currentEquity) / peakEquity) * 100;
    if (currentDD > maxDDVal) {
      maxDDVal = currentDD;
    }

    // Record sample points every few trades to keep curve light
    if (t % Math.max(1, Math.floor(tradeCount / 50)) === 0 || t === tradeCount) {
      equityCurve.push({
        trade: t,
        equity: Math.round(currentEquity),
        isWin
      });
    }
  }

  const actualWinRate = Number(((winCount / tradeCount) * 100).toFixed(1));
  const totalReturn = ((currentEquity - initialBalance) / initialBalance) * 100;
  const monthlyReturnEst = Number((totalReturn / 3).toFixed(1)); // Approx 3 months of trades
  const sharpe = Number((finalPF * 0.95).toFixed(2));
  const calculatedDD = Number(Math.max(finalDD, maxDDVal).toFixed(1));

  return {
    winRate: actualWinRate,
    profitFactor: finalPF,
    maxDrawdown: calculatedDD,
    totalTrades: tradeCount,
    expectedPayoffPips: Number(pipsAvg.toFixed(1)),
    monthlyReturnEst: Math.max(12.5, monthlyReturnEst),
    sharpeRatio: sharpe,
    equityCurve
  };
}
