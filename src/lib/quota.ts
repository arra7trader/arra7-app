import getTursoClient, { getUserMembership, isTursoConfigured, checkUserPromo, getLastAnalysisTime } from './turso';

// Quota limits per membership level (Forex Analysis)
export const QUOTA_LIMITS = {
    BASIC: 1, // 1x Trial Lifetime
    PRO: 25,
    VVIP: Infinity, // Unlimited
} as const;

// PROMO quota (for APK download promotion)
export const PROMO_QUOTA_LIMIT = 10; // 10 analyses per day during promo

// Stock Analysis Quota limits (same as Forex)
export const STOCK_QUOTA_LIMITS = {
    BASIC: 1, // 1x Trial Lifetime
    PRO: 25,
    VVIP: Infinity, // Unlimited
} as const;

// Allowed timeframes per membership
export const ALLOWED_TIMEFRAMES = {
    BASIC: ['5m', '15m'], // M5 and M15 only
    PRO: ['1m', '5m', '15m', '30m', '1h', '4h', '1d'],
    VVIP: ['1m', '5m', '15m', '30m', '1h', '4h', '1d'],
} as const;

// Allowed pair categories per membership
export const ALLOWED_PAIR_CATEGORIES = {
    BASIC: ['major', 'gold'], // Forex Major and Gold only
    PRO: ['major', 'minor', 'commodities', 'crypto', 'indices'], // All pairs
    VVIP: ['major', 'minor', 'commodities', 'crypto', 'indices'], // All pairs
} as const;

// Specific pairs allowed for BASIC (Forex + Gold)
export const BASIC_ALLOWED_PAIRS = [
    // Forex Major
    'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
    // Gold
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
    isTrialExpired?: boolean;
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
        isTrialExpired: false,
    };
}

