import { CRYPTO, FOREX_PAIRS, type ForexPair } from '@/lib/market-data';

export const CRONOS_INTERVALS = {
    '15m': { yahoo: '15m', range: '60d', binance: '15m' },
    '1h': { yahoo: '60m', range: '730d', binance: '1h' },
    '4h': { yahoo: '60m', range: '730d', binance: '4h' },
    '1d': { yahoo: '1d', range: '5y', binance: '1d' },
} as const;

export type CronosTimeframe = keyof typeof CRONOS_INTERVALS;

export type CronosMarketCandle = {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
};

export type CronosMarketResult = {
    symbol: string;
    name: string;
    feedSymbol: string;
    timeframe: CronosTimeframe;
    candles: CronosMarketCandle[];
    currentPrice: number;
    latestBarClose: number;
    changePercent: number;
    source: string;
    updatedAt: string;
    freshnessSeconds: number;
    isFresh: boolean;
    count: number;
    volumeCoverage: number;
};

const marketCache = new Map<string, { expiresAt: number; value: CronosMarketResult }>();

function aggregateFourHours(candles: CronosMarketCandle[]): CronosMarketCandle[] {
    const groups: CronosMarketCandle[][] = [];
    let group: CronosMarketCandle[] = [];
    for (const candle of candles) {
        if (group.length > 0) {
            const previousTime = new Date(group[group.length - 1].time).getTime();
            const currentTime = new Date(candle.time).getTime();
            if (currentTime - previousTime > 5_400_000) group = [];
        }
        group.push(candle);
        if (group.length === 4) {
            groups.push(group);
            group = [];
        }
    }
    return groups.map((bars) => ({
        time: bars[0].time,
        open: bars[0].open,
        high: Math.max(...bars.map((candle) => candle.high)),
        low: Math.min(...bars.map((candle) => candle.low)),
        close: bars[bars.length - 1].close,
        volume: bars.reduce((sum, candle) => sum + candle.volume, 0),
    }));
}

async function fetchBinanceCandles(symbol: string, interval: string): Promise<{ candles: CronosMarketCandle[]; livePrice: number | null; quoteTime: number | null }> {
    const binanceSymbol = symbol.replace('USD', 'USDT');
    const endpoints = [
        `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=512`,
        `https://data-api.binance.vision/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=512`,
    ];
    for (const url of endpoints) {
        try {
            const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(8_000) });
            if (!response.ok) continue;
            const payload: unknown = await response.json();
            if (!Array.isArray(payload)) continue;
            const candles = payload.flatMap((row: unknown) => {
                if (!Array.isArray(row) || row.length < 6) return [];
                const [timestamp, open, high, low, close, volume] = row;
                const values = [open, high, low, close, volume].map(Number);
                if ([open, high, low, close].some((value) => value === null || value === undefined)) return [];
                if (!Number.isFinite(Number(timestamp)) || values.some((value) => !Number.isFinite(value))) return [];
                return [{ time: new Date(Number(timestamp)).toISOString(), open: values[0], high: values[1], low: values[2], close: values[3], volume: values[4] }];
            });
            try {
                const tickerUrl = url.split('?')[0].replace('/klines', '/ticker/price') + `?symbol=${binanceSymbol}`;
                const tickerResponse = await fetch(tickerUrl, { cache: 'no-store', signal: AbortSignal.timeout(4_000) });
                if (tickerResponse.ok) {
                    const ticker = await tickerResponse.json();
                    const livePrice = Number(ticker.price);
                    return { candles, livePrice: Number.isFinite(livePrice) ? livePrice : null, quoteTime: Date.now() };
                }
            } catch {
                // Use the latest exchange candle close when quote endpoint is unavailable.
            }
            return { candles, livePrice: null, quoteTime: null };
        } catch {
            // Try Binance's public market-data mirror.
        }
    }
    return { candles: [], livePrice: null, quoteTime: null };
}

