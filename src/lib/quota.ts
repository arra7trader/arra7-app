import getTursoClient, { getUserMembership, isTursoConfigured } from './turso';

// Quota limits per membership level
export const QUOTA_LIMITS = {
    BASIC: 2,
    PRO: 25,
    VVIP: Infinity, // Unlimited
} as const;

// Allowed timeframes per membership
export const ALLOWED_TIMEFRAMES = {
    BASIC: ['1m', '5m', '15m', '30m'], // M1 to M30 only
    PRO: ['1m', '5m', '15m', '30m', '1h', '4h', '1d'],
    VVIP: ['1m', '5m', '15m', '30m', '1h', '4h', '1d'],
} as const;

export type Membership = keyof typeof QUOTA_LIMITS;

export interface QuotaStatus {
    membership: Membership;
    dailyLimit: number;
    used: number;
    remaining: number;
    canAnalyze: boolean;
    allowedTimeframes: readonly string[];
}

// Get today's date in YYYY-MM-DD format
function getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
}

// Default unlimited quota (when Turso is not configured)
function getDefaultQuota(): QuotaStatus {
    return {
        membership: 'VVIP', // Unlimited when not configured
        dailyLimit: Infinity,
        used: 0,
        remaining: Infinity,
        canAnalyze: true,
        allowedTimeframes: ALLOWED_TIMEFRAMES.VVIP,
    };
}

// Get user's quota status
export async function getQuotaStatus(userId: string): Promise<QuotaStatus> {
    const turso = getTursoClient();
    if (!turso) return getDefaultQuota();

    try {
        const membership = (await getUserMembership(userId)) as Membership;
        const dailyLimit = QUOTA_LIMITS[membership] || QUOTA_LIMITS.BASIC;
        const allowedTimeframes = ALLOWED_TIMEFRAMES[membership] || ALLOWED_TIMEFRAMES.BASIC;

        const today = getTodayDate();

        // Get today's usage
        const result = await turso.execute({
            sql: 'SELECT count FROM quota_usage WHERE user_id = ? AND date = ?',
            args: [userId, today],
        });

        const used = result.rows.length > 0 ? (result.rows[0].count as number) : 0;
        const remaining = dailyLimit === Infinity ? Infinity : Math.max(0, dailyLimit - used);

        return {
            membership,
            dailyLimit,
            used,
            remaining,
            canAnalyze: remaining > 0,
            allowedTimeframes,
        };
    } catch (error) {
        console.error('Get quota status error:', error);
        return getDefaultQuota();
    }
}

// Check if user can analyze (has remaining quota)
export async function checkQuota(userId: string, timeframe: string): Promise<{
    allowed: boolean;
    message?: string;
    quotaStatus: QuotaStatus;
}> {
    if (!isTursoConfigured()) {
        return {
            allowed: true,
            quotaStatus: getDefaultQuota(),
        };
    }

    const status = await getQuotaStatus(userId);

    // Check timeframe restriction
    if (!status.allowedTimeframes.includes(timeframe)) {
        return {
            allowed: false,
            message: `Timeframe ${timeframe} tidak tersedia untuk paket ${status.membership}. Upgrade ke PRO untuk akses semua timeframe.`,
            quotaStatus: status,
        };
    }

    // Check quota
    if (!status.canAnalyze) {
        return {
            allowed: false,
            message: `Quota harian Anda sudah habis (${status.used}/${status.dailyLimit}). Upgrade paket untuk lebih banyak analisa.`,
            quotaStatus: status,
        };
    }

    return {
        allowed: true,
        quotaStatus: status,
    };
}

// Use quota (decrement remaining)
export async function useQuota(userId: string): Promise<boolean> {
    const turso = getTursoClient();
    if (!turso) return true; // No-op when not configured

    try {
        const today = getTodayDate();

        // Try to update existing record
        const updateResult = await turso.execute({
            sql: 'UPDATE quota_usage SET count = count + 1 WHERE user_id = ? AND date = ?',
            args: [userId, today],
        });

        // If no rows updated, insert new record
        if (updateResult.rowsAffected === 0) {
            await turso.execute({
                sql: 'INSERT INTO quota_usage (user_id, date, count) VALUES (?, ?, 1)',
                args: [userId, today],
            });
        }

        return true;
    } catch (error) {
        console.error('Use quota error:', error);
        return false;
    }
}

// Reset user's daily quota (for admin use)
export async function resetQuota(userId: string): Promise<boolean> {
    const turso = getTursoClient();
    if (!turso) return true;

    try {
        const today = getTodayDate();

        await turso.execute({
            sql: 'DELETE FROM quota_usage WHERE user_id = ? AND date = ?',
            args: [userId, today],
        });

        return true;
    } catch (error) {
        console.error('Reset quota error:', error);
        return false;
    }
}
