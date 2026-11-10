import getTursoClient, { getUserMembership, isTursoConfigured, checkUserPromo, getLastAnalysisTime } from './turso';
import { isAdminEmail } from './admin-access';

// Quota limits per membership level (Forex Analysis)
export const QUOTA_LIMITS = {
    BASIC: 1, // 1x Trial Lifetime
    PRO: 25,
    VVIP: Infinity, // Unlimited
    LIFETIME: Infinity,
    ALL_ACCESS: Infinity,
    FULL_ACCESS: Infinity,
    PROMO_125K: Infinity,
    ADMIN: Infinity,
} as const;

// PROMO quota (for APK download promotion)
export const PROMO_QUOTA_LIMIT = 10; // 10 analyses per day during promo

// Cooldown duration for each membership tier (in milliseconds)
export const COOLDOWN_DURATION = {
    BASIC: 60 * 1000,            // 1 minute rate limit
    PRO: 15 * 1000,              // 15 seconds
    VVIP: 3 * 1000,              // 3 seconds - instant for VVIP / Full Access
    LIFETIME: 3 * 1000,
    ALL_ACCESS: 3 * 1000,
    FULL_ACCESS: 3 * 1000,
    PROMO_125K: 3 * 1000,
    ADMIN: 0,                    // 0 second cooldown for ADMIN
} as const;

// Stock Analysis Quota limits (same as Forex)
export const STOCK_QUOTA_LIMITS = {
    BASIC: 1, // 1x Trial Lifetime
    PRO: 25,
    VVIP: Infinity, // Unlimited
    LIFETIME: Infinity,
    ALL_ACCESS: Infinity,
    FULL_ACCESS: Infinity,
    PROMO_125K: Infinity,
    ADMIN: Infinity,
} as const;

// Allowed timeframes per membership
export const ALLOWED_TIMEFRAMES = {
    BASIC: ['5m', '15m'], // M5 and M15 only
    PRO: ['1m', '5m', '15m', '30m', '1h', '4h', '1d'],
    VVIP: ['1m', '5m', '15m', '30m', '1h', '4h', '1d'],
    LIFETIME: ['1m', '5m', '15m', '30m', '1h', '4h', '1d'],
    ALL_ACCESS: ['1m', '5m', '15m', '30m', '1h', '4h', '1d'],
    FULL_ACCESS: ['1m', '5m', '15m', '30m', '1h', '4h', '1d'],
    PROMO_125K: ['1m', '5m', '15m', '30m', '1h', '4h', '1d'],
    ADMIN: ['1m', '5m', '15m', '30m', '1h', '4h', '1d'],
} as const;

// Allowed pair categories per membership
export const ALLOWED_PAIR_CATEGORIES = {
    BASIC: ['major', 'gold'], // Forex Major and Gold only
    PRO: ['major', 'minor', 'commodities', 'crypto', 'indices'], // All pairs
    VVIP: ['major', 'minor', 'commodities', 'crypto', 'indices'], // All pairs
    LIFETIME: ['major', 'minor', 'commodities', 'crypto', 'indices'],
    ALL_ACCESS: ['major', 'minor', 'commodities', 'crypto', 'indices'],
    FULL_ACCESS: ['major', 'minor', 'commodities', 'crypto', 'indices'],
    PROMO_125K: ['major', 'minor', 'commodities', 'crypto', 'indices'],
    ADMIN: ['major', 'minor', 'commodities', 'crypto', 'indices'],
} as const;

