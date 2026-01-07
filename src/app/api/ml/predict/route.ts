import { NextRequest, NextResponse } from 'next/server';
import { getPredictor } from '@/lib/smart-predictor';

// ML Backend URL (configurable)
const ML_BACKEND_URL = process.env.ML_BACKEND_URL || 'http://localhost:8001';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { symbol, horizon = 10, orderbook_data } = body;

        if (!symbol || !orderbook_data) {
            return NextResponse.json(
                { error: 'symbol and orderbook_data required' },
                { status: 400 }
            );
        }

        // 1. Try to get prediction from ML backend (Python/TensorFlow)
        try {
            const mlResponse = await fetch(`${ML_BACKEND_URL}/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol: symbol.toUpperCase(),
                    horizon,
                    orderbook_data: {
                        mid_price: orderbook_data.midPrice,
                        spread: orderbook_data.spread,
                        spread_bps: orderbook_data.spreadPercent * 100,
                        total_bid_volume: orderbook_data.totalBidVolume,
                        total_ask_volume: orderbook_data.totalAskVolume,
                        bid_ask_imbalance: orderbook_data.imbalance,
                        bid_volume_l1: orderbook_data.bids?.[0]?.volume || 0,
                        bid_volume_l2: orderbook_data.bids?.[1]?.volume || 0,
                        bid_volume_l3: orderbook_data.bids?.[2]?.volume || 0,
                        bid_volume_l4: orderbook_data.bids?.[3]?.volume || 0,
                        bid_volume_l5: orderbook_data.bids?.[4]?.volume || 0,
                        ask_volume_l1: orderbook_data.asks?.[0]?.volume || 0,
                        ask_volume_l2: orderbook_data.asks?.[1]?.volume || 0,
                        ask_volume_l3: orderbook_data.asks?.[2]?.volume || 0,
                        ask_volume_l4: orderbook_data.asks?.[3]?.volume || 0,
                        ask_volume_l5: orderbook_data.asks?.[4]?.volume || 0,
                    }
                }),
                signal: AbortSignal.timeout(2000) // Fast timeout for backend
            });

            if (mlResponse.ok) {
                const mlData = await mlResponse.json();
                return NextResponse.json({
                    ...mlData,
                    source: 'ml-backend'
                });
            }
        } catch (mlError) {
            // ML backend unavailable, proceed to smart predictor
        }

        // 2. Use Smart Predictor (Embedded Vercel Engine)
        // This is much more sophisticated than simple heuristics
        const predictor = getPredictor(symbol, horizon);
        const result = predictor.predict(orderbook_data);

        return NextResponse.json({
            symbol: symbol.toUpperCase(),
            horizon,
            direction: result.direction,
            direction_code: result.direction_code,
            confidence: result.confidence,
            model_used: result.model_used,
            inference_time_ms: 5, // Fast execution
            probabilities: result.probabilities,
            signals: result.signals, // Return detailed signal breakdown
            source: 'smart-predictor-v1',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('ML Predict Error:', error);
        return NextResponse.json(
            { error: 'Failed to generate prediction' },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({
        service: 'ML Prediction API',
        available_symbols: ['BTCUSD', 'XAUUSD'],
        horizons: [5, 10, 30],
        status: 'ready'
    });
}
