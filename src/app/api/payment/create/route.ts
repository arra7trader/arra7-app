import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createTransaction, PRICING_PLANS, PlanId, getClientKey, isMidtransConfigured } from '@/lib/midtrans';

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

        // Check if Midtrans is configured
        if (!isMidtransConfigured()) {
            return NextResponse.json(
                { status: 'error', message: 'Payment gateway belum dikonfigurasi' },
                { status: 503 }
            );
        }

        // Parse request body
        const body = await request.json();
        const { planId } = body as { planId: string };

        // Validate plan
        if (!planId || !(planId in PRICING_PLANS)) {
            return NextResponse.json(
                { status: 'error', message: 'Plan tidak valid' },
                { status: 400 }
            );
        }

        // Create transaction
        const result = await createTransaction({
            planId: planId as PlanId,
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
            token: result.token,
            redirectUrl: result.redirectUrl,
            orderId: result.orderId,
            clientKey: getClientKey(),
        });

    } catch (error) {
        console.error('Payment create error:', error);
        return NextResponse.json(
            { status: 'error', message: 'Internal server error' },
            { status: 500 }
        );
    }
}
