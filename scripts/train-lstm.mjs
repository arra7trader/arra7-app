/**
 * Bi-LSTM Training Script for XAUUSD Probability Model
 * 
 * Runs automatically during `npm run build` (prebuild hook)
 * Each deployment gets a freshly trained model with latest market data.
 * 
 * Architecture (optimized for build-time, based on proven CRYPTOLOGIC V1):
 *   Bi-LSTM(64) → Dropout(0.3) → BatchNorm
 *   Bi-LSTM(32) → Dropout(0.3)
 *   Dense(64, relu) → Dropout(0.2) → Dense(32, relu) → Dense(3, softmax)
 * 
 * ~50K parameters, trains in ~2-3 minutes on build server
 */

import * as tf from '@tensorflow/tfjs';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════
// Config — Optimized for build-time training
// ═══════════════════════════════════════════════

const LOOKBACK = 60;         // 60 timesteps lookback (proven)
const NUM_FEATURES = 10;     // Features per timestep
const OUTPUT_SIZE = 3;       // UP, DOWN, NEUTRAL
const EPOCHS = 100;          // Max epochs (early stopping will cut short)
const BATCH_SIZE = 32;
const LEARNING_RATE = 0.001;
const THRESHOLD = 0.0015;    // 0.15% move = directional
const PATIENCE = 30;         // Early stopping patience

// Bi-LSTM layer sizes (lighter for fast training)
const BILSTM_UNITS = [64, 32];       // 2 stacked Bi-LSTM layers
const DENSE_UNITS = [64, 32];        // Dense layers before output

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
        const window = features.slice(i - LOOKBACK, i);
        X.push(window);

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
// Model Building — Optimized Bi-LSTM for Build-Time
// ═══════════════════════════════════════════════

async function trainModel(X, Y) {
    console.log('\n🧠 Building Bi-LSTM model (optimized for auto-training)...');
    console.log(`   Architecture: Bi-LSTM(${BILSTM_UNITS.join('→')}) → Dense(${DENSE_UNITS.join('→')}) → Dense(3)`);

    const model = tf.sequential();

    // Layer 1: Bidirectional LSTM (64 units per direction = 128 output)
    model.add(tf.layers.bidirectional({
        layer: tf.layers.lstm({ units: BILSTM_UNITS[0], returnSequences: true }),
        inputShape: [LOOKBACK, NUM_FEATURES],
        mergeMode: 'concat',
    }));
    model.add(tf.layers.dropout({ rate: 0.3 }));
    model.add(tf.layers.batchNormalization());

    // Layer 2: Bidirectional LSTM (32 units per direction = 64 output)
    model.add(tf.layers.bidirectional({
        layer: tf.layers.lstm({ units: BILSTM_UNITS[1], returnSequences: false }),
        mergeMode: 'concat',
    }));
    model.add(tf.layers.dropout({ rate: 0.3 }));

    // Dense layers
    model.add(tf.layers.dense({ units: DENSE_UNITS[0], activation: 'relu' }));
    model.add(tf.layers.dropout({ rate: 0.2 }));
    model.add(tf.layers.dense({ units: DENSE_UNITS[1], activation: 'relu' }));
    model.add(tf.layers.dense({ units: OUTPUT_SIZE, activation: 'softmax' }));

    model.compile({
        optimizer: tf.train.adam(LEARNING_RATE),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy'],
    });

    model.summary();

    const totalParams = model.countParams();
    console.log(`\n📐 Total parameters: ${totalParams.toLocaleString()}`);

    // Split into train/val (80/20)
    const splitIdx = Math.floor(X.length * 0.8);
    const xTrain = tf.tensor3d(X.slice(0, splitIdx));
    const yTrain = tf.tensor2d(Y.slice(0, splitIdx));
    const xVal = tf.tensor3d(X.slice(splitIdx));
    const yVal = tf.tensor2d(Y.slice(splitIdx));

    console.log(`\n🏋️ Training for up to ${EPOCHS} epochs (EarlyStopping patience=${PATIENCE})...`);
    console.log(`   Train: ${splitIdx} samples, Val: ${X.length - splitIdx} samples\n`);

    let bestValLoss = Infinity;
    let patienceCounter = 0;
    let bestEpoch = 0;
    const startTime = Date.now();

    const history = await model.fit(xTrain, yTrain, {
        epochs: EPOCHS,
        batchSize: BATCH_SIZE,
        validationData: [xVal, yVal],
        callbacks: {
            onEpochEnd: (epoch, logs) => {
                if ((epoch + 1) % 10 === 0 || epoch === 0 || (epoch + 1) === EPOCHS) {
                    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
                    console.log(
                        `   Epoch ${String(epoch + 1).padStart(3)}: ` +
                        `loss=${logs.loss.toFixed(4)} acc=${logs.acc.toFixed(4)} ` +
                        `val_loss=${logs.val_loss.toFixed(4)} val_acc=${logs.val_acc.toFixed(4)} ` +
                        `[${elapsed}s]`
                    );
                }

                // Manual early stopping
                if (logs.val_loss < bestValLoss) {
                    bestValLoss = logs.val_loss;
                    bestEpoch = epoch + 1;
                    patienceCounter = 0;
                } else {
                    patienceCounter++;
                }

                if (patienceCounter >= PATIENCE) {
                    console.log(`\n   ⚡ Early stopping at epoch ${epoch + 1} (best: epoch ${bestEpoch})`);
                    model.stopTraining = true;
                }
            }
        }
    });

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const finalAcc = history.history.val_acc[history.history.val_acc.length - 1];
    const epochsTrained = history.history.loss.length;

    console.log(`\n✅ Training complete in ${totalTime}s`);
    console.log(`   Epochs: ${epochsTrained}/${EPOCHS} | Best val_loss: ${bestValLoss.toFixed(4)} (epoch ${bestEpoch})`);
    console.log(`   Final val_acc: ${(finalAcc * 100).toFixed(1)}%`);

    xTrain.dispose();
    yTrain.dispose();
    xVal.dispose();
    yVal.dispose();

    return { model, accuracy: finalAcc, trainSamples: splitIdx, totalParams, epochsTrained, trainingTime: totalTime };
}

