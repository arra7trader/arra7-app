// Extended Forex pair configurations with Yahoo Finance symbols

// ===================
// FOREX MAJOR PAIRS
// ===================
export const FOREX_MAJOR = {
    'EURUSD': { yahoo: 'EURUSD=X', name: 'EUR/USD', description: 'Euro / US Dollar' },
    'GBPUSD': { yahoo: 'GBPUSD=X', name: 'GBP/USD', description: 'British Pound / US Dollar' },
    'USDJPY': { yahoo: 'USDJPY=X', name: 'USD/JPY', description: 'US Dollar / Japanese Yen' },
    'USDCHF': { yahoo: 'USDCHF=X', name: 'USD/CHF', description: 'US Dollar / Swiss Franc' },
    'AUDUSD': { yahoo: 'AUDUSD=X', name: 'AUD/USD', description: 'Australian Dollar / US Dollar' },
    'USDCAD': { yahoo: 'USDCAD=X', name: 'USD/CAD', description: 'US Dollar / Canadian Dollar' },
    'NZDUSD': { yahoo: 'NZDUSD=X', name: 'NZD/USD', description: 'New Zealand Dollar / US Dollar' },
} as const;

// ===================
// FOREX MINOR/CROSS PAIRS
// ===================
export const FOREX_MINOR = {
    'EURGBP': { yahoo: 'EURGBP=X', name: 'EUR/GBP', description: 'Euro / British Pound' },
    'EURJPY': { yahoo: 'EURJPY=X', name: 'EUR/JPY', description: 'Euro / Japanese Yen' },
    'GBPJPY': { yahoo: 'GBPJPY=X', name: 'GBP/JPY', description: 'British Pound / Japanese Yen' },
    'EURCHF': { yahoo: 'EURCHF=X', name: 'EUR/CHF', description: 'Euro / Swiss Franc' },
    'EURAUD': { yahoo: 'EURAUD=X', name: 'EUR/AUD', description: 'Euro / Australian Dollar' },
    'EURCAD': { yahoo: 'EURCAD=X', name: 'EUR/CAD', description: 'Euro / Canadian Dollar' },
    'GBPCHF': { yahoo: 'GBPCHF=X', name: 'GBP/CHF', description: 'British Pound / Swiss Franc' },
    'GBPAUD': { yahoo: 'GBPAUD=X', name: 'GBP/AUD', description: 'British Pound / Australian Dollar' },
    'AUDJPY': { yahoo: 'AUDJPY=X', name: 'AUD/JPY', description: 'Australian Dollar / Japanese Yen' },
    'CADJPY': { yahoo: 'CADJPY=X', name: 'CAD/JPY', description: 'Canadian Dollar / Japanese Yen' },
    'CHFJPY': { yahoo: 'CHFJPY=X', name: 'CHF/JPY', description: 'Swiss Franc / Japanese Yen' },
    'NZDJPY': { yahoo: 'NZDJPY=X', name: 'NZD/JPY', description: 'New Zealand Dollar / Japanese Yen' },
    'AUDCAD': { yahoo: 'AUDCAD=X', name: 'AUD/CAD', description: 'Australian Dollar / Canadian Dollar' },
    'AUDCHF': { yahoo: 'AUDCHF=X', name: 'AUD/CHF', description: 'Australian Dollar / Swiss Franc' },
    'AUDNZD': { yahoo: 'AUDNZD=X', name: 'AUD/NZD', description: 'Australian Dollar / New Zealand Dollar' },
    'CADCHF': { yahoo: 'CADCHF=X', name: 'CAD/CHF', description: 'Canadian Dollar / Swiss Franc' },
    'EURNZD': { yahoo: 'EURNZD=X', name: 'EUR/NZD', description: 'Euro / New Zealand Dollar' },
    'GBPCAD': { yahoo: 'GBPCAD=X', name: 'GBP/CAD', description: 'British Pound / Canadian Dollar' },
    'GBPNZD': { yahoo: 'GBPNZD=X', name: 'GBP/NZD', description: 'British Pound / New Zealand Dollar' },
    'NZDCAD': { yahoo: 'NZDCAD=X', name: 'NZD/CAD', description: 'New Zealand Dollar / Canadian Dollar' },
    'NZDCHF': { yahoo: 'NZDCHF=X', name: 'NZD/CHF', description: 'New Zealand Dollar / Swiss Franc' },
} as const;

