import { isAdminEmail, isAdminUser, ADMIN_EMAILS } from '@/lib/admin-access';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { givePromoToAllUsers } from '@/lib/turso';

export const dynamic = 'force-dynamic';

// Using imported ADMIN_EMAILS from admin-access

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Give 3 days of promo access
        console.log('Starting promo launch distribution...');
        const result = await givePromoToAllUsers(3, 'LAUNCH_PROMO');
        console.log('Promo result:', result);
        return NextResponse.json({
            success: true,
            message: 'Promo distributed successfully',
            details: result
        });
    } catch (error) {
        console.error('Promo distribution error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
