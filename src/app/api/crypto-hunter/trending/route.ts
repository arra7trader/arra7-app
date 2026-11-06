import { NextRequest, NextResponse } from 'next/server';
import { getTrendingTokens } from '@/lib/crypto-hunter/scanner';
import type { ChainType } from '@/lib/crypto-hunter/types';
import { recordCryptoTokenBatch } from '@/lib/crypto-hunter/persistent-tracker';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rawChain = searchParams.get('chain') || 'solana';
    const supportedChains: ChainType[] = ['solana', 'base', 'ethereum', 'bsc'];
    if (rawChain !== 'all' && !supportedChains.includes(rawChain as ChainType)) {
      return NextResponse.json({ success: false, error: 'Unsupported chain', tokens: [] }, { status: 400 });
    }
    const chains = rawChain === 'all' ? supportedChains : [rawChain as ChainType];

    const batches = await Promise.all(chains.map(chain => getTrendingTokens(chain)));
    const tokens = batches.flat().sort((a, b) => b.ogScore - a.ogScore).slice(0, 20);
    let snapshots = null;
    try {
      snapshots = await recordCryptoTokenBatch(tokens);
    } catch (error) {
      console.error('Crypto Hunter trending tracking save error:', error);
    }
    return NextResponse.json({
      success: true,
      count: tokens.length,
      chain: rawChain,
      chains,
      timestamp: new Date().toISOString(),
      tokens,
      snapshots,
    });
  } catch (error) {
    console.error('Trending API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trending tokens', tokens: [] },
      { status: 500 }
    );
  }
}
