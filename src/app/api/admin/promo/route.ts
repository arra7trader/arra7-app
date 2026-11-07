import { isAdminEmail, isAdminUser, ADMIN_EMAILS } from '@/lib/admin-access';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { givePromoToAllUsers } from '@/lib/turso';

// Using imported ADMIN_EMAILS from admin-access

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email || !isAdminEmail(session.user.email)) {
            return NextResponse.json(
                { status: 'error', message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const durationDays = body.durationDays || 3;
        const promoType = body.promoType || 'APK_V2_LAUNCH';

        const result = await givePromoToAllUsers(durationDays, promoType);

        if (result.success) {
            return NextResponse.json({
                status: 'success',
                message: `Promo ${durationDays} hari berhasil diberikan ke ${result.count} users`,
                data: {
                    usersUpdated: result.count,
                    durationDays,
                    promoType,
                },
            });
        } else {
            return NextResponse.json(
                { status: 'error', message: 'Failed to give promo' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('Promo API Error:', error);
        return NextResponse.json(
            { status: 'error', message: 'Internal server error' },
            { status: 500 }
        );
    }
}
