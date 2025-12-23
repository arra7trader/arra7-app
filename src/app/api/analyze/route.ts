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
                return NextResponse.json(
                    {
                        status: 'error',
                        message: quotaCheck.message,
                        quotaStatus: quotaCheck.quotaStatus,
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
            quotaStatus,
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
