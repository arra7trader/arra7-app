/**
 * Pure TypeScript LSTM Inference Engine
 * 
 * Implements LSTM forward pass without any external dependencies (no TensorFlow).
 * Compatible with weights exported from TensorFlow.js LSTM models.
 * 
 * Architecture:
 *   Input → LSTM(32) → Dense(16, relu) → Dense(3, softmax) → [P(UP), P(DOWN), P(NEUTRAL)]
 * 
 * TensorFlow LSTM weight format (gate order: i, f, c, o):
 *   kernel:           [input_size, 4 * hidden_size]
 *   recurrent_kernel: [hidden_size, 4 * hidden_size]
 *   bias:             [4 * hidden_size]
 */

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

export interface LSTMWeights {
    kernel: number[][];          // [input_size, 4*hidden_size]
    recurrentKernel: number[][]; // [hidden_size, 4*hidden_size]
    bias: number[];              // [4*hidden_size]
}

export interface DenseWeights {
    kernel: number[][];  // [input_size, output_size]
    bias: number[];      // [output_size]
}

export interface ModelWeights {
    lstm: LSTMWeights;
    dense1: DenseWeights;
    dense2: DenseWeights;
    metadata: {
        inputSize: number;
        hiddenSize: number;
        dense1Size: number;
        outputSize: number;
        trainedAt: string;
        epochs: number;
        accuracy: number;
        dataPoints: number;
    };
}

// ═══════════════════════════════════════════════
// Activation Functions
// ═══════════════════════════════════════════════

function sigmoid(x: number): number {
    if (x > 20) return 1;
    if (x < -20) return 0;
    return 1 / (1 + Math.exp(-x));
}

function tanhActivation(x: number): number {
    if (x > 20) return 1;
    if (x < -20) return -1;
    return Math.tanh(x);
}

function relu(x: number): number {
    return Math.max(0, x);
}

function softmax(values: number[]): number[] {
    const maxVal = Math.max(...values);
    const exps = values.map(v => Math.exp(v - maxVal)); // numerical stability
    const sumExps = exps.reduce((a, b) => a + b, 0);
    return exps.map(e => e / sumExps);
}

// ═══════════════════════════════════════════════
// LSTM Model
// ═══════════════════════════════════════════════

export class LSTMModel {
    private weights: ModelWeights;
    private hiddenSize: number;

    constructor(weights: ModelWeights) {
        this.weights = weights;
        this.hiddenSize = weights.metadata.hiddenSize;
    }

    /**
     * Run LSTM inference on a sequence of feature vectors.
     * @param sequence Array of timesteps, each timestep is a feature vector [inputSize]
     * @returns Probability array [P(UP), P(DOWN), P(NEUTRAL)]
     */
    predict(sequence: number[][]): number[] {
        // Initialize hidden state and cell state to zeros
        let h: number[] = new Array(this.hiddenSize).fill(0);
        let c: number[] = new Array(this.hiddenSize).fill(0);

        // Process each timestep through the LSTM cell
        for (const x of sequence) {
            [h, c] = this.lstmStep(x, h, c);
        }

        // Dense layer 1: hidden → dense1 (relu)
        let output = this.denseForward(
            Array.from(h),
            this.weights.dense1,
            'relu'
        );

        // Dense layer 2: dense1 → output (softmax)
        output = this.denseForward(output, this.weights.dense2, 'softmax');

        return output;
    }

