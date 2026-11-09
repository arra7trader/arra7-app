import { NextResponse } from 'next/server';
import {
    getCronosMarketData,
    isActionableMarketQuote,
    type CronosMarketResult,
} from '@/lib/arra-cronos-market';
import { getCronosAnalysisHistory } from '@/lib/arra-cronos-analysis';
import {
    buildKronosMarketReview,
    CRONOS_MIN_COMPLETED_CANDLES,
    getCompletedCronosCandles,
} from '@/lib/arra-cronos-engine';
import { formatMarketOpenWib, isMarketOpen } from '@/lib/market-hours';
import { recordArraMarketObservation } from '@/lib/arra-market-observations';
import { resolveUserOrDevice } from '@/lib/auth-device';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 30;

const SCAN_SYMBOLS = ['BTCUSD', 'XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY'] as const;
const SYMBOL_NAMES: Record<(typeof SCAN_SYMBOLS)[number], string> = {
    BTCUSD: 'Bitcoin / US Dollar',
    XAUUSD: 'Gold Futures',
    EURUSD: 'Euro / US Dollar',
    GBPUSD: 'British Pound / US Dollar',
    USDJPY: 'US Dollar / Yen',
};
const rateWindowMs = 60_000;
const rateLimit = 15;
const recentRequests = new Map<string, number[]>();

type ScanResult = {
    symbol: (typeof SCAN_SYMBOLS)[number];
    name: string;
    currentPrice: number | null;
    changePercent: number | null;
    source: string | null;
    quoteMode: CronosMarketResult['quoteMode'] | null;
    quoteAgeSeconds: number | null;
    quoteUpdatedAt: string | null;
    feedFresh: boolean;
    marketOpen: boolean;
    marketOpenReason: string | null;
    nextMarketOpenWib: string | null;
    bias: 'BULLISH' | 'BEARISH' | 'WAIT';
    action: 'BUY' | 'SELL' | 'WAIT';
    direction: 'UP' | 'DOWN' | 'FLAT';
    rsi14: number | null;
    atr14: number | null;
    trendScore: number | null;
    alignmentScore: number | null;
    confluenceSummary: string;
    reason: string;
    status: 'ANALYZED' | 'WAIT' | 'CLOSED' | 'INSUFFICIENT_HISTORY' | 'UNAVAILABLE';
    latestBarTime: string | null;
};

