import getTursoClient from './turso';

export interface TelegramVvipQuotaResult {
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
  usageDate: string;
  resetText: string;
}

function getDailyLimit(): number {
  const value = Number(process.env.TELEGRAM_VVIP_DAILY_LIMIT ?? 50);
  if (!Number.isFinite(value) || value <= 0) return 50;
  return Math.floor(value);
}

function getWibDateKey(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export async function consumeTelegramVvipQuota(userId: string): Promise<TelegramVvipQuotaResult> {
  const limit = getDailyLimit();
  const usageDate = getWibDateKey();
  const resetText = '00:00 WIB';

  const turso = getTursoClient();
  if (!turso) {
    return {
      allowed: true,
      limit,
      used: 0,
      remaining: limit,
      usageDate,
      resetText,
    };
  }

  try {
    const currentRes = await turso.execute({
      sql: `SELECT count
            FROM telegram_vvip_daily_usage
            WHERE user_id = ?
              AND usage_date = ?
            LIMIT 1`,
      args: [userId, usageDate],
    });

    const currentUsed = currentRes.rows.length > 0
      ? Number(currentRes.rows[0].count || 0)
      : 0;

    if (currentUsed >= limit) {
      return {
        allowed: false,
        limit,
        used: currentUsed,
        remaining: 0,
        usageDate,
        resetText,
      };
    }

    await turso.execute({
      sql: `INSERT INTO telegram_vvip_daily_usage (user_id, usage_date, count, updated_at)
            VALUES (?, ?, 1, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id, usage_date)
            DO UPDATE SET
              count = count + 1,
              updated_at = CURRENT_TIMESTAMP`,
      args: [userId, usageDate],
    });

    const used = currentUsed + 1;
    return {
      allowed: true,
      limit,
      used,
      remaining: Math.max(0, limit - used),
      usageDate,
      resetText,
    };
  } catch (error) {
    console.error('[TELEGRAM_QUOTA] consume error:', error);
    return {
      allowed: false,
      limit,
      used: limit,
      remaining: 0,
      usageDate,
      resetText,
    };
  }
}

export async function getTelegramVvipQuotaStatus(userId: string): Promise<TelegramVvipQuotaResult> {
  const limit = getDailyLimit();
  const usageDate = getWibDateKey();
  const resetText = '00:00 WIB';

  const turso = getTursoClient();
  if (!turso) {
    return {
      allowed: true,
      limit,
      used: 0,
      remaining: limit,
      usageDate,
      resetText,
    };
  }

  try {
    const currentRes = await turso.execute({
      sql: `SELECT count
            FROM telegram_vvip_daily_usage
            WHERE user_id = ?
              AND usage_date = ?
            LIMIT 1`,
      args: [userId, usageDate],
    });

    const used = currentRes.rows.length > 0
      ? Number(currentRes.rows[0].count || 0)
      : 0;

    return {
      allowed: used < limit,
      limit,
      used,
      remaining: Math.max(0, limit - used),
      usageDate,
      resetText,
    };
  } catch (error) {
    console.error('[TELEGRAM_QUOTA] status error:', error);
    return {
      allowed: false,
      limit,
      used: limit,
      remaining: 0,
      usageDate,
      resetText,
    };
  }
}
