/**
 * Pure TypeScript Bi-LSTM Inference Engine
 * 
 * Implements 3-layer Bidirectional LSTM forward pass without any external dependencies.
 * Matches the proven architecture from CRYPTOLOGIC V1.
 * 
 * Architecture:
 *   Bi-LSTM(128) → Dropout → BatchNorm
 *   Bi-LSTM(64)  → Dropout → BatchNorm
 *   Bi-LSTM(32)  → Dropout
 *   Dense(128, relu) → Dropout → Dense(64, relu) → Dense(3, softmax)
 *   → [P(UP), P(DOWN), P(NEUTRAL)]
 * 
 * TensorFlow LSTM weight format (gate order: i, f, c, o):
 *   kernel:           [input_size, 4 * hidden_size]
 *   recurrent_kernel: [hidden_size, 4 * hidden_size]
 *   bias:             [4 * hidden_size]
 */

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

export interface LSTMLayerWeights {
    kernel: number[][];
    recurrentKernel: number[][];
    bias: number[];
}

export interface BatchNormWeights {
    gamma: number[];
    beta: number[];
    movingMean: number[];
    movingVariance: number[];
}

export interface BiLSTMLayerConfig {
    forward: LSTMLayerWeights;
    backward: LSTMLayerWeights;
    units: number;
    batchNorm?: BatchNormWeights;
}

export interface DenseWeights {
    kernel: number[][];
    bias: number[];
}

export interface BiLSTMModelWeights {
    biLstmLayers: BiLSTMLayerConfig[];
    denseLayers: DenseWeights[];
    metadata: {
        architecture: string;
        biLstmUnits: number[];
        denseUnits: number[];
        lookback: number;
        inputSize: number;
        outputSize: number;
        trainedAt: string;
        epochs: number;
        maxEpochs: number;
        accuracy: number;
        dataPoints: number;
        totalParams: number;
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
    const exps = values.map(v => Math.exp(v - maxVal));
    const sumExps = exps.reduce((a, b) => a + b, 0);
    return exps.map(e => e / sumExps);
}

// ═══════════════════════════════════════════════
// Core Operations
// ═══════════════════════════════════════════════

/**
 * Single LSTM timestep using TensorFlow's gate ordering: [i, f, c, o]
 */
function lstmStep(
    x: number[],
    hPrev: number[],
    cPrev: number[],
    weights: LSTMLayerWeights,
    hiddenSize: number
): [number[], number[]] {
    const hs = hiddenSize;
    const { kernel, recurrentKernel, bias } = weights;

    // z = kernel^T · x + recurrentKernel^T · h + bias
    const z = new Array(4 * hs).fill(0);
    for (let j = 0; j < 4 * hs; j++) {
        let sum = bias[j];
        for (let i = 0; i < x.length; i++) {
            sum += x[i] * kernel[i][j];
        }
        for (let i = 0; i < hs; i++) {
            sum += hPrev[i] * recurrentKernel[i][j];
        }
        z[j] = sum;
    }

    // Gates (TF order: i, f, c, o)
    const newH = new Array(hs);
    const newC = new Array(hs);
    for (let k = 0; k < hs; k++) {
        const iGate = sigmoid(z[k]);
        const fGate = sigmoid(z[hs + k]);
        const cCandidate = tanhActivation(z[2 * hs + k]);
        const oGate = sigmoid(z[3 * hs + k]);
        newC[k] = fGate * cPrev[k] + iGate * cCandidate;
        newH[k] = oGate * tanhActivation(newC[k]);
    }

    return [newH, newC];
}

/**
 * Run unidirectional LSTM over a sequence
 * @param sequence Array of timestep vectors
 * @param weights LSTM weights
 * @param hiddenSize Number of LSTM units
 * @param reverse If true, process sequence in reverse (for backward LSTM)
 * @param returnSequences If true, return all hidden states; otherwise only last
 * @returns Array of hidden states
 */
function runLSTM(
    sequence: number[][],
    weights: LSTMLayerWeights,
    hiddenSize: number,
    reverse: boolean,
    returnSequences: boolean
): number[][] {
    let h = new Array(hiddenSize).fill(0);
    let c = new Array(hiddenSize).fill(0);

    const indices = reverse
        ? Array.from({ length: sequence.length }, (_, i) => sequence.length - 1 - i)
        : Array.from({ length: sequence.length }, (_, i) => i);

    const outputs: number[][] = [];
    for (const idx of indices) {
        [h, c] = lstmStep(sequence[idx], h, c, weights, hiddenSize);
        outputs.push([...h]);
    }

    if (reverse) {
        outputs.reverse(); // Align with original time order
    }

    return returnSequences ? outputs : [outputs[outputs.length - 1]];
}

/**
 * Bidirectional LSTM layer: runs forward + backward, concatenates outputs
 */
function biLSTMLayer(
    sequence: number[][],
    config: BiLSTMLayerConfig,
    returnSequences: boolean
): number[][] {
    const units = config.units;

    // Forward pass
    const fwOutputs = runLSTM(sequence, config.forward, units, false, returnSequences);

    // Backward pass  
    const bwOutputs = runLSTM(sequence, config.backward, units, true, returnSequences);

    // Concatenate: [fw_h, bw_h] at each timestep
    const merged: number[][] = [];
    for (let t = 0; t < fwOutputs.length; t++) {
        merged.push([...fwOutputs[t], ...bwOutputs[t]]);
    }

    return merged;
}

/**
 * BatchNormalization: y = gamma * (x - mean) / sqrt(variance + epsilon) + beta
 */
function batchNormLayer(sequence: number[][], bn: BatchNormWeights): number[][] {
    const epsilon = 0.001;
    return sequence.map(x => {
        return x.map((val, i) => {
            const normalized = (val - bn.movingMean[i]) / Math.sqrt(bn.movingVariance[i] + epsilon);
            return bn.gamma[i] * normalized + bn.beta[i];
        });
    });
}

/**
 * Dense layer forward pass
 */
function denseForward(
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
        output[j] = activation === 'relu' ? relu(sum) : sum;
    }
    return activation === 'softmax' ? softmax(output) : output;
}

