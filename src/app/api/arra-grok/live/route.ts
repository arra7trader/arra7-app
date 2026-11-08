import { NextRequest, NextResponse } from 'next/server';
import { getCronosMarketData } from '@/lib/arra-cronos-market';
import { getCronosAnalysisHistory } from '@/lib/arra-cronos-analysis';
import { buildKronosQuantForecast } from '@/lib/arra-cronos-engine';
import { isMarketOpen } from '@/lib/market-hours';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const capitalParam = parseFloat(searchParams.get('capital') || '1254');
        const capital = !Number.isFinite(capitalParam) || capitalParam <= 0 ? 1254 : capitalParam;

        // Requested symbol: BTCUSD or XAUUSD (default XAUUSD unless weekend, or param provided)
        const requestedSymbol = (searchParams.get('symbol') || 'XAUUSD').toUpperCase().replace('$', '');
        const activeSymbol = requestedSymbol === 'BTCUSD' ? 'BTCUSD' : 'XAUUSD';
        const isCrypto = activeSymbol === 'BTCUSD';

        // Check real weekend market hours (Forex/Gold closed Friday 22:00 UTC to Sunday 22:00 UTC / Mon 05:00 WIB)
        // Crypto (BTCUSD) operates 24/7/365 with ZERO holidays!
        const xauMarketStatus = isMarketOpen('XAUUSD');
        const isForexWeekend = !xauMarketStatus.isOpen;
        const isWeekendClosed = !isCrypto && isForexWeekend;

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
        const isQuoteFresh = (market: typeof btc) => Boolean(
            market?.isFresh && ['TradingView Realtime', 'Binance Spot'].includes(market.source)
        );
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

        // Quantitative analysis on real candles
        let inference = null;
        if (targetMarket && targetMarket.candles.length >= 20) {
            try {
                const mtfHistory = await getCronosAnalysisHistory(activeSymbol, targetMarket);
                inference = buildKronosQuantForecast(activeSymbol, '15m', targetMarket.candles, 10, 900, isCrypto, mtfHistory);
            } catch (err) {
                console.error(`[ARRA GROK] Inference error for ${activeSymbol}:`, err);
            }
        }

        if (!inference) {
            return NextResponse.json(
                { success: false, error: `Analisis ${activeSymbol} belum tersedia. Feed harga mungkin aktif, tetapi setup belum dapat dihitung.` },
                { status: 503, headers: { 'Cache-Control': 'no-store, max-age=0' } }
            );
        }

        // Quant indicator breakdown
        const trendScore = inference.metrics.trendScore;
        const rsi = inference.metrics.rsi14;
        const atr = inference.metrics.atr14;
        const confluence = inference.confluenceSummary;

        // Bias determination
        const proposedAction = inference.tradePlan.action === 'BUY'
            ? 'LONG'
            : inference.tradePlan.action === 'SELL'
                ? 'SHORT'
                : 'WAIT';
        const targetQuoteIsFresh = isCrypto ? btcQuoteIsFresh : xauQuoteIsFresh;
        let actionType = isWeekendClosed || !targetQuoteIsFresh ? 'WAIT' : proposedAction;

        // Trade setup parameters
        const entryPrice = inference.tradePlan.entryPrice;
        const stopLoss = inference.tradePlan.stopLoss;
        const takeProfit = inference.tradePlan.takeProfit2;

        // Illustrative position size from reference capital; broker contract specs are not connected.
        const riskPercent = 0.015;
        const dollarRisk = Number((capital * riskPercent).toFixed(2)); // $18.81 for $1,254
        const stopDistance = Math.max(0.00001, Math.abs(entryPrice - stopLoss));

        let sizeLots: number;
        let contractMultiplier: number;
        if (isCrypto) {
            contractMultiplier = 1;
            const rawBtcLots = dollarRisk / stopDistance;
            sizeLots = actionType === 'WAIT' ? 0 : Number(Math.min(2.0, Math.floor(rawBtcLots * 100) / 100).toFixed(2));
        } else {
            contractMultiplier = 100;
            const rawGoldLots = dollarRisk / (stopDistance * 100);
            sizeLots = actionType === 'WAIT' ? 0 : Number(Math.min(5.0, Math.floor(rawGoldLots * 100) / 100).toFixed(2));
        }

        if (sizeLots < 0.01) {
            sizeLots = 0;
            actionType = 'WAIT';
        }

        const sizePct = sizeLots
            ? `${((sizeLots * contractMultiplier * currentPrice / capital) * 100).toFixed(0)}% notional vs reference capital`
            : '—';

        const reason = isWeekendClosed
            ? 'Pasar Forex & Emas tutup (Weekend). Harga ditahan di penutupan Jumat. Buka kembali Senin 05:00 WIB.'
            : !targetMarket.isFresh
                ? `Feed ${targetMarket.source} sudah ${targetMarket.freshnessSeconds} detik, melewati batas segar. Setup ditahan sampai feed terbaru tersedia.`
                : !targetQuoteIsFresh
                    ? `Feed ${targetMarket.source} hanya menyediakan candle terakhir, bukan kuotasi langsung. Rekomendasi ditahan.`
                : actionType === 'WAIT' && proposedAction !== 'WAIT'
                    ? 'Ukuran minimum 0.01 lot melampaui batas risiko referensi; setup ditahan.'
            : isCrypto
                ? `BTCUSD 24/7 · Trend Score ${trendScore > 0 ? '+' : ''}${trendScore}/100 · RSI ${rsi.toFixed(1)} · ATR $${atr.toFixed(0)} · ${confluence}`
                : `Trend Score ${trendScore > 0 ? '+' : ''}${trendScore}/100 · RSI ${rsi.toFixed(1)} · ATR $${atr.toFixed(2)} · ${confluence}`;

        // Real scanned assets array (including 24/7 BTCUSD at the front)
        const scannedAssets = [
            {
                sym: '$BTCUSD',
                name: 'Bitcoin / US Dollar',
                price: btcCurrentPrice,
                change: btc?.changePercent ?? null,
                note: !btc ? 'feed tidak tersedia' : !btcQuoteIsFresh ? 'kuotasi live tidak tersedia' : activeSymbol === 'BTCUSD' ? (actionType === 'WAIT' ? 'menunggu konfirmasi' : `${actionType} setup`) : 'Pasar 24/7',
                dot: !btc ? 'bg-slate-400' : btcQuoteIsFresh ? 'bg-emerald-500' : 'bg-amber-500',
                status: !btc ? 'UNAVAILABLE' : btcQuoteIsFresh ? 'LIVE' : 'STALE',
                is24_7: true,
            },
            {
                sym: '$XAUUSD',
                name: 'Gold Futures',
                price: xauCurrentPrice,
                change: xau?.changePercent ?? null,
                note: !xau ? 'feed tidak tersedia' : isForexWeekend ? 'pasar tutup' : !xauQuoteIsFresh ? 'kuotasi live tidak tersedia' : activeSymbol === 'XAUUSD' ? (actionType === 'WAIT' ? 'menunggu konfirmasi' : `${actionType} setup`) : 'feed segar',
                dot: !xau ? 'bg-slate-400' : isForexWeekend ? 'bg-amber-500' : xauQuoteIsFresh ? 'bg-emerald-500' : 'bg-amber-500',
                status: !xau ? 'UNAVAILABLE' : isForexWeekend ? 'WEEKEND' : xauQuoteIsFresh ? 'LIVE' : 'STALE',
                is24_7: false,
            },
            {
                sym: '$EURUSD',
                name: 'Euro / US Dollar',
                price: eur?.currentPrice ?? null,
                change: eur?.changePercent ?? null,
                note: !eur ? 'feed tidak tersedia' : isForexWeekend ? 'pasar tutup' : eurQuoteIsFresh ? 'feed segar' : 'kuotasi live tidak tersedia',
                dot: !eur ? 'bg-slate-400' : isForexWeekend ? 'bg-amber-500' : eurQuoteIsFresh ? 'bg-blue-500' : 'bg-amber-500',
                status: !eur ? 'UNAVAILABLE' : isForexWeekend ? 'WEEKEND' : eurQuoteIsFresh ? 'LIVE' : 'STALE',
                is24_7: false,
            },
            {
                sym: '$GBPUSD',
                name: 'British Pound',
                price: gbp?.currentPrice ?? null,
                change: gbp?.changePercent ?? null,
                note: !gbp ? 'feed tidak tersedia' : isForexWeekend ? 'pasar tutup' : gbpQuoteIsFresh ? 'feed segar' : 'kuotasi live tidak tersedia',
                dot: !gbp ? 'bg-slate-400' : isForexWeekend ? 'bg-amber-500' : gbpQuoteIsFresh ? 'bg-amber-500' : 'bg-slate-400',
                status: !gbp ? 'UNAVAILABLE' : isForexWeekend ? 'WEEKEND' : gbpQuoteIsFresh ? 'LIVE' : 'STALE',
                is24_7: false,
            },
            {
                sym: '$USDJPY',
                name: 'US Dollar / Yen',
                price: jpy?.currentPrice ?? null,
                change: jpy?.changePercent ?? null,
                note: !jpy ? 'feed tidak tersedia' : isForexWeekend ? 'pasar tutup' : jpyQuoteIsFresh ? 'feed segar' : 'kuotasi live tidak tersedia',
                dot: !jpy ? 'bg-slate-400' : isForexWeekend ? 'bg-amber-500' : jpyQuoteIsFresh ? 'bg-blue-500' : 'bg-amber-500',
                status: !jpy ? 'UNAVAILABLE' : isForexWeekend ? 'WEEKEND' : jpyQuoteIsFresh ? 'LIVE' : 'STALE',
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
            `${timeStr} SIZER   Referensi $${capital.toFixed(2)} · risiko 1.5% · ${sizeLots} lot`,
            actionType === 'WAIT'
                ? `${timeStr} SIGNAL  WAIT · no actionable levels`
                : `${timeStr} SIGNAL  ${actionType} · entry ${entryPrice} · SL ${stopLoss} · TP ${takeProfit}`,
            '  rekomendasi analisis saja · tidak ada order broker yang dikirim',
        ];

        return NextResponse.json({
            success: true,
            updatedAt: now.toISOString(),
            timeWib: `${timeStr}:${ss}`,
            selectedSymbol: activeSymbol,
            marketStatus: {
                isOpen: !isWeekendClosed,
                isWeekend: isWeekendClosed,
                is24_7: isCrypto,
                reason: isCrypto
                    ? 'Pasar Kripto 24/7 Aktif Non-Stop (Tanpa Libur Weekend)'
                    : isWeekendClosed
                    ? 'Pasar Tutup (Weekend)'
                    : 'Pasar Buka (Live)',
                nextOpenWib: isCrypto ? '24/7 Realtime' : 'Senin 05:00 WIB',
            },
            activeTrade: {
                symbol: `$${activeSymbol}`,
                name: assetName,
                type: actionType,
                entry: actionType === 'WAIT' ? null : entryPrice,
                current: currentPrice,
                stopLoss: actionType === 'WAIT' ? null : stopLoss,
                takeProfit: actionType === 'WAIT' ? null : takeProfit,
                sizeLots,
                sizePct,
                reason,
            },
            scannedAssets,
            pipelineSummary: {
                filteredCount: 0,
                skippedCount: scannedAssets.filter((asset) => asset.status === 'WEEKEND' || asset.status === 'UNAVAILABLE' || asset.status === 'STALE').length,
                sizerEq: `${sizeLots} Lots`,
                dollarRisk: `$${dollarRisk.toFixed(2)}`,
                logLinesCount: 0,
                lastClosePnl: null,
            },
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
