import getTursoClient from './turso';
import { randomBytes } from 'crypto';

export interface LicenseKey {
  id?: number;
  code: string;
  tier: 'PRO' | 'VVIP';
  durationDays: number;
  isUsed: boolean;
  usedByDeviceId?: string;
  maxDevices: number;
  createdAt: string;
  activatedAt?: string;
  expiresAt?: string;
  notes?: string;
}

export interface DeviceUser {
  deviceId: string;
  tier: 'BASIC' | 'PRO' | 'VVIP';
  tierExpiresAt?: string;
  activeLicenseCode?: string;
  firstSeenAt: string;
  lastActiveAt: string;
  ipAddress?: string;
  country?: string;
  city?: string;
  userAgent?: string;
  totalPredictions: number;
  totalVisits: number;
}

let schemaEnsured = false;

export async function ensureLicenseSchema(): Promise<boolean> {
  if (schemaEnsured) return true;
  const turso = getTursoClient();
  if (!turso) return false;

  try {
    // 1. Table for License Keys
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS license_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        tier TEXT NOT NULL DEFAULT 'VVIP',
        duration_days INTEGER NOT NULL DEFAULT 30,
        is_used INTEGER DEFAULT 0,
        used_by_device_id TEXT,
        max_devices INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        activated_at DATETIME,
        expires_at DATETIME,
        notes TEXT
      )
    `);

    await turso.execute(`
      CREATE INDEX IF NOT EXISTS idx_license_keys_code ON license_keys(code)
    `);

    // 2. Table for Tracked Devices
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS device_users (
        device_id TEXT PRIMARY KEY,
        tier TEXT DEFAULT 'BASIC',
        tier_expires_at DATETIME,
        active_license_code TEXT,
        first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ip_address TEXT,
        country TEXT,
        city TEXT,
        user_agent TEXT,
        total_predictions INTEGER DEFAULT 0,
        total_visits INTEGER DEFAULT 1
      )
    `);

    // 3. Table for Activity Logs
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS device_activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT NOT NULL,
        path TEXT NOT NULL,
        action TEXT,
        meta TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await turso.execute(`
      CREATE INDEX IF NOT EXISTS idx_device_activity_device_id ON device_activity_logs(device_id)
    `);

    schemaEnsured = true;
    return true;
  } catch (error) {
    console.error('[LICENSE] Failed to ensure schema:', error);
    return false;
  }
}

// Generate a cryptographic, clean format license code: e.g. PICA-VVIP-7981-AB3F
export function generateCodeString(tier: 'PRO' | 'VVIP' = 'VVIP'): string {
  const hexPart1 = randomBytes(2).toString('hex').toUpperCase(); // 4 chars
  const hexPart2 = randomBytes(2).toString('hex').toUpperCase(); // 4 chars
  return `PICA-${tier}-${hexPart1}-${hexPart2}`;
}

// Admin function: Create one or multiple license keys
export async function createLicenseKeys(params: {
  tier: 'PRO' | 'VVIP';
  durationDays: number;
  count?: number;
  notes?: string;
  maxDevices?: number;
}): Promise<string[]> {
  await ensureLicenseSchema();
  const turso = getTursoClient();
  if (!turso) throw new Error('Database is not configured');

  const { tier, durationDays, count = 1, notes, maxDevices = 1 } = params;
  const createdCodes: string[] = [];

  for (let i = 0; i < count; i++) {
    const code = generateCodeString(tier);
    await turso.execute({
      sql: `INSERT INTO license_keys (code, tier, duration_days, is_used, max_devices, notes)
            VALUES (?, ?, ?, 0, ?, ?)`,
      args: [code, tier, durationDays, maxDevices, notes || null],
    });
    createdCodes.push(code);
  }

  return createdCodes;
}

