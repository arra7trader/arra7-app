import { NextRequest, NextResponse } from 'next/server';
import { getTrendingTokens } from '@/lib/crypto-hunter/scanner';
import type { ChainType } from '@/lib/crypto-hunter/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const chain = (searchParams.get('chain') || 'solana') as ChainType;

    const tokens = await getTrendingTokens(chain);

    return NextResponse.json({
      success: true,
      count: tokens.length,
      chain,
      timestamp: new Date().toISOString(),
      tokens,
    });
  } catch (error) {
    console.error('Trending API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trending tokens', tokens: [] },
      { status: 500 }
    );
  }
}
