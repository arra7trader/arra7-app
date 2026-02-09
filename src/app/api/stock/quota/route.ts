import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStockQuotaStatus } from '@/lib/quota';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { status: 'error', message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const quotaStatus = await getStockQuotaStatus(session.user.id);

        return NextResponse.json({
            status: 'success',
            data: {
                membership: quotaStatus.membership,
                dailyLimit: quotaStatus.dailyLimit === Infinity ? 'Unlimited' : quotaStatus.dailyLimit,
                used: quotaStatus.used,
                remaining: quotaStatus.remaining === Infinity ? 'Unlimited' : quotaStatus.remaining,
                canAnalyze: quotaStatus.canAnalyze,
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
