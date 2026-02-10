/**
 * LSTM Training Script for XAUUSD Probability Model
 * 
 * Usage: node scripts/train-lstm.mjs
 * 
 * This script:
 * 1. Fetches 6 months of historical XAUUSD (1h) data from Yahoo Finance
 * 2. Engineers 10 features per candle (RSI, VWAP, ATR, momentum, etc.)
 * 3. Trains an LSTM model: Input(20,10) → LSTM(32) → Dense(16,relu) → Dense(3,softmax)
 * 4. Exports weights → src/lib/lstm-weights.ts
 */

import * as tf from '@tensorflow/tfjs';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════
// Config
// ═══════════════════════════════════════════════

const LOOKBACK = 20;        // Timesteps per sample
const NUM_FEATURES = 10;    // Features per timestep
const HIDDEN_SIZE = 32;     // LSTM units
const DENSE1_SIZE = 16;     // Dense layer 1
const OUTPUT_SIZE = 3;      // UP, DOWN, NEUTRAL
const EPOCHS = 40;
const BATCH_SIZE = 32;
const LEARNING_RATE = 0.001;
const THRESHOLD = 0.0015;   // 0.15% move = directional

// ═══════════════════════════════════════════════
// Data Fetching
// ═══════════════════════════════════════════════

async function fetchHistoricalData() {
    console.log('📊 Fetching 6 months of XAUUSD 1H data from Yahoo Finance...');

    const now = Math.floor(Date.now() / 1000);
    const sixMonthsAgo = now - (180 * 24 * 60 * 60);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/GC=F?period1=${sixMonthsAgo}&period2=${now}&interval=1h`;

    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    });

    if (!response.ok) {
        throw new Error(`Yahoo API error: ${response.status}`);
    }

    const json = await response.json();
    const result = json.chart.result[0];
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];

    const candles = [];
    for (let i = 0; i < timestamps.length; i++) {
        if (quotes.open[i] && quotes.high[i] && quotes.low[i] && quotes.close[i]) {
            candles.push({
                timestamp: timestamps[i],
                open: quotes.open[i],
                high: quotes.high[i],
                low: quotes.low[i],
                close: quotes.close[i],
                volume: quotes.volume[i] || 0,
            });
        }
    }

    console.log(`✅ Fetched ${candles.length} valid candles`);
    return candles;
}

// ═══════════════════════════════════════════════
// Feature Engineering (mirrors lstm-model.ts)
// ═══════════════════════════════════════════════

function computeEMA(values, period) {
    const k = 2 / (period + 1);
    const ema = [values[0]];
    for (let i = 1; i < values.length; i++) {
        ema.push(values[i] * k + ema[i - 1] * (1 - k));
    }
    return ema;
}

function computeRSISeries(candles, period) {
    const rsi = new Array(candles.length).fill(50);
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

function computeATRSeries(candles, period) {
    const atr = new Array(candles.length).fill(0);
    if (candles.length < 2) return atr;
    const tr = [candles[0].high - candles[0].low];
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

function computeVWAP(candles) {
    let cumTPV = 0, cumVol = 0;
    for (const c of candles) {
        const tp = (c.high + c.low + c.close) / 3;
        const vol = c.volume || 1;
        cumTPV += tp * vol;
        cumVol += vol;
    }
    return cumVol > 0 ? cumTPV / cumVol : 0;
}

function clip(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

function extractAllFeatures(candles) {
    const closes = candles.map(c => c.close);
    const ema20 = computeEMA(closes, 20);
    const ema50 = computeEMA(closes, Math.min(50, closes.length));
    const rsiValues = computeRSISeries(candles, 14);
    const atrValues = computeATRSeries(candles, 14);
    const vwap = computeVWAP(candles);
    const volumes = candles.map(c => c.volume || 1);
    const volMean = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const volStd = Math.sqrt(volumes.reduce((a, b) => a + (b - volMean) ** 2, 0) / volumes.length) || 1;

    const features = [];
    for (let i = 0; i < candles.length; i++) {
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
        const hour = new Date(c.timestamp * 1000).getUTCHours();
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
// Dataset Preparation
// ═══════════════════════════════════════════════

function createDataset(candles, features) {
    const X = [];
    const Y = [];

    for (let i = LOOKBACK; i < candles.length - 1; i++) {
        // Input: lookback window of features
        const window = features.slice(i - LOOKBACK, i);
        X.push(window);

        // Label: next candle direction
        const nextCandle = candles[i + 1];
        const currentClose = candles[i].close;
        const change = (nextCandle.close - currentClose) / currentClose;

        if (change > THRESHOLD) {
            Y.push([1, 0, 0]); // UP
        } else if (change < -THRESHOLD) {
            Y.push([0, 1, 0]); // DOWN
        } else {
            Y.push([0, 0, 1]); // NEUTRAL
        }
    }

    console.log(`📦 Dataset: ${X.length} samples`);
    const classCounts = Y.reduce((acc, y) => {
        acc[0] += y[0]; acc[1] += y[1]; acc[2] += y[2];
        return acc;
    }, [0, 0, 0]);
    console.log(`   UP: ${classCounts[0]}, DOWN: ${classCounts[1]}, NEUTRAL: ${classCounts[2]}`);

    return { X, Y };
}

// ═══════════════════════════════════════════════
// Model Building & Training
// ═══════════════════════════════════════════════

async function trainModel(X, Y) {
    console.log('\n🧠 Building LSTM model...');

    const model = tf.sequential();

    model.add(tf.layers.lstm({
        units: HIDDEN_SIZE,
        inputShape: [LOOKBACK, NUM_FEATURES],
        returnSequences: false,
    }));

    model.add(tf.layers.dense({
        units: DENSE1_SIZE,
        activation: 'relu',
    }));

    model.add(tf.layers.dense({
        units: OUTPUT_SIZE,
        activation: 'softmax',
    }));

    model.compile({
        optimizer: tf.train.adam(LEARNING_RATE),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy'],
    });

    model.summary();

    // Split into train/val (80/20)
    const splitIdx = Math.floor(X.length * 0.8);
    const xTrain = tf.tensor3d(X.slice(0, splitIdx));
    const yTrain = tf.tensor2d(Y.slice(0, splitIdx));
    const xVal = tf.tensor3d(X.slice(splitIdx));
    const yVal = tf.tensor2d(Y.slice(splitIdx));

    console.log(`\n🏋️ Training for ${EPOCHS} epochs...`);
    console.log(`   Train: ${splitIdx} samples, Val: ${X.length - splitIdx} samples\n`);

    const history = await model.fit(xTrain, yTrain, {
        epochs: EPOCHS,
        batchSize: BATCH_SIZE,
        validationData: [xVal, yVal],
        callbacks: {
            onEpochEnd: (epoch, logs) => {
                if ((epoch + 1) % 5 === 0 || epoch === 0) {
                    console.log(
                        `   Epoch ${String(epoch + 1).padStart(2)}: ` +
                        `loss=${logs.loss.toFixed(4)} acc=${logs.acc.toFixed(4)} ` +
                        `val_loss=${logs.val_loss.toFixed(4)} val_acc=${logs.val_acc.toFixed(4)}`
                    );
                }
            }
        }
    });

    // Final accuracy
    const finalAcc = history.history.val_acc[history.history.val_acc.length - 1];
    console.log(`\n✅ Training complete. Final val_acc: ${(finalAcc * 100).toFixed(1)}%`);

    // Cleanup tensors
    xTrain.dispose();
    yTrain.dispose();
    xVal.dispose();
    yVal.dispose();

    return { model, accuracy: finalAcc, trainSamples: splitIdx };
}

// ═══════════════════════════════════════════════
// Weight Extraction & Export
// ═══════════════════════════════════════════════

function extractWeights(model) {
    const weights = model.getWeights();

    // LSTM layer weights (3 tensors: kernel, recurrent_kernel, bias)
    const lstmKernel = Array.from(weights[0].dataSync());
    const lstmKernelShape = weights[0].shape; // [input_size, 4*hidden_size]

    const lstmRecKernel = Array.from(weights[1].dataSync());
    const lstmRecShape = weights[1].shape; // [hidden_size, 4*hidden_size]

    const lstmBias = Array.from(weights[2].dataSync());

    // Dense 1 weights (2 tensors: kernel, bias)
    const dense1Kernel = Array.from(weights[3].dataSync());
    const dense1Shape = weights[3].shape;
    const dense1Bias = Array.from(weights[4].dataSync());

    // Dense 2 weights (2 tensors: kernel, bias)
    const dense2Kernel = Array.from(weights[5].dataSync());
    const dense2Shape = weights[5].shape;
    const dense2Bias = Array.from(weights[6].dataSync());

    // Reshape flat arrays to 2D matrices
    function reshape2D(flat, rows, cols) {
        const matrix = [];
        for (let r = 0; r < rows; r++) {
            matrix.push(flat.slice(r * cols, (r + 1) * cols));
        }
        return matrix;
    }

    return {
        lstm: {
            kernel: reshape2D(lstmKernel, lstmKernelShape[0], lstmKernelShape[1]),
            recurrentKernel: reshape2D(lstmRecKernel, lstmRecShape[0], lstmRecShape[1]),
            bias: lstmBias,
        },
        dense1: {
            kernel: reshape2D(dense1Kernel, dense1Shape[0], dense1Shape[1]),
            bias: dense1Bias,
        },
        dense2: {
            kernel: reshape2D(dense2Kernel, dense2Shape[0], dense2Shape[1]),
            bias: dense2Bias,
        }
    };
}

function exportWeights(weights, accuracy, dataPoints) {
    const outputPath = path.join(__dirname, '..', 'src', 'lib', 'lstm-weights.ts');

    const modelWeights = {
        lstm: weights.lstm,
        dense1: weights.dense1,
        dense2: weights.dense2,
        metadata: {
            inputSize: NUM_FEATURES,
            hiddenSize: HIDDEN_SIZE,
            dense1Size: DENSE1_SIZE,
            outputSize: OUTPUT_SIZE,
            trainedAt: new Date().toISOString(),
            epochs: EPOCHS,
            accuracy: accuracy,
            dataPoints: dataPoints,
        }
    };

    const content = `/**
 * LSTM Model Pre-trained Weights for XAUUSD Probability Prediction
 * 
 * AUTO-GENERATED by scripts/train-lstm.mjs
 * DO NOT EDIT MANUALLY
 * 
 * Model: Input(${LOOKBACK},${NUM_FEATURES}) → LSTM(${HIDDEN_SIZE}) → Dense(${DENSE1_SIZE},relu) → Dense(${OUTPUT_SIZE},softmax)
 * Trained: ${new Date().toISOString()}
 * Accuracy: ${(accuracy * 100).toFixed(1)}%
 * Data: ${dataPoints} XAUUSD 1H candles (6 months)
 */

import { ModelWeights } from './lstm-model';

export const LSTM_WEIGHTS: ModelWeights = ${JSON.stringify(modelWeights, null, 0)};
`;

    fs.writeFileSync(outputPath, content, 'utf-8');
    console.log(`\n💾 Weights exported to: ${outputPath}`);
    console.log(`   File size: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);
}

