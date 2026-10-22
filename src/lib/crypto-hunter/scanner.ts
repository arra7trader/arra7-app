import { CryptoToken, ChainType, FilterConfig, DEFAULT_FILTER } from './types';
import { searchTokens, getTokenPairs, getLatestBoostedTokens, mapChainId } from './dexscreener';
import { getNewPools, getTrendingPools } from './geckoterminal';
import { checkTokenSecurity, checkRugcheck } from './goplus-security';
import { calculateOGScore, determineTier } from './og-score';
import type { DexScreenerPair } from './types';

/**
 * Main scanner - fetches new tokens from multiple sources,
 * applies security checks, and calculates OG scores
 */
export async function scanNewTokens(
  chain: ChainType = 'solana',
  filters: FilterConfig = DEFAULT_FILTER
): Promise<CryptoToken[]> {
  try {
    // Fetch from multiple sources in parallel
    const [newPools, trendingPools] = await Promise.allSettled([
      getNewPools(chain),
      getTrendingPools(chain),
    ]);

    // Collect unique pool addresses
    const poolMap = new Map<string, any>();

    // Process new pools from GeckoTerminal
    if (newPools.status === 'fulfilled') {
      for (const pool of newPools.value) {
        const address = pool.attributes?.address;
        if (address) poolMap.set(address, { source: 'gecko_new', pool });
      }
    }

    // Process trending pools
    if (trendingPools.status === 'fulfilled') {
      for (const pool of trendingPools.value) {
        const address = pool.attributes?.address;
        if (address && !poolMap.has(address)) {
          poolMap.set(address, { source: 'gecko_trending', pool });
        }
      }
    }

    // Convert to CryptoToken format
    const tokens: CryptoToken[] = [];

    for (const [, entry] of poolMap) {
      try {
        const token = convertGeckoPoolToToken(entry.pool, chain);
        if (token && passesFilters(token, filters)) {
          tokens.push(token);
        }
      } catch {
        // Skip invalid tokens
      }
    }

    // Sort by OG score
    tokens.sort((a, b) => {
      if (filters.sortBy === 'ogScore') return (filters.sortOrder === 'desc' ? b.ogScore - a.ogScore : a.ogScore - b.ogScore);
      if (filters.sortBy === 'marketCap') return (filters.sortOrder === 'desc' ? b.marketCap - a.marketCap : a.marketCap - b.marketCap);
      if (filters.sortBy === 'volume24h') return (filters.sortOrder === 'desc' ? b.volume24h - a.volume24h : a.volume24h - b.volume24h);
      if (filters.sortBy === 'age') return (filters.sortOrder === 'asc' ? a.age - b.age : b.age - a.age);
      if (filters.sortBy === 'holders') return (filters.sortOrder === 'desc' ? b.holders - a.holders : a.holders - b.holders);
      if (filters.sortBy === 'priceChange1h') return (filters.sortOrder === 'desc' ? b.priceChange1h - a.priceChange1h : a.priceChange1h - b.priceChange1h);
      if (filters.sortBy === 'vmcRatio') return (filters.sortOrder === 'desc' ? b.vmcRatio - a.vmcRatio : a.vmcRatio - b.vmcRatio);
      return b.ogScore - a.ogScore;
    });

    return tokens.slice(0, 50); // Return top 50
  } catch (error) {
    console.error('Token scan failed:', error);
    return [];
  }
}

/**
 * Get detailed token info including security checks
 */
export async function getTokenDetail(chain: ChainType, tokenAddress: string): Promise<CryptoToken | null> {
  try {
    // Fetch DexScreener data for richer info
    const pairs = await getTokenPairs(tokenAddress);
    const pair = pairs.find(p => mapChainId(p.chainId) === chain) || pairs[0];

    if (!pair) return null;

    // Run security check in parallel with rugcheck (for Solana)
    const [security, rugcheck] = await Promise.allSettled([
      checkTokenSecurity(chain, tokenAddress),
      chain === 'solana' ? checkRugcheck(tokenAddress) : Promise.resolve({ score: 'Unknown', risks: [] }),
    ]);

    const securityData = security.status === 'fulfilled' ? security.value : undefined;
    const rugcheckData = rugcheck.status === 'fulfilled' ? rugcheck.value : { score: 'Unknown', risks: [] };

    // Update security with rugcheck data
    if (securityData && rugcheckData.score !== 'Unknown') {
      securityData.rugcheckScore = rugcheckData.score as any;
    }

    const token = convertDexPairToToken(pair, chain, securityData);
    return token;
  } catch (error) {
    console.error('Token detail fetch failed:', error);
    return null;
  }
}