    /**
     * Single LSTM timestep using TensorFlow's gate ordering: [i, f, c, o]
     * 
     * Equations:
     *   z = kernel · x + recurrent_kernel · h + bias
     *   i = σ(z_i)          # input gate
     *   f = σ(z_f)          # forget gate
     *   c̃ = tanh(z_c)       # candidate cell
     *   o = σ(z_o)          # output gate
     *   C = f * C_prev + i * c̃
     *   h = o * tanh(C)
     */
    private lstmStep(
        x: number[],
        hPrev: number[],
        cPrev: number[]
    ): [number[], number[]] {
        const hs = this.hiddenSize;
        const { kernel, recurrentKernel, bias } = this.weights.lstm;

        // Compute z = kernel^T · x + recurrentKernel^T · h + bias
        // z has shape [4 * hiddenSize], split into gates [i, f, c, o]
        const z = new Array(4 * hs).fill(0);

        for (let j = 0; j < 4 * hs; j++) {
            let sum = bias[j];

            // kernel contribution: x · kernel[:, j]
            for (let i = 0; i < x.length; i++) {
                sum += x[i] * kernel[i][j];
            }

            // recurrent contribution: hPrev · recurrentKernel[:, j]
            for (let i = 0; i < hs; i++) {
                sum += hPrev[i] * recurrentKernel[i][j];
            }

            z[j] = sum;
        }

        // Split z into gates (TF order: i, f, c, o)
        const newH = new Array(hs).fill(0);
        const newC = new Array(hs).fill(0);

        for (let k = 0; k < hs; k++) {
            const iGate = sigmoid(z[k]);              // input gate
            const fGate = sigmoid(z[hs + k]);         // forget gate
            const cCandidate = tanhActivation(z[2 * hs + k]); // cell candidate
            const oGate = sigmoid(z[3 * hs + k]);     // output gate

            newC[k] = fGate * cPrev[k] + iGate * cCandidate;
            newH[k] = oGate * tanhActivation(newC[k]);
        }

        return [newH, newC];
    }

    /**
     * Dense (fully connected) layer forward pass
     */
    private denseForward(
        input: number[],
        weights: DenseWeights,
        activation: 'relu' | 'softmax' | 'linear'
    ): number[] {
        const outputSize = weights.bias.length;
        const output = new Array(outputSize);

        for (let j = 0; j < outputSize; j++) {
            let sum = weights.bias[j];
            for (let i = 0; i < input.length; i++) {
                sum += input[i] * weights.kernel[i][j];
            }

            if (activation === 'relu') {
                output[j] = relu(sum);
            } else {
                output[j] = sum;
            }
        }

        if (activation === 'softmax') {
            return softmax(output);
        }

        return output;
    }
}

// ═══════════════════════════════════════════════
// Feature Engineering
// ═══════════════════════════════════════════════

export interface CandleData {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    timestamp?: number;
}

/**
 * Extract normalized features from a series of candles for LSTM input.
 * Features per candle (10 total):
 *   0: Normalized close (relative to EMA20)
 *   1: RSI (0-1 scaled)
 *   2: VWAP distance (normalized)
 *   3: ATR ratio (ATR / price)
 *   4: Momentum (normalized)
 *   5: EMA cross signal (-1 to 1)
 *   6: Volume z-score
 *   7: Candle body ratio
 *   8: Hour sin encoding
 *   9: Hour cos encoding
 */
