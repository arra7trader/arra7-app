import type { CronosMarketCandle, CronosTimeframe } from './arra-cronos-market';

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
    confidenceScore: number;
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

    let lot = 0.01;
    const sym = symbol.toUpperCase();

    if (sym.includes('XAU')) {
        // 1 lot = 100 oz. 1.0 move ($1) = $100
        lot = riskAmount / (slDist * 100);
    } else if (sym.includes('XAG')) {
        // 1 lot = 5000 oz.
        lot = riskAmount / (slDist * 5000);
    } else if (sym.includes('BTC') || sym.includes('ETH')) {
        lot = riskAmount / slDist;
    } else if (sym.startsWith('US') || sym.startsWith('DE') || sym.startsWith('JP')) {
        lot = riskAmount / (slDist * 10);
    } else {
        // Standard Forex 100k contract -> approx $10 per pip
        const pipsCount = slDist / spec.pipSize;
        lot = riskAmount / (pipsCount * 10);
    }

    lot = Math.max(0.01, Math.min(100, Number(lot.toFixed(2))));

    // Calculate dollar return based on lot
    const mult = sym.includes('XAU') ? 100 : sym.includes('XAG') ? 5000 : (sym.includes('BTC') || sym.includes('ETH')) ? 1 : 10 / spec.pipSize;
    const dollarProfit1 = Number((tp1Dist * lot * mult).toFixed(2));
    const dollarProfit2 = Number((tp2Dist * lot * mult).toFixed(2));

    return {
        lotSize: lot,
        dollarRisk: Number(riskAmount.toFixed(2)),
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
export function extractMTFMatrix(candles: CronosMarketCandle[]): Record<CronosTimeframe, CronosMTFBias> {
    const closes = candles.map((c) => c.close);
    const n = closes.length;
    const cur = closes[n - 1];

    const calcEMA = (data: number[], period: number) => {
        const k = 2 / (period + 1);
        return data.reduce((ema, val) => val * k + ema * (1 - k), data[0] || cur);
    };

    // 15M: last 16 bars
    const b15m = closes.slice(-16);
    const ema9_15 = calcEMA(b15m, 9);
    const ema21_15 = calcEMA(b15m, 16);
    const chg15 = b15m[0] ? ((cur - b15m[0]) / b15m[0]) * 100 : 0;
    const dir15: 'UP' | 'DOWN' | 'FLAT' = ema9_15 > ema21_15 * 1.0003 ? 'UP' : ema9_15 < ema21_15 * 0.9997 ? 'DOWN' : 'FLAT';

    // 1H: last 48 bars
    const b1h = closes.slice(-48);
    const ema9_1h = calcEMA(b1h, 9);
    const ema21_1h = calcEMA(b1h, 21);
    const chg1h = b1h[0] ? ((cur - b1h[0]) / b1h[0]) * 100 : 0;
    const dir1h: 'UP' | 'DOWN' | 'FLAT' = ema9_1h > ema21_1h * 1.0005 ? 'UP' : ema9_1h < ema21_1h * 0.9995 ? 'DOWN' : 'FLAT';

    // 4H: aggregated 4-bar periods (last 160 bars = 40 4h bars)
    const b4hCloses: number[] = [];
    for (let i = 0; i < closes.length; i += 4) {
        b4hCloses.push(closes[i]);
    }
    const b4h = b4hCloses.slice(-40);
    const ema9_4h = calcEMA(b4h, 9);
    const ema21_4h = calcEMA(b4h, 21);
    const chg4h = b4h[0] ? ((cur - b4h[0]) / b4h[0]) * 100 : 0;
    const dir4h: 'UP' | 'DOWN' | 'FLAT' = ema9_4h > ema21_4h * 1.0008 ? 'UP' : ema9_4h < ema21_4h * 0.9992 ? 'DOWN' : 'FLAT';

    // 1D: aggregated 24-bar periods
    const b1dCloses: number[] = [];
    for (let i = 0; i < closes.length; i += 24) {
        b1dCloses.push(closes[i]);
    }
    const b1d = b1dCloses.slice(-30);
    const ema9_1d = calcEMA(b1d, 9);
    const ema21_1d = calcEMA(b1d, 21);
    const chg1d = b1d[0] ? ((cur - b1d[0]) / b1d[0]) * 100 : 0;
    const dir1d: 'UP' | 'DOWN' | 'FLAT' = ema9_1d > ema21_1d * 1.001 ? 'UP' : ema9_1d < ema21_1d * 0.999 ? 'DOWN' : 'FLAT';

    return {
        '15m': { timeframe: '15m', direction: dir15, changePercent: Number(chg15.toFixed(2)), score: dir15 === 'UP' ? 1 : dir15 === 'DOWN' ? -1 : 0, label: 'Scalp 15M' },
        '1h': { timeframe: '1h', direction: dir1h, changePercent: Number(chg1h.toFixed(2)), score: dir1h === 'UP' ? 1 : dir1h === 'DOWN' ? -1 : 0, label: 'Intraday 1H' },
        '4h': { timeframe: '4h', direction: dir4h, changePercent: Number(chg4h.toFixed(2)), score: dir4h === 'UP' ? 1 : dir4h === 'DOWN' ? -1 : 0, label: 'Swing 4H' },
        '1d': { timeframe: '1d', direction: dir1d, changePercent: Number(chg1d.toFixed(2)), score: dir1d === 'UP' ? 1 : dir1d === 'DOWN' ? -1 : 0, label: 'Daily Macro' },
    };
}

/**
 * Generate Full Institutional Quant Forecast with Uncertainty Corridors and Trade Plan.
 */
export function buildKronosQuantForecast(
    symbol: string,
    timeframe: CronosTimeframe,
    candles: CronosMarketCandle[],
    predLen: number,
    intervalSeconds: number,
    isContinuous: boolean
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
    const ranges = candles.slice(-14).map((c) => Math.max(c.high - c.low, Math.abs(c.high - c.close), Math.abs(c.low - c.close)));
    const atr = ranges.reduce((a, b) => a + b, 0) / ranges.length || currentPrice * 0.005;

    // 2. Historical ATR for Volatility Regime
    const prevAtrRanges = candles.slice(-50, -14).map((c) => Math.max(c.high - c.low, Math.abs(c.high - c.close), Math.abs(c.low - c.close)));
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
    const mtfMatrix = extractMTFMatrix(candles);
    const mtfUpCount = Object.values(mtfMatrix).filter((m) => m.direction === 'UP').length;
    const mtfDownCount = Object.values(mtfMatrix).filter((m) => m.direction === 'DOWN').length;

    // 8. Confidence Score (0 - 100)
    let confidence = 55;
    if (Math.abs(trendScore) >= 30) confidence += 15;
    if (Math.abs(trendScore) >= 60) confidence += 10;
    if (rsi14 >= 40 && rsi14 <= 65) confidence += 5; // Steady healthy trend
    if (mtfUpCount >= 3 || mtfDownCount >= 3) confidence += 15;
    confidence = Math.min(95, Math.max(50, confidence));

    // 9. Confluence
    const confluenceScore = Math.round(((Math.max(mtfUpCount, mtfDownCount)) / 4) * 100);
    const confluenceSummary =
        mtfUpCount >= 3 ? `STRONG BULLISH (${mtfUpCount}/4 TFs Aligned)` :
        mtfDownCount >= 3 ? `STRONG BEARISH (${mtfDownCount}/4 TFs Aligned)` :
        `MIXED / NEUTRAL CONFLUENCE (${Math.max(mtfUpCount, mtfDownCount)}/4 TFs)`;

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

    // 11. Autoregressive Forecast Path & Dispersion Envelope (P90 upper, P10 lower)
    const forecast: CronosForecastBar[] = [];
    let prevClose = currentPrice;
    const avgVol = candles.slice(-20).reduce((sum, c) => sum + c.volume, 0) / 20 || 1000;

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
        const volume = Math.max(0, Math.round(avgVol * (0.85 + Math.random() * 0.3)));

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

    // 12. Trade Plan
    const spec = getPipSpec(symbol);
    const action: 'BUY' | 'SELL' | 'WAIT' =
        direction === 'UP' && trendScore >= 20 ? 'BUY' :
        direction === 'DOWN' && trendScore <= -20 ? 'SELL' :
        'WAIT';

    const entryPrice = currentPrice;
    const stopLossDistance = atr * 1.35;
    const stopLoss = Number((action === 'BUY' ? entryPrice - stopLossDistance : action === 'SELL' ? entryPrice + stopLossDistance : entryPrice - stopLossDistance).toFixed(5));

    // Dynamic TP1 (at 55% target move) & TP2 (at 100% target)
    const tp1Price = Number((action === 'BUY' ? entryPrice + Math.abs(netMove) * 0.55 : action === 'SELL' ? entryPrice - Math.abs(netMove) * 0.55 : targetPrice).toFixed(5));
    const tp2Price = Number((action === 'BUY' || action === 'SELL' ? targetPrice : entryPrice + stopLossDistance * 2).toFixed(5));

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

    const invalidationReason =
        action === 'BUY' ? `Breakdown di bawah support SL ${stopLoss}` :
        action === 'SELL' ? `Breakout di atas resistance SL ${stopLoss}` :
        `Pergerakan harga dalam fase sideways / noise, tunggu konfirmasi`;

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
        confidenceScore: confidence,
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

    // 13. Institutional AI Commentary
    const rsiState = rsi14 > 70 ? 'overbought' : rsi14 < 30 ? 'oversold' : 'sehat dan seimbang';
    const commentary = action === 'BUY'
        ? `${symbol} pada timeframe ${timeframe.toUpperCase()} terkonfirmasi dalam bias Bullish (Trend Score: +${trendScore}/100, RSI: ${metrics.rsi14} - ${rsiState}). Model Kronos memproyeksikan expansion naik sejauh +${expectedMovePips} ${spec.unitName} (+${expectedMovePercent}%) menuju target ${tp2Price}. Confluence MTF mendukung (${confluenceSummary}) dengan Risk:Reward 1:${riskRewardRatio}. Setup terbatalkan jika candle menembus SL ${stopLoss}.`
        : action === 'SELL'
        ? `${symbol} pada timeframe ${timeframe.toUpperCase()} terkonfirmasi dalam bias Bearish (Trend Score: ${trendScore}/100, RSI: ${metrics.rsi14} - ${rsiState}). Model Kronos memproyeksikan perlemahan sejauh -${expectedMovePips} ${spec.unitName} (${expectedMovePercent}%) menuju target ${tp2Price}. Confluence MTF mendukung (${confluenceSummary}) dengan Risk:Reward 1:${riskRewardRatio}. Setup terbatalkan jika candle menembus SL ${stopLoss}.`
        : `${symbol} pada timeframe ${timeframe.toUpperCase()} saat ini berada dalam fase konsolidasi/netral (${volatilityRegime}, RSI: ${metrics.rsi14}). Model Kronos merekomendasikan WAIT hingga terjadi konfirmasi breakout arah yang jelas dari koridor volatilitas ATR.`;

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
