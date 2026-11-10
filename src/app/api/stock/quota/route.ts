import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStockQuotaStatus } from '@/lib/quota';
import { isAdminUser } from '@/lib/admin-access';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { status: 'error', message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const isAdmin = isAdminUser(session.user);
        const quotaStatus = await getStockQuotaStatus(session.user.id);
        const membership = isAdmin ? 'ADMIN' : quotaStatus.membership;

        return NextResponse.json({
            status: 'success',
            data: {
                membership,
                dailyLimit: isAdmin || quotaStatus.dailyLimit === Infinity ? 'Unlimited' : quotaStatus.dailyLimit,
                used: quotaStatus.used,
                remaining: isAdmin || quotaStatus.remaining === Infinity ? 'Unlimited' : quotaStatus.remaining,
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
