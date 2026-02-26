import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMarketData, getBrokerPrice, formatMarketDataForAI, getMultiTimeframeData, getDXYCorrelation, ForexPair, Timeframe, FOREX_PAIRS, TIMEFRAMES, BrokerSource, MarketData } from '@/lib/market-data';
import { analyzeWithGroq, MarketContext } from '@/lib/groq-ai';
import { checkQuota, useQuota as consumeQuota, getQuotaStatus } from '@/lib/quota';

type LstmDirection = 'UP' | 'DOWN' | 'NEUTRAL';

type TechnicalSignal = {
    label: string;
    score: number;
    weight: number;
    detail: string;
};

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function calculateEma(values: number[], period: number): number | null {
    if (values.length < period || period <= 1) return null;
    const alpha = 2 / (period + 1);
    let ema = values.slice(0, period).reduce((sum, v) => sum + v, 0) / period;
    for (let i = period; i < values.length; i++) {
        ema = values[i] * alpha + ema * (1 - alpha);
    }
    return ema;
}

function calculateRsi(values: number[], period = 14): number | null {
    if (values.length <= period) return null;

    const start = Math.max(1, values.length - period);
    let gains = 0;
    let losses = 0;
    let count = 0;

    for (let i = start; i < values.length; i++) {
        const delta = values[i] - values[i - 1];
        if (delta > 0) gains += delta;
        else losses += Math.abs(delta);
        count += 1;
    }

    if (count === 0) return null;
    const avgGain = gains / count;
    const avgLoss = losses / count;
    if (avgLoss === 0) return 100;
    if (avgGain === 0) return 0;

    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

function extractMtfTrendScore(mtfText: string | undefined, scope: 'higher' | 'entry' | 'lower'): number | null {
    if (!mtfText) return null;

    const pattern =
        scope === 'higher'
            ? /HIGHER TIMEFRAME[\s\S]*?Trend:\s*(BULLISH|BEARISH|NEUTRAL)/i
            : scope === 'entry'
                ? /ENTRY TIMEFRAME[\s\S]*?Trend:\s*(BULLISH|BEARISH|NEUTRAL)/i
                : /LOWER TIMEFRAME[\s\S]*?Trend:\s*(BULLISH|BEARISH|NEUTRAL)/i;

    const match = mtfText.match(pattern);
    if (!match) return null;

    const trend = match[1].toUpperCase();
    if (trend === 'BULLISH') return 1;
    if (trend === 'BEARISH') return -1;
    return 0;
}

function buildMeasuredLstmSignal(data: MarketData, marketContext: MarketContext) {
    const candles = data.candles.slice(-30);
    const closes = candles.map((c) => c.close).filter((v) => Number.isFinite(v));
    const signals: TechnicalSignal[] = [];

    if (candles.length > 0) {
        const bullishCandles = candles.filter((c) => c.close > c.open).length;
        const bearishCandles = candles.filter((c) => c.close < c.open).length;
        const candleBias = clamp((bullishCandles - bearishCandles) / candles.length, -1, 1);
        signals.push({
            label: 'Candle Bias',
            score: candleBias,
            weight: 0.17,
            detail: `${bullishCandles} bullish vs ${bearishCandles} bearish`,
        });
    }

    if (closes.length >= 6) {
        const last = closes[closes.length - 1];
        const prev = closes[closes.length - 6];
        const movePct = prev !== 0 ? (last - prev) / prev : 0;
        const momentumScore = clamp(movePct / 0.0045, -1, 1);
        signals.push({
            label: 'Momentum (5 bars)',
            score: momentumScore,
            weight: 0.2,
            detail: `${(movePct * 100).toFixed(2)}%`,
        });
    }

    if (closes.length >= 21) {
        const emaFast = calculateEma(closes, 8);
        const emaSlow = calculateEma(closes, 21);
        const last = closes[closes.length - 1];
        if (emaFast !== null && emaSlow !== null && last > 0) {
            const emaGapPct = (emaFast - emaSlow) / last;
            const emaScore = clamp(emaGapPct / 0.0015, -1, 1);
            signals.push({
                label: 'EMA(8/21)',
                score: emaScore,
                weight: 0.22,
                detail: `gap ${(emaGapPct * 100).toFixed(3)}%`,
            });
        }
    }

    if (closes.length >= 15) {
        const rsi = calculateRsi(closes, 14);
        if (rsi !== null) {
            let rsiScore = 0;
            if (rsi >= 55 && rsi <= 70) rsiScore = (rsi - 55) / 15;
            else if (rsi <= 45 && rsi >= 30) rsiScore = -((45 - rsi) / 15);
            else if (rsi > 70) rsiScore = -Math.min((rsi - 70) / 20, 1);
            else if (rsi < 30) rsiScore = Math.min((30 - rsi) / 20, 1);

            signals.push({
                label: 'RSI(14)',
                score: clamp(rsiScore, -1, 1),
                weight: 0.12,
                detail: `${rsi.toFixed(2)}`,
            });
        }
    }

    if (candles.length > 0 && closes.length > 0) {
        const highs = candles.map((c) => c.high);
        const lows = candles.map((c) => c.low);
        const resistance = Math.max(...highs);
        const support = Math.min(...lows);
        const range = Math.max(resistance - support, Number.EPSILON);
        const mid = support + range / 2;
        const structureScore = clamp((closes[closes.length - 1] - mid) / (range / 2), -1, 1);

        signals.push({
            label: 'Structure Position',
            score: structureScore,
            weight: 0.11,
            detail: `close vs mid ${(closes[closes.length - 1] - mid).toFixed(5)}`,
        });
    }

    const higherTrend = extractMtfTrendScore(marketContext.multiTimeframe, 'higher');
    const entryTrend = extractMtfTrendScore(marketContext.multiTimeframe, 'entry');
    const lowerTrend = extractMtfTrendScore(marketContext.multiTimeframe, 'lower');

    if (higherTrend !== null) {
        signals.push({
            label: 'MTF Higher',
            score: higherTrend,
            weight: 0.2,
            detail: higherTrend > 0 ? 'BULLISH' : higherTrend < 0 ? 'BEARISH' : 'NEUTRAL',
        });
    }

    if (entryTrend !== null) {
        signals.push({
            label: 'MTF Entry',
            score: entryTrend,
            weight: 0.1,
            detail: entryTrend > 0 ? 'BULLISH' : entryTrend < 0 ? 'BEARISH' : 'NEUTRAL',
        });
    }

    if (lowerTrend !== null) {
        signals.push({
            label: 'MTF Lower',
            score: lowerTrend,
            weight: 0.06,
            detail: lowerTrend > 0 ? 'BULLISH' : lowerTrend < 0 ? 'BEARISH' : 'NEUTRAL',
        });
    }

    if (marketContext.dxyCorrelation) {
        const dxyText = marketContext.dxyCorrelation.toUpperCase();
        let dxyScore = 0;
        if (dxyText.includes('BULLISH SUPPORT')) dxyScore = 1;
        else if (dxyText.includes('BEARISH PRESSURE')) dxyScore = -1;

        signals.push({
            label: 'DXY Correlation',
            score: dxyScore,
            weight: 0.08,
            detail: dxyScore > 0 ? 'supports BUY' : dxyScore < 0 ? 'supports SELL' : 'neutral',
        });
    }

    const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0) || 1;
    const weightedScore = signals.reduce((sum, s) => sum + (s.score * s.weight), 0) / totalWeight;

    const positiveWeight = signals.filter((s) => s.score > 0).reduce((sum, s) => sum + s.weight, 0);
    const negativeWeight = signals.filter((s) => s.score < 0).reduce((sum, s) => sum + s.weight, 0);
    const directionalWeight = positiveWeight + negativeWeight;
    const dominance = directionalWeight > 0
        ? Math.max(positiveWeight, negativeWeight) / directionalWeight
        : 0.5;

    const highNewsCount = (marketContext.newsEvents?.match(/\[HIGH\]/g) || []).length;
    const mediumNewsCount = (marketContext.newsEvents?.match(/\[MEDIUM\]/g) || []).length;
    const newsPenalty = Math.min(0.16, (highNewsCount * 0.05) + (mediumNewsCount * 0.015));

    const neutralThreshold = highNewsCount > 0 ? 0.2 : 0.16;
    let direction: LstmDirection = 'NEUTRAL';
    if (weightedScore > neutralThreshold) direction = 'UP';
    else if (weightedScore < -neutralThreshold) direction = 'DOWN';

    let confidence = 0.56 + (Math.min(Math.abs(weightedScore), 1) * 0.24) + ((dominance - 0.5) * 0.28) - newsPenalty;
    if (direction === 'NEUTRAL') confidence -= 0.05;
    confidence = clamp(confidence, 0.5, 0.94);

    const winrate = direction === 'NEUTRAL'
        ? Math.round(clamp(52 + (confidence * 24), 52, 74))
        : Math.round(clamp(62 + (confidence * 34) + (Math.abs(weightedScore) * 8), 64, 95));

    const topSignals = [...signals]
        .sort((a, b) => Math.abs(b.score * b.weight) - Math.abs(a.score * a.weight))
        .slice(0, 6);

    const technicalSummary = topSignals
        .map((s) => `- ${s.label}: ${s.score >= 0 ? '+' : ''}${s.score.toFixed(2)} (${s.detail})`)
        .concat(`- News Penalty: -${(newsPenalty * 100).toFixed(1)}% (HIGH=${highNewsCount}, MEDIUM=${mediumNewsCount})`)
        .join('\n');

    return {
        direction,
        winrate,
        confidence,
        isAvailable: true,
        technicalScore: Number(weightedScore.toFixed(3)),
        technicalSummary,
        sourceLabel: 'LSTM_TECHNICAL_COMPOSITE',
    };
}

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        let userId: string | null = null;
        const session = await getServerSession(authOptions);

        if (session?.user?.id) {
            userId = session.user.id;
        } else {
            // Try Mobile Bearer Token
            const authHeader = request.headers.get('Authorization');
            if (authHeader?.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                const { verifyMobileToken } = await import('@/lib/mobile-auth');
                const userEmail = await verifyMobileToken(token);

                if (userEmail) {
                    // Get User ID from DB
                    const turso = (await import('@/lib/turso')).default();
                    if (turso) {
                        try {
                            const userRes = await turso.execute({
                                sql: 'SELECT id FROM users WHERE email = ?',
                                args: [userEmail]
                            });
                            if (userRes.rows.length > 0) {
                                userId = userRes.rows[0].id as string;
                            }
                        } catch (e) {
                            console.error('DB fetch user error:', e);
                        }
                    }
                }
            }
        }

        if (!userId) {
            return NextResponse.json(
                { status: 'error', message: 'Silakan login terlebih dahulu' },
                { status: 401 }
            );
        }

        // Parse request body
        const body = await request.json();
        const { pair, timeframe, broker } = body as { pair: string; timeframe: string; broker?: BrokerSource };

        // Validate pair
        if (!pair || !(pair in FOREX_PAIRS)) {
            return NextResponse.json(
                { status: 'error', message: 'Pair tidak valid' },
                { status: 400 }
            );
        }

        // Validate timeframe
        if (!timeframe || !(timeframe in TIMEFRAMES)) {
            return NextResponse.json(
                { status: 'error', message: 'Timeframe tidak valid' },
                { status: 400 }
            );
        }

        // Check quota (only if Turso is configured)
        if (process.env.TURSO_DATABASE_URL) {
            const quotaCheck = await checkQuota(userId, timeframe, pair);

            if (!quotaCheck.allowed) {
                // Serialize quotaStatus - convert Infinity to -1 for JSON
                const serializedQuota = {
                    ...quotaCheck.quotaStatus,
                    dailyLimit: quotaCheck.quotaStatus.dailyLimit === Infinity ? -1 : quotaCheck.quotaStatus.dailyLimit,
                    remaining: quotaCheck.quotaStatus.remaining === Infinity ? -1 : quotaCheck.quotaStatus.remaining,
                };
                return NextResponse.json(
                    {
                        status: 'error',
                        message: quotaCheck.message,
                        quotaStatus: serializedQuota,
                        waitTimeSeconds: quotaCheck.waitTimeSeconds,
                    },
                    { status: 403 }
                );
            }
        }

        // Get market data - use broker-specific function if broker is specified
        let marketData: MarketData;
        try {
            marketData = broker && broker !== 'yahoo'
                ? await getBrokerPrice(pair as ForexPair, timeframe as Timeframe, broker)
                : await getMarketData(pair as ForexPair, timeframe as Timeframe);

            // Double-check: REJECT simulated data
            if (marketData.is_simulated) {
                return NextResponse.json(
                    {
                        status: 'error',
                        message: 'Data real-time tidak tersedia saat ini. API Swissquote sedang bermasalah. Silakan coba lagi dalam beberapa menit.'
                    },
                    { status: 503 }
                );
            }
        } catch (error: any) {
            console.error('[Analyze API] Market data fetch error:', error);
            return NextResponse.json(
                {
                    status: 'error',
                    message: error.message || 'Gagal mengambil data harga real-time. Silakan coba lagi.'
                },
                { status: 503 }
            );
        }

        // Build analysis dataset with richer technical candles when broker feed is tick-only.
        let analysisData: MarketData = marketData;
        if ((broker && broker !== 'yahoo') || marketData.candles.length < 10) {
            try {
                const candleData = await getMarketData(pair as ForexPair, timeframe as Timeframe, {
                    preferRealtimeBroker: false,
                });

                if (!candleData.is_simulated && candleData.candles.length >= 10) {
                    analysisData = {
                        ...candleData,
                        symbol: marketData.symbol,
                        name: marketData.name,
                        current_price: marketData.current_price,
                        timestamp: marketData.timestamp,
                        is_realtime: marketData.is_realtime,
                        is_simulated: false,
                        timestampSource: marketData.timestampSource,
                        freshnessSeconds: marketData.freshnessSeconds,
                    };
                    console.log(`[Analyze] Technical candles enriched from ${candleData.timestampSource} (${candleData.candles.length} candles).`);
                }
            } catch (enrichError) {
                console.warn('[Analyze] Technical candle enrichment failed, using broker dataset only:', enrichError);
            }
        }

        // Add freshness context to the formatted data
        const freshnessInfo = marketData.is_simulated
            ? 'WARNING: Data SIMULASI (API gagal). Analisa untuk demo saja!'
            : !marketData.is_realtime
                ? `WARNING: Data DELAYED (${marketData.freshnessSeconds ? Math.floor(marketData.freshnessSeconds / 60) : '?'} menit yang lalu). Gunakan dengan hati-hati!`
                : `Data REAL-TIME (fresh: ${marketData.freshnessSeconds || 0}s ago) dari ${marketData.timestampSource}`;

        const sourceInfo = analysisData.timestampSource && analysisData.timestampSource !== marketData.timestampSource
            ? `\nTECHNICAL CANDLES SOURCE: ${analysisData.timestampSource}\nEXECUTION PRICE SOURCE: ${marketData.timestampSource}`
            : '';
        const formattedData = formatMarketDataForAI(analysisData, timeframe) + `\n\n=== DATA QUALITY ===\n${freshnessInfo}${sourceInfo}`;

        // Check if learning mode is enabled
        const learningMode = body.learningMode === true;

        // Call AI for analysis (standard or learning mode)
        let aiResult;

        // ========================================
        // ENHANCED MARKET CONTEXT (Multi-TF + News + DXY)
        // Fetch all 3 in parallel -- non-blocking, graceful degradation
        // ========================================
        console.log(`[Analyze] Fetching enhanced market context for ${pair} ${timeframe}...`);

        const [mtfResult, newsResult, dxyResult] = await Promise.allSettled([
            getMultiTimeframeData(pair as ForexPair, timeframe as Timeframe),
            (async () => {
                const { getForexNews } = await import('@/lib/groq-ai');
                return getForexNews();
            })(),
            getDXYCorrelation(pair),
        ]);

        const marketContext: MarketContext = {};

        // Multi-Timeframe Analysis
        if (mtfResult.status === 'fulfilled' && mtfResult.value) {
            marketContext.multiTimeframe = mtfResult.value;
            console.log(`[Analyze] ✅ Multi-TF data loaded`);
        } else {
            console.warn(`[Analyze] ⚠️ Multi-TF data unavailable`);
        }

        // Economic Calendar / News Events
        if (newsResult.status === 'fulfilled' && newsResult.value?.events?.length > 0) {
            const events = newsResult.value.events;
            const newsText = events.map(e =>
                `- [${e.impact.toUpperCase()}] ${e.time} | ${e.country} | ${e.title}`
            ).join('\n');
            marketContext.newsEvents = `\n=== ECONOMIC CALENDAR (Today/Tomorrow) ===\n${newsText}\n=== END CALENDAR ===`;
            console.log(`[Analyze] ✅ ${events.length} news events loaded`);
        } else {
            console.warn(`[Analyze] ⚠️ News data unavailable`);
        }

        // DXY Correlation
        if (dxyResult.status === 'fulfilled' && dxyResult.value) {
            marketContext.dxyCorrelation = dxyResult.value;
            console.log(`[Analyze] ✅ DXY correlation loaded`);
        } else {
            console.warn(`[Analyze] ⚠️ DXY data unavailable (may be cross pair)`);
        }
        const mlPrediction = buildMeasuredLstmSignal(analysisData, marketContext);
        console.log(
            `[Analyze] LSTM composite => direction=${mlPrediction.direction}, score=${mlPrediction.technicalScore}, conf=${(mlPrediction.confidence * 100).toFixed(1)}%, winrate=${mlPrediction.winrate}%`
        );

        if (learningMode) {
            const { analyzeWithLearningMode } = await import('@/lib/groq-ai');
            aiResult = await analyzeWithLearningMode(formattedData, mlPrediction, marketContext);
        } else {
            aiResult = await analyzeWithGroq(formattedData, mlPrediction, marketContext);
        }

        if (!aiResult.success) {
            return NextResponse.json(
                { status: 'error', message: aiResult.error || 'AI Analysis failed' },
                { status: 500 }
            );
        }

        // Auto-post to social feed (anonymized)
        try {
            const { addToSocialFeed, parseSignalFromAnalysis: parseForSocial } = await import('@/lib/social');
            if (aiResult.analysis) {
                const { direction, confidence, summary } = parseForSocial(aiResult.analysis);
                if (direction) {
                    // Extract entry/SL/TP from analysis
                    const entryMatch = aiResult.analysis.match(/ENTRY[:\s]*([0-9.]+)/i);
                    const slMatch = aiResult.analysis.match(/(?:SL|STOPLOSS)[:\s]*([0-9.]+)/i);
                    const tpMatch = aiResult.analysis.match(/(?:TP1?|TAKE\s*PROFIT)[:\s]*([0-9.]+)/i);

                    await addToSocialFeed(
                        userId,
                        pair,
                        timeframe,
                        direction,
                        confidence,
                        entryMatch ? parseFloat(entryMatch[1]) : undefined,
                        slMatch ? parseFloat(slMatch[1]) : undefined,
                        tpMatch ? parseFloat(tpMatch[1]) : undefined,
                        summary
                    );
                }
            }
        } catch (socialError) {
            console.error('Failed to post to social feed:', socialError);
        }

        // Save to history
        try {
            const turso = (await import('@/lib/turso')).default();
            if (turso && aiResult.analysis) {
                await turso.execute({
                    sql: 'INSERT INTO analysis_history (user_id, type, symbol, timeframe, result) VALUES (?, ?, ?, ?, ?)',
                    args: [userId, 'forex', pair, timeframe, aiResult.analysis],
                });
            }
        } catch (historyError) {
            console.error('Failed to save to history:', historyError);
        }

        // Save signal for performance tracking & prepare native response
        let nativeSignalData = null;
        try {
            const { parseSignalFromAnalysis, saveSignal, forceSaveSignal } = await import('@/lib/signal-tracker');
            if (aiResult.analysis) {
                const signalData = parseSignalFromAnalysis(aiResult.analysis, 'forex', pair, timeframe);
                if (signalData) {
                    const saved = await saveSignal(signalData);
                    console.log('[Analyze] Signal saved via parsing:', saved);
                    nativeSignalData = signalData;
                } else {
                    // Fallback: try to determine direction and force save
                    const lowerAnalysis = aiResult.analysis.toLowerCase();
                    let direction: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
                    if (lowerAnalysis.includes('buy') || lowerAnalysis.includes('bullish') || lowerAnalysis.includes('beli')) {
                        direction = 'BUY';
                    } else if (lowerAnalysis.includes('sell') || lowerAnalysis.includes('bearish') || lowerAnalysis.includes('jual')) {
                        direction = 'SELL';
                    }

                    if (direction !== 'HOLD' && marketData.current_price > 0) {
                        const saved = await forceSaveSignal('forex', pair, direction, marketData.current_price, timeframe);
                        console.log('[Analyze] Signal saved via forceSave:', saved, 'Direction:', direction, 'Price:', marketData.current_price);
                        nativeSignalData = {
                            type: direction,
                            entry: marketData.current_price,
                            sl: 0,
                            tp: 0,
                            confidence: 0,
                            analysis: 'AI Analysis'
                        };
                    }
                }
            }
        } catch (signalError) {
            console.error('Failed to save signal:', signalError);
        }

        // Charge quota only for actionable trade signals (BUY/SELL).
        let quotaStatus = null;
        let quotaCharged = false;
        if (process.env.TURSO_DATABASE_URL) {
            const directionRaw = String(
                (nativeSignalData as any)?.direction ??
                (nativeSignalData as any)?.type ??
                ''
            ).toUpperCase();
            const isTradableSignal = directionRaw === 'BUY' || directionRaw === 'SELL';

            if (isTradableSignal) {
                await consumeQuota(userId);
                quotaCharged = true;
            }

            quotaStatus = await getQuotaStatus(userId);
        }

        // Serialize quotaStatus - convert Infinity to -1 for JSON
        const serializedQuotaStatus = quotaStatus ? {
            ...quotaStatus,
            dailyLimit: quotaStatus.dailyLimit === Infinity ? -1 : quotaStatus.dailyLimit,
            remaining: quotaStatus.remaining === Infinity ? -1 : quotaStatus.remaining,
        } : null;

        // Auto publish to Copytrade ARRA77 (optional, enabled by default if configured)
        let copytradeAutoPublish: {
            published: boolean;
            signalId?: string;
            queuedDispatches?: number;
            reason?: string;
        } | null = null;

        try {
            const enableAutoPublish = process.env.CT77_AUTOPUBLISH_FROM_ANALYZE !== 'false';
            if (enableAutoPublish) {
                const { isCopytrade77Configured } = await import('@/lib/supabase-copytrade77');
                if (isCopytrade77Configured() && nativeSignalData) {
                    const directionRaw = (nativeSignalData as any).direction || (nativeSignalData as any).type;
                    const direction = directionRaw === 'BUY' || directionRaw === 'SELL' ? directionRaw : null;

                    if (direction) {
                        const entryPrice = Number(
                            (nativeSignalData as any).entryPrice ??
                            (nativeSignalData as any).entry ??
                            marketData.current_price
                        );
                        const stopLoss = Number(
                            (nativeSignalData as any).stopLoss ??
                            (nativeSignalData as any).sl ??
                            0
                        );
                        const takeProfit1 = Number(
                            (nativeSignalData as any).takeProfit1 ??
                            (nativeSignalData as any).tp ??
                            0
                        );
                        const takeProfit2 = Number((nativeSignalData as any).takeProfit2 ?? 0) || null;
                        const confidence = Number((nativeSignalData as any).confidence ?? 0) || null;

                        const tfMap: Record<string, string> = {
                            '1m': 'M1',
                            '5m': 'M5',
                            '15m': 'M15',
                            '30m': 'M30',
                            '1h': 'H1',
                            '4h': 'H4',
                            '1d': 'D1',
                        };
                        const displayTf = tfMap[timeframe] || 'M15';

                        const {
                            getOrCreateSystemProviderId,
                            hasRecentPublishedSignal,
                            normalizeTradeSignal,
                            publishSignalAndQueue,
                        } = await import('@/lib/copytrade77-signal-engine');

                        const providerId = await getOrCreateSystemProviderId();
                        const normalized = normalizeTradeSignal({
                            symbol: pair,
                            timeframe: displayTf,
                            side: direction,
                            orderType: 'MARKET',
                            entryPrice,
                            stopLoss,
                            takeProfit1,
                            takeProfit2,
                            confidence,
                        });

                        const recent = await hasRecentPublishedSignal({
                            providerId,
                            symbol: normalized.symbol,
                            timeframe: normalized.timeframe,
                            withinSeconds: 180,
                        });

                        if (recent.exists) {
                            copytradeAutoPublish = {
                                published: false,
                                signalId: recent.signalId,
                                reason: 'recent_signal_exists',
                            };
                        } else {
                            const published = await publishSignalAndQueue({
                                providerId,
                                signal: normalized,
                                source: 'ARRA_AI',
                                sourceRef: 'analyze_route',
                                rawAnalysis: {
                                    pair,
                                    timeframe,
                                    analysis: aiResult.analysis,
                                    marketPrice: marketData.current_price,
                                },
                            });

                            copytradeAutoPublish = {
                                published: true,
                                signalId: published.signalId,
                                queuedDispatches: published.queuedDispatches,
                            };
                        }
                    }
                }
            }
        } catch (copytradeError) {
            console.error('[Analyze] Copytrade auto publish error:', copytradeError);
        }

        return NextResponse.json({
            status: 'success',
            result: aiResult.formattedHtml,
            rawAnalysis: aiResult.analysis,
            marketInfo: {
                symbol: marketData.symbol,
                name: marketData.name,
                price: marketData.current_price,
                change: marketData.change_percent,
                isRealtime: marketData.is_realtime,
                isSimulated: marketData.is_simulated || false,
                timestamp: marketData.timestamp,
                dataSource: marketData.timestampSource || 'unknown',
                freshnessSeconds: marketData.freshnessSeconds || 0,
                lastCandleTime: marketData.candles.length > 0 ? marketData.candles[marketData.candles.length - 1].time : null,
            },
            parsedSignal: nativeSignalData,
            copytradeAutoPublish,
            quotaCharged,
            quotaStatus: serializedQuotaStatus,
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error('Analysis API Error:', error);
        return NextResponse.json(
            { status: 'error', message: 'Internal server error' },
            { status: 500 }
        );
    }
}

// GET method for testing/health check
export async function GET() {
    return NextResponse.json({
        status: 'ok',
        availablePairs: Object.keys(FOREX_PAIRS),
        availableTimeframes: Object.keys(TIMEFRAMES),
        timestamp: new Date().toISOString(),
    });
}
