// Portfolio Tracker Library - Manage user trading positions
import getTursoClient from './turso';
import { getMarketData, FOREX_PAIRS, ForexPair } from './market-data';

export interface Position {
    id?: number;
    userId: string;
    symbol: string;
    direction: 'BUY' | 'SELL';
    entryPrice: number;
    lotSize: number;
    stopLoss?: number;
    takeProfit?: number;
    status: 'OPEN' | 'CLOSED';
    currentPrice?: number;
    profitLoss?: number;
    profitLossPips?: number;
    createdAt?: string;
    closedAt?: string;
}

export interface PortfolioSummary {
    totalPositions: number;
    openPositions: number;
    totalEquity: number;
    unrealizedPL: number;
    realizedPL: number;
    marginUsed: number;
}

// Calculate pip value based on symbol
function getPipValue(symbol: string): number {
    if (symbol.includes('JPY')) return 0.01;
    if (symbol.includes('XAU')) return 0.1;
    if (symbol.includes('BTC')) return 1;
    return 0.0001;
}

// Calculate P/L for a position
function calculateProfitLoss(position: Position, currentPrice: number): { pips: number; value: number } {
    const pipValue = getPipValue(position.symbol);
    const priceDiff = position.direction === 'BUY'
        ? currentPrice - position.entryPrice
        : position.entryPrice - currentPrice;

    const pips = priceDiff / pipValue;
    // Simplified P/L calculation (assuming standard lot = 100,000 units)
    const lotMultiplier = position.symbol.includes('XAU') ? 100 :
        position.symbol.includes('BTC') ? 1 :
            100000;
    const value = pips * pipValue * position.lotSize * lotMultiplier;

    return { pips, value };
}

// Get all positions for a user
export async function getPositions(userId: string, includeClosedOnly = false): Promise<Position[]> {
    const turso = getTursoClient();
    if (!turso) return [];

    try {
        const statusFilter = includeClosedOnly ? "status = 'CLOSED'" : "status = 'OPEN'";
        const result = await turso.execute({
            sql: `SELECT * FROM user_positions WHERE user_id = ? AND ${statusFilter} ORDER BY created_at DESC`,
            args: [userId],
        });

        return result.rows.map(row => ({
            id: row.id as number,
            userId: row.user_id as string,
            symbol: row.symbol as string,
            direction: row.direction as 'BUY' | 'SELL',
            entryPrice: row.entry_price as number,
            lotSize: row.lot_size as number,
            stopLoss: row.stop_loss as number | undefined,
            takeProfit: row.take_profit as number | undefined,
            status: row.status as 'OPEN' | 'CLOSED',
            currentPrice: row.current_price as number | undefined,
            profitLoss: row.profit_loss as number | undefined,
            createdAt: row.created_at as string,
            closedAt: row.closed_at as string | undefined,
        }));
    } catch (error) {
        console.error('Get positions error:', error);
        return [];
    }
}

// Get positions with live prices
export async function getPositionsWithLivePrices(userId: string): Promise<Position[]> {
    const positions = await getPositions(userId);

    // Fetch current prices for all unique symbols
    const symbols = [...new Set(positions.map(p => p.symbol))];
    const priceMap: Record<string, number> = {};

    for (const symbol of symbols) {
        if (symbol in FOREX_PAIRS) {
            try {
                const data = await getMarketData(symbol as ForexPair, '1h');
                priceMap[symbol] = data.current_price;
            } catch (error) {
                console.error(`Failed to get price for ${symbol}:`, error);
            }
        }
    }

    // Calculate P/L for each position
    return positions.map(pos => {
        const currentPrice = priceMap[pos.symbol] || pos.entryPrice;
        const { pips, value } = calculateProfitLoss(pos, currentPrice);

        return {
            ...pos,
            currentPrice,
            profitLoss: value,
            profitLossPips: pips,
        };
    });
}

// Add a new position
export async function addPosition(position: Position): Promise<boolean> {
    const turso = getTursoClient();
    if (!turso) return false;

    try {
        await turso.execute({
            sql: `INSERT INTO user_positions (user_id, symbol, direction, entry_price, lot_size, stop_loss, take_profit, status)
                  VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN')`,
            args: [
                position.userId,
                position.symbol,
                position.direction,
                position.entryPrice,
                position.lotSize,
                position.stopLoss || null,
                position.takeProfit || null,
            ],
        });
        return true;
    } catch (error) {
        console.error('Add position error:', error);
        return false;
    }
}

// Close a position
export async function closePosition(id: number, exitPrice: number, profitLoss: number): Promise<boolean> {
    const turso = getTursoClient();
    if (!turso) return false;

    try {
        await turso.execute({
            sql: `UPDATE user_positions SET status = 'CLOSED', current_price = ?, profit_loss = ?, closed_at = datetime('now') WHERE id = ?`,
            args: [exitPrice, profitLoss, id],
        });
        return true;
    } catch (error) {
        console.error('Close position error:', error);
        return false;
    }
}

// Delete a position
export async function deletePosition(id: number, userId: string): Promise<boolean> {
    const turso = getTursoClient();
    if (!turso) return false;

    try {
        await turso.execute({
            sql: `DELETE FROM user_positions WHERE id = ? AND user_id = ?`,
            args: [id, userId],
        });
        return true;
    } catch (error) {
        console.error('Delete position error:', error);
        return false;
    }
}

// Get portfolio summary
export async function getPortfolioSummary(userId: string): Promise<PortfolioSummary> {
    const positions = await getPositionsWithLivePrices(userId);
    const closedPositions = await getPositions(userId, true);

    const openPositions = positions.filter(p => p.status === 'OPEN');
    const unrealizedPL = openPositions.reduce((sum, p) => sum + (p.profitLoss || 0), 0);
    const realizedPL = closedPositions.reduce((sum, p) => sum + (p.profitLoss || 0), 0);
    const marginUsed = openPositions.reduce((sum, p) => sum + (p.lotSize * 1000), 0); // Simplified margin

    return {
        totalPositions: positions.length + closedPositions.length,
        openPositions: openPositions.length,
        totalEquity: unrealizedPL + realizedPL,
        unrealizedPL,
        realizedPL,
        marginUsed,
    };
}