// Get user's quota status
export async function getQuotaStatus(userId: string): Promise<QuotaStatus> {
    const turso = getTursoClient();
    if (!turso) return getDefaultQuota();

    try {
        const { membership, createdAt } = await getUserMembership(userId); // Assuming getUserMembership returns createdAt now
        let dailyLimit = QUOTA_LIMITS[membership as Membership] || QUOTA_LIMITS.BASIC;
        let allowedTimeframes = ALLOWED_TIMEFRAMES[membership as Membership] || ALLOWED_TIMEFRAMES.BASIC;
        let isTrialExpired = false;

        // Check Trial Expiry for BASIC (2 Days)
        if (membership === 'BASIC' && createdAt) {
            const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;
            const now = new Date().getTime();
            const createdTime = new Date(createdAt).getTime(); // Ensure Date object

            if (now - createdTime > twoDaysInMs) {
                isTrialExpired = true;
                dailyLimit = 0; // Force limit to 0
            }
        }

        // Check if user has active promo
        const promoStatus = await checkUserPromo(userId);
        if (promoStatus.hasPromo) {
            // Override with promo limits (10/day, all timeframes, all pairs)
            dailyLimit = Math.max(dailyLimit, PROMO_QUOTA_LIMIT);
            allowedTimeframes = ALLOWED_TIMEFRAMES.VVIP; // All timeframes during promo
            isTrialExpired = false; // Promo overrides trial expiry
            console.log(`[PROMO] User ${userId} has active promo until ${promoStatus.expiresAt}`);
        }

        const today = getTodayDate();

        // Get usage for today (Unified Logic for all plans)
        let used = 0;
        if (membership === 'BASIC' && !promoStatus.hasPromo) {
            // Lifetime limit for BASIC
            const result = await turso.execute({
                sql: 'SELECT SUM(count) as total FROM quota_usage WHERE user_id = ?',
                args: [userId],
            });
            used = result.rows[0]?.total ? (result.rows[0].total as number) : 0;
        } else {
            // Daily limit for others or if promo active
            const result = await turso.execute({
                sql: 'SELECT count FROM quota_usage WHERE user_id = ? AND date = ?',
                args: [userId, today],
            });
            used = result.rows.length > 0 ? (result.rows[0].count as number) : 0;
        }

        const remaining = dailyLimit === Infinity ? Infinity : Math.max(0, dailyLimit - used);

        return {
            membership: membership as Membership,
            dailyLimit,
            used,
            remaining,
            canAnalyze: remaining > 0 && !isTrialExpired,
            allowedTimeframes,
            isTrialExpired,
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

    // Check Trial Expiry First
    if (status.isTrialExpired) {
        return {
            allowed: false,
            message: 'Masa trial Basic habis (2 hari). Upgrade ke Pro atau VVIP untuk akses unlimited.',
            quotaStatus: status,
        };
    }

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

    // Check Rate Limit (5 Minutes Cooldown) for PRO and VVIP
    if (status.membership === 'PRO' || status.membership === 'VVIP') {
        const lastAnalysis = await getLastAnalysisTime(userId, 'forex');
        if (lastAnalysis) {
            const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
            const now = new Date().getTime();
            const lastTime = lastAnalysis.getTime();
            const timeDiff = now - lastTime;

            if (timeDiff < COOLDOWN_MS) {
                const waitTime = Math.ceil((COOLDOWN_MS - timeDiff) / 1000); // seconds
                const minutes = Math.floor(waitTime / 60);
                const seconds = waitTime % 60;
                return {
                    allowed: false,
                    message: `Mohon tunggu ${minutes} menit ${seconds} detik sebelum melakukan analisa berikutnya.`,
                    quotaStatus: status,
                };
            }
        }
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
            message: `Quota Trial Basic Anda sudah habis (1x Lifetime). Upgrade ke Pro atau VVIP untuk akses unlimited.`,
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
    isTrialExpired?: boolean;
}

// Default unlimited stock quota
function getDefaultStockQuota(): StockQuotaStatus {
    return {
        membership: 'VVIP',
        dailyLimit: Infinity,
        used: 0,
        remaining: Infinity,
        canAnalyze: true,
        isTrialExpired: false,
    };
}

// Get user's stock quota status
export async function getStockQuotaStatus(userId: string): Promise<StockQuotaStatus> {
    const turso = getTursoClient();
    if (!turso) return getDefaultStockQuota();

    try {
        const { membership, createdAt } = await getUserMembership(userId);
        let dailyLimit = STOCK_QUOTA_LIMITS[membership as Membership] || STOCK_QUOTA_LIMITS.BASIC;
        let isTrialExpired = false;

        // Check Trial Expiry for BASIC (2 Days)
        if (membership === 'BASIC' && createdAt) {
            const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;
            const now = new Date().getTime();
            const createdTime = new Date(createdAt).getTime();

            if (now - createdTime > twoDaysInMs) {
                isTrialExpired = true;
                dailyLimit = 0; // Force limit to 0
            }
        }

        // Check if user has active promo
        const promoStatus = await checkUserPromo(userId);
        if (promoStatus.hasPromo) {
            // Override with promo limits (10/day for stock too)
            dailyLimit = Math.max(dailyLimit, PROMO_QUOTA_LIMIT);
            isTrialExpired = false;
            console.log(`[PROMO] User ${userId} has active stock promo until ${promoStatus.expiresAt}`);
        }

        const today = getTodayDate();

        // Get today's stock analysis usage
        let used = 0;
        if (membership === 'BASIC' && !promoStatus.hasPromo) {
            // Lifetime limit for BASIC
            const result = await turso.execute({
                sql: 'SELECT SUM(count) as total FROM stock_quota_usage WHERE user_id = ?',
                args: [userId],
            });
            used = result.rows[0]?.total ? (result.rows[0].total as number) : 0;
        } else {
            // Daily limit for others
            const result = await turso.execute({
                sql: 'SELECT count FROM stock_quota_usage WHERE user_id = ? AND date = ?',
                args: [userId, today],
            });
            used = result.rows.length > 0 ? (result.rows[0].count as number) : 0;
        }
        const remaining = dailyLimit === Infinity ? Infinity : Math.max(0, dailyLimit - used);

        return {
            membership: membership as Membership,
            dailyLimit,
            used,
            remaining,
            canAnalyze: remaining > 0 && !isTrialExpired,
            isTrialExpired,
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

    if (status.isTrialExpired) {
        return {
            allowed: false,
            message: 'Masa trial Basic habis (2 hari). Upgrade ke Pro atau VVIP untuk akses unlimited.',
            quotaStatus: status,
        };
    }

    // Check Rate Limit (5 Minutes Cooldown)
    const lastAnalysis = await getLastAnalysisTime(userId, 'stock');
    if (lastAnalysis) {
        const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
        const now = new Date().getTime();
        const lastTime = lastAnalysis.getTime();
        const timeDiff = now - lastTime;

        if (timeDiff < COOLDOWN_MS) {
            const waitTime = Math.ceil((COOLDOWN_MS - timeDiff) / 1000); // seconds
            const minutes = Math.floor(waitTime / 60);
            const seconds = waitTime % 60;
            return {
                allowed: false,
                message: `Mohon tunggu ${minutes} menit ${seconds} detik sebelum melakukan analisa berikutnya.`,
                quotaStatus: status,
            };
        }
    }

    if (!status.canAnalyze) {
        return {
            allowed: false,
            message: `Quota Trial Saham Basic Anda sudah habis (1x Lifetime). Upgrade ke Pro atau VVIP untuk akses unlimited.`,
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
