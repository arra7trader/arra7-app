import { NextResponse } from 'next/server';
import { getMarketData, ForexPair, Timeframe, FOREX_PAIRS, TIMEFRAMES } from '@/lib/market-data';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const pair = searchParams.get('pair') || 'XAUUSD';
        const timeframe = searchParams.get('timeframe') || '1h';

        // Validate
        if (!(pair in FOREX_PAIRS)) {
            return NextResponse.json(
                { status: 'error', message: 'Invalid pair' },
                { status: 400 }
            );
        }

        if (!(timeframe in TIMEFRAMES)) {
            return NextResponse.json(
                { status: 'error', message: 'Invalid timeframe' },
                { status: 400 }
            );
        }

        const marketData = await getMarketData(pair as ForexPair, timeframe as Timeframe);

        return NextResponse.json({
            status: 'success',
            data: marketData,
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error('Market Data API Error:', error);
        return NextResponse.json(
            { status: 'error', message: 'Failed to fetch market data' },
            { status: 500 }
        );
    }
}
