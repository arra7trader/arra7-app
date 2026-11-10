import { NextRequest, NextResponse } from 'next/server';
import { scanNewTokens } from '@/lib/crypto-hunter/scanner';
import type { ChainType, FilterConfig, SortOption } from '@/lib/crypto-hunter/types';
import { recordCryptoTokenBatch } from '@/lib/crypto-hunter/persistent-tracker';
import { resolveUserOrDevice } from '@/lib/auth-device';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await resolveUserOrDevice(request);
    if (!user.isAdmin && !user.isFullAccess) {
      return NextResponse.json({ success: false, error: 'Crypto Hunter tersedia untuk pemilik akses Website Lifetime atau Full Access.' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;

    const rawChain = searchParams.get('chain') || 'solana';
    const supportedChains: ChainType[] = ['solana', 'base', 'ethereum', 'bsc'];
    if (rawChain !== 'all' && !supportedChains.includes(rawChain as ChainType)) {
      return NextResponse.json({ success: false, error: 'Unsupported chain', tokens: [] }, { status: 400 });
    }
    const chains = rawChain === 'all' ? supportedChains : [rawChain as ChainType];
    const readNumber = (key: string, fallback: number) => {
      const rawValue = searchParams.get(key);
      if (rawValue === null || rawValue.trim() === '') return fallback;
      const parsed = Number(rawValue);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
    };
    const minMc = readNumber('minMc', 5000);
    const maxMc = Math.max(minMc, readNumber('maxMc', 20000000));
    const minLiq = readNumber('minLiq', 3000);
    const maxAge = readNumber('maxAge', 1440);
    const minScore = readNumber('minScore', 0);
    const minHolders = readNumber('minHolders', 0);
    const allowedSorts: SortOption[] = ['ogScore', 'marketCap', 'volume24h', 'age', 'holders', 'priceChange1h', 'vmcRatio'];
    const requestedSort = searchParams.get('sortBy') || 'ogScore';
    const sortBy = allowedSorts.includes(requestedSort as SortOption) ? requestedSort as SortOption : 'ogScore';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
    const securityOnly = searchParams.get('securityOnly') === 'true';
    const requestedTier = Number(searchParams.get('tier'));
    const tier = Number.isInteger(requestedTier) && requestedTier >= 1 && requestedTier <= 4
      ? requestedTier as FilterConfig['tier']
      : 'all';

    const filters: FilterConfig = {
      chain: rawChain as ChainType | 'all',
      minMarketCap: minMc,
      maxMarketCap: maxMc,
      minLiquidity: minLiq,
      maxAge,
      minOgScore: minScore,
      minHolders,
      tier,
      securityOnly,
      sortBy,
      sortOrder,
    };

    const batches = await Promise.all(chains.map(chain => scanNewTokens(chain, filters)));
    const tokens = batches.flat();
    const direction = sortOrder === 'desc' ? -1 : 1;
    const sortValues: Record<SortOption, (token: (typeof tokens)[number]) => number> = {
      ogScore: token => token.ogScore,
      marketCap: token => token.marketCap,
      volume24h: token => token.volume24h,
      age: token => token.age,
      holders: token => token.holders,
      priceChange1h: token => token.priceChange1h,
      vmcRatio: token => token.vmcRatio,
    };
    const sortDirection = sortBy === 'age' ? -direction : direction;
    tokens.sort((a, b) => sortDirection * (sortValues[sortBy](a) - sortValues[sortBy](b)));
    const topTokens = tokens.slice(0, 50);
    let snapshots = null;
    try {
      snapshots = await recordCryptoTokenBatch(topTokens);
    } catch (error) {
      console.error('Crypto Hunter tracking save error:', error);
    }

    return NextResponse.json({
      success: true,
      count: tokens.length,
      chain: rawChain,
      chains,
      timestamp: new Date().toISOString(),
      tokens: topTokens,
      snapshots,
    });
  } catch (error) {
    console.error('Scan API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to scan tokens', tokens: [] },
      { status: 500 }
    );
  }
}
