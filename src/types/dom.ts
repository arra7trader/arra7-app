// DOM ARRA Types
// Real-time order book and prediction data structures

export interface OrderBookLevel {
    price: number;      // Price level
    volume: number;     // Volume at this level
    total: number;      // Cumulative volume
    percentage: number; // Percentage of max volume (for visualization)
}

export interface OrderBook {
    symbol: string;
    bids: OrderBookLevel[];  // Sorted by price descending (highest first)
    asks: OrderBookLevel[];  // Sorted by price ascending (lowest first)
    lastUpdate: number;      // Timestamp
    spread: number;          // Ask[0].price - Bid[0].price
    spreadPercent: number;   // Spread as percentage
    midPrice: number;        // (Best bid + Best ask) / 2
    totalBidVolume: number;  // Sum of all bid volumes
    totalAskVolume: number;  // Sum of all ask volumes
    imbalance: number;       // -100 to +100 (negative = sellers, positive = buyers)
    dataSource: 'REAL' | 'SIMULATED';
}

export interface DOMPrediction {
    direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    strength: number;        // 0-100
    confidence: number;      // 0-100
    signals: DOMSignal[];    // Key signals detected
    imbalance: number;       // Bid/Ask ratio (-100 to +100)
    whaleActivity: 'HIGH' | 'MEDIUM' | 'LOW';
    recommendation: string;  // Human-readable prediction
    timestamp: number;
}

export interface DOMSignal {
    type: 'WHALE_BUY' | 'WHALE_SELL' | 'ABSORPTION' | 'ICEBERG' | 'SPOOFING' | 'MOMENTUM' | 'SUPPORT' | 'RESISTANCE';
    level: 'HIGH' | 'MEDIUM' | 'LOW';
    price?: number;
    volume?: number;
    description: string;
}

export interface DOMStats {
    lastPrice: number;
    change24h: number;
    changePercent24h: number;
    high24h: number;
    low24h: number;
    volume24h: number;
    avgSpread: number;
}

// Binance WebSocket message types
export interface BinanceDepthUpdate {
    e: string;     // Event type
    E: number;     // Event time
    s: string;     // Symbol
    U: number;     // First update ID
    u: number;     // Final update ID
    b: [string, string][];  // Bids [price, quantity]
    a: [string, string][];  // Asks [price, quantity]
}

export interface BinancePartialDepth {
    lastUpdateId: number;
    bids: [string, string][];  // [price, quantity]
    asks: [string, string][];  // [price, quantity]
}

// Symbol configuration
export const DOM_SYMBOLS = {
    BTCUSD: {
        id: 'BTCUSD',
        name: 'Bitcoin / USD',
        binanceSymbol: 'btcusdt',
        tickSize: 0.01,
        decimals: 2,
        volumeDecimals: 5,
        icon: '₿',
        dataSource: 'REAL' as const,
    },
    XAUUSD: {
        id: 'XAUUSD',
        name: 'Gold / USD (PAXG)',
        binanceSymbol: 'paxgusdt', // PAX Gold - tokenized gold on Binance
        tickSize: 0.01,
        decimals: 2,
        volumeDecimals: 4,
        icon: '🥇',
        dataSource: 'REAL' as const,
    },
} as const;

export type DOMSymbolId = keyof typeof DOM_SYMBOLS;
