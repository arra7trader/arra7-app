import { z } from 'zod';
import { getBrokerPrice, getMarketData, formatMarketDataForAI, FOREX_PAIRS } from '@/lib/market-data';
import { getForexNews, analyzeWithGroq } from '@/lib/groq-ai';
import { getPredictor, updatePriceHistory } from '@/lib/smart-predictor';
import { isMarketOpen } from '@/lib/market-hours';
import { tool } from 'ai';

// ═══════════════════════════════════════════════════════
// 1. PRICE CHECKER TOOL
// ═══════════════════════════════════════════════════════
export const priceTool = tool({
    description: 'Get real-time price for a crypto, forex, commodity, or index. Use when user asks for "price", "harga", "market", or "chart".',
    parameters: z.object({
        symbol: z.string().describe('The symbol to check (e.g., BTCUSD, XAUUSD, EURUSD, BBRI.JK)'),
        timeframe: z.enum(['1m', '5m', '15m', '1h', '4h', '1d']).optional().describe('Timeframe (default: 1h)'),
    }),
    execute: async ({ symbol, timeframe = '1h' }: { symbol: string, timeframe?: string }) => {
        try {
            let pair = symbol.toUpperCase().replace('/', '').replace('-', '');
            const map: Record<string, string> = {
                'BTC': 'BTCUSD', 'ETH': 'ETHUSD', 'GOLD': 'XAUUSD',
                'XAU': 'XAUUSD', 'EUR': 'EURUSD', 'GBP': 'GBPUSD',
                'SILVER': 'XAGUSD', 'OIL': 'USOIL',
            };
            pair = map[pair] || pair;

            if (!Object.keys(FOREX_PAIRS).includes(pair)) {
                if (Object.keys(FOREX_PAIRS).includes(pair + 'USD')) {
                    pair = pair + 'USD';
                } else {
                    return { error: `Symbol ${symbol} not found. Try: XAUUSD, EURUSD, BTCUSD` };
                }
            }

            const data = await getBrokerPrice(pair as any, timeframe as any);
            return {
                symbol: data.symbol,
                price: data.current_price,
                change: data.change_percent,
                high: data.high,
                low: data.low,
                open: data.open,
                is_realtime: data.is_realtime,
                source: data.timestampSource
            };
        } catch (error: any) {
            return { error: error.message || 'Failed to fetch price.' };
        }
    },
} as any);

