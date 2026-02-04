import { NextResponse } from 'next/server';
import { getMarketData, getBrokerPrice, ForexPair, Timeframe, FOREX_PAIRS, TIMEFRAMES, BrokerSource, BROKER_CONFIGS } from '@/lib/market-data';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const pair = searchParams.get('pair') || 'XAUUSD';
        const timeframe = searchParams.get('timeframe') || '1h';
        const broker = searchParams.get('broker') as BrokerSource || 'yahoo';

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

        // Use broker-specific function if broker is specified
        const marketData = broker && broker !== 'yahoo'
            ? await getBrokerPrice(pair as ForexPair, timeframe as Timeframe, broker)
            : await getMarketData(pair as ForexPair, timeframe as Timeframe);

        return NextResponse.json({
            status: 'success',
            data: marketData,
            broker: broker || 'yahoo',
            brokerInfo: BROKER_CONFIGS[broker] || BROKER_CONFIGS.yahoo,
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