// User function: Redeem a license key with Device ID
export async function redeemLicenseKey(params: {
  code: string;
  deviceId: string;
  ip?: string;
  userAgent?: string;
}): Promise<{
  success: boolean;
  message: string;
  tier?: 'PRO' | 'VVIP';
  expiresAt?: string;
  durationDays?: number;
}> {
  await ensureLicenseSchema();
  const turso = getTursoClient();
  if (!turso) throw new Error('Database is not configured');

  const cleanCode = params.code.trim().toUpperCase();
  const cleanDeviceId = params.deviceId.trim();

  if (!cleanCode) {
    return { success: false, message: 'Kode lisensi tidak boleh kosong.' };
  }
  if (!cleanDeviceId) {
    return { success: false, message: 'Identitas perangkat (Device ID) tidak valid.' };
  }

  // 1. Fetch the key
  const keyResult = await turso.execute({
    sql: `SELECT * FROM license_keys WHERE UPPER(code) = ? LIMIT 1`,
    args: [cleanCode],
  });

  if (!keyResult.rows || keyResult.rows.length === 0) {
    return { success: false, message: 'Kode lisensi tidak valid atau tidak ditemukan.' };
  }

  const row = keyResult.rows[0];
  const isUsed = Number(row.is_used) === 1;
  const usedByDeviceId = (row.used_by_device_id as string) || '';
  const tier = (row.tier as 'PRO' | 'VVIP') || 'VVIP';
  const durationDays = Number(row.duration_days) || 30;

  // 2. Anti-reuse validation
  if (isUsed) {
    if (usedByDeviceId && usedByDeviceId !== cleanDeviceId) {
      return {
        success: false,
        message: 'Kode lisensi ini sudah pernah digunakan di perangkat lain (1x aktivasi).',
      };
    }
  }

  // 3. Calculate expiration date
  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
  const expiresAtIso = expiresAt.toISOString();

  // 4. Mark key as used & bound to device
  await turso.execute({
    sql: `UPDATE license_keys 
          SET is_used = 1,
              used_by_device_id = ?,
              activated_at = COALESCE(activated_at, CURRENT_TIMESTAMP),
              expires_at = ?
          WHERE UPPER(code) = ?`,
    args: [cleanDeviceId, expiresAtIso, cleanCode],
  });

  // 5. Update or insert device_users table
  await turso.execute({
    sql: `INSERT INTO device_users (
            device_id, tier, tier_expires_at, active_license_code, 
            last_active_at, ip_address, user_agent
          )
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
          ON CONFLICT(device_id) DO UPDATE SET
            tier = excluded.tier,
            tier_expires_at = excluded.tier_expires_at,
            active_license_code = excluded.active_license_code,
            last_active_at = CURRENT_TIMESTAMP`,
    args: [
      cleanDeviceId,
      tier,
      expiresAtIso,
      cleanCode,
      params.ip || null,
      params.userAgent || null,
    ],
  });

  // 6. Log redemption
  await turso.execute({
    sql: `INSERT INTO device_activity_logs (device_id, path, action, meta, ip_address)
          VALUES (?, '/api/license/redeem', 'REDEEM_SUCCESS', ?, ?)`,
    args: [
      cleanDeviceId,
      JSON.stringify({ code: cleanCode, tier, durationDays, expiresAt: expiresAtIso }),
      params.ip || null,
    ],
  });

  return {
    success: true,
    message: `Selamat! Akses ${tier} berhasil aktif selama ${durationDays} hari.`,
    tier,
    expiresAt: expiresAtIso,
    durationDays,
  };
}

// Get device status & automatically handle expiration
export async function getDeviceStatus(deviceId: string): Promise<{
  deviceId: string;
  tier: 'BASIC' | 'PRO' | 'VVIP';
  tierExpiresAt: string | null;
  isExpired: boolean;
  daysLeft: number;
  activeLicenseCode: string | null;
}> {
  await ensureLicenseSchema();
  const turso = getTursoClient();
  if (!turso) {
    return {
      deviceId,
      tier: 'BASIC',
      tierExpiresAt: null,
      isExpired: false,
      daysLeft: 0,
      activeLicenseCode: null,
    };
  }

  const result = await turso.execute({
    sql: `SELECT * FROM device_users WHERE device_id = ? LIMIT 1`,
    args: [deviceId],
  });

  if (!result.rows || result.rows.length === 0) {
    return {
      deviceId,
      tier: 'BASIC',
      tierExpiresAt: null,
      isExpired: false,
      daysLeft: 0,
      activeLicenseCode: null,
    };
  }

  const row = result.rows[0];
  let tier = (row.tier as 'BASIC' | 'PRO' | 'VVIP') || 'BASIC';
  const tierExpiresAt = (row.tier_expires_at as string) || null;
  const activeLicenseCode = (row.active_license_code as string) || null;

  let isExpired = false;
  let daysLeft = 0;

  if (tierExpiresAt && tier !== 'BASIC') {
    const expiryTime = new Date(tierExpiresAt).getTime();
    const nowTime = Date.now();
    const msDiff = expiryTime - nowTime;

    if (msDiff <= 0) {
      // Downgrade to BASIC if expired
      isExpired = true;
      tier = 'BASIC';
      await turso.execute({
        sql: `UPDATE device_users SET tier = 'BASIC' WHERE device_id = ?`,
        args: [deviceId],
      });
    } else {
      daysLeft = Math.ceil(msDiff / (24 * 60 * 60 * 1000));
    }
  }

  return {
    deviceId,
    tier,
    tierExpiresAt,
    isExpired,
    daysLeft,
    activeLicenseCode,
  };
}

