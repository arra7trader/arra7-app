// Trade Journal Library - CRUD operations for trade journal entries
import getTursoClient from './turso';

export interface JournalEntry {
    id?: number;
    userId: string;
    signalId?: number;
    symbol: string;
    direction: 'BUY' | 'SELL';
    entryPrice: number;
    stopLoss?: number;
    takeProfit?: number;
    lotSize?: number;
    status: 'OPEN' | 'CLOSED' | 'CANCELLED';
    exitPrice?: number;
    profitLoss?: number;
    notes?: string;
    createdAt?: string;
    closedAt?: string;
}

export interface JournalStats {
    totalTrades: number;
    openTrades: number;
    closedTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalProfitLoss: number;
    avgWin: number;
    avgLoss: number;
}

// Get all journal entries for a user
export async function getJournalEntries(userId: string, limit = 50, offset = 0): Promise<JournalEntry[]> {
    const turso = getTursoClient();
    if (!turso) return [];

    try {
        const result = await turso.execute({
            sql: `SELECT * FROM trade_journal WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            args: [userId, limit, offset],
        });

        return result.rows.map(row => ({
            id: row.id as number,
            userId: row.user_id as string,
            signalId: row.signal_id as number | undefined,
            symbol: row.symbol as string,
            direction: row.direction as 'BUY' | 'SELL',
            entryPrice: row.entry_price as number,
            stopLoss: row.stop_loss as number | undefined,
            takeProfit: row.take_profit as number | undefined,
            lotSize: row.lot_size as number | undefined,
            status: row.status as 'OPEN' | 'CLOSED' | 'CANCELLED',
            exitPrice: row.exit_price as number | undefined,
            profitLoss: row.profit_loss as number | undefined,
            notes: row.notes as string | undefined,
            createdAt: row.created_at as string,
            closedAt: row.closed_at as string | undefined,
        }));
    } catch (error) {
        console.error('Get journal entries error:', error);
        return [];
    }
}

// Add a new journal entry
export async function addJournalEntry(entry: JournalEntry): Promise<boolean> {
    const turso = getTursoClient();
    if (!turso) return false;

    try {
        await turso.execute({
            sql: `INSERT INTO trade_journal (user_id, signal_id, symbol, direction, entry_price, stop_loss, take_profit, lot_size, status, notes)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                entry.userId,
                entry.signalId || null,
                entry.symbol,
                entry.direction,
                entry.entryPrice,
                entry.stopLoss || null,
                entry.takeProfit || null,
                entry.lotSize || null,
                entry.status || 'OPEN',
                entry.notes || null,
            ],
        });
        return true;
    } catch (error) {
        console.error('Add journal entry error:', error);
        return false;
    }
}

// Close a trade
export async function closeJournalEntry(id: number, exitPrice: number, profitLoss: number): Promise<boolean> {
    const turso = getTursoClient();
    if (!turso) return false;

    try {
        await turso.execute({
            sql: `UPDATE trade_journal SET status = 'CLOSED', exit_price = ?, profit_loss = ?, closed_at = datetime('now') WHERE id = ?`,
            args: [exitPrice, profitLoss, id],
        });
        return true;
    } catch (error) {
        console.error('Close journal entry error:', error);
        return false;
    }
}

// Update notes
export async function updateJournalNotes(id: number, notes: string): Promise<boolean> {
    const turso = getTursoClient();
    if (!turso) return false;

    try {
        await turso.execute({
            sql: `UPDATE trade_journal SET notes = ? WHERE id = ?`,
            args: [notes, id],
        });
        return true;
    } catch (error) {
        console.error('Update journal notes error:', error);
        return false;
    }
}

// Delete entry
export async function deleteJournalEntry(id: number, userId: string): Promise<boolean> {
    const turso = getTursoClient();
    if (!turso) return false;

    try {
        await turso.execute({
            sql: `DELETE FROM trade_journal WHERE id = ? AND user_id = ?`,
            args: [id, userId],
        });
        return true;
    } catch (error) {
        console.error('Delete journal entry error:', error);
        return false;
    }
}

// Get journal statistics
export async function getJournalStats(userId: string): Promise<JournalStats> {
    const turso = getTursoClient();
    const defaultStats: JournalStats = {
        totalTrades: 0,
        openTrades: 0,
        closedTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalProfitLoss: 0,
        avgWin: 0,
        avgLoss: 0,
    };

    if (!turso) return defaultStats;

    try {
        const result = await turso.execute({
            sql: `SELECT 
                    COUNT(*) as total_trades,
                    SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) as open_trades,
                    SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END) as closed_trades,
                    SUM(CASE WHEN profit_loss > 0 THEN 1 ELSE 0 END) as winning_trades,
                    SUM(CASE WHEN profit_loss < 0 THEN 1 ELSE 0 END) as losing_trades,
                    SUM(COALESCE(profit_loss, 0)) as total_profit_loss,
                    AVG(CASE WHEN profit_loss > 0 THEN profit_loss ELSE NULL END) as avg_win,
                    AVG(CASE WHEN profit_loss < 0 THEN profit_loss ELSE NULL END) as avg_loss
                  FROM trade_journal WHERE user_id = ?`,
            args: [userId],
        });

        const row = result.rows[0];
        const closedTrades = Number(row.closed_trades) || 0;
        const winningTrades = Number(row.winning_trades) || 0;

        return {
            totalTrades: Number(row.total_trades) || 0,
            openTrades: Number(row.open_trades) || 0,
            closedTrades,
            winningTrades,
            losingTrades: Number(row.losing_trades) || 0,
            winRate: closedTrades > 0 ? (winningTrades / closedTrades) * 100 : 0,
            totalProfitLoss: Number(row.total_profit_loss) || 0,
            avgWin: Number(row.avg_win) || 0,
            avgLoss: Number(row.avg_loss) || 0,
        };
    } catch (error) {
        console.error('Get journal stats error:', error);
        return defaultStats;
    }
}

// Auto-save signal from analysis to journal
export async function autoSaveSignalToJournal(
    userId: string,
    symbol: string,
    direction: 'BUY' | 'SELL',
    entryPrice: number,
    stopLoss?: number,
    takeProfit?: number
): Promise<boolean> {
    return addJournalEntry({
        userId,
        symbol,
        direction,
        entryPrice,
        stopLoss,
        takeProfit,
        status: 'OPEN',
    });
}
