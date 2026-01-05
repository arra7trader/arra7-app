// DOM ARRA - Order Flow Analysis Engine
// Analyzes order book data to predict buyer/seller strength

import { OrderBook, DOMPrediction, DOMSignal } from '@/types/dom';

/**
 * Analyze order book and generate prediction
 */
export function analyzeOrderFlow(orderBook: OrderBook): DOMPrediction {
    const signals: DOMSignal[] = [];

    // 1. Calculate imbalance
    const imbalance = orderBook.imbalance;

    // 2. Detect whale orders (large volumes at single price level)
    const whaleSignals = detectWhaleOrders(orderBook);
    signals.push(...whaleSignals);

    // 3. Detect absorption patterns
    const absorptionSignals = detectAbsorption(orderBook);
    signals.push(...absorptionSignals);

    // 4. Detect support/resistance levels
    const srSignals = detectSupportResistance(orderBook);
    signals.push(...srSignals);

    // 5. Calculate direction and strength
    const { direction, strength, confidence } = calculatePrediction(orderBook, signals);

    // 6. Determine whale activity level
    const whaleActivity = whaleSignals.length >= 3 ? 'HIGH' : whaleSignals.length >= 1 ? 'MEDIUM' : 'LOW';

    // 7. Generate recommendation
    const recommendation = generateRecommendation(direction, strength, imbalance, whaleActivity);

    return {
        direction,
        strength,
        confidence,
        signals,
        imbalance,
        whaleActivity,
        recommendation,
        timestamp: Date.now(),
    };
}

/**
 * Detect whale orders (unusually large volumes)
 */
function detectWhaleOrders(orderBook: OrderBook): DOMSignal[] {
    const signals: DOMSignal[] = [];

    // Calculate average volume
    const allVolumes = [...orderBook.bids, ...orderBook.asks].map(l => l.volume);
    const avgVolume = allVolumes.reduce((a, b) => a + b, 0) / allVolumes.length;
    const stdDev = Math.sqrt(allVolumes.reduce((sum, v) => sum + Math.pow(v - avgVolume, 2), 0) / allVolumes.length);

    // Whale threshold: 2x standard deviation above average
    const whaleThreshold = avgVolume + (stdDev * 2);

    // Check bids for whales
    orderBook.bids.forEach((level, i) => {
        if (level.volume > whaleThreshold) {
            signals.push({
                type: 'WHALE_BUY',
                level: level.volume > whaleThreshold * 1.5 ? 'HIGH' : 'MEDIUM',
                price: level.price,
                volume: level.volume,
                description: `Large buy wall at ${level.price.toFixed(2)} (${level.volume.toFixed(4)} volume)`,
            });
        }
    });

    // Check asks for whales
    orderBook.asks.forEach((level, i) => {
        if (level.volume > whaleThreshold) {
            signals.push({
                type: 'WHALE_SELL',
                level: level.volume > whaleThreshold * 1.5 ? 'HIGH' : 'MEDIUM',
                price: level.price,
                volume: level.volume,
                description: `Large sell wall at ${level.price.toFixed(2)} (${level.volume.toFixed(4)} volume)`,
            });
        }
    });

    return signals;
}

/**
 * Detect absorption patterns (large volume being absorbed at a level)
 */
function detectAbsorption(orderBook: OrderBook): DOMSignal[] {
    const signals: DOMSignal[] = [];

    // Check for stacked orders near best bid/ask
    const bidStack = orderBook.bids.slice(0, 3).reduce((sum, l) => sum + l.volume, 0);
    const askStack = orderBook.asks.slice(0, 3).reduce((sum, l) => sum + l.volume, 0);

    const stackRatio = bidStack / (askStack || 1);

    if (stackRatio > 2) {
        signals.push({
            type: 'ABSORPTION',
            level: stackRatio > 3 ? 'HIGH' : 'MEDIUM',
            description: `Strong bid absorption detected - buyers stacking ${stackRatio.toFixed(1)}x more than sellers`,
        });
    } else if (stackRatio < 0.5) {
        signals.push({
            type: 'ABSORPTION',
            level: stackRatio < 0.33 ? 'HIGH' : 'MEDIUM',
            description: `Strong ask absorption detected - sellers stacking ${(1 / stackRatio).toFixed(1)}x more than buyers`,
        });
    }

    return signals;
}

/**
 * Detect support and resistance levels
 */
function detectSupportResistance(orderBook: OrderBook): DOMSignal[] {
    const signals: DOMSignal[] = [];

    // Find the level with highest bid volume (potential support)
    const maxBid = orderBook.bids.reduce((max, l) => l.volume > max.volume ? l : max, orderBook.bids[0]);
    if (maxBid && maxBid.percentage > 50) {
        signals.push({
            type: 'SUPPORT',
            level: maxBid.percentage > 70 ? 'HIGH' : 'MEDIUM',
            price: maxBid.price,
            volume: maxBid.volume,
            description: `Strong support at ${maxBid.price.toFixed(2)}`,
        });
    }

    // Find the level with highest ask volume (potential resistance)
    const maxAsk = orderBook.asks.reduce((max, l) => l.volume > max.volume ? l : max, orderBook.asks[0]);
    if (maxAsk && maxAsk.percentage > 50) {
        signals.push({
            type: 'RESISTANCE',
            level: maxAsk.percentage > 70 ? 'HIGH' : 'MEDIUM',
            price: maxAsk.price,
            volume: maxAsk.volume,
            description: `Strong resistance at ${maxAsk.price.toFixed(2)}`,
        });
    }

    return signals;
}