// ═══════════════════════════════════════════════
// Bi-LSTM Model
// ═══════════════════════════════════════════════

export class BiLSTMModel {
    private weights: BiLSTMModelWeights;

    constructor(weights: BiLSTMModelWeights) {
        this.weights = weights;
    }

    /**
     * Run Bi-LSTM inference on a sequence of feature vectors.
     * @param sequence Array of timesteps, each is a feature vector [inputSize]
     * @returns Probability array [P(UP), P(DOWN), P(NEUTRAL)]
     */
    predict(sequence: number[][]): number[] {
        let current: number[][] = sequence;

        // Process through 3 Bi-LSTM layers
        for (let l = 0; l < this.weights.biLstmLayers.length; l++) {
            const layerConfig = this.weights.biLstmLayers[l];
            const isLastLayer = (l === this.weights.biLstmLayers.length - 1);
            const returnSequences = !isLastLayer; // Only last layer returns final state

            // Bi-LSTM
            current = biLSTMLayer(current, layerConfig, returnSequences);

            // BatchNorm (if present, not on last Bi-LSTM layer)
            if (layerConfig.batchNorm) {
                current = batchNormLayer(current, layerConfig.batchNorm);
            }
        }

        // `current` is now [[concatenated_hidden_state]] (1 timestep)
        let output = current[0]; // Take the single output vector

        // Dense layers
        const denseConfigs = this.weights.denseLayers;
        for (let d = 0; d < denseConfigs.length; d++) {
            const isLast = (d === denseConfigs.length - 1);
            output = denseForward(output, denseConfigs[d], isLast ? 'softmax' : 'relu');
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
 * Extract normalized features from candles for LSTM input.
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
export function extractFeatures(candles: CandleData[], lookback: number = 60): number[][] {
    if (candles.length < lookback + 14) {
        return Array.from({ length: lookback }, () => new Array(10).fill(0));
    }

    const features: number[][] = [];
    const startIdx = candles.length - lookback;

    const closes = candles.map(c => c.close);
    const ema20 = computeEMA(closes, 20);
    const ema50 = computeEMA(closes, Math.min(50, closes.length));
    const rsiValues = computeRSISeries(candles, 14);
    const atrValues = computeATRSeries(candles, 14);
    const vwap = computeVWAP(candles);

    const volumes = candles.map(c => c.volume || 1);
    const volMean = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const volStd = Math.sqrt(volumes.reduce((a, b) => a + (b - volMean) ** 2, 0) / volumes.length) || 1;

    for (let i = startIdx; i < candles.length; i++) {
        const c = candles[i];
        const price = c.close;
        const emaVal = ema20[i] || price;
        const normClose = (price - emaVal) / (emaVal * 0.01 || 1);
        const rsi = (rsiValues[i] ?? 50) / 100;
        const vwapDist = vwap > 0 ? (price - vwap) / (vwap * 0.01) : 0;
        const atr = atrValues[i] || price * 0.005;
        const atrRatio = atr / price * 100;
        const momIdx = Math.max(0, i - 10);
        const momentum = ((price - candles[momIdx].close) / candles[momIdx].close) * 100;
        const e20 = ema20[i] || price;
        const e50 = ema50[i] || price;
        const emaCross = (e20 - e50) / (e50 * 0.01 || 1);
        const volZ = ((c.volume || 1) - volMean) / volStd;
        const range = c.high - c.low;
        const body = Math.abs(c.close - c.open);
        const bodyRatio = range > 0 ? body / range : 0;
        const hour = c.timestamp ? new Date(c.timestamp * 1000).getUTCHours() : 12;
        const hourSin = Math.sin((2 * Math.PI * hour) / 24);
        const hourCos = Math.cos((2 * Math.PI * hour) / 24);

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
    for (let i = 1; i <= period; i++) {
        const change = candles[i].close - candles[i - 1].close;
        if (change > 0) avgGain += change;
        else avgLoss += Math.abs(change);
    }
    avgGain /= period;
    avgLoss /= period;
    rsi[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
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
    const tr: number[] = [candles[0].high - candles[0].low];
    for (let i = 1; i < candles.length; i++) {
        tr.push(Math.max(
            candles[i].high - candles[i].low,
            Math.abs(candles[i].high - candles[i - 1].close),
            Math.abs(candles[i].low - candles[i - 1].close)
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
