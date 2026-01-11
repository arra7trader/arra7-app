import { createClient, Client } from '@libsql/client';

// Check if Turso is configured
export const isTursoConfigured = (): boolean => {
  return !!(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
};

// Initialize Turso client only if configured
let tursoClient: Client | null = null;

function getTursoClient(): Client | null {
  if (!isTursoConfigured()) {
    return null;
  }

  if (!tursoClient) {
    tursoClient = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });
  }

  return tursoClient;
}

export default getTursoClient;

// Initialize database tables
export async function initDatabase(): Promise<boolean> {
  const turso = getTursoClient();
  if (!turso) {
    console.log('Turso not configured, skipping database init');
    return false;
  }

  try {
    // Create users table
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        image TEXT,
        membership TEXT DEFAULT 'BASIC',
        membership_expires DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create quota_usage table (Forex)
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS quota_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        count INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, date)
      )
    `);

    // Create stock_quota_usage table (Stock Analysis)
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS stock_quota_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        count INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, date)
      )
    `);

    // Create analysis_history table
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS analysis_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        symbol TEXT NOT NULL,
        timeframe TEXT,
        result TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Create ai_signals table for performance tracking
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS ai_signals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        symbol TEXT NOT NULL,
        timeframe TEXT,
        direction TEXT NOT NULL,
        entry_price REAL NOT NULL,
        stop_loss REAL NOT NULL,
        take_profit_1 REAL NOT NULL,
        take_profit_2 REAL,
        confidence INTEGER,
        status TEXT DEFAULT 'PENDING',
        result_price REAL,
        pips_result REAL,
        verified_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create daily_reports table for admin broadcast
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS daily_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE,
        total_signals INTEGER DEFAULT 0,
        tp_hit INTEGER DEFAULT 0,
        sl_hit INTEGER DEFAULT 0,
        pending INTEGER DEFAULT 0,
        win_rate REAL DEFAULT 0,
        report_text TEXT,
        sent_to_telegram INTEGER DEFAULT 0,
        sent_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create settings table for app configuration (e.g., Telegram auto-post toggle)
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // TIER 3 FEATURES: Trade Journal
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS trade_journal (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        signal_id INTEGER,
        symbol TEXT NOT NULL,
        direction TEXT NOT NULL,
        entry_price REAL NOT NULL,
        stop_loss REAL,
        take_profit REAL,
        lot_size REAL,
        status TEXT DEFAULT 'OPEN',
        exit_price REAL,
        profit_loss REAL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        closed_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // TIER 3 FEATURES: User Positions for Portfolio Tracker
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS user_positions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        symbol TEXT NOT NULL,
        direction TEXT NOT NULL,
        entry_price REAL NOT NULL,
        lot_size REAL NOT NULL,
        stop_loss REAL,
        take_profit REAL,
        status TEXT DEFAULT 'OPEN',
        current_price REAL,
        profit_loss REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        closed_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // TIER 3 FEATURES: Social Feed (anonymized analyses)
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS social_feed (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_hash TEXT NOT NULL,
        symbol TEXT NOT NULL,
        timeframe TEXT,
        direction TEXT,
        confidence INTEGER,
        entry_price REAL,
        stop_loss REAL,
        take_profit REAL,
        analysis_summary TEXT,
        likes INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // DOM ML PREDICTIONS: Store prediction history for accuracy tracking
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS ml_predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        horizon INTEGER NOT NULL,
        direction TEXT NOT NULL,
        direction_code INTEGER NOT NULL,
        confidence REAL NOT NULL,
        model_used TEXT NOT NULL,
        initial_price REAL NOT NULL,
        actual_price REAL,
        actual_direction INTEGER,
        is_correct INTEGER,
        verified_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // DOM ML STATS: Aggregate performance stats
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS ml_prediction_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        symbol TEXT NOT NULL,
        model TEXT NOT NULL,
        total_predictions INTEGER DEFAULT 0,
        correct_predictions INTEGER DEFAULT 0,
        accuracy REAL DEFAULT 0,
        avg_confidence REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(date, symbol, model)
      )
    `);

    // AI CONFIG: Store dynamic weights for self-optimizing models
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS ml_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migrations: Add any missing columns to users table
    // SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we try-catch each
    const migrations = [
      { column: 'membership', sql: `ALTER TABLE users ADD COLUMN membership TEXT DEFAULT 'BASIC'` },
      { column: 'membership_expires', sql: `ALTER TABLE users ADD COLUMN membership_expires DATETIME` },
      { column: 'created_at', sql: `ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP` },
      { column: 'updated_at', sql: `ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP` },
      { column: 'image', sql: `ALTER TABLE users ADD COLUMN image TEXT` },
      // Geo-location columns
      { column: 'last_login_ip', sql: `ALTER TABLE users ADD COLUMN last_login_ip TEXT` },
      { column: 'last_login_country', sql: `ALTER TABLE users ADD COLUMN last_login_country TEXT` },
      { column: 'last_login_city', sql: `ALTER TABLE users ADD COLUMN last_login_city TEXT` },
      { column: 'last_login_at', sql: `ALTER TABLE users ADD COLUMN last_login_at DATETIME` },
      // Promo feature columns
      { column: 'promo_expires', sql: `ALTER TABLE users ADD COLUMN promo_expires DATETIME` },
      { column: 'promo_type', sql: `ALTER TABLE users ADD COLUMN promo_type TEXT` },
      // Bookmap trial tracking
      { column: 'bookmap_first_access', sql: `ALTER TABLE users ADD COLUMN bookmap_first_access DATETIME` },
      // AI Self-Learning: Signals breakdown
      { column: 'signals', sql: `ALTER TABLE ml_predictions ADD COLUMN signals TEXT` },
      // APK Tracking
      { column: 'downloaded_apk', sql: `ALTER TABLE users ADD COLUMN downloaded_apk INTEGER DEFAULT 0` },
      { column: 'apk_downloaded_at', sql: `ALTER TABLE users ADD COLUMN apk_downloaded_at DATETIME` },
    ];

    for (const migration of migrations) {
      try {
        await turso.execute(migration.sql);
        console.log(`Added ${migration.column} column`);
      } catch (alterError) {
        // Column likely already exists, ignore error
        console.log(`${migration.column} column already exists or migration skipped`);
      }
    }

    console.log('Database tables initialized');
    return true;
  } catch (error) {
    console.error('Database init error:', error);
    return false;
  }
}

// User operations
export async function upsertUser(user: {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}): Promise<boolean> {
  const turso = getTursoClient();
  if (!turso) return false;

  try {
    await turso.execute({
      sql: `
        INSERT INTO users (id, email, name, image)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          email = excluded.email,
          name = excluded.name,
          image = excluded.image
      `,
      args: [user.id, user.email, user.name || '', user.image || ''],
    });
    return true;
  } catch (error) {
    console.error('Upsert user error:', error);
    return false;
  }
}

export async function getUserMembership(userId: string): Promise<{ membership: string; createdAt: Date | null }> {
  const turso = getTursoClient();
  if (!turso) return { membership: 'BASIC', createdAt: null };

  try {
    const result = await turso.execute({
      sql: 'SELECT membership, created_at FROM users WHERE id = ?',
      args: [userId],
    });

    if (result.rows.length > 0) {
      return {
        membership: (result.rows[0].membership as string) || 'BASIC',
        createdAt: result.rows[0].created_at ? new Date(result.rows[0].created_at as string) : null
      };
    }
    return { membership: 'BASIC', createdAt: null };
  } catch (error) {
    console.error('Get membership error:', error);
    return { membership: 'BASIC', createdAt: null };
  }
}

export interface AccessResult {
  allowed: boolean;
  reason: 'GRANTED' | 'TRIAL_ACTIVE' | 'TRIAL_EXPIRED' | 'NO_ACCESS';
  daysLeft?: number;
  membership: string;
}

export async function checkBookmapAccess(userId: string): Promise<AccessResult> {
  const { membership } = await getUserMembership(userId);

  // 1. PRO and VVIP have unlimited access
  if (membership === 'PRO' || membership === 'VVIP' || membership === 'ADMIN') {
    return { allowed: true, reason: 'GRANTED', membership };
  }

  // 2. Check for Active Promo (Overrides BASIC restrictions)
  const promo = await checkUserPromo(userId);
  if (promo.hasPromo && promo.expiresAt) {
    const now = new Date();
    const expires = new Date(promo.expiresAt);
    const msLeft = expires.getTime() - now.getTime();
    const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));

    if (daysLeft > 0) {
      return { allowed: true, reason: 'TRIAL_ACTIVE', daysLeft, membership };
    }
  }

  // 3. BASIC users: Check 1-day trial from FIRST Bookmap access
  if (membership === 'BASIC' || !membership) {
    const turso = getTursoClient();
    if (!turso) return { allowed: false, reason: 'NO_ACCESS', membership };

    try {
      // Get first access timestamp
      const result = await turso.execute({
        sql: 'SELECT bookmap_first_access FROM users WHERE id = ?',
        args: [userId],
      });

      let firstAccess: Date | null = null;
      if (result.rows.length > 0 && result.rows[0].bookmap_first_access) {
        firstAccess = new Date(result.rows[0].bookmap_first_access as string);
      }

      // If no first access, set it NOW and grant trial
      if (!firstAccess) {
        const now = new Date();
        await turso.execute({
          sql: 'UPDATE users SET bookmap_first_access = ? WHERE id = ?',
          args: [now.toISOString(), userId],
        });
        console.log(`[BOOKMAP] First access recorded for user ${userId}`);
        return { allowed: true, reason: 'TRIAL_ACTIVE', daysLeft: 1, membership };
      }

      // Calculate trial status (1 day = 24 hours)
      const now = new Date();
      const trialDuration = 1 * 24 * 60 * 60 * 1000; // 1 day in ms
      const timeDiff = now.getTime() - firstAccess.getTime();

      if (timeDiff < trialDuration) {
        const hoursLeft = Math.ceil((trialDuration - timeDiff) / (60 * 60 * 1000));
        return { allowed: true, reason: 'TRIAL_ACTIVE', daysLeft: hoursLeft > 24 ? 1 : 0, membership };
      } else {
        return { allowed: false, reason: 'TRIAL_EXPIRED', daysLeft: 0, membership };
      }
    } catch (error) {
      console.error('Bookmap access check error:', error);
      return { allowed: false, reason: 'NO_ACCESS', membership };
    }
  }

  return { allowed: false, reason: 'NO_ACCESS', membership };
}

export async function updateUserMembership(userId: string, membership: string): Promise<boolean> {
  const turso = getTursoClient();
  if (!turso) return false;

  try {
    await turso.execute({
      sql: 'UPDATE users SET membership = ? WHERE id = ?',
      args: [membership, userId],
    });
    return true;
  } catch (error) {
    console.error('Update membership error:', error);
    return false;
  }
}

// Update user's geo-location data on login
export async function updateUserGeoLocation(userId: string, geoData: {
  ip?: string;
  country?: string;
  city?: string;
}): Promise<boolean> {
  const turso = getTursoClient();
  if (!turso) return false;

  try {
    await turso.execute({
      sql: `UPDATE users SET 
                last_login_ip = ?,
                last_login_country = ?,
                last_login_city = ?,
                last_login_at = datetime('now')
                WHERE id = ?`,
      args: [geoData.ip || null, geoData.country || null, geoData.city || null, userId],
    });
    console.log(`[GEO] Updated location for user ${userId}: ${geoData.city}, ${geoData.country}`);
    return true;
  } catch (error) {
    console.error('Update geo-location error:', error);
    return false;
  }
}

// Set promo for a specific user
export async function setUserPromo(userId: string, durationDays: number = 3, promoType: string = 'APK_DOWNLOAD'): Promise<boolean> {
  const turso = getTursoClient();
  if (!turso) return false;

  try {
    const expiresDate = new Date();
    expiresDate.setDate(expiresDate.getDate() + durationDays);
    const expiresStr = expiresDate.toISOString();

    await turso.execute({
      sql: `UPDATE users SET promo_expires = ?, promo_type = ? WHERE id = ?`,
      args: [expiresStr, promoType, userId],
    });
    console.log(`[PROMO] Set ${durationDays}-day promo for user ${userId}, expires: ${expiresStr}`);
    return true;
  } catch (error) {
    console.error('Set user promo error:', error);
    return false;
  }
}

// Check if user has active promo
export async function checkUserPromo(userId: string): Promise<{ hasPromo: boolean; expiresAt: string | null; promoType: string | null }> {
  const turso = getTursoClient();
  if (!turso) return { hasPromo: false, expiresAt: null, promoType: null };

  try {
    const result = await turso.execute({
      sql: 'SELECT promo_expires, promo_type FROM users WHERE id = ?',
      args: [userId],
    });

    if (result.rows.length > 0) {
      const promoExpires = result.rows[0].promo_expires as string | null;
      const promoType = result.rows[0].promo_type as string | null;

      if (promoExpires) {
        const expiresDate = new Date(promoExpires);
        const now = new Date();
        if (expiresDate > now) {
          return { hasPromo: true, expiresAt: promoExpires, promoType };
        }
      }
    }
    return { hasPromo: false, expiresAt: null, promoType: null };
  } catch (error) {
    console.error('Check user promo error:', error);
    return { hasPromo: false, expiresAt: null, promoType: null };
  }
}

// Give promo to ALL users (for APK launch campaign)
export async function givePromoToAllUsers(durationDays: number = 3, promoType: string = 'APK_V2_LAUNCH'): Promise<{ success: boolean; count: number }> {
  const turso = getTursoClient();
  if (!turso) return { success: false, count: 0 };

  try {
    const expiresDate = new Date();
    expiresDate.setDate(expiresDate.getDate() + durationDays);
    const expiresStr = expiresDate.toISOString();

    const result = await turso.execute({
      sql: `UPDATE users SET promo_expires = ?, promo_type = ? WHERE promo_expires IS NULL OR promo_expires < datetime('now')`,
      args: [expiresStr, promoType],
    });

    console.log(`[PROMO] Gave ${durationDays}-day promo to ${result.rowsAffected} users`);
    return { success: true, count: result.rowsAffected };
  } catch (error) {
    console.error('Give promo to all users error:', error);
    return { success: false, count: 0 };
  }
}

// ===== DOM ML PREDICTION FUNCTIONS =====

export interface MLPredictionRecord {
  symbol: string;
  horizon: number;
  direction: string;
  direction_code: number;
  confidence: number;
  model_used: string;
  initial_price: number;
  signals?: any[]; // Detailed signal breakdown
}

// Save a new ML prediction for later verification
export async function saveMLPrediction(prediction: MLPredictionRecord): Promise<number | null> {
  const turso = getTursoClient();
  if (!turso) return null;

  try {
    const signalsJson = prediction.signals ? JSON.stringify(prediction.signals) : null;

    const result = await turso.execute({
      sql: `INSERT INTO ml_predictions (symbol, horizon, direction, direction_code, confidence, model_used, initial_price, signals)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        prediction.symbol,
        prediction.horizon,
        prediction.direction,
        prediction.direction_code,
        prediction.confidence,
        prediction.model_used,
        prediction.initial_price,
        signalsJson
      ]
    });
    return Number(result.lastInsertRowid);
  } catch (error) {
    console.error('Save ML prediction error:', error);
    return null;
  }
}

