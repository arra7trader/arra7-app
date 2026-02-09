
import { DOMSymbolId } from '@/types/dom';

export interface MarketStatus {
    isOpen: boolean;
    reason?: string;
    nextOpen?: Date;
}

/**
 * Checks if the market is currently open for the given symbol.
 * 
 * - CRYPTO (BTCUSD): Always Open (24/7)
 * - FOREX/METALS (XAUUSD): Closed on Weekends (Sat/Sun)
 *   - Closes: Friday 22:00 UTC (approx)
 *   - Opens: Sunday 22:00 UTC (approx)
 *   - For simplicity, we'll treat Saturday and Sunday (UTC) as closed.
 */
export function isMarketOpen(symbol: DOMSymbolId): MarketStatus {
    // 1. Crypto is always open
    if (symbol === 'BTCUSD') {
        return { isOpen: true };
    }

    // 2. Forex/Metals (XAUUSD)
    if (symbol === 'XAUUSD') {
        const now = new Date();
        const day = now.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        const hour = now.getUTCHours();

        // Closed on Saturday (6)
        if (day === 6) {
            return {
                isOpen: false,
                reason: 'Market Closed (Weekend)',
                nextOpen: getNextMarketOpen(now)
            };
        }

        // Closed on Sunday (0) before 22:00 UTC (Early open)
        // Usually opens around 22:00 UTC or 23:00 UTC depending on broker/DST.
        // Let's assume strict weekend closure for now: Closed all Sunday until late.
        if (day === 0) {
            // Let's say it opens at 22:00 UTC
            if (hour < 22) {
                return {
                    isOpen: false,
                    reason: 'Market Closed (Weekend)',
                    nextOpen: getNextMarketOpen(now)
                };
            }
        }

        // Also check late Friday close? 
        // Usually closes Friday 21:00-22:00 UTC. 
        // For simplicity: If Friday and hour >= 22, it's closed.
        if (day === 5 && hour >= 22) {
            return {
                isOpen: false,
                reason: 'Market Closed (Weekend)',
                nextOpen: getNextMarketOpen(now)
            };
        }

        return { isOpen: true };
    }

    // Default open
    return { isOpen: true };
}

function getNextMarketOpen(now: Date): Date {
    const nextOpen = new Date(now);
    const day = now.getUTCDay();

    // If Friday (5), add 2 days to get to Sunday
    if (day === 5) {
        nextOpen.setUTCDate(now.getUTCDate() + 2);
    }
    // If Saturday (6), add 1 day to get to Sunday
    else if (day === 6) {
        nextOpen.setUTCDate(now.getUTCDate() + 1);
    }
    // If Sunday (0), it opens today late

    // Set time to Sunday 22:00 UTC
    // Adjust logic if not fully accurate, but good enough generic Sunday 22:00 Open
    if (day !== 0) {
        // Target Sunday
        // Calculate days until Sunday (0 is 7 for math)
        const daysUntilSunday = (7 - day) % 7;
        if (daysUntilSunday === 0 && day !== 0) {
            // Should not happen with above logic but safe guard
        }
        // Actually simpler:
        // Just find next Sunday.
    }

    // Hardcoded approach for "Next Sunday 22:00 UTC" relative to now
    // Find difference to Sunday
    const dayIndex = now.getUTCDay(); // 0..6
    let daysToAdd = 0;
    if (dayIndex === 5) daysToAdd = 2; // Fri -> Sun
    else if (dayIndex === 6) daysToAdd = 1; // Sat -> Sun
    else if (dayIndex === 0) daysToAdd = 0; // Today is Sunday

    nextOpen.setUTCDate(now.getUTCDate() + daysToAdd);
    nextOpen.setUTCHours(22, 0, 0, 0);

    // If we represent "Next Open" and today is Sunday < 22, it is indeed today 22:00.
    // If today is Sunday > 22, it's already open (handled by specific check).

    return nextOpen;
}
