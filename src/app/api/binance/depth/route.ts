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

        // List of endpoints to try (to bypass Geo-Blocking)
        const endpoints = [
            { url: 'https://api.binance.com/api/v3/depth', region: 'GLOBAL' },
            { url: 'https://data-api.binance.vision/api/v3/depth', region: 'VISION' },
            { url: 'https://api.binance.us/api/v3/depth', region: 'US' } // Fallback for US servers (Vercel)
        ];

        let lastError;

        for (const endpoint of endpoints) {
            try {
                // Adjust symbol for Binance US (BTCUSDT -> BTCUSD)
                let targetSymbol = binanceSymbol;
                if (endpoint.region === 'US') {
                    if (targetSymbol === 'BTCUSDT') targetSymbol = 'BTCUSD';
                    if (targetSymbol === 'ETHUSDT') targetSymbol = 'ETHUSD';
                    if (targetSymbol === 'PAXGUSDT') targetSymbol = 'PAXGUSD'; // Might not exist on US
                }

                const response = await fetch(
                    `${endpoint.url}?symbol=${targetSymbol}&limit=${limit}`,
                    {
                        headers: {
                            'Accept': 'application/json',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        },
                        cache: 'no-store',
                    }
                );

                if (response.ok) {
                    const data = await response.json();

                    // Normalize US data structure if needed (usually same)
                    // But ensure we return the ORIGINAL symbol name expected by frontend
                    return NextResponse.json({
                        symbol: binanceSymbol, // Client expects internal symbol
                        bids: data.bids,
                        asks: data.asks,
                        lastUpdateId: data.lastUpdateId,
                        timestamp: Date.now(),
                        source: endpoint.region // Debug info
                    }, {
                        headers: {
                            'Cache-Control': 'no-cache, no-store, must-revalidate',
                            'Access-Control-Allow-Origin': '*',
                        }
                    });
                }

                // If 403 or 451, it's blocked. Continue to next.
                console.warn(`Endpoint ${endpoint.url} failed: ${response.status}`);

            } catch (err) {
                lastError = err;
                console.warn(`Endpoint ${endpoint.url} error:`, err);
            }
        }

        throw lastError || new Error('All endpoints failed');

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
