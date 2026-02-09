import { z } from 'zod';
import { getBrokerPrice, FOREX_PAIRS } from '@/lib/market-data';
import { getForexNews } from '@/lib/groq-ai';
import { tool } from 'ai';

// 1. Price Checker Tool
export const priceTool = tool({
    description: 'Get real-time price for a crypto or forex pair. Use this when user asks for "price", "market", or "chart".',
    parameters: z.object({
        symbol: z.string().describe('The symbol to check (e.g., BTCUSD, XAUUSD, EURUSD)'),
        timeframe: z.enum(['1m', '5m', '15m', '1h', '4h', '1d']).optional().describe('Timeframe for the data (default: 1h)'),
    }),
    execute: async ({ symbol, timeframe = '1h' }: { symbol: string, timeframe?: string }) => {
        try {
            // Normalize symbol
            let pair = symbol.toUpperCase().replace('/', '').replace('-', '');

            // Basic mapping if user types "BTC", "GOLD"
            const map: Record<string, string> = {
                'BTC': 'BTCUSD',
                'ETH': 'ETHUSD',
                'GOLD': 'XAUUSD',
                'XAU': 'XAUUSD',
                'EUR': 'EURUSD',
                'GBP': 'GBPUSD'
            };
            pair = map[pair] || pair;

            // Validate against known pairs
            if (!Object.keys(FOREX_PAIRS).includes(pair)) {
                // Try adding USD if missing
                if (Object.keys(FOREX_PAIRS).includes(pair + 'USD')) {
                    pair = pair + 'USD';
                } else {
                    return { error: `Symbol ${symbol} not found.` };
                }
            }

            const data = await getBrokerPrice(pair as any, timeframe as any);

            return {
                symbol: data.symbol,
                price: data.current_price,
                change: data.change_percent,
                high: data.high,
                low: data.low,
                is_realtime: data.is_realtime,
                source: data.timestampSource
            };
        } catch (error: any) {
            return { error: error.message || 'Failed to fetch price.' };
        }
    },
} as any);

// 2. News Tool
export const newsTool = tool({
    description: 'Get the latest high-impact financial news (Forex/Crypto). Use this for "news", "events", or "calendar".',
    parameters: z.object({}),
    execute: async () => {
        try {
            const { events } = await getForexNews();
            if (events.length === 0) return { message: "No high impact news for today/tomorrow." };

            return {
                news: events.map(e => ({
                    time: e.time,
                    currency: e.country,
                    title: e.title,
                    impact: e.impact
                }))
            };
        } catch (error) {
            return { error: 'Failed to fetch news.' };
        }
    },
} as any);
