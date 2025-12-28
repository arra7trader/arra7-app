import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMarketData, formatMarketDataForAI, ForexPair, Timeframe, FOREX_PAIRS, TIMEFRAMES } from '@/lib/market-data';
import { analyzeWithGroq } from '@/lib/groq-ai';
import { checkQuota, useQuota, getQuotaStatus } from '@/lib/quota';

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { status: 'error', message: 'Silakan login terlebih dahulu' },
                { status: 401 }
            );
        }

        const userId = session.user.id;

        // Parse request body
        const body = await request.json();
        const { pair, timeframe } = body as { pair: string; timeframe: string };

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
                    },
                    { status: 403 }
                );
            }
        }

        // Get market data
        const marketData = await getMarketData(pair as ForexPair, timeframe as Timeframe);
        const formattedData = formatMarketDataForAI(marketData, timeframe);

        // Call AI for analysis
        const aiResult = await analyzeWithGroq(formattedData);

        if (!aiResult.success) {
            return NextResponse.json(
                { status: 'error', message: aiResult.error || 'AI Analysis failed' },
                { status: 500 }
            );
        }

        // Use quota after successful analysis (only if Turso is configured)
        let quotaStatus = null;
        if (process.env.TURSO_DATABASE_URL) {
            await useQuota(userId);
            quotaStatus = await getQuotaStatus(userId);
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

        // Save signal for performance tracking
        try {
            const { parseSignalFromAnalysis, saveSignal, forceSaveSignal } = await import('@/lib/signal-tracker');
            if (aiResult.analysis) {
                const signalData = parseSignalFromAnalysis(aiResult.analysis, 'forex', pair, timeframe);
                if (signalData) {
                    const saved = await saveSignal(signalData);
                    console.log('[Analyze] Signal saved via parsing:', saved);
                } else {
                    // Fallback: try to determine direction and force save with current price
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
                    }
                }
            }
        } catch (signalError) {
            console.error('Failed to save signal:', signalError);
        }

        // Serialize quotaStatus - convert Infinity to -1 for JSON
        const serializedQuotaStatus = quotaStatus ? {
            ...quotaStatus,
            dailyLimit: quotaStatus.dailyLimit === Infinity ? -1 : quotaStatus.dailyLimit,
            remaining: quotaStatus.remaining === Infinity ? -1 : quotaStatus.remaining,
        } : null;

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
            },
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
