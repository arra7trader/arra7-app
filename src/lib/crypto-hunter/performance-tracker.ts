import type { CryptoToken, ChainType } from './types';

/**
 * PERFORMANCE TRACKER
 * 
 * Records a snapshot of each token when it's FIRST detected by the scanner.
 * On subsequent scans, compares current metrics vs the initial snapshot
 * to show Before/After performance like:
 * 
 * "Terdeteksi saat MC $5K → Sekarang $2M (+39,900%)"
 * "OG Score: 72 → 89 (+17)"
 * "Holders: 45 → 3,200 (+7,011%)"
 */

export interface TokenSnapshot {
  address: string;
  chain: ChainType;
  name: string;
  symbol: string;
  snapshotPrice: number;
  snapshotMarketCap: number;
  snapshotLiquidity: number;
  snapshotHolders: number;
  snapshotVolume24h: number;
  snapshotOgScore: number;
  snapshotTier: number;
  snapshotBuySellRatio: number;
  snapshotVmcRatio: number;
  latestPrice?: number;
  latestMarketCap?: number;
  latestLiquidity?: number;
  latestHolders?: number;
  latestOgScore?: number;
  latestVolume24h?: number;
  detectedAt: string;
  lastUpdatedAt: string;
  updateCount: number;
  priceHistory: { time: string; price: number; marketCap: number; }[];
  peakPrice: number;
  peakMarketCap: number;
  peakMultiplier: number;
  imageUrl?: string;
}

export interface PerformanceMetrics {
  priceChange: number;
  priceChangePercent: number;
  priceMultiplier: number;
  mcChange: number;
  mcChangePercent: number;
  mcMultiplier: number;
  liquidityChange: number;
  liquidityChangePercent: number;
  holdersChange: number;
  holdersChangePercent: number;
  ogScoreChange: number;
  timeSinceDetection: number;
  timeSinceDetectionFormatted: string;
  peakMultiplier: number;
  currentVsPeak: number;
  status: 'rocket' | 'growing' | 'stable' | 'declining' | 'crashed';
  statusEmoji: string;
  statusLabel: string;
  statusColor: string;
}

const STORAGE_KEY = 'cryptoHunterSnapshots';
const MAX_HISTORY_POINTS = 48;
const MAX_SNAPSHOTS = 500;

function getKey(address: string, chain: ChainType): string {
  return `${chain}:${address}`;
}

function formatTimeSince(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} menit lalu`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} jam lalu`;
  if (minutes < 10080) return `${Math.round(minutes / 1440)} hari lalu`;
  return `${Math.round(minutes / 10080)} minggu lalu`;
}

export function getSnapshots(): Map<string, TokenSnapshot> {
  if (typeof window === 'undefined') return new Map();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    const arr: TokenSnapshot[] = JSON.parse(raw);
    const map = new Map<string, TokenSnapshot>();
    for (const snap of arr) {
      map.set(getKey(snap.address, snap.chain), snap);
    }
    return map;
  } catch {
    return new Map();
  }
}

function saveSnapshots(snapshots: Map<string, TokenSnapshot>): void {
  if (typeof window === 'undefined') return;
  try {
    const arr = Array.from(snapshots.values());
    if (arr.length > MAX_SNAPSHOTS) {
      arr.sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime());
      arr.length = MAX_SNAPSHOTS;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // localStorage unavailable or full
  }
}