// Get ML Config (Weights)
export async function getMLConfig(key: string): Promise<any | null> {
  const turso = getTursoClient();
  if (!turso) return null;
  try {
    const result = await turso.execute({
      sql: 'SELECT value FROM ml_config WHERE key = ?',
      args: [key]
    });
    if (result.rows.length > 0) {
      return JSON.parse(result.rows[0].value as string);
    }
    return null;
  } catch (e) {
    console.error('Get ML config error:', e);
    return null;
  }
}

// Upsert ML Config
export async function upsertMLConfig(key: string, value: any): Promise<boolean> {
  const turso = getTursoClient();
  if (!turso) return false;
  try {
    await turso.execute({
      sql: `INSERT INTO ml_config (key, value) VALUES (?, ?) 
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
      args: [key, JSON.stringify(value)]
    });
    return true;
  } catch (e) {
    console.error('Upsert ML config error:', e);
    return false;
  }
}

// Verify a prediction with actual price
export async function verifyMLPrediction(
  predictionId: number,
  actualPrice: number
): Promise<boolean> {
  const turso = getTursoClient();
  if (!turso) return false;

  try {
    // Get the original prediction
    const pred = await turso.execute({
      sql: 'SELECT initial_price, direction_code FROM ml_predictions WHERE id = ?',
      args: [predictionId]
    });

    if (pred.rows.length === 0) return false;

    const initialPrice = pred.rows[0].initial_price as number;
    const predictedDirection = pred.rows[0].direction_code as number;

    // Calculate actual direction
    const priceChange = actualPrice - initialPrice;
    const priceChangePct = (priceChange / initialPrice) * 10000; // bps

    let actualDirection: number;
    if (priceChangePct > 1) {
      actualDirection = 1; // UP
    } else if (priceChangePct < -1) {
      actualDirection = -1; // DOWN
    } else {
      actualDirection = 0; // NEUTRAL
    }

    const isCorrect = predictedDirection === actualDirection ? 1 : 0;

    // Update the prediction
    await turso.execute({
      sql: `UPDATE ml_predictions 
            SET actual_price = ?, actual_direction = ?, is_correct = ?, verified_at = datetime('now')
            WHERE id = ?`,
      args: [actualPrice, actualDirection, isCorrect, predictionId]
    });

    return true;
  } catch (error) {
    console.error('Verify ML prediction error:', error);
    return false;
  }
}

// Get ML accuracy stats for a symbol and date range
export interface MLAccuracyStats {
  total: number;
  correct: number;
  accuracy: number;
  byModel: Record<string, { total: number; correct: number; accuracy: number }>;
  byDirection: Record<string, { total: number; correct: number; accuracy: number }>;
}

export async function getMLAccuracyStats(
  symbol: string,
  days: number = 7
): Promise<MLAccuracyStats> {
  const turso = getTursoClient();
  const defaultStats: MLAccuracyStats = {
    total: 0,
    correct: 0,
    accuracy: 0,
    byModel: {},
    byDirection: {}
  };

  if (!turso) return defaultStats;

  try {
    // Overall stats
    const overall = await turso.execute({
      sql: `SELECT COUNT(*) as total, SUM(is_correct) as correct 
            FROM ml_predictions 
            WHERE symbol = ? AND verified_at IS NOT NULL 
            AND created_at > datetime('now', '-${days} days')`,
      args: [symbol]
    });

    const total = (overall.rows[0]?.total as number) || 0;
    const correct = (overall.rows[0]?.correct as number) || 0;

    // By model
    const byModelResult = await turso.execute({
      sql: `SELECT model_used, COUNT(*) as total, SUM(is_correct) as correct 
            FROM ml_predictions 
            WHERE symbol = ? AND verified_at IS NOT NULL 
            AND created_at > datetime('now', '-${days} days')
            GROUP BY model_used`,
      args: [symbol]
    });

    const byModel: Record<string, { total: number; correct: number; accuracy: number }> = {};
    for (const row of byModelResult.rows) {
      const modelTotal = row.total as number;
      const modelCorrect = row.correct as number;
      byModel[row.model_used as string] = {
        total: modelTotal,
        correct: modelCorrect,
        accuracy: modelTotal > 0 ? modelCorrect / modelTotal : 0
      };
    }

    // By direction
    const byDirResult = await turso.execute({
      sql: `SELECT direction, COUNT(*) as total, SUM(is_correct) as correct 
            FROM ml_predictions 
            WHERE symbol = ? AND verified_at IS NOT NULL 
            AND created_at > datetime('now', '-${days} days')
            GROUP BY direction`,
      args: [symbol]
    });

    const byDirection: Record<string, { total: number; correct: number; accuracy: number }> = {};
    for (const row of byDirResult.rows) {
      const dirTotal = row.total as number;
      const dirCorrect = row.correct as number;
      byDirection[row.direction as string] = {
        total: dirTotal,
        correct: dirCorrect,
        accuracy: dirTotal > 0 ? dirCorrect / dirTotal : 0
      };
    }

    return {
      total,
      correct,
      accuracy: total > 0 ? correct / total : 0,
      byModel,
      byDirection
    };
  } catch (error) {
    console.error('Get ML accuracy stats error:', error);
    return defaultStats;
  }
}

// Get recent predictions for display
export async function getRecentMLPredictions(symbol: string, limit: number = 20) {
  const turso = getTursoClient();
  if (!turso) return [];

  try {
    const result = await turso.execute({
      sql: `SELECT * FROM ml_predictions 
            WHERE symbol = ? 
            ORDER BY created_at DESC 
            LIMIT ?`,
      args: [symbol, limit]
    });

    return result.rows;
  } catch (error) {
    console.error('Get recent predictions error:', error);
    return [];
  }
}
