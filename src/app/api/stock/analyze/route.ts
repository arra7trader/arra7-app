import { NextRequest, NextResponse } from 'next/server';
import { checkStockQuota, useStockQuota } from '@/lib/quota';
import { analyzeWithGroq } from '@/lib/groq-ai';
import { getPredictor } from '@/lib/smart-predictor';
import { formatMarketDataForAI, MarketData } from '@/lib/market-data';
import { resolveUserOrDevice } from '@/lib/auth-device';

export async function POST(request: NextRequest) {
    try {
        let body: any = {};
        try {
            body = await request.json();
        } catch {
            body = {};
        }

        const { symbol, stockData, market, deviceId } = body; // market: 'IDX' | 'US'

        if (!symbol || !stockData) {
            return NextResponse.json(
                { status: 'error', message: 'Invalid request' },
                { status: 400 }
            );
        }

        // Frictionless auth: resolve user or device license without requiring Google login
        const resolvedUser = await resolveUserOrDevice(request, deviceId);
        const userSessionId = resolvedUser.userId;

        // Check stock quota (VVIP / full access has unlimited quota)
        if (!resolvedUser.isFullAccess) {
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
        }

        // === 1. Prepare Market Data for AI ===
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
                open: h.open || h.close,
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

            const history = mappingData.candles.map(c => ({
                price: c.close,
                timestamp: new Date(c.time).getTime(),
                volume: c.volume
            }));

            const prediction = predictor.predictStock(mappingData.current_price, history);

            mlContext = {
                direction: prediction.direction,
                winrate: Math.round(prediction.confidence * 100),
                confidence: prediction.confidence,
                isAvailable: true
            };
        } catch (e) {
            console.error('Stock ML Error:', e);
        }

        // === 3. Call Groq AI ===
        const aiResult = await analyzeWithGroq(marketDataText, mlContext);

        if (!aiResult.success || !aiResult.analysis) {
            throw new Error(aiResult.error || 'AI Analysis Failed');
        }

        // Use quota after successful analysis
        await useStockQuota(userSessionId).catch(() => {});

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
            const { parseSignalFromAnalysis, saveSignal } = await import('@/lib/signal-tracker');
            const signalData = parseSignalFromAnalysis(aiResult.analysis, 'stock', symbol);
            if (signalData) {
                await saveSignal(signalData);
                nativeSignalData = signalData;
            }
        } catch (signalError) {
            console.error('Failed to save signal:', signalError);
        }

        return NextResponse.json({
            status: 'success',
            analysis: aiResult.analysis,
            formattedHtml: aiResult.formattedHtml,
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
