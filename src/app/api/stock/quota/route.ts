import { NextResponse } from 'next/server';
import { resolveUserOrDevice } from '@/lib/auth-device';
import { getStockQuotaStatus } from '@/lib/quota';

export async function GET(request: Request) {
    try {
        const resolved = await resolveUserOrDevice(request);

        const quotaStatus = await getStockQuotaStatus(resolved.userId);
        const isUnlimited = resolved.membership === 'VVIP' || quotaStatus.membership === 'VVIP';

        return NextResponse.json({
            status: 'success',
            data: {
                membership: isUnlimited ? 'VVIP' : (resolved.membership || quotaStatus.membership),
                dailyLimit: isUnlimited || quotaStatus.dailyLimit === Infinity ? 'Unlimited' : quotaStatus.dailyLimit,
                used: quotaStatus.used,
                remaining: isUnlimited || quotaStatus.remaining === Infinity ? 'Unlimited' : quotaStatus.remaining,
                canAnalyze: isUnlimited || quotaStatus.canAnalyze,
            },
        });

    } catch (error) {
        console.error('Get stock quota error:', error);
        return NextResponse.json(
            { status: 'error', message: 'Failed to get quota' },
            { status: 500 }
        );
    }
}
