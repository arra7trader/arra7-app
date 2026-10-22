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

export async function getPairInfo(chainId: string, pairAddress: string): Promise<DexScreenerPair | null> {
  const res = await fetch(`${BASE_URL}/latest/dex/pairs/${chainId}/${pairAddress}`, { next: { revalidate: 30 } });
  if (!res.ok) throw new Error(`DexScreener pair fetch failed: ${res.status}`);
  const data = await res.json();
  return data.pairs?.[0] || null;
}

export async function getLatestBoostedTokens(): Promise<any[]> {
  try {
    const res = await fetch(`${BASE_URL}/token-boosts/latest/v1`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function getLatestTokenProfiles(): Promise<any[]> {
  try {
    const res = await fetch(`${BASE_URL}/token-profiles/latest/v1`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return await res.json();
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