// ═══════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════

async function main() {
    console.log('═══════════════════════════════════════════');
    console.log('  XAUUSD LSTM Model Training Pipeline');
    console.log('═══════════════════════════════════════════\n');

    try {
        // 1. Fetch data
        const candles = await fetchHistoricalData();

        // 2. Extract features
        console.log('\n🔧 Engineering features...');
        const features = extractAllFeatures(candles);
        console.log(`✅ ${features.length} feature vectors (${NUM_FEATURES} features each)`);

        // 3. Create dataset
        const { X, Y } = createDataset(candles, features);

        // 4. Train model
        const { model, accuracy, trainSamples } = await trainModel(X, Y);

        // 5. Extract and export weights
        console.log('\n📤 Extracting weights...');
        const weights = extractWeights(model);
        exportWeights(weights, accuracy, candles.length);

        console.log('\n═══════════════════════════════════════════');
        console.log('  ✅ TRAINING COMPLETE');
        console.log(`  Model accuracy: ${(accuracy * 100).toFixed(1)}%`);
        console.log(`  Weights saved to: src/lib/lstm-weights.ts`);
        console.log('═══════════════════════════════════════════\n');

        // Cleanup
        model.dispose();

    } catch (error) {
        console.error('❌ Training failed:', error);
        process.exit(1);
    }
}

main();
