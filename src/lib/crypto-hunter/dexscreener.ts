import { DexScreenerPair, ChainType } from './types';

const BASE_URL = 'https://api.dexscreener.com';

export async function searchTokens(query: string): Promise<DexScreenerPair[]> {
  const res = await fetch(`${BASE_URL}/latest/dex/search?q=${encodeURIComponent(query)}`, { next: { revalidate: 30 } });
  if (!res.ok) throw new Error(`DexScreener search failed: ${res.status}`);
  const data = await res.json();
  return data.pairs || [];
}

export async function getTokenPairs(tokenAddress: string): Promise<DexScreenerPair[]> {
  const res = await fetch(`${BASE_URL}/latest/dex/tokens/${tokenAddress}`, { next: { revalidate: 30 } });
  if (!res.ok) throw new Error(`DexScreener token fetch failed: ${res.status}`);
  const data = await res.json();
  return data.pairs || [];
}

/** Fetch pairs for several tokens in one DexScreener request (the API accepts up to 30 addresses). */
export async function getTokenPairsBatch(chain: ChainType, tokenAddresses: string[]): Promise<DexScreenerPair[]> {
  const uniqueAddresses = Array.from(new Set(tokenAddresses.filter(Boolean)));
  if (uniqueAddresses.length === 0) return [];

  const allPairs: DexScreenerPair[] = [];
  for (let offset = 0; offset < uniqueAddresses.length; offset += 30) {
    const addresses = uniqueAddresses.slice(offset, offset + 30);
    const res = await fetch(
      `${BASE_URL}/latest/dex/tokens/${addresses.map(encodeURIComponent).join(',')}`,
      { next: { revalidate: 30 } }
    );
    if (!res.ok) throw new Error(`DexScreener batch fetch failed: ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data.pairs)) {
      allPairs.push(...data.pairs.filter((pair: DexScreenerPair) => mapChainId(pair.chainId) === chain));
    }
  }
  return allPairs;
}

export interface DexScreenerDiscovery {
  chainId: string;
  tokenAddress: string;
  amount?: number;
  totalAmount?: number;
  description?: string;
  icon?: string;
  links?: { type?: string; label?: string; url: string }[];
}

export async function getPairInfo(chainId: string, pairAddress: string): Promise<DexScreenerPair | null> {
  const res = await fetch(`${BASE_URL}/latest/dex/pairs/${chainId}/${pairAddress}`, { next: { revalidate: 30 } });
  if (!res.ok) throw new Error(`DexScreener pair fetch failed: ${res.status}`);
  const data = await res.json();
  return data.pairs?.[0] || null;
}

export async function getLatestBoostedTokens(): Promise<DexScreenerDiscovery[]> {
  try {
    const res = await fetch(`${BASE_URL}/token-boosts/latest/v1`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function getTopBoostedTokens(): Promise<DexScreenerDiscovery[]> {
  try {
    const res = await fetch(`${BASE_URL}/token-boosts/top/v1`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function getLatestTokenProfiles(): Promise<DexScreenerDiscovery[]> {
  try {
    const res = await fetch(`${BASE_URL}/token-profiles/latest/v1`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// Convert DexScreener chainId to our ChainType
export function mapChainId(chainId: string): ChainType | null {
  const map: Record<string, ChainType> = {
    'solana': 'solana',
    'base': 'base',
    'ethereum': 'ethereum',
    'bsc': 'bsc',
  };
  return map[chainId] || null;
}
