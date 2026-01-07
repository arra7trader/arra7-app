// ML Prediction Types for DOM

export interface MLPrediction {
    symbol: string;
    horizon: number;
    direction: 'UP' | 'DOWN' | 'NEUTRAL';
    direction_code: -1 | 0 | 1;
    confidence: number;
    model_used: string;
    inference_time_ms?: number;
    probabilities: {
        DOWN: number;
        NEUTRAL: number;
        UP: number;
    };
    source: 'ml-backend' | 'fallback';
    timestamp: string;
}

export interface PredictionHistoryItem {
    timestamp: number;
    prediction: MLPrediction;
    actual_direction?: -1 | 0 | 1;
    is_correct?: boolean;
}

export interface PredictionStats {
    total_predictions: number;
    correct_predictions: number;
    accuracy: number;
    by_model: {
        [model: string]: {
            total: number;
            correct: number;
            accuracy: number;
        };
    };
}

// Fetch ML prediction
export async function fetchMLPrediction(
    symbol: string,
    horizon: number,
    orderbook_data: any
): Promise<MLPrediction> {
    const response = await fetch('/api/ml/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            symbol,
            horizon,
            orderbook_data
        })
    });

    if (!response.ok) {
        throw new Error('Failed to get ML prediction');
    }

    return response.json();
}

// Calculate prediction accuracy from history
export function calculateAccuracy(history: PredictionHistoryItem[]): PredictionStats {
    const completedPredictions = history.filter(h => h.actual_direction !== undefined);

    const stats: PredictionStats = {
        total_predictions: completedPredictions.length,
        correct_predictions: completedPredictions.filter(h => h.is_correct).length,
        accuracy: 0,
        by_model: {}
    };

    if (completedPredictions.length > 0) {
        stats.accuracy = stats.correct_predictions / stats.total_predictions;

        // Group by model
        completedPredictions.forEach(item => {
            const model = item.prediction.model_used;
            if (!stats.by_model[model]) {
                stats.by_model[model] = { total: 0, correct: 0, accuracy: 0 };
            }
            stats.by_model[model].total++;
            if (item.is_correct) {
                stats.by_model[model].correct++;
            }
        });

        // Calculate per-model accuracy
        Object.keys(stats.by_model).forEach(model => {
            const m = stats.by_model[model];
            m.accuracy = m.total > 0 ? m.correct / m.total : 0;
        });
    }

    return stats;
}

// Direction code to color
export function getPredictionColor(direction: 'UP' | 'DOWN' | 'NEUTRAL'): string {
    switch (direction) {
        case 'UP': return '#22c55e'; // green
        case 'DOWN': return '#ef4444'; // red
        case 'NEUTRAL': return '#f59e0b'; // amber
    }
}

// Direction to arrow
export function getPredictionArrow(direction: 'UP' | 'DOWN' | 'NEUTRAL'): string {
    switch (direction) {
        case 'UP': return '↑';
        case 'DOWN': return '↓';
        case 'NEUTRAL': return '→';
    }
}
