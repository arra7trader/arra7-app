import { NextResponse } from 'next/server';
import { getBrokerPrice, ForexPair, Timeframe } from '@/lib/market-data';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const pair = searchParams.get('pair') || 'XAUUSD';
        const timeframe = (searchParams.get('timeframe') || '1h') as Timeframe;

        console.log(`[Market Data API] Fetching ${pair} (${timeframe}) via Swissquote`);

        // Fetch market data using Swissquote (real-time, no simulated fallback)
        let marketData;
        try {
            marketData = await getBrokerPrice(
                pair as ForexPair,
                timeframe,
                'swissquote' // Always use Swissquote for consistency
            );

            // Double-check: Reject simulated data
            if (marketData.is_simulated) {
                console.error(`[Market Data API] ❌ Simulated data detected for ${pair}`);
                return NextResponse.json(
                    {
                        status: 'error',
                        message: 'Data real-time tidak tersedia saat ini. API Swissquote sedang bermasalah. Silakan coba lagi dalam beberapa menit.'
                    },
                    { status: 503 }
                );
            }

            console.log(`[Market Data API] ✅ Swissquote data: ${pair} = $${marketData.current_price}`);

        } catch (error: any) {
            console.error(`[Market Data API] Error fetching ${pair}:`, error);
            return NextResponse.json(
                {
                    status: 'error',
                    message: error.message || 'Gagal mengambil data harga real-time. Silakan coba lagi.'
                },
                { status: 503 }
            );
        }

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
            is_simulated: false, // Guaranteed real data
            source: 'swissquote',
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error('[Market Data API] Unexpected error:', error);
        return NextResponse.json(
            { status: 'error', message: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 }
        );
    }
}
