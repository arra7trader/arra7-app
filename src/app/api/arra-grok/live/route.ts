import { NextRequest, NextResponse } from 'next/server';
import { getCronosMarketData, isActionableMarketQuote } from '@/lib/arra-cronos-market';
import { getCronosAnalysisHistory } from '@/lib/arra-cronos-analysis';
import { buildKronosMarketReview, CRONOS_MIN_COMPLETED_CANDLES, getCompletedCronosCandles } from '@/lib/arra-cronos-engine';
import { formatMarketOpenWib, isMarketOpen } from '@/lib/market-hours';
import { recordArraMarketObservation } from '@/lib/arra-market-observations';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        // Requested symbol: BTCUSD or XAUUSD (default XAUUSD unless explicitly selected)
        const requestedSymbol = (searchParams.get('symbol') || 'XAUUSD').toUpperCase().replace('$', '');
        const activeSymbol = requestedSymbol === 'BTCUSD' ? 'BTCUSD' : 'XAUUSD';
        const isCrypto = activeSymbol === 'BTCUSD';

        const xauMarketStatus = isMarketOpen('XAUUSD');
        const forexMarketClosed = !isMarketOpen('EURUSD').isOpen;
        const xauSessionClosed = !xauMarketStatus.isOpen;

        // Fetch 5 instruments in parallel (including 24/7 BTCUSD)
        const [btcMarket, xauMarket, eurMarket, gbpMarket, jpyMarket] = await Promise.allSettled([
            getCronosMarketData('BTCUSD', '15m'),
            getCronosMarketData('XAUUSD', '15m'),
            getCronosMarketData('EURUSD', '15m'),
            getCronosMarketData('GBPUSD', '15m'),
            getCronosMarketData('USDJPY', '15m'),
        ]);

        const btc = btcMarket.status === 'fulfilled' ? btcMarket.value : null;
        const xau = xauMarket.status === 'fulfilled' ? xauMarket.value : null;
        const eur = eurMarket.status === 'fulfilled' ? eurMarket.value : null;
        const gbp = gbpMarket.status === 'fulfilled' ? gbpMarket.value : null;
        const jpy = jpyMarket.status === 'fulfilled' ? jpyMarket.value : null;
        const isQuoteFresh = (market: typeof btc) => Boolean(market && isActionableMarketQuote(market));
        const btcQuoteIsFresh = isQuoteFresh(btc);
        const xauQuoteIsFresh = isQuoteFresh(xau);
        const eurQuoteIsFresh = isQuoteFresh(eur);
        const gbpQuoteIsFresh = isQuoteFresh(gbp);
        const jpyQuoteIsFresh = isQuoteFresh(jpy);

        // Current real prices
        const btcCurrentPrice = btc?.currentPrice ?? (btc?.candles.at(-1)?.close ?? null);
        const xauCurrentPrice = xau?.currentPrice ?? (xau?.candles.at(-1)?.close ?? null);

        // Active pair selection
        const targetMarket = isCrypto ? btc : xau;
        const currentPrice = isCrypto ? btcCurrentPrice : xauCurrentPrice;
        const assetName = isCrypto ? 'Bitcoin / US Dollar (24/7 Futures)' : 'Gold / US Dollar Futures';

        if (!targetMarket || currentPrice === null || !Number.isFinite(currentPrice) || currentPrice <= 0) {
            return NextResponse.json(
                { success: false, error: `Feed live ${activeSymbol} sedang tidak tersedia. Tidak ada harga contoh yang ditampilkan.` },
                { status: 503, headers: { 'Cache-Control': 'no-store, max-age=0' } }
            );
        }

        // Quantitative analysis uses completed real candles only.
        const completedCandles = getCompletedCronosCandles(targetMarket.candles, '15m');
        if (completedCandles.length < CRONOS_MIN_COMPLETED_CANDLES) {
            return NextResponse.json(
                { success: false, error: `Analisis ${activeSymbol} menunggu riwayat candle tertutup yang cukup (${completedCandles.length}/${CRONOS_MIN_COMPLETED_CANDLES}).` },
                { status: 503, headers: { 'Cache-Control': 'no-store, max-age=0' } }
            );
        }

        let inference = null;
        if (targetMarket) {
            try {
                const mtfHistory = await getCronosAnalysisHistory(activeSymbol, targetMarket);
                inference = buildKronosMarketReview(activeSymbol, '15m', completedCandles, currentPrice, mtfHistory);
            } catch (err) {
                console.error(`[ARRA GROK] Inference error for ${activeSymbol}:`, err);
            }
        }

        if (!inference) {
            return NextResponse.json(
                { success: false, error: `Analisis ${activeSymbol} belum tersedia. Feed harga mungkin aktif, tetapi riwayat candle tertutup belum cukup.` },
                { status: 503, headers: { 'Cache-Control': 'no-store, max-age=0' } }
            );
        }

        // Quant indicator breakdown
        const trendScore = inference.metrics.trendScore;
        const rsi = inference.metrics.rsi14;
        const atr = inference.metrics.atr14;
        const confluence = inference.confluenceSummary;

        // Bias determination
        const targetQuoteIsFresh = isCrypto ? btcQuoteIsFresh : xauQuoteIsFresh;
        const marketStatus = isCrypto ? { isOpen: true } : isMarketOpen(activeSymbol);
        const proposedBias = inference.action === 'BUY' ? 'BULLISH' : inference.action === 'SELL' ? 'BEARISH' : 'WAIT';
        const bias = marketStatus.isOpen && targetQuoteIsFresh ? proposedBias : 'WAIT';

        const reason = !marketStatus.isOpen
                ? `${marketStatus.reason || 'Pasar futures gold tutup'}. Bias ditahan; perkiraan buka ${marketStatus.nextOpen ? formatMarketOpenWib(marketStatus.nextOpen) : 'belum tersedia'}.`
            : !targetMarket.isFresh
                ? `Feed ${targetMarket.source} sudah ${targetMarket.freshnessSeconds} detik, melewati batas segar. Bias ditahan sampai feed terbaru tersedia.`
                : !targetQuoteIsFresh
                    ? targetMarket.quoteMode === 'DELAYED'
                        ? `Feed ${targetMarket.source} tertunda; bias menjadi WAIT sampai kuotasi live tersedia.`
                        : targetMarket.quoteMode === 'TIMESTAMPED'
                            ? `Feed ${targetMarket.source} punya cap waktu, tetapi streaming live belum terkonfirmasi; bias menjadi WAIT.`
                            : `Feed ${targetMarket.source} hanya menyediakan candle terakhir, bukan kuotasi langsung. Bias menjadi WAIT.`
            : isCrypto
                ? `BTCUSD 24/7 · Trend Score ${trendScore > 0 ? '+' : ''}${trendScore}/100 · RSI ${rsi.toFixed(1)} · ATR $${atr.toFixed(0)} · ${confluence}`
                : `Trend Score ${trendScore > 0 ? '+' : ''}${trendScore}/100 · RSI ${rsi.toFixed(1)} · ATR $${atr.toFixed(2)} · ${confluence}`;

        const latestBar = completedCandles.at(-1);
        let analysisSnapshotRecorded = false;
        if (latestBar) {
            analysisSnapshotRecorded = await recordArraMarketObservation({
                symbol: activeSymbol,
                timeframe: '15m',
                barTime: latestBar.time,
                analyzedAt: new Date().toISOString(),
                price: currentPrice,
                source: targetMarket.source,
                quoteMode: targetMarket.quoteMode,
                quoteAgeSeconds: targetMarket.freshnessSeconds,
                feedFresh: targetQuoteIsFresh,
                marketOpen: marketStatus.isOpen,
                action: bias === 'BULLISH' ? 'BUY' : bias === 'BEARISH' ? 'SELL' : 'WAIT',
                reason,
                direction: inference.direction,
                alignmentScore: inference.metrics.alignmentScore,
                confluenceScore: inference.confluenceScore,
                metrics: inference.metrics,
                mtfMatrix: inference.mtfMatrix,
                engine: 'ARRA GROK Quant Review v1',
            });
        }

        // Real scanned assets array (including 24/7 BTCUSD at the front)
        const scannedAssets = [
            {
                sym: '$BTCUSD',
                name: 'Bitcoin / US Dollar',
                price: btcCurrentPrice,
                change: btc?.changePercent ?? null,
                note: !btc ? 'feed tidak tersedia' : !btcQuoteIsFresh ? 'kuotasi live tidak tersedia' : activeSymbol === 'BTCUSD' ? (bias === 'WAIT' ? 'menunggu konfirmasi' : `bias ${bias}`) : 'Pasar 24/7',
                dot: !btc ? 'bg-slate-400' : btcQuoteIsFresh ? 'bg-emerald-500' : 'bg-amber-500',
                status: !btc ? 'UNAVAILABLE' : btcQuoteIsFresh ? 'LIVE' : 'STALE',
                is24_7: true,
            },
            {
                sym: '$XAUUSD',
                name: 'Gold Futures',
                price: xauCurrentPrice,
                change: xau?.changePercent ?? null,
                note: !xau ? 'feed tidak tersedia' : xauSessionClosed ? 'sesi futures tutup' : !xauQuoteIsFresh ? 'kuotasi live tidak tersedia' : activeSymbol === 'XAUUSD' ? (bias === 'WAIT' ? 'menunggu konfirmasi' : `bias ${bias}`) : 'feed segar',
                dot: !xau ? 'bg-slate-400' : xauSessionClosed ? 'bg-amber-500' : xauQuoteIsFresh ? 'bg-emerald-500' : 'bg-amber-500',
                status: !xau ? 'UNAVAILABLE' : xauSessionClosed ? 'CLOSED' : xauQuoteIsFresh ? 'LIVE' : 'STALE',
                is24_7: false,
            },
            {
                sym: '$EURUSD',
                name: 'Euro / US Dollar',
                price: eur?.currentPrice ?? null,
                change: eur?.changePercent ?? null,
                note: !eur ? 'feed tidak tersedia' : forexMarketClosed ? 'pasar tutup' : eurQuoteIsFresh ? 'feed segar' : 'kuotasi live tidak tersedia',
                dot: !eur ? 'bg-slate-400' : forexMarketClosed ? 'bg-amber-500' : eurQuoteIsFresh ? 'bg-blue-500' : 'bg-amber-500',
                status: !eur ? 'UNAVAILABLE' : forexMarketClosed ? 'WEEKEND' : eurQuoteIsFresh ? 'LIVE' : 'STALE',
                is24_7: false,
            },
            {
                sym: '$GBPUSD',
                name: 'British Pound',
                price: gbp?.currentPrice ?? null,
                change: gbp?.changePercent ?? null,
                note: !gbp ? 'feed tidak tersedia' : forexMarketClosed ? 'pasar tutup' : gbpQuoteIsFresh ? 'feed segar' : 'kuotasi live tidak tersedia',
                dot: !gbp ? 'bg-slate-400' : forexMarketClosed ? 'bg-amber-500' : gbpQuoteIsFresh ? 'bg-amber-500' : 'bg-slate-400',
                status: !gbp ? 'UNAVAILABLE' : forexMarketClosed ? 'WEEKEND' : gbpQuoteIsFresh ? 'LIVE' : 'STALE',
                is24_7: false,
            },
            {
                sym: '$USDJPY',
                name: 'US Dollar / Yen',
                price: jpy?.currentPrice ?? null,
                change: jpy?.changePercent ?? null,
                note: !jpy ? 'feed tidak tersedia' : forexMarketClosed ? 'pasar tutup' : jpyQuoteIsFresh ? 'feed segar' : 'kuotasi live tidak tersedia',
                dot: !jpy ? 'bg-slate-400' : forexMarketClosed ? 'bg-amber-500' : jpyQuoteIsFresh ? 'bg-blue-500' : 'bg-amber-500',
                status: !jpy ? 'UNAVAILABLE' : forexMarketClosed ? 'WEEKEND' : jpyQuoteIsFresh ? 'LIVE' : 'STALE',
                is24_7: false,
            },
        ];

        // Format current timestamp for live logs (HH:MM WIB)
        const now = new Date();
        const nowWib = new Date(now.getTime() + 7 * 3600000);
        const hh = nowWib.getUTCHours().toString().padStart(2, '0');
        const mm = nowWib.getUTCMinutes().toString().padStart(2, '0');
        const ss = nowWib.getUTCSeconds().toString().padStart(2, '0');
        const timeStr = `${hh}:${mm}`;
        const quoteTimeWib = new Intl.DateTimeFormat('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: 'Asia/Jakarta',
        }).format(new Date(targetMarket.updatedAt));

        const terminalLogs = [
            `${timeStr} FEED    $${activeSymbol} ${targetMarket.source} · ${targetMarket.freshnessSeconds}s`,
            `${timeStr} BIAS    ${bias} · trend ${trendScore}/100 · RSI ${rsi.toFixed(1)} · alignment ${inference.metrics.alignmentScore}/100`,
            '  pembacaan candle pasar aktual · tanpa proyeksi, sizing, P/L, atau order broker',
        ];

        return NextResponse.json({
            success: true,
            analysisSnapshotRecorded,
            updatedAt: now.toISOString(),
            timeWib: `${timeStr}:${ss}`,
            selectedSymbol: activeSymbol,
            marketStatus: {
                isOpen: marketStatus.isOpen,
                isWeekend: !isCrypto && marketStatus.reason?.toLowerCase().includes('weekend') === true,
                is24_7: isCrypto,
                reason: isCrypto ? 'Pasar Kripto 24/7 Aktif Non-Stop (Tanpa Libur Weekend)' : marketStatus.reason || 'COMEX gold futures session',
                nextOpenWib: isCrypto ? '24/7 Realtime' : marketStatus.nextOpen ? formatMarketOpenWib(marketStatus.nextOpen) : 'Sesi Chicago berikutnya',
            },
            marketAnalysis: {
                symbol: `$${activeSymbol}`,
                name: assetName,
                bias,
                current: currentPrice,
                rsi14: inference.metrics.rsi14,
                atr14: inference.metrics.atr14,
                trendScore: inference.metrics.trendScore,
                alignmentScore: inference.metrics.alignmentScore,
                reason,
            },
            scannedAssets,
            terminalLogs,
            logHistory: [],
            marketSnapshot: {
                atr,
                rsi,
                trendScore,
                confluence,
                activePrice: currentPrice,
                btcPrice: btcCurrentPrice,
                xauPrice: xauCurrentPrice,
                source: targetMarket.source,
                freshnessSeconds: targetMarket.freshnessSeconds,
                isFresh: targetQuoteIsFresh,
                quoteMode: targetMarket.quoteMode,
                updatedAt: targetMarket.updatedAt,
                quoteTimeWib,
            },
        }, {
            headers: {
                'Cache-Control': 'no-store, max-age=0',
            },
        });
    } catch (err: any) {
        console.error('[ARRA GROK LIVE API] Error:', err);
        return NextResponse.json(
            { error: err?.message || 'Gagal memuat feed live ARRA GROK' },
            { status: 500 }
        );
    }
}
