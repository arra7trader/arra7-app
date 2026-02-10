/**
 * API Route: XAUUSD Probability Zones
 * 
 * Returns real-time probability zones for the XAUUSD heatmap.
 * Data source: Swissquote (primary) via existing getBrokerPrice + getMarketData.
 */

import { NextResponse } from 'next/server';
import { getBrokerPrice, getMarketData } from '@/lib/market-data';
import { calculateProbabilityZones } from '@/lib/lstm-probability';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    try {
        // Fetch XAUUSD market data from Swissquote (primary) via existing infrastructure
        let currentPrice = 0;
        let high24h = 0;
        let low24h = 0;
        let candles: any[] = [];
        let dataSource = 'swissquote';

        try {
            // Try getBrokerPrice first (Swissquote primary)
            const brokerData = await getBrokerPrice('XAUUSD' as any, '1h' as any, 'swissquote');
            currentPrice = brokerData.current_price;
            high24h = brokerData.high;
            low24h = brokerData.low;
            candles = brokerData.candles || [];
            dataSource = brokerData.timestampSource || 'swissquote';
        } catch {
            // Fallback to getMarketData (Yahoo)
            console.warn('[Probability Zones] Swissquote failed, falling back to Yahoo');
            const marketData = await getMarketData('XAUUSD' as any, '1h' as any);
            currentPrice = marketData.current_price;
            high24h = marketData.high;
            low24h = marketData.low;
            candles = marketData.candles || [];
            dataSource = marketData.timestampSource || 'yahoo';
        }

        if (currentPrice <= 0) {
            return NextResponse.json(
                { error: 'Unable to fetch XAUUSD price data' },
                { status: 503 }
            );
        }

        // If we only got 1 candle from Swissquote, supplement with Yahoo data
        if (candles.length < 5) {
            try {
                const yahooData = await getMarketData('XAUUSD' as any, '1h' as any);
                if (yahooData.candles && yahooData.candles.length > candles.length) {
                    candles = yahooData.candles;
                    high24h = Math.max(high24h, yahooData.high);
                    low24h = low24h > 0 ? Math.min(low24h, yahooData.low) : yahooData.low;
                }
            } catch {
                // Continue with what we have
            }
        }

        // Calculate probability zones
        const heatmapData = calculateProbabilityZones(currentPrice, candles, high24h, low24h);
        heatmapData.dataSource = dataSource;

        return NextResponse.json(heatmapData, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
        });

    } catch (error: any) {
        console.error('[Probability Zones] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch probability zones' },
            { status: 500 }
        );
    }
}
