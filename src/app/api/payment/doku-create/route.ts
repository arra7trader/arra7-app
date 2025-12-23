import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createDokuQRIS, DOKU_PLANS, DokuPlanId, isDokuConfigured } from '@/lib/doku';

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);

        if (!session?.user?.id || !session.user.email) {
            return NextResponse.json(
                { status: 'error', message: 'Silakan login terlebih dahulu' },
                { status: 401 }
            );
        }

        // Check if DOKU is configured
        if (!isDokuConfigured()) {
            return NextResponse.json(
                { status: 'error', message: 'Payment gateway belum dikonfigurasi' },
                { status: 503 }
            );
        }

        // Parse request body
        const body = await request.json();
        const { planId } = body as { planId: string };

        // Validate plan
        if (!planId || !(planId in DOKU_PLANS)) {
            return NextResponse.json(
                { status: 'error', message: 'Plan tidak valid' },
                { status: 400 }
            );
        }

        // Create QRIS
        const result = await createDokuQRIS({
            planId: planId as DokuPlanId,
            userId: session.user.id,
            userEmail: session.user.email,
            userName: session.user.name || 'User',
        });

        if (!result.success) {
            return NextResponse.json(
                { status: 'error', message: result.error },
                { status: 500 }
            );
        }

        return NextResponse.json({
            status: 'success',
            qrCode: result.qrCode,
            qrUrl: result.qrUrl,
            orderId: result.orderId,
            expiredTime: result.expiredTime,
            plan: DOKU_PLANS[planId as DokuPlanId],
        });

    } catch (error) {
        console.error('DOKU create error:', error);
        return NextResponse.json(
            { status: 'error', message: 'Internal server error' },
            { status: 500 }
        );
    }
}
