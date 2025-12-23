import { NextRequest, NextResponse } from 'next/server';
import { updateUserMembership } from '@/lib/turso';
import { DOKU_PLANS } from '@/lib/doku';

// DOKU webhook notification handler
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        console.log('DOKU Webhook received:', JSON.stringify(body, null, 2));

        const {
            originalPartnerReferenceNo: orderId,
            latestTransactionStatus,
            amount,
            additionalInfo,
        } = body;

        // Extract user info from additionalInfo
        const userId = additionalInfo?.userId;
        const productCode = additionalInfo?.productCode;

        // Check if payment is successful
        const isSuccess = latestTransactionStatus === '00' ||
            latestTransactionStatus === 'SUCCESS' ||
            latestTransactionStatus === 'PAID';

        if (isSuccess && userId && productCode) {
            // Verify amount matches plan
            const plan = DOKU_PLANS[productCode as keyof typeof DOKU_PLANS];

            if (plan) {
                const paidAmount = parseFloat(amount?.value || '0');

                if (paidAmount >= plan.price) {
                    // Update user membership
                    const updated = await updateUserMembership(userId, productCode);

                    if (updated) {
                        console.log(`✅ User ${userId} upgraded to ${productCode} via DOKU`);
                    } else {
                        console.error(`❌ Failed to update membership for user ${userId}`);
                    }
                } else {
                    console.error(`❌ Amount mismatch: paid ${paidAmount}, expected ${plan.price}`);
                }
            }
        } else {
            console.log(`Payment status: ${latestTransactionStatus} for order ${orderId}`);
        }

        // Always return success to DOKU
        return NextResponse.json({
            responseCode: '2004700',
            responseMessage: 'Success',
        });

    } catch (error) {
        console.error('DOKU webhook error:', error);
        // Return success anyway to prevent DOKU retry
        return NextResponse.json({
            responseCode: '2004700',
            responseMessage: 'Success',
        });
    }
}

// GET for testing
export async function GET() {
    return NextResponse.json({ status: 'DOKU Webhook endpoint ready' });
}
