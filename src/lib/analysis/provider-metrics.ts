
import getTursoClient from '@/lib/turso';

interface Signal {
    id: string;
    action: 'BUY' | 'SELL';
    status: 'CLOSED';
    pips_gained?: number;

    closed_at?: string;
    created_at: string;
}

export async function updateProviderStats(providerId: string) {
    const turso = await getTursoClient();

    try {
        // 1. Fetch all CLOSED signals for this provider
        const result = await turso.execute({
            sql: `
                SELECT id, action, status, result_pips, profit_loss, closed_at, created_at 
                FROM provider_signals 
                WHERE provider_id = ? AND status IN ('tp_hit', 'sl_hit', 'manually_closed') 
                ORDER BY closed_at ASC
            `,
            args: [providerId]
        });

        const signals = result.rows as unknown as Signal[];

        if (signals.length === 0) {
            // Reset stats if no closed signals
            await turso.execute({
                sql: `UPDATE users SET stats_win_rate=0, stats_profit_factor=0, stats_max_drawdown=0, stats_total_pips=0, stats_risk_score=1 WHERE id = ?`,
                args: [providerId]
            });
            return;
        }

        // 2. Calculate Stats
        let wins = 0;
        let losses = 0;
        let grossProfit = 0;
        let grossLoss = 0;
        let totalPips = 0;

        let currentBalance = 0; // Relative balance from 0
        let maxBalance = 0;
        let maxDrawdown = 0;

        // Daily stats map
        const dailyStats = new Map<string, { pips: number, profit: number }>();

        for (const signal of signals) {
            const pips = signal.result_pips || 0;
            const profit = pips * 10; // Estimated $10/pip

            // Win Rate
            if (pips > 0) wins++;
            if (pips < 0) losses++;

            // Profit Factor
            if (profit > 0) grossProfit += profit;
            else grossLoss += Math.abs(profit);

            // Total Pips
            totalPips += pips;

            // Drawdown Calculation (based on Profit USD)
            currentBalance += profit;
            if (currentBalance > maxBalance) {
                maxBalance = currentBalance;
            }

            const drawdown = maxBalance - currentBalance;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
            }

            // Daily aggregation
            if (signal.closed_at) {
                const date = new Date(signal.closed_at).toISOString().split('T')[0];
                const current = dailyStats.get(date) || { pips: 0, profit: 0 };
                dailyStats.set(date, {
                    pips: current.pips + pips,
                    profit: current.profit + profit
                });
            }
        }

        const totalTrades = wins + losses + (signals.length - wins - losses); // Include BE?
        const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
        const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0; // 999 as infinity for display

        // Risk Score Logic (Simple heuristic)
        // High DD -> High Risk. Low WR -> High Risk.
        let riskScore = 1;
        if (maxDrawdown > 500) riskScore += 2; // > $500 DD
        if (maxDrawdown > 1000) riskScore += 3;
        if (winRate < 40) riskScore += 2;
        if (totalTrades < 10) riskScore = 1; // Newbie is low risk? Or Unknown? Keep 1.
        if (riskScore > 10) riskScore = 10;

        // 3. Update User Stats
        await turso.execute({
            sql: `
                UPDATE users SET 
                    stats_win_rate = ?, 
                    stats_profit_factor = ?, 
                    stats_max_drawdown = ?, 
                    stats_total_pips = ?,
                    stats_risk_score = ?,
                    stats_active_since = ?
                WHERE id = ?
            `,
            args: [
                winRate,
                profitFactor,
                maxDrawdown,
                totalPips,
                riskScore,
                signals[0]?.created_at || new Date().toISOString(), // First trade date
                providerId
            ]
        });

        // 4. Update Daily Stats (Snapshot)
        // Clear old daily stats for simplicity or upsert? 
        // For efficiency, maybe just insert new ones? 
        // Let's replace/re-evaluate for now to ensure consistency.
        await turso.execute({
            sql: 'DELETE FROM provider_daily_stats WHERE provider_id = ?',
            args: [providerId]
        });

        let runningBalance = 0;
        // Sort dates
        const sortedDates = Array.from(dailyStats.keys()).sort();

        for (const date of sortedDates) {
            const stats = dailyStats.get(date)!;
            runningBalance += stats.profit;

            await turso.execute({
                sql: `INSERT INTO provider_daily_stats (provider_id, date, daily_pips, daily_profit_usd, balance_snapshot) VALUES (?, ?, ?, ?, ?)`,
                args: [providerId, date, stats.pips, stats.profit, runningBalance]
            });
        }

        console.log(`Updated stats for provider ${providerId}: WR=${winRate}%, PF=${profitFactor}, DD=${maxDrawdown}`);

    } catch (e) {
        console.error('Failed to update provider stats:', e);
    }
}
