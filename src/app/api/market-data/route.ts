import { NextResponse } from 'next/server';
import { getMarketData, ForexPair, Timeframe } from '@/lib/market-data';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const pair = searchParams.get('pair') || 'XAUUSD';
        const timeframe = (searchParams.get('timeframe') || '1h') as Timeframe;

        // Fetch market data
        const marketData = await getMarketData(pair as ForexPair, timeframe);

        if (!marketData || !marketData.candles) {
            return NextResponse.json(
                { status: 'error', message: 'No market data available' },
                { status: 500 }
            );
        }

        // Return clean data for chart
        return NextResponse.json({
            status: 'success',
            pair,
            timeframe,
            candles: marketData.candles,
            current_price: marketData.current_price,
            is_realtime: marketData.is_realtime,
            is_simulated: marketData.is_simulated || false,
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error('Market Data API Error:', error);
        return NextResponse.json(
            { status: 'error', message: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 }
        );
    }
}