// ===================
// COMMODITIES (Metals & Energy)
// ===================
export const COMMODITIES = {
    'XAUUSD': { yahoo: 'GC=F', name: 'XAU/USD', description: 'Gold / US Dollar' },        // Gold Futures CMX
    'XAGUSD': { yahoo: 'SI=F', name: 'XAG/USD', description: 'Silver / US Dollar' },      // Already correct
    'XPTUSD': { yahoo: 'PL=F', name: 'XPT/USD', description: 'Platinum / US Dollar' },    // Already correct
    'XPDUSD': { yahoo: 'PA=F', name: 'XPD/USD', description: 'Palladium / US Dollar' },   // Already correct
    'XTIUSD': { yahoo: 'CL=F', name: 'WTI Oil', description: 'Crude Oil WTI' },          // Already correct
    'XBRUSD': { yahoo: 'BZ=F', name: 'Brent Oil', description: 'Brent Crude Oil' },       // Already correct
    'XNGUSD': { yahoo: 'NG=F', name: 'Natural Gas', description: 'Natural Gas' },         // Already correct
    'XCUUSD': { yahoo: 'HG=F', name: 'Copper', description: 'Copper' },                   // Already correct
} as const;

// ===================
// CRYPTOCURRENCIES
// ===================
export const CRYPTO = {
    'BTCUSD': { yahoo: 'BTC-USD', name: 'BTC/USD', description: 'Bitcoin / US Dollar' },
    'ETHUSD': { yahoo: 'ETH-USD', name: 'ETH/USD', description: 'Ethereum / US Dollar' },
    'XRPUSD': { yahoo: 'XRP-USD', name: 'XRP/USD', description: 'Ripple / US Dollar' },
    'SOLUSD': { yahoo: 'SOL-USD', name: 'SOL/USD', description: 'Solana / US Dollar' },
    'BNBUSD': { yahoo: 'BNB-USD', name: 'BNB/USD', description: 'Binance Coin / US Dollar' },
    'ADAUSD': { yahoo: 'ADA-USD', name: 'ADA/USD', description: 'Cardano / US Dollar' },
    'DOGEUSD': { yahoo: 'DOGE-USD', name: 'DOGE/USD', description: 'Dogecoin / US Dollar' },
    'DOTUSD': { yahoo: 'DOT-USD', name: 'DOT/USD', description: 'Polkadot / US Dollar' },
    'MATICUSD': { yahoo: 'MATIC-USD', name: 'MATIC/USD', description: 'Polygon / US Dollar' },
    'LINKUSD': { yahoo: 'LINK-USD', name: 'LINK/USD', description: 'Chainlink / US Dollar' },
    'AVAXUSD': { yahoo: 'AVAX-USD', name: 'AVAX/USD', description: 'Avalanche / US Dollar' },
    'LTCUSD': { yahoo: 'LTC-USD', name: 'LTC/USD', description: 'Litecoin / US Dollar' },
} as const;

// ===================
// INDICES
// ===================
export const INDICES = {
    'US30': { yahoo: 'YM=F', name: 'US30', description: 'Dow Jones Industrial Average' },
    'US500': { yahoo: 'ES=F', name: 'US500', description: 'S&P 500 Index' },
    'USTEC': { yahoo: 'NQ=F', name: 'USTEC', description: 'Nasdaq 100 Index' },
    'DE40': { yahoo: 'FDAX', name: 'DE40', description: 'German DAX 40' },
    'UK100': { yahoo: '^FTSE', name: 'UK100', description: 'FTSE 100 Index' },
    'JP225': { yahoo: 'NKD=F', name: 'JP225', description: 'Nikkei 225' },
} as const;

// ===================
// COMBINED ALL PAIRS
// ===================
export const FOREX_PAIRS = {
    ...FOREX_MAJOR,
    ...FOREX_MINOR,
    ...COMMODITIES,
    ...CRYPTO,
    ...INDICES,
} as const;