async function scanSymbol(
    symbol: (typeof SCAN_SYMBOLS)[number],
    market: CronosMarketResult | null,
    feedError?: string
): Promise<ScanResult> {
    const isCrypto = symbol === 'BTCUSD';
    const marketStatus = isCrypto ? { isOpen: true } : isMarketOpen(symbol);
    const marketOpen = marketStatus.isOpen;
    const empty = (status: ScanResult['status'], reason: string): ScanResult => ({
        symbol,
        name: SYMBOL_NAMES[symbol],
        currentPrice: market?.currentPrice ?? null,
        changePercent: market?.changePercent ?? null,
        source: market?.source ?? null,
        quoteMode: market?.quoteMode ?? null,
        quoteAgeSeconds: market?.freshnessSeconds ?? null,
        quoteUpdatedAt: market?.updatedAt ?? null,
        feedFresh: Boolean(market && isActionableMarketQuote(market)),
        marketOpen,
        marketOpenReason: marketOpen ? null : marketStatus.reason || `${symbol} tutup.`,
        nextMarketOpenWib: !marketOpen && marketStatus.nextOpen ? formatMarketOpenWib(marketStatus.nextOpen) : null,
        bias: 'WAIT',
        action: 'WAIT',
        direction: 'FLAT',
        rsi14: null,
        atr14: null,
        trendScore: null,
        alignmentScore: null,
        confluenceSummary: 'Belum tersedia',
        reason,
        status,
        latestBarTime: null,
    });

    if (!market) return empty('UNAVAILABLE', feedError || 'Feed pasangan ini tidak tersedia.');

    const completedCandles = getCompletedCronosCandles(market.candles, '15m');
    const latestBarTime = completedCandles.at(-1)?.time ?? null;
    if (completedCandles.length < CRONOS_MIN_COMPLETED_CANDLES) {
        return { ...empty('INSUFFICIENT_HISTORY', `Candle tertutup belum cukup (${completedCandles.length}/${CRONOS_MIN_COMPLETED_CANDLES}).`), latestBarTime };
    }

    try {
        const history = await getCronosAnalysisHistory(symbol, market);
        const review = buildKronosMarketReview(symbol, '15m', completedCandles, market.currentPrice, history);
        const feedFresh = isActionableMarketQuote(market);
        const action = feedFresh && marketOpen ? review.action : 'WAIT';
        const reason = !marketOpen
            ? `${symbol} tutup; sinyal ditahan sampai sesi buka.`
            : !feedFresh
                ? `Feed ${market.source} belum memenuhi syarat kuotasi live; bias ditahan menjadi WAIT.`
                : review.commentary;

        if (latestBarTime) {
            await recordArraMarketObservation({
                symbol,
                timeframe: '15m',
                barTime: latestBarTime,
                analyzedAt: new Date().toISOString(),
                price: market.currentPrice,
                source: market.source,
                quoteMode: market.quoteMode,
                quoteAgeSeconds: market.freshnessSeconds,
                feedFresh,
                marketOpen,
                action,
                reason,
                direction: review.direction,
                alignmentScore: review.metrics.alignmentScore,
                confluenceScore: review.confluenceScore,
                metrics: review.metrics,
                mtfMatrix: review.mtfMatrix,
                engine: 'ARRA GROK Auto Scanner v1',
            });
        }

        return {
            symbol,
            name: SYMBOL_NAMES[symbol],
            currentPrice: market.currentPrice,
            changePercent: market.changePercent,
            source: market.source,
            quoteMode: market.quoteMode,
            quoteAgeSeconds: market.freshnessSeconds,
            quoteUpdatedAt: market.updatedAt,
            feedFresh,
            marketOpen,
            marketOpenReason: marketOpen ? null : marketStatus.reason || `${symbol} tutup.`,
            nextMarketOpenWib: !marketOpen && marketStatus.nextOpen ? formatMarketOpenWib(marketStatus.nextOpen) : null,
            bias: action === 'BUY' ? 'BULLISH' : action === 'SELL' ? 'BEARISH' : 'WAIT',
            action,
            direction: review.direction,
            rsi14: review.metrics.rsi14,
            atr14: review.metrics.atr14,
            trendScore: review.metrics.trendScore,
            alignmentScore: review.metrics.alignmentScore,
            confluenceSummary: review.confluenceSummary,
            reason,
            status: !marketOpen ? 'CLOSED' : action === 'WAIT' ? 'WAIT' : 'ANALYZED',
            latestBarTime,
        };
    } catch (error) {
        return { ...empty('UNAVAILABLE', error instanceof Error ? error.message : 'Analisis pasangan ini gagal.'), latestBarTime };
    }
}

export async function GET(request: Request) {
    const user = await resolveUserOrDevice(request);
    if (!user.isAdmin && user.membership !== 'PRO' && user.membership !== 'VVIP') {
        return NextResponse.json({ error: 'Pemindaian otomatis tersedia untuk member ARRA Cronos.' }, { status: 403 });
    }

    const clientKey = user.userId;
    const now = Date.now();
    const recent = (recentRequests.get(clientKey) || []).filter((time) => now - time < rateWindowMs);
    if (recent.length >= rateLimit) {
        return NextResponse.json({ error: 'Batas scan otomatis tercapai. Coba lagi sebentar.' }, { status: 429, headers: { 'Retry-After': '8' } });
    }
    recent.push(now);
    recentRequests.set(clientKey, recent);
    for (const [knownClient, requests] of recentRequests) {
        if (!requests.some((time) => now - time < rateWindowMs)) recentRequests.delete(knownClient);
    }

    const marketResults = await Promise.allSettled(SCAN_SYMBOLS.map((symbol) => getCronosMarketData(symbol, '15m')));
    const scans = await Promise.all(SCAN_SYMBOLS.map((symbol, index) => {
        const result = marketResults[index];
        return scanSymbol(
            symbol,
            result.status === 'fulfilled' ? result.value : null,
            result.status === 'rejected' ? (result.reason instanceof Error ? result.reason.message : 'Feed tidak tersedia.') : undefined
        );
    }));

    return NextResponse.json({
        success: true,
        scannedAt: new Date().toISOString(),
        intervalSeconds: 15,
        symbolsScanned: scans.length,
        scans,
        mode: 'pemindaian otomatis multi-pair; tidak membuat transaksi atau order broker',
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}
