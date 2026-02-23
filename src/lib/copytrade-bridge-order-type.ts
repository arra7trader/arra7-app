export type CanonicalBridgeOrderType =
    | 'BUY'
    | 'SELL'
    | 'BUY LIMIT'
    | 'SELL LIMIT'
    | 'BUY STOP'
    | 'SELL STOP';

const TYPE_ALIASES: Record<string, CanonicalBridgeOrderType> = {
    BUY: 'BUY',
    MARKETBUY: 'BUY',
    BUYMARKET: 'BUY',
    CALL: 'BUY',

    SELL: 'SELL',
    MARKETSELL: 'SELL',
    SELLMARKET: 'SELL',
    PUT: 'SELL',

    BUYLIMIT: 'BUY LIMIT',
    LIMITBUY: 'BUY LIMIT',

    SELLLIMIT: 'SELL LIMIT',
    LIMITSELL: 'SELL LIMIT',

    BUYSTOP: 'BUY STOP',
    STOPBUY: 'BUY STOP',

    SELLSTOP: 'SELL STOP',
    STOPSELL: 'SELL STOP',
};

function compactToken(input: string): string {
    return input
        .toUpperCase()
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b(ORDER|ENTRY|POSITION)\b/g, '')
        .replace(/\s+/g, '');
}

export function normalizeBridgeOrderType(rawType: unknown): CanonicalBridgeOrderType | null {
    const raw = typeof rawType === 'string' ? rawType : String(rawType ?? '');
    const token = compactToken(raw);
    if (!token) return null;
    return TYPE_ALIASES[token] ?? null;
}

