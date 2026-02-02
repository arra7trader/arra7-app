import { NextResponse } from 'next/server';
import { getMarketData, ForexPair, Timeframe } from '@/lib/market-data';
import { detectSwingPoints } from '@/lib/analysis';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const pair = searchParams.get('pair') || 'XAUUSD';
        const timeframe = (searchParams.get('timeframe') || '1h') as Timeframe;

        // 1. Fetch Real Data
        const marketData = await getMarketData(pair as ForexPair, timeframe);

        if (!marketData || !marketData.candles || marketData.candles.length === 0) {
            return NextResponse.json(
                { status: 'error', message: 'No market data available' },
                { status: 500 }
            );
        }

        // 2. Run AI Detection
        const analysis = detectSwingPoints(marketData.candles);

        return NextResponse.json({
            status: 'success',
            data: {
                pair,
                timeframe,
                ...analysis
            },
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error('Kanji Detect API Error:', error);
        return NextResponse.json(
            { status: 'error', message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
