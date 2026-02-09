import { NextRequest, NextResponse } from 'next/server';
import { getPredictor } from '@/lib/smart-predictor';

// Expanded list of liquid IDX Stocks (LQ45 + High Content)
const STOCK_LIST = [
    // Banks
    { symbol: 'BBCA', name: 'Bank Central Asia' },
    { symbol: 'BBRI', name: 'Bank Rakyat Indonesia' },
    { symbol: 'BMRI', name: 'Bank Mandiri' },
    { symbol: 'BBNI', name: 'Bank Negara Indonesia' },
    { symbol: 'ARTO', name: 'Bank Jago' },
    { symbol: 'BRIS', name: 'Bank Syariah Indonesia' },

    // Telco & Tech
    { symbol: 'TLKM', name: 'Telkom Indonesia' },
    { symbol: 'GOTO', name: 'GoTo Gojek Tokopedia' },
    { symbol: 'EMTK', name: 'Elang Mahkota Teknologi' },
    { symbol: 'BUKA', name: 'Bukalapak.com' },

    // Energy & Mining
    { symbol: 'ADRO', name: 'Adaro Energy' },
    { symbol: 'PTBA', name: 'Bukit Asam' },
    { symbol: 'ITMG', name: 'Indo Tambangraya Megah' },
    { symbol: 'PGAS', name: 'Perusahaan Gas Negara' },
    { symbol: 'MDKA', name: 'Merdeka Copper Gold' },
    { symbol: 'ANTM', name: 'Aneka Tambang' },
    { symbol: 'INCO', name: 'Vale Indonesia' },
    { symbol: 'MEDC', name: 'Medco Energi' },
    { symbol: 'AKRA', name: 'AKR Corporindo' },

    // Consumers
    { symbol: 'ASII', name: 'Astra International' },
    { symbol: 'UNVR', name: 'Unilever Indonesia' },
    { symbol: 'ICBP', name: 'Indofood CBP' },
    { symbol: 'INDF', name: 'Indofood Sukses Makmur' },
    { symbol: 'GGRM', name: 'Gudang Garam' },
    { symbol: 'HMSP', name: 'HM Sampoerna' },
    { symbol: 'KLBF', name: 'Kalbe Farma' },

    // Infrastructure & Others
    { symbol: 'JSMR', name: 'Jasa Marga' },
    { symbol: 'UNTR', name: 'United Tractors' },
    { symbol: 'AMMN', name: 'Amman Mineral' },
    { symbol: 'BREN', name: 'Barito Renewables' },
    { symbol: 'TPIA', name: 'Chandra Asri' },
];

export async function GET(request: NextRequest) {
    try {
        const turso = (await import('@/lib/turso')).default();
        if (!turso) {
            return NextResponse.json({ status: 'error', message: 'Database not configured' }, { status: 500 });
        }

        // 1. Check Date
        // Format: YYYY-MM-DD
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        // 2. Check Cache in DB
        // If we already have recommendations for today, return them
        const cached = await turso.execute({
            sql: 'SELECT * FROM stock_recommendations WHERE date = ? ORDER BY confidence DESC',
            args: [today]
        });

        if (cached.rows.length > 0) {
            const recommendations = cached.rows.map(row => ({
                symbol: row.symbol,
                name: row.name,
                confidence: row.confidence,
                entryPrice: row.entry_price,
                prediction: JSON.parse(row.prediction_json as string)
            }));

            return NextResponse.json({
                status: 'success',
                source: 'cache',
                date: today,
                recommendations
            });
        }

        // 3. Run Scanner (If no cache)
        // This operation might take time, so ideally it should be a background job.
        // For now, we limt the list or rely on Vercel's timeout (10s for free, 60s for pro).
        // To be safe, we only scan 5 stocks per request or shuffle? 
        // Better: Scan ALL but assume it finishes. If it timeouts, the user might need to retry?
        // Optimization: Fetch simpler data (Yahoo) for all symbols first.

        const recommendations = [];

        for (const stock of STOCK_LIST) {
            try {
                // Fetch Data (Daily)
                // We use Yahoo via getMarketData (mapped to stock logic usually)
                // Since getMarketData is mainly for Forex/Pairs, we need to ensure it supports custom symbols or use a helper.
                // Actually `getMarketData` handles 'Yahoo' fallback. We just need to pass the symbol correctly.
                // For Yahoo, Indonesian stocks need `.JK` suffix.
                const yahooSymbol = `${stock.symbol}.JK`;

                // We utilize the underlying Yahoo fetch logic directly or via getMarketData if modified.
                // Let's use getMarketData but mapping might strip suffix. 
                // Let's use a direct fetch or ensure getMarketData passes it.
                // The `getMarketData` function uses `FOREX_PAIRS` config. 
                // We need to bypass it or add stocks to config dynamically? 
                // `getBrokerPrice` -> `fetchSwissquote` (Fail) -> `fetchYahoo`.
                // Let's try to simulate market data fetch for stock using standard library if available, 
                // or just fetch yahoo directly here for simplicity of the scanner.

                // Fetch Yahoo Finance Chart API directly for speed
                const data = await fetchYahooData(yahooSymbol);

                if (!data || data.candles.length < 14) continue;

                // Predict using Smart Predictor (Heuristic Neural Logic)
                const predictor = getPredictor(stock.symbol, 14);

                // Convert to History format
                const history = data.candles.map((c: any) => ({
                    price: c.close,
                    timestamp: new Date(c.time).getTime(),
                    volume: c.volume
                }));

                const prediction = predictor.predictStock(data.currentPrice, history);

                // Filter Logic: High Confidence & UP Direction (Long-Only)
                if (prediction.direction === 'UP' && prediction.confidence > 0.6) {

                    const rec = {
                        symbol: stock.symbol,
                        name: stock.name,
                        confidence: prediction.confidence,
                        entryPrice: data.currentPrice,
                        prediction: prediction
                    };

                    recommendations.push(rec);

                    // Save to DB
                    await turso.execute({
                        sql: `INSERT OR IGNORE INTO stock_recommendations (date, symbol, name, confidence, entry_price, prediction_json)
                              VALUES (?, ?, ?, ?, ?, ?)`,
                        args: [today, stock.symbol, stock.name, prediction.confidence, data.currentPrice, JSON.stringify(prediction)]
                    });
                }

            } catch (e) {
                console.error(`Scanner error for ${stock.symbol}:`, e);
            }
        }

        // Sort by confidence (Highest Accuracy First)
        recommendations.sort((a, b) => b.confidence - a.confidence);

        return NextResponse.json({
            status: 'success',
            source: 'scanner',
            date: today,
            recommendations
        });

    } catch (error) {
        console.error('Recommendation API error:', error);
        return NextResponse.json({ status: 'error', message: 'Internal Server Error' }, { status: 500 });
    }
}

// Helper to fetch stock data
async function fetchYahooData(symbol: string) {
    try {
        const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=3mo`, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            cache: 'no-store'
        });
        const data = await response.json();
        const result = data.chart?.result?.[0];

        if (!result) return null;

        const quote = result.indicators.quote[0];
        const timestamps = result.timestamp;

        const candles = timestamps.map((t: number, i: number) => ({
            time: new Date(t * 1000).toISOString(),
            close: quote.close[i],
            volume: quote.volume[i]
        })).filter((c: any) => c.close !== null);

        const currentPrice = result.meta.regularMarketPrice;

        return { currentPrice, candles };
    } catch {
        return null;
    }
}
