import { NextRequest, NextResponse } from 'next/server';
import { verifyNotificationSignature, PRICING_PLANS } from '@/lib/midtrans';
import { updateUserMembership, updateUserCopytradeAccess } from '@/lib/turso';

// Midtrans notification webhook
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const {
            order_id,
            status_code,
            gross_amount,
            signature_key,
            transaction_status,
            fraud_status,
            custom_field1: userId,
            custom_field2: planId,
        } = body;

        // Verify signature
        const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
        const isValid = verifyNotificationSignature(
            order_id,
            status_code,
            gross_amount,
            serverKey,
            signature_key
        );

        if (!isValid) {
            console.error('Invalid Midtrans signature');
            return NextResponse.json(
                { status: 'error', message: 'Invalid signature' },
                { status: 403 }
            );
        }

        console.log('Midtrans notification:', {
            order_id,
            transaction_status,
            fraud_status,
            userId,
            planId,
        });

        // Check transaction status
        const isSuccess =
            (transaction_status === 'capture' && fraud_status === 'accept') ||
            transaction_status === 'settlement';

        if (isSuccess && userId && planId) {
            // Copy Trade standalone subscription
            if (planId.startsWith('CT_')) {
                const days = planId.includes('3M') ? 90 : planId.includes('6M') ? 180 : planId.includes('1Y') ? 365 : 30;
                const updated = await updateUserCopytradeAccess(userId, planId, days);
                if (updated) {
                    console.log(`[CT] User ${userId} granted ${planId} access`);
                } else {
                    console.error(`[CT] Failed to grant ${planId} to user ${userId}`);
                }
            } else {
                // Update user membership (existing logic)
                const plan = PRICING_PLANS[planId as keyof typeof PRICING_PLANS];
                if (plan) {
                    const updated = await updateUserMembership(userId, planId);
                    if (updated) {
                        console.log(`User ${userId} upgraded to ${planId}`);
                    } else {
                        console.error(`Failed to update membership for user ${userId}`);
                    }
                }
            }
        } else if (transaction_status === 'pending') {
            console.log(`Payment pending for order ${order_id}`);
        } else if (
            transaction_status === 'deny' ||
            transaction_status === 'cancel' ||
            transaction_status === 'expire'
        ) {
            console.log(`Payment ${transaction_status} for order ${order_id}`);
        }

        // Always return 200 to acknowledge receipt
        return NextResponse.json({ status: 'ok' });

    } catch (error) {
        console.error('Webhook error:', error);
        // Still return 200 to prevent Midtrans retry
        return NextResponse.json({ status: 'ok' });
    }
}

// GET for health check
export async function GET() {
    return NextResponse.json({ status: 'Webhook endpoint ready' });
}
