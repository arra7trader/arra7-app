// Midtrans configuration and payment service
import midtransClient from 'midtrans-client';

// Check if Midtrans is configured
export const isMidtransConfigured = (): boolean => {
    return !!(process.env.MIDTRANS_SERVER_KEY && process.env.MIDTRANS_CLIENT_KEY);
};

// Initialize Snap client
function getSnapClient() {
    if (!isMidtransConfigured()) {
        return null;
    }

    return new midtransClient.Snap({
        isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
        serverKey: process.env.MIDTRANS_SERVER_KEY!,
        clientKey: process.env.MIDTRANS_CLIENT_KEY!,
    });
}

// Initialize Core API client (for verification)
function getCoreApiClient() {
    if (!isMidtransConfigured()) {
        return null;
    }

    return new midtransClient.CoreApi({
        isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
        serverKey: process.env.MIDTRANS_SERVER_KEY!,
        clientKey: process.env.MIDTRANS_CLIENT_KEY!,
    });
}

// Pricing plans configuration
export const PRICING_PLANS = {
    PRO: {
        id: 'PRO',
        name: 'ARRA7 Pro Membership',
        price: 149000,
        duration: 30, // days
    },
    VVIP: {
        id: 'VVIP',
        name: 'ARRA7 VVIP Membership',
        price: 399000,
        duration: 30, // days
    },
} as const;

export type PlanId = keyof typeof PRICING_PLANS;

export interface CreateTransactionParams {
    planId: PlanId;
    userId: string;
    userEmail: string;
    userName: string;
}

export interface TransactionResult {
    success: boolean;
    token?: string;
    redirectUrl?: string;
    orderId?: string;
    error?: string;
}

// Create Snap transaction
export async function createTransaction(params: CreateTransactionParams): Promise<TransactionResult> {
    const snap = getSnapClient();

    if (!snap) {
        return {
            success: false,
            error: 'Midtrans tidak dikonfigurasi',
        };
    }

    const plan = PRICING_PLANS[params.planId];
    if (!plan) {
        return {
            success: false,
            error: 'Plan tidak valid',
        };
    }

    // Generate unique order ID
    const orderId = `ARRA7-${params.planId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const transactionDetails = {
        transaction_details: {
            order_id: orderId,
            gross_amount: plan.price,
        },
        item_details: [
            {
                id: plan.id,
                price: plan.price,
                quantity: 1,
                name: plan.name,
            },
        ],
        customer_details: {
            email: params.userEmail,
            first_name: params.userName,
        },
        callbacks: {
            finish: `${process.env.NEXTAUTH_URL}/payment/success?order_id=${orderId}`,
        },
        custom_field1: params.userId,
        custom_field2: params.planId,
    };

    try {
        const transaction = await snap.createTransaction(transactionDetails);

        return {
            success: true,
            token: transaction.token,
            redirectUrl: transaction.redirect_url,
            orderId,
        };
    } catch (error) {
        console.error('Midtrans create transaction error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Transaction failed',
        };
    }
}

// Verify transaction status
export async function verifyTransaction(orderId: string) {
    const coreApi = getCoreApiClient();

    if (!coreApi) {
        return null;
    }

    try {
        const status = await coreApi.transaction.status(orderId);
        return status;
    } catch (error) {
        console.error('Midtrans verify error:', error);
        return null;
    }
}

// Verify notification signature
export function verifyNotificationSignature(
    orderId: string,
    statusCode: string,
    grossAmount: string,
    serverKey: string,
    signatureKey: string
): boolean {
    const crypto = require('crypto');
    const hash = crypto
        .createHash('sha512')
        .update(orderId + statusCode + grossAmount + serverKey)
        .digest('hex');

    return hash === signatureKey;
}

// Get client key for frontend
export function getClientKey(): string {
    return process.env.MIDTRANS_CLIENT_KEY || '';
}