// ═══════════════════════════════════════════════
// Weight Extraction & Export
// ═══════════════════════════════════════════════

function extractWeights(model) {
    const allWeights = model.getWeights();

    console.log(`\n📦 Extracting ${allWeights.length} weight tensors...`);

    function reshape2D(flat, rows, cols) {
        const matrix = [];
        for (let r = 0; r < rows; r++) {
            matrix.push(Array.from(flat.slice(r * cols, (r + 1) * cols)));
        }
        return matrix;
    }

    function extractTensor(tensor) {
        return Array.from(tensor.dataSync());
    }

    let idx = 0;
    const biLstmLayers = [];

    for (let l = 0; l < BILSTM_UNITS.length; l++) {
        // Forward LSTM: kernel, recurrent_kernel, bias
        const fwKernel = extractTensor(allWeights[idx]);
        const fwKernelShape = allWeights[idx].shape;
        idx++;
        const fwRecKernel = extractTensor(allWeights[idx]);
        const fwRecShape = allWeights[idx].shape;
        idx++;
        const fwBias = extractTensor(allWeights[idx]);
        idx++;

        // Backward LSTM: kernel, recurrent_kernel, bias
        const bwKernel = extractTensor(allWeights[idx]);
        const bwKernelShape = allWeights[idx].shape;
        idx++;
        const bwRecKernel = extractTensor(allWeights[idx]);
        const bwRecShape = allWeights[idx].shape;
        idx++;
        const bwBias = extractTensor(allWeights[idx]);
        idx++;

        const layer = {
            forward: {
                kernel: reshape2D(fwKernel, fwKernelShape[0], fwKernelShape[1]),
                recurrentKernel: reshape2D(fwRecKernel, fwRecShape[0], fwRecShape[1]),
                bias: Array.from(fwBias),
            },
            backward: {
                kernel: reshape2D(bwKernel, bwKernelShape[0], bwKernelShape[1]),
                recurrentKernel: reshape2D(bwRecKernel, bwRecShape[0], bwRecShape[1]),
                bias: Array.from(bwBias),
            },
            units: BILSTM_UNITS[l],
        };

        // BatchNorm only on first layer (layer 2 has no BatchNorm)
        if (l === 0) {
            const gamma = extractTensor(allWeights[idx++]);
            const beta = extractTensor(allWeights[idx++]);
            const movingMean = extractTensor(allWeights[idx++]);
            const movingVariance = extractTensor(allWeights[idx++]);
            layer.batchNorm = {
                gamma: Array.from(gamma),
                beta: Array.from(beta),
                movingMean: Array.from(movingMean),
                movingVariance: Array.from(movingVariance),
            };
        }

        biLstmLayers.push(layer);
    }

    // Dense layers
    const denseLayers = [];
    while (idx < allWeights.length) {
        const kernel = extractTensor(allWeights[idx]);
        const kernelShape = allWeights[idx].shape;
        idx++;
        const bias = extractTensor(allWeights[idx]);
        idx++;
        denseLayers.push({
            kernel: reshape2D(kernel, kernelShape[0], kernelShape[1]),
            bias: Array.from(bias),
        });
    }

    return { biLstmLayers, denseLayers };
}

