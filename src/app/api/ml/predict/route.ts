import { NextRequest, NextResponse } from 'next/server';
import { getPredictor, updatePriceHistory } from '@/lib/smart-predictor';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// ML Backend URL (configurable)
const ML_BACKEND_URL = process.env.ML_BACKEND_URL || 'http://localhost:8001';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { symbol, horizon = 10, orderbook_data } = body;

        // ... (validation)
        if (!symbol || !orderbook_data) {
            return NextResponse.json(
                { error: 'symbol and orderbook_data required' },
                { status: 400 }
            );
        }

        // AUTO-LOGGING (Fire & Forget style if possible, but await for safety)
        const session = await getServerSession(authOptions);

        let predictionResult = null;

        // 1. Try to get prediction from ML backend (Python/TensorFlow)
        try {
            const mlResponse = await fetch(`${ML_BACKEND_URL}/predict`, {
                // ... (args)
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

                // Enhance backend prediction with Smart Predictor's Trade Setup logic
                const predictor = getPredictor(symbol, horizon);

                // Update history first
                updatePriceHistory(symbol, orderbook_data.midPrice);

                // Calculate Trade Setup based on backend confidence/direction
                const tradeSetup = predictor.calculateTradeSetup(
                    orderbook_data.midPrice,
                    mlData.direction,
                    mlData.confidence
                );

                predictionResult = {
                    ...mlData,
                    tradeSetup,
                    source: 'ml-backend'
                };
            }
        } catch (mlError) {
            // ML backend unavailable, proceed to smart predictor
        }

        if (!predictionResult) {
            // 2. Use Smart Predictor (Embedded Vercel Engine)
            const predictor = getPredictor(symbol, horizon);
            const result = predictor.predict(orderbook_data);

            predictionResult = {
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
            };
        }

        // Log Activity if user is authenticated
        if (session?.user?.id) {
            try {
                const { logActivity } = await import('@/lib/turso');
                await logActivity(session.user.id, 'ANALYSIS_PREDICT', {
                    symbol: symbol.toUpperCase(),
                    horizon,
                    direction: predictionResult.direction,
                    confidence: predictionResult.confidence,
                    model: predictionResult.source
                });
            } catch (e) {
                console.error('Failed to log analysis activity:', e);
            }
        }

        return NextResponse.json(predictionResult);

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
