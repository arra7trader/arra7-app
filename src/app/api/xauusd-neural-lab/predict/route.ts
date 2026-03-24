/**
 * XAUUSD Neural Lab — Prediction API
 * 
 * Pipeline: Swissquote → 22-Feature Extraction → Bi-LSTM Inference → Prediction
 * 
 * Uses existing Bi-LSTM model (10 features) for Phase 1.
 * Ready for 22-feature model swap in Phase 2 (just change weights + feature extractor).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBrokerPrice, getMarketData } from '@/lib/market-data';
import { BiLSTMModel, extractFeatures, CandleData } from '@/lib/lstm-model';
import { LSTM_WEIGHTS } from '@/lib/lstm-weights';
import { extractNeuralLabFeatures, NeuralLabCandle, FEATURE_NAMES } from '@/lib/neural-lab-features';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Singleton model
let _model: BiLSTMModel | null = null;
function getModel(): BiLSTMModel {
    if (!_model) _model = new BiLSTMModel(LSTM_WEIGHTS);
    return _model;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const timeframe = body.timeframe || '1h';

        // 1. Fetch live price from Swissquote & historical candles from Yahoo
        let currentPrice = 0;
        let change = 0;
        let high = 0;
        let low = 0;
        let candles: any[] = [];
        let dataSource = 'swissquote';

        try {
            // Get live price stream from Swissquote
            const brokerData = await getBrokerPrice('XAUUSD' as any, timeframe as any, 'swissquote');
            currentPrice = brokerData.current_price;
            change = brokerData.change_percent;
            high = brokerData.high;
            low = brokerData.low;
            candles = brokerData.candles || [];
            dataSource = brokerData.timestampSource || 'swissquote';

            // Swissquote BBO only returns 1 candle. We ALWAYS need historical data for the LSTM.
            if (candles.length < 60) {
                // Must force preferRealtimeBroker to false so it hits Yahoo for history instead of Swissquote again
                const yahooData = await getMarketData('XAUUSD' as any, timeframe as any, { preferRealtimeBroker: false });
                if (yahooData.candles && yahooData.candles.length >= 10) {
                    // Use Yahoo candles but overwrite the last candle's close with Swissquote live price
                    candles = yahooData.candles;
                    const lastIdx = candles.length - 1;
                    candles[lastIdx].close = currentPrice;
                    
                    // If high/low from Yahoo are missing or outdated, update them too
                    if (high > 0) candles[lastIdx].high = Math.max(candles[lastIdx].high || 0, high);
                    if (low > 0) candles[lastIdx].low = Math.min(candles[lastIdx].low || 999999, low);
                    
                    dataSource = 'swissquote+yahoo';
                }
            }
        } catch {
            // Absolute Fallback: Yahoo Finance everything
            try {
                const marketData = await getMarketData('XAUUSD' as any, timeframe as any, { preferRealtimeBroker: false });
                currentPrice = marketData.current_price;
                change = marketData.change_percent;
                high = marketData.high;
                low = marketData.low;
                candles = marketData.candles || [];
                dataSource = 'yahoo-fallback';
            } catch {
                return NextResponse.json(
                    { error: 'Unable to fetch XAUUSD data from any source' },
                    { status: 503 }
                );
            }
        }

        if (currentPrice <= 0 || candles.length < 10) {
            return NextResponse.json(
                { error: 'Insufficient market data for prediction. Need minimum 10 candles.' },
                { status: 503 }
            );
        }

        // 2. Convert candle format
        const candleData: CandleData[] = candles.map((c: any) => ({
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume || 0,
            timestamp: typeof c.time === 'string' ? Math.floor(new Date(c.time).getTime() / 1000) : Number(c.time),
        }));

        // 3. Run LSTM inference (Phase 1: existing 10-feature model)
        const model = getModel();
        const lookback = Math.min(60, LSTM_WEIGHTS.metadata.lookback || 60);
        const features10 = extractFeatures(candleData, lookback);
        const prediction = model.predict(features10);

        // prediction = [P(UP), P(DOWN), P(NEUTRAL)]
        const pUp = prediction[0] ?? 0.33;
        const pDown = prediction[1] ?? 0.33;
        const pNeutral = prediction[2] ?? 0.34;

        // Determine direction
        let direction: 'BUY' | 'SELL' | 'HOLD';
        let confidence: number;
        const maxP = Math.max(pUp, pDown, pNeutral);

        if (maxP === pUp && pUp > 0.4) {
            direction = 'BUY';
            confidence = pUp * 100;
        } else if (maxP === pDown && pDown > 0.4) {
            direction = 'SELL';
            confidence = pDown * 100;
        } else {
            direction = 'HOLD';
            confidence = pNeutral * 100;
        }

        // 4. Extract 22 features for display (always compute for UI regardless of model version)
        const neuralLabCandles: NeuralLabCandle[] = candleData.map(c => ({
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume,
            timestamp: c.timestamp,
        }));
        const features22 = extractNeuralLabFeatures(neuralLabCandles, Math.min(lookback, neuralLabCandles.length - 50));
        
        // Get the latest feature vector for display
        const latestFeatures = features22.length > 0 ? features22[features22.length - 1] : new Array(22).fill(0);
        const featureMap: Record<string, number> = {};
        FEATURE_NAMES.forEach((f, i) => {
            featureMap[f.key] = latestFeatures[i] ?? 0;
        });

        // 5. Session info
        const utcHour = new Date().getUTCHours();
        let sessionName = 'Off-Hours';
        let sessionEmoji = '😴';
        if (utcHour >= 0 && utcHour < 8) { sessionName = 'Asia/Tokyo'; sessionEmoji = '🇯🇵'; }
        else if (utcHour >= 8 && utcHour < 13) {
            if (utcHour >= 12) { sessionName = 'London-NY Overlap'; sessionEmoji = '🔥'; }
            else { sessionName = 'London'; sessionEmoji = '🇬🇧'; }
        }
        else if (utcHour >= 13 && utcHour < 22) { sessionName = 'New York'; sessionEmoji = '🇺🇸'; }

        // 6. Response
        return NextResponse.json({
            status: 'success',
            prediction: {
                direction,
                confidence: Math.round(confidence * 10) / 10,
                probabilities: {
                    up: Math.round(pUp * 1000) / 1000,
                    down: Math.round(pDown * 1000) / 1000,
                    neutral: Math.round(pNeutral * 1000) / 1000,
                },
            },
            features: featureMap,
            featureNames: FEATURE_NAMES,
            marketInfo: {
                symbol: 'XAUUSD',
                price: currentPrice,
                change: Math.round(change * 100) / 100,
                high24h: high,
                low24h: low,
                source: dataSource,
                timeframe,
                timestamp: new Date().toISOString(),
            },
            session: {
                name: sessionName,
                emoji: sessionEmoji,
                utcHour,
            },
            modelMeta: {
                architecture: LSTM_WEIGHTS.metadata.architecture,
                biLstmUnits: LSTM_WEIGHTS.metadata.biLstmUnits,
                denseUnits: LSTM_WEIGHTS.metadata.denseUnits,
                totalParams: LSTM_WEIGHTS.metadata.totalParams,
                accuracy: LSTM_WEIGHTS.metadata.accuracy,
                trainedAt: LSTM_WEIGHTS.metadata.trainedAt,
                lookback: LSTM_WEIGHTS.metadata.lookback,
                inputFeatures: 10, // Phase 1
                displayFeatures: 22, // Always show 22 features in UI
                epochs: LSTM_WEIGHTS.metadata.epochs,
            },
        });

    } catch (error: any) {
        console.error('[Neural Lab] Prediction error:', error);
        return NextResponse.json(
            { error: error.message || 'Prediction failed' },
            { status: 500 }
        );
    }
}
