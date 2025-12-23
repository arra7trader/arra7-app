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
    'XAUUSD': { yahoo: 'GC=F', name: 'XAU/USD', description: 'Gold / US Dollar' },
    'XAGUSD': { yahoo: 'SI=F', name: 'XAG/USD', description: 'Silver / US Dollar' },
    'XPTUSD': { yahoo: 'PL=F', name: 'XPT/USD', description: 'Platinum / US Dollar' },
    'XPDUSD': { yahoo: 'PA=F', name: 'XPD/USD', description: 'Palladium / US Dollar' },
    'XTIUSD': { yahoo: 'CL=F', name: 'WTI Oil', description: 'Crude Oil WTI' },
    'XBRUSD': { yahoo: 'BZ=F', name: 'Brent Oil', description: 'Brent Crude Oil' },
    'XNGUSD': { yahoo: 'NG=F', name: 'Natural Gas', description: 'Natural Gas' },
    'XCUUSD': { yahoo: 'HG=F', name: 'Copper', description: 'Copper' },
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
    candles: CandleData[];
    is_realtime: boolean;
}

export interface CandleData {
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

    try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${pairConfig.yahoo}?interval=${tfConfig.interval}&range=${tfConfig.period}`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            next: { revalidate: 60 },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch market data');
        }

        const data = await response.json();
        const result = data.chart?.result?.[0];

        if (!result) {
            throw new Error('No data available');
        }

        const quote = result.indicators?.quote?.[0];
        const timestamps = result.timestamp || [];
        const meta = result.meta;

        const candles: CandleData[] = [];
        const limit = Math.min(timestamps.length, 50);

        for (let i = timestamps.length - limit; i < timestamps.length; i++) {
            if (quote.open[i] && quote.close[i]) {
                candles.push({
                    time: new Date(timestamps[i] * 1000).toISOString(),
                    open: quote.open[i],
                    high: quote.high[i],
                    low: quote.low[i],
                    close: quote.close[i],
                    volume: quote.volume?.[i] || 0,
                });
            }
        }

        const lastCandle = candles[candles.length - 1];
        const prevCandle = candles[candles.length - 2];

        const change_percent = prevCandle
            ? ((lastCandle.close - prevCandle.close) / prevCandle.close) * 100
            : 0;

        return {
            symbol: pair,
            name: pairConfig.name,
            current_price: meta.regularMarketPrice || lastCandle?.close || 0,
            open: lastCandle?.open || 0,
            high: lastCandle?.high || 0,
            low: lastCandle?.low || 0,
            close: lastCandle?.close || 0,
            change_percent: Number(change_percent.toFixed(4)),
            volume: lastCandle?.volume || 0,
            timestamp: new Date().toISOString(),
            candles,
            is_realtime: true,
        };

    } catch (error) {
        console.error('Market data error:', error);
        return generateDummyData(pair, pairConfig?.name || pair);
    }
}

function generateDummyData(symbol: string, name: string): MarketData {
    const basePrice = symbol.includes('XAU') ? 2650 :
        symbol.includes('XAG') ? 30 :
            symbol.includes('XTI') || symbol.includes('XBR') ? 75 :
                symbol.includes('BTC') ? 100000 :
                    symbol.includes('ETH') ? 3500 :
                        symbol.includes('US30') ? 43000 :
                            symbol.includes('US500') ? 6000 :
                                symbol.includes('USTEC') ? 21000 :
                                    1.0850;

    const variance = basePrice * 0.002;
    const candles: CandleData[] = [];

    for (let i = 0; i < 20; i++) {
        const open = basePrice + (Math.random() - 0.5) * variance;
        const close = open + (Math.random() - 0.5) * variance;
        const high = Math.max(open, close) + Math.random() * variance * 0.5;
        const low = Math.min(open, close) - Math.random() * variance * 0.5;

        candles.push({
            time: new Date(Date.now() - (20 - i) * 3600000).toISOString(),
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
