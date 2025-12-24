import { NextResponse } from 'next/server';

// API to fetch trending/most active stocks from IDX
export async function GET() {
    try {
        // Fetch most active stocks from Yahoo Finance Indonesia
        const response = await fetch(
            'https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=most_actives_id&count=12',
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
                next: { revalidate: 300 }, // Cache for 5 minutes
            }
        );

        if (!response.ok) {
            throw new Error('Failed to fetch trending stocks');
        }

        const data = await response.json();
        const quotes = data.finance?.result?.[0]?.quotes || [];

        // Format the stocks data
        const trendingStocks = quotes.map((stock: {
            symbol: string;
            shortName?: string;
            longName?: string;
            regularMarketPrice?: number;
            regularMarketChangePercent?: number;
            regularMarketVolume?: number;
        }) => ({
            symbol: stock.symbol?.replace('.JK', '') || '',
            name: stock.shortName || stock.longName || stock.symbol?.replace('.JK', ''),
            price: stock.regularMarketPrice,
            changePercent: stock.regularMarketChangePercent,
            volume: stock.regularMarketVolume,
        })).filter((s: { symbol: string }) => s.symbol); // Filter out empty symbols

        // If Yahoo Finance doesn't return data, use IDX top movers
        if (trendingStocks.length === 0) {
            // Fallback to common trending stocks
            return NextResponse.json({
                status: 'success',
                data: [
                    { symbol: 'BBCA', name: 'Bank Central Asia', trending: true },
                    { symbol: 'BBRI', name: 'Bank Rakyat Indonesia', trending: true },
                    { symbol: 'BMRI', name: 'Bank Mandiri', trending: true },
                    { symbol: 'TLKM', name: 'Telkom Indonesia', trending: true },
                    { symbol: 'ASII', name: 'Astra International', trending: true },
                    { symbol: 'GOTO', name: 'GoTo Gojek Tokopedia', trending: true },
                    { symbol: 'BREN', name: 'Barito Renewables', trending: true },
                    { symbol: 'AMMN', name: 'Amman Mineral', trending: true },
                    { symbol: 'ANTM', name: 'Aneka Tambang', trending: true },
                    { symbol: 'INDF', name: 'Indofood Sukses', trending: true },
                    { symbol: 'UNVR', name: 'Unilever Indonesia', trending: true },
                    { symbol: 'PANI', name: 'Pantai Indah Kapuk', trending: true },
                ],
                source: 'fallback',
                timestamp: new Date().toISOString(),
            });
        }

        return NextResponse.json({
            status: 'success',
            data: trendingStocks,
            source: 'yahoo',
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error('Trending stocks error:', error);

        // Return fallback data on error
        return NextResponse.json({
            status: 'success',
            data: [
                { symbol: 'BBCA', name: 'Bank Central Asia', trending: true },
                { symbol: 'BBRI', name: 'Bank Rakyat Indonesia', trending: true },
                { symbol: 'BMRI', name: 'Bank Mandiri', trending: true },
                { symbol: 'TLKM', name: 'Telkom Indonesia', trending: true },
                { symbol: 'ASII', name: 'Astra International', trending: true },
                { symbol: 'GOTO', name: 'GoTo Gojek Tokopedia', trending: true },
                { symbol: 'BREN', name: 'Barito Renewables', trending: true },
                { symbol: 'AMMN', name: 'Amman Mineral', trending: true },
                { symbol: 'ANTM', name: 'Aneka Tambang', trending: true },
                { symbol: 'INDF', name: 'Indofood Sukses', trending: true },
                { symbol: 'UNVR', name: 'Unilever Indonesia', trending: true },
                { symbol: 'PANI', name: 'Pantai Indah Kapuk', trending: true },
            ],
            source: 'fallback',
            timestamp: new Date().toISOString(),
        });
    }
}
