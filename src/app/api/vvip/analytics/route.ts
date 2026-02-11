import { NextResponse } from 'next/server';
import { getBrokerPrice, MarketData } from '@/lib/market-data';

export const dynamic = 'force-dynamic'; // Prevent caching
export const revalidate = 0;

export async function GET() {
    try {
        // 1. Fetch Major Pairs for Currency Strength
        // We use Swissquote as primary source
        const pairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD', 'XAUUSD'];
        const promises = pairs.map(pair =>
            getBrokerPrice(pair as any, '1h', 'swissquote')
                .catch(err => {
                    console.error(`Failed to fetch ${pair}:`, err);
                    return null;
                })
        );

        const results = await Promise.all(promises);
        const dataMap: Record<string, MarketData | null> = {};

        pairs.forEach((pair, index) => {
            dataMap[pair] = results[index];
        });

        // 2. Calculate Currency Strength (Simple ROC basis)
        // Strength = (Current - Open) / Open * 100
        // USD is inverse for XXXUSD, direct for USDXXX
        const strength = {
            USD: 0, EUR: 0, GBP: 0, JPY: 0, CHF: 0, CAD: 0, AUD: 0, NZD: 0
        };

        // Helper to add strength
        const addStrength = (currency: string, value: number) => {
            // @ts-ignore
            strength[currency] += value;
        };

        if (dataMap['EURUSD']) {
            const change = dataMap['EURUSD'].change_percent;
            addStrength('EUR', change);
            addStrength('USD', -change);
        }
        if (dataMap['GBPUSD']) {
            const change = dataMap['GBPUSD'].change_percent;
            addStrength('GBP', change);
            addStrength('USD', -change);
        }
        if (dataMap['USDJPY']) {
            const change = dataMap['USDJPY'].change_percent;
            addStrength('USD', change);
            addStrength('JPY', -change);
        }
        if (dataMap['USDCHF']) {
            const change = dataMap['USDCHF'].change_percent;
            addStrength('USD', change);
            addStrength('CHF', -change);
        }
        if (dataMap['AUDUSD']) {
            const change = dataMap['AUDUSD'].change_percent;
            addStrength('AUD', change);
            addStrength('USD', -change);
        }
        if (dataMap['USDCAD']) {
            const change = dataMap['USDCAD'].change_percent;
            addStrength('USD', change);
            addStrength('CAD', -change);
        }
        if (dataMap['NZDUSD']) {
            const change = dataMap['NZDUSD'].change_percent;
            addStrength('NZD', change);
            addStrength('USD', -change);
        }

        // Normalize strengths (simple average isn't needed for relative view, but let's keep it raw)

        // 3. Calculate Gold Sentiment (RSI-like & Volatility)
        let sentiment = {
            score: 50, // 0-100
            label: 'NEUTRAL',
            volatility: 'LOW'
        };

        const xau = dataMap['XAUUSD'];
        if (xau) {
            // Simple RSI-proxy using last few candles if available, or just change %
            // If change is > 0.5% -> Greed, < -0.5% -> Fear
            const change = xau.change_percent;

            // Base score 50. 
            // +1% change => +20 score (Max 90)
            // -1% change => -20 score (Min 10)
            let score = 50 + (change * 20);
            score = Math.max(10, Math.min(90, score));

            sentiment.score = Math.round(score);
            sentiment.label = score > 60 ? 'GREED' : score < 40 ? 'FEAR' : 'NEUTRAL';
            sentiment.volatility = Math.abs(change) > 0.5 ? 'HIGH' : Math.abs(change) > 0.2 ? 'MODERATE' : 'LOW';
        }

        // 4. Calculate Key Levels (Pivot Points for XAUUSD)
        const levels = {
            pivot: 0, r1: 0, r2: 0, r3: 0, s1: 0, s2: 0, s3: 0,
            camarilla: { r3: 0, r4: 0, s3: 0, s4: 0 }
        };

        if (xau) {
            // Use 24h High/Low if available, else estimate from candles or current
            // Since getBrokerPrice usually returns latest candle, we might need '1d' timeframe for accurate pivots
            // For now, let's use the 'high' and 'low' from the response which might be 1h candles
            // Ideally we'd fetch 1d data separately, but to save bandwidth we'll approximate 
            // or fetch 1d specifically for XAU if needed. 
            // Let's assume the wrapper handles '1h' but we really want daily stats.

            // Actually, let's just use what we have. If we want better pivots, we should fetch '1d' for XAU specifically.
            // Let's do a quick '1d' fetch for XAU only to be precise.
            try {
                const xauDaily = await getBrokerPrice('XAUUSD', '1d', 'swissquote');
                if (xauDaily) {
                    const H = xauDaily.high;
                    const L = xauDaily.low;
                    const C = xauDaily.close; // Previous close ideally, but current close works for live pivots

                    // Classic
                    const P = (H + L + C) / 3;
                    const R1 = 2 * P - L;
                    const S1 = 2 * P - H;
                    const R2 = P + (H - L);
                    const S2 = P - (H - L);
                    const R3 = H + 2 * (P - L);
                    const S3 = L - 2 * (H - P);

                    levels.pivot = P;
                    levels.r1 = R1; levels.r2 = R2; levels.r3 = R3;
                    levels.s1 = S1; levels.s2 = S2; levels.s3 = S3;

                    // Camarilla
                    const range = H - L;
                    levels.camarilla.r4 = C + range * 1.1 / 2;
                    levels.camarilla.r3 = C + range * 1.1 / 4;
                    levels.camarilla.s3 = C - range * 1.1 / 4;
                    levels.camarilla.s4 = C - range * 1.1 / 2;
                }
            } catch (e) {
                console.warn('Failed to fetch daily XAU for pivots:', e);
            }
        }

        return NextResponse.json({
            timestamp: new Date().toISOString(),
            source: 'Swissquote (Live)',
            strength,
            sentiment,
            levels,
            marketData: dataMap // Debugging info
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
