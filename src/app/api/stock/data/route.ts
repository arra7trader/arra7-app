import { NextRequest, NextResponse } from 'next/server';

// IDX Stock API - Get stock data from Yahoo Finance
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const symbol = searchParams.get('symbol');
        const market = searchParams.get('market') || 'IDX'; // 'IDX' | 'US'

        if (!symbol) {
            return NextResponse.json(
                { status: 'error', message: 'Symbol required' },
                { status: 400 }
            );
        }

        // Format symbol based on market
        let yahooSymbol = symbol.toUpperCase();
        if (market === 'IDX') {
            yahooSymbol = yahooSymbol.endsWith('.JK') ? yahooSymbol : `${yahooSymbol}.JK`;
        }
        // For US market, use symbol as is (e.g., AAPL, TSLA)

        // Yahoo Finance Hosts Loop (Failover)
        const hosts = ['query2.finance.yahoo.com', 'query1.finance.yahoo.com'];
        let lastError;
        let diffResponse;

        for (const host of hosts) {
            try {
                // Fetch from Yahoo Finance
                const response = await fetch(
                    `https://${host}/v8/finance/chart/${yahooSymbol}?interval=1d&range=3mo`,
                    {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                            'Accept-Language': 'en-US,en;q=0.9',
                        },
                        cache: 'no-store',
                    }
                );

                if (response.ok) {
                    diffResponse = response;
                    break;
                } else {
                    console.error(`Yahoo Finance Error (${host}): ${response.status} ${response.statusText}`);
                }
            } catch (err) {
                console.error(`Yahoo Finance Connection Error (${host}):`, err);
                lastError = err;
            }
        }

        if (!diffResponse || !diffResponse.ok) {
            throw new Error(`Failed to fetch stock data for ${yahooSymbol}. (Upstream Error)`);
        }

        const data = await diffResponse.json();
        const result = data.chart?.result?.[0];

        if (!result) {
            return NextResponse.json(
                { status: 'error', message: 'Stock not found. Make sure it is listed on the selected market.' },
                { status: 404 }
            );
        }

        const meta = result.meta;
        const quote = result.indicators?.quote?.[0];
        const timestamps = result.timestamp || [];

        // Get latest price data
        const latestIndex = timestamps.length - 1;
        const previousIndex = latestIndex - 1;

        if (latestIndex < 0 || !quote?.close) {
            return NextResponse.json(
                { status: 'error', message: 'No price data available for this stock.' },
                { status: 404 }
            );
        }

        const currentPrice = meta.regularMarketPrice || quote?.close?.[latestIndex];
        const previousClose = meta.previousClose || quote?.close?.[previousIndex];
        const change = currentPrice - previousClose;
        const changePercent = (change / previousClose) * 100;

        // Calculate additional metrics
        const high52Week = meta.fiftyTwoWeekHigh;
        const low52Week = meta.fiftyTwoWeekLow;
        const volume = meta.regularMarketVolume;
        const avgVolume = result.indicators?.quote?.[0]?.volume?.reduce((a: number, b: number) => a + b, 0) / timestamps.length;

        // Get historical data for chart
        const historicalData = timestamps.map((ts: number, i: number) => ({
            date: new Date(ts * 1000).toISOString().split('T')[0],
            open: quote?.open?.[i],
            high: quote?.high?.[i],
            low: quote?.low?.[i],
            close: quote?.close?.[i],
            volume: quote?.volume?.[i],
        })).filter((d: { close: number }) => d.close);

        return NextResponse.json({
            status: 'success',
            data: {
                symbol: symbol.toUpperCase(),
                name: meta.longName || meta.shortName || symbol.toUpperCase(),
                currency: meta.currency || (market === 'US' ? 'USD' : 'IDR'),
                exchange: market === 'US' ? 'NYSE/NASDAQ' : 'IDX',
                currentPrice,
                previousClose,
                change,
                changePercent,
                high52Week,
                low52Week,
                volume,
                avgVolume,
                marketCap: meta.marketCap,
                historicalData: historicalData.slice(-30), // Last 30 days
            },
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error('Stock data error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch stock data';
        return NextResponse.json(
            { status: 'error', message: errorMessage },
            { status: 500 }
        );
    }
}
