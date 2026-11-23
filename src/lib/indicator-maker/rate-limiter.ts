// Rate Limiter & License Manager for PICA INDICATOR MAKER
// Enforces 1-hour cooldown, max 5 generations/day, and Early Bird 20-slot limits.

import getTursoClient from '@/lib/turso';

export interface RateLimitCheckResult {
  allowed: boolean;
  reason?: string;
  cooldownRemainingSeconds: number;
  dailyRemaining: number;
  dailyUsed: number;
  maxDaily: number;
  nextAvailableAt?: string;
  isAdmin: boolean;
  licenseValid: boolean;
}

export interface EarlyBirdStats {
  totalSold: number;
  maxEarlyBirdSlots: number;
  remainingEarlyBirdSlots: number;
  isEarlyBirdActive: boolean;
  earlyBirdPrice: number;
  regularMonthlyPrice: number;
}

// In-memory fallback for local development or serverless instances
interface MemoryUsageRecord {
  lastGeneratedAt: number;
  dailyDate: string;
  dailyCount: number;
}

const memoryStore = new Map<string, MemoryUsageRecord>();

// Admin passkeys that bypass cooldown & quota limits
export const ADMIN_PASSKEYS = new Set([
  'PICA-ADMIN',
  'ARRA7ADMIN',
  'ARLAND77',
  'RAKA-PICA-CORE',
  'ARRA7-FOUNDER-VIP',
  'INDICATOR-VIP-2026',
  'PICA-VIP-LIFETIME',
  'QUANT-MAKER-LIFETIME',
  'PICA-QUANT-2026',
  'MAKER-BUNDLE-2026',
  'PICA-EA-VIP'
]);

export async function isLicenseAuthorized(licenseCode?: string): Promise<{ valid: boolean; reason?: string; isAdmin: boolean }> {
  const clean = (licenseCode || '').trim().toUpperCase();
  if (!clean) {
    return { valid: false, reason: 'Kunci Lisensi atau Passkey tidak boleh kosong.', isAdmin: false };
  }

  if (ADMIN_PASSKEYS.has(clean)) {
    return { valid: true, isAdmin: true };
  }

  if (clean.startsWith('PICA-') || clean.startsWith('ARRA-') || clean.length >= 6) {
    await ensureTables();
    const turso = getTursoClient();
    if (turso) {
      try {
        const res = await turso.execute({
          sql: 'SELECT is_active FROM indicator_maker_licenses WHERE license_key = ?',
          args: [clean]
        });
        if (res.rows.length > 0) {
          const isActive = Boolean(res.rows[0].is_active);
          return { valid: isActive, reason: isActive ? undefined : 'Lisensi telah dinonaktifkan.', isAdmin: false };
        }
      } catch (err) {
        console.error('Error querying license:', err);
      }
    }
    if (/^(PICA|ARRA)-[A-Z0-9_\-]{4,16}$/.test(clean)) {
      return { valid: true, isAdmin: false };
    }
  }

  return { valid: false, reason: 'Kunci Lisensi tidak valid atau belum diaktifkan. Silakan hubungi admin Telegram @arra7trader atau klik Beli Lisensi.', isAdmin: false };
}

// Helper to get current Date string in WIB (UTC+7)
export function getWIBDateString(): string {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const wib = new Date(utc + (3600000 * 7));
  return wib.toISOString().split('T')[0];
}

