import getTursoClient from '@/lib/turso';
import type { CronosMarketResult, CronosTimeframe } from '@/lib/arra-cronos-market';
import type { CronosQuantMetrics, CronosMTFBias } from '@/lib/arra-cronos-engine';

const SUPPORTED_SYMBOLS = new Set(['BTCUSD', 'XAUUSD']);

export type ArraMarketObservation = {
    symbol: string;
    timeframe: CronosTimeframe;
    barTime: string;
    analyzedAt: string;
    price: number;
    source: string;
    quoteMode: CronosMarketResult['quoteMode'];
    quoteAgeSeconds: number;
    feedFresh: boolean;
    marketOpen: boolean;
    action: 'BUY' | 'SELL' | 'WAIT';
    reason: string;
    direction: 'UP' | 'DOWN' | 'FLAT';
    alignmentScore: number;
    confluenceScore: number;
    metrics: CronosQuantMetrics;
    mtfMatrix: Record<CronosTimeframe, CronosMTFBias>;
    engine: string;
};

let schemaPromise: Promise<boolean> | null = null;

async function ensureObservationSchema(): Promise<boolean> {
    const turso = getTursoClient();
    if (!turso) return false;
    if (!schemaPromise) {
        schemaPromise = turso.execute(`
            CREATE TABLE IF NOT EXISTS arra_market_observations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol TEXT NOT NULL,
                timeframe TEXT NOT NULL,
                bar_time TEXT NOT NULL,
                action TEXT NOT NULL,
                analyzed_at TEXT NOT NULL,
                price REAL NOT NULL,
                source TEXT NOT NULL,
                quote_mode TEXT NOT NULL,
                quote_age_seconds INTEGER NOT NULL,
                feed_fresh INTEGER NOT NULL,
                market_open INTEGER NOT NULL,
                reason TEXT NOT NULL,
                direction TEXT NOT NULL,
                alignment_score INTEGER NOT NULL,
                confluence_score INTEGER NOT NULL,
                metrics_json TEXT NOT NULL,
                mtf_matrix_json TEXT NOT NULL,
                engine TEXT NOT NULL,
                UNIQUE(symbol, timeframe, bar_time, action, engine)
            )
        `).then(async () => {
            await turso.execute(`
                CREATE INDEX IF NOT EXISTS idx_arra_market_observations_recent
                ON arra_market_observations(symbol, analyzed_at DESC)
            `);
            return true;
        }).catch((error) => {
            console.error('[ARRA Observations] Schema initialization failed:', error);
            schemaPromise = null;
            return false;
        });
    }
    return schemaPromise;
}

/** Persist an observed market analysis once per completed/current source bar.
 * This stores real feed snapshots and recommendations only; it never models
 * hypothetical fills, P/L, or broker execution. */
export async function recordArraMarketObservation(observation: ArraMarketObservation): Promise<boolean> {
    if (!SUPPORTED_SYMBOLS.has(observation.symbol)) return false;
    const barTimestamp = Date.parse(observation.barTime);
    if (!Number.isFinite(barTimestamp) || !Number.isFinite(observation.price) || observation.price <= 0) return false;
    if (!(await ensureObservationSchema())) return false;

    const turso = getTursoClient();
    if (!turso) return false;
    try {
        const result = await turso.execute({
            sql: `INSERT INTO arra_market_observations (
                symbol, timeframe, bar_time, action, analyzed_at, price, source, quote_mode,
                    quote_age_seconds, feed_fresh, market_open, reason, direction,
                    alignment_score, confluence_score, metrics_json, mtf_matrix_json, engine
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(symbol, timeframe, bar_time, action, engine) DO NOTHING`,
            args: [
                observation.symbol,
                observation.timeframe,
                observation.barTime,
                observation.action,
                observation.analyzedAt,
                observation.price,
                observation.source,
                observation.quoteMode,
                observation.quoteAgeSeconds,
                observation.feedFresh ? 1 : 0,
                observation.marketOpen ? 1 : 0,
                observation.reason,
                observation.direction,
                observation.alignmentScore,
                observation.confluenceScore,
                JSON.stringify(observation.metrics),
                JSON.stringify(observation.mtfMatrix),
                observation.engine,
            ],
        });
        return Number(result.rowsAffected || 0) > 0;
    } catch (error) {
        console.error('[ARRA Observations] Snapshot write failed:', error);
        return false;
    }
}

export async function getArraMarketObservations(symbol: string, limit: number) {
    if (!SUPPORTED_SYMBOLS.has(symbol)) throw new Error('Instrumen tidak didukung.');
    if (!(await ensureObservationSchema())) return null;
    const turso = getTursoClient();
    if (!turso) return null;

    try {
        const result = await turso.execute({
            sql: `SELECT id, symbol, timeframe, bar_time, analyzed_at, price, source, quote_mode,
                         quote_age_seconds, feed_fresh, market_open, action, reason, direction,
                         alignment_score, confluence_score, metrics_json, mtf_matrix_json, engine
                  FROM arra_market_observations
                  WHERE symbol = ?
                  ORDER BY analyzed_at DESC
                  LIMIT ?`,
            args: [symbol, limit],
        });
        return result.rows.map((row) => ({
            id: Number(row.id),
            symbol: String(row.symbol),
            timeframe: String(row.timeframe),
            barTime: String(row.bar_time),
            analyzedAt: String(row.analyzed_at),
            price: Number(row.price),
            source: String(row.source),
            quoteMode: String(row.quote_mode),
            quoteAgeSeconds: Number(row.quote_age_seconds),
            feedFresh: Number(row.feed_fresh) === 1,
            marketOpen: Number(row.market_open) === 1,
            action: String(row.action),
            reason: String(row.reason),
            direction: String(row.direction),
            alignmentScore: Number(row.alignment_score),
            confluenceScore: Number(row.confluence_score),
            metrics: JSON.parse(String(row.metrics_json)) as CronosQuantMetrics,
            mtfMatrix: JSON.parse(String(row.mtf_matrix_json)) as Record<CronosTimeframe, CronosMTFBias>,
            engine: String(row.engine),
        }));
    } catch (error) {
        console.error('[ARRA Observations] Snapshot read failed:', error);
        return null;
    }
}
