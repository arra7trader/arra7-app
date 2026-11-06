import { NextResponse } from 'next/server';
import { DEFAULT_FILTER, type ChainType } from '@/lib/crypto-hunter/types';
import { scanNewTokens } from '@/lib/crypto-hunter/scanner';
import { recordCryptoTokenBatch } from '@/lib/crypto-hunter/persistent-tracker';
import getTursoClient from '@/lib/turso';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const CHAINS: ChainType[] = ['solana', 'base', 'ethereum', 'bsc'];

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!getTursoClient()) {
    return NextResponse.json({ success: false, error: 'Persistent tracker is not configured' }, { status: 503 });
  }

  const chains: { chain: ChainType; tokenCount: number; success: boolean }[] = [];
  const discoveredTokens = [];
  for (const chain of CHAINS) {
    try {
      const tokens = await scanNewTokens(chain, { ...DEFAULT_FILTER, chain });
      discoveredTokens.push(...tokens);
      chains.push({ chain, tokenCount: tokens.length, success: true });
    } catch (error) {
      console.error(`Crypto Hunter scheduled scan failed for ${chain}:`, error);
      chains.push({ chain, tokenCount: 0, success: false });
    }
  }

  try {
    await recordCryptoTokenBatch(discoveredTokens);
  } catch (error) {
    console.error('Crypto Hunter scheduled snapshot write failed:', error);
    return NextResponse.json({ success: false, error: 'Snapshot persistence failed', chains }, { status: 500 });
  }

  const allSucceeded = chains.every(result => result.success);

  return NextResponse.json({
    success: allSucceeded,
    timestamp: new Date().toISOString(),
    chains,
  }, { status: allSucceeded ? 200 : 207 });
}