export function extractFeatures(candles: CandleData[], lookback: number = 20): number[][] {
    if (candles.length < lookback + 14) {
        // Not enough data; pad with neutral features
        return Array.from({ length: lookback }, () => new Array(10).fill(0));
    }

    const features: number[][] = [];
    const startIdx = candles.length - lookback;

    // Pre-compute indicators for the full series
    const closes = candles.map(c => c.close);
    const ema20 = computeEMA(closes, 20);
    const ema50 = computeEMA(closes, Math.min(50, closes.length));
    const rsiValues = computeRSISeries(candles, 14);
    const atrValues = computeATRSeries(candles, 14);
    const vwap = computeVWAP(candles);

    // Volume stats for z-score
    const volumes = candles.map(c => c.volume || 1);
    const volMean = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const volStd = Math.sqrt(volumes.reduce((a, b) => a + (b - volMean) ** 2, 0) / volumes.length) || 1;

    for (let i = startIdx; i < candles.length; i++) {
        const c = candles[i];
        const price = c.close;

        // Feature 0: Normalized close (relative to EMA20)
        const emaVal = ema20[i] || price;
        const normClose = (price - emaVal) / (emaVal * 0.01 || 1); // scaled % deviation

        // Feature 1: RSI (0-1)
        const rsi = (rsiValues[i] ?? 50) / 100;

        // Feature 2: VWAP distance
        const vwapDist = vwap > 0 ? (price - vwap) / (vwap * 0.01) : 0;

        // Feature 3: ATR ratio
        const atr = atrValues[i] || price * 0.005;
        const atrRatio = atr / price * 100; // as percentage

        // Feature 4: Momentum (10-candle)
        const momIdx = Math.max(0, i - 10);
        const momentum = ((price - candles[momIdx].close) / candles[momIdx].close) * 100;

        // Feature 5: EMA cross signal
        const e20 = ema20[i] || price;
        const e50 = ema50[i] || price;
        const emaCross = (e20 - e50) / (e50 * 0.01 || 1);

        // Feature 6: Volume z-score
        const volZ = ((c.volume || 1) - volMean) / volStd;

        // Feature 7: Candle body ratio (body / range)
        const range = c.high - c.low;
        const body = Math.abs(c.close - c.open);
        const bodyRatio = range > 0 ? body / range : 0;

        // Feature 8 & 9: Hour encoding (sin/cos for cyclical)
        const hour = c.timestamp ? new Date(c.timestamp * 1000).getUTCHours() : 12;
        const hourSin = Math.sin((2 * Math.PI * hour) / 24);
        const hourCos = Math.cos((2 * Math.PI * hour) / 24);

        // Clip features to reasonable ranges for numerical stability
        features.push([
            clip(normClose, -5, 5),
            clip(rsi, 0, 1),
            clip(vwapDist, -10, 10),
            clip(atrRatio, 0, 5),
            clip(momentum, -10, 10),
            clip(emaCross, -5, 5),
            clip(volZ, -3, 3),
            clip(bodyRatio, 0, 1),
            hourSin,
            hourCos,
        ]);
    }

    return features;
}

// ═══════════════════════════════════════════════
// Helper functions
// ═══════════════════════════════════════════════

function clip(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
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

function computeRSISeries(candles: CandleData[], period: number): number[] {
    const rsi: number[] = new Array(candles.length).fill(50);
    if (candles.length < period + 1) return rsi;

    let avgGain = 0, avgLoss = 0;

    // Initial average
    for (let i = 1; i <= period; i++) {
        const change = candles[i].close - candles[i - 1].close;
        if (change > 0) avgGain += change;
        else avgLoss += Math.abs(change);
    }
    avgGain /= period;
    avgLoss /= period;

    rsi[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));

    // Smooth
    for (let i = period + 1; i < candles.length; i++) {
        const change = candles[i].close - candles[i - 1].close;
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? Math.abs(change) : 0;
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
        rsi[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
    }

    return rsi;
}

function computeATRSeries(candles: CandleData[], period: number): number[] {
    const atr: number[] = new Array(candles.length).fill(0);
    if (candles.length < 2) return atr;

    // True range
    const tr: number[] = [candles[0].high - candles[0].low];
    for (let i = 1; i < candles.length; i++) {
        tr.push(Math.max(
            candles[i].high - candles[i].low,
            Math.abs(candles[i].high - candles[i - 1].close),
            Math.abs(candles[i].low - candles[i - 1].close)
        ));
    }

    // EMA of TR
    let sum = 0;
    for (let i = 0; i < Math.min(period, tr.length); i++) sum += tr[i];
    atr[Math.min(period - 1, tr.length - 1)] = sum / Math.min(period, tr.length);

    for (let i = period; i < tr.length; i++) {
        atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
    }

    return atr;
}

function computeVWAP(candles: CandleData[]): number {
    let cumTPV = 0, cumVol = 0;
    for (const c of candles) {
        const tp = (c.high + c.low + c.close) / 3;
        const vol = c.volume || 1;
        cumTPV += tp * vol;
        cumVol += vol;
    }
    return cumVol > 0 ? cumTPV / cumVol : 0;
}