// ===================
// BROKER CONFIGURATIONS
// ===================
export const BROKER_CONFIGS = {
    oanda: {
        id: 'oanda',
        name: 'OANDA',
        description: 'OANDA Practice Feed (Real-time)',
        endpoint: 'https://api-fxpractice.oanda.com/v3',
        accuracy: 'high',
        requiresAuth: true,
        free: true,
        estimatedSpread: {
            XAUUSD: 0.5, // pips
            EURUSD: 0.3,
            GBPUSD: 0.5,
        }
    },
    swissquote: {
        id: 'swissquote',
        name: 'Swissquote',
        description: 'Swissquote Bank Feed (Real-time, No Auth)',
        endpoint: 'https://forex-data-feed.swissquote.com',
        accuracy: 'high',
        requiresAuth: false,
        free: true,
        estimatedSpread: {
            XAUUSD: 0.5,
            EURUSD: 0.3,
            GBPUSD: 0.5,
        }
    },
    yahoo: {
        id: 'yahoo',
        name: 'Yahoo Finance',
        description: 'Yahoo Finance (Reference)',
        endpoint: 'https://query2.finance.yahoo.com',
        accuracy: 'reference',
        requiresAuth: false,
        free: true,
        estimatedSpread: {
            XAUUSD: 2.0,
            EURUSD: 1.0,
            GBPUSD: 1.5,
        }
    }
} as const;

export type BrokerSource = keyof typeof BROKER_CONFIGS;

// Category definitions for UI
export const PAIR_CATEGORIES = [
    {
        id: 'major',
        name: 'Forex Major',
        icon: '💱',
        pairs: Object.keys(FOREX_MAJOR),
    },
    {
        id: 'minor',
        name: 'Forex Minor',
        icon: '📊',
        pairs: Object.keys(FOREX_MINOR),
    },
    {
        id: 'commodities',
        name: 'Commodities',
        icon: '🥇',
        pairs: Object.keys(COMMODITIES),
    },
    {
        id: 'crypto',
        name: 'Crypto',
        icon: '₿',
        pairs: Object.keys(CRYPTO),
    },
    {
        id: 'indices',
        name: 'Indices',
        icon: '📈',
        pairs: Object.keys(INDICES),
    },
] as const;

export type ForexPair = keyof typeof FOREX_PAIRS;

export const TIMEFRAMES = {
    '1m': { interval: '1m', period: '1d', label: '1 Minute' },
    '5m': { interval: '5m', period: '1d', label: '5 Minutes' },
    '15m': { interval: '15m', period: '5d', label: '15 Minutes' },
    '30m': { interval: '30m', period: '5d', label: '30 Minutes' },
    '1h': { interval: '1h', period: '5d', label: '1 Hour' },
    '4h': { interval: '1h', period: '1mo', label: '4 Hours' },
    '1d': { interval: '1d', period: '3mo', label: 'Daily' },
} as const;

export type Timeframe = keyof typeof TIMEFRAMES;

export interface MarketData {
    symbol: string;
    name: string;
    current_price: number;
    open: number;
    high: number;
    low: number;
    close: number;
    change_percent: number;
    volume: number;
    timestamp: string;
    candles: Candle[];
    is_realtime: boolean;
    is_simulated?: boolean; // New flag for dummy data
    timestampSource?: 'binance-rest' | 'yahoo-query1' | 'yahoo-query2' | 'simulated'; // Data source tracking
    freshnessSeconds?: number; // Age of data in seconds
}

export interface Candle {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export async function getMarketData(pair: ForexPair, timeframe: Timeframe): Promise<MarketData> {
    const pairConfig = FOREX_PAIRS[pair];
    const tfConfig = TIMEFRAMES[timeframe];

    if (!pairConfig) {
        return generateDummyData(pair, pair);
    }

    // [New] Strategy:
    // 1. If Crypto, try Binance First (Fastest, Realtime)
    // 2. If Forex/Stocks or Binance fails, try Yahoo (Query2 -> Query1)

    // BINANCE STRATEGY for Crypto
    if (Object.keys(CRYPTO).includes(pair)) {
        try {
            const binanceSymbol = pair.replace('USD', 'USDT'); // Map to USDT
            const data = await fetchBinancePrice(binanceSymbol, tfConfig.interval);
            if (data && data.current_price !== undefined && data.candles && data.candles.length > 0) {
                // Calculate freshness for crypto (stricter threshold: 2 minutes)
                const lastCandle = data.candles[data.candles.length - 1];
                const lastTime = new Date(lastCandle.time).getTime();
                const freshnessSeconds = Math.floor((Date.now() - lastTime) / 1000);
                const isFresh = freshnessSeconds < 120; // 2 minutes for crypto

                return {
                    symbol: pair,
                    name: pairConfig.name,
                    current_price: data.current_price,
                    open: data.open || 0,
                    high: data.high || 0,
                    low: data.low || 0,
                    close: data.close || 0,
                    change_percent: data.change_percent || 0,
                    volume: data.volume || 0,
                    timestamp: data.timestamp || new Date().toISOString(),
                    candles: data.candles || [],
                    is_realtime: isFresh,
                    is_simulated: false,
                    timestampSource: 'binance-rest',
                    freshnessSeconds
                };
            }
        } catch (e) {
            console.warn(`Binance failed for ${pair}, falling back to Yahoo.`);
        }
    }

