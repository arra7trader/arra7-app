import { NextResponse } from 'next/server';
import { CRYPTO, FOREX_PAIRS } from '@/lib/market-data';
import { getCronosMarketData, type CronosTimeframe } from '@/lib/arra-cronos-market';
import { getCronosAnalysisHistory } from '@/lib/arra-cronos-analysis';
import { buildKronosQuantReview, getCompletedCronosCandles } from '@/lib/arra-cronos-engine';
import { resolveUserOrDevice } from '@/lib/auth-device';
import { checkQuota, useQuota } from '@/lib/quota';
import { isMarketOpen } from '@/lib/market-hours';
import { isActionableMarketQuote } from '@/lib/arra-cronos-market';
import { recordArraMarketObservation } from '@/lib/arra-market-observations';
import { recordAndEvaluateCronosSetups } from '@/lib/arra-cronos-setups';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const TIMEFRAMES = {
    '15m': { seconds: 900, bars: 12 },
    '1h': { seconds: 3_600, bars: 12 },
    '4h': { seconds: 14_400, bars: 12 },
    '1d': { seconds: 86_400, bars: 7 },
} as const;

const rateWindowMs = 60_000;
const rateLimit = 60;
const recentRequests = new Map<string, number[]>();

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const symbol = String(body.symbol || '').toUpperCase();
        const timeframe = String(body.timeframe || '') as keyof typeof TIMEFRAMES;
        const config = TIMEFRAMES[timeframe];
        if (!Object.prototype.hasOwnProperty.call(FOREX_PAIRS, symbol) || !config) {
            return NextResponse.json({ error: 'Instrumen atau timeframe tidak didukung.' }, { status: 400 });
        }

        const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
        const clientKey = forwardedFor || request.headers.get('x-real-ip') || 'unknown-client';
        const now = Date.now();
        const recent = (recentRequests.get(clientKey) || []).filter((time) => now - time < rateWindowMs);
        if (recent.length >= rateLimit) {
            return NextResponse.json({ error: 'Batas permintaan tinjauan tercapai. Coba lagi sebentar.' }, { status: 429 });
        }
        recent.push(now);
        recentRequests.set(clientKey, recent);

        let userId: string | null = null;
        // Quota check only if specifically configured
        if (process.env.ARRA_CRONOS_REQUIRE_QUOTA === 'true' && process.env.TURSO_DATABASE_URL) {
            try {
                const user = await resolveUserOrDevice(request);
                const quota = await checkQuota(user.userId, timeframe, symbol);
                if (!quota.allowed) {
                    return NextResponse.json({ error: quota.message || 'Kuota tinjauan tidak tersedia.' }, { status: 403 });
                }
                userId = user.userId;
            } catch {
                // Allow unmetered if quota service is temporarily down
            }
        }

        const resolvedTimeframe = timeframe as CronosTimeframe;
        const market = await getCronosMarketData(symbol, resolvedTimeframe);
        const isCrypto = Object.prototype.hasOwnProperty.call(CRYPTO, symbol);
        const completedCandles = getCompletedCronosCandles(market.candles, resolvedTimeframe);
        // Review and persist completed observed candles only.
        const started = Date.now();
        const mtfHistory = await getCronosAnalysisHistory(symbol, market);
        const result = buildKronosQuantReview(
            symbol,
            resolvedTimeframe,
            completedCandles,
            mtfHistory,
            completedCandles.at(-1)?.close ?? market.currentPrice
        );
        const hasLiveQuote = isActionableMarketQuote(market);
        const marketOpen = isCrypto || isMarketOpen(symbol).isOpen;
        if (!hasLiveQuote || !marketOpen) {
            result.action = 'WAIT';
            result.scenarioSetup.action = 'WAIT';
            result.commentary = !marketOpen
                ? `Pasar ${symbol} sedang tutup. Jalur forecast tetap berupa estimasi teknikal; status setup WAIT sampai sesi dibuka dan data terbaru tersedia.`
                : `${symbol} ${timeframe.toUpperCase()}: WAIT karena kuotasi langsung segar tidak tersedia. Jalur forecast adalah estimasi dari candle historis; level setup menunggu feed terbaru.`;
        }
        const elapsedMs = Date.now() - started;

        const barTime = completedCandles.at(-1)?.time;
        const setupTracking = await recordAndEvaluateCronosSetups({
            symbol,
            timeframe: resolvedTimeframe,
            candles: completedCandles,
            candidate: barTime && result.action !== 'WAIT' && hasLiveQuote && marketOpen
                ? {
                    symbol,
                    timeframe: resolvedTimeframe,
                    setupBarTime: barTime,
                    scenario: { ...result.scenarioSetup, action: result.action },
                    forecast: result.forecast,
                }
                : null,
        });
        if (!setupTracking.persistenceAvailable) {
            result.action = 'WAIT';
            result.scenarioSetup.action = 'WAIT';
            result.commentary = `${result.commentary} Setup tidak diberi status BUY/SELL karena penyimpanan hasil candle tidak tersedia; levels estimasi dapat berubah.`;
        }
        const activeSetup = setupTracking.setups.find((setup) => setup.status === 'OPEN' || setup.status === 'TP1_HIT');
        if (activeSetup) {
            result.forecast = activeSetup.forecast;
            result.scenarioSetup = {
                action: activeSetup.side,
                side: activeSetup.side,
                entryPrice: activeSetup.entryPrice,
                stopLoss: activeSetup.stopLoss,
                takeProfit1: activeSetup.takeProfit1,
                takeProfit2: activeSetup.takeProfit2,
                riskRewardRatio: activeSetup.riskRewardRatio,
                invalidationReason: `Setup ${activeSetup.side} tercatat pada candle ${activeSetup.setupBarTime}; level tetap sampai outcome terdeteksi atau horizon habis.`,
            };
        }
        let analysisSnapshotRecorded = false;
        if (barTime && ['BTCUSD', 'XAUUSD'].includes(symbol)) {
            analysisSnapshotRecorded = await recordArraMarketObservation({
                symbol,
                timeframe: resolvedTimeframe,
                barTime,
                analyzedAt: new Date().toISOString(),
                price: market.currentPrice,
                source: market.source,
                quoteMode: market.quoteMode,
                quoteAgeSeconds: market.freshnessSeconds,
                feedFresh: hasLiveQuote,
                marketOpen,
                action: result.action,
                reason: result.commentary,
                direction: result.direction,
                alignmentScore: result.metrics.alignmentScore,
                confluenceScore: result.confluenceScore,
                metrics: result.metrics,
                mtfMatrix: result.mtfMatrix,
                engine: 'ARRA Cronos Observed Market Review',
            });
        }

        if (userId) await useQuota(userId).catch(() => undefined);

        return NextResponse.json({
            symbol,
            timeframe,
            model: 'ARRA Cronos Quant Forecast',
            modelSource: 'Estimasi teknikal berbasis tren, ATR, dan candle teramati',
            currentPrice: result.currentPrice,
            livePrice: market.currentPrice,
            targetPrice: result.targetPrice,
            direction: result.direction,
            action: result.action,
            forecast: result.forecast,
            scenarioSetup: result.scenarioSetup,
            setupHistory: setupTracking.setups,
            setupPersistenceAvailable: setupTracking.persistenceAvailable,
            analysisSnapshotRecorded,
            metrics: result.metrics,
            mtfMatrix: result.mtfMatrix,
            confluenceScore: result.confluenceScore,
            confluenceSummary: result.confluenceSummary,
            commentary: result.commentary,
            historyBars: completedCandles.length,
            inferenceMs: elapsedMs,
            generatedAt: new Date().toISOString(),
            method: 'Jalur estimasi teknikal memakai tren dan ATR candle tertutup; bukan harga aktual, simulasi eksekusi, atau jaminan hasil',
            dataSource: market.source,
        }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });

    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('[ARRA Cronos] Market review error:', error);
        return NextResponse.json({ error: `ARRA Cronos: ${msg}` }, { status: 500 });
    }
}
