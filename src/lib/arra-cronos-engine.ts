import { CRONOS_CONFIRMATION_TIMEFRAMES, type CronosMarketCandle, type CronosTimeframe } from './arra-cronos-market';

export interface CronosQuantMetrics {
    alignmentScore: number;
    trendScore: number;
    rsi14: number;
    atr14: number;
    ema9: number;
    ema21: number;
    ema55: number;
    volatilityRegime: 'COMPRESSION' | 'NORMAL' | 'EXPANSION';
    momentumPct: number;
    alignmentState: string;
}

export interface CronosMTFBias {
    timeframe: CronosTimeframe;
    direction: 'UP' | 'DOWN' | 'FLAT';
    changePercent: number;
    score: number;
    label: string;
    available: boolean;
}

export type CronosMTFHistory = Partial<Record<CronosTimeframe, CronosMarketCandle[]>>;

const MINIMUM_CRONOS_SETUP_RR = 1.5;

function getPriceDecimals(symbol: string): number {
    const normalized = symbol.toUpperCase();
    if (normalized.includes('XAU')) return 2;
    if (normalized.includes('XAG')) return 3;
    if (normalized.includes('JPY')) return 3;
    if (normalized.includes('BTC') || normalized.includes('ETH')) return 2;
    return 5;
}

const TIMEFRAME_MINUTES: Record<CronosTimeframe, number> = {
    '15m': 15,
    '1h': 60,
    '4h': 240,
    '1d': 1440,
};

export const CRONOS_MIN_COMPLETED_CANDLES = 55;

export function getCompletedCronosCandles(
    candles: CronosMarketCandle[],
    timeframe: CronosTimeframe,
    now = Date.now()
): CronosMarketCandle[] {
    const intervalMs = TIMEFRAME_MINUTES[timeframe] * 60_000;
    return candles.filter((candle) => {
        const openTime = Date.parse(candle.time);
        return Number.isFinite(openTime) && openTime + intervalMs <= now;
    });
}

export function buildCronosMTFHistory(
    candles: CronosMarketCandle[],
    sourceTimeframe: CronosTimeframe
): CronosMTFHistory {
    const sourceMinutes = TIMEFRAME_MINUTES[sourceTimeframe];
    const history: CronosMTFHistory = {};

    for (const timeframe of Object.keys(TIMEFRAME_MINUTES) as CronosTimeframe[]) {
        const targetMinutes = TIMEFRAME_MINUTES[timeframe];
        if (targetMinutes < sourceMinutes) continue;
        if (targetMinutes === sourceMinutes) {
            history[timeframe] = candles;
            continue;
        }

        const targetMs = targetMinutes * 60_000;
        const sourceMs = sourceMinutes * 60_000;
        const expectedBars = targetMinutes / sourceMinutes;
        const buckets = new Map<number, CronosMarketCandle[]>();

        for (const candle of candles) {
            const timestamp = new Date(candle.time).getTime();
            if (!Number.isFinite(timestamp)) continue;
            const bucketStart = Math.floor(timestamp / targetMs) * targetMs;
            const bucket = buckets.get(bucketStart) || [];
            bucket.push(candle);
            buckets.set(bucketStart, bucket);
        }

        const aggregated = [...buckets.entries()]
            .sort(([a], [b]) => a - b)
            .flatMap(([bucketStart, bucket]) => {
                bucket.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
                const lastBarTime = new Date(bucket[bucket.length - 1].time).getTime();
                const minBars = Math.max(2, Math.ceil(expectedBars * 0.8));
                const isComplete = bucketStart + targetMs <= Date.now()
                    && bucket.length >= minBars
                    && new Date(bucket[0].time).getTime() <= bucketStart + sourceMs
                    && lastBarTime >= bucketStart + targetMs - (sourceMs * 2);
                if (!isComplete) return [];

                return [{
                    time: new Date(bucketStart).toISOString(),
                    open: bucket[0].open,
                    high: Math.max(...bucket.map((candle) => candle.high)),
                    low: Math.min(...bucket.map((candle) => candle.low)),
                    close: bucket[bucket.length - 1].close,
                    volume: bucket.reduce((sum, candle) => sum + candle.volume, 0),
                }];
            });

        history[timeframe] = aggregated;
    }

    return history;
}

/**
 * Extract Multi-Timeframe (MTF) Posture from historical candles.
 */
