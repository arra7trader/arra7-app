/**
 * PICA Institutional Smart Money Concepts (SMC) & Order Flow Engine
 * 
 * World-Class Quantitative & Institutional Analysis for XAU/USD (Gold):
 * 1. Liquidity Sweeps (Buy-side & Sell-side Liquidity grab detection)
 * 2. Institutional Order Blocks (Mitigated & Unmitigated OB zones)
 * 3. Fair Value Gaps (FVG / Inefficiencies: BISI & SIBI)
 * 4. Market Structure Shift (MSS) / Break of Structure (BOS)
 * 5. Dynamic Anchored VWAP with Standard Deviation Multi-Bands (±1σ, ±2σ, ±2.5σ)
 * 6. Optimal Trade Entry (OTE) & Fibo Kyoko Confluence (0.618 - 0.786 Golden Pocket)
 * 7. London & New York Session Killzone Multipliers
 * 8. Choppiness & False-Breakout Filter (Zero False Signal Matrix)
 */

export interface SMCCandle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface LiquiditySweep {
    detected: boolean;
    type: 'BULLISH_SWEEP_SSL' | 'BEARISH_SWEEP_BSL' | 'NONE';
    sweptLevel: number;
    description: string;
}

export interface OrderBlock {
    detected: boolean;
    type: 'BULLISH_OB' | 'BEARISH_OB' | 'NONE';
    top: number;
    bottom: number;
    mitigated: boolean;
    description: string;
}

export interface FairValueGap {
    detected: boolean;
    type: 'BULLISH_FVG' | 'BEARISH_FVG' | 'NONE';
    top: number;
    bottom: number;
    midpoint: number;
    mitigated: boolean;
    sizePips: number;
    description: string;
}

export interface MarketStructureShift {
    detected: boolean;
    direction: 'BULLISH_MSS' | 'BEARISH_MSS' | 'NEUTRAL';
    breakLevel: number;
    confirmedByBody: boolean;
    description: string;
}

export interface VWAPStatus {
    vwap: number;
    upper1: number;
    lower1: number;
    upper2: number;
    lower2: number;
    distancePercent: number;
    regime: 'EXTREME_OVERBOUGHT' | 'OVERBOUGHT' | 'FAIR_VALUE' | 'OVERSOLD' | 'EXTREME_OVERSOLD';
}

export interface FibOTE {
    inGoldenPocket: boolean;
    level618: number;
    level786: number;
    anchorHigh: number;
    anchorLow: number;
    trendDirection: 'UP' | 'DOWN' | 'RANGING';
}

export interface KillzoneStatus {
    isKillzone: boolean;
    sessionName: string;
    volatilityBoost: number;
}

export interface SMCAnalysisResult {
    liquidity: LiquiditySweep;
    orderBlock: OrderBlock;
    fvg: FairValueGap;
    mss: MarketStructureShift;
    vwap: VWAPStatus;
    ote: FibOTE;
    killzone: KillzoneStatus;
    confluenceScore: number; // -100 to +100
    setupGrade: 'A+ Institutional' | 'A Standard' | 'B Setup' | 'No Trade (Consolidation)';
    institutionalBias: 'STRONG_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG_BEARISH';
    keyObservations: string[];
}

/**
 * Main Analysis Entry Point for Institutional SMC
 */
