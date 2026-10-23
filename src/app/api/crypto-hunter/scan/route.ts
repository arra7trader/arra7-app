import { NextRequest, NextResponse } from 'next/server';
import { scanNewTokens } from '@/lib/crypto-hunter/scanner';
import type { ChainType, FilterConfig, SortOption } from '@/lib/crypto-hunter/types';
import { recordCryptoTokenBatch } from '@/lib/crypto-hunter/persistent-tracker';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const chain = (searchParams.get('chain') || 'solana') as ChainType;
    const minMc = parseInt(searchParams.get('minMc') || '5000');
    const maxMc = parseInt(searchParams.get('maxMc') || '20000000');
    const minLiq = parseInt(searchParams.get('minLiq') || '3000');
    const maxAge = parseInt(searchParams.get('maxAge') || '1440');
    const minScore = parseInt(searchParams.get('minScore') || '0');
    const minHolders = parseInt(searchParams.get('minHolders') || '0');
    const sortBy = (searchParams.get('sortBy') || 'ogScore') as SortOption;
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    const securityOnly = searchParams.get('securityOnly') === 'true';
    const tier = searchParams.get('tier');

    const filters: FilterConfig = {
      chain,
      minMarketCap: minMc,
      maxMarketCap: maxMc,
      minLiquidity: minLiq,
      maxAge,
      minOgScore: minScore,
      minHolders,
      tier: tier && tier !== 'all' ? parseInt(tier) as any : 'all',
      securityOnly,
      sortBy,
      sortOrder,
    };

    const tokens = await scanNewTokens(chain, filters);
    let snapshots = null;
    try {
      snapshots = await recordCryptoTokenBatch(tokens);
    } catch (error) {
      console.error('Crypto Hunter tracking save error:', error);
    }

    return NextResponse.json({
      success: true,
      count: tokens.length,
      chain,
      timestamp: new Date().toISOString(),
      tokens,
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
