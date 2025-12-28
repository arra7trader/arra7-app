import crypto from 'crypto';

// DOKU API Configuration
const DOKU_BASE_URL = process.env.DOKU_IS_PRODUCTION === 'true'
    ? 'https://api.doku.com'
    : 'https://api-sandbox.doku.com';

// RSA Private Key for signing
const PRIVATE_KEY = `-----BEGIN RSA PRIVATE KEY-----
MIIEogIBAAKCAQEA48q1v95XIIVt8F1ZkbI3VXJk2nRUriwmB8lnfpabJm54Tlyy
vP1BfC49aS7C69iJgBhfZIlJx2NaXOVi9iFw01Ua6ha6wbOZ5lfgD9DKIWWGMtxv
YCdErOtd5FQJs+0hnVQIBdUrzt+eJ8G0vJ1VHAYgYQB8FMzb4Yt4diPeVRb52ygV
NfHxDeiBfuAAhkc8qo+sCBbLPWj5ou7PkqXik8VG9I6WU9sn2tbqLixA+0H1gOcJ
Jf36t1WWSHVSb2p9dzRIs/ChE9xY+Rfbhx47P5aAwsoV6COULv1t1Qf9mlwH7P7z
oMSsFhW63r+SDv1EDEIozJRU/Am8WQSJor+FJwIDAQABAoIBAG693PAjcq4f0Bvb
9jCLuLT0wS0nAwgN9IsykfsL0u+zIw/NpyOT5+MsQ7TABAlOo0JAFxg0Wkbx+TtS
VXMdPNGw/T2ywSZsXzSJoiduNOZZig1t90OCs7NxVZssc+8iKIZpFOFpCjwvoJ7p
YCmWP4s5O0KNTsV59qfG+1BMDcnFT/HOiGECnwESjw9pZyudemuQEacHHFD+vnwA
OiSZkQBgtulHuFPrj+v15AXrg6E0BN0uWYmKplNvs8Mxo0wo9/UG3ErpmvHHVi/N
s9O9KVKXqyJ7QEtpwGEoBpK+W0ENzQg0/jmEgJTW8fOyy/kY2Yl2CeSsy0UESTD+
67pNXpECgYEA86MJOM0Jx4LvTquOSracUfmd6hUro4wL2ldsxe2mERw6aFlc3bIP
/2KEcx8VO8yLs9tmSN2yZpgKjJBzzJnNr4EBOflFjf6YyFrmw8o9xudJB8xI/eND
ZwQ6WPTkGtYi+BTmrNUdloRBX9HGXFWZvMyx3iI7HX/1Z3j5J4Li5tkCgYEA71nW
1aoFj9Zw1EFBy+IHvFRYon/gcyXSNgULUBRyGhIexALAQWetkylIyHx06WRbE2l9
ELqMzpduRPgOlWZPmKJVJaWDYA/3d3Wj+H6bO7mW24KAVRIoMeZ8eRa0rLyMk3Kd
I2GwyiSt3sL7agAGaCBqbajjf3Jgd/YZcEWqS/8CgYA7g6L4DhYKd3CPrhaXJ55t
4+TwTnWXgNlQX7TBcLj1Swj1fobR3PJNdzpViM0+C0xBBiIpQIaYyyEgjxTKcPOu
oHu1NrAH7J5TqujeAOQwV0Ues4dNBZvsaTr7ie7Co3ZtVWW36GNO5kW1619iJMLm
PLZiRchc/2np+cIbJbzZmQKBgCDXEsL+MQUrRw/YZE61FJqieAbTxNgHuG/xATxb
kcxB8Da0qexPbWFjqLjZWrErM9PWBXLmJauy205bOqUFBKbMnyIrM3tatXmOipDt
zh7DuA8mOLVzaFBwb2Ot2dxZgnA4qZbRMJCLt894sUY5+qcOy4uAQLab2uCaw6LD
7DnBAoGANiIKsIIuFk94Y6OigqivUK9EFXd+BiuYoDJ86AkgMxgsTsZt/a2CuLL8
lf15Wc5V6AsKeoYvaK+1RYa4aelER96rAtDaxdK9HpjRfdDWvEvBMzTe0+aooBuG
/zbseA9AF/qMOV6F3hG0vjnZkyvZSSnAfLkFjcQKTRv4svJHN/o=
-----END RSA PRIVATE KEY-----`;