function exportWeights(weights, accuracy, dataPoints, totalParams, epochsTrained, trainingTime) {
    const outputPath = path.join(__dirname, '..', 'src', 'lib', 'lstm-weights.ts');

    const modelWeights = {
        biLstmLayers: weights.biLstmLayers,
        denseLayers: weights.denseLayers,
        metadata: {
            architecture: 'Bi-LSTM',
            biLstmUnits: BILSTM_UNITS,
            denseUnits: DENSE_UNITS,
            lookback: LOOKBACK,
            inputSize: NUM_FEATURES,
            outputSize: OUTPUT_SIZE,
            trainedAt: new Date().toISOString(),
            epochs: epochsTrained,
            maxEpochs: EPOCHS,
            accuracy: accuracy,
            dataPoints: dataPoints,
            totalParams: totalParams,
            trainingTime: trainingTime,
        }
    };

    const content = `/**
 * Bi-LSTM Model Pre-trained Weights for XAUUSD Probability Prediction
 * 
 * AUTO-GENERATED by scripts/train-lstm.mjs during build
 * DO NOT EDIT MANUALLY
 * 
 * Architecture: Bi-LSTM(${BILSTM_UNITS.join('→')}) → Dense(${DENSE_UNITS.join('→')}) → Dense(3)
 * Lookback: ${LOOKBACK} timesteps, Features: ${NUM_FEATURES}
 * Trained: ${new Date().toISOString()}
 * Epochs: ${epochsTrained}/${EPOCHS} (EarlyStopping patience=${PATIENCE})
 * Accuracy: ${(accuracy * 100).toFixed(1)}%
 * Parameters: ${totalParams.toLocaleString()}
 * Training time: ${trainingTime}s
 * Data: ${dataPoints} XAUUSD 1H candles (6 months)
 */

import { BiLSTMModelWeights } from './lstm-model';

export const LSTM_WEIGHTS: BiLSTMModelWeights = ${JSON.stringify(modelWeights, null, 0)};
`;

    fs.writeFileSync(outputPath, content, 'utf-8');
    const fileSize = (fs.statSync(outputPath).size / 1024).toFixed(1);
    console.log(`\n💾 Weights exported to: ${outputPath}`);
    console.log(`   File size: ${fileSize} KB`);
}

// ═══════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════

async function main() {
    console.log('═══════════════════════════════════════════');
    console.log('  XAUUSD Bi-LSTM Auto-Training Pipeline');
    console.log('  (Runs automatically during build/deploy)');
    console.log('═══════════════════════════════════════════\n');

    try {
        const candles = await fetchHistoricalData();

        console.log('\n🔧 Engineering features...');
        const features = extractAllFeatures(candles);
        console.log(`✅ ${features.length} feature vectors (${NUM_FEATURES} features each)`);

        const { X, Y } = createDataset(candles, features);

        const { model, accuracy, trainSamples, totalParams, epochsTrained, trainingTime } = await trainModel(X, Y);

        console.log('\n📤 Extracting Bi-LSTM weights...');
        const weights = extractWeights(model);
        exportWeights(weights, accuracy, candles.length, totalParams, epochsTrained, trainingTime);

        console.log('\n═══════════════════════════════════════════');
        console.log('  ✅ AUTO-TRAINING COMPLETE');
        console.log(`  Architecture: Bi-LSTM(${BILSTM_UNITS.join('→')})`);
        console.log(`  Parameters: ${totalParams.toLocaleString()}`);
        console.log(`  Epochs: ${epochsTrained}/${EPOCHS}`);
        console.log(`  Accuracy: ${(accuracy * 100).toFixed(1)}%`);
        console.log(`  Training time: ${trainingTime}s`);
        console.log('═══════════════════════════════════════════\n');

        model.dispose();

    } catch (error) {
        console.error('❌ Training failed:', error.message);
        console.log('⚠️  Using existing weights file (if available)');
        // Don't exit with error - build should continue with existing weights
    }
}

main();