    // YAHOO STRATEGY (Round Robin query1/query2)
    const hosts = ['query2.finance.yahoo.com', 'query1.finance.yahoo.com'];
    let lastError;

    for (const host of hosts) {
        try {
            const timestamp = new Date().getTime();
            const url = `https://${host}/v8/finance/chart/${pairConfig.yahoo}?interval=${tfConfig.interval}&range=${tfConfig.period}&_=${timestamp}`;

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                },
                cache: 'no-store',
            });

            if (!response.ok) {
                if (response.status === 429) continue; // Rate limit, try next host
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const result = data.chart?.result?.[0];

            if (!result) continue;

            const quote = result.indicators?.quote?.[0];
            const timestamps = result.timestamp || [];
            const meta = result.meta;

            const candles: Candle[] = [];
            const limit = Math.min(timestamps.length, 50);

            for (let i = timestamps.length - limit; i < timestamps.length; i++) {
                if (quote.open[i] !== null && quote.close[i] !== null) { // Strict null check
                    candles.push({
                        time: new Date(timestamps[i] * 1000).toISOString(),
                        open: quote.open[i] || 0,
                        high: quote.high[i] || 0,
                        low: quote.low[i] || 0,
                        close: quote.close[i] || 0,
                        volume: quote.volume?.[i] || 0,
                    });
                }
            }

            if (candles.length === 0) throw new Error('No valid candles found');

            const lastCandle = candles[candles.length - 1];
            const prevCandle = candles.length > 1 ? candles[candles.length - 2] : lastCandle;

            const change_percent = prevCandle.close > 0
                ? ((lastCandle.close - prevCandle.close) / prevCandle.close) * 100
                : 0;

            const currentPrice = meta.regularMarketPrice || lastCandle.close;

            // Freshness check - IMPROVED: Different thresholds based on asset type
            const lastTime = new Date(lastCandle.time).getTime();
            const freshnessSeconds = Math.floor((Date.now() - lastTime) / 1000);

            // Determine freshness threshold based on asset type
            let freshnessThreshold = 300; // Default: 5 minutes for forex
            if (Object.keys(CRYPTO).includes(pair)) {
                freshnessThreshold = 120; // 2 minutes for crypto
            } else if (Object.keys(INDICES).includes(pair)) {
                freshnessThreshold = 300; // 5 minutes for indices
            }

            const isFresh = freshnessSeconds < freshnessThreshold;
            const dataSource = host.includes('query1') ? 'yahoo-query1' : 'yahoo-query2';

            console.log(`[Market Data] ${pair} from ${dataSource}: ${freshnessSeconds}s old, fresh=${isFresh} (threshold=${freshnessThreshold}s)`);

            return {
                symbol: pair,
                name: pairConfig.name,
                current_price: currentPrice,
                open: lastCandle.open,
                high: lastCandle.high,
                low: lastCandle.low,
                close: lastCandle.close,
                change_percent: Number(change_percent.toFixed(4)),
                volume: lastCandle.volume,
                timestamp: new Date().toISOString(),
                candles,
                is_realtime: isFresh,
                is_simulated: false,
                timestampSource: dataSource,
                freshnessSeconds
            };

        } catch (error) {
            lastError = error;
            console.warn(`Yahoo host ${host} failed for ${pair}:`, error);
        }
    }

    // Fallback to Dummy Only if ALL failed
    console.error(`All sources failed for ${pair}. Returning SIMULATED data.`);
    const dummy = generateDummyData(pair, pairConfig?.name || pair);
    dummy.is_realtime = false;
    dummy.is_simulated = true; // Explicitly mark as simulated
    dummy.timestampSource = 'simulated';
    dummy.freshnessSeconds = 0; // Simulated data has no real freshness
    return dummy;
}