export function processTokenBatch(tokens: CryptoToken[]): Map<string, TokenSnapshot> {
  const snapshots = getSnapshots();
  const now = new Date().toISOString();

  for (const token of tokens) {
    const key = getKey(token.address, token.chain);
    const existing = snapshots.get(key);

    if (!existing) {
      const snapshot: TokenSnapshot = {
        address: token.address,
        chain: token.chain,
        name: token.name,
        symbol: token.symbol,
        snapshotPrice: token.priceUsd,
        snapshotMarketCap: token.marketCap,
        snapshotLiquidity: token.liquidity,
        snapshotHolders: token.holders,
        snapshotVolume24h: token.volume24h,
        snapshotOgScore: token.ogScore,
        snapshotTier: token.tier,
        snapshotBuySellRatio: token.buySellRatio,
        snapshotVmcRatio: token.vmcRatio,
        latestPrice: token.priceUsd,
        latestMarketCap: token.marketCap,
        latestLiquidity: token.liquidity,
        latestHolders: token.holders,
        latestOgScore: token.ogScore,
        latestVolume24h: token.volume24h,
        detectedAt: now,
        lastUpdatedAt: now,
        updateCount: 1,
        priceHistory: [{ time: now, price: token.priceUsd, marketCap: token.marketCap }],
        peakPrice: token.priceUsd,
        peakMarketCap: token.marketCap,
        peakMultiplier: 1,
        imageUrl: token.imageUrl,
      };
      snapshots.set(key, snapshot);
    } else {
      existing.lastUpdatedAt = now;
      existing.updateCount += 1;
      existing.name = token.name;
      existing.imageUrl = token.imageUrl || existing.imageUrl;
      existing.latestPrice = token.priceUsd;
      existing.latestMarketCap = token.marketCap;
      existing.latestLiquidity = token.liquidity;
      existing.latestHolders = token.holders;
      existing.latestOgScore = token.ogScore;
      existing.latestVolume24h = token.volume24h;

      if (token.priceUsd > existing.peakPrice) {
        existing.peakPrice = token.priceUsd;
      }
      if (token.marketCap > existing.peakMarketCap) {
        existing.peakMarketCap = token.marketCap;
      }
      if (existing.snapshotMarketCap > 0) {
        const currentMult = token.marketCap / existing.snapshotMarketCap;
        if (currentMult > existing.peakMultiplier) {
          existing.peakMultiplier = currentMult;
        }
      }

      const lastPoint = existing.priceHistory[existing.priceHistory.length - 1];
      const timeDiff = lastPoint ? (Date.now() - new Date(lastPoint.time).getTime()) / 60000 : 999;
      if (timeDiff >= 5) {
        existing.priceHistory.push({
          time: now,
          price: token.priceUsd,
          marketCap: token.marketCap,
        });
        if (existing.priceHistory.length > MAX_HISTORY_POINTS) {
          existing.priceHistory = existing.priceHistory.slice(-MAX_HISTORY_POINTS);
        }
      }

      snapshots.set(key, existing);
    }
  }

  saveSnapshots(snapshots);
  return snapshots;
}

export function calculatePerformance(token: CryptoToken, snapshot: TokenSnapshot): PerformanceMetrics {
  const priceDiff = token.priceUsd - snapshot.snapshotPrice;
  const pricePercent = snapshot.snapshotPrice > 0 ? (priceDiff / snapshot.snapshotPrice) * 100 : 0;
  const priceMult = snapshot.snapshotPrice > 0 ? token.priceUsd / snapshot.snapshotPrice : 1;

  const mcDiff = token.marketCap - snapshot.snapshotMarketCap;
  const mcPercent = snapshot.snapshotMarketCap > 0 ? (mcDiff / snapshot.snapshotMarketCap) * 100 : 0;
  const mcMult = snapshot.snapshotMarketCap > 0 ? token.marketCap / snapshot.snapshotMarketCap : 1;

  const liqDiff = token.liquidity - snapshot.snapshotLiquidity;
  const liqPercent = snapshot.snapshotLiquidity > 0 ? (liqDiff / snapshot.snapshotLiquidity) * 100 : 0;

  const holdersDiff = token.holders - snapshot.snapshotHolders;
  const holdersPercent = snapshot.snapshotHolders > 0 ? (holdersDiff / snapshot.snapshotHolders) * 100 : 0;

  const ogDiff = token.ogScore - snapshot.snapshotOgScore;
  const timeSince = (Date.now() - new Date(snapshot.detectedAt).getTime()) / 60000;

  const currentVsPeak = snapshot.peakMarketCap > 0
    ? ((token.marketCap - snapshot.peakMarketCap) / snapshot.peakMarketCap) * 100
    : 0;

  let status: PerformanceMetrics['status'];
  let statusEmoji: string;
  let statusLabel: string;
  let statusColor: string;

  if (mcMult >= 5) {
    status = 'rocket'; statusEmoji = '🚀'; statusLabel = `${mcMult.toFixed(0)}x ROCKET`; statusColor = 'text-emerald-700';
  } else if (mcMult >= 2) {
    status = 'rocket'; statusEmoji = '🔥'; statusLabel = `${mcMult.toFixed(1)}x PUMPING`; statusColor = 'text-orange-700';
  } else if (mcPercent > 20) {
    status = 'growing'; statusEmoji = '📈'; statusLabel = 'GROWING'; statusColor = 'text-emerald-600';
  } else if (mcPercent >= -20) {
    status = 'stable'; statusEmoji = '➡️'; statusLabel = 'STABLE'; statusColor = 'text-slate-600';
  } else if (mcPercent >= -70) {
    status = 'declining'; statusEmoji = '📉'; statusLabel = 'DECLINING'; statusColor = 'text-amber-600';
  } else {
    status = 'crashed'; statusEmoji = '💀'; statusLabel = 'CRASHED'; statusColor = 'text-red-700';
  }

  return {
    priceChange: priceDiff,
    priceChangePercent: pricePercent,
    priceMultiplier: priceMult,
    mcChange: mcDiff,
    mcChangePercent: mcPercent,
    mcMultiplier: mcMult,
    liquidityChange: liqDiff,
    liquidityChangePercent: liqPercent,
    holdersChange: holdersDiff,
    holdersChangePercent: holdersPercent,
    ogScoreChange: ogDiff,
    timeSinceDetection: timeSince,
    timeSinceDetectionFormatted: formatTimeSince(timeSince),
    peakMultiplier: snapshot.peakMultiplier,
    currentVsPeak,
    status,
    statusEmoji,
    statusLabel,
    statusColor,
  };
}

