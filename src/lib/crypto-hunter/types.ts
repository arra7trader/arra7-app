// Token data from APIs
export interface CryptoToken {
  address: string;
  name: string;
  symbol: string;
  chain: ChainType;
  marketCap: number;
  liquidity: number;
  volume24h: number;
  priceUsd: number;
  priceChange5m: number;
  priceChange1h: number;
  priceChange6h: number;
  priceChange24h: number;
  holders: number;
  holderGrowthRate: number;
  age: number; // minutes since creation
  vmcRatio: number;
  buySellRatio: number;
  ogScore: number;
  tier: TierLevel;
  security: TokenSecurity;
  smartMoney: SmartMoneyData;
  poolAddress: string;
  pairUrl: string;
  imageUrl?: string;
  websiteUrl?: string;
  twitterUrl?: string;
  telegramUrl?: string;
  createdAt: string;
  txCount24h: number;
  buyCount24h: number;
  sellCount24h: number;
}

export type ChainType = 'solana' | 'base' | 'ethereum' | 'bsc';
export type TierLevel = 1 | 2 | 3 | 4;

export interface TokenSecurity {
  mintRevoked: boolean | null;
  freezeRevoked: boolean | null;
  lpBurned: boolean;
  lpLocked: boolean;
  lpLockDuration: number | null;
  isHoneypot: boolean | null;
  buyTax: number | null;
  sellTax: number | null;
  isOpenSource: boolean | null;
  devHoldingPercent: number | null;
  top10HoldingPercent: number | null;
  bundlePercent: number | null;
  rugcheckScore: 'Good' | 'Warning' | 'Danger' | 'Unknown';
  securityScore: number; // 0-30
}

export interface SmartMoneyData {
  smartWalletCount: number;
  totalSmartMoneyInvested: number;
  avgSmartWalletWinRate: number;
  firstSmartBuyTime: string | null;
  smartMoneyScore: number; // 0-25
}

export interface OGScoreBreakdown {
  securityScore: number;    // 0-30
  smartMoneyScore: number;  // 0-25
  momentumScore: number;    // 0-20
  distributionScore: number; // 0-15
  narrativeScore: number;   // 0-10
  totalScore: number;       // 0-100
  grade: OGGrade;
}

export type OGGrade = 'DIAMOND' | 'HOT' | 'INTERESTING' | 'CAUTION' | 'AVOID';

export interface FilterConfig {
  chain: ChainType | 'all';
  minMarketCap: number;
  maxMarketCap: number;
  minLiquidity: number;
  maxAge: number; // minutes
  minOgScore: number;
  minHolders: number;
  tier: TierLevel | 'all';
  securityOnly: boolean; // only show tokens with all security checks passed
  sortBy: SortOption;
  sortOrder: 'asc' | 'desc';
}

export type SortOption = 'ogScore' | 'marketCap' | 'volume24h' | 'age' | 'holders' | 'priceChange1h' | 'vmcRatio';

export interface WatchlistItem {
  token: CryptoToken;
  addedAt: string;
  entryPrice: number;
  notes: string;
  alerts: WatchlistAlert[];
}

export interface WatchlistAlert {
  type: 'price_above' | 'price_below' | 'og_score_change' | 'smart_money';
  value: number;
  enabled: boolean;
}

// API Response types
export interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string; };
  quoteToken: { address: string; name: string; symbol: string; };
  priceNative: string;
  priceUsd: string;
  txns: {
    m5: { buys: number; sells: number; };
    h1: { buys: number; sells: number; };
    h6: { buys: number; sells: number; };
    h24: { buys: number; sells: number; };
  };
  volume: { m5: number; h1: number; h6: number; h24: number; };
  priceChange: { m5: number; h1: number; h6: number; h24: number; };
  liquidity: { usd: number; base: number; quote: number; };
  fdv: number;
  marketCap: number;
  pairCreatedAt: number;
  info?: {
    imageUrl?: string;
    websites?: { url: string; }[];
    socials?: { type: string; url: string; }[];
  };
}

export interface GoPlusSecurityResponse {
  code: number;
  result: Record<string, {
    is_honeypot: string;
    buy_tax: string;
    sell_tax: string;
    is_mintable: string;
    can_take_back_ownership: string;
    holder_count: string;
    total_supply: string;
    creator_address: string;
    is_open_source: string;
    is_proxy: string;
    holders: { address: string; percent: string; is_contract: number; }[];
  }>;
}

export interface GeckoTerminalPool {
  id: string;
  type: string;
  attributes: {
    name: string;
    address: string;
    base_token_price_usd: string;
    quote_token_price_usd: string;
    base_token_price_native_currency: string;
    fdv_usd: string;
    market_cap_usd: string | null;
    reserve_in_usd: string;
    pool_created_at: string;
    price_change_percentage: { m5: string; h1: string; h6: string; h24: string; };
    transactions: {
      m5: { buys: number; sells: number; };
      h1: { buys: number; sells: number; };
      h6: { buys: number; sells: number; };
      h24: { buys: number; sells: number; };
    };
    volume_usd: { m5: string; h1: string; h6: string; h24: string; };
  };
  relationships: {
    base_token: { data: { id: string; type: string; } };
    quote_token: { data: { id: string; type: string; } };
    dex: { data: { id: string; type: string; } };
  };
}

// Default filter presets
export const TIER_PRESETS: Record<string, Partial<FilterConfig>> = {
  'tier1': { minMarketCap: 5000, maxMarketCap: 50000, minLiquidity: 3000, maxAge: 30, minHolders: 20 },
  'tier2': { minMarketCap: 50000, maxMarketCap: 300000, minLiquidity: 10000, maxAge: 360, minHolders: 100 },
  'tier3': { minMarketCap: 300000, maxMarketCap: 2000000, minLiquidity: 30000, maxAge: 4320, minHolders: 500 },
  'tier4': { minMarketCap: 2000000, maxMarketCap: 20000000, minLiquidity: 100000, maxAge: 999999, minHolders: 2000 },
};

export const DEFAULT_FILTER: FilterConfig = {
  chain: 'solana',
  minMarketCap: 5000,
  maxMarketCap: 20000000,
  minLiquidity: 3000,
  maxAge: 1440,
  minOgScore: 0,
  minHolders: 0,
  tier: 'all',
  securityOnly: false,
  sortBy: 'ogScore',
  sortOrder: 'desc',
};

export const CHAIN_CONFIG: Record<ChainType, { name: string; id: string; geckoId: string; color: string; }> = {
  solana: { name: 'Solana', id: 'solana', geckoId: 'solana', color: '#9945FF' },
  base: { name: 'Base', id: 'base', geckoId: 'base', color: '#0052FF' },
  ethereum: { name: 'Ethereum', id: 'ethereum', geckoId: 'eth', color: '#627EEA' },
  bsc: { name: 'BSC', id: 'bsc', geckoId: 'bsc', color: '#F3BA2F' },
};