// Specific pairs allowed for BASIC (Gold ONLY)
export const BASIC_ALLOWED_PAIRS = [
    // Gold Only
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

// Default unlimited quota (when Turso is not configured or for admin)
function getDefaultQuota(membership: Membership = 'FULL_ACCESS'): QuotaStatus {
    return {
        membership,
        dailyLimit: Infinity,
        used: 0,
        remaining: Infinity,
        canAnalyze: true,
        allowedTimeframes: ALLOWED_TIMEFRAMES.ADMIN,
        isTrialExpired: false,
    };
}

// Get user's quota status
export async function getQuotaStatus(userId: string): Promise<QuotaStatus> {
    // Fast-path bypass for admin
    if (isAdminEmail(userId)) {
        return getDefaultQuota('ADMIN');
    }

    const turso = getTursoClient();
    if (!turso) return getDefaultQuota();

    try {
        const { membership } = await getUserMembership(userId);
        const normalizedMembership = String(membership || 'BASIC').toUpperCase();
        const memKey = (normalizedMembership === 'ARRA_CRONOS'
            ? 'BASIC'
            : normalizedMembership === 'WEBSITE_LIFETIME'
                ? 'LIFETIME'
                : normalizedMembership) as Membership;

        // Admin override
        if (memKey === 'ADMIN') {
            return getDefaultQuota('ADMIN');
        }

        let dailyLimit = QUOTA_LIMITS[memKey] ?? QUOTA_LIMITS.BASIC;
        let allowedTimeframes = ALLOWED_TIMEFRAMES[memKey] ?? ALLOWED_TIMEFRAMES.BASIC;

        const isTrialExpired = false;

        // Check if user has active promo
        const promoStatus = await checkUserPromo(userId);
        if (promoStatus.hasPromo) {
            dailyLimit = Math.max(dailyLimit, PROMO_QUOTA_LIMIT);
            allowedTimeframes = ALLOWED_TIMEFRAMES.VVIP;
            console.log(`[PROMO] User ${userId} has active promo until ${promoStatus.expiresAt}`);
        }

        const today = getTodayDate();

        // Get usage for today
        let used = 0;
        const result = await turso.execute({
            sql: 'SELECT count FROM quota_usage WHERE user_id = ? AND date = ?',
            args: [userId, today],
        });
        used = result.rows.length > 0 ? (result.rows[0].count as number) : 0;

        const remaining = dailyLimit === Infinity ? Infinity : Math.max(0, dailyLimit - used);

        return {
            membership: memKey,
            dailyLimit,
            used,
            remaining,
            canAnalyze: remaining > 0,
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
    waitTimeSeconds?: number;
}> {
    // Admin fast-path bypass: always allowed, no cooldown, all timeframes, all pairs
    if (isAdminEmail(userId)) {
        return {
            allowed: true,
            quotaStatus: getDefaultQuota('ADMIN'),
        };
    }

    if (!isTursoConfigured()) {
        return {
            allowed: true,
            quotaStatus: getDefaultQuota(),
        };
    }

    const status = await getQuotaStatus(userId);

    // If user is ADMIN tier, unconditionally allow
    if (String(status.membership).toUpperCase() === 'ADMIN') {
        return {
            allowed: true,
            quotaStatus: getDefaultQuota('ADMIN'),
        };
    }

    // Check Trial Expiry First
    if (status.isTrialExpired) {
        return {
            allowed: false,
            message: 'Masa akses Basic habis. Upgrade ke Website Lifetime atau Full Access untuk akses penuh.',
            quotaStatus: status,
        };
    }

    // Check if user has promo (allows all pairs)
    const promoStatus = await checkUserPromo(userId);

    // Check pair restriction for BASIC (skip if promo is active)
    const hasFullWebsiteAccess = ['VVIP', 'LIFETIME', 'WEBSITE_LIFETIME', 'ALL_ACCESS', 'FULL_ACCESS', 'PROMO_125K', 'ADMIN'].includes(String(status.membership || '').toUpperCase());
    if (pair && status.membership === 'BASIC' && !hasFullWebsiteAccess && !promoStatus.hasPromo && !BASIC_ALLOWED_PAIRS.includes(pair.toUpperCase())) {
        return {
            allowed: false,
            message: `Pair ${pair} tidak tersedia untuk paket Basic. Basic hanya bisa analisa XAUUSD. Upgrade ke Website Lifetime atau Full Access untuk akses semua pair.`,
            quotaStatus: status,
        };
    }

    // Check Rate Limit (Cooldown applies to membership tiers, ADMIN has 0 cooldown)
    const lastAnalysis = await getLastAnalysisTime(userId, 'forex');
    if (lastAnalysis) {
        // Get cooldown duration based on membership tier
        const COOLDOWN_MS = COOLDOWN_DURATION[status.membership as Membership] ?? COOLDOWN_DURATION.BASIC;
        if (COOLDOWN_MS > 0) {
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
                    waitTimeSeconds: waitTime,
                };
            }
        }
    }

    // Check timeframe restriction
    const allowedTfs = status.allowedTimeframes.map((t) => t.toLowerCase());
    if (!hasFullWebsiteAccess && !allowedTfs.includes(timeframe.toLowerCase())) {
        return {
            allowed: false,
            message: `Timeframe ${timeframe} tidak tersedia untuk paket ${status.membership}. Upgrade ke Website Lifetime atau Full Access untuk akses semua timeframe.`,
            quotaStatus: status,
        };
    }

    // Check quota
    if (!hasFullWebsiteAccess && !status.canAnalyze) {
        const membershipLabel = String(status.membership || 'BASIC').toUpperCase();
        return {
            allowed: false,
            message: membershipLabel === 'BASIC'
                ? 'Kuota harian Basic Anda sudah habis. Upgrade ke Website Lifetime atau Full Access untuk akses penuh.'
                : `Kuota harian paket ${membershipLabel} Anda sudah habis. Coba lagi besok atau hubungi admin jika ini tidak semestinya.`,
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
    if (isAdminEmail(userId)) return true;
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
function getDefaultStockQuota(membership: Membership = 'FULL_ACCESS'): StockQuotaStatus {
    return {
        membership,
        dailyLimit: Infinity,
        used: 0,
        remaining: Infinity,
        canAnalyze: true,
        isTrialExpired: false,
    };
}

// Get user's stock quota status
export async function getStockQuotaStatus(userId: string): Promise<StockQuotaStatus> {
    if (isAdminEmail(userId)) {
        return getDefaultStockQuota('ADMIN');
    }

    const turso = getTursoClient();
    if (!turso) return getDefaultStockQuota();

    try {
        const { membership } = await getUserMembership(userId);
        const memUpper = String(membership || '').toUpperCase();
        if (memUpper === 'ADMIN') {
            return getDefaultStockQuota('ADMIN');
        }

        const normalizedMembership = memUpper === 'WEBSITE_LIFETIME' ? 'LIFETIME' : memUpper || 'BASIC';

        let dailyLimit = STOCK_QUOTA_LIMITS[normalizedMembership as Membership] || STOCK_QUOTA_LIMITS.BASIC;

        const isTrialExpired = false;

        // Check if user has active promo
        const promoStatus = await checkUserPromo(userId);
        if (promoStatus.hasPromo) {
            dailyLimit = Math.max(dailyLimit, PROMO_QUOTA_LIMIT);
            console.log(`[PROMO] User ${userId} has active stock promo until ${promoStatus.expiresAt}`);
        }

        const today = getTodayDate();

        // Get today's stock analysis usage (Unified Logic)
        let used = 0;
        const result = await turso.execute({
            sql: 'SELECT count FROM stock_quota_usage WHERE user_id = ? AND date = ?',
            args: [userId, today],
        });
        used = result.rows.length > 0 ? (result.rows[0].count as number) : 0;

        const remaining = dailyLimit === Infinity ? Infinity : Math.max(0, dailyLimit - used);

        return {
            membership: normalizedMembership as Membership,
            dailyLimit,
            used,
            remaining,
            canAnalyze: remaining > 0,
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
    waitTimeSeconds?: number;
}> {
    if (isAdminEmail(userId)) {
        return {
            allowed: true,
            quotaStatus: getDefaultStockQuota('ADMIN'),
        };
    }

    if (!isTursoConfigured()) {
        return {
            allowed: true,
            quotaStatus: getDefaultStockQuota(),
        };
    }

    const status = await getStockQuotaStatus(userId);
    if (String(status.membership).toUpperCase() === 'ADMIN') {
        return {
            allowed: true,
            quotaStatus: getDefaultStockQuota('ADMIN'),
        };
    }

    if (status.isTrialExpired) {
        return {
            allowed: false,
            message: 'Masa akses Basic habis. Upgrade ke Website Lifetime atau Full Access untuk akses penuh.',
            quotaStatus: status,
        };
    }

    // Check Rate Limit (Cooldown applies to membership tiers, ADMIN has 0)
    const { membership } = await getUserMembership(userId);
    const lastAnalysis = await getLastAnalysisTime(userId, 'stock');
    if (lastAnalysis) {
        // Get cooldown duration based on membership tier
        const COOLDOWN_MS = COOLDOWN_DURATION[membership as Membership] ?? COOLDOWN_DURATION.BASIC;
        if (COOLDOWN_MS > 0) {
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
                    waitTimeSeconds: waitTime,
                };
            }
        }
    }

    if (!status.canAnalyze) {
        const membershipLabel = String(status.membership || 'BASIC').toUpperCase();
        return {
            allowed: false,
            message: membershipLabel === 'BASIC'
                ? 'Kuota analisis saham Basic Anda sudah habis. Upgrade ke Website Lifetime atau Full Access untuk akses penuh.'
                : `Kuota analisa saham paket ${membershipLabel} Anda sudah habis. Coba lagi besok atau hubungi admin jika ini tidak semestinya.`,
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
    if (isAdminEmail(userId)) return true;
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
