import getTursoClient, { getUserMembership, isTursoConfigured, checkUserPromo } from './turso';

// Quota limits per membership level (Forex Analysis)
export const QUOTA_LIMITS = {
    BASIC: 2,
    PRO: 25,
    VVIP: Infinity, // Unlimited
} as const;

// PROMO quota (for APK download promotion)
export const PROMO_QUOTA_LIMIT = 10; // 10 analyses per day during promo

// Stock Analysis Quota limits (same as Forex)
export const STOCK_QUOTA_LIMITS = {
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

// Allowed pair categories per membership
export const ALLOWED_PAIR_CATEGORIES = {
    BASIC: ['major', 'minor', 'gold'], // Forex Major, Minor, and Gold only
    PRO: ['major', 'minor', 'commodities', 'crypto', 'indices'], // All pairs
    VVIP: ['major', 'minor', 'commodities', 'crypto', 'indices'], // All pairs
} as const;

// Specific pairs allowed for BASIC (Forex + Gold)
export const BASIC_ALLOWED_PAIRS = [
    // Forex Major
    'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
    // Forex Minor
    'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'EURAUD', 'EURCAD', 'GBPCHF',
    'GBPAUD', 'AUDJPY', 'CADJPY', 'CHFJPY', 'NZDJPY', 'AUDCAD', 'AUDCHF',
    'AUDNZD', 'EURNZD', 'GBPCAD', 'GBPNZD',
    // Gold only from commodities
    'XAUUSD',
];

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
        let dailyLimit = QUOTA_LIMITS[membership] || QUOTA_LIMITS.BASIC;
        let allowedTimeframes = ALLOWED_TIMEFRAMES[membership] || ALLOWED_TIMEFRAMES.BASIC;

        // Check if user has active promo
        const promoStatus = await checkUserPromo(userId);
        if (promoStatus.hasPromo) {
            // Override with promo limits (10/day, all timeframes, all pairs)
            dailyLimit = Math.max(dailyLimit, PROMO_QUOTA_LIMIT);
            allowedTimeframes = ALLOWED_TIMEFRAMES.VVIP; // All timeframes during promo
            console.log(`[PROMO] User ${userId} has active promo until ${promoStatus.expiresAt}`);
        }

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
export async function checkQuota(userId: string, timeframe: string, pair?: string): Promise<{
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

    // Check if user has promo (allows all pairs)
    const promoStatus = await checkUserPromo(userId);

    // Check pair restriction for BASIC (skip if promo is active)
    if (pair && status.membership === 'BASIC' && !promoStatus.hasPromo && !BASIC_ALLOWED_PAIRS.includes(pair.toUpperCase())) {
        return {
            allowed: false,
            message: `Pair ${pair} tidak tersedia untuk paket BASIC. Upgrade ke PRO untuk akses semua pairs termasuk Crypto & Indices.`,
            quotaStatus: status,
        };
    }

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

// ============== STOCK ANALYSIS QUOTA ==============

export interface StockQuotaStatus {
    membership: Membership;
    dailyLimit: number;
    used: number;
    remaining: number;
    canAnalyze: boolean;
}

// Default unlimited stock quota
function getDefaultStockQuota(): StockQuotaStatus {
    return {
        membership: 'VVIP',
        dailyLimit: Infinity,
        used: 0,
        remaining: Infinity,
        canAnalyze: true,
    };
}

// Get user's stock quota status
export async function getStockQuotaStatus(userId: string): Promise<StockQuotaStatus> {
    const turso = getTursoClient();
    if (!turso) return getDefaultStockQuota();

    try {
        const membership = (await getUserMembership(userId)) as Membership;
        let dailyLimit = STOCK_QUOTA_LIMITS[membership] || STOCK_QUOTA_LIMITS.BASIC;

        // Check if user has active promo
        const promoStatus = await checkUserPromo(userId);
        if (promoStatus.hasPromo) {
            // Override with promo limits (10/day for stock too)
            dailyLimit = Math.max(dailyLimit, PROMO_QUOTA_LIMIT);
            console.log(`[PROMO] User ${userId} has active stock promo until ${promoStatus.expiresAt}`);
        }

        const today = getTodayDate();

        // Get today's stock analysis usage
        const result = await turso.execute({
            sql: 'SELECT count FROM stock_quota_usage WHERE user_id = ? AND date = ?',
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
        };
    } catch (error) {
        console.error('Get stock quota status error:', error);
        return getDefaultStockQuota();
    }
}

// Check if user can analyze stock
export async function checkStockQuota(userId: string): Promise<{
    allowed: boolean;
    message?: string;
    quotaStatus: StockQuotaStatus;
}> {
    if (!isTursoConfigured()) {
        return {
            allowed: true,
            quotaStatus: getDefaultStockQuota(),
        };
    }

    const status = await getStockQuotaStatus(userId);

    if (!status.canAnalyze) {
        return {
            allowed: false,
            message: `Quota analisa saham harian Anda sudah habis (${status.used}/${status.dailyLimit}). Upgrade paket untuk lebih banyak analisa.`,
            quotaStatus: status,
        };
    }

    return {
        allowed: true,
        quotaStatus: status,
    };
}

// Use stock quota
export async function useStockQuota(userId: string): Promise<boolean> {
    const turso = getTursoClient();
    if (!turso) return true;

    try {
        const today = getTodayDate();

        // Try to update existing record
        const updateResult = await turso.execute({
            sql: 'UPDATE stock_quota_usage SET count = count + 1 WHERE user_id = ? AND date = ?',
            args: [userId, today],
        });

        // If no rows updated, insert new record
        if (updateResult.rowsAffected === 0) {
            await turso.execute({
                sql: 'INSERT INTO stock_quota_usage (user_id, date, count) VALUES (?, ?, 1)',
                args: [userId, today],
            });
        }

        return true;
    } catch (error) {
        console.error('Use stock quota error:', error);
        return false;
    }
}
