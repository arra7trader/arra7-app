import { NextRequest, NextResponse } from 'next/server';

// ML Backend URL (configurable)
const ML_BACKEND_URL = process.env.ML_BACKEND_URL || 'http://localhost:8001';

// Fallback heuristic prediction when ML backend is unavailable
function getHeuristicPrediction(orderBook: any) {
    const imbalance = orderBook.imbalance || 0;
    const spreadBps = orderBook.spreadPercent * 100 || 0;

    // Simple heuristic based on order book imbalance
    let direction: 'UP' | 'DOWN' | 'NEUTRAL' = 'NEUTRAL';
    let directionCode = 0;
    let confidence = 0.5;

    if (imbalance > 20) {
        direction = 'UP';
        directionCode = 1;
        confidence = Math.min(0.5 + Math.abs(imbalance) / 200, 0.85);
    } else if (imbalance < -20) {
        direction = 'DOWN';
        directionCode = -1;
        confidence = Math.min(0.5 + Math.abs(imbalance) / 200, 0.85);
    } else {
        direction = 'NEUTRAL';
        directionCode = 0;
        confidence = 0.6 - Math.abs(imbalance) / 100;
    }

    // Adjust confidence based on spread
    if (spreadBps > 10) {
        confidence *= 0.9; // Wide spread = less confidence
    }

    return {
        direction,
        direction_code: directionCode,
        confidence: Math.round(confidence * 100) / 100,
        model_used: 'heuristic',
        source: 'fallback'
    };
}

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

        // Try to get prediction from ML backend
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
                signal: AbortSignal.timeout(3000) // 3 second timeout
            });

            if (mlResponse.ok) {
                const mlData = await mlResponse.json();
                return NextResponse.json({
                    symbol: symbol.toUpperCase(),
                    horizon,
                    direction: mlData.direction,
                    direction_code: mlData.direction_code,
                    confidence: mlData.confidence,
                    model_used: mlData.model_used,
                    inference_time_ms: mlData.inference_time_ms,
                    probabilities: mlData.probabilities,
                    source: 'ml-backend',
                    timestamp: new Date().toISOString()
                });
            }
        } catch (mlError) {
            // ML backend unavailable, use fallback
            console.log('ML backend unavailable, using heuristic fallback');
        }

        // Fallback to heuristic prediction
        const heuristicPred = getHeuristicPrediction(orderbook_data);

        return NextResponse.json({
            symbol: symbol.toUpperCase(),
            horizon,
            ...heuristicPred,
            probabilities: {
                DOWN: heuristicPred.direction === 'DOWN' ? heuristicPred.confidence : (1 - heuristicPred.confidence) / 2,
                NEUTRAL: heuristicPred.direction === 'NEUTRAL' ? heuristicPred.confidence : (1 - heuristicPred.confidence) / 2,
                UP: heuristicPred.direction === 'UP' ? heuristicPred.confidence : (1 - heuristicPred.confidence) / 2,
            },
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
