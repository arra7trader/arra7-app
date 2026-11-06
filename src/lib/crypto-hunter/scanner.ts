import { CryptoToken, ChainType, FilterConfig, DEFAULT_FILTER, TokenSecurity } from './types';
import { getTokenPairs, getTokenPairsBatch, getLatestBoostedTokens, getTopBoostedTokens, getLatestTokenProfiles, mapChainId } from './dexscreener';
import { getNewPools, getTrendingPools } from './geckoterminal';
import type { GeckoTerminalPool } from './types';
import { checkTokenSecurity, checkRugcheck, getDefaultSecurity, type RugcheckResult } from './goplus-security';
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
  const tokens = await discoverTokens(chain, filters, 'live');
  sortTokens(tokens, filters);
  return tokens.slice(0, 50);
}

/**
 * Get detailed token info including security checks
 */
export async function getTokenDetail(chain: ChainType, tokenAddress: string): Promise<CryptoToken | null> {
  try {
    // Fetch DexScreener data for richer info
    const pairs = await getTokenPairs(tokenAddress);
    const pair = pairs.find(p => mapChainId(p.chainId) === chain);

    if (!pair) return null;

    // Run security check in parallel with rugcheck (for Solana)
    const [security, rugcheck] = await Promise.allSettled([
      chain === 'solana' ? Promise.resolve(getDefaultSecurity()) : checkTokenSecurity(chain, tokenAddress),
      chain === 'solana' ? checkRugcheck(tokenAddress) : Promise.resolve(null),
    ]);

    const securityData = security.status === 'fulfilled' ? security.value : getDefaultSecurity();
    const rugcheckData = rugcheck.status === 'fulfilled' ? rugcheck.value : null;

    // Update security with rugcheck data
    if (rugcheckData?.security) Object.assign(securityData, rugcheckData.security);

    const token = convertDexPairToToken(pair, chain, securityData);
    if (!token) return null;
    if (rugcheckData?.holders !== null && rugcheckData?.holders !== undefined) token.holders = rugcheckData.holders;
    else if (securityData.holderCount !== null) token.holders = securityData.holderCount;
    token.ogScore = calculateOGScore(token).totalScore;
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
  const filters: FilterConfig = {
    ...DEFAULT_FILTER,
    chain,
    minMarketCap: 0,
    maxMarketCap: Number.MAX_SAFE_INTEGER,
    minLiquidity: 0,
    maxAge: Number.MAX_SAFE_INTEGER,
  };
  const tokens = await discoverTokens(chain, filters, 'trending');
  sortTokens(tokens, filters);
  return tokens.slice(0, 20);
}

type DiscoverySource = NonNullable<CryptoToken['discoverySources']>[number];
interface TokenCandidate {
  address: string;
  pool?: GeckoTerminalPool;
  sources: Set<DiscoverySource>;
  promotionAmount?: number;
}

/**
 * Merge live GeckoTerminal pools with DexScreener's newest token profiles and
 * boosts, then enrich each token from current pair data before scoring it.
 * A DexScreener boost is surfaced as paid promotion, never as an OG-wallet signal.
 */
async function discoverTokens(
  chain: ChainType,
  filters: FilterConfig,
  mode: 'live' | 'trending'
): Promise<CryptoToken[]> {
  const sources = await Promise.allSettled([
    mode === 'live' ? getNewPools(chain) : Promise.resolve([]),
    getTrendingPools(chain),
    getLatestTokenProfiles(),
    getLatestBoostedTokens(),
    getTopBoostedTokens(),
  ]);
  const candidates = new Map<string, TokenCandidate>();

  const addCandidate = (
    address: string | undefined,
    source: DiscoverySource,
    pool?: GeckoTerminalPool,
    promotionAmount?: number
  ) => {
    if (!address) return;
    const key = getAddressKey(chain, address);
    const existing = candidates.get(key);
    if (existing) {
      existing.sources.add(source);
      if (!existing.pool && pool) existing.pool = pool;
      if (promotionAmount !== undefined) existing.promotionAmount = promotionAmount;
      return;
    }
    candidates.set(key, {
      address,
      pool,
      sources: new Set([source]),
      promotionAmount,
    });
  };

  const newPools = sources[0].status === 'fulfilled' ? sources[0].value : [];
  const trendingPools = sources[1].status === 'fulfilled' ? sources[1].value : [];
  for (const pool of newPools) {
    addCandidate(getPoolTokenAddress(pool), 'geckoterminal-new', pool);
  }
  for (const pool of trendingPools) {
    addCandidate(getPoolTokenAddress(pool), 'geckoterminal-trending', pool);
  }

  const profiles = sources[2].status === 'fulfilled' ? sources[2].value : [];
  for (const token of profiles) {
    if (mapChainId(token.chainId) === chain) addCandidate(token.tokenAddress, 'dexscreener-profile');
  }

  const boosts = sources[3].status === 'fulfilled' ? sources[3].value : [];
  for (const token of boosts) {
    if (mapChainId(token.chainId) === chain) {
      addCandidate(token.tokenAddress, 'dexscreener-boost', undefined, Number(token.amount ?? token.totalAmount) || undefined);
    }
  }
  const topBoosts = sources[4].status === 'fulfilled' ? sources[4].value : [];
  for (const token of topBoosts) {
    if (mapChainId(token.chainId) === chain) {
      addCandidate(token.tokenAddress, 'dexscreener-boost', undefined, Number(token.amount ?? token.totalAmount) || undefined);
    }
  }

  const priority: DiscoverySource[] = mode === 'live'
    ? ['geckoterminal-new', 'dexscreener-profile', 'dexscreener-boost', 'geckoterminal-trending']
    : ['geckoterminal-trending', 'dexscreener-profile', 'dexscreener-boost', 'geckoterminal-new'];
  const selectedCandidates: TokenCandidate[] = [];
  const selectedKeys = new Set<string>();
  for (const source of priority) {
    const sourceCandidates = Array.from(candidates.entries()).filter(([, candidate]) => candidate.sources.has(source));
    for (const [key, candidate] of sourceCandidates.slice(0, 6)) {
      if (selectedKeys.has(key)) continue;
      selectedKeys.add(key);
      selectedCandidates.push(candidate);
    }
  }
  for (const [key, candidate] of candidates) {
    if (selectedCandidates.length >= 24) break;
    if (selectedKeys.has(key)) continue;
    selectedKeys.add(key);
    selectedCandidates.push(candidate);
  }

  if (selectedCandidates.length === 0) return [];

  let pairs: DexScreenerPair[] = [];
  try {
    pairs = await getTokenPairsBatch(chain, selectedCandidates.map(candidate => candidate.address));
  } catch (error) {
    // GeckoTerminal data remains usable if the DexScreener enrichment endpoint is unavailable.
    console.error('DexScreener enrichment failed:', error);
  }

  const pairsByToken = new Map<string, DexScreenerPair[]>();
  for (const pair of pairs) {
    const key = pair.baseToken?.address ? getAddressKey(chain, pair.baseToken.address) : undefined;
    if (!key) continue;
    const existing = pairsByToken.get(key) || [];
    existing.push(pair);
    pairsByToken.set(key, existing);
  }

  const tokens: CryptoToken[] = [];
  for (const candidate of selectedCandidates) {
    try {
      const pair = (pairsByToken.get(getAddressKey(chain, candidate.address)) || [])
        .sort((a, b) => pairQuality(b) - pairQuality(a))[0];
      const token = pair
        ? convertDexPairToToken(pair, chain)
        : candidate.pool ? convertGeckoPoolToToken(candidate.pool, chain) : null;
      if (!token) continue;

      token.discoverySources = Array.from(candidate.sources);
      token.isPromoted = candidate.sources.has('dexscreener-boost');
      token.promotionAmount = candidate.promotionAmount;
      const profile = profiles.find(item => getAddressKey(chain, item.tokenAddress) === getAddressKey(chain, candidate.address)) ||
        boosts.find(item => getAddressKey(chain, item.tokenAddress) === getAddressKey(chain, candidate.address)) ||
        topBoosts.find(item => getAddressKey(chain, item.tokenAddress) === getAddressKey(chain, candidate.address));
      token.description = profile?.description;
      token.imageUrl = token.imageUrl || safeExternalUrl(profile?.icon);
      const profileLinks = profile?.links || [];
      token.websiteUrl = safeExternalUrl(token.websiteUrl) || safeExternalUrl(profileLinks.find(link => link.type?.toLowerCase() === 'website' || link.label?.toLowerCase() === 'website')?.url);
      token.twitterUrl = safeExternalUrl(token.twitterUrl) || safeExternalUrl(profileLinks.find(link => link.type?.toLowerCase() === 'twitter')?.url);
      token.telegramUrl = safeExternalUrl(token.telegramUrl) || safeExternalUrl(profileLinks.find(link => link.type?.toLowerCase() === 'telegram')?.url);
      token.pairUrl = safeExternalUrl(token.pairUrl) || `https://dexscreener.com/${chain}/${encodeURIComponent(token.poolAddress)}`;
      token.ogScore = calculateOGScore(token).totalScore;
      token.tier = determineTier(token.marketCap);
      tokens.push(token);
    } catch {
      // Ignore malformed data for an individual candidate and keep scanning the rest.
    }
  }

  // Security lookups are cached upstream; still cap parallel requests to avoid bursts.
  const needsFullCoverage = filters.securityOnly || filters.minHolders > 0;
  const securityBatch = needsFullCoverage ? tokens : [...tokens].sort((a, b) => b.ogScore - a.ogScore).slice(0, 10);
  for (let offset = 0; offset < securityBatch.length; offset += 5) {
    const chunk = securityBatch.slice(offset, offset + 5);
    const checked = await Promise.all(chunk.map(async token => {
      const [securityResult, rugcheckResult] = await Promise.allSettled([
        chain === 'solana' ? Promise.resolve(token.security) : checkTokenSecurity(chain, token.address),
        chain === 'solana' ? checkRugcheck(token.address) : Promise.resolve(null),
      ]);
      return {
        token,
        security: securityResult.status === 'fulfilled' ? securityResult.value : token.security,
        rugcheck: rugcheckResult.status === 'fulfilled' ? rugcheckResult.value : null,
      };
    }));

    for (const result of checked) {
      if (result.rugcheck?.security) {
        result.security = result.rugcheck.security as TokenSecurity;
        if (result.rugcheck.holders !== null) result.token.holders = result.rugcheck.holders;
      }
      result.token.security = result.security;
      if (result.token.holders === 0 && result.security.holderCount !== null) {
        result.token.holders = result.security.holderCount;
      }
      result.token.ogScore = calculateOGScore(result.token).totalScore;
    }
  }

  // Prefer the detailed RugCheck holdings and keep unscanned candidates marked as unknown.
  return tokens.filter(token => passesFilters(token, filters));
}

function getPoolTokenAddress(pool: GeckoTerminalPool): string | undefined {
  const tokenId = pool.relationships?.base_token?.data?.id;
  return tokenId?.split('_').pop();
}

function getAddressKey(chain: ChainType, address: string): string {
  // Solana addresses are case-sensitive Base58 strings; EVM addresses are not.
  return chain === 'solana' ? address : address.toLowerCase();
}

function pairQuality(pair: DexScreenerPair): number {
  const liquidity = pair.liquidity?.usd || 0;
  const volume = pair.volume?.h24 || 0;
  return liquidity + Math.min(volume, liquidity * 10) * 0.1;
}

function safeExternalUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function sortTokens(tokens: CryptoToken[], filters: FilterConfig): void {
  const direction = filters.sortOrder === 'desc' ? -1 : 1;
  const getters: Record<FilterConfig['sortBy'], (token: CryptoToken) => number> = {
    ogScore: token => token.ogScore,
    marketCap: token => token.marketCap,
    volume24h: token => token.volume24h,
    age: token => token.age,
    holders: token => token.holders,
    priceChange1h: token => token.priceChange1h,
    vmcRatio: token => token.vmcRatio,
  };
  const sortDirection = filters.sortBy === 'age' ? -direction : direction;
  tokens.sort((a, b) => sortDirection * (getters[filters.sortBy](a) - getters[filters.sortBy](b)));
}

// === CONVERSION HELPERS ===

function convertGeckoPoolToToken(pool: any, chain: ChainType): CryptoToken | null {
  const attr = pool?.attributes;
  if (!attr) return null;

  const reportedMarketCap = finiteNumber(attr.market_cap_usd, 0);
  const hasMarketCap = reportedMarketCap > 0;
  const marketCap = hasMarketCap ? reportedMarketCap : finiteNumber(attr.fdv_usd, 0);
  const liquidity = finiteNumber(attr.reserve_in_usd, 0);
  const volume24h = finiteNumber(attr.volume_usd?.h24, 0);
  const priceUsd = finiteNumber(attr.base_token_price_usd, 0);

  if (marketCap <= 0 || priceUsd <= 0 || !Number.isFinite(liquidity) || !Number.isFinite(volume24h)) return null;

  const parsedCreatedAt = typeof attr.pool_created_at === 'string' ? Date.parse(attr.pool_created_at) : NaN;
  const hasCreatedAt = Number.isFinite(parsedCreatedAt);
  const createdAt = hasCreatedAt ? new Date(parsedCreatedAt).toISOString() : new Date().toISOString();
  const age = hasCreatedAt ? Math.max(0, (Date.now() - parsedCreatedAt) / 60000) : Number.MAX_SAFE_INTEGER;

  const txns = attr.transactions || {};
  const buys24h = finiteNumber(txns.h24?.buys, 0);
  const sells24h = finiteNumber(txns.h24?.sells, 0);
  const totalTx = buys24h + sells24h;
  const buySellRatio = totalTx > 0 ? (buys24h / totalTx) * 100 : 0;

  const vmcRatio = marketCap > 0 ? volume24h / marketCap : 0;

  // Extract token info from relationships
  const baseTokenId = pool.relationships?.base_token?.data?.id || '';
  const tokenAddress = baseTokenId.split('_').pop() || pool.id || '';
  if (!tokenAddress) return null;

  const priceChanges = attr.price_change_percentage || {};

  // Build basic token without security (security is checked separately)
  const defaultSecurity: TokenSecurity = {
    mintRevoked: null, freezeRevoked: null, lpBurned: false, lpLocked: false,
    lpLockDuration: null, lpLockedPercent: null, isHoneypot: null, buyTax: null, sellTax: null,
    isOpenSource: null, devHoldingPercent: null, top10HoldingPercent: null, holderCount: null,
    bundlePercent: null, rugcheckScore: 'Unknown' as const, securityScore: 0,
  };

  const partialToken: Partial<CryptoToken> = {
    address: tokenAddress,
    name: attr.name?.split('/')[0]?.trim() || 'Unknown',
    symbol: attr.name?.split('/')[0]?.trim()?.split(' ')[0] || '???',
    chain,
    marketCap,
    marketCapIsEstimate: !hasMarketCap,
    liquidity,
    volume24h,
    priceUsd,
    priceChange5m: finiteNumber(priceChanges.m5, 0),
    priceChange1h: finiteNumber(priceChanges.h1, 0),
    priceChange6h: finiteNumber(priceChanges.h6, 0),
    priceChange24h: finiteNumber(priceChanges.h24, 0),
    holders: 0,
    holderGrowthRate: 0,
    age,
    ageIsEstimate: !hasCreatedAt,
    vmcRatio,
    buySellRatio,
    security: defaultSecurity,
    smartMoney: null,
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

function convertDexPairToToken(pair: DexScreenerPair, chain: ChainType, security?: TokenSecurity): CryptoToken | null {
  const reportedMarketCap = finiteNumber(pair.marketCap, 0);
  const fdv = finiteNumber(pair.fdv, 0);
  const marketCap = reportedMarketCap > 0 ? reportedMarketCap : fdv;
  const volume24h = finiteNumber(pair.volume?.h24, 0);
  const liquidity = finiteNumber(pair.liquidity?.usd, 0);
  const priceUsd = finiteNumber(pair.priceUsd, 0);
  const address = pair.baseToken?.address;
  if (!address || marketCap <= 0 || liquidity < 0 || volume24h < 0 || priceUsd <= 0) return null;

  const pairCreatedAt = Number(pair.pairCreatedAt);
  const hasCreatedAt = Number.isFinite(pairCreatedAt) && pairCreatedAt > 0;
  const createdAt = hasCreatedAt ? new Date(pairCreatedAt).toISOString() : new Date().toISOString();
  const age = hasCreatedAt
    ? Math.max(0, (Date.now() - pairCreatedAt) / 60000)
    : Number.MAX_SAFE_INTEGER;

  const buys24h = finiteNumber(pair.txns?.h24?.buys, 0);
  const sells24h = finiteNumber(pair.txns?.h24?.sells, 0);
  const totalTx = buys24h + sells24h;
  const buySellRatio = totalTx > 0 ? (buys24h / totalTx) * 100 : 0;
  const vmcRatio = marketCap > 0 ? volume24h / marketCap : 0;

  // Extract social links
  const socials = pair.info?.socials || [];
  const twitterUrl = safeExternalUrl(socials.find(s => s.type === 'twitter')?.url);
  const telegramUrl = safeExternalUrl(socials.find(s => s.type === 'telegram')?.url);
  const websiteUrl = safeExternalUrl(pair.info?.websites?.[0]?.url);
  const imageUrl = safeExternalUrl(pair.info?.imageUrl);

  const defaultSecurity: TokenSecurity = security || {
    mintRevoked: null, freezeRevoked: null, lpBurned: false, lpLocked: false,
    lpLockDuration: null, lpLockedPercent: null, isHoneypot: null, buyTax: null, sellTax: null,
    isOpenSource: null, devHoldingPercent: null, top10HoldingPercent: null, holderCount: null,
    bundlePercent: null, rugcheckScore: 'Unknown' as const, securityScore: 0,
  };

  const partialToken: Partial<CryptoToken> = {
    address,
    name: pair.baseToken?.name || 'Unknown',
    symbol: pair.baseToken?.symbol || '???',
    chain,
    marketCap,
    marketCapIsEstimate: reportedMarketCap <= 0 && fdv > 0,
    liquidity,
    volume24h,
    priceUsd,
    priceChange5m: finiteNumber(pair.priceChange?.m5, 0),
    priceChange1h: finiteNumber(pair.priceChange?.h1, 0),
    priceChange6h: finiteNumber(pair.priceChange?.h6, 0),
    priceChange24h: finiteNumber(pair.priceChange?.h24, 0),
    holders: 0,
    holderGrowthRate: 0,
    age,
    ageIsEstimate: !hasCreatedAt,
    vmcRatio,
    buySellRatio,
    security: defaultSecurity,
    smartMoney: null,
    poolAddress: pair.pairAddress,
    pairUrl: safeExternalUrl(pair.url) || `https://dexscreener.com/${chain}/${encodeURIComponent(pair.pairAddress)}`,
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
  if (!token.address || ![token.marketCap, token.liquidity, token.volume24h, token.priceUsd, token.ogScore, token.holders, token.age].every(Number.isFinite)) return false;
  if (filters.chain !== 'all' && token.chain !== filters.chain) return false;
  if (token.marketCap < filters.minMarketCap || token.marketCap > filters.maxMarketCap) return false;
  if (token.liquidity < filters.minLiquidity) return false;
  if (token.age > filters.maxAge) return false;
  if (token.ogScore < filters.minOgScore) return false;
  if (token.holders < filters.minHolders) return false;
  if (filters.tier !== 'all' && token.tier !== filters.tier) return false;
  if (filters.securityOnly) {
    if (token.security.mintRevoked !== true) return false;
    if (token.chain === 'solana') {
      if (token.security.freezeRevoked !== true || token.security.rugcheckScore !== 'Good') return false;
    } else if (token.security.isHoneypot !== false) {
      return false;
    }
  }
  return true;
}

function finiteNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}
