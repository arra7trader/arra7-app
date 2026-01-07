import { getMLConfig } from './turso';

// === Interfaces ===

export interface OrderBookData {
    midPrice: number;
    spread: number;
    spreadPercent: number;
    totalBidVolume: number;
    totalAskVolume: number;
    imbalance: number;
    bids: Array<{ price: number; volume: number }>;
    asks: Array<{ price: number; volume: number }>;
}

export interface TradeSetup {
    action: 'LONG' | 'SHORT' | 'WAIT';
    entry: number;
    tp: number;
    sl: number;
    riskRewardRatio: number;
    quality: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface SignalResult {
    name: string;
    value: number;
    signal: -1 | 0 | 1;
    weight: number;
}

export interface PredictionResult {
    direction: 'UP' | 'DOWN' | 'NEUTRAL';
    direction_code: -1 | 0 | 1;
    confidence: number;
    signals: SignalResult[];
    model_used: string;
    probabilities: { UP: number; DOWN: number; NEUTRAL: number };
    tradeSetup?: TradeSetup;
}

export interface PriceHistory {
    price: number;
    timestamp: number;
    volume?: number;
}

interface SignalWeights {
    [key: string]: number;
}

// === Constants & State ===

const DEFAULT_WEIGHTS: SignalWeights = {
    'Order Book Imbalance': 0.25,
    'Volume Concentration': 0.15,
    'Spread Analysis': 0.10,
    'Depth Ratio': 0.15,
    'Price Momentum': 0.15,
    'VWAP Deviation': 0.10,
    'Liquidity Wall': 0.05,
    'Volatility Factor': 0.05
};

// Price history cache (in-memory, per edge function instance)
const priceHistoryCache: Map<string, PriceHistory[]> = new Map();
const MAX_HISTORY = 60; // Keep 60 data points

/**
 * Update price history for a symbol
 */
export function updatePriceHistory(symbol: string, price: number, volume?: number) {
    const history = priceHistoryCache.get(symbol) || [];
    history.push({ price, timestamp: Date.now(), volume });

    // Keep only last MAX_HISTORY entries
    if (history.length > MAX_HISTORY) {
        history.shift();
    }
    priceHistoryCache.set(symbol, history);
}

// === Helper Functions ===

function calculateMomentum(history: PriceHistory[]): { momentum: number; roc: number } {
    if (history.length < 5) {
        return { momentum: 0, roc: 0 };
    }

    const current = history[history.length - 1].price;
    const prev5 = history[history.length - 5].price;

    const roc = ((current - prev5) / prev5) * 10000; // Rate of change in bps
    const momentum = roc > 0 ? 1 : roc < 0 ? -1 : 0;

    return { momentum, roc };
}

function calculateVolatility(history: PriceHistory[]): number {
    if (history.length < 5) return 0;

    const returns: number[] = [];
    for (let i = 1; i < history.length; i++) {
        returns.push((history[i].price - history[i - 1].price) / history[i - 1].price);
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;

    return Math.sqrt(variance) * 10000; // In bps
}

function calculateVwapDeviation(history: PriceHistory[], currentPrice: number): number {
    if (history.length < 3) return 0;

    let totalValue = 0;
    let totalVolume = 0;

    for (const h of history) {
        const vol = h.volume || 1;
        totalValue += h.price * vol;
        totalVolume += vol;
    }

    const vwap = totalValue / totalVolume;
    return ((currentPrice - vwap) / vwap) * 10000; // Deviation in bps
}

// === SmartPredictor Class ===

export class SmartPredictor {
    private symbol: string;
    private horizon: number;
    private weights: SignalWeights;

    constructor(symbol: string, horizon: number = 10) {
        this.symbol = symbol;
        this.horizon = horizon;
        this.weights = { ...DEFAULT_WEIGHTS };

        // Async load dynamic weights (fire and forget update)
        this.loadDynamicWeights();
    }

    private async loadDynamicWeights() {
        try {
            const config = await getMLConfig('smart_predictor_weights');
            if (config) {
                this.weights = { ...this.weights, ...config };
            }
        } catch (e) {
            // Fallback to default silently
        }
    }

    /**
     * Generate prediction from order book data
     */
    public predict(orderBook: OrderBookData): PredictionResult {
        const signals: SignalResult[] = [];
        const history = priceHistoryCache.get(this.symbol) || [];

        // Update price history
        updatePriceHistory(this.symbol, orderBook.midPrice);

        // === Signal 1: Order Book Imbalance ===
        const imbalanceSignal = this.calculateImbalanceSignal(orderBook.imbalance);
        signals.push({
            name: 'Order Book Imbalance',
            value: orderBook.imbalance,
            signal: imbalanceSignal,
            weight: this.weights['Order Book Imbalance']
        });

        // === Signal 2: Volume Concentration ===
        const volumeConcentration = this.calculateVolumeConcentration(orderBook);
        signals.push({
            name: 'Volume Concentration',
            value: volumeConcentration.value,
            signal: volumeConcentration.signal,
            weight: this.weights['Volume Concentration']
        });

        // === Signal 3: Spread Analysis ===
        const spreadSignal = this.analyzeSpread(orderBook.spreadPercent);
        signals.push({
            name: 'Spread Analysis',
            value: orderBook.spreadPercent * 100,
            signal: spreadSignal.signal,
            weight: this.weights['Spread Analysis']
        });

        // === Signal 4: Depth Ratio ===
        const depthRatio = this.calculateDepthRatio(orderBook);
        signals.push({
            name: 'Depth Ratio',
            value: depthRatio.value,
            signal: depthRatio.signal,
            weight: this.weights['Depth Ratio']
        });

        // === Signal 5: Momentum ===
        const { momentum, roc } = calculateMomentum(history);
        signals.push({
            name: 'Price Momentum',
            value: roc,
            signal: momentum as -1 | 0 | 1,
            weight: this.weights['Price Momentum']
        });

        // === Signal 6: VWAP Deviation ===
        const vwapDev = calculateVwapDeviation(history, orderBook.midPrice);
        const vwapSignal: -1 | 0 | 1 = vwapDev > 5 ? -1 : vwapDev < -5 ? 1 : 0; // Mean reversion
        signals.push({
            name: 'VWAP Deviation',
            value: vwapDev,
            signal: vwapSignal,
            weight: this.weights['VWAP Deviation']
        });

        // === Signal 7: Liquidity Wall Detection ===
        const liquidityWall = this.detectLiquidityWall(orderBook);
        signals.push({
            name: 'Liquidity Wall',
            value: liquidityWall.strength,
            signal: liquidityWall.signal,
            weight: this.weights['Liquidity Wall']
        });

        // === Signal 8: Volatility Adjustment ===
        const volatility = calculateVolatility(history);
        const volSignal: -1 | 0 | 1 = volatility > 20 ? 0 : imbalanceSignal; // High vol = uncertain
        signals.push({
            name: 'Volatility Factor',
            value: volatility,
            signal: volSignal,
            weight: this.weights['Volatility Factor']
        });

        // === Aggregate Signals ===
        let weightedSum = 0;
        let totalWeight = 0;

        for (const s of signals) {
            weightedSum += s.signal * s.weight;
            totalWeight += s.weight;
        }

        const aggregateScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

        // Determine direction
        let direction: 'UP' | 'DOWN' | 'NEUTRAL';
        let direction_code: -1 | 0 | 1;

        if (aggregateScore > 0.2) {
            direction = 'UP';
            direction_code = 1;
        } else if (aggregateScore < -0.2) {
            direction = 'DOWN';
            direction_code = -1;
        } else {
            direction = 'NEUTRAL';
            direction_code = 0;
        }

        // Calculate confidence
        const signalAgreement = this.calculateSignalAgreement(signals);
        const baseConfidence = Math.abs(aggregateScore);
        const confidence = Math.min(0.45 + baseConfidence * 0.45 + signalAgreement * 0.1, 0.92);

        // Calculate probabilities
        const probabilities = this.calculateProbabilities(aggregateScore, confidence);

        const result: PredictionResult = {
            direction,
            direction_code,
            confidence: Math.round(confidence * 100) / 100,
            signals,
            model_used: 'smart-predictor-v1-adaptive',
            probabilities,
            tradeSetup: {
                action: 'WAIT',
                entry: 0, tp: 0, sl: 0, riskRewardRatio: 0, quality: 'LOW'
            }
        };

        // Generate Trade Setup if confidence is sufficient
        if (confidence > 0.60 && direction !== 'NEUTRAL') {
            result.tradeSetup = this.calculateTradeSetup(orderBook.midPrice, direction, confidence, history);
        }

        return result;
    }

    public calculateTradeSetup(
        currentPrice: number,
        direction: 'UP' | 'DOWN',
        confidence: number,
        history: PriceHistory[] = []
    ): TradeSetup {
        // If history is not provided, try to get it from cache
        if (history.length === 0) {
            history = priceHistoryCache.get(this.symbol) || [];
        }

        // 1. Calculate Volatility (Simple ATR approximation)
        let volatility = currentPrice * 0.002;

        if (history.length > 10) {
            const high = Math.max(...history.slice(-10).map(h => h.price));
            const low = Math.min(...history.slice(-10).map(h => h.price));
            const range = high - low;
            if (range > 0) volatility = range;
        }

        // 2. Define Risk Parameters
        const riskUnit = volatility * 1.2;
        const rewardUnit = volatility * 2.0;

        let tp, sl;

        if (direction === 'UP') {
            tp = currentPrice + rewardUnit;
            sl = currentPrice - riskUnit;
        } else {
            tp = currentPrice - rewardUnit;
            sl = currentPrice + riskUnit;
        }

        const rr = rewardUnit / riskUnit;

        // 3. Determine Quality
        let quality: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
        if (confidence > 0.75) quality = 'HIGH';
        else if (confidence > 0.65) quality = 'MEDIUM';

        return {
            action: direction === 'UP' ? 'LONG' : 'SHORT',
            entry: currentPrice,
            tp: Number(tp.toFixed(2)),
            sl: Number(sl.toFixed(2)),
            riskRewardRatio: Number(rr.toFixed(2)),
            quality
        };
    }

    private calculateImbalanceSignal(imbalance: number): -1 | 0 | 1 {
        if (imbalance > 15) return 1;
        if (imbalance < -15) return -1;
        return 0;
    }

    private calculateVolumeConcentration(orderBook: OrderBookData): { value: number; signal: -1 | 0 | 1 } {
        const bidL1Vol = orderBook.bids[0]?.volume || 0;
        const askL1Vol = orderBook.asks[0]?.volume || 0;
        const totalBid = orderBook.totalBidVolume || 1;
        const totalAsk = orderBook.totalAskVolume || 1;

        const bidConcentration = (bidL1Vol / totalBid) * 100;
        const askConcentration = (askL1Vol / totalAsk) * 100;

        const diff = bidConcentration - askConcentration;

        return {
            value: diff,
            signal: diff > 10 ? 1 : diff < -10 ? -1 : 0
        };
    }

    private analyzeSpread(spreadPercent: number): { signal: -1 | 0 | 1 } {
        // Wide spread = uncertainty, narrow = confidence
        const spreadBps = spreadPercent * 100;
        return { signal: spreadBps > 10 ? 0 : spreadBps < 2 ? 0 : 0 }; // Neutral for spread
    }

    private calculateDepthRatio(orderBook: OrderBookData): { value: number; signal: -1 | 0 | 1 } {
        const totalBid = orderBook.totalBidVolume || 1;
        const totalAsk = orderBook.totalAskVolume || 1;
        const ratio = totalBid / totalAsk;

        return {
            value: ratio,
            signal: ratio > 1.2 ? 1 : ratio < 0.8 ? -1 : 0
        };
    }

    private detectLiquidityWall(orderBook: OrderBookData): { strength: number; signal: -1 | 0 | 1 } {
        // Find large walls in first 5 levels
        const bids = orderBook.bids || [];
        const asks = orderBook.asks || [];

        let maxBidRatio = 0;
        let maxAskRatio = 0;

        const avgBid = orderBook.totalBidVolume / Math.max(bids.length, 1);
        const avgAsk = orderBook.totalAskVolume / Math.max(asks.length, 1);

        for (const bid of bids.slice(0, 5)) {
            if (bid.volume > avgBid * 2) {
                maxBidRatio = Math.max(maxBidRatio, bid.volume / avgBid);
            }
        }

        for (const ask of asks.slice(0, 5)) {
            if (ask.volume > avgAsk * 2) {
                maxAskRatio = Math.max(maxAskRatio, ask.volume / avgAsk);
            }
        }

        // Wall on bid side = support = UP, wall on ask side = resistance = DOWN
        const strength = Math.max(maxBidRatio, maxAskRatio);
        let signal: -1 | 0 | 1 = 0;

        if (maxBidRatio > maxAskRatio && maxBidRatio > 2) {
            signal = 1; // Strong bid support
        } else if (maxAskRatio > maxBidRatio && maxAskRatio > 2) {
            signal = -1; // Strong ask resistance
        }

        return { strength, signal };
    }

    private calculateSignalAgreement(signals: SignalResult[]): number {
        const activeSignals = signals.filter(s => s.signal !== 0);
        if (activeSignals.length === 0) return 0;

        const positiveCount = activeSignals.filter(s => s.signal > 0).length;
        const negativeCount = activeSignals.filter(s => s.signal < 0).length;

        const maxCount = Math.max(positiveCount, negativeCount);
        return maxCount / activeSignals.length;
    }

    private calculateProbabilities(score: number, confidence: number): { UP: number; DOWN: number; NEUTRAL: number } {
        // Convert aggregate score to probabilities
        const sigmoid = (x: number) => 1 / (1 + Math.exp(-x * 5));

        const rawUp = sigmoid(score);
        const rawDown = sigmoid(-score);
        const neutral = 1 - confidence;

        // Normalize
        const total = rawUp + rawDown + neutral;

        return {
            UP: Math.round((rawUp / total) * 100) / 100,
            DOWN: Math.round((rawDown / total) * 100) / 100,
            NEUTRAL: Math.round((neutral / total) * 100) / 100
        };
    }
}

// Export singleton predictors
const predictors: Map<string, SmartPredictor> = new Map();

export function getPredictor(symbol: string, horizon: number = 10): SmartPredictor {
    const key = `${symbol}_${horizon}`;
    if (!predictors.has(key)) {
        predictors.set(key, new SmartPredictor(symbol, horizon));
    }
    const predictor = predictors.get(key);
    if (!predictor) {
        throw new Error(`Failed to create predictor for ${symbol}`);
    }
    return predictor;
}
