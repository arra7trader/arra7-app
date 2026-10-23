import getTursoClient from '@/lib/turso';
import type { CryptoToken } from './types';
import type { TokenSnapshot } from './performance-tracker';

const TABLE = 'crypto_hunter_snapshots';
const MAX_HISTORY_POINTS = 48;
const MAX_SNAPSHOTS = 500;

async function ensureSchema() {
  const db = getTursoClient();
  if (!db) return null;
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      token_key TEXT PRIMARY KEY,
      chain TEXT NOT NULL,
      address TEXT NOT NULL,
      snapshot_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  return db;
}

export async function recordCryptoTokenBatch(tokens: CryptoToken[]): Promise<TokenSnapshot[] | null> {
  const db = await ensureSchema();
  if (!db) return null;

  const now = new Date().toISOString();
  const stored = await db.execute(`SELECT token_key, snapshot_json FROM ${TABLE}`);
  const snapshotsByKey = new Map(
    stored.rows.map(row => [String(row.token_key), JSON.parse(String(row.snapshot_json)) as TokenSnapshot])
  );
  const writes = [];

  for (const token of tokens) {
    const key = `${token.chain}:${token.address}`;
    const existing = snapshotsByKey.get(key);
    let snapshot: TokenSnapshot;

    if (!existing) {
      snapshot = {
        address: token.address,
        chain: token.chain,
        name: token.name,
        symbol: token.symbol,
        snapshotPrice: token.priceUsd,
        snapshotMarketCap: token.marketCap,
        snapshotLiquidity: token.liquidity,
        snapshotHolders: token.holders,
        snapshotVolume24h: token.volume24h,
        snapshotOgScore: token.ogScore,
        snapshotTier: token.tier,
        snapshotBuySellRatio: token.buySellRatio,
        snapshotVmcRatio: token.vmcRatio,
        latestPrice: token.priceUsd,
        latestMarketCap: token.marketCap,
        latestLiquidity: token.liquidity,
        latestHolders: token.holders,
        latestOgScore: token.ogScore,
        latestVolume24h: token.volume24h,
        detectedAt: now,
        lastUpdatedAt: now,
        updateCount: 1,
        priceHistory: [{ time: now, price: token.priceUsd, marketCap: token.marketCap }],
        peakPrice: token.priceUsd,
        peakMarketCap: token.marketCap,
        peakMultiplier: 1,
        imageUrl: token.imageUrl,
      };
    } else {
      snapshot = existing;
      snapshot.name = token.name;
      snapshot.imageUrl = token.imageUrl || snapshot.imageUrl;
      snapshot.latestPrice = token.priceUsd;
      snapshot.latestMarketCap = token.marketCap;
      snapshot.latestLiquidity = token.liquidity;
      snapshot.latestHolders = token.holders;
      snapshot.latestOgScore = token.ogScore;
      snapshot.latestVolume24h = token.volume24h;
      snapshot.lastUpdatedAt = now;
      snapshot.updateCount += 1;
      snapshot.peakPrice = Math.max(snapshot.peakPrice, token.priceUsd);
      snapshot.peakMarketCap = Math.max(snapshot.peakMarketCap, token.marketCap);
      snapshot.peakMultiplier = snapshot.snapshotMarketCap > 0
        ? Math.max(snapshot.peakMultiplier, token.marketCap / snapshot.snapshotMarketCap)
        : snapshot.peakMultiplier;

      const last = snapshot.priceHistory[snapshot.priceHistory.length - 1];
      if (!last || (Date.now() - new Date(last.time).getTime()) / 60000 >= 5) {
        snapshot.priceHistory = [...snapshot.priceHistory, { time: now, price: token.priceUsd, marketCap: token.marketCap }].slice(-MAX_HISTORY_POINTS);
      }
    }

    writes.push({
      sql: `INSERT INTO ${TABLE} (token_key, chain, address, snapshot_json, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(token_key) DO UPDATE SET snapshot_json = excluded.snapshot_json, updated_at = excluded.updated_at`,
      args: [key, token.chain, token.address, JSON.stringify(snapshot), now],
    });
    snapshotsByKey.set(key, snapshot);
  }

  if (writes.length > 0) await db.batch(writes, 'write');
  await db.execute(`
    DELETE FROM ${TABLE}
    WHERE token_key NOT IN (
      SELECT token_key FROM ${TABLE}
      ORDER BY updated_at DESC
      LIMIT ${MAX_SNAPSHOTS}
    )
  `);
  return getPersistedCryptoSnapshots();
}

export async function getPersistedCryptoSnapshots(): Promise<TokenSnapshot[] | null> {
  const db = await ensureSchema();
  if (!db) return null;
  const result = await db.execute(`SELECT snapshot_json FROM ${TABLE} ORDER BY updated_at DESC LIMIT 500`);
  return result.rows.map(row => JSON.parse(String(row.snapshot_json)) as TokenSnapshot);
}
