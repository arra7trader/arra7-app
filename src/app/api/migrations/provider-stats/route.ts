
import { NextResponse } from 'next/server';
import getTursoClient from '@/lib/turso';

export const dynamic = 'force-dynamic';

export async function GET() {
    const turso = await getTursoClient();
    try {
        // Add stats columns to users table
        const alterQueries = [
            `ALTER TABLE users ADD COLUMN stats_win_rate REAL DEFAULT 0`,
            `ALTER TABLE users ADD COLUMN stats_profit_factor REAL DEFAULT 0`,
            `ALTER TABLE users ADD COLUMN stats_max_drawdown REAL DEFAULT 0`,
            `ALTER TABLE users ADD COLUMN stats_total_pips REAL DEFAULT 0`,
            `ALTER TABLE users ADD COLUMN stats_active_since DATETIME`,
            `ALTER TABLE users ADD COLUMN stats_risk_score INTEGER DEFAULT 1`
        ];

        for (const query of alterQueries) {
            try {
                await turso.execute(query);
            } catch (e: any) {
                console.log(`Column likely exists: ${e.message}`);
            }
        }

        // Create provider_daily_stats table
        await turso.execute(`
            CREATE TABLE IF NOT EXISTS provider_daily_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                provider_id TEXT NOT NULL,
                date TEXT NOT NULL,
                daily_pips REAL DEFAULT 0,
                daily_profit_usd REAL DEFAULT 0,
                balance_snapshot REAL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(provider_id) REFERENCES users(id)
            )
        `);

        return NextResponse.json({ status: 'success', message: 'Migration executed' });
    } catch (e: any) {
        return NextResponse.json({ status: 'error', message: e.message }, { status: 500 });
    }
}