/**
 * Get trending tokens across chains
 */
export async function getTrendingTokens(chain: ChainType = 'solana'): Promise<CryptoToken[]> {
  try {
    const pools = await getTrendingPools(chain);
    const tokens: CryptoToken[] = [];

    for (const pool of pools.slice(0, 20)) {
      try {
        const token = convertGeckoPoolToToken(pool, chain);
        if (token) tokens.push(token);
      } catch {
        // Skip
      }
    }

    return tokens;
  } catch (error) {
    console.error('Trending fetch failed:', error);
    return [];
  }
}

// === CONVERSION HELPERS ===

function convertGeckoPoolToToken(pool: any, chain: ChainType): CryptoToken | null {
  const attr = pool.attributes;
  if (!attr) return null;

  const marketCap = parseFloat(attr.fdv_usd || attr.market_cap_usd || '0');
  const liquidity = parseFloat(attr.reserve_in_usd || '0');
  const volume24h = parseFloat(attr.volume_usd?.h24 || '0');
  const priceUsd = parseFloat(attr.base_token_price_usd || '0');

  if (marketCap <= 0 || priceUsd <= 0) return null;

  const createdAt = attr.pool_created_at || new Date().toISOString();
  const age = Math.max(0, (Date.now() - new Date(createdAt).getTime()) / 60000);

  const txns = attr.transactions || {};
  const buys24h = (txns.h24?.buys || 0) + (txns.h6?.buys || 0);
  const sells24h = (txns.h24?.sells || 0) + (txns.h6?.sells || 0);
  const totalTx = buys24h + sells24h;
  const buySellRatio = totalTx > 0 ? (buys24h / totalTx) * 100 : 50;

  const vmcRatio = marketCap > 0 ? volume24h / marketCap : 0;

  // Extract token info from relationships
  const baseTokenId = pool.relationships?.base_token?.data?.id || '';
  const tokenAddress = baseTokenId.split('_').pop() || pool.id || '';

  const priceChanges = attr.price_change_percentage || {};

  // Build basic token without security (security is checked separately)
  const defaultSecurity = {
    mintRevoked: null, freezeRevoked: null, lpBurned: false, lpLocked: false,
    lpLockDuration: null, isHoneypot: null, buyTax: null, sellTax: null,
    isOpenSource: null, devHoldingPercent: null, top10HoldingPercent: null,
    bundlePercent: null, rugcheckScore: 'Unknown' as const, securityScore: 5,
  };

  const defaultSmartMoney = {
    smartWalletCount: 0, totalSmartMoneyInvested: 0,
    avgSmartWalletWinRate: 0, firstSmartBuyTime: null, smartMoneyScore: 0,
  };

  const partialToken: Partial<CryptoToken> = {
    address: tokenAddress,
    name: attr.name?.split('/')[0]?.trim() || 'Unknown',
    symbol: attr.name?.split('/')[0]?.trim()?.split(' ')[0] || '???',
    chain,
    marketCap,
    liquidity,
    volume24h,
    priceUsd,
    priceChange5m: parseFloat(priceChanges.m5 || '0'),
    priceChange1h: parseFloat(priceChanges.h1 || '0'),
    priceChange6h: parseFloat(priceChanges.h6 || '0'),
    priceChange24h: parseFloat(priceChanges.h24 || '0'),
    holders: 0,
    holderGrowthRate: 0,
    age,
    vmcRatio,
    buySellRatio,
    security: defaultSecurity,
    smartMoney: defaultSmartMoney,
    poolAddress: attr.address || '',
    pairUrl: `https://dexscreener.com/${chain}/${attr.address}`,
    createdAt,
    txCount24h: totalTx,
    buyCount24h: buys24h,
    sellCount24h: sells24h,
  };

  // Calculate OG score
  const scoreBreakdown = calculateOGScore(partialToken);
  const tier = determineTier(marketCap);

  return {
    ...partialToken,
    ogScore: scoreBreakdown.totalScore,
    tier,
  } as CryptoToken;
}

