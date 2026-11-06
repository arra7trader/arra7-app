import { NextResponse } from 'next/server';
import { CRYPTO, FOREX_PAIRS, type ForexPair } from '@/lib/market-data';
import { getCronosMarketData, type CronosTimeframe } from '@/lib/arra-cronos-market';
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
const rateLimit = 4;
const recentRequests = new Map<string, number[]>();

export async function POST(request: Request) {
    const serviceUrl = process.env.KRONOS_SERVICE_URL?.replace(/\/$/, '');
    if (!serviceUrl || !process.env.KRONOS_SERVICE_TOKEN) {
        return NextResponse.json({ error: 'Layanan Kronos belum dikonfigurasi.' }, { status: 503 });
    }
    if (!process.env.TURSO_DATABASE_URL && process.env.ARRA_CRONOS_ALLOW_UNMETERED !== 'true') {
        return NextResponse.json({ error: 'Backend akses dan kuota ARRA Cronos belum dikonfigurasi.' }, { status: 503 });
    }

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
        if (recentRequests.size > 5_000) {
            for (const [key, timestamps] of recentRequests) {
                if (!timestamps.some((time) => now - time < rateWindowMs)) recentRequests.delete(key);
            }
        }

        let userId: string | null = null;
        if (process.env.TURSO_DATABASE_URL) {
            const user = await resolveUserOrDevice(request);
            const quota = await checkQuota(user.userId, timeframe, symbol);
            if (!quota.allowed) {
                return NextResponse.json({ error: quota.message || 'Kuota forecast tidak tersedia.' }, { status: 403 });
            }
            userId = user.userId;
        }

        const market = await getCronosMarketData(symbol, timeframe as CronosTimeframe);

        const response = await fetch(`${serviceUrl}/forecast`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(process.env.KRONOS_SERVICE_TOKEN ? { 'X-Service-Token': process.env.KRONOS_SERVICE_TOKEN } : {}),
            },
            body: JSON.stringify({
                symbol,
                timeframe,
                pred_len: config.bars,
                candles: market.candles,
                interval_seconds: config.seconds,
                continuous_market: Object.prototype.hasOwnProperty.call(CRYPTO, symbol),
            }),
            cache: 'no-store',
            signal: AbortSignal.timeout(90_000),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            return NextResponse.json({ error: payload.detail || 'Forecast service menolak permintaan.' }, { status: response.status });
        }

        if (userId) await useQuota(userId);
        return NextResponse.json({ ...payload, dataSource: Object.prototype.hasOwnProperty.call(CRYPTO, symbol) ? 'TradingView Realtime' : 'TradingView Realtime' }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
    } catch (error) {
        console.error('[ARRA Cronos] Forecast error:', error);
        return NextResponse.json({ error: 'Model Kronos tidak dapat membuat forecast saat ini.' }, { status: 503 });
    }
}