export const isDokuConfigured = (): boolean => {
    return !!(process.env.DOKU_CLIENT_ID && process.env.DOKU_SECRET_KEY);
};

// New Year Promo ends: January 1, 2026 at 23:59:59 WIB (UTC+7)
const NEW_YEAR_PROMO_END = new Date('2026-01-01T23:59:59+07:00');
const isNewYearPromoActive = () => new Date() < NEW_YEAR_PROMO_END;

// Pricing plans - with New Year promo support
export const DOKU_PLANS = {
    PRO: {
        id: 'PRO',
        name: isNewYearPromoActive() ? 'ARRA7 Pro Membership (Promo Tahun Baru)' : 'ARRA7 Pro Membership',
        price: isNewYearPromoActive() ? 99000 : 149000,
        duration: 30,
    },
    VVIP: {
        id: 'VVIP',
        name: 'ARRA7 VVIP Membership',
        price: 399000,
        duration: 30,
    },
} as const;

export type DokuPlanId = keyof typeof DOKU_PLANS;

// Cache for B2B token
let cachedToken: { token: string; expiresAt: number } | null = null;

// Generate timestamp in ISO 8601 format (UTC)
function generateTimestamp(): string {
    return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

// Generate external ID (unique per request)
function generateExternalId(): string {
    return `${Date.now()}${Math.random().toString(36).substring(2, 8)}`;
}

// Generate asymmetric signature using SHA256withRSA for token request
function generateAsymmetricSignature(clientId: string, timestamp: string): string {
    const stringToSign = `${clientId}|${timestamp}`;

    const sign = crypto.createSign('SHA256');
    sign.update(stringToSign);
    sign.end();

    const signature = sign.sign(PRIVATE_KEY, 'base64');
    return signature;
}

// Generate symmetric signature for API requests
function generateSymmetricSignature(
    httpMethod: string,
    endpointUrl: string,
    accessToken: string,
    timestamp: string,
    requestBody: string,
    secretKey: string
): string {
    // Create SHA256 hash of request body (lowercase hex)
    const bodyHash = crypto.createHash('sha256')
        .update(requestBody)
        .digest('hex')
        .toLowerCase();

    const stringToSign = `${httpMethod}:${endpointUrl}:${accessToken}:${bodyHash}:${timestamp}`;

    const signature = crypto.createHmac('sha512', secretKey)
        .update(stringToSign)
        .digest('base64');

    return signature;
}

// Get B2B Access Token
async function getB2BToken(): Promise<string | null> {
    // Check cache
    if (cachedToken && cachedToken.expiresAt > Date.now()) {
        console.log('Using cached DOKU token');
        return cachedToken.token;
    }

    const clientId = process.env.DOKU_CLIENT_ID!;
    const timestamp = generateTimestamp();

    // Generate asymmetric signature using RSA Private Key
    const signature = generateAsymmetricSignature(clientId, timestamp);

    console.log('Requesting DOKU B2B token...');
    console.log('Client ID:', clientId);
    console.log('Timestamp:', timestamp);

    try {
        const response = await fetch(`${DOKU_BASE_URL}/authorization/v1/access-token/b2b`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CLIENT-KEY': clientId,
                'X-TIMESTAMP': timestamp,
                'X-SIGNATURE': signature,
            },
            body: JSON.stringify({
                grantType: 'client_credentials',
            }),
        });

        const data = await response.json();
        console.log('DOKU Token Response:', JSON.stringify(data, null, 2));

        if (response.ok && data.accessToken) {
            // Cache token (expires in 900 seconds, cache for 800)
            cachedToken = {
                token: data.accessToken,
                expiresAt: Date.now() + 800000,
            };
            return data.accessToken;
        } else {
            console.error('DOKU Token Error:', data);
            return null;
        }
    } catch (error) {
        console.error('DOKU Token Request Error:', error);
        return null;
    }
}

interface CreateQRISParams {
    planId: DokuPlanId;
    userId: string;
    userEmail: string;
    userName: string;
}

interface QRISResponse {
    success: boolean;
    qrCode?: string;
    qrUrl?: string;
    orderId?: string;
    expiredTime?: string;
    error?: string;
}

