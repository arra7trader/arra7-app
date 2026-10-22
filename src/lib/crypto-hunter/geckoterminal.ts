import { GeckoTerminalPool, ChainType, CHAIN_CONFIG } from './types';

const BASE_URL = 'https://api.geckoterminal.com/api/v2';

async function geckoFetch(path: string): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Accept': 'application/json' },
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error(`GeckoTerminal failed: ${res.status} ${path}`);
  return res.json();
}

export async function getNewPools(chain: ChainType, page: number = 1): Promise<GeckoTerminalPool[]> {
  const network = CHAIN_CONFIG[chain].geckoId;
  const data = await geckoFetch(`/networks/${network}/new_pools?page=${page}`);
  return data.data || [];
}

export async function getTrendingPools(chain: ChainType, page: number = 1): Promise<GeckoTerminalPool[]> {
  const network = CHAIN_CONFIG[chain].geckoId;
  const data = await geckoFetch(`/networks/${network}/trending_pools?page=${page}`);
  return data.data || [];
}

export async function getPoolInfo(chain: ChainType, poolAddress: string): Promise<GeckoTerminalPool | null> {
  const network = CHAIN_CONFIG[chain].geckoId;
  const data = await geckoFetch(`/networks/${network}/pools/${poolAddress}`);
  return data.data || null;
}

export async function getTokenInfo(chain: ChainType, tokenAddress: string): Promise<any> {
  const network = CHAIN_CONFIG[chain].geckoId;
  const data = await geckoFetch(`/networks/${network}/tokens/${tokenAddress}`);
  return data.data || null;
}

export async function getTokenPools(chain: ChainType, tokenAddress: string): Promise<GeckoTerminalPool[]> {
  const network = CHAIN_CONFIG[chain].geckoId;
  const data = await geckoFetch(`/networks/${network}/tokens/${tokenAddress}/pools`);
  return data.data || [];
}

export async function searchPools(query: string): Promise<GeckoTerminalPool[]> {
  const data = await geckoFetch(`/search/pools?query=${encodeURIComponent(query)}`);
  return data.data || [];
}