/**
 * Calculate overall prediction
 */
function calculatePrediction(
    orderBook: OrderBook,
    signals: DOMSignal[]
): { direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; strength: number; confidence: number } {
    let score = 0;

    // Base score from imbalance
    score += orderBook.imbalance * 0.5; // -50 to +50

    // Adjust for signals
    signals.forEach(signal => {
        const multiplier = signal.level === 'HIGH' ? 15 : signal.level === 'MEDIUM' ? 10 : 5;

        switch (signal.type) {
            case 'WHALE_BUY':
                score += multiplier;
                break;
            case 'WHALE_SELL':
                score -= multiplier;
                break;
            case 'SUPPORT':
                score += multiplier * 0.5;
                break;
            case 'RESISTANCE':
                score -= multiplier * 0.5;
                break;
            case 'ABSORPTION':
                // Already factored in description
                break;
        }
    });

    // Clamp and normalize
    const normalizedScore = Math.max(-100, Math.min(100, score));

    // Determine direction
    let direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    if (normalizedScore > 15) {
        direction = 'BULLISH';
    } else if (normalizedScore < -15) {
        direction = 'BEARISH';
    } else {
        direction = 'NEUTRAL';
    }

    // Calculate strength (0-100)
    const strength = Math.abs(normalizedScore);

    // Calculate confidence based on data quality and signal count
    const signalConfidence = Math.min(signals.length * 10, 40);
    const volumeConfidence = orderBook.totalBidVolume + orderBook.totalAskVolume > 0 ? 30 : 0;
    const spreadConfidence = orderBook.spreadPercent < 0.1 ? 30 : orderBook.spreadPercent < 0.5 ? 20 : 10;
    const confidence = Math.min(signalConfidence + volumeConfidence + spreadConfidence, 100);

    return { direction, strength, confidence };
}

/**
 * Generate human-readable recommendation
 */
function generateRecommendation(
    direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL',
    strength: number,
    imbalance: number,
    whaleActivity: 'HIGH' | 'MEDIUM' | 'LOW'
): string {
    if (direction === 'NEUTRAL') {
        return 'Market seimbang - tidak ada tekanan jelas dari buyer atau seller';
    }

    const actor = direction === 'BULLISH' ? 'Buyer' : 'Seller';
    const strengthText = strength > 60 ? 'sangat kuat' : strength > 30 ? 'cukup kuat' : 'sedikit lebih aktif';
    const whaleText = whaleActivity === 'HIGH' ? ' dengan aktivitas whale tinggi' : whaleActivity === 'MEDIUM' ? ' dengan beberapa order besar' : '';

    const action = direction === 'BULLISH'
        ? 'Potensi kenaikan harga dalam waktu dekat'
        : 'Potensi penurunan harga dalam waktu dekat';

    return `${actor} ${strengthText}${whaleText}. ${action}.`;
}

/**
 * Calculate order book metrics from raw data
 */
export function calculateOrderBookMetrics(
    bids: { price: number; volume: number }[],
    asks: { price: number; volume: number }[],
    symbol: string,
    dataSource: 'REAL' | 'SIMULATED'
): OrderBook {
    // Calculate max volume for percentage
    const allVolumes = [...bids, ...asks].map(l => l.volume);
    const maxVolume = Math.max(...allVolumes, 1);

    // Calculate cumulative totals
    let bidTotal = 0;
    const processedBids = bids.map(bid => {
        bidTotal += bid.volume;
        return {
            price: bid.price,
            volume: bid.volume,
            total: bidTotal,
            percentage: (bid.volume / maxVolume) * 100,
        };
    });

    let askTotal = 0;
    const processedAsks = asks.map(ask => {
        askTotal += ask.volume;
        return {
            price: ask.price,
            volume: ask.volume,
            total: askTotal,
            percentage: (ask.volume / maxVolume) * 100,
        };
    });

    // Calculate metrics
    const bestBid = bids[0]?.price || 0;
    const bestAsk = asks[0]?.price || 0;
    const spread = bestAsk - bestBid;
    const midPrice = (bestBid + bestAsk) / 2;
    const spreadPercent = midPrice > 0 ? (spread / midPrice) * 100 : 0;

    const totalBidVolume = bidTotal;
    const totalAskVolume = askTotal;
    const totalVolume = totalBidVolume + totalAskVolume;

    // Imbalance: -100 (all sellers) to +100 (all buyers)
    const imbalance = totalVolume > 0
        ? ((totalBidVolume - totalAskVolume) / totalVolume) * 100
        : 0;

    return {
        symbol,
        bids: processedBids,
        asks: processedAsks,
        lastUpdate: Date.now(),
        spread,
        spreadPercent,
        midPrice,
        totalBidVolume,
        totalAskVolume,
        imbalance,
        dataSource,
    };
}
