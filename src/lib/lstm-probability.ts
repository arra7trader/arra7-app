/**
 * LSTM Probability Engine for XAUUSD Probability Heatmap
 * 
 * Uses a weighted technical indicator ensemble to generate probability zones.
 * Each zone represents a price level with a directional probability (LONG/SHORT/NEUTRAL).
 *
 * For production, this engine can be upgraded to use a TensorFlow.js LSTM model
 * trained on historical XAUUSD data. Currently uses a sophisticated rule-based
 * approach with RSI, VWAP distance, momentum, ATR, and session-aware weights.
 */

import { Candle } from '@/lib/market-data';

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

export interface ProbabilityZone {
    price: number;
    probability: number;
    bias: 'LONG' | 'SHORT' | 'NEUTRAL';
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
}

// ═══════════════════════════════════════════════
// Technical Indicator Helpers
// ═══════════════════════════════════════════════

function calculateRSI(candles: Candle[], period: number = 14): number {
    if (candles.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = candles.length - period; i < candles.length; i++) {
        const change = candles[i].close - candles[i - 1].close;
        if (change > 0) gains += change;
        else losses += Math.abs(change);
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

function calculateVWAP(candles: Candle[]): number {
    if (candles.length === 0) return 0;

    let cumulativeTPV = 0;
    let cumulativeVolume = 0;

    for (const c of candles) {
        const tp = (c.high + c.low + c.close) / 3;
        const vol = c.volume || 1;
        cumulativeTPV += tp * vol;
        cumulativeVolume += vol;
    }

    return cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : candles[candles.length - 1].close;
}

function calculateATR(candles: Candle[], period: number = 14): number {
    if (candles.length < 2) return 0;

    const trValues: number[] = [];
    for (let i = 1; i < candles.length; i++) {
        const tr = Math.max(
            candles[i].high - candles[i].low,
            Math.abs(candles[i].high - candles[i - 1].close),
            Math.abs(candles[i].low - candles[i - 1].close)
        );
        trValues.push(tr);
    }

    const slice = trValues.slice(-period);
    return slice.reduce((sum, v) => sum + v, 0) / slice.length;
}

function calculateMomentum(candles: Candle[], period: number = 10): number {
    if (candles.length < period) return 0;
    const current = candles[candles.length - 1].close;
    const previous = candles[candles.length - period].close;
    return ((current - previous) / previous) * 100;
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

    if (londonActive && nyActive) {
        return { session: 'London-NY Overlap', emoji: '🔥', weight: 1.3 };
    } else if (asiaActive && londonActive) {
        return { session: 'Asia-London Overlap', emoji: '⚡', weight: 1.15 };
    } else if (nyActive) {
        return { session: 'New York', emoji: '🇺🇸', weight: 1.2 };
    } else if (londonActive) {
        return { session: 'London', emoji: '🇬🇧', weight: 1.2 };
    } else if (asiaActive) {
        return { session: 'Tokyo/Asia', emoji: '🇯🇵', weight: 0.9 };
    }
    return { session: 'Off-Hours', emoji: '😴', weight: 0.7 };
}

// ═══════════════════════════════════════════════
// Core Probability Engine
// ═══════════════════════════════════════════════

export function calculateProbabilityZones(
    currentPrice: number,
    candles: Candle[],
    high24h: number,
    low24h: number
): HeatmapData {
    const rsi = calculateRSI(candles);
    const vwap = calculateVWAP(candles);
    const atr = calculateATR(candles);
    const momentum = calculateMomentum(candles);
    const sessionInfo = getActiveSession();

    // Calculate EMAs for trend
    const closes = candles.map(c => c.close);
    const ema20 = calculateEMA(closes, 20);
    const ema50 = calculateEMA(closes, Math.min(50, closes.length));
    const latestEma20 = ema20[ema20.length - 1] || currentPrice;
    const latestEma50 = ema50[ema50.length - 1] || currentPrice;
    const emaTrend = latestEma20 > latestEma50 ? 1 : -1; // 1=bullish, -1=bearish

    // Dynamic range based on ATR (or fallback to % of price)
    const effectiveATR = atr > 0 ? atr : currentPrice * 0.005;
    const zoneRange = effectiveATR * 4; // Cover ~4 ATR above and below
    const stepSize = effectiveATR * 0.4; // Each zone = 0.4 ATR

    const zones: ProbabilityZone[] = [];
    const steps = Math.ceil(zoneRange / stepSize);

    for (let i = -steps; i <= steps; i++) {
        const zonePrice = Math.round((currentPrice + (i * stepSize)) * 100) / 100;
        const distanceFromCurrent = zonePrice - currentPrice;
        const distancePct = Math.abs(distanceFromCurrent) / currentPrice;

        // ── Signal Components ──

        // 0. Positional Bias: below price = natural support (LONG), above = resistance (SHORT)
        const positionalBias = distanceFromCurrent < 0 ? 0.15 : distanceFromCurrent > 0 ? -0.15 : 0;

        // 1. RSI Signal (overbought/oversold at zones)
        let rsiSignal = 0;
        if (rsi > 70 && distanceFromCurrent > 0) {
            rsiSignal = -(rsi - 70) / 30; // Overbought + above → bearish
        } else if (rsi < 30 && distanceFromCurrent < 0) {
            rsiSignal = (30 - rsi) / 30; // Oversold + below → bullish
        } else if (rsi > 55) {
            rsiSignal = (rsi - 55) / 45 * 0.4;
        } else if (rsi < 45) {
            rsiSignal = (rsi - 45) / 45 * 0.4;
        }

        // 2. VWAP Signal (widened thresholds)
        let vwapSignal = 0;
        const vwapDistance = (zonePrice - vwap) / vwap;
        if (zonePrice < vwap && vwapDistance > -0.02) {
            vwapSignal = 0.4; // Below VWAP → buy interest
        } else if (zonePrice > vwap && vwapDistance < 0.02) {
            vwapSignal = -0.3; // Above VWAP → sell pressure
        }

        // 3. Momentum Signal (lower threshold)
        let momentumSignal = 0;
        if (momentum > 0.02) {
            momentumSignal = distanceFromCurrent > 0 ? 0.35 : -0.1;
        } else if (momentum < -0.02) {
            momentumSignal = distanceFromCurrent < 0 ? -0.35 : 0.1;
        }

        // 4. EMA Trend Signal (amplified)
        const trendSignal = emaTrend * 0.3;

        // 5. Support/Resistance Signal (24h high/low, wider detection)
        let srSignal = 0;
        const distFromHigh = Math.abs(zonePrice - high24h) / currentPrice;
        const distFromLow = Math.abs(zonePrice - low24h) / currentPrice;
        if (distFromHigh < 0.005) srSignal -= 0.35; // Near 24h high = resistance
        if (distFromLow < 0.005) srSignal += 0.35;  // Near 24h low = support

        // 6. Distance Decay — wider window (0.08 = 8% of price keeps signal alive)
        const distanceFactor = Math.max(0.1, 1 - (distancePct / 0.08));

        // ── Combine Signals ──
        const rawSignal = (
            positionalBias * 0.2 +
            rsiSignal * 0.2 +
            vwapSignal * 0.2 +
            momentumSignal * 0.15 +
            trendSignal * 0.15 +
            srSignal * 0.1
        ) * distanceFactor * sessionInfo.weight;

        // Convert signal to probability (0.5 = neutral, towards 1.0 = strong)
        const baseProbability = 0.5 + (rawSignal * 0.9); // amplified from 0.45 to 0.9
        const probability = Math.max(0.3, Math.min(0.98, baseProbability));

        // Determine bias — much lower threshold so we get actual LONG/SHORT zones
        let bias: 'LONG' | 'SHORT' | 'NEUTRAL';
        if (rawSignal > 0.03) {
            bias = 'LONG';
        } else if (rawSignal < -0.03) {
            bias = 'SHORT';
        } else {
            bias = 'NEUTRAL';
        }

        zones.push({ price: zonePrice, probability, bias });
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
    };
}
