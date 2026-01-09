import { NextRequest, NextResponse } from 'next/server';

// Binance REST API endpoint for order book depth
const BINANCE_API = 'https://api.binance.com/api/v3/depth';

// Valid symbols mapping (internal -> binance)
const VALID_SYMBOLS: Record<string, string> = {
    btcusdt: 'BTCUSDT',
    paxgusdt: 'PAXGUSDT',
    ethusdt: 'ETHUSDT',
};

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const symbol = searchParams.get('symbol')?.toLowerCase() || 'btcusdt';
        const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

        // Validate symbol
        const binanceSymbol = VALID_SYMBOLS[symbol];
        if (!binanceSymbol) {
            return NextResponse.json(
                { error: 'Invalid symbol' },
                { status: 400 }
            );
        }

        // Fetch from Binance API (server-side, bypasses ISP blocks)
        const response = await fetch(
            `${BINANCE_API}?symbol=${binanceSymbol}&limit=${limit}`,
            {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                },
                // Don't cache to get fresh data
                cache: 'no-store',
            }
        );

        if (!response.ok) {
            throw new Error(`Binance API error: ${response.status}`);
        }

        const data = await response.json();

        // Return formatted data matching WebSocket format
        return NextResponse.json({
            symbol: binanceSymbol,
            bids: data.bids,
            asks: data.asks,
            lastUpdateId: data.lastUpdateId,
            timestamp: Date.now(),
        }, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Access-Control-Allow-Origin': '*',
            }
        });

    } catch (error) {
        console.error('Binance Proxy Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch market data' },
            { status: 500 }
        );
    }
}

// Health check
export async function HEAD() {
    return new NextResponse(null, { status: 200 });
}
