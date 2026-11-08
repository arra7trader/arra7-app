import { NextResponse } from 'next/server';
import { buildKronosMarketReview } from '@/lib/arra-cronos-engine';
import { getCronosMarketData, isActionableMarketQuote } from '@/lib/arra-cronos-market';
import { getCronosAnalysisHistory } from '@/lib/arra-cronos-analysis';
import { isMarketOpen } from '@/lib/market-hours';
import { reviewCronosSetup } from '@/lib/groq-market-review';
import { resolveUserOrDevice } from '@/lib/auth-device';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 30;

const REVIEW_COOLDOWN_MS = 60_000;
const lastReviews = new Map<string, number>();

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const symbol = String(body?.symbol || '').toUpperCase();
        if (!['BTCUSD', 'XAUUSD'].includes(symbol)) {
            return NextResponse.json({ error: 'ARRA GROK hanya mendukung BTCUSD dan XAUUSD.' }, { status: 400 });
        }
        const user = await resolveUserOrDevice(request);
        const hasReviewAccess = user.isAdmin || user.membership === 'PRO' || user.membership === 'VVIP';
        if (!hasReviewAccess) {
            return NextResponse.json({ error: 'Review Groq tersedia untuk member ARRA Cronos.' }, { status: 403 });
        }
        if (!process.env.GROQ_API_KEY?.trim()) {
            return NextResponse.json({ error: 'Groq belum dikonfigurasi di environment server.' }, { status: 503 });
        }

        const clientId = user.userId;
        const now = Date.now();
        const previousReview = lastReviews.get(clientId);
        for (const [knownClient, lastReview] of lastReviews) {
            if (now - lastReview >= REVIEW_COOLDOWN_MS) lastReviews.delete(knownClient);
        }
        if (previousReview && now - previousReview < REVIEW_COOLDOWN_MS) {
            const waitSeconds = Math.ceil((REVIEW_COOLDOWN_MS - (now - previousReview)) / 1000);
            return NextResponse.json(
                { error: `Tunggu ${waitSeconds} detik sebelum meminta review Groq berikutnya.` },
                { status: 429, headers: { 'Retry-After': String(waitSeconds) } }
            );
        }
        lastReviews.set(clientId, now);

        const market = await getCronosMarketData(symbol, '15m');
        const history = await getCronosAnalysisHistory(symbol, market);
        const inference = buildKronosMarketReview(symbol, '15m', market.candles, market.currentPrice, history);
        const liveQuote = isActionableMarketQuote(market);
        const open = symbol === 'BTCUSD' || isMarketOpen('XAUUSD').isOpen;
        const action = liveQuote && open ? inference.action : 'WAIT';
        const result = await reviewCronosSetup({
            symbol,
            timeframe: '15m',
            currentPrice: market.currentPrice,
            marketSource: market.source,
            quoteAgeSeconds: market.freshnessSeconds,
            candles: market.candles,
            metrics: inference.metrics,
            mtfMatrix: inference.mtfMatrix,
            action,
        });

        return NextResponse.json({
            success: true,
            ...result,
            action,
            marketSource: market.source,
            quoteAgeSeconds: market.freshnessSeconds,
            generatedAt: new Date().toISOString(),
            disclaimer: 'Review Groq adalah opini sekunder. Sinyal ditentukan oleh aturan teknikal lokal dan tidak ada order broker yang dikirim.',
        }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
    } catch (error) {
        console.error('[ARRA GROK REVIEW] Request failed:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Review Groq gagal diproses.' },
            { status: 503, headers: { 'Cache-Control': 'no-store, max-age=0' } }
        );
    }
}
