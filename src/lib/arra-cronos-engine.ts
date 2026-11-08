import { CRONOS_CONFIRMATION_TIMEFRAMES, type CronosMarketCandle, type CronosTimeframe } from './arra-cronos-market';

export interface CronosForecastBar {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    upper: number;
    lower: number;
}

export interface CronosTradePlan {
    action: 'BUY' | 'SELL' | 'WAIT';
    entryPrice: number;
    stopLoss: number;
    takeProfit1: number;
    takeProfit2: number;
    riskRewardRatio: number;
    expectedMovePips: number;
    expectedMovePercent: number;
    riskPips: number;
    recommendedLot: number;
    dollarRisk: number;
    dollarProfit1: number;
    dollarProfit2: number;
    invalidationReason: string;
}

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

export interface CronosFullForecast {
    symbol: string;
    timeframe: CronosTimeframe;
    currentPrice: number;
    targetPrice: number;
    direction: 'UP' | 'DOWN' | 'FLAT';
    forecast: CronosForecastBar[];
    tradePlan: CronosTradePlan;
    metrics: CronosQuantMetrics;
    mtfMatrix: Record<CronosTimeframe, CronosMTFBias>;
    confluenceScore: number;
    confluenceSummary: string;
    commentary: string;
    inferenceMs: number;
    generatedAt: string;
    model: string;
    modelSource: string;
    method: string;
    dataSource: string;
}

/**
 * Symbol pip size and formatting helper.
 */
export function getPipSpec(symbol: string): { pipSize: number; pipDecimals: number; unitName: string } {
    const sym = symbol.toUpperCase();
    if (sym.includes('JPY')) return { pipSize: 0.01, pipDecimals: 1, unitName: 'pips' };
    if (sym.includes('XAU')) return { pipSize: 0.10, pipDecimals: 1, unitName: 'pips' };
    if (sym.includes('XAG')) return { pipSize: 0.01, pipDecimals: 2, unitName: 'pips' };
    if (sym.includes('BTC') || sym.includes('ETH') || sym.includes('SOL') || sym.includes('BNB')) {
        return { pipSize: 1.0, pipDecimals: 0, unitName: 'pts' };
    }
    if (sym.startsWith('US') || sym.startsWith('DE') || sym.startsWith('JP') || sym.startsWith('UK')) {
        return { pipSize: 1.0, pipDecimals: 0, unitName: 'pts' };
    }
    return { pipSize: 0.0001, pipDecimals: 1, unitName: 'pips' };
}

/**
 * Calculate recommended lot size based on equity and risk percentage.
 */
