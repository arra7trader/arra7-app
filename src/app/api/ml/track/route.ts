import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
    saveMLPrediction,
    verifyMLPrediction,
    getMLAccuracyStats,
    getRecentMLPredictions,
    MLPredictionRecord
} from '@/lib/turso';

// POST - Save a prediction for tracking
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { prediction, action, predictionId, actualPrice } = body;

        if (action === 'save') {
            // Validate required fields
            if (!prediction) {
                return NextResponse.json({ error: 'Missing prediction data' }, { status: 400 });
            }

            if (!prediction.symbol || !prediction.direction) {
                return NextResponse.json({
                    error: 'Missing required fields: symbol or direction',
                    received: { symbol: prediction.symbol, direction: prediction.direction }
                }, { status: 400 });
            }

            // Build record with fallbacks for optional fields
            const record: MLPredictionRecord = {
                symbol: prediction.symbol,
                horizon: prediction.horizon || 10,
                direction: prediction.direction,
                direction_code: prediction.direction_code ?? (prediction.direction === 'UP' ? 1 : prediction.direction === 'DOWN' ? -1 : 0),
                confidence: prediction.confidence || 0.5,
                model_used: prediction.model_used || 'smart-predictor-v1',
                initial_price: prediction.initial_price || 0,
                signals: prediction.signals
            };

            const id = await saveMLPrediction(record);

            if (id === null) {
                return NextResponse.json({ error: 'Database save failed' }, { status: 500 });
            }

            return NextResponse.json({ success: true, id });

        } else if (action === 'verify') {
            // Verify an existing prediction
            if (!predictionId || !actualPrice) {
                return NextResponse.json({ error: 'Missing predictionId or actualPrice' }, { status: 400 });
            }
            const success = await verifyMLPrediction(predictionId, actualPrice);
            return NextResponse.json({ success });
        }

        return NextResponse.json({ error: 'Invalid action', received: action }, { status: 400 });

    } catch (error) {
        console.error('ML Track Error:', error);
        return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
    }
}

// GET - Get accuracy stats
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const symbol = searchParams.get('symbol') || 'BTCUSD';
        const days = parseInt(searchParams.get('days') || '7');
        const type = searchParams.get('type') || 'stats';

        if (type === 'stats') {
            const stats = await getMLAccuracyStats(symbol, days);
            return NextResponse.json(stats);
        } else if (type === 'recent') {
            const limit = parseInt(searchParams.get('limit') || '20');
            const predictions = await getRecentMLPredictions(symbol, limit);
            return NextResponse.json({ predictions });
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

    } catch (error) {
        console.error('ML Track GET Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