// Create QRIS transaction
export async function createDokuQRIS(params: CreateQRISParams): Promise<QRISResponse> {
    if (!isDokuConfigured()) {
        return { success: false, error: 'DOKU tidak dikonfigurasi' };
    }

    const plan = DOKU_PLANS[params.planId];
    if (!plan) {
        return { success: false, error: 'Plan tidak valid' };
    }

    // Get B2B token first
    const accessToken = await getB2BToken();
    if (!accessToken) {
        return { success: false, error: 'Gagal mendapatkan access token' };
    }

    const clientId = process.env.DOKU_CLIENT_ID!;
    const secretKey = process.env.DOKU_SECRET_KEY!;
    const orderId = `ARRA7-${params.planId}-${Date.now()}`;
    const timestamp = generateTimestamp();
    const endpointUrl = '/snap-adapter/b2b/v1.0/qr/qr-mpm-generate';

    // Request body
    const requestBody = {
        partnerReferenceNo: orderId,
        amount: {
            value: `${plan.price}.00`,
            currency: 'IDR',
        },
        merchantId: clientId,
        terminalId: 'ARRA7WEB',
        additionalInfo: {
            productCode: plan.id,
            userId: params.userId,
            userEmail: params.userEmail,
        },
    };

    const bodyString = JSON.stringify(requestBody);

    // Generate symmetric signature
    const signature = generateSymmetricSignature(
        'POST',
        endpointUrl,
        accessToken,
        timestamp,
        bodyString,
        secretKey
    );

    console.log('Creating DOKU QRIS...');
    console.log('Order ID:', orderId);

    try {
        const response = await fetch(`${DOKU_BASE_URL}${endpointUrl}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'X-PARTNER-ID': clientId,
                'X-EXTERNAL-ID': generateExternalId(),
                'X-TIMESTAMP': timestamp,
                'X-SIGNATURE': signature,
                'CHANNEL-ID': '95221',
            },
            body: bodyString,
        });

        const data = await response.json();
        console.log('DOKU QRIS Response:', JSON.stringify(data, null, 2));

        if (response.ok && (data.responseCode === '2004700' || data.qrContent)) {
            return {
                success: true,
                qrCode: data.qrContent,
                qrUrl: data.qrUrl,
                orderId,
                expiredTime: data.expiredTime,
            };
        } else {
            console.error('DOKU QRIS Error:', data);
            return {
                success: false,
                error: data.responseMessage || `Error: ${data.responseCode}` || 'Failed to generate QRIS',
            };
        }
    } catch (error) {
        console.error('DOKU API Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Network error',
        };
    }
}

// Query QRIS transaction status
export async function queryDokuQRIS(orderId: string): Promise<{
    success: boolean;
    status?: string;
    error?: string;
}> {
    if (!isDokuConfigured()) {
        return { success: false, error: 'DOKU tidak dikonfigurasi' };
    }

    const accessToken = await getB2BToken();
    if (!accessToken) {
        return { success: false, error: 'Gagal mendapatkan access token' };
    }

    const clientId = process.env.DOKU_CLIENT_ID!;
    const secretKey = process.env.DOKU_SECRET_KEY!;
    const timestamp = generateTimestamp();
    const endpointUrl = '/snap-adapter/b2b/v1.0/qr/qr-mpm-query';

    const requestBody = {
        originalPartnerReferenceNo: orderId,
        serviceCode: '47',
    };

    const bodyString = JSON.stringify(requestBody);
    const signature = generateSymmetricSignature(
        'POST',
        endpointUrl,
        accessToken,
        timestamp,
        bodyString,
        secretKey
    );

    try {
        const response = await fetch(`${DOKU_BASE_URL}${endpointUrl}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'X-PARTNER-ID': clientId,
                'X-EXTERNAL-ID': generateExternalId(),
                'X-TIMESTAMP': timestamp,
                'X-SIGNATURE': signature,
                'CHANNEL-ID': '95221',
            },
            body: bodyString,
        });

        const data = await response.json();

        if (response.ok) {
            return {
                success: true,
                status: data.latestTransactionStatus,
            };
        } else {
            return {
                success: false,
                error: data.responseMessage || 'Query failed',
            };
        }
    } catch (error) {
        console.error('DOKU query error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Network error',
        };
    }
}