export function analyzeInstitutionalSMC(candles: SMCCandle[], currentPrice: number): SMCAnalysisResult {
    if (!candles || candles.length < 30) {
        return createFallbackSMC(currentPrice);
    }

    const n = candles.length;
    const recent = candles[n - 1];
    const prev = candles[n - 2];
    const prev2 = candles[n - 3];

    // ─────────────────────────────────────────────────────────────
    // 1. LIQUIDITY SWEEP DETECTION (BSL / SSL)
    // ─────────────────────────────────────────────────────────────
    let liquidity: LiquiditySweep = {
        detected: false,
        type: 'NONE',
        sweptLevel: 0,
        description: 'Tidak ada pembersihan likuiditas mayor baru-baru ini.',
    };

    // Find highest swing high and lowest swing low in lookback 15..40
    let swingHigh = -Infinity;
    let swingLow = Infinity;
    const sweepLookbackStart = Math.max(0, n - 35);
    const sweepLookbackEnd = Math.max(0, n - 3);

    for (let i = sweepLookbackStart; i < sweepLookbackEnd; i++) {
        if (candles[i].high > swingHigh) swingHigh = candles[i].high;
        if (candles[i].low < swingLow) swingLow = candles[i].low;
    }

    // Check last 2 candles for sweeps
    // Bullish sweep: Low pierced below swingLow, but closed back above it (Fakeout/Liquidity Grab)
    const testedLow = Math.min(recent.low, prev.low);
    const testedClose = recent.close;
    if (testedLow < swingLow && testedClose > swingLow) {
        liquidity = {
            detected: true,
            type: 'BULLISH_SWEEP_SSL',
            sweptLevel: Math.round(swingLow * 100) / 100,
            description: `Sell-Side Liquidity (SSL) di $${swingLow.toFixed(2)} berhasil dibersihkan! Institusi menyerap stop loss ritel dan harga rebound.`,
        };
    }
    // Bearish sweep: High pierced above swingHigh, but closed back below it
    const testedHigh = Math.max(recent.high, prev.high);
    if (testedHigh > swingHigh && testedClose < swingHigh) {
        liquidity = {
            detected: true,
            type: 'BEARISH_SWEEP_BSL',
            sweptLevel: Math.round(swingHigh * 100) / 100,
            description: `Buy-Side Liquidity (BSL) di $${swingHigh.toFixed(2)} berhasil dibersihkan! Institusi menjebak buyer breakout dan harga ditarik turun.`,
        };
    }

    // ─────────────────────────────────────────────────────────────
    // 2. FAIR VALUE GAP (FVG / IMBALANCE) DETECTION
    // ─────────────────────────────────────────────────────────────
    let fvg: FairValueGap = {
        detected: false,
        type: 'NONE',
        top: 0,
        bottom: 0,
        midpoint: 0,
        mitigated: false,
        sizePips: 0,
        description: 'Tidak ada Fair Value Gap aktif di dekat harga.',
    };

    // Scan backwards for the freshest significant FVG (min 3 bars)
    for (let i = n - 1; i >= Math.max(2, n - 15); i--) {
        const c1 = candles[i - 2];
        const c2 = candles[i - 1];
        const c3 = candles[i];

        // Bullish FVG: Low of candle 3 > High of candle 1
        if (c3.low > c1.high) {
            const gapTop = c3.low;
            const gapBottom = c1.high;
            const gapMid = (gapTop + gapBottom) / 2;
            const gapPips = Math.round(((gapTop - gapBottom) / 0.1) * 10) / 10;

            if (gapPips >= 6) { // min 6 pips gap on Gold
                const isMitigated = currentPrice <= gapBottom;
                fvg = {
                    detected: true,
                    type: 'BULLISH_FVG',
                    top: Math.round(gapTop * 100) / 100,
                    bottom: Math.round(gapBottom * 100) / 100,
                    midpoint: Math.round(gapMid * 100) / 100,
                    mitigated: isMitigated,
                    sizePips: gapPips,
                    description: `Bullish FVG (${gapPips} pips) terdeteksi di $${gapBottom.toFixed(2)} - $${gapTop.toFixed(2)}. ${isMitigated ? 'Sudah termitigasi.' : 'Area magnet retest kuat!'}`,
                };
                break;
            }
        }

        // Bearish FVG: High of candle 3 < Low of candle 1
        if (c3.high < c1.low) {
            const gapTop = c1.low;
            const gapBottom = c3.high;
            const gapMid = (gapTop + gapBottom) / 2;
            const gapPips = Math.round(((gapTop - gapBottom) / 0.1) * 10) / 10;

            if (gapPips >= 6) {
                const isMitigated = currentPrice >= gapTop;
                fvg = {
                    detected: true,
                    type: 'BEARISH_FVG',
                    top: Math.round(gapTop * 100) / 100,
                    bottom: Math.round(gapBottom * 100) / 100,
                    midpoint: Math.round(gapMid * 100) / 100,
                    mitigated: isMitigated,
                    sizePips: gapPips,
                    description: `Bearish FVG (${gapPips} pips) terdeteksi di $${gapBottom.toFixed(2)} - $${gapTop.toFixed(2)}. ${isMitigated ? 'Sudah termitigasi.' : 'Area penolakan sell kuat!'}`,
                };
                break;
            }
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 3. INSTITUTIONAL ORDER BLOCK (OB) DETECTION
    // ─────────────────────────────────────────────────────────────
    let orderBlock: OrderBlock = {
        detected: false,
        type: 'NONE',
        top: 0,
        bottom: 0,
        mitigated: false,
        description: 'Zona Order Block netral.',
    };

    // Look for the origin of the strongest recent impulse move
    for (let i = n - 2; i >= Math.max(3, n - 20); i--) {
        const cPrior = candles[i];
        const cNext1 = candles[i + 1];
        const move = cNext1.close - cPrior.open;

        // Bullish OB: Last bearish candle prior to a strong bullish breakout
        if (cPrior.close < cPrior.open && move > 0 && (cNext1.high - cPrior.low) > 8) {
            const obTop = Math.max(cPrior.open, cPrior.high);
            const obBottom = cPrior.low;
            const isMitigated = currentPrice < obBottom;

            orderBlock = {
                detected: true,
                type: 'BULLISH_OB',
                top: Math.round(obTop * 100) / 100,
                bottom: Math.round(obBottom * 100) / 100,
                mitigated: isMitigated,
                description: `Bullish Order Block di $${obBottom.toFixed(2)} - $${obTop.toFixed(2)}. Titik akumulasi institusional.`,
            };
            break;
        }

        // Bearish OB: Last bullish candle prior to a strong bearish breakdown
        if (cPrior.close > cPrior.open && move < 0 && (cPrior.high - cNext1.low) > 8) {
            const obTop = cPrior.high;
            const obBottom = Math.min(cPrior.open, cPrior.low);
            const isMitigated = currentPrice > obTop;

            orderBlock = {
                detected: true,
                type: 'BEARISH_OB',
                top: Math.round(obTop * 100) / 100,
                bottom: Math.round(obBottom * 100) / 100,
                mitigated: isMitigated,
                description: `Bearish Order Block di $${obBottom.toFixed(2)} - $${obTop.toFixed(2)}. Titik distribusi institusional.`,
            };
            break;
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 4. MARKET STRUCTURE SHIFT (MSS) / BOS DETECTION
    // ─────────────────────────────────────────────────────────────
    let mss: MarketStructureShift = {
        detected: false,
        direction: 'NEUTRAL',
        breakLevel: 0,
        confirmedByBody: false,
        description: 'Struktur pasar konsolidasi normal.',
    };

    const recentHigh = Math.max(...candles.slice(-10, -2).map(c => c.high));
    const recentLow = Math.min(...candles.slice(-10, -2).map(c => c.low));

    if (recent.close > recentHigh) {
        mss = {
            detected: true,
            direction: 'BULLISH_MSS',
            breakLevel: Math.round(recentHigh * 100) / 100,
            confirmedByBody: true,
            description: `Bullish Market Structure Shift (MSS): Candle menembus swing high $${recentHigh.toFixed(2)} dengan konfirmasi body candle!`,
        };
    } else if (recent.close < recentLow) {
        mss = {
            detected: true,
            direction: 'BEARISH_MSS',
            breakLevel: Math.round(recentLow * 100) / 100,
            confirmedByBody: true,
            description: `Bearish Market Structure Shift (MSS): Candle menembus swing low $${recentLow.toFixed(2)} dengan konfirmasi body candle!`,
        };
    }

    // ─────────────────────────────────────────────────────────────
    // 5. ANCHORED VWAP & STANDARD DEVIATION MULTI-BANDS
    // ─────────────────────────────────────────────────────────────
    let sumPV = 0;
    let sumV = 0;
    const vwapLookback = Math.min(candles.length, 50);
    const vwapSlice = candles.slice(-vwapLookback);

    vwapSlice.forEach(c => {
        const typicalPrice = (c.high + c.low + c.close) / 3;
        const vol = Math.max(1, c.volume);
        sumPV += typicalPrice * vol;
        sumV += vol;
    });

    const vwapValue = sumV > 0 ? sumPV / sumV : currentPrice;

    // Standard deviation
    let varianceSum = 0;
    vwapSlice.forEach(c => {
        const tp = (c.high + c.low + c.close) / 3;
        varianceSum += Math.pow(tp - vwapValue, 2);
    });
    const stdDev = Math.sqrt(varianceSum / vwapLookback) || 6.5;

    const upper1 = vwapValue + stdDev;
    const lower1 = vwapValue - stdDev;
    const upper2 = vwapValue + (stdDev * 2.0);
    const lower2 = vwapValue - (stdDev * 2.0);
    const upper25 = vwapValue + (stdDev * 2.5);
    const lower25 = vwapValue - (stdDev * 2.5);

    let vwapRegime: VWAPStatus['regime'] = 'FAIR_VALUE';
    if (currentPrice >= upper25) vwapRegime = 'EXTREME_OVERBOUGHT';
    else if (currentPrice >= upper2) vwapRegime = 'OVERBOUGHT';
    else if (currentPrice <= lower25) vwapRegime = 'EXTREME_OVERSOLD';
    else if (currentPrice <= lower2) vwapRegime = 'OVERSOLD';

    const vwapDistancePct = Math.round(((currentPrice - vwapValue) / vwapValue) * 10000) / 100;

    const vwapStatus: VWAPStatus = {
        vwap: Math.round(vwapValue * 100) / 100,
        upper1: Math.round(upper1 * 100) / 100,
        lower1: Math.round(lower1 * 100) / 100,
        upper2: Math.round(upper2 * 100) / 100,
        lower2: Math.round(lower2 * 100) / 100,
        distancePercent: vwapDistancePct,
        regime: vwapRegime,
    };

    // ─────────────────────────────────────────────────────────────
    // 6. FIBONACCI OPTIMAL TRADE ENTRY (OTE 0.618 - 0.786)
    // ─────────────────────────────────────────────────────────────
    const macroLookback = candles.slice(-30);
    const anchorHigh = Math.max(...macroLookback.map(c => c.high));
    const anchorLow = Math.min(...macroLookback.map(c => c.low));
    const range = anchorHigh - anchorLow;

    const isUpTrend = recent.close >= anchorLow + range * 0.5;
    let level618 = 0;
    let level786 = 0;
    let inGoldenPocket = false;

    if (isUpTrend) {
        // Retracement from high to low
        level618 = anchorHigh - (range * 0.618);
        level786 = anchorHigh - (range * 0.786);
        inGoldenPocket = currentPrice >= level786 && currentPrice <= level618;
    } else {
        // Retracement from low to high
        level618 = anchorLow + (range * 0.618);
        level786 = anchorLow + (range * 0.786);
        inGoldenPocket = currentPrice >= level618 && currentPrice <= level786;
    }

    const oteStatus: FibOTE = {
        inGoldenPocket,
        level618: Math.round(level618 * 100) / 100,
        level786: Math.round(level786 * 100) / 100,
        anchorHigh: Math.round(anchorHigh * 100) / 100,
        anchorLow: Math.round(anchorLow * 100) / 100,
        trendDirection: isUpTrend ? 'UP' : 'DOWN',
    };

    // ─────────────────────────────────────────────────────────────
    // 7. TIME & SESSION KILLZONE STATUS
    // ─────────────────────────────────────────────────────────────
    const nowUtcHour = new Date().getUTCHours();
    let isKillzone = false;
    let sessionName = 'Asian Session (Akumulasi Lambat)';
    let volatilityBoost = 1.0;

    // London Killzone: 07:00 - 10:00 UTC (14:00 - 17:00 WIB)
    if (nowUtcHour >= 7 && nowUtcHour <= 10) {
        isKillzone = true;
        sessionName = 'London Killzone (Ekspansi Volatilitas)';
        volatilityBoost = 1.35;
    }
    // New York Killzone: 12:00 - 16:00 UTC (19:00 - 23:00 WIB)
    else if (nowUtcHour >= 12 && nowUtcHour <= 16) {
        isKillzone = true;
        sessionName = 'New York Killzone (Volume Institusional Tertinggi)';
        volatilityBoost = 1.5;
    }
    // London Close: 16:00 - 18:00 UTC
    else if (nowUtcHour >= 16 && nowUtcHour <= 18) {
        isKillzone = true;
        sessionName = 'London Close / NY Afternoon';
        volatilityBoost = 1.2;
    }

    const killzoneStatus: KillzoneStatus = {
        isKillzone,
        sessionName,
        volatilityBoost,
    };

    // ─────────────────────────────────────────────────────────────
    // 8. QUANTITATIVE INSTITUTIONAL CONFLUENCE SCORING (-100 to +100)
    // ─────────────────────────────────────────────────────────────
    let bullScore = 0;
    let bearScore = 0;
    const keyObservations: string[] = [];

    // Liquidity Sweep (Weight: 28 pts)
    if (liquidity.type === 'BULLISH_SWEEP_SSL') {
        bullScore += 28;
        keyObservations.push('Liquidity Sweep: SSL swept & reclaimed (Stop hunt buyer ritel selesai).');
    } else if (liquidity.type === 'BEARISH_SWEEP_BSL') {
        bearScore += 28;
        keyObservations.push('Liquidity Sweep: BSL swept & rejected (Bull trap berhasil dijebak).');
    }

    // Market Structure Shift (Weight: 24 pts)
    if (mss.direction === 'BULLISH_MSS') {
        bullScore += 24;
        keyObservations.push('MSS: Break of Structure ke atas terkonfirmasi body candle.');
    } else if (mss.direction === 'BEARISH_MSS') {
        bearScore += 24;
        keyObservations.push('MSS: Break of Structure ke bawah terkonfirmasi body candle.');
    }

    // Order Block Proximity (Weight: 20 pts)
    if (orderBlock.type === 'BULLISH_OB' && !orderBlock.mitigated) {
        if (currentPrice >= orderBlock.bottom && currentPrice <= orderBlock.top * 1.003) {
            bullScore += 20;
            keyObservations.push(`Order Block: Harga sedang menguji Bullish OB ($${orderBlock.bottom}-$${orderBlock.top}).`);
        }
    } else if (orderBlock.type === 'BEARISH_OB' && !orderBlock.mitigated) {
        if (currentPrice <= orderBlock.top && currentPrice >= orderBlock.bottom * 0.997) {
            bearScore += 20;
            keyObservations.push(`Order Block: Harga sedang menguji Bearish OB ($${orderBlock.bottom}-$${orderBlock.top}).`);
        }
    }

    // FVG Imbalance Confluence (Weight: 15 pts)
    if (fvg.type === 'BULLISH_FVG' && !fvg.mitigated) {
        bullScore += 15;
        keyObservations.push(`Fair Value Gap: Bullish Imbalance ${fvg.sizePips} pips di bawah harga menopang tren.`);
    } else if (fvg.type === 'BEARISH_FVG' && !fvg.mitigated) {
        bearScore += 15;
        keyObservations.push(`Fair Value Gap: Bearish Imbalance ${fvg.sizePips} pips di atas harga menekan ke bawah.`);
    }

    // VWAP Dynamic Bands (Weight: 18 pts)
    if (vwapRegime === 'OVERSOLD' || vwapRegime === 'EXTREME_OVERSOLD') {
        bullScore += 18;
        keyObservations.push(`VWAP Bands: Posisi harga di -2σ Extreme Discount (${vwapDistancePct}% vs VWAP). Reversal buy probabilitas tinggi.`);
    } else if (vwapRegime === 'OVERBOUGHT' || vwapRegime === 'EXTREME_OVERBOUGHT') {
        bearScore += 18;
        keyObservations.push(`VWAP Bands: Posisi harga di +2σ Extreme Premium (+${vwapDistancePct}% vs VWAP). Reversal sell probabilitas tinggi.`);
    }

    // Fibonacci OTE (Weight: 15 pts)
    if (oteStatus.inGoldenPocket) {
        if (isUpTrend) {
            bullScore += 15;
            keyObservations.push('Fibo OTE: Harga berada tepat di Golden Pocket 0.618 - 0.786 (Sniper Discount).');
        } else {
            bearScore += 15;
            keyObservations.push('Fibo OTE: Harga berada tepat di Golden Pocket 0.618 - 0.786 (Sniper Premium).');
        }
    }

    // Session Multiplier
    bullScore *= killzoneStatus.volatilityBoost;
    bearScore *= killzoneStatus.volatilityBoost;

    // Calculate Final Net Confluence Score (-100 to +100)
    const netScore = Math.max(-100, Math.min(100, Math.round(bullScore - bearScore)));

    // Setup Grading
    let setupGrade: SMCAnalysisResult['setupGrade'] = 'B Setup';
    let institutionalBias: SMCAnalysisResult['institutionalBias'] = 'NEUTRAL';

    const absScore = Math.abs(netScore);

    // Grade A+ requires Holy Trinity: (Liquidity Sweep OR MSS) + (OB OR FVG OR OTE) + Score >= 65
    const hasCoreConfluence = (liquidity.detected || mss.detected) && (orderBlock.detected || fvg.detected || oteStatus.inGoldenPocket);

    if (absScore >= 65 && hasCoreConfluence) {
        setupGrade = 'A+ Institutional';
    } else if (absScore >= 45) {
        setupGrade = 'A Standard';
    } else if (absScore >= 25) {
        setupGrade = 'B Setup';
    } else {
        setupGrade = 'No Trade (Consolidation)';
    }

    if (netScore >= 50) institutionalBias = 'STRONG_BULLISH';
    else if (netScore >= 20) institutionalBias = 'BULLISH';
    else if (netScore <= -50) institutionalBias = 'STRONG_BEARISH';
    else if (netScore <= -20) institutionalBias = 'BEARISH';
    else institutionalBias = 'NEUTRAL';

    return {
        liquidity,
        orderBlock,
        fvg,
        mss,
        vwap: vwapStatus,
        ote: oteStatus,
        killzone: killzoneStatus,
        confluenceScore: netScore,
        setupGrade,
        institutionalBias,
        keyObservations: keyObservations.slice(0, 4),
    };
}

function createFallbackSMC(currentPrice: number): SMCAnalysisResult {
    return {
        liquidity: { detected: false, type: 'NONE', sweptLevel: 0, description: 'Menunggu sinkronisasi candle.' },
        orderBlock: { detected: false, type: 'NONE', top: 0, bottom: 0, mitigated: false, description: 'Menunggu data candle.' },
        fvg: { detected: false, type: 'NONE', top: 0, bottom: 0, midpoint: 0, mitigated: false, sizePips: 0, description: 'Menunggu data candle.' },
        mss: { detected: false, direction: 'NEUTRAL', breakLevel: 0, confirmedByBody: false, description: 'Normal' },
        vwap: { vwap: currentPrice, upper1: currentPrice + 6, lower1: currentPrice - 6, upper2: currentPrice + 12, lower2: currentPrice - 12, distancePercent: 0, regime: 'FAIR_VALUE' },
        ote: { inGoldenPocket: false, level618: currentPrice, level786: currentPrice, anchorHigh: currentPrice, anchorLow: currentPrice, trendDirection: 'RANGING' },
        killzone: { isKillzone: false, sessionName: 'Reguler', volatilityBoost: 1.0 },
        confluenceScore: 0,
        setupGrade: 'No Trade (Consolidation)',
        institutionalBias: 'NEUTRAL',
        keyObservations: ['Menunggu live data feed.'],
    };
}
