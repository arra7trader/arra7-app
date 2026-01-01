import getTursoClient from './turso';

export interface VerificationResult {
    processed: number;
    updated: number;
    errors: number;
    details: string[];
}

// Fetch current price from Yahoo Finance
async function getCurrentPrice(symbol: string, type: 'forex' | 'stock'): Promise<number | null> {
    try {
        // Format symbol for Yahoo Finance
        let yfSymbol = symbol.toUpperCase();

        if (type === 'stock') {
            // Assume IDX stocks for now if not specified
            if (!yfSymbol.includes('.') && /^[A-Z]{4}$/.test(yfSymbol)) {
                yfSymbol += '.JK';
            }
        } else if (type === 'forex') {
            // Remove slash if present (e.g., EUR/USD -> EURUSD=X)
            yfSymbol = yfSymbol.replace('/', '') + '=X';

            // Handle Gold
            if (yfSymbol.includes('XAUUSD')) {
                yfSymbol = 'GC=F'; // Gold Futures or use XAUUSD=X
            }
        }

        const response = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${yfSymbol}?interval=1m&range=1d`,
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
            }
        );

        if (!response.ok) {
            console.error(`[SignalVerifier] Failed to fetch price for ${yfSymbol}: ${response.statusText}`);
            return null;
        }

        const data = await response.json();
        const result = data.chart?.result?.[0];

        if (!result) return null;

        const meta = result.meta;
        return meta.regularMarketPrice || meta.chartPreviousClose || null;
    } catch (error) {
        console.error(`[SignalVerifier] Error fetching price for ${symbol}:`, error);
        return null;
    }
}

export async function verifyPendingSignals(): Promise<VerificationResult> {
    const result: VerificationResult = {
        processed: 0,
        updated: 0,
        errors: 0,
        details: [],
    };

    const turso = getTursoClient();
    if (!turso) {
        result.details.push('Database connection failed');
        return result;
    }

    try {
        // 1. Get all pending signals
        const pendingResult = await turso.execute({
            sql: "SELECT * FROM ai_signals WHERE status = 'PENDING'",
            args: [],
        });

        const signals = pendingResult.rows;
        result.processed = signals.length;

        if (signals.length === 0) {
            result.details.push('No pending signals found');
            return result;
        }

        // 2. Group by symbol to batch price fetches
        // For now, process one by one to keep it simple, optimization later if needed
        for (const signal of signals) {
            const id = signal.id as number;
            const symbol = signal.symbol as string;
            const type = signal.type as 'forex' | 'stock';
            const direction = signal.direction as 'BUY' | 'SELL';
            const entryPrice = Number(signal.entry_price);
            const stopLoss = Number(signal.stop_loss);
            const takeProfit = Number(signal.take_profit_1);
            const createdAt = new Date(signal.created_at as string);

            // Skip if signal is too new (e.g. less than 5 mins) to avoid noise
            if (Date.now() - createdAt.getTime() < 5 * 60 * 1000) {
                continue;
            }

            // Fetch current price
            const currentPrice = await getCurrentPrice(symbol, type);

            if (!currentPrice) {
                result.errors++;
                result.details.push(`Could not get price for ${symbol}`);
                continue;
            }

            let newStatus: 'TP_HIT' | 'SL_HIT' | 'PENDING' = 'PENDING';

            // Check conditions
            if (direction === 'BUY') {
                if (currentPrice >= takeProfit) {
                    newStatus = 'TP_HIT';
                } else if (currentPrice <= stopLoss) {
                    newStatus = 'SL_HIT';
                }
            } else if (direction === 'SELL') {
                if (currentPrice <= takeProfit) {
                    newStatus = 'TP_HIT';
                } else if (currentPrice >= stopLoss) {
                    newStatus = 'SL_HIT';
                }
            }

            if (newStatus !== 'PENDING') {
                // Update signal
                await turso.execute({
                    sql: "UPDATE ai_signals SET status = ?, verified_at = datetime('now') WHERE id = ?",
                    args: [newStatus, id],
                });

                result.updated++;
                result.details.push(`Signal ${id} (${symbol}) updated to ${newStatus}`);
            }
        }

    } catch (error) {
        console.error('[SignalVerifier] Error:', error);
        result.errors++;
        result.details.push(`Internal error: ${error}`);
    }

    return result;
}
