/**
 * XAUUSD Neural Lab — Extended Feature Extractor (22 Features)
 * 
 * Computes 22 technical indicator features from OHLCV candle data
 * for LSTM-based direction prediction.
 * 
 * Architecture spec (for training):
 *   LSTM(128) → Dropout(0.2) → LSTM(64) → Dropout(0.3) → LSTM(32)
 *   Dense(64, relu) → Dropout(0.2) → Dense(3, softmax)
 *   Lookback: 60 candles (H1)
 *   Optimizer: Adam(lr=0.001)
 *   Batch: 32, Epochs: 200 + early stopping(patience=15)
 */

export interface NeuralLabCandle {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    timestamp?: number;
}

// ═══════════════════════════════════════════════
// Main Feature Extraction
// ═══════════════════════════════════════════════

/**
 * Extract 22 normalized features from candles for LSTM input.
 * Features:
 *   0: Normalized close (relative to EMA20)
 *   1: RSI (14) normalized 0-1
 *   2: Stochastic %K (14,3,3) normalized 0-1
 *   3: Stochastic %D normalized 0-1
 *   4: ATR ratio (ATR14 / price * 100)
 *   5: Bollinger position (where price sits within bands)
 *   6: Bollinger width (band spread / mid)
 *   7: ADX (14) normalized 0-1
 *   8: MACD line normalized
 *   9: MACD signal normalized
 *  10: MACD histogram normalized
 *  11: EMA 9/21 cross signal
 *  12: EMA 50/200 cross signal
 *  13: Volume z-score
 *  14: Momentum(10)
 *  15: Candle body ratio
 *  16: Upper shadow ratio (rejection signal)
 *  17: Lower shadow ratio (pin bar signal)
 *  18: VWAP distance
 *  19: Hour sin encoding
 *  20: Hour cos encoding
 *  21: Session flag (0=Asia, 0.5=London, 1=NY)
 */
