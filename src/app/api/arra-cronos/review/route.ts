import { NextResponse } from 'next/server';
import { buildKronosQuantReview } from '@/lib/arra-cronos-engine';
import { CRONOS_INTERVALS, getCronosMarketData, isActionableMarketQuote, type CronosTimeframe } from '@/lib/arra-cronos-market';
import { getCronosAnalysisHistory } from '@/lib/arra-cronos-analysis';
import { CRYPTO, FOREX_PAIRS } from '@/lib/market-data';
import { isMarketOpen } from '@/lib/market-hours';
import { reviewCronosSetup } from '@/lib/groq-market-review';
import { resolveUserOrDevice } from '@/lib/auth-device';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 30;

const recentReviews = new Map<string, number>();
const REVIEW_COOLDOWN_MS = 60_000;

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const symbol = String(body?.symbol || '').toUpperCase();
        const timeframe = String(body?.timeframe || '') as CronosTimeframe;
        if (!Object.prototype.hasOwnProperty.call(FOREX_PAIRS, symbol) || !Object.hasOwn(CRONOS_INTERVALS, timeframe)) {
            return NextResponse.json({ error: 'Instrumen atau timeframe review tidak didukung.' }, { status: 400 });
        }

        const user = await resolveUserOrDevice(request);
        const hasReviewAccess = user.isAdmin || user.hasArraCronosAccess;
        if (!hasReviewAccess) {
            return NextResponse.json({ error: 'Review Groq tersedia untuk member ARRA Cronos.' }, { status: 403 });
        }

        const clientId = user.userId;
        const previousReview = recentReviews.get(clientId);
        const now = Date.now();
        for (const [knownClient, lastReview] of recentReviews) {
            if (now - lastReview >= REVIEW_COOLDOWN_MS) recentReviews.delete(knownClient);
        }
        if (previousReview && now - previousReview < REVIEW_COOLDOWN_MS) {
            return NextResponse.json(
                { error: 'Tunggu sebentar sebelum meminta review Groq berikutnya.' },
                { status: 429, headers: { 'Retry-After': String(Math.ceil((REVIEW_COOLDOWN_MS - (now - previousReview)) / 1000)) } }
            );
        }
        recentReviews.set(clientId, now);

        if (!process.env.GROQ_API_KEY?.trim()) {
            return NextResponse.json({ error: 'Groq belum dikonfigurasi di environment server.' }, { status: 503 });
        }

        const market = await getCronosMarketData(symbol, timeframe);
        const mtfHistory = await getCronosAnalysisHistory(symbol, market);

        const inference = buildKronosQuantReview(
            symbol,
            timeframe,
            market.candles,
            mtfHistory,
            market.currentPrice
        );
        const quoteIsFresh = isActionableMarketQuote(market);
        const marketIsOpen = Object.hasOwn(CRYPTO, symbol) || isMarketOpen(symbol).isOpen;
        const action = quoteIsFresh && marketIsOpen ? inference.action : 'WAIT';
        const { model, review } = await reviewCronosSetup({
            symbol,
            timeframe,
            currentPrice: market.currentPrice,
            marketSource: market.source,
            quoteAgeSeconds: market.freshnessSeconds,
            candles: market.candles,
            metrics: inference.metrics,
            mtfMatrix: inference.mtfMatrix,
            action,
            forecast: inference.forecast,
            scenarioSetup: { ...inference.scenarioSetup, action },
        });

        return NextResponse.json({
            success: true,
            model,
            review,
            action,
            marketSource: market.source,
            quoteAgeSeconds: market.freshnessSeconds,
            generatedAt: new Date().toISOString(),
            disclaimer: 'Review Groq adalah pendapat sekunder; tidak mengubah sinyal kuantitatif atau mengirim order broker.',
        }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
    } catch (error) {
        console.error('[ARRA CRONOS REVIEW] Request failed:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Review Groq gagal diproses.' },
            { status: 503, headers: { 'Cache-Control': 'no-store, max-age=0' } }
        );
    }
}
