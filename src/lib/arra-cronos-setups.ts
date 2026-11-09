import getTursoClient from '@/lib/turso';
import type { CronosForecastPoint, CronosScenarioSetup } from '@/lib/arra-cronos-engine';
import type { CronosMarketCandle, CronosTimeframe } from '@/lib/arra-cronos-market';

export type CronosSetupStatus = 'OPEN' | 'TP1_HIT' | 'TP2_HIT' | 'SL_HIT' | 'SL_AFTER_TP1' | 'AMBIGUOUS' | 'AMBIGUOUS_AFTER_TP1' | 'EXPIRED' | 'EXPIRED_AFTER_TP1';

export type CronosTrackedSetup = {
    id: number;
    symbol: string;
    timeframe: CronosTimeframe;
    setupBarTime: string;
    side: 'BUY' | 'SELL';
    entryPrice: number;
    stopLoss: number;
    takeProfit1: number;
    takeProfit2: number;
    riskRewardRatio: number;
    forecast: CronosForecastPoint[];
    status: CronosSetupStatus;
    tp1HitAt: string | null;
    tp2HitAt: string | null;
    stopHitAt: string | null;
    ambiguousAt: string | null;
    updatedAt: string;
};

type NewSetup = {
    symbol: string;
    timeframe: CronosTimeframe;
    setupBarTime: string;
    scenario: CronosScenarioSetup;
    forecast: CronosForecastPoint[];
};

let schemaPromise: Promise<boolean> | null = null;