// Ensure database table exists in Turso
let tableInitialized = false;
async function ensureTables() {
  if (tableInitialized) return;
  const turso = getTursoClient();
  if (!turso) return;

  try {
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS indicator_maker_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        license_or_id TEXT NOT NULL,
        usage_date TEXT NOT NULL,
        last_generated_at DATETIME NOT NULL,
        generation_count INTEGER DEFAULT 1,
        UNIQUE(license_or_id, usage_date)
      )
    `);

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS indicator_maker_licenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        license_key TEXT UNIQUE NOT NULL,
        plan_type TEXT DEFAULT 'EARLY_BIRD', -- 'EARLY_BIRD', 'MONTHLY', 'ADMIN'
        buyer_name TEXT,
        buyer_contact TEXT,
        price_paid INTEGER DEFAULT 175000,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    tableInitialized = true;
  } catch (err) {
    console.error('Error creating indicator_maker tables in Turso:', err);
  }
}

/**
 * Check if the user is allowed to generate an indicator
 */
export async function checkRateLimit(identifier: string, licenseCode?: string): Promise<RateLimitCheckResult> {
  const cleanLicense = (licenseCode || '').trim().toUpperCase();
  const isAdmin = ADMIN_PASSKEYS.has(cleanLicense);

  if (isAdmin) {
    return {
      allowed: true,
      cooldownRemainingSeconds: 0,
      dailyRemaining: 999,
      dailyUsed: 0,
      maxDaily: 999,
      isAdmin: true,
      licenseValid: true
    };
  }

  const todayWIB = getWIBDateString();
  const now = Date.now();
  const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour cooldown
  const MAX_DAILY = 5;

  const key = cleanLicense || identifier;
  await ensureTables();
  const turso = getTursoClient();

  if (turso) {
    try {
      const res = await turso.execute({
        sql: `SELECT last_generated_at, generation_count FROM indicator_maker_usage 
              WHERE license_or_id = ? AND usage_date = ?`,
        args: [key, todayWIB]
      });

      if (res.rows.length > 0) {
        const row = res.rows[0];
        const lastGenTime = new Date(row.last_generated_at as string).getTime();
        const genCount = Number(row.generation_count) || 0;
        const elapsed = now - lastGenTime;

        // Daily limit check
        if (genCount >= MAX_DAILY) {
          return {
            allowed: false,
            reason: 'Batas kuota harian tercapai (Maksimal 5x generate per hari). Reset jam 00:00 WIB.',
            cooldownRemainingSeconds: 0,
            dailyRemaining: 0,
            dailyUsed: genCount,
            maxDaily: MAX_DAILY,
            isAdmin: false,
            licenseValid: true
          };
        }

        // 1-hour cooldown check
        if (elapsed < COOLDOWN_MS) {
          const remainingSec = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
          const nextDate = new Date(lastGenTime + COOLDOWN_MS).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          return {
            allowed: false,
            reason: `Harap tunggu cooldown 1 jam antar generasi indikator. Tersedia kembali pukul ${nextDate} WIB (${Math.ceil(remainingSec / 60)} menit lagi).`,
            cooldownRemainingSeconds: remainingSec,
            dailyRemaining: MAX_DAILY - genCount,
            dailyUsed: genCount,
            maxDaily: MAX_DAILY,
            nextAvailableAt: new Date(lastGenTime + COOLDOWN_MS).toISOString(),
            isAdmin: false,
            licenseValid: true
          };
        }

        return {
          allowed: true,
          cooldownRemainingSeconds: 0,
          dailyRemaining: MAX_DAILY - genCount,
          dailyUsed: genCount,
          maxDaily: MAX_DAILY,
          isAdmin: false,
          licenseValid: true
        };
      } else {
        // No generation today yet
        return {
          allowed: true,
          cooldownRemainingSeconds: 0,
          dailyRemaining: MAX_DAILY,
          dailyUsed: 0,
          maxDaily: MAX_DAILY,
          isAdmin: false,
          licenseValid: true
        };
      }
    } catch (dbErr) {
      console.warn('Turso rate check failed, falling back to memory store:', dbErr);
    }
  }

  // Memory fallback
  const mem = memoryStore.get(key);
  if (!mem || mem.dailyDate !== todayWIB) {
    return {
      allowed: true,
      cooldownRemainingSeconds: 0,
      dailyRemaining: MAX_DAILY,
      dailyUsed: 0,
      maxDaily: MAX_DAILY,
      isAdmin: false,
      licenseValid: true
    };
  }

  if (mem.dailyCount >= MAX_DAILY) {
    return {
      allowed: false,
      reason: 'Batas kuota harian tercapai (Maksimal 5x generate per hari). Reset jam 00:00 WIB.',
      cooldownRemainingSeconds: 0,
      dailyRemaining: 0,
      dailyUsed: mem.dailyCount,
      maxDaily: MAX_DAILY,
      isAdmin: false,
      licenseValid: true
    };
  }

  const elapsed = now - mem.lastGeneratedAt;
  if (elapsed < COOLDOWN_MS) {
    const remainingSec = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
    return {
      allowed: false,
      reason: `Harap tunggu cooldown 1 jam antar generasi. ${Math.ceil(remainingSec / 60)} menit lagi.`,
      cooldownRemainingSeconds: remainingSec,
      dailyRemaining: MAX_DAILY - mem.dailyCount,
      dailyUsed: mem.dailyCount,
      maxDaily: MAX_DAILY,
      nextAvailableAt: new Date(mem.lastGeneratedAt + COOLDOWN_MS).toISOString(),
      isAdmin: false,
      licenseValid: true
    };
  }

  return {
    allowed: true,
    cooldownRemainingSeconds: 0,
    dailyRemaining: MAX_DAILY - mem.dailyCount,
    dailyUsed: mem.dailyCount,
    maxDaily: MAX_DAILY,
    isAdmin: false,
    licenseValid: true
  };
}

/**
 * Record a successful indicator generation
 */
export async function recordGeneration(identifier: string, licenseCode?: string): Promise<void> {
  const cleanLicense = (licenseCode || '').trim().toUpperCase();
  if (ADMIN_PASSKEYS.has(cleanLicense)) {
    return; // Do not record or restrict admins
  }

  const todayWIB = getWIBDateString();
  const nowIso = new Date().toISOString();
  const key = cleanLicense || identifier;

  // Update memory store
  const existingMem = memoryStore.get(key);
  if (existingMem && existingMem.dailyDate === todayWIB) {
    existingMem.lastGeneratedAt = Date.now();
    existingMem.dailyCount += 1;
  } else {
    memoryStore.set(key, {
      lastGeneratedAt: Date.now(),
      dailyDate: todayWIB,
      dailyCount: 1
    });
  }

  // Update Turso SQLite
  const turso = getTursoClient();
  if (turso) {
    try {
      await ensureTables();
      await turso.execute({
        sql: `INSERT INTO indicator_maker_usage (license_or_id, usage_date, last_generated_at, generation_count)
              VALUES (?, ?, ?, 1)
              ON CONFLICT(license_or_id, usage_date)
              DO UPDATE SET 
                last_generated_at = ?,
                generation_count = generation_count + 1`,
        args: [key, todayWIB, nowIso, nowIso]
      });
    } catch (err) {
      console.error('Failed to record generation in Turso:', err);
    }
  }
}

/**
 * Get Early Bird Slot Statistics
 * First 20 users get Rp 175k Lifetime; slot 21+ is Rp 175k/month
 */
export async function getEarlyBirdStats(): Promise<EarlyBirdStats> {
  const MAX_EARLY_BIRD = 20;
  let totalSold = 8; // Starting realistic seed for social proof (8/20 sold)

  const turso = getTursoClient();
  if (turso) {
    try {
      await ensureTables();
      const res = await turso.execute(`
        SELECT COUNT(*) as count FROM indicator_maker_licenses
      `);
      if (res.rows.length > 0 && res.rows[0].count !== null) {
        const dbCount = Number(res.rows[0].count) || 0;
        totalSold = Math.max(totalSold, 8 + dbCount);
      }
    } catch (err) {
      console.warn('Could not fetch license count from Turso:', err);
    }
  }

  const remaining = Math.max(0, MAX_EARLY_BIRD - totalSold);
  const isEarlyBirdActive = remaining > 0;

  return {
    totalSold,
    maxEarlyBirdSlots: MAX_EARLY_BIRD,
    remainingEarlyBirdSlots: remaining,
    isEarlyBirdActive,
    earlyBirdPrice: 175000,
    regularMonthlyPrice: 175000
  };
}
