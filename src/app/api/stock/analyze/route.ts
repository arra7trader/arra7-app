import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkStockQuota, useStockQuota } from '@/lib/quota';
import { analyzeWithGroq } from '@/lib/groq-ai';
import { getPredictor } from '@/lib/smart-predictor';
import { formatMarketDataForAI, MarketData } from '@/lib/market-data';

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
                        } catch (e) { console.error(e); }
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

        // Session wrapper for quota function compatibility
        const userSessionId = userId;

        // Check stock quota
        const quotaCheck = await checkStockQuota(userSessionId);
        if (!quotaCheck.allowed) {
            return NextResponse.json(
                {
                    status: 'error',
                    message: quotaCheck.message,
                    quotaStatus: quotaCheck.quotaStatus,
                    waitTimeSeconds: quotaCheck.waitTimeSeconds,
                },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { symbol, stockData, market } = body; // market: 'IDX' | 'US'

        if (!symbol || !stockData) {
            return NextResponse.json(
                { status: 'error', message: 'Invalid request' },
                { status: 400 }
            );
        }

        // === 1. Prepare Market Data for AI ===
        // Convert stockData from frontend to MarketData format needed for formatMarketDataForAI
        // Frontend stockData usually has: currentPrice, change, changePercent, high52Week, etc. and historicalData

        // Map simplified stockData to full MarketData
        const mappingData: MarketData = {
            symbol: symbol,
            name: stockData.name || symbol,
            current_price: stockData.currentPrice,
            open: stockData.open || stockData.currentPrice,
            high: stockData.dayHigh || stockData.currentPrice,
            low: stockData.dayLow || stockData.currentPrice,
            close: stockData.currentPrice,
            change_percent: stockData.changePercent || 0,
            volume: stockData.volume || 0,
            timestamp: new Date().toISOString(),
            is_realtime: true,
            candles: (stockData.historicalData || []).map((h: any) => ({
                time: h.date,
                open: h.open || h.close, // Fallback if limited data
                high: h.high || h.close,
                low: h.low || h.close,
                close: h.close,
                volume: h.volume || 0
            }))
        };

        const marketDataText = formatMarketDataForAI(mappingData, 'Daily', market || 'IDX');

        // === 2. Run SmartPredictor (LSTM) ===
        let mlContext = undefined;
        try {
            const predictor = getPredictor(symbol, 14); // 14 period horizon

            // Prepare history for predictor
            const history = mappingData.candles.map(c => ({
                price: c.close,
                timestamp: new Date(c.time).getTime(),
                volume: c.volume
            }));

            // Generate Prediction
            const prediction = predictor.predictStock(mappingData.current_price, history);

            mlContext = {
                direction: prediction.direction,
                winrate: Math.round(prediction.confidence * 100), // Map confidence to winrate representation
                confidence: prediction.confidence,
                isAvailable: true
            };

            console.log(`[StockML] ${symbol} Prediction: ${prediction.direction} (${prediction.confidence})`);
        } catch (e) {
            console.error('Stock ML Error:', e);
            // Non-blocking, continue without ML
        }


        // === 3. Call Groq AI ===
        // Uses the standardized 'Quantum' Prompt logic via analyzeWithGroq
        const aiResult = await analyzeWithGroq(marketDataText, mlContext);

        if (!aiResult.success || !aiResult.analysis) {
            throw new Error(aiResult.error || 'AI Analysis Failed');
        }

        // Use quota after successful analysis
        await useStockQuota(userSessionId);

        // Save to history
        try {
            const turso = (await import('@/lib/turso')).default();
            if (turso) {
                await turso.execute({
                    sql: 'INSERT INTO analysis_history (user_id, type, symbol, timeframe, result) VALUES (?, ?, ?, ?, ?)',
                    args: [userSessionId, 'stock', symbol, null, aiResult.analysis],
                });
            }
        } catch (historyError) {
            console.error('Failed to save to history:', historyError);
        }

        // Save signal for performance tracking
        let nativeSignalData = null;
        try {
            const { parseSignalFromAnalysis, saveSignal, forceSaveSignal } = await import('@/lib/signal-tracker');

            const signalData = parseSignalFromAnalysis(aiResult.analysis, 'stock', symbol);
            if (signalData) {
                const saved = await saveSignal(signalData);
                nativeSignalData = signalData;
            } else {
                // Fallback parsing (simplified relative to the complex function)
                // Actually relying on parseSignalFromAnalysis is best as it handles the new format.
            }
        } catch (signalError) {
            console.error('Failed to save signal:', signalError);
        }

        return NextResponse.json({
            status: 'success',
            analysis: aiResult.analysis,
            formattedHtml: aiResult.formattedHtml, // Include the nice HTML
            parsedSignal: nativeSignalData,
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error('Stock analysis error:', error);
        return NextResponse.json(
            { status: 'error', message: error instanceof Error ? error.message : 'Analysis failed' },
            { status: 500 }
        );
    }
}