export function extractMTFMatrix(history: CronosMTFHistory): Record<CronosTimeframe, CronosMTFBias> {
    const timeframeMs: Record<CronosTimeframe, number> = {
        '15m': 15 * 60_000,
        '1h': 60 * 60_000,
        '4h': 4 * 60 * 60_000,
        '1d': 24 * 60 * 60_000,
    };
    const labels: Record<CronosTimeframe, string> = {
        '15m': 'Scalp 15M',
        '1h': 'Intraday 1H',
        '4h': 'Swing 4H',
        '1d': 'Daily Macro',
    };
    const thresholds: Record<CronosTimeframe, number> = {
        '15m': 0.0003,
        '1h': 0.0005,
        '4h': 0.0008,
        '1d': 0.001,
    };

    return Object.fromEntries((Object.keys(labels) as CronosTimeframe[]).map((timeframe) => {
        const closes = (history[timeframe] || [])
            .filter((candle) => new Date(candle.time).getTime() + timeframeMs[timeframe] <= Date.now())
            .map((candle) => candle.close)
            .filter(Number.isFinite);
        const unavailable: CronosMTFBias = {
            timeframe,
            direction: 'FLAT',
            changePercent: 0,
            score: 0,
            label: `${labels[timeframe]} · riwayat belum cukup`,
            available: false,
        };
        if (closes.length < 22) return [timeframe, unavailable];

        const current = closes[closes.length - 1];
        const reference = closes[Math.max(0, closes.length - 22)];
        const calcEMA = (values: number[], period: number) => {
            const sample = values.slice(-period * 3);
            const alpha = 2 / (period + 1);
            return sample.slice(1).reduce((ema, value) => value * alpha + ema * (1 - alpha), sample[0]);
        };
        const ema9 = calcEMA(closes, 9);
        const ema21 = calcEMA(closes, 21);
        const tolerance = thresholds[timeframe];
        const direction: CronosMTFBias['direction'] = ema9 > ema21 * (1 + tolerance)
            ? 'UP'
            : ema9 < ema21 * (1 - tolerance)
                ? 'DOWN'
                : 'FLAT';

        return [timeframe, {
            timeframe,
            direction,
            changePercent: reference ? Number((((current - reference) / reference) * 100).toFixed(2)) : 0,
            score: direction === 'UP' ? 1 : direction === 'DOWN' ? -1 : 0,
            label: labels[timeframe],
            available: true,
        } satisfies CronosMTFBias];
    })) as Record<CronosTimeframe, CronosMTFBias>;
}

export interface CronosMarketReview {
    action: 'BUY' | 'SELL' | 'WAIT';
    direction: 'UP' | 'DOWN' | 'FLAT';
    currentPrice: number;
    targetPrice: number;
    forecast: CronosForecastPoint[];
    scenarioSetup: CronosScenarioSetup;
    metrics: CronosQuantMetrics;
    mtfMatrix: Record<CronosTimeframe, CronosMTFBias>;
    confluenceScore: number;
    confluenceSummary: string;
    commentary: string;
};

export interface CronosForecastPoint {
    time: string;
    value: number;
    upper: number;
    lower: number;
}

export interface CronosScenarioSetup {
    action: 'BUY' | 'SELL' | 'WAIT';
    side: 'BUY' | 'SELL';
    entryPrice: number;
    stopLoss: number;
    takeProfit1: number;
    takeProfit2: number;
    riskRewardRatio: number;
    invalidationReason: string;
}

/**
 * Read completed candles, calculate a deterministic ATR/trend scenario path,
 * and derive conditional reference levels. No execution, fills, position size,
 * or P/L are modeled.
 */