export function extractNeuralLabFeatures(
    candles: NeuralLabCandle[],
    lookback: number = 60
): number[][] {
    const minRequired = lookback + 200; // Need enough history for EMA200
    if (candles.length < minRequired) {
        // Pad with zeros if not enough data
        const available = Math.max(0, candles.length - 50);
        if (available < lookback) {
            return Array.from({ length: lookback }, () => new Array(22).fill(0));
        }
    }

    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const opens = candles.map(c => c.open);
    const volumes = candles.map(c => c.volume || 1);

    // Pre-compute all indicators
    const ema9 = computeEMA(closes, 9);
    const ema12 = computeEMA(closes, 12);
    const ema20 = computeEMA(closes, 20);
    const ema21 = computeEMA(closes, 21);
    const ema26 = computeEMA(closes, 26);
    const ema50 = computeEMA(closes, 50);
    const ema200 = computeEMA(closes, Math.min(200, closes.length));

    const rsiSeries = computeRSI(closes, 14);
    const { k: stochK, d: stochD } = computeStochastic(highs, lows, closes, 14, 3, 3);
    const atrSeries = computeATR(highs, lows, closes, 14);
    const { upper: bbUpper, lower: bbLower, mid: bbMid } = computeBollingerBands(closes, 20, 2);
    const adxSeries = computeADX(highs, lows, closes, 14);
    const { macd: macdLine, signal: macdSignal, histogram: macdHist } = computeMACD(closes, 12, 26, 9);
    const vwap = computeRunningVWAP(candles);

    // Volume stats
    const volMean = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const volStd = Math.sqrt(
        volumes.reduce((a, b) => a + (b - volMean) ** 2, 0) / volumes.length
    ) || 1;

    // Extract features for the last `lookback` candles
    const startIdx = candles.length - lookback;
    const features: number[][] = [];

    for (let i = startIdx; i < candles.length; i++) {
        const c = candles[i];
        const price = c.close;
        const idx = i;

        // 0: Normalized close
        const e20 = ema20[idx] || price;
        const normClose = (price - e20) / (e20 * 0.01 || 1);

        // 1: RSI (14) normalized
        const rsi = (rsiSeries[idx] ?? 50) / 100;

        // 2-3: Stochastic %K, %D
        const sk = (stochK[idx] ?? 50) / 100;
        const sd = (stochD[idx] ?? 50) / 100;

        // 4: ATR ratio
        const atr = atrSeries[idx] || price * 0.005;
        const atrRatio = (atr / price) * 100;

        // 5: Bollinger position
        const bbU = bbUpper[idx] || price * 1.02;
        const bbL = bbLower[idx] || price * 0.98;
        const bbRange = bbU - bbL;
        const bbPosition = bbRange > 0 ? (price - bbL) / bbRange : 0.5;

        // 6: Bollinger width
        const bbM = bbMid[idx] || price;
        const bbWidth = bbM > 0 ? bbRange / bbM : 0;

        // 7: ADX normalized
        const adx = (adxSeries[idx] ?? 25) / 100;

        // 8-10: MACD
        const macdNorm = macdLine[idx] ?? 0;
        const signalNorm = macdSignal[idx] ?? 0;
        const histNorm = macdHist[idx] ?? 0;
        const priceScale = price * 0.001 || 1;
        const macdScaled = macdNorm / priceScale;
        const signalScaled = signalNorm / priceScale;
        const histScaled = histNorm / priceScale;

        // 11: EMA 9/21 cross
        const e9 = ema9[idx] || price;
        const e21 = ema21[idx] || price;
        const emaCross921 = (e9 - e21) / (e21 * 0.01 || 1);

        // 12: EMA 50/200 cross
        const e50 = ema50[idx] || price;
        const e200val = ema200[idx] || price;
        const emaCross50200 = (e50 - e200val) / (e200val * 0.01 || 1);

        // 13: Volume z-score
        const volZ = ((c.volume || 1) - volMean) / volStd;

        // 14: Momentum(10)
        const momIdx = Math.max(0, i - 10);
        const momentum = ((price - candles[momIdx].close) / candles[momIdx].close) * 100;

        // 15: Candle body ratio
        const range = c.high - c.low;
        const body = Math.abs(c.close - c.open);
        const bodyRatio = range > 0 ? body / range : 0;

        // 16: Upper shadow ratio (rejection)
        const upperShadow = c.high - Math.max(c.open, c.close);
        const upperRatio = range > 0 ? upperShadow / range : 0;

        // 17: Lower shadow ratio (pin bar)
        const lowerShadow = Math.min(c.open, c.close) - c.low;
        const lowerRatio = range > 0 ? lowerShadow / range : 0;

        // 18: VWAP distance
        const vwapVal = vwap[idx] || price;
        const vwapDist = vwapVal > 0 ? (price - vwapVal) / (vwapVal * 0.01) : 0;

        // 19-20: Hour encoding
        const hour = c.timestamp ? new Date(c.timestamp * 1000).getUTCHours() : 12;
        const hourSin = Math.sin((2 * Math.PI * hour) / 24);
        const hourCos = Math.cos((2 * Math.PI * hour) / 24);

        // 21: Session flag
        const session = getSessionFlag(hour);

        features.push([
            clip(normClose, -5, 5),      // 0
            clip(rsi, 0, 1),             // 1
            clip(sk, 0, 1),              // 2
            clip(sd, 0, 1),              // 3
            clip(atrRatio, 0, 5),        // 4
            clip(bbPosition, -0.5, 1.5), // 5
            clip(bbWidth, 0, 0.2),       // 6
            clip(adx, 0, 1),             // 7
            clip(macdScaled, -10, 10),   // 8
            clip(signalScaled, -10, 10), // 9
            clip(histScaled, -5, 5),     // 10
            clip(emaCross921, -5, 5),    // 11
            clip(emaCross50200, -5, 5),  // 12
            clip(volZ, -3, 3),           // 13
            clip(momentum, -10, 10),     // 14
            clip(bodyRatio, 0, 1),       // 15
            clip(upperRatio, 0, 1),      // 16
            clip(lowerRatio, 0, 1),      // 17
            clip(vwapDist, -10, 10),     // 18
            hourSin,                     // 19
            hourCos,                     // 20
            session,                     // 21
        ]);
    }

    return features;
}

// ═══════════════════════════════════════════════
// Feature Name & Description Map (for UI)
// ═══════════════════════════════════════════════

export const FEATURE_NAMES: { key: string; label: string; category: string }[] = [
    { key: 'normClose',     label: 'Normalized Close',    category: 'Trend' },
    { key: 'rsi',           label: 'RSI (14)',            category: 'Momentum' },
    { key: 'stochK',        label: 'Stochastic %K',       category: 'Momentum' },
    { key: 'stochD',        label: 'Stochastic %D',       category: 'Momentum' },
    { key: 'atrRatio',      label: 'ATR Ratio',           category: 'Volatility' },
    { key: 'bbPosition',    label: 'Bollinger Position',  category: 'Volatility' },
    { key: 'bbWidth',       label: 'Bollinger Width',     category: 'Volatility' },
    { key: 'adx',           label: 'ADX (14)',            category: 'Trend' },
    { key: 'macdLine',      label: 'MACD Line',           category: 'Momentum' },
    { key: 'macdSignal',    label: 'MACD Signal',         category: 'Momentum' },
    { key: 'macdHist',      label: 'MACD Histogram',      category: 'Momentum' },
    { key: 'emaCross921',   label: 'EMA 9/21 Cross',      category: 'Trend' },
    { key: 'emaCross50200', label: 'EMA 50/200 Cross',    category: 'Trend' },
    { key: 'volZScore',     label: 'Volume Z-Score',      category: 'Volume' },
    { key: 'momentum',      label: 'Momentum (10)',       category: 'Momentum' },
    { key: 'bodyRatio',     label: 'Candle Body Ratio',   category: 'Pattern' },
    { key: 'upperShadow',   label: 'Upper Shadow',        category: 'Pattern' },
    { key: 'lowerShadow',   label: 'Lower Shadow',        category: 'Pattern' },
    { key: 'vwapDist',      label: 'VWAP Distance',       category: 'Volume' },
    { key: 'hourSin',       label: 'Hour (sin)',          category: 'Temporal' },
    { key: 'hourCos',       label: 'Hour (cos)',          category: 'Temporal' },
    { key: 'session',       label: 'Session Flag',        category: 'Temporal' },
];