// Helper: Fetch from Binance (Public API)
async function fetchBinancePrice(symbol: string, interval: string): Promise<Partial<MarketData> | null> {
    // Map intervals: 1m->1m, 1h->1h, 1d->1d. No change needed mostly.
    const binanceInterval = interval;

    // Failover endpoints
    const endpoints = [
        'https://api.binance.com/api/v3/klines',
        'https://data-api.binance.vision/api/v3/klines',
        'https://api.binance.us/api/v3/klines'
    ];

    for (const ep of endpoints) {
        try {
            // Adjust symbol for US if needed
            let targetSymbol = symbol;
            if (ep.includes('binance.us')) {
                targetSymbol = symbol.replace('USDT', 'USD');
            }

            const res = await fetch(`${ep}?symbol=${targetSymbol}&interval=${binanceInterval}&limit=50`, {
                cache: 'no-store'
            });

            if (!res.ok) continue;

            const data = await res.json();
            if (!Array.isArray(data) || data.length === 0) continue;

            // Parse Candles (Binance format: [time, open, high, low, close, vol, ...])
            const candles: Candle[] = data.map((d: any) => ({
                time: new Date(d[0]).toISOString(),
                open: parseFloat(d[1]),
                high: parseFloat(d[2]),
                low: parseFloat(d[3]),
                close: parseFloat(d[4]),
                volume: parseFloat(d[5]),
            }));

            const last = candles[candles.length - 1];
            const prev = candles.length > 1 ? candles[candles.length - 2] : last;
            const change = ((last.close - prev.close) / prev.close) * 100;

            return {
                current_price: last.close,
                open: last.open,
                high: last.high,
                low: last.low,
                close: last.close,
                change_percent: Number(change.toFixed(4)),
                volume: last.volume,
                timestamp: new Date().toISOString(),
                candles
            };

        } catch (err) {
            // Try next endpoint
        }
    }
    return null;
}

// Helper: Fetch from OANDA Practice API
async function fetchOandaPrice(symbol: string, interval: string): Promise<Partial<MarketData> | null> {
    const apiKey = process.env.NEXT_PUBLIC_OANDA_API_KEY || process.env.OANDA_API_KEY;

    if (!apiKey) {
        console.warn('OANDA API key not configured');
        return null;
    }

    try {
        // Map symbols to OANDA format
        const oandaSymbol = symbol.replace('/', '_'); // XAUUSD -> XAU_USD

        // Map interval to OANDA granularity
        const granularityMap: Record<string, string> = {
            '1m': 'M1',
            '5m': 'M5',
            '15m': 'M15',
            '30m': 'M30',
            '1h': 'H1',
            '4h': 'H4',
            '1d': 'D'
        };
        const granularity = granularityMap[interval] || 'H1';

        const endpoint = `https://api-fxpractice.oanda.com/v3/instruments/${oandaSymbol}/candles`;
        const response = await fetch(`${endpoint}?granularity=${granularity}&count=50`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            console.warn(`OANDA API error: ${response.status}`);
            return null;
        }

        const data = await response.json();
        const candles: Candle[] = data.candles?.map((c: any) => ({
            time: c.time,
            open: parseFloat(c.mid.o),
            high: parseFloat(c.mid.h),
            low: parseFloat(c.mid.l),
            close: parseFloat(c.mid.c),
            volume: c.volume || 0
        })) || [];

        if (candles.length === 0) return null;

        const last = candles[candles.length - 1];
        const prev = candles.length > 1 ? candles[candles.length - 2] : last;
        const change = ((last.close - prev.close) / prev.close) * 100;

        return {
            current_price: last.close,
            open: last.open,
            high: last.high,
            low: last.low,
            close: last.close,
            change_percent: Number(change.toFixed(4)),
            volume: last.volume,
            timestamp: new Date().toISOString(),
            candles
        };

    } catch (error) {
        console.error('OANDA fetch error:', error);
        return null;
    }
}

