import { NextResponse } from 'next/server';
import { getCronosMarketData, CRONOS_INTERVALS, type CronosTimeframe } from '@/lib/arra-cronos-market';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = (searchParams.get('symbol') || 'XAUUSD').toUpperCase();
    const timeframe = (searchParams.get('timeframe') || '1h') as CronosTimeframe;
    if (!Object.prototype.hasOwnProperty.call(CRONOS_INTERVALS, timeframe)) {
        return NextResponse.json({ error: 'Timeframe tidak didukung.' }, { status: 400 });
    }

    try {
        const market = await getCronosMarketData(symbol, timeframe);
        return NextResponse.json(market, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
    } catch (error) {
        console.error('[ARRA Cronos] Market data error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Sumber OHLCV riil sedang tidak merespons.' }, { status: 503 });
    }
}