// ═══════════════════════════════════════════════
// Technical Indicator Implementations
// ═══════════════════════════════════════════════

function clip(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
}

function computeEMA(values: number[], period: number): number[] {
    if (values.length === 0) return [];
    const k = 2 / (period + 1);
    const ema: number[] = [values[0]];
    for (let i = 1; i < values.length; i++) {
        ema.push(values[i] * k + ema[i - 1] * (1 - k));
    }
    return ema;
}

function computeRSI(closes: number[], period: number): number[] {
    const rsi: number[] = new Array(closes.length).fill(50);
    if (closes.length < period + 1) return rsi;

    let avgGain = 0, avgLoss = 0;
    for (let i = 1; i <= period; i++) {
        const change = closes[i] - closes[i - 1];
        if (change > 0) avgGain += change;
        else avgLoss += Math.abs(change);
    }
    avgGain /= period;
    avgLoss /= period;
    rsi[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));

    for (let i = period + 1; i < closes.length; i++) {
        const change = closes[i] - closes[i - 1];
        avgGain = (avgGain * (period - 1) + (change > 0 ? change : 0)) / period;
        avgLoss = (avgLoss * (period - 1) + (change < 0 ? Math.abs(change) : 0)) / period;
        rsi[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
    }
    return rsi;
}

function computeStochastic(
    highs: number[], lows: number[], closes: number[],
    kPeriod: number, kSmoothing: number, dSmoothing: number
): { k: number[]; d: number[] } {
    const len = closes.length;
    const rawK: number[] = new Array(len).fill(50);

    for (let i = kPeriod - 1; i < len; i++) {
        let highest = -Infinity, lowest = Infinity;
        for (let j = i - kPeriod + 1; j <= i; j++) {
            if (highs[j] > highest) highest = highs[j];
            if (lows[j] < lowest) lowest = lows[j];
        }
        const range = highest - lowest;
        rawK[i] = range > 0 ? ((closes[i] - lowest) / range) * 100 : 50;
    }

    // Smooth %K with SMA
    const k = computeSMA(rawK, kSmoothing);
    // %D = SMA of %K
    const d = computeSMA(k, dSmoothing);

    return { k, d };
}

function computeSMA(values: number[], period: number): number[] {
    const result: number[] = new Array(values.length).fill(0);
    let sum = 0;
    for (let i = 0; i < values.length; i++) {
        sum += values[i];
        if (i >= period) sum -= values[i - period];
        result[i] = i >= period - 1 ? sum / period : values[i];
    }
    return result;
}

function computeATR(highs: number[], lows: number[], closes: number[], period: number): number[] {
    const len = closes.length;
    const atr: number[] = new Array(len).fill(0);
    if (len < 2) return atr;

    const tr: number[] = [highs[0] - lows[0]];
    for (let i = 1; i < len; i++) {
        tr.push(Math.max(
            highs[i] - lows[i],
            Math.abs(highs[i] - closes[i - 1]),
            Math.abs(lows[i] - closes[i - 1])
        ));
    }

    let sum = 0;
    for (let i = 0; i < Math.min(period, tr.length); i++) sum += tr[i];
    atr[Math.min(period - 1, tr.length - 1)] = sum / Math.min(period, tr.length);

    for (let i = period; i < tr.length; i++) {
        atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
    }
    return atr;
}

function computeBollingerBands(
    closes: number[], period: number, stdDev: number
): { upper: number[]; lower: number[]; mid: number[] } {
    const len = closes.length;
    const mid = computeSMA(closes, period);
    const upper: number[] = new Array(len).fill(0);
    const lower: number[] = new Array(len).fill(0);

    for (let i = period - 1; i < len; i++) {
        let sumSq = 0;
        for (let j = i - period + 1; j <= i; j++) {
            sumSq += (closes[j] - mid[i]) ** 2;
        }
        const std = Math.sqrt(sumSq / period);
        upper[i] = mid[i] + stdDev * std;
        lower[i] = mid[i] - stdDev * std;
    }

    // Fill early values
    for (let i = 0; i < period - 1; i++) {
        upper[i] = closes[i] * 1.02;
        lower[i] = closes[i] * 0.98;
    }

    return { upper, lower, mid };
}