function convertDexPairToToken(pair: DexScreenerPair, chain: ChainType, security?: any): CryptoToken {
  const marketCap = pair.marketCap || pair.fdv || 0;
  const volume24h = pair.volume?.h24 || 0;
  const liquidity = pair.liquidity?.usd || 0;
  const priceUsd = parseFloat(pair.priceUsd || '0');

  const createdAt = pair.pairCreatedAt ? new Date(pair.pairCreatedAt).toISOString() : new Date().toISOString();
  const age = Math.max(0, (Date.now() - (pair.pairCreatedAt || Date.now())) / 60000);

  const buys24h = (pair.txns?.h24?.buys || 0);
  const sells24h = (pair.txns?.h24?.sells || 0);
  const totalTx = buys24h + sells24h;
  const buySellRatio = totalTx > 0 ? (buys24h / totalTx) * 100 : 50;
  const vmcRatio = marketCap > 0 ? volume24h / marketCap : 0;

  // Extract social links
  const socials = pair.info?.socials || [];
  const twitterUrl = socials.find(s => s.type === 'twitter')?.url;
  const telegramUrl = socials.find(s => s.type === 'telegram')?.url;
  const websiteUrl = pair.info?.websites?.[0]?.url;
  const imageUrl = pair.info?.imageUrl;

  const defaultSecurity = security || {
    mintRevoked: null, freezeRevoked: null, lpBurned: false, lpLocked: false,
    lpLockDuration: null, isHoneypot: null, buyTax: null, sellTax: null,
    isOpenSource: null, devHoldingPercent: null, top10HoldingPercent: null,
    bundlePercent: null, rugcheckScore: 'Unknown' as const, securityScore: 5,
  };

  const defaultSmartMoney = {
    smartWalletCount: 0, totalSmartMoneyInvested: 0,
    avgSmartWalletWinRate: 0, firstSmartBuyTime: null, smartMoneyScore: 0,
  };

  const partialToken: Partial<CryptoToken> = {
    address: pair.baseToken.address,
    name: pair.baseToken.name,
    symbol: pair.baseToken.symbol,
    chain,
    marketCap,
    liquidity,
    volume24h,
    priceUsd,
    priceChange5m: pair.priceChange?.m5 || 0,
    priceChange1h: pair.priceChange?.h1 || 0,
    priceChange6h: pair.priceChange?.h6 || 0,
    priceChange24h: pair.priceChange?.h24 || 0,
    holders: 0,
    holderGrowthRate: 0,
    age,
    vmcRatio,
    buySellRatio,
    security: defaultSecurity,
    smartMoney: defaultSmartMoney,
    poolAddress: pair.pairAddress,
    pairUrl: pair.url || `https://dexscreener.com/${chain}/${pair.pairAddress}`,
    imageUrl,
    websiteUrl,
    twitterUrl,
    telegramUrl,
    createdAt,
    txCount24h: totalTx,
    buyCount24h: buys24h,
    sellCount24h: sells24h,
  };

  const scoreBreakdown = calculateOGScore(partialToken);
  const tier = determineTier(marketCap);

  return {
    ...partialToken,
    ogScore: scoreBreakdown.totalScore,
    tier,
  } as CryptoToken;
}

function passesFilters(token: CryptoToken, filters: FilterConfig): boolean {
  if (filters.chain !== 'all' && token.chain !== filters.chain) return false;
  if (token.marketCap < filters.minMarketCap || token.marketCap > filters.maxMarketCap) return false;
  if (token.liquidity < filters.minLiquidity) return false;
  if (token.age > filters.maxAge) return false;
  if (token.ogScore < filters.minOgScore) return false;
  if (token.holders < filters.minHolders) return false;
  if (filters.tier !== 'all' && token.tier !== filters.tier) return false;
  if (filters.securityOnly) {
    if (token.security.isHoneypot === true) return false;
    if (token.security.mintRevoked === false) return false;
  }
  return true;
}