async function fetchYahooCandles(symbol: string, interval: string, range: string): Promise<{ candles: CronosMarketCandle[]; quoteTime: number | null; livePrice: number | null }> {
    const config = FOREX_PAIRS[symbol as ForexPair];
    if (!config) return { candles: [], quoteTime: null, livePrice: null };
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(config.yahoo)}?interval=${interval}&range=${range}`;
    for (const host of ['query1.finance.yahoo.com', 'query2.finance.yahoo.com']) {
        try {
            const response = await fetch(url.replace('query1.finance.yahoo.com', host), {
                cache: 'no-store',
                headers: { 'User-Agent': 'Mozilla/5.0 PICA-ARRA-Cronos/1.0' },
                signal: AbortSignal.timeout(8_000),
            });
            if (!response.ok) continue;
            const payload = await response.json();
            const result = payload.chart?.result?.[0];
            const quote = result?.indicators?.quote?.[0];
            const timestamps: number[] = result?.timestamp || [];
            if (!quote) continue;
            const candles = timestamps.flatMap((timestamp, index) => {
                const rawValues = [quote.open?.[index], quote.high?.[index], quote.low?.[index], quote.close?.[index]];
                if (rawValues.some((value) => value === null || value === undefined)) return [];
                const values = rawValues.map(Number);
                if (values.some((value) => !Number.isFinite(value) || value <= 0)) return [];
                return [{
                    time: new Date(timestamp * 1000).toISOString(), open: values[0], high: values[1], low: values[2], close: values[3],
                    volume: Number.isFinite(Number(quote.volume?.[index])) ? Number(quote.volume[index]) : 0,
                }];
            });
            const quoteTime = Number(result.meta?.regularMarketTime);
            if (candles.length) {
                const livePrice = Number(result.meta?.regularMarketPrice);
                return {
                    candles,
                    quoteTime: Number.isFinite(quoteTime) ? quoteTime * 1000 : null,
                    livePrice: Number.isFinite(livePrice) && livePrice > 0 ? livePrice : null,
                };
            }
        } catch {
            // Try Yahoo's second chart-data host.
        }
    }
    return { candles: [], quoteTime: null, livePrice: null };
}

export async function getCronosMarketData(symbol: string, timeframe: CronosTimeframe): Promise<CronosMarketResult> {
    const cacheKey = `${symbol}:${timeframe}`;
    const cached = marketCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const pair = Object.prototype.hasOwnProperty.call(FOREX_PAIRS, symbol) ? FOREX_PAIRS[symbol as ForexPair] : undefined;
    if (!pair) throw new Error('Instrumen tidak didukung.');
    const config = CRONOS_INTERVALS[timeframe];
    const isCrypto = Object.prototype.hasOwnProperty.call(CRYPTO, symbol);
    let candles: CronosMarketCandle[];
    let source: string;
    let livePrice: number | null = null;
    let quoteTime: number | null = null;
    if (isCrypto) {
        const fetched = await fetchBinanceCandles(symbol, config.binance);
        candles = fetched.candles;
        livePrice = fetched.livePrice;
        quoteTime = fetched.quoteTime;
        source = 'Binance Spot';
    } else {
        const fetched = await fetchYahooCandles(symbol, timeframe === '4h' ? '60m' : config.yahoo, config.range);
        candles = fetched.candles;
        livePrice = fetched.livePrice;
        quoteTime = fetched.quoteTime;
        source = 'Yahoo Finance reference';
        if (timeframe === '4h') candles = aggregateFourHours(candles);
    }
    candles = candles.slice(-512);
    if (candles.length < 20) throw new Error(`Riwayat OHLCV riil untuk ${symbol} belum cukup tersedia dari ${source}.`);

    const lastCandle = candles[candles.length - 1];
    const latestTimestamp = quoteTime || new Date(lastCandle.time).getTime();
    const freshnessSeconds = Math.max(0, Math.floor((Date.now() - latestTimestamp) / 1000));
    const cryptoFreshnessByTimeframe: Record<CronosTimeframe, number> = { '15m': 1_800, '1h': 7_200, '4h': 28_800, '1d': 172_800 };
    const freshnessLimit = isCrypto ? cryptoFreshnessByTimeframe[timeframe] : timeframe === '1d' ? 172_800 : 7_200;
    const referenceIndex = Math.max(0, candles.length - 1 - ({ '15m': 96, '1h': 24, '4h': 6, '1d': 1 } as const)[timeframe]);
    const referencePrice = candles[referenceIndex].close;
    const result: CronosMarketResult = {
        symbol,
        name: pair.name,
        feedSymbol: isCrypto ? symbol.replace('USD', 'USDT') : pair.yahoo,
        timeframe,
        candles,
        currentPrice: livePrice || lastCandle.close,
        latestBarClose: lastCandle.close,
        changePercent: referencePrice ? (((livePrice || lastCandle.close) - referencePrice) / referencePrice) * 100 : 0,
        source,
        updatedAt: new Date(latestTimestamp).toISOString(),
        freshnessSeconds,
        isFresh: freshnessSeconds <= freshnessLimit,
        count: candles.length,
        volumeCoverage: candles.length ? Math.round(candles.filter((candle) => candle.volume > 0).length / candles.length * 100) : 0,
    };
    marketCache.set(cacheKey, { expiresAt: Date.now() + 20_000, value: result });
    return result;
}
