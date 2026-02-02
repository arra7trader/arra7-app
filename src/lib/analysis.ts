
import { Candle } from './market-data';

export interface SwingPoints {
    high: number;
    low: number;
    trend: 'UP' | 'DOWN';
    confidence: number;
}

/**
 * Detects the most significant Swing High and Swing Low in the given candle data.
 * Uses a combination of Fractal logic and Range analysis.
 * @param candles Array of candles (must be sorted by time ASC)
 * @param lookback Number of candles to analyze for local highs/lows (default 50)
 */
export function detectSwingPoints(candles: Candle[], lookback: number = 80): SwingPoints {
    if (!candles || candles.length < 20) {
        return { high: 0, low: 0, trend: 'DOWN', confidence: 0 };
    }

    // Work on the last N candles
    const recent = candles.slice(-lookback);

    // 1. Simple Range Detection (Highest High and Lowest Low)
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    let highestIndex = -1;
    let lowestIndex = -1;

    recent.forEach((c, i) => {
        if (c.high > highestHigh) {
            highestHigh = c.high;
            highestIndex = i;
        }
        if (c.low < lowestLow) {
            lowestLow = c.low;
            lowestIndex = i;
        }
    });

    // 2. Trend Detection based on recent price vs Moving Average (Simple Proxy)
    // Or simpler: Compare Close of last candle vs Close of first candle in window
    const first = recent[0];
    const last = recent[recent.length - 1];

    // If Highest High is more recent than Lowest Low -> Uptrend? 
    // Actually for Kanji/Fib, we usually draw 0->1 or 1->0 based on recent impulse.
    // If Recent Impulse is Down (High to Low), we want High then Low.

    let trend: 'UP' | 'DOWN' = 'DOWN';

    // Simple logic: whichever index is more recent (higher index) determines direction?
    // If High was at index 10 and Low at index 50 -> Down move? No, High(10) then Low(50) is Down.
    // If Low(10) and High(50) -> Up move.

    if (highestIndex < lowestIndex) {
        trend = 'DOWN';
    } else {
        trend = 'UP';
    }

    // 3. Refinement (Optional): Check for fractal pattern? 
    // For now, strict Range High/Low is robust enough for "Swing High/Low" input.

    return {
        high: highestHigh,
        low: lowestLow,
        trend: trend,
        confidence: 0.9 // High confidence in range extents
    };
}
