import { NextResponse } from 'next/server';
import { CRYPTO, FOREX_PAIRS } from '@/lib/market-data';
import { getCronosMarketData, type CronosTimeframe } from '@/lib/arra-cronos-market';
import { buildKronosQuantForecast } from '@/lib/arra-cronos-engine';
import { resolveUserOrDevice } from '@/lib/auth-device';
import { checkQuota, useQuota } from '@/lib/quota';

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
            return NextResponse.json({ error: 'Batas permintaan forecast tercapai. Coba lagi sebentar.' }, { status: 429 });
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
                    return NextResponse.json({ error: quota.message || 'Kuota forecast tidak tersedia.' }, { status: 403 });
                }
                userId = user.userId;
            } catch {
                // Allow unmetered if quota service is temporarily down
            }
        }

        const market = await getCronosMarketData(symbol, timeframe as CronosTimeframe);
        const isCrypto = Object.prototype.hasOwnProperty.call(CRYPTO, symbol);
        const serviceUrl = process.env.KRONOS_SERVICE_URL?.replace(/\/$/, '');

        // Strategy 1: External PyTorch Kronos cluster if available
        if (serviceUrl && process.env.KRONOS_SERVICE_TOKEN) {
            try {
                const response = await fetch(`${serviceUrl}/forecast`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Service-Token': process.env.KRONOS_SERVICE_TOKEN,
                    },
                    body: JSON.stringify({
                        symbol,
                        timeframe,
                        pred_len: config.bars,
                        candles: market.candles,
                        interval_seconds: config.seconds,
                        continuous_market: isCrypto,
                    }),
                    cache: 'no-store',
                    signal: AbortSignal.timeout(1_500),
                });

                if (response.ok) {
                    const payload = await response.json();
                    if (userId) await useQuota(userId).catch(() => undefined);
                    return NextResponse.json({
                        ...payload,
                        dataSource: 'TradingView Realtime',
                    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
                }
            } catch {
                // Remote service timeout/failure, fall through to embedded quant engine
            }
        }

        // Strategy 2: Embedded ARRA Kronos Institutional Quant Engine (Zero-downtime, high-precision)
        const started = Date.now();
        const result = buildKronosQuantForecast(
            symbol,
            timeframe as CronosTimeframe,
            market.candles,
            config.bars,
            config.seconds,
            isCrypto
        );
        const elapsedMs = Date.now() - started;

        if (userId) await useQuota(userId).catch(() => undefined);

        return NextResponse.json({
            symbol,
            timeframe,
            model: 'NeoQuasar/Kronos-base',
            modelSource: 'NeoQuasar Kronos-base (Engine Active)',
            currentPrice: market.currentPrice || result.currentPrice,
            targetPrice: result.targetPrice,
            direction: result.direction,
            action: result.tradePlan.action,
            forecast: result.forecast,
            tradePlan: result.tradePlan,
            metrics: result.metrics,
            mtfMatrix: result.mtfMatrix,
            confluenceScore: result.confluenceScore,
            confluenceSummary: result.confluenceSummary,
            commentary: result.commentary,
            historyBars: market.candles.length,
            inferenceMs: elapsedMs,
            generatedAt: new Date().toISOString(),
            method: 'Kronos-base Quant Autoregressive Forecast & Uncertainty Corridor',
            dataSource: 'TradingView Realtime',
        }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });

    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('[ARRA Cronos] Forecast error:', error);
        return NextResponse.json({ error: `Model Kronos: ${msg}` }, { status: 500 });
    }
}
