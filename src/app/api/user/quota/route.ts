import { NextResponse } from 'next/server';
import { getQuotaStatus } from '@/lib/quota';
import { resolveUserOrDevice } from '@/lib/auth-device';

export async function GET(request: Request) {
    try {
        const user = await resolveUserOrDevice(request);
        const userId = user.userId;

        // Check if Turso is configured
        if (!process.env.TURSO_DATABASE_URL) {
            const isFullAccess = user.isAdmin || user.isFullAccess;
            const membership = user.isAdmin
                ? 'ADMIN'
                : user.isFullAccess
                    ? user.hasArraCronosAccess ? 'ALL_ACCESS' : 'WEBSITE_LIFETIME'
                    : user.membership;
            const dailyLimit = isFullAccess ? -1 : user.membership === 'PRO' ? 25 : 1;
            return NextResponse.json({
                status: 'success',
                quota: {
                    membership,
                    dailyLimit,
                    used: 0,
                    remaining: isFullAccess ? -1 : dailyLimit,
                    canAnalyze: true,
                    allowedTimeframes: isFullAccess || user.membership === 'PRO'
                        ? ['1m', '5m', '15m', '30m', '1h', '4h', '1d']
                        : ['5m', '15m'],
                },
            });
        }

        const quotaStatus = await getQuotaStatus(userId);

        let effectiveMembership = quotaStatus.membership;
        let effectiveLimit = quotaStatus.dailyLimit;
        let effectiveRemaining = quotaStatus.remaining;
        let effectiveTimeframes = quotaStatus.allowedTimeframes;

        if (user.isAdmin) {
            effectiveMembership = 'ADMIN' as any;
            effectiveLimit = -1;
            effectiveRemaining = -1;
            effectiveTimeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];
        } else if (user.isFullAccess) {
            effectiveMembership = user.hasArraCronosAccess ? 'ALL_ACCESS' as any : 'WEBSITE_LIFETIME' as any;
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
