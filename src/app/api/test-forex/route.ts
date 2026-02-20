
import { NextRequest, NextResponse } from 'next/server';
import { getPredictor } from '@/lib/smart-predictor';
import { getBrokerPrice } from '@/lib/market-data';

export async function GET(request: NextRequest) {
    try {
        // 1. Fetch Data
        const marketData = await getBrokerPrice('XAUUSD', '5m', 'swissquote');

        if (!marketData || marketData.is_simulated) {
            // return NextResponse.json({ warning: 'Using simulated data' });
        }

        const currentPrice = marketData.current_price;
        const priceHistory = marketData.candles.map((c: any) => ({
            price: c.close,
            timestamp: new Date(c.time).getTime(),
            volume: c.volume
        }));

        // 2. Run Predictor
        const predictor = getPredictor('XAUUSD', 10);
        const prediction = predictor.predictForex(currentPrice, priceHistory);

        // 3. Return Detailed JSON
        return NextResponse.json({
            succes: true,
            data: {
                price: currentPrice,
                prediction: {
                    direction: prediction.direction,
                    confidence: prediction.confidence,
                    model: prediction.model_used,
                    signals: prediction.signals.map(s => ({
                        name: s.name,
                        value: s.value,
                        signal: s.signal,
                        weight: s.weight,
                        description: s.signal > 0 ? 'BULL' : s.signal < 0 ? 'BEAR' : 'NEUTRAL'
                    })),
                    setup: prediction.tradeSetup
                }
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