export function getTopPerformers(currentTokens: CryptoToken[], limit: number = 20, trackedSnapshots?: TokenSnapshot[]): Array<{
  token: CryptoToken;
  snapshot: TokenSnapshot;
  performance: PerformanceMetrics;
}> {
  const snapshots = trackedSnapshots
    ? new Map(trackedSnapshots.map(snapshot => [getKey(snapshot.address, snapshot.chain), snapshot]))
    : getSnapshots();
  const results: Array<{ token: CryptoToken; snapshot: TokenSnapshot; performance: PerformanceMetrics; }> = [];

  const currentByKey = new Map(currentTokens.map(token => [getKey(token.address, token.chain), token]));

  for (const [key, snapshot] of snapshots) {
    const token = currentByKey.get(key) || (() => {
      const lastHistory = snapshot.priceHistory[snapshot.priceHistory.length - 1];
      if (!lastHistory) return null;
      return {
          address: snapshot.address,
          chain: snapshot.chain,
          name: snapshot.name,
          symbol: snapshot.symbol,
          marketCap: snapshot.latestMarketCap ?? lastHistory.marketCap,
          priceUsd: snapshot.latestPrice ?? lastHistory.price,
          liquidity: snapshot.latestLiquidity ?? snapshot.snapshotLiquidity,
          volume24h: snapshot.latestVolume24h ?? snapshot.snapshotVolume24h,
          priceChange5m: 0, priceChange1h: 0, priceChange6h: 0, priceChange24h: 0,
          holders: snapshot.latestHolders ?? snapshot.snapshotHolders, holderGrowthRate: 0,
          age: (Date.now() - new Date(snapshot.detectedAt).getTime()) / 60000,
          vmcRatio: 0, buySellRatio: 50,
          ogScore: snapshot.latestOgScore ?? snapshot.snapshotOgScore,
          tier: snapshot.snapshotTier as any,
          security: { mintRevoked: null, freezeRevoked: null, lpBurned: false, lpLocked: false, lpLockDuration: null, isHoneypot: null, buyTax: null, sellTax: null, isOpenSource: null, devHoldingPercent: null, top10HoldingPercent: null, bundlePercent: null, rugcheckScore: 'Unknown', securityScore: 5 },
          smartMoney: { smartWalletCount: 0, totalSmartMoneyInvested: 0, avgSmartWalletWinRate: 0, firstSmartBuyTime: null, smartMoneyScore: 0 },
          poolAddress: '', pairUrl: '', createdAt: snapshot.detectedAt,
          txCount24h: 0, buyCount24h: 0, sellCount24h: 0,
          imageUrl: snapshot.imageUrl,
        } satisfies CryptoToken;
    })();
    if (token) {
      const performance = calculatePerformance(token, snapshot);
      results.push({ token, snapshot, performance });
    }
  }

  results.sort((a, b) => b.performance.mcMultiplier - a.performance.mcMultiplier);
  return results.slice(0, limit);
}

export function getTokenSnapshot(address: string, chain: ChainType): TokenSnapshot | null {
  const snapshots = getSnapshots();
  return snapshots.get(getKey(address, chain)) || null;
}

export function getTrackerStats(trackedSnapshots?: TokenSnapshot[]): {
  totalTracked: number;
  totalRockets: number;
  totalPumping: number;
  totalGrowing: number;
  bestMultiplier: number;
  bestToken: string;
} {
  const snapshots = trackedSnapshots
    ? new Map(trackedSnapshots.map(snapshot => [getKey(snapshot.address, snapshot.chain), snapshot]))
    : getSnapshots();
  let totalRockets = 0;
  let totalPumping = 0;
  let totalGrowing = 0;
  let bestMultiplier = 0;
  let bestToken = '';

  for (const [, snap] of snapshots) {
    if (snap.peakMultiplier >= 5) totalRockets++;
    else if (snap.peakMultiplier >= 2) totalPumping++;
    else if (snap.peakMultiplier >= 1.2) totalGrowing++;

    if (snap.peakMultiplier > bestMultiplier) {
      bestMultiplier = snap.peakMultiplier;
      bestToken = snap.symbol;
    }
  }

  return {
    totalTracked: snapshots.size,
    totalRockets,
    totalPumping,
    totalGrowing,
    bestMultiplier,
    bestToken,
  };
}
