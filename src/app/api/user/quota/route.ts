import { NextResponse } from 'next/server';
import { getQuotaStatus } from '@/lib/quota';
import { resolveUserOrDevice } from '@/lib/auth-device';

export async function GET(request: Request) {
    try {
        const user = await resolveUserOrDevice(request);
        const userId = user.userId;

        // Check if Turso is configured
        if (!process.env.TURSO_DATABASE_URL) {
            // Return unlimited quota if no database
            return NextResponse.json({
                status: 'success',
                quota: {
                    membership: 'VVIP',
                    dailyLimit: -1, // -1 means unlimited
                    used: 0,
                    remaining: -1, // -1 means unlimited  
                    canAnalyze: true,
                    allowedTimeframes: ['1m', '5m', '15m', '30m', '1h', '4h', '1d'],
                },
            });
        }

        const quotaStatus = await getQuotaStatus(userId);

        let effectiveMembership = quotaStatus.membership;
        let effectiveLimit = quotaStatus.dailyLimit;
        let effectiveRemaining = quotaStatus.remaining;
        let effectiveTimeframes = quotaStatus.allowedTimeframes;

        if (user.membership === 'VVIP' || user.isFullAccess) {
            effectiveMembership = 'VVIP' as any;
            effectiveLimit = -1;
            effectiveRemaining = -1;
            effectiveTimeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];
        } else if (user.membership === 'PRO') {
            effectiveMembership = 'PRO' as any;
            if (effectiveLimit < 25) effectiveLimit = 25;
            effectiveTimeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];
        }

        // Convert Infinity to -1 for JSON serialization
        const serializedQuota = {
            ...quotaStatus,
            membership: effectiveMembership,
            dailyLimit: effectiveLimit === Infinity ? -1 : effectiveLimit,
            remaining: effectiveRemaining === Infinity ? -1 : effectiveRemaining,
            canAnalyze: true,
            allowedTimeframes: effectiveTimeframes,
        };

        return NextResponse.json({
            status: 'success',
            quota: serializedQuota,
        });

    } catch (error) {
        console.error('Quota API Error:', error);
        return NextResponse.json(
            { status: 'error', message: 'Failed to get quota status' },
            { status: 500 }
        );
    }
}
