/**
 * Quick weight initializer - generates BiLSTM weight structure
 * WITHOUT training. Takes <2 seconds.
 * Used to create valid initial weights so code compiles.
 * Real training happens on Vercel via prebuild.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOOKBACK = 60;
const NUM_FEATURES = 10;
const OUTPUT_SIZE = 3;
const BILSTM_UNITS = [64, 32];
const DENSE_UNITS = [64, 32];

function randomMatrix(rows, cols) {
    const m = [];
    for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
            row.push((Math.random() - 0.5) * 0.1);
        }
        m.push(row);
    }
    return m;
}

function randomArray(n) {
    return Array.from({ length: n }, () => (Math.random() - 0.5) * 0.1);
}

function zerosArray(n) {
    return new Array(n).fill(0);
}

function onesArray(n) {
    return new Array(n).fill(1);
}

// Generate BiLSTM weights structure
const biLstmLayers = [];

// Layer 1: Bi-LSTM(64) → BatchNorm
// Input: 10 features, output: 128 (64*2 concat)
const inputSize1 = NUM_FEATURES;
const units1 = BILSTM_UNITS[0]; // 64
biLstmLayers.push({
    forward: {
        kernel: randomMatrix(inputSize1, units1 * 4),      // [10, 256]
        recurrentKernel: randomMatrix(units1, units1 * 4),  // [64, 256]
        bias: zerosArray(units1 * 4),                       // [256]
    },
    backward: {
        kernel: randomMatrix(inputSize1, units1 * 4),
        recurrentKernel: randomMatrix(units1, units1 * 4),
        bias: zerosArray(units1 * 4),
    },
    units: units1,
    batchNorm: {
        gamma: onesArray(units1 * 2),        // [128] (concat of fwd+bwd)
        beta: zerosArray(units1 * 2),
        movingMean: zerosArray(units1 * 2),
        movingVariance: onesArray(units1 * 2),
    },
});

// Layer 2: Bi-LSTM(32) → no BatchNorm
// Input: 128 (from layer 1 concat), output: 64 (32*2 concat)
const inputSize2 = units1 * 2; // 128
const units2 = BILSTM_UNITS[1]; // 32
biLstmLayers.push({
    forward: {
        kernel: randomMatrix(inputSize2, units2 * 4),      // [128, 128]
        recurrentKernel: randomMatrix(units2, units2 * 4),  // [32, 128]
        bias: zerosArray(units2 * 4),                       // [128]
    },
    backward: {
        kernel: randomMatrix(inputSize2, units2 * 4),
        recurrentKernel: randomMatrix(units2, units2 * 4),
        bias: zerosArray(units2 * 4),
    },
    units: units2,
});

// Dense layers
const denseLayers = [
    { kernel: randomMatrix(units2 * 2, DENSE_UNITS[0]), bias: zerosArray(DENSE_UNITS[0]) },  // [64, 64]
    { kernel: randomMatrix(DENSE_UNITS[0], DENSE_UNITS[1]), bias: zerosArray(DENSE_UNITS[1]) }, // [64, 32]
    { kernel: randomMatrix(DENSE_UNITS[1], OUTPUT_SIZE), bias: zerosArray(OUTPUT_SIZE) },       // [32, 3]
];

const modelWeights = {
    biLstmLayers,
    denseLayers,
    metadata: {
        architecture: 'Bi-LSTM',
        biLstmUnits: BILSTM_UNITS,
        denseUnits: DENSE_UNITS,
        lookback: LOOKBACK,
        inputSize: NUM_FEATURES,
        outputSize: OUTPUT_SIZE,
        trainedAt: new Date().toISOString(),
        epochs: 0,
        maxEpochs: 100,
        accuracy: 0,
        dataPoints: 0,
        totalParams: 86467,
        trainingTime: '0',
    }
};

const content = `/**
 * Bi-LSTM Model Pre-trained Weights for XAUUSD Probability Prediction
 * 
 * AUTO-GENERATED - Initial random weights
 * Will be replaced by trained weights during Vercel build (prebuild)
 * 
 * Architecture: Bi-LSTM(${BILSTM_UNITS.join('→')}) → Dense(${DENSE_UNITS.join('→')}) → Dense(3)
 * Status: INITIAL (not yet trained - will auto-train on deploy)
 */

import { BiLSTMModelWeights } from './lstm-model';

export const LSTM_WEIGHTS: BiLSTMModelWeights = ${JSON.stringify(modelWeights, null, 0)};
`;

const outputPath = path.join(__dirname, '..', 'src', 'lib', 'lstm-weights.ts');
fs.writeFileSync(outputPath, content, 'utf-8');
const fileSize = (fs.statSync(outputPath).size / 1024).toFixed(1);
console.log(`✅ Initial weights generated: ${fileSize} KB`);
console.log(`   These will be replaced by trained weights during Vercel build.`);