function computeADX(
    highs: number[], lows: number[], closes: number[], period: number
): number[] {
    const len = closes.length;
    const adx: number[] = new Array(len).fill(25);
    if (len < period * 2) return adx;

    // +DM, -DM
    const plusDM: number[] = [0];
    const minusDM: number[] = [0];
    const tr: number[] = [highs[0] - lows[0]];

    for (let i = 1; i < len; i++) {
        const upMove = highs[i] - highs[i - 1];
        const downMove = lows[i - 1] - lows[i];
        plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
        minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
        tr.push(Math.max(
            highs[i] - lows[i],
            Math.abs(highs[i] - closes[i - 1]),
            Math.abs(lows[i] - closes[i - 1])
        ));
    }

    // Smoothed values using Wilder's method
    const smoothedTR = wilderSmooth(tr, period);
    const smoothedPlusDM = wilderSmooth(plusDM, period);
    const smoothedMinusDM = wilderSmooth(minusDM, period);

    // +DI, -DI
    const plusDI: number[] = [];
    const minusDI: number[] = [];
    const dx: number[] = [];

    for (let i = 0; i < len; i++) {
        const str = smoothedTR[i] || 1;
        const pdi = (smoothedPlusDM[i] / str) * 100;
        const mdi = (smoothedMinusDM[i] / str) * 100;
        plusDI.push(pdi);
        minusDI.push(mdi);
        const diSum = pdi + mdi;
        dx.push(diSum > 0 ? (Math.abs(pdi - mdi) / diSum) * 100 : 0);
    }

    // ADX = Wilder smooth of DX
    const smoothedDX = wilderSmooth(dx, period);
    for (let i = 0; i < len; i++) {
        adx[i] = smoothedDX[i];
    }

    return adx;
}

function wilderSmooth(values: number[], period: number): number[] {
    const result: number[] = new Array(values.length).fill(0);
    if (values.length < period) return result;

    let sum = 0;
    for (let i = 0; i < period; i++) sum += values[i];
    result[period - 1] = sum / period;

    for (let i = period; i < values.length; i++) {
        result[i] = (result[i - 1] * (period - 1) + values[i]) / period;
    }
    return result;
}

function computeMACD(
    closes: number[], fastPeriod: number, slowPeriod: number, signalPeriod: number
): { macd: number[]; signal: number[]; histogram: number[] } {
    const emaFast = computeEMA(closes, fastPeriod);
    const emaSlow = computeEMA(closes, slowPeriod);

    const macdLine: number[] = [];
    for (let i = 0; i < closes.length; i++) {
        macdLine.push((emaFast[i] || 0) - (emaSlow[i] || 0));
    }

    const signalLine = computeEMA(macdLine, signalPeriod);
    const histogram: number[] = [];
    for (let i = 0; i < closes.length; i++) {
        histogram.push((macdLine[i] || 0) - (signalLine[i] || 0));
    }

    return { macd: macdLine, signal: signalLine, histogram };
}

function computeRunningVWAP(candles: NeuralLabCandle[]): number[] {
    const vwap: number[] = [];
    let cumTPV = 0, cumVol = 0;
    for (const c of candles) {
        const tp = (c.high + c.low + c.close) / 3;
        const vol = c.volume || 1;
        cumTPV += tp * vol;
        cumVol += vol;
        vwap.push(cumVol > 0 ? cumTPV / cumVol : c.close);
    }
    return vwap;
}

/**
 * Returns session flag based on UTC hour:
 * Asia (0:00-8:00 UTC) = 0.0
 * London (8:00-13:00 UTC) = 0.5
 * New York (13:00-22:00 UTC) = 1.0
 * Late/Sydney (22:00-0:00 UTC) = 0.0
 */
function getSessionFlag(utcHour: number): number {
    if (utcHour >= 0 && utcHour < 8) return 0.0;   // Asia
    if (utcHour >= 8 && utcHour < 13) return 0.5;   // London
    if (utcHour >= 13 && utcHour < 22) return 1.0;   // New York
    return 0.0; // Late / Sydney
}

/**
 * Get session name from UTC hour
 */
export function getSessionName(utcHour: number): string {
    if (utcHour >= 0 && utcHour < 8) return 'Asia';
    if (utcHour >= 8 && utcHour < 13) return 'London';
    if (utcHour >= 13 && utcHour < 22) return 'New York';
    return 'Sydney';
}