export function calculatePositionSizing(
    symbol: string,
    accountEquity: number,
    riskPercent: number,
    entryPrice: number,
    stopLossPrice: number,
    tp1Price: number,
    tp2Price: number
): {
    lotSize: number;
    dollarRisk: number;
    dollarProfit1: number;
    dollarProfit2: number;
    riskPips: number;
    tp1Pips: number;
    tp2Pips: number;
} {
    const spec = getPipSpec(symbol);
    const riskAmount = (Math.max(10, accountEquity) * Math.max(0.1, Math.min(riskPercent, 10))) / 100;
    const slDist = Math.max(Math.abs(entryPrice - stopLossPrice), entryPrice * 0.0005);
    const tp1Dist = Math.abs(tp1Price - entryPrice);
    const tp2Dist = Math.abs(tp2Price - entryPrice);

    const riskPips = Number((slDist / spec.pipSize).toFixed(spec.pipDecimals));
    const tp1Pips = Number((tp1Dist / spec.pipSize).toFixed(spec.pipDecimals));
    const tp2Pips = Number((tp2Dist / spec.pipSize).toFixed(spec.pipDecimals));

    let rawLot = 0;
    const sym = symbol.toUpperCase();

    if (sym.includes('XAU')) {
        // 1 lot = 100 oz. 1.0 move ($1) = $100
        rawLot = riskAmount / (slDist * 100);
    } else if (sym.includes('XAG')) {
        // 1 lot = 5000 oz.
        rawLot = riskAmount / (slDist * 5000);
    } else if (sym.includes('BTC') || sym.includes('ETH')) {
        rawLot = riskAmount / slDist;
    } else if (sym.startsWith('US') || sym.startsWith('DE') || sym.startsWith('JP')) {
        rawLot = riskAmount / (slDist * 10);
    } else {
        // Standard Forex 100k contract -> approx $10 per pip
        const pipsCount = slDist / spec.pipSize;
        rawLot = riskAmount / (pipsCount * 10);
    }

    // Round down so the suggested amount never increases the chosen risk budget.
    // If minimum lot would exceed the budget, return zero instead of overstating safety.
    const lot = rawLot < 0.01 ? 0 : Math.min(100, Math.floor(rawLot * 100) / 100);

    // Calculate dollar return based on lot
    const mult = sym.includes('XAU') ? 100 : sym.includes('XAG') ? 5000 : (sym.includes('BTC') || sym.includes('ETH')) ? 1 : 10 / spec.pipSize;
    const actualDollarRisk = Number((slDist * lot * mult).toFixed(2));
    const dollarProfit1 = Number((tp1Dist * lot * mult).toFixed(2));
    const dollarProfit2 = Number((tp2Dist * lot * mult).toFixed(2));

    return {
        lotSize: lot,
        dollarRisk: actualDollarRisk,
        dollarProfit1,
        dollarProfit2,
        riskPips,
        tp1Pips,
        tp2Pips,
    };
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

/**
 * Build a deterministic technical scenario and illustrative trade plan.
 */
export function buildKronosQuantForecast(
    symbol: string,
    timeframe: CronosTimeframe,
    candles: CronosMarketCandle[],
    predLen: number,
    intervalSeconds: number,
    isContinuous: boolean,
    mtfHistory?: CronosMTFHistory
): {
    forecast: CronosForecastBar[];
    tradePlan: CronosTradePlan;
    metrics: CronosQuantMetrics;
    mtfMatrix: Record<CronosTimeframe, CronosMTFBias>;
    confluenceScore: number;
    confluenceSummary: string;
    commentary: string;
    direction: 'UP' | 'DOWN' | 'FLAT';
    currentPrice: number;
    targetPrice: number;
} {
    if (!candles || candles.length < 20) {
        throw new Error('Data candle historis tidak mencukupi untuk kalkulasi Kronos.');
    }

    const closes = candles.map((c) => c.close);
    const n = closes.length;
    const currentPrice = closes[n - 1];

    // 1. ATR (14)
    const ranges = candles.slice(-14).map((candle, index) => {
        const candleIndex = candles.length - 14 + index;
        const previousClose = candles[Math.max(0, candleIndex - 1)].close;
        return Math.max(
            candle.high - candle.low,
            Math.abs(candle.high - previousClose),
            Math.abs(candle.low - previousClose)
        );
    });
    const atr = ranges.reduce((a, b) => a + b, 0) / ranges.length || currentPrice * 0.005;

    // 2. Historical ATR for Volatility Regime
    const previousAtrStart = Math.max(1, candles.length - 50);
    const prevAtrRanges = candles.slice(previousAtrStart, -14).map((candle, index) => {
        const candleIndex = previousAtrStart + index;
        const previousClose = candles[Math.max(0, candleIndex - 1)].close;
        return Math.max(
            candle.high - candle.low,
            Math.abs(candle.high - previousClose),
            Math.abs(candle.low - previousClose)
        );
    });
    const prevAtr = prevAtrRanges.length ? prevAtrRanges.reduce((a, b) => a + b, 0) / prevAtrRanges.length : atr;
    const atrRatio = atr / (prevAtr || 1);
    const volatilityRegime: 'COMPRESSION' | 'NORMAL' | 'EXPANSION' =
        atrRatio < 0.85 ? 'COMPRESSION' : atrRatio > 1.25 ? 'EXPANSION' : 'NORMAL';

    // 3. EMAs (9, 21, 55)
    const calcEMA = (period: number) => {
        const k = 2 / (period + 1);
        return closes.slice(-period * 2).reduce((ema, val) => val * k + ema * (1 - k), closes[Math.max(0, n - period * 2)]);
    };
    const ema9 = calcEMA(9);
    const ema21 = calcEMA(21);
    const ema55 = calcEMA(55);

    // 4. RSI (14)
    const gains: number[] = [];
    const losses: number[] = [];
    for (let i = Math.max(1, n - 14); i < n; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff >= 0) gains.push(diff);
        else losses.push(-diff);
    }
    const avgGain = gains.length ? gains.reduce((a, b) => a + b, 0) / 14 : 0;
    const avgLoss = losses.length ? losses.reduce((a, b) => a + b, 0) / 14 : 0;
    const rsi14 = avgLoss === 0 ? (avgGain === 0 ? 50 : 100) : 100 - (100 / (1 + avgGain / avgLoss));

    // 5. Momentum
    const momLookback = Math.min(10, n - 1);
    const momentumPct = closes[n - 1 - momLookback] ? ((currentPrice - closes[n - 1 - momLookback]) / closes[n - 1 - momLookback]) * 100 : 0;

    // 6. Trend Score (-100 to +100)
    const rawTrend = ((currentPrice - ema21) / atr) * 0.4 + ((ema9 - ema21) / atr) * 0.35 + ((ema21 - ema55) / atr) * 0.25;
    const clampedTrend = Math.max(-1.8, Math.min(1.8, rawTrend));
    const trendScore = Math.round((clampedTrend / 1.8) * 100);

    // 7. MTF Matrix
    const mtfMatrix = extractMTFMatrix(mtfHistory || { [timeframe]: candles });
    const requiredBiases = CRONOS_CONFIRMATION_TIMEFRAMES[timeframe].map((requiredTimeframe) => mtfMatrix[requiredTimeframe]);
    const availableRequiredBiases = requiredBiases.filter((bias) => bias.available);
    const mtfValues = availableRequiredBiases;
    const mtfUpCount = mtfValues.filter((bias) => bias.direction === 'UP').length;
    const mtfDownCount = mtfValues.filter((bias) => bias.direction === 'DOWN').length;
    const dominantMtfCount = Math.max(mtfUpCount, mtfDownCount);

    // This is a technical alignment index, not a calibrated win probability.
    const confluenceScore = requiredBiases.length
        ? Math.round((dominantMtfCount / requiredBiases.length) * 100)
        : 0;
    const alignmentScore = Math.round((Math.abs(trendScore) * 0.6) + (confluenceScore * 0.4));
    const confluenceSummary =
        availableRequiredBiases.length !== requiredBiases.length
            ? `MTF BELUM LENGKAP (${availableRequiredBiases.length}/${requiredBiases.length} tersedia)`
            : mtfUpCount === requiredBiases.length
                ? `BULLISH (${mtfUpCount}/${requiredBiases.length} TF; tanpa kontra)`
                : mtfDownCount === requiredBiases.length
                    ? `BEARISH (${mtfDownCount}/${requiredBiases.length} TF; tanpa kontra)`
                    : `MIXED / NEUTRAL (${dominantMtfCount}/${requiredBiases.length} TF searah)`;

    // 10. Generate future timestamps
    const lastTimestamp = new Date(candles[n - 1].time).getTime();
    const intervalMs = intervalSeconds * 1000;
    const futureTimes: string[] = [];
    let curTime = lastTimestamp;

    while (futureTimes.length < predLen) {
        curTime += intervalMs;
        const date = new Date(curTime);
        if (!isContinuous) {
            const day = date.getUTCDay();
            if (day === 6) curTime += 2 * 86400000;
            else if (day === 0) curTime += 1 * 86400000;
        }
        futureTimes.push(new Date(curTime).toISOString());
    }

    // 11. Deterministic ATR scenario path. The corridor is not a statistical percentile.
    const forecast: CronosForecastBar[] = [];
    let prevClose = currentPrice;
    for (let i = 0; i < predLen; i++) {
        const stepNum = i + 1;
        const decay = Math.exp(-0.05 * i);
        const cycle = Math.sin((i / predLen) * Math.PI) * (atr * 0.2);
        const stepDelta = (clampedTrend * (atr * 0.22) * decay) + cycle * (clampedTrend >= 0 ? 0.35 : -0.35);

        const open = prevClose;
        const close = Math.max(open * 0.1, open + stepDelta);
        const candleRange = Math.max(Math.abs(close - open), atr * 0.3);

        const high = Math.max(open, close) + candleRange * 0.45;
        const low = Math.min(open, close) - candleRange * 0.45;
        // Forecast volume is intentionally omitted; future volume is not estimated by this engine.
        const volume = 0;

        // Volatility Corridor expands with sqrt(t)
        const dispersionRadius = atr * Math.sqrt(stepNum) * 0.48;
        const upper = Number((close + dispersionRadius).toFixed(5));
        const lower = Number((close - dispersionRadius).toFixed(5));

        forecast.push({
            time: futureTimes[i],
            open: Number(open.toFixed(5)),
            high: Number(high.toFixed(5)),
            low: Number(low.toFixed(5)),
            close: Number(close.toFixed(5)),
            volume,
            upper,
            lower,
        });

        prevClose = close;
    }

    const targetPrice = forecast[forecast.length - 1].close;
    const netMove = targetPrice - currentPrice;
    const direction: 'UP' | 'DOWN' | 'FLAT' =
        Math.abs(netMove) >= atr * 0.18 ? (netMove > 0 ? 'UP' : 'DOWN') : 'FLAT';

    // 12. Trade Plan (Strictly ordered levels: SL < Entry < TP1 < TP2 for BUY; TP2 < TP1 < Entry < SL for SELL)
    const spec = getPipSpec(symbol);
    const priceDecimals = getPriceDecimals(symbol);
    const mtfReady = requiredBiases.length > 0 && availableRequiredBiases.length === requiredBiases.length;
    const bullishConfirmation = mtfReady && requiredBiases.every((bias) => bias.direction === 'UP');
    const bearishConfirmation = mtfReady && requiredBiases.every((bias) => bias.direction === 'DOWN');
    let action: 'BUY' | 'SELL' | 'WAIT' =
        direction === 'UP' && trendScore >= 15 && bullishConfirmation ? 'BUY' :
        direction === 'DOWN' && trendScore <= -15 && bearishConfirmation ? 'SELL' :
        'WAIT';

    const entryPrice = currentPrice;
    const stopLossDistance = Math.max(atr * 1.35, entryPrice * 0.001);
    const rewardDistance = Math.max(Math.abs(netMove), stopLossDistance * 1.5);

    let stopLoss: number;
    let tp1Price: number;
    let tp2Price: number;

    if (action === 'BUY') {
        stopLoss = Number((entryPrice - stopLossDistance).toFixed(priceDecimals));
        tp1Price = Number((entryPrice + rewardDistance * 0.55).toFixed(priceDecimals));
        tp2Price = Number((entryPrice + rewardDistance).toFixed(priceDecimals));
    } else if (action === 'SELL') {
        stopLoss = Number((entryPrice + stopLossDistance).toFixed(priceDecimals));
        tp1Price = Number((entryPrice - rewardDistance * 0.55).toFixed(priceDecimals));
        tp2Price = Number((entryPrice - rewardDistance).toFixed(priceDecimals));
    } else {
        // Logical fallback for WAIT aligned with forecast direction (never contradictory)
        if (netMove >= 0) {
            stopLoss = Number((entryPrice - stopLossDistance).toFixed(priceDecimals));
            tp1Price = Number((entryPrice + rewardDistance * 0.55).toFixed(priceDecimals));
            tp2Price = Number((entryPrice + rewardDistance).toFixed(priceDecimals));
        } else {
            stopLoss = Number((entryPrice + stopLossDistance).toFixed(priceDecimals));
            tp1Price = Number((entryPrice - rewardDistance * 0.55).toFixed(priceDecimals));
            tp2Price = Number((entryPrice - rewardDistance).toFixed(priceDecimals));
        }
    }

    const riskDist = Math.max(0.0001, Math.abs(entryPrice - stopLoss));
    const rewardDist = Math.abs(tp2Price - entryPrice);
    const riskRewardRatio = Number((rewardDist / riskDist).toFixed(2));

    const expectedMovePips = Number((Math.abs(netMove) / spec.pipSize).toFixed(spec.pipDecimals));
    const expectedMovePercent = Number(((netMove / currentPrice) * 100).toFixed(2));

    const positionSizing = calculatePositionSizing(
        symbol,
        1000, // default $1000 balance
        1.0,  // default 1% risk
        entryPrice,
        stopLoss,
        tp1Price,
        tp2Price
    );

    const lotSizeBlocked = action !== 'WAIT' && positionSizing.lotSize < 0.01;
    if (lotSizeBlocked) action = 'WAIT';

    const invalidationReason =
        action === 'BUY' ? `Breakdown di bawah support SL ${stopLoss}` :
        action === 'SELL' ? `Breakout di atas resistance SL ${stopLoss}` :
        lotSizeBlocked
            ? 'Lot minimum akan melampaui batas risiko yang dipilih; turunkan risiko atau jangan gunakan setup ini.'
            : 'Pergerakan harga belum memenuhi aturan setup; tunggu konfirmasi';

    const tradePlan: CronosTradePlan = {
        action,
        entryPrice,
        stopLoss,
        takeProfit1: tp1Price,
        takeProfit2: tp2Price,
        riskRewardRatio,
        expectedMovePips,
        expectedMovePercent,
        riskPips: positionSizing.riskPips,
        recommendedLot: positionSizing.lotSize,
        dollarRisk: positionSizing.dollarRisk,
        dollarProfit1: positionSizing.dollarProfit1,
        dollarProfit2: positionSizing.dollarProfit2,
        invalidationReason,
    };

    const metrics: CronosQuantMetrics = {
        alignmentScore,
        trendScore,
        rsi14: Number(rsi14.toFixed(1)),
        atr14: Number(atr.toFixed(5)),
        ema9: Number(ema9.toFixed(5)),
        ema21: Number(ema21.toFixed(5)),
        ema55: Number(ema55.toFixed(5)),
        volatilityRegime,
        momentumPct: Number(momentumPct.toFixed(2)),
        alignmentState: trendScore > 30 ? 'BULLISH ALIGNMENT' : trendScore < -30 ? 'BEARISH ALIGNMENT' : 'NEUTRAL CONSOLIDATION',
    };

    // 13. Rule-based technical commentary
    const rsiState = rsi14 > 70 ? 'overbought' : rsi14 < 30 ? 'oversold' : 'sehat dan seimbang';
    const commentary = action === 'BUY'
        ? `${symbol} ${timeframe.toUpperCase()}: setup BUY lolos aturan teknikal lokal (trend score +${trendScore}/100, RSI ${metrics.rsi14} ${rsiState}; MTF ${confluenceSummary}). Level skenario: entry ${entryPrice}, SL ${stopLoss}, TP2 ${tp2Price}, R:R 1:${riskRewardRatio}. Nilai ini bukan probabilitas atau jaminan hasil; setup gugur jika candle menembus SL.`
        : action === 'SELL'
        ? `${symbol} ${timeframe.toUpperCase()}: setup SELL lolos aturan teknikal lokal (trend score ${trendScore}/100, RSI ${metrics.rsi14} ${rsiState}; MTF ${confluenceSummary}). Level skenario: entry ${entryPrice}, SL ${stopLoss}, TP2 ${tp2Price}, R:R 1:${riskRewardRatio}. Nilai ini bukan probabilitas atau jaminan hasil; setup gugur jika candle menembus SL.`
        : `${symbol} ${timeframe.toUpperCase()}: setup belum memenuhi aturan teknikal lokal (${volatilityRegime}, RSI ${metrics.rsi14}; MTF ${confluenceSummary}). Tunggu konfirmasi tren yang konsisten pada semua timeframe yang diwajibkan. Skenario ATR bersifat ilustratif, bukan probabilitas terkalibrasi.`;

    return {
        forecast,
        tradePlan,
        metrics,
        mtfMatrix,
        confluenceScore,
        confluenceSummary,
        commentary,
        direction,
        currentPrice,
        targetPrice,
    };
}