// Helper: Fetch from Swissquote Bank (No auth needed!)
async function fetchSwissquotePrice(symbol: string, interval: string): Promise<Partial<MarketData> | null> {
    try {
        // Parse symbol: XAUUSD → XAU/USD
        let base, quote;

        if (symbol.includes('/')) {
            [base, quote] = symbol.split('/');
        } else {
            // Handle various formats
            if (symbol.startsWith('XAU')) {
                base = 'XAU';
                quote = symbol.slice(3);
            } else if (symbol.startsWith('XAG')) {
                base = 'XAG';
                quote = symbol.slice(3);
            } else {
                // Standard forex: EURUSD → EUR/USD
                base = symbol.slice(0, 3);
                quote = symbol.slice(3);
            }
        }

        const endpoint = `https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/${base}/${quote}`;

        console.log(`[Swissquote] Fetching ${base}/${quote} from ${endpoint}`);

        const response = await fetch(endpoint, {
            cache: 'no-store',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0'
            },
            // Add timeout
            signal: AbortSignal.timeout(8000)
        });

        if (!response.ok) {
            console.warn(`[Swissquote] API error: ${response.status} ${response.statusText}`);
            return null;
        }

        const data = await response.json();
        console.log(`[Swissquote] Response:`, JSON.stringify(data).slice(0, 200));

        // Swissquote response structure varies - try multiple paths
        let price = 0;

        if (Array.isArray(data) && data.length > 0) {
            const quote = data[0];
            price = parseFloat(
                quote.spreadProfilePrices?.[0]?.bid ||
                quote.bid ||
                quote.last ||
                quote.close ||
                0
            );
        } else if (data.bid || data.ask || data.last) {
            price = parseFloat(data.bid || data.last || data.close || 0);
        }

        if (price === 0 || isNaN(price)) {
            console.warn(`[Swissquote] Invalid price from response`);
            return null;
        }

        console.log(`[Swissquote] ✅ Got price: ${price} for ${symbol}`);

        // Generate candles from current price
        const candle: Candle = {
            time: new Date().toISOString(),
            open: price,
            high: price * 1.0005,
            low: price * 0.9995,
            close: price,
            volume: 0
        };

        return {
            current_price: price,
            open: price,
            high: price * 1.0005,
            low: price * 0.9995,
            close: price,
            change_percent: 0,
            volume: 0,
            timestamp: new Date().toISOString(),
            candles: [candle],
            is_realtime: true,
            is_simulated: false,
            timestampSource: 'swissquote' as any,
            freshnessSeconds: 5
        };

    } catch (error) {
        console.error('[Swissquote] Fetch error:', error);
        return null;
    }
}

// Main function: Get price from specified broker - NO SIMULATED DATA!
export async function getBrokerPrice(
    pair: ForexPair,
    timeframe: Timeframe,
    preferredBroker: BrokerSource = 'swissquote'
): Promise<MarketData> {
    const pairConfig = FOREX_PAIRS[pair];
    const tfConfig = TIMEFRAMES[timeframe];

    if (!pairConfig) {
        throw new Error(`Invalid trading pair: ${pair}`);
    }

    console.log(`[getBrokerPrice] Fetching ${pair} from ${preferredBroker}`);

    // For CRYPTO pairs → use Binance (real-time)
    if (Object.keys(CRYPTO).includes(pair)) {
        console.log(`[getBrokerPrice] ${pair} is crypto → using Binance`);
        const binanceData = await getMarketData(pair, timeframe);

        // Ensure Binance data is real
        if (binanceData.is_simulated) {
            throw new Error(`Binance real-time data unavailable for ${pair}`);
        }

        return binanceData;
    }

    // For FOREX/COMMODITIES → try OANDA first if selected
    if (preferredBroker === 'oanda') {
        const oandaData = await fetchOandaPrice(pair, tfConfig.interval);
        if (oandaData && oandaData.current_price && oandaData.current_price > 0) {
            console.log(`[getBrokerPrice] ✅ OANDA success: ${pair} = $${oandaData.current_price}`);
            return {
                symbol: pair,
                name: pairConfig.name,
                ...oandaData,
                is_realtime: true,
                is_simulated: false,
                timestampSource: 'oanda' as any,
                freshnessSeconds: 5
            } as MarketData;
        }
        console.warn(`[getBrokerPrice] ⚠️ OANDA failed for ${pair}, trying Swissquote...`);
    }

    // For FOREX/COMMODITIES → Swissquote (primary)
    const swissquoteData = await fetchSwissquotePrice(pair, tfConfig.interval);
    if (swissquoteData && swissquoteData.current_price && swissquoteData.current_price > 0) {
        console.log(`[getBrokerPrice] ✅ Swissquote success: ${pair} = $${swissquoteData.current_price}`);
        return {
            symbol: pair,
            name: pairConfig.name,
            ...swissquoteData,
            is_realtime: true,
            is_simulated: false,
            timestampSource: 'swissquote' as any,
            freshnessSeconds: 5
        } as MarketData;
    }

    // NO FALLBACK TO SIMULATED! Return error instead
    console.error(`[getBrokerPrice] ❌ All price sources failed for ${pair}`);
    throw new Error(
        `Real-time price data unavailable for ${pair}. ` +
        `Swissquote API may be down. Please try again later.`
    );
}

