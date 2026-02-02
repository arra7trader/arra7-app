import { NextRequest, NextResponse } from 'next/server';

// IDX Stock API - Get stock data from Yahoo Finance
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const symbol = searchParams.get('symbol');

        if (!symbol) {
            return NextResponse.json(
                { status: 'error', message: 'Symbol required' },
                { status: 400 }
            );
        }

        // Add .JK suffix for Jakarta Stock Exchange
        const yahooSymbol = symbol.toUpperCase().endsWith('.JK')
            ? symbol.toUpperCase()
            : `${symbol.toUpperCase()}.JK`;

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
                        },
                        cache: 'no-store',
                    }
                );

                if (response.ok) {
                    diffResponse = response;
                    break;
                }
            } catch (err) {
                lastError = err;
            }
        }

        if (!diffResponse || !diffResponse.ok) {
            throw new Error('Failed to fetch stock data (All hosts failed)');
        }

        const data = await diffResponse.json();
        const result = data.chart?.result?.[0];

        if (!result) {
            return NextResponse.json(
                { status: 'error', message: 'Stock not found. Make sure it is listed on IDX.' },
                { status: 404 }
            );
        }

        const meta = result.meta;
        const quote = result.indicators?.quote?.[0];
        const timestamps = result.timestamp || [];

        // Get latest price data
        const latestIndex = timestamps.length - 1;
        const previousIndex = latestIndex - 1;

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
                currency: meta.currency || 'IDR',
                exchange: 'IDX',
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
        return NextResponse.json(
            { status: 'error', message: 'Failed to fetch stock data' },
            { status: 500 }
        );
    }
}