// ═══════════════════════════════════════════════════════
// 2. NEWS TOOL
// ═══════════════════════════════════════════════════════
export const newsTool = tool({
    description: 'Get high-impact financial news for today/tomorrow (Forex Factory). Use for "news", "berita", "events", "calendar", "jadwal".',
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

// ═══════════════════════════════════════════════════════
// 3. FOREX AI ANALYSIS TOOL (Deep Analysis)
// ═══════════════════════════════════════════════════════
export const analyzeForexTool = tool({
    description: 'Run deep AI analysis on a forex/crypto/commodity pair. Returns comprehensive analysis with BUY/SELL signals, entry, SL, TP. Use when user asks to "analisa", "analyze", "signal", or "setup".',
    parameters: z.object({
        symbol: z.string().describe('Symbol to analyze (e.g., XAUUSD, EURUSD, BTCUSD)'),
        timeframe: z.enum(['15m', '1h', '4h', '1d']).optional().describe('Timeframe (default: 1h)'),
    }),
    execute: async ({ symbol, timeframe = '1h' }: { symbol: string, timeframe?: string }) => {
        try {
            let pair = symbol.toUpperCase().replace('/', '').replace('-', '');
            const map: Record<string, string> = {
                'BTC': 'BTCUSD', 'ETH': 'ETHUSD', 'GOLD': 'XAUUSD',
                'XAU': 'XAUUSD', 'EUR': 'EURUSD', 'GBP': 'GBPUSD',
            };
            pair = map[pair] || pair;

            if (!Object.keys(FOREX_PAIRS).includes(pair)) {
                if (Object.keys(FOREX_PAIRS).includes(pair + 'USD')) {
                    pair = pair + 'USD';
                } else {
                    return { error: `Symbol ${symbol} not available for analysis.` };
                }
            }

            const marketData = await getMarketData(pair as any, timeframe as any);
            const formattedData = formatMarketDataForAI(marketData, timeframe);
            const result = await analyzeWithGroq(formattedData);

            if (!result.success) {
                return { error: result.error || 'Analysis failed.' };
            }

            return {
                type: 'analysis',
                symbol: pair,
                timeframe,
                analysis: result.analysis,
                price: marketData.current_price,
                high: marketData.high,
                low: marketData.low,
            };
        } catch (error: any) {
            return { error: error.message || 'Analysis failed.' };
        }
    },
} as any);

// ═══════════════════════════════════════════════════════
// 4. STOCK ANALYSIS TOOL
// ═══════════════════════════════════════════════════════
export const analyzeStockTool = tool({
    description: 'Run AI analysis on Indonesian (IDX) or US stocks. LONG-ONLY (no short selling). Use when user mentions "saham", "stock", "BBRI", "TLKM", "AAPL", etc.',
    parameters: z.object({
        symbol: z.string().describe('Stock ticker (e.g., BBRI.JK, TLKM.JK, AAPL, GOOGL)'),
        market: z.enum(['IDX', 'US']).optional().describe('Market (default: IDX for .JK suffix, US otherwise)'),
    }),
    execute: async ({ symbol, market }: { symbol: string, market?: string }) => {
        try {
            let ticker = symbol.toUpperCase();
            const detectedMarket = market || (ticker.includes('.JK') ? 'IDX' : 'US');

            // Auto-append .JK for IDX if missing
            if (detectedMarket === 'IDX' && !ticker.includes('.JK')) {
                ticker = ticker + '.JK';
            }

            // Use formatMarketDataForAI with stock context
            const formattedData = `STOCK ANALYSIS REQUEST
Symbol: ${ticker}
Market: ${detectedMarket}
Type: Stock (LONG-ONLY - No Short Selling)
Note: This is a stock, not forex. Use fundamental + technical analysis.
Price data will be fetched from Yahoo Finance via symbol: ${ticker}`;

            const result = await analyzeWithGroq(formattedData);

            if (!result.success) {
                return { error: result.error || 'Stock analysis failed.' };
            }

            return {
                type: 'stock_analysis',
                symbol: ticker,
                market: detectedMarket,
                analysis: result.analysis,
            };
        } catch (error: any) {
            return { error: error.message || 'Stock analysis failed.' };
        }
    },
} as any);

// ═══════════════════════════════════════════════════════
// 5. ML PREDICTION TOOL (SmartPredictor)
// ═══════════════════════════════════════════════════════
export const mlPredictionTool = tool({
    description: 'Get ML-based prediction using SmartPredictor (order flow signals, momentum, VWAP). Returns direction (UP/DOWN/NEUTRAL), confidence %, and trade setup. Use for "prediksi", "prediction", "ML", "AI prediction".',
    parameters: z.object({
        symbol: z.string().describe('Symbol (e.g., XAUUSD, BTCUSD, EURUSD)'),
    }),
    execute: async ({ symbol }: { symbol: string }) => {
        try {
            let pair = symbol.toUpperCase().replace('/', '').replace('-', '');
            const map: Record<string, string> = {
                'BTC': 'BTCUSD', 'ETH': 'ETHUSD', 'GOLD': 'XAUUSD',
                'XAU': 'XAUUSD', 'EUR': 'EURUSD', 'GBP': 'GBPUSD',
            };
            pair = map[pair] || pair;

            // Try to get market data first for price context
            let currentPrice = 0;
            try {
                if (Object.keys(FOREX_PAIRS).includes(pair)) {
                    const data = await getBrokerPrice(pair as any, '1h');
                    currentPrice = data.current_price;
                    updatePriceHistory(pair, currentPrice);
                }
            } catch {
                // Price fetch failed, predictor will use cache
            }

            const predictor = getPredictor(pair);

            // Use predictStock-style if no orderbook, with price history
            const result = predictor.predictStock(currentPrice, []);

            return {
                type: 'ml_prediction',
                symbol: pair,
                direction: result.direction,
                confidence: Math.round(result.confidence * 100),
                probabilities: {
                    UP: Math.round(result.probabilities.UP * 100),
                    DOWN: Math.round(result.probabilities.DOWN * 100),
                    NEUTRAL: Math.round(result.probabilities.NEUTRAL * 100),
                },
                model: result.model_used,
                signals: result.signals.map(s => ({
                    name: s.name,
                    signal: s.signal === 1 ? 'BULLISH' : s.signal === -1 ? 'BEARISH' : 'NEUTRAL',
                    weight: Math.round(s.weight * 100) + '%',
                })),
                tradeSetup: result.tradeSetup ? {
                    action: result.tradeSetup.action,
                    entry: result.tradeSetup.entry,
                    tp: result.tradeSetup.tp,
                    sl: result.tradeSetup.sl,
                    rr: result.tradeSetup.riskRewardRatio,
                    quality: result.tradeSetup.quality,
                } : null,
            };
        } catch (error: any) {
            return { error: error.message || 'ML Prediction failed.' };
        }
    },
} as any);

// ═══════════════════════════════════════════════════════
// 6. SIGNAL HISTORY TOOL
// ═══════════════════════════════════════════════════════
export const signalHistoryTool = tool({
    description: 'Get historical signal performance summary. Use when user asks about "riwayat signal", "signal history", "performa", "track record", "win rate".',
    parameters: z.object({
        period: z.enum(['today', '7d', '30d', 'all']).optional().describe('Period to check (default: 7d)'),
    }),
    execute: async ({ period = '7d' }: { period?: string }) => {
        try {
            const { getPerformanceSummary } = await import('@/lib/signal-tracker');
            const summary = await getPerformanceSummary(period as any);
            return {
                type: 'signal_history',
                period,
                ...summary,
            };
        } catch (error: any) {
            return { error: error.message || 'Failed to fetch signal history.' };
        }
    },
} as any);

// ═══════════════════════════════════════════════════════
// 7. PORTFOLIO TOOL
// ═══════════════════════════════════════════════════════
export const portfolioTool = tool({
    description: 'Get user portfolio summary with open positions and P&L. Use when user asks "portfolio saya", "posisi saya", "my positions", "P&L".',
    parameters: z.object({
        userId: z.string().optional().describe('User ID (auto-filled from session)'),
    }),
    execute: async ({ userId = 'default' }: { userId?: string }) => {
        try {
            const { getPortfolioSummary, getPositionsWithLivePrices } = await import('@/lib/portfolio');
            const summary = await getPortfolioSummary(userId);
            const positions = await getPositionsWithLivePrices(userId);

            return {
                type: 'portfolio',
                summary: {
                    totalPositions: summary.totalPositions,
                    openPositions: summary.openPositions,
                    unrealizedPL: summary.unrealizedPL,
                    realizedPL: summary.realizedPL,
                    totalEquity: summary.totalEquity,
                },
                positions: positions.slice(0, 10).map(p => ({
                    symbol: p.symbol,
                    direction: p.direction,
                    entry: p.entryPrice,
                    current: p.currentPrice,
                    pnl: p.profitLoss,
                    pips: p.profitLossPips,
                    lot: p.lotSize,
                    status: p.status,
                })),
            };
        } catch (error: any) {
            return { error: error.message || 'Failed to fetch portfolio.' };
        }
    },
} as any);

// ═══════════════════════════════════════════════════════
// 8. MARKET HOURS TOOL
// ═══════════════════════════════════════════════════════
export const marketHoursTool = tool({
    description: 'Check if market is currently open for a symbol + active trading session info (Asia/London/NY). Use for "jam market", "market hours", "buka tutup", "sesi trading".',
    parameters: z.object({
        symbol: z.string().optional().describe('Symbol to check (default: XAUUSD)'),
    }),
    execute: async ({ symbol = 'XAUUSD' }: { symbol?: string }) => {
        try {
            const pair = symbol.toUpperCase().replace('/', '').replace('-', '');

            // Check market status
            const status = isMarketOpen(pair as any);

            // Determine active session based on current UTC hour
            const now = new Date();
            const utcHour = now.getUTCHours();
            const wibHour = (utcHour + 7) % 24;

            let activeSession = 'No Major Session';
            let sessionEmoji = '😴';
            const sessions: { name: string; active: boolean; hours: string }[] = [];

            // Tokyo/Asia: 00:00 - 09:00 UTC (07:00 - 16:00 WIB)
            const asiaActive = utcHour >= 0 && utcHour < 9;
            sessions.push({ name: 'Tokyo/Asia', active: asiaActive, hours: '07:00 - 16:00 WIB' });

            // London: 07:00 - 16:00 UTC (14:00 - 23:00 WIB)
            const londonActive = utcHour >= 7 && utcHour < 16;
            sessions.push({ name: 'London', active: londonActive, hours: '14:00 - 23:00 WIB' });

            // New York: 12:00 - 21:00 UTC (19:00 - 04:00 WIB)
            const nyActive = utcHour >= 12 && utcHour < 21;
            sessions.push({ name: 'New York', active: nyActive, hours: '19:00 - 04:00 WIB' });

            // Overlap detection
            if (londonActive && nyActive) {
                activeSession = 'London-NY Overlap (HIGH VOLATILITY)';
                sessionEmoji = '🔥';
            } else if (asiaActive && londonActive) {
                activeSession = 'Asia-London Overlap';
                sessionEmoji = '⚡';
            } else if (nyActive) {
                activeSession = 'New York Session';
                sessionEmoji = '🇺🇸';
            } else if (londonActive) {
                activeSession = 'London Session';
                sessionEmoji = '🇬🇧';
            } else if (asiaActive) {
                activeSession = 'Tokyo/Asia Session';
                sessionEmoji = '🇯🇵';
            }

            return {
                type: 'market_hours',
                symbol: pair,
                isOpen: status.isOpen,
                reason: status.reason || 'Market Open',
                nextOpen: status.nextOpen?.toISOString() || null,
                currentTimeWIB: `${String(wibHour).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')} WIB`,
                activeSession: `${sessionEmoji} ${activeSession}`,
                sessions,
            };
        } catch (error: any) {
            return { error: error.message || 'Failed to check market hours.' };
        }
    },
} as any);