async function ensureSchema(): Promise<boolean> {
    const turso = getTursoClient();
    if (!turso) return false;
    if (!schemaPromise) {
        schemaPromise = turso.execute(`
            CREATE TABLE IF NOT EXISTS arra_cronos_setups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol TEXT NOT NULL,
                timeframe TEXT NOT NULL,
                setup_bar_time TEXT NOT NULL,
                side TEXT NOT NULL,
                entry_price REAL NOT NULL,
                stop_loss REAL NOT NULL,
                take_profit_1 REAL NOT NULL,
                take_profit_2 REAL NOT NULL,
                risk_reward_ratio REAL NOT NULL,
                forecast_json TEXT NOT NULL DEFAULT '[]',
                status TEXT NOT NULL DEFAULT 'OPEN',
                tp1_hit_at TEXT,
                tp2_hit_at TEXT,
                stop_hit_at TEXT,
                ambiguous_at TEXT,
                last_evaluated_bar_time TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(symbol, timeframe, setup_bar_time)
            )
        `).then(async () => {
            const columns = await turso.execute('PRAGMA table_info(arra_cronos_setups)');
            if (!columns.rows.some((row) => row.name === 'forecast_json')) {
                await turso.execute("ALTER TABLE arra_cronos_setups ADD COLUMN forecast_json TEXT NOT NULL DEFAULT '[]'");
            }
            if (!columns.rows.some((row) => row.name === 'ambiguous_at')) {
                await turso.execute('ALTER TABLE arra_cronos_setups ADD COLUMN ambiguous_at TEXT');
            }
            await turso.execute(`CREATE INDEX IF NOT EXISTS idx_arra_cronos_setups_recent ON arra_cronos_setups(symbol, timeframe, setup_bar_time DESC)`);
            await turso.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_arra_cronos_one_active_setup ON arra_cronos_setups(symbol, timeframe) WHERE status IN ('OPEN', 'TP1_HIT')`);
            return true;
        }).catch((error) => {
            console.error('[ARRA Cronos Setups] Schema initialization failed:', error);
            schemaPromise = null;
            return false;
        });
    }
    return schemaPromise;
}

function toTrackedSetup(row: Record<string, unknown>): CronosTrackedSetup {
    return {
        id: Number(row.id),
        symbol: String(row.symbol),
        timeframe: String(row.timeframe) as CronosTimeframe,
        setupBarTime: String(row.setup_bar_time),
        side: String(row.side) as 'BUY' | 'SELL',
        entryPrice: Number(row.entry_price),
        stopLoss: Number(row.stop_loss),
        takeProfit1: Number(row.take_profit_1),
        takeProfit2: Number(row.take_profit_2),
        riskRewardRatio: Number(row.risk_reward_ratio),
        forecast: JSON.parse(String(row.forecast_json || '[]')) as CronosForecastPoint[],
        status: String(row.status) as CronosSetupStatus,
        tp1HitAt: row.tp1_hit_at ? String(row.tp1_hit_at) : null,
        tp2HitAt: row.tp2_hit_at ? String(row.tp2_hit_at) : null,
        stopHitAt: row.stop_hit_at ? String(row.stop_hit_at) : null,
        ambiguousAt: row.ambiguous_at ? String(row.ambiguous_at) : null,
        updatedAt: String(row.updated_at),
    };
}

function candleHits(candle: CronosMarketCandle, level: number, side: 'BUY' | 'SELL', target: boolean): boolean {
    if (side === 'BUY') return target ? candle.high >= level : candle.low <= level;
    return target ? candle.low <= level : candle.high >= level;
}

/** Store one immutable setup per completed source bar and audit only later OHLC candles. */
export async function recordAndEvaluateCronosSetups(input: {
    symbol: string;
    timeframe: CronosTimeframe;
    candles: CronosMarketCandle[];
    candidate?: NewSetup | null;
}): Promise<{ setups: CronosTrackedSetup[]; persistenceAvailable: boolean }> {
    if (!(await ensureSchema())) return { setups: [], persistenceAvailable: false };
    const turso = getTursoClient();
    if (!turso) return { setups: [], persistenceAvailable: false };
    let persistenceAvailable = true;

    const now = new Date().toISOString();
    if (input.candidate) {
        const { scenario, setupBarTime, symbol, timeframe, forecast } = input.candidate;
        const existingActive = await turso.execute({
            sql: `SELECT id FROM arra_cronos_setups WHERE symbol = ? AND timeframe = ? AND status IN ('OPEN', 'TP1_HIT') LIMIT 1`,
            args: [symbol, timeframe],
        }).catch((error) => {
            persistenceAvailable = false;
            console.error('[ARRA Cronos Setups] Active setup check failed:', error);
            return null;
        });
        if (existingActive && existingActive.rows.length === 0 && Number.isFinite(Date.parse(setupBarTime)) && [scenario.entryPrice, scenario.stopLoss, scenario.takeProfit1, scenario.takeProfit2].every(Number.isFinite)) {
            await turso.execute({
                sql: `INSERT INTO arra_cronos_setups (
                    symbol, timeframe, setup_bar_time, side, entry_price, stop_loss,
                    take_profit_1, take_profit_2, risk_reward_ratio, forecast_json,
                    status, last_evaluated_bar_time, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, ?)
                ON CONFLICT DO NOTHING`,
                args: [symbol, timeframe, setupBarTime, scenario.side, scenario.entryPrice, scenario.stopLoss,
                    scenario.takeProfit1, scenario.takeProfit2, scenario.riskRewardRatio, JSON.stringify(forecast),
                    setupBarTime, now, now],
            }).catch((error) => {
                persistenceAvailable = false;
                console.error('[ARRA Cronos Setups] Snapshot write failed:', error);
            });
        }
    }

    const activeResult = await turso.execute({
        sql: `SELECT * FROM arra_cronos_setups WHERE symbol = ? AND timeframe = ? AND status IN ('OPEN', 'TP1_HIT') ORDER BY setup_bar_time DESC LIMIT 100`,
        args: [input.symbol, input.timeframe],
    }).catch((error) => {
        console.error('[ARRA Cronos Setups] Active setup read failed:', error);
        return null;
    });
    if (!activeResult) return { setups: [], persistenceAvailable: false };

    const timeframeMs: Record<CronosTimeframe, number> = { '15m': 900_000, '1h': 3_600_000, '4h': 14_400_000, '1d': 86_400_000 };
    const horizonBars = input.timeframe === '1d' ? 7 : 12;
    const bars = [...input.candles].sort((a, b) => Date.parse(a.time) - Date.parse(b.time));

    for (const rawRow of activeResult.rows) {
        const row = toTrackedSetup(rawRow as Record<string, unknown>);
        let status = row.status;
        let tp1HitAt = row.tp1HitAt;
        let tp2HitAt = row.tp2HitAt;
        let stopHitAt = row.stopHitAt;
        let ambiguousAt = row.ambiguousAt;
        let lastEvaluatedBarTime = String(rawRow.last_evaluated_bar_time);
        const setupTime = Date.parse(row.setupBarTime);

        if (bars.length && Date.parse(bars.at(-1)!.time) - setupTime > timeframeMs[input.timeframe] * 512) {
            status = 'AMBIGUOUS';
            ambiguousAt = bars.at(-1)!.time;
        } else {
            const laterBars = bars.filter((candle) => Date.parse(candle.time) > setupTime);
            for (const [barIndex, candle] of laterBars.entries()) {
                const candleTime = Date.parse(candle.time);
                if (!Number.isFinite(candleTime) || candleTime <= Date.parse(lastEvaluatedBarTime) || candleTime <= setupTime) continue;
                if (barIndex >= horizonBars) {
                    status = tp1HitAt ? 'EXPIRED_AFTER_TP1' : 'EXPIRED';
                    lastEvaluatedBarTime = candle.time;
                    break;
                }

                const hitsStop = candleHits(candle, row.stopLoss, row.side, false);
                const hitsTp1 = !tp1HitAt && candleHits(candle, row.takeProfit1, row.side, true);
                const hitsTp2 = candleHits(candle, row.takeProfit2, row.side, true);
                if (hitsStop && (hitsTp1 || hitsTp2)) {
                    status = tp1HitAt ? 'AMBIGUOUS_AFTER_TP1' : 'AMBIGUOUS';
                    ambiguousAt = candle.time;
                    lastEvaluatedBarTime = candle.time;
                    break;
                }
                if (hitsStop) {
                    stopHitAt = candle.time;
                    status = tp1HitAt ? 'SL_AFTER_TP1' : 'SL_HIT';
                    lastEvaluatedBarTime = candle.time;
                    break;
                }
                if (hitsTp1) tp1HitAt = candle.time;
                if (hitsTp2) {
                    if (!tp1HitAt) tp1HitAt = candle.time;
                    tp2HitAt = candle.time;
                    status = 'TP2_HIT';
                    lastEvaluatedBarTime = candle.time;
                    break;
                }
                if (hitsTp1) status = 'TP1_HIT';
                lastEvaluatedBarTime = candle.time;
            }
        }

        if (status !== row.status || tp1HitAt !== row.tp1HitAt || tp2HitAt !== row.tp2HitAt || stopHitAt !== row.stopHitAt || ambiguousAt !== row.ambiguousAt || lastEvaluatedBarTime !== String(rawRow.last_evaluated_bar_time)) {
            await turso.execute({
                sql: `UPDATE arra_cronos_setups SET status = ?, tp1_hit_at = ?, tp2_hit_at = ?, stop_hit_at = ?, ambiguous_at = ?, last_evaluated_bar_time = ?, updated_at = ? WHERE id = ?`,
                args: [status, tp1HitAt, tp2HitAt, stopHitAt, ambiguousAt, lastEvaluatedBarTime, now, row.id],
            }).catch((error) => {
                persistenceAvailable = false;
                console.error('[ARRA Cronos Setups] Evaluation write failed:', error);
            });
        }
    }

    const recentResult = await turso.execute({
        sql: `SELECT * FROM arra_cronos_setups WHERE symbol = ? AND timeframe = ? ORDER BY setup_bar_time DESC LIMIT 50`,
        args: [input.symbol, input.timeframe],
    }).catch((error) => {
        console.error('[ARRA Cronos Setups] Recent setup read failed:', error);
        return null;
    });
    if (!recentResult) return { setups: [], persistenceAvailable: false };
    return {
        setups: recentResult.rows.map((row) => toTrackedSetup(row as Record<string, unknown>)),
        persistenceAvailable,
    };
}