// Track device telemetry in the background
export async function trackDeviceActivity(params: {
  deviceId: string;
  path: string;
  action?: string;
  meta?: any;
  ip?: string;
  userAgent?: string;
  country?: string;
  city?: string;
}): Promise<void> {
  await ensureLicenseSchema();
  const turso = getTursoClient();
  if (!turso) return;

  const { deviceId, path, action = 'PAGE_VIEW', meta, ip, userAgent, country, city } = params;

  try {
    // 1. Upsert device
    await turso.execute({
      sql: `INSERT INTO device_users (
              device_id, tier, first_seen_at, last_active_at, 
              ip_address, country, city, user_agent, total_visits
            )
            VALUES (?, 'BASIC', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?, ?, ?, 1)
            ON CONFLICT(device_id) DO UPDATE SET
              last_active_at = CURRENT_TIMESTAMP,
              ip_address = COALESCE(excluded.ip_address, device_users.ip_address),
              country = COALESCE(excluded.country, device_users.country),
              city = COALESCE(excluded.city, device_users.city),
              user_agent = COALESCE(excluded.user_agent, device_users.user_agent),
              total_visits = device_users.total_visits + 1`,
      args: [deviceId, ip || null, country || null, city || null, userAgent || null],
    });

    // 2. Log activity
    await turso.execute({
      sql: `INSERT INTO device_activity_logs (device_id, path, action, meta, ip_address)
            VALUES (?, ?, ?, ?, ?)`,
      args: [deviceId, path, action, meta ? JSON.stringify(meta) : null, ip || null],
    });
  } catch (err) {
    console.error('[TRACKING] Failed to track activity:', err);
  }
}

// Admin: List license keys
export async function listLicenseKeys(limit: number = 100): Promise<LicenseKey[]> {
  await ensureLicenseSchema();
  const turso = getTursoClient();
  if (!turso) return [];

  const result = await turso.execute({
    sql: `SELECT * FROM license_keys ORDER BY created_at DESC LIMIT ?`,
    args: [limit],
  });

  return (result.rows || []).map((row: any) => ({
    id: Number(row.id),
    code: String(row.code),
    tier: row.tier as 'PRO' | 'VVIP',
    durationDays: Number(row.duration_days),
    isUsed: Number(row.is_used) === 1,
    usedByDeviceId: (row.used_by_device_id as string) || undefined,
    maxDevices: Number(row.max_devices) || 1,
    createdAt: String(row.created_at),
    activatedAt: (row.activated_at as string) || undefined,
    expiresAt: (row.expires_at as string) || undefined,
    notes: (row.notes as string) || undefined,
  }));
}

// Admin: List tracked devices
export async function listTrackedDevices(limit: number = 100): Promise<DeviceUser[]> {
  await ensureLicenseSchema();
  const turso = getTursoClient();
  if (!turso) return [];

  const result = await turso.execute({
    sql: `SELECT * FROM device_users ORDER BY last_active_at DESC LIMIT ?`,
    args: [limit],
  });

  return (result.rows || []).map((row: any) => ({
    deviceId: String(row.device_id),
    tier: (row.tier as 'BASIC' | 'PRO' | 'VVIP') || 'BASIC',
    tierExpiresAt: (row.tier_expires_at as string) || undefined,
    activeLicenseCode: (row.active_license_code as string) || undefined,
    firstSeenAt: String(row.first_seen_at),
    lastActiveAt: String(row.last_active_at),
    ipAddress: (row.ip_address as string) || undefined,
    country: (row.country as string) || undefined,
    city: (row.city as string) || undefined,
    userAgent: (row.user_agent as string) || undefined,
    totalPredictions: Number(row.total_predictions) || 0,
    totalVisits: Number(row.total_visits) || 1,
  }));
}
