import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getQuotaStatus } from '@/lib/quota';
import { resolveMobileUserFromRequest } from '@/lib/mobile-session';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        let userId = session?.user?.id || null;

        if (!userId) {
            const mobileUser = await resolveMobileUserFromRequest(request, {
                allowLegacyGoogleIdToken: true,
            });
            userId = mobileUser?.userId || null;
        }

        if (!userId) {
            return NextResponse.json(
                { status: 'error', message: 'Not authenticated' },
                { status: 401 }
            );
        }

        // Check if Turso is configured
        if (!process.env.TURSO_DATABASE_URL) {
            // Return unlimited quota if no database
            // Use -1 to represent unlimited (JSON can't serialize Infinity)
            return NextResponse.json({
                status: 'success',
                quota: {
                    membership: 'BASIC',
                    dailyLimit: -1, // -1 means unlimited
                    used: 0,
                    remaining: -1, // -1 means unlimited  
                    canAnalyze: true,
                    allowedTimeframes: ['1m', '5m', '15m', '30m', '1h', '4h', '1d'],
                },
            });
        }

        const quotaStatus = await getQuotaStatus(userId);

        // Convert Infinity to -1 for JSON serialization
        const serializedQuota = {
            ...quotaStatus,
            dailyLimit: quotaStatus.dailyLimit === Infinity ? -1 : quotaStatus.dailyLimit,
            remaining: quotaStatus.remaining === Infinity ? -1 : quotaStatus.remaining,
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
