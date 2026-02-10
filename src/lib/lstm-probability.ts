/**
 * LSTM + Rule-Based Hybrid Probability Engine for XAUUSD
 * 
 * This engine combines:
 * 1. Real LSTM neural network (pre-trained on 6 months of XAUUSD 1H data)
 * 2. Rule-based technical indicators (RSI, VWAP, ATR, momentum, EMA)
 * 
 * The LSTM provides directional probability for each zone,
 * while rule-based signals provide additional confluence and context.
 * 
 * Data flow:
 *   Swissquote Live Data → Feature Extraction → LSTM Inference → Zone Generation
 *                                                      ↓
 *                                            Rule-Based Signals → Hybrid Score
 */

import { Candle } from '@/lib/market-data';
import { LSTMModel, extractFeatures, CandleData } from '@/lib/lstm-model';
import { LSTM_WEIGHTS } from '@/lib/lstm-weights';

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

export interface ProbabilityZone {
    price: number;
    probability: number;
    bias: 'LONG' | 'SHORT' | 'NEUTRAL';
    lstmScore: number;      // Raw LSTM prediction contribution
    ruleScore: number;      // Raw rule-based contribution
}

export interface HeatmapData {
    currentPrice: number;
    zones: ProbabilityZone[];
    timestamp: string;
    dataSource: string;
    session: string;
    sessionEmoji: string;
    high24h: number;
    low24h: number;
    atr: number;
    modelInfo: {
        type: 'LSTM_HYBRID';
        trainedAt: string;
        accuracy: number;
        params: number;
    };
}

// ═══════════════════════════════════════════════
// LSTM Model Singleton
// ═══════════════════════════════════════════════

let _model: LSTMModel | null = null;

function getModel(): LSTMModel {
    if (!_model) {
        _model = new LSTMModel(LSTM_WEIGHTS);
    }
    return _model;
}

// ═══════════════════════════════════════════════
// Technical Indicator Helpers (Rule-Based)
// ═══════════════════════════════════════════════