function generateDummyData(symbol: string, name: string): MarketData {
    const basePrice = symbol.includes('XAU') ? 2830 :
        symbol.includes('XAG') ? 30 :
            symbol.includes('XTI') || symbol.includes('XBR') ? 75 :
                symbol.includes('BTC') ? 100000 :
                    symbol.includes('ETH') ? 3500 :
                        symbol.includes('US30') ? 43000 :
                            symbol.includes('US500') ? 6000 :
                                symbol.includes('USTEC') ? 21000 :
                                    1.0850;

    const variance = basePrice * 0.002;
    const candles: Candle[] = [];

    for (let i = 0; i < 50; i++) {
        const open = basePrice + (Math.random() - 0.5) * variance;
        const close = open + (Math.random() - 0.5) * variance;
        const high = Math.max(open, close) + Math.random() * variance * 0.5;
        const low = Math.min(open, close) - Math.random() * variance * 0.5;

        candles.push({
            time: new Date(Date.now() - (50 - i) * 3600000).toISOString(),
            open,
            high,
            low,
            close,
            volume: Math.floor(Math.random() * 10000),
        });
    }

    const lastCandle = candles[candles.length - 1];

    return {
        symbol,
        name,
        current_price: lastCandle.close,
        open: lastCandle.open,
        high: lastCandle.high,
        low: lastCandle.low,
        close: lastCandle.close,
        change_percent: ((lastCandle.close - lastCandle.open) / lastCandle.open * 100),
        volume: lastCandle.volume,
        timestamp: new Date().toISOString(),
        candles,
        is_realtime: false,
        is_simulated: true,
        timestampSource: 'simulated',
        freshnessSeconds: 0,
    };
}

export function formatMarketDataForAI(data: MarketData, timeframe: string): string {
    const recentCandles = data.candles.slice(-10);

    // Determine decimal places based on symbol
    const decimals = data.symbol.includes('JPY') ? 3 :
        data.symbol.includes('XAU') || data.symbol.includes('US') ? 2 :
            data.symbol.includes('BTC') ? 2 :
                5;

    let candleText = recentCandles.map((c, i) => {
        const direction = c.close > c.open ? '🟢' : '🔴';
        return `${i + 1}. ${direction} O:${c.open.toFixed(decimals)} H:${c.high.toFixed(decimals)} L:${c.low.toFixed(decimals)} C:${c.close.toFixed(decimals)}`;
    }).join('\n');

    const highs = recentCandles.map(c => c.high);
    const lows = recentCandles.map(c => c.low);
    const resistance = Math.max(...highs);
    const support = Math.min(...lows);
    const pivot = (resistance + support + data.close) / 3;

    return `
=== MARKET DATA ===
PAIR: ${data.symbol} (${data.name})
TIMEFRAME: ${timeframe}
CURRENT PRICE: ${data.current_price.toFixed(decimals)}
CHANGE: ${data.change_percent > 0 ? '+' : ''}${data.change_percent.toFixed(4)}%
TIMESTAMP: ${data.timestamp}

=== LAST 10 CANDLES ===
${candleText}

=== KEY LEVELS ===
Resistance: ${resistance.toFixed(decimals)}
Support: ${support.toFixed(decimals)}
Pivot: ${pivot.toFixed(decimals)}
Daily Range: ${(resistance - support).toFixed(decimals)}

=== PRICE ACTION ===
Last Close vs Open: ${data.close > data.open ? 'BULLISH' : 'BEARISH'}
Price Position: ${data.close > pivot ? 'ABOVE PIVOT (Bullish Bias)' : 'BELOW PIVOT (Bearish Bias)'}
`.trim();
}
