
export interface MarketStatus {
    isOpen: boolean;
    reason?: string;
    nextOpen?: Date;
}

/** Format an exchange opening time in the application's display timezone. */
export function formatMarketOpenWib(date: Date): string {
    return `${new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
        timeZone: 'Asia/Jakarta',
    }).format(date)} WIB`;
}

/**
 * Checks if the market is currently open for the given symbol.
 * 
 * - CRYPTO (BTCUSD): Always Open (24/7)
 * - Non-crypto markets: Closed over the weekend using a broad Friday/Sunday session estimate
 *   - Closes: Friday 22:00 UTC (approx)
 *   - Opens: Sunday 22:00 UTC (approx)
 *   - For simplicity, we'll treat Saturday and Sunday (UTC) as closed.
 */
export function isMarketOpen(symbol: string): MarketStatus {
    // 1. Crypto is always open
    if (symbol === 'BTCUSD') {
        return { isOpen: true };
    }

    // XAUUSD is mapped to the COMEX GC continuous futures contract. Use the
    // Chicago session and let Intl handle daylight-saving transitions.
    if (symbol === 'XAUUSD') {
        const timeZone = 'America/Chicago';
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone,
            weekday: 'short',
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
        }).formatToParts(new Date());
        const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
        const weekday = values.weekday;
        const hour = Number(values.hour);

        let closedReason = '';
        let daysToOpen = 0;
        if (weekday === 'Sat') {
            closedReason = 'COMEX gold futures closed (Chicago session)';
            daysToOpen = 1;
        } else if (weekday === 'Sun' && hour < 17) {
            closedReason = 'COMEX gold futures closed until Sunday 17:00 Chicago time';
        } else if (weekday === 'Fri' && hour >= 16) {
            closedReason = 'COMEX gold futures closed for the weekend';
            daysToOpen = 2;
        } else if (hour === 16) {
            closedReason = 'COMEX gold futures daily maintenance break';
        }
        if (closedReason) {
            const targetDate = new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day) + daysToOpen));
            const nextOpen = chicagoWallTimeToUtc(
                targetDate.getUTCFullYear(),
                targetDate.getUTCMonth() + 1,
                targetDate.getUTCDate(),
                17,
                timeZone
            );
            return { isOpen: false, reason: closedReason, nextOpen };
        }
        return { isOpen: true };
    }

    // Apply the weekend gate to every non-crypto market. Session holidays and
    // exchange-specific hours still depend on the instrument and broker.
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

    // Closed on Sunday (0) before 22:00 UTC (approximate open time)
    if (day === 0 && hour < 22) {
        return {
            isOpen: false,
            reason: 'Market Closed (Weekend)',
            nextOpen: getNextMarketOpen(now)
        };
    }

    // Closed on Friday after 22:00 UTC (approximate close time)
    if (day === 5 && hour >= 22) {
        return {
            isOpen: false,
            reason: 'Market Closed (Weekend)',
            nextOpen: getNextMarketOpen(now)
        }
    }

    return { isOpen: true };
}

function chicagoWallTimeToUtc(year: number, month: number, day: number, hour: number, timeZone: string): Date {
    let timestamp = Date.UTC(year, month - 1, day, hour);
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    });

    for (let attempt = 0; attempt < 3; attempt += 1) {
        const parts = Object.fromEntries(formatter.formatToParts(new Date(timestamp)).map((part) => [part.type, part.value]));
        const observedAsUtc = Date.UTC(
            Number(parts.year),
            Number(parts.month) - 1,
            Number(parts.day),
            Number(parts.hour),
            Number(parts.minute)
        );
        timestamp += Date.UTC(year, month - 1, day, hour) - observedAsUtc;
    }
    return new Date(timestamp);
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