function calculateRSI(candles: Candle[], period: number = 14): number {
    if (candles.length < period + 1) return 50;
    let gains = 0, losses = 0;
    for (let i = candles.length - period; i < candles.length; i++) {
        const change = candles[i].close - candles[i - 1].close;
        if (change > 0) gains += change;
        else losses += Math.abs(change);
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    return 100 - (100 / (1 + avgGain / avgLoss));
}

function calculateVWAP(candles: Candle[]): number {
    if (candles.length === 0) return 0;
    let cumTPV = 0, cumVol = 0;
    for (const c of candles) {
        const tp = (c.high + c.low + c.close) / 3;
        const vol = c.volume || 1;
        cumTPV += tp * vol;
        cumVol += vol;
    }
    return cumVol > 0 ? cumTPV / cumVol : candles[candles.length - 1].close;
}

function calculateATR(candles: Candle[], period: number = 14): number {
    if (candles.length < 2) return 0;
    const trValues: number[] = [];
    for (let i = 1; i < candles.length; i++) {
        trValues.push(Math.max(
            candles[i].high - candles[i].low,
            Math.abs(candles[i].high - candles[i - 1].close),
            Math.abs(candles[i].low - candles[i - 1].close)
        ));
    }
    const slice = trValues.slice(-period);
    return slice.reduce((sum, v) => sum + v, 0) / slice.length;
}

function calculateEMA(values: number[], period: number): number[] {
    const k = 2 / (period + 1);
    const ema: number[] = [values[0]];
    for (let i = 1; i < values.length; i++) {
        ema.push(values[i] * k + ema[i - 1] * (1 - k));
    }
    return ema;
}

// ═══════════════════════════════════════════════
// Session Detection
// ═══════════════════════════════════════════════

function getActiveSession(): { session: string; emoji: string; weight: number } {
    const now = new Date();
    const utcHour = now.getUTCHours();

    const asiaActive = utcHour >= 0 && utcHour < 9;
    const londonActive = utcHour >= 7 && utcHour < 16;
    const nyActive = utcHour >= 12 && utcHour < 21;

    if (londonActive && nyActive) return { session: 'London-NY Overlap', emoji: '🔥', weight: 1.3 };
    if (asiaActive && londonActive) return { session: 'Asia-London Overlap', emoji: '⚡', weight: 1.15 };
    if (nyActive) return { session: 'New York', emoji: '🇺🇸', weight: 1.2 };
    if (londonActive) return { session: 'London', emoji: '🇬🇧', weight: 1.2 };
    if (asiaActive) return { session: 'Tokyo/Asia', emoji: '🇯🇵', weight: 0.9 };
    return { session: 'Off-Hours', emoji: '😴', weight: 0.7 };
}

// ═══════════════════════════════════════════════
// Core Probability Engine (LSTM + Rule-Based Hybrid)
// ═══════════════════════════════════════════════

export function calculateProbabilityZones(
    currentPrice: number,
    candles: Candle[],
    high24h: number,
    low24h: number
): HeatmapData {
    const model = getModel();
    const sessionInfo = getActiveSession();
    const atr = calculateATR(candles);
    const effectiveATR = atr > 0 ? atr : currentPrice * 0.005;

    // ── LSTM Prediction ──
    // Convert candles to CandleData format
    const candleData: CandleData[] = candles.map(c => ({
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
        timestamp: typeof c.time === 'string' ? new Date(c.time).getTime() : Number(c.time),
    }));

    // Extract features and run LSTM inference
    const features = extractFeatures(candleData, 20);
    const lstmPrediction = model.predict(features);
    // lstmPrediction = [P(UP), P(DOWN), P(NEUTRAL)]
    const pUp = lstmPrediction[0];
    const pDown = lstmPrediction[1];
    const pNeutral = lstmPrediction[2];

    // LSTM directional bias: positive = bullish, negative = bearish
    const lstmBias = pUp - pDown; // range: -1 to 1

    // ── Rule-Based Signals ──
    const rsi = calculateRSI(candles);
    const vwap = calculateVWAP(candles);
    const closes = candles.map(c => c.close);
    const ema20 = calculateEMA(closes, 20);
    const ema50 = calculateEMA(closes, Math.min(50, closes.length));
    const latestEma20 = ema20[ema20.length - 1] || currentPrice;
    const latestEma50 = ema50[ema50.length - 1] || currentPrice;
    const emaTrend = latestEma20 > latestEma50 ? 1 : -1;

    // ── Generate Zones ──
    const zoneRange = effectiveATR * 4;
    const stepSize = effectiveATR * 0.4;
    const steps = Math.ceil(zoneRange / stepSize);
    const zones: ProbabilityZone[] = [];

    for (let i = -steps; i <= steps; i++) {
        const zonePrice = Math.round((currentPrice + (i * stepSize)) * 100) / 100;
        const distanceFromCurrent = zonePrice - currentPrice;
        const distancePct = Math.abs(distanceFromCurrent) / currentPrice;

        // ── LSTM Component ──
        // Use LSTM prediction to influence zone bias
        // Zones above current price: if LSTM says DOWN → higher sell probability
        // Zones below current price: if LSTM says UP → higher buy probability
        let lstmZoneSignal: number;
        if (distanceFromCurrent > 0) {
            // Above current price: DOWN signal makes this resistance
            lstmZoneSignal = -pDown + pUp * 0.3;
        } else if (distanceFromCurrent < 0) {
            // Below current price: UP signal makes this support
            lstmZoneSignal = pUp - pDown * 0.3;
        } else {
            lstmZoneSignal = lstmBias * 0.5;
        }

        // ── Rule-Based Component ──
        // Positional bias
        const positionalBias = distanceFromCurrent < 0 ? 0.15 : distanceFromCurrent > 0 ? -0.15 : 0;

        // RSI signal
        let rsiSignal = 0;
        if (rsi > 70 && distanceFromCurrent > 0) rsiSignal = -(rsi - 70) / 30;
        else if (rsi < 30 && distanceFromCurrent < 0) rsiSignal = (30 - rsi) / 30;
        else if (rsi > 55) rsiSignal = (rsi - 55) / 45 * 0.4;
        else if (rsi < 45) rsiSignal = (rsi - 45) / 45 * 0.4;

        // VWAP signal
        let vwapSignal = 0;
        const vwapDistance = (zonePrice - vwap) / vwap;
        if (zonePrice < vwap && vwapDistance > -0.02) vwapSignal = 0.4;
        else if (zonePrice > vwap && vwapDistance < 0.02) vwapSignal = -0.3;

        // S/R signal
        let srSignal = 0;
        if (Math.abs(zonePrice - high24h) / currentPrice < 0.005) srSignal -= 0.35;
        if (Math.abs(zonePrice - low24h) / currentPrice < 0.005) srSignal += 0.35;

        // Distance decay
        const distanceFactor = Math.max(0.1, 1 - (distancePct / 0.08));

        // Combine rule-based signals
        const ruleSignal = (
            positionalBias * 0.2 +
            rsiSignal * 0.2 +
            vwapSignal * 0.2 +
            (emaTrend * 0.3) * 0.2 +
            srSignal * 0.2
        ) * distanceFactor;

        // ── Hybrid Combination ──
        // 60% LSTM + 40% Rule-Based (LSTM gets more weight since it's trained)
        const LSTM_WEIGHT = 0.6;
        const RULE_WEIGHT = 0.4;
        const hybridSignal = (lstmZoneSignal * LSTM_WEIGHT + ruleSignal * RULE_WEIGHT) * sessionInfo.weight;

        // Convert to probability
        const baseProbability = 0.5 + (hybridSignal * 0.8);
        const probability = Math.max(0.3, Math.min(0.98, baseProbability));

        // Determine bias
        let bias: 'LONG' | 'SHORT' | 'NEUTRAL';
        if (hybridSignal > 0.03) bias = 'LONG';
        else if (hybridSignal < -0.03) bias = 'SHORT';
        else bias = 'NEUTRAL';

        zones.push({
            price: zonePrice,
            probability,
            bias,
            lstmScore: lstmZoneSignal,
            ruleScore: ruleSignal,
        });
    }

    return {
        currentPrice,
        zones,
        timestamp: new Date().toISOString(),
        dataSource: 'Swissquote',
        session: sessionInfo.session,
        sessionEmoji: sessionInfo.emoji,
        high24h,
        low24h,
        atr: effectiveATR,
        modelInfo: {
            type: 'LSTM_HYBRID',
            trainedAt: LSTM_WEIGHTS.metadata.trainedAt,
            accuracy: LSTM_WEIGHTS.metadata.accuracy,
            params: 6083,
        },
    };
}