export function buildKronosMarketReview(
    symbol: string,
    timeframe: CronosTimeframe,
    candles: CronosMarketCandle[],
    currentPrice: number,
    mtfHistory?: CronosMTFHistory
): CronosMarketReview {
    const completedCandles = getCompletedCronosCandles(candles, timeframe);
    if (completedCandles.length < CRONOS_MIN_COMPLETED_CANDLES) throw new Error('Riwayat candle tertutup belum cukup untuk tinjauan teknikal.');
    if (!Number.isFinite(currentPrice) || currentPrice <= 0) throw new Error('Harga pasar aktual tidak valid.');

    const closes = completedCandles.map((candle) => candle.close);
    const calcEma = (period: number) => {
        const sample = closes.slice(-period * 2);
        const alpha = 2 / (period + 1);
        return sample.slice(1).reduce((ema, value) => value * alpha + ema * (1 - alpha), sample[0]);
    };
    const ema9 = calcEma(9);
    const ema21 = calcEma(21);
    const ema55 = calcEma(55);
    const trueRanges = completedCandles.slice(-14).map((candle, index) => {
        const candleIndex = completedCandles.length - 14 + index;
        const previousClose = completedCandles[Math.max(0, candleIndex - 1)].close;
        return Math.max(candle.high - candle.low, Math.abs(candle.high - previousClose), Math.abs(candle.low - previousClose));
    });
    const atr = trueRanges.reduce((sum, value) => sum + value, 0) / trueRanges.length || currentPrice * 0.005;
    const priorRanges = completedCandles.slice(-50, -14).map((candle, index) => {
        const candleIndex = completedCandles.length - 50 + index;
        const previousClose = completedCandles[Math.max(0, candleIndex - 1)].close;
        return Math.max(candle.high - candle.low, Math.abs(candle.high - previousClose), Math.abs(candle.low - previousClose));
    });
    const priorAtr = priorRanges.length ? priorRanges.reduce((sum, value) => sum + value, 0) / priorRanges.length : atr;
    const atrRatio = atr / (priorAtr || atr);
    const volatilityRegime: CronosQuantMetrics['volatilityRegime'] = atrRatio < 0.85 ? 'COMPRESSION' : atrRatio > 1.25 ? 'EXPANSION' : 'NORMAL';

    let gains = 0;
    let losses = 0;
    for (let index = Math.max(1, closes.length - 14); index < closes.length; index += 1) {
        const delta = closes[index] - closes[index - 1];
        if (delta > 0) gains += delta;
        else losses -= delta;
    }
    const avgGain = gains / 14;
    const avgLoss = losses / 14;
    const rsi14 = avgLoss === 0 ? (avgGain === 0 ? 50 : 100) : 100 - 100 / (1 + avgGain / avgLoss);
    const momentumReference = closes[closes.length - 1 - Math.min(10, closes.length - 1)];
    const momentumPct = momentumReference ? ((currentPrice - momentumReference) / momentumReference) * 100 : 0;
    const rawTrend = ((currentPrice - ema21) / atr) * 0.4 + ((ema9 - ema21) / atr) * 0.35 + ((ema21 - ema55) / atr) * 0.25;
    const trendScore = Math.round((Math.max(-1.8, Math.min(1.8, rawTrend)) / 1.8) * 100);

    const mtfMatrix = extractMTFMatrix(mtfHistory || { [timeframe]: completedCandles });
    const requiredBiases = CRONOS_CONFIRMATION_TIMEFRAMES[timeframe].map((requiredTimeframe) => mtfMatrix[requiredTimeframe]);
    const availableBiases = requiredBiases.filter((bias) => bias.available);
    const upCount = availableBiases.filter((bias) => bias.direction === 'UP').length;
    const downCount = availableBiases.filter((bias) => bias.direction === 'DOWN').length;
    const dominantCount = Math.max(upCount, downCount);
    const confluenceScore = requiredBiases.length ? Math.round((dominantCount / requiredBiases.length) * 100) : 0;
    const alignmentScore = Math.round(Math.abs(trendScore) * 0.6 + confluenceScore * 0.4);
    const confluenceSummary = availableBiases.length !== requiredBiases.length
        ? `MTF BELUM LENGKAP (${availableBiases.length}/${requiredBiases.length} tersedia)`
        : upCount === requiredBiases.length
            ? `BULLISH (${upCount}/${requiredBiases.length} TF searah)`
            : downCount === requiredBiases.length
                ? `BEARISH (${downCount}/${requiredBiases.length} TF searah)`
                : `MIXED / NEUTRAL (${dominantCount}/${requiredBiases.length} TF searah)`;
    const timeframeMs = TIMEFRAME_MINUTES[timeframe] * 60_000;
    const forecastBars = timeframe === '1d' ? 7 : 12;
    // A completed candle's timestamp is its open time. Its close/entry anchor is one interval later;
    // the first projected candle close belongs one more interval after that.
    const forecastStart = new Date(completedCandles.at(-1)!.time).getTime() + timeframeMs * 2;
    const isContinuous = /^(BTC|ETH|SOL|BNB)/i.test(symbol);
    const forecast: CronosForecastPoint[] = [];
    let projectedPrice = currentPrice;
    let forecastTime = forecastStart;
    if (!isContinuous) {
        while ([0, 6].includes(new Date(forecastTime).getUTCDay())) forecastTime += 86_400_000;
    }
    for (let index = 0; index < forecastBars; index += 1) {
        const step = index + 1;
        const trendDrift = (trendScore / 100) * atr * 0.24 * Math.exp(-0.06 * index);
        const cycle = Math.sin((step / forecastBars) * Math.PI) * atr * 0.035 * Math.sign(trendScore || momentumPct || 1);
        projectedPrice = Math.max(projectedPrice * 0.1, projectedPrice + trendDrift + cycle);
        const dispersion = atr * Math.sqrt(step) * 0.48;
        forecast.push({
            time: new Date(forecastTime).toISOString(),
            value: Number(projectedPrice.toFixed(getPriceDecimals(symbol))),
            upper: Number((projectedPrice + dispersion).toFixed(getPriceDecimals(symbol))),
            lower: Number((projectedPrice - dispersion).toFixed(getPriceDecimals(symbol))),
        });
        forecastTime += timeframeMs;
        if (!isContinuous) {
            const day = new Date(forecastTime).getUTCDay();
            if (day === 6) forecastTime += 2 * 86_400_000;
            else if (day === 0) forecastTime += 86_400_000;
        }
    }
    const targetPrice = forecast.at(-1)?.value ?? currentPrice;
    const netMove = targetPrice - currentPrice;
    const direction: CronosMarketReview['direction'] = Math.abs(netMove) >= atr * 0.18
        ? (netMove > 0 ? 'UP' : 'DOWN')
        : 'FLAT';
    const stopDistance = Math.max(atr * 1.35, currentPrice * 0.001);
    const rewardDistance = Math.abs(netMove);
    const riskRewardRatio = rewardDistance / stopDistance;
    const allRequiredAvailable = availableBiases.length === requiredBiases.length;
    const bullish = allRequiredAvailable && requiredBiases.every((bias) => bias.direction === 'UP');
    const bearish = allRequiredAvailable && requiredBiases.every((bias) => bias.direction === 'DOWN');
    const action: CronosMarketReview['action'] = direction === 'UP' && riskRewardRatio >= MINIMUM_CRONOS_SETUP_RR && trendScore >= 15 && bullish && rsi14 < 70
        ? 'BUY'
        : direction === 'DOWN' && riskRewardRatio >= MINIMUM_CRONOS_SETUP_RR && trendScore <= -15 && bearish && rsi14 > 30
            ? 'SELL'
            : 'WAIT';

    const priceDecimals = getPriceDecimals(symbol);
    const side: CronosScenarioSetup['side'] = netMove < 0 || (netMove === 0 && trendScore < 0) ? 'SELL' : 'BUY';
    const takeProfit1Distance = action === 'WAIT' ? rewardDistance * 0.55 : stopDistance;
    const scenarioSetup: CronosScenarioSetup = {
        action,
        side,
        entryPrice: Number(currentPrice.toFixed(priceDecimals)),
        stopLoss: Number((currentPrice + (side === 'BUY' ? -stopDistance : stopDistance)).toFixed(priceDecimals)),
        takeProfit1: Number((currentPrice + (side === 'BUY' ? takeProfit1Distance : -takeProfit1Distance)).toFixed(priceDecimals)),
        takeProfit2: Number(targetPrice.toFixed(priceDecimals)),
        riskRewardRatio: Number(riskRewardRatio.toFixed(2)),
        invalidationReason: side === 'BUY'
            ? 'Skenario BUY batal bila harga menembus stop skenario.'
            : 'Skenario SELL batal bila harga menembus stop skenario.',
    };
    const metrics: CronosQuantMetrics = {
        alignmentScore,
        trendScore,
        rsi14: Number(rsi14.toFixed(1)),
        atr14: Number(atr.toFixed(priceDecimals)),
        ema9: Number(ema9.toFixed(priceDecimals)),
        ema21: Number(ema21.toFixed(priceDecimals)),
        ema55: Number(ema55.toFixed(priceDecimals)),
        volatilityRegime,
        momentumPct: Number(momentumPct.toFixed(2)),
        alignmentState: trendScore > 30 ? 'BULLISH ALIGNMENT' : trendScore < -30 ? 'BEARISH ALIGNMENT' : 'NEUTRAL CONSOLIDATION',
    };
    const commentary = action === 'WAIT'
        ? `${symbol} ${timeframe.toUpperCase()}: status WAIT karena filter risk/reward minimum 1:1.5, tren, atau konfirmasi timeframe belum terpenuhi. Jalur dan level ${side} adalah skenario teknikal dari ATR dan tren teramati, bukan harga masa depan yang pasti.`
        : `${symbol} ${timeframe.toUpperCase()}: bias ${action} dari tren, RSI ${metrics.rsi14}, dan konfirmasi ${confluenceSummary}. Jalur dan level adalah estimasi teknikal, bukan harga pasti atau instruksi order.`;

    return { action, direction, currentPrice, targetPrice, forecast, scenarioSetup, metrics, mtfMatrix, confluenceScore, confluenceSummary, commentary };
}

/**
 * Build a market review from completed OHLCV candles and provide an estimated
 * technical scenario. No simulated fills, position sizing, or P/L are calculated.
 */
export function buildKronosQuantReview(
    symbol: string,
    timeframe: CronosTimeframe,
    candles: CronosMarketCandle[],
    mtfHistory?: CronosMTFHistory,
    currentPrice = candles.at(-1)?.close ?? 0
): CronosMarketReview {
    const review = buildKronosMarketReview(symbol, timeframe, candles, currentPrice, mtfHistory);
    return review;
}
