import { NextRequest, NextResponse } from 'next/server';
import { copytradeSupabase } from '@/lib/supabase-copytrade';
import { consumeRateLimit, getRequestIp, verifyBridgeSignature } from '@/lib/copytrade-bridge-security';
import { isUnlimitedCopytradeEmail, UNLIMITED_COPYTRADE_BALANCE } from '@/lib/copytrade-unlimited';

const SIGNAL_WINDOW_MS = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
    const ip = getRequestIp(request);
    const rate = consumeRateLimit(`ct-validate-get:${ip}`, 50, 60_000);
    if (!rate.allowed) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const licenseKey = request.nextUrl.searchParams.get('licenseKey');
    if (!licenseKey) {
        return NextResponse.json({ error: 'licenseKey is required' }, { status: 400 });
    }

    return validateKey(licenseKey, false);
}

export async function POST(request: NextRequest) {
    const ip = getRequestIp(request);
    const rate = consumeRateLimit(`ct-validate-post:${ip}`, 120, 60_000);
    if (!rate.allowed) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const rawBody = await request.text();
    const signatureCheck = verifyBridgeSignature(request, rawBody);
    if (!signatureCheck.ok) {
        return NextResponse.json({ error: signatureCheck.reason }, { status: 401 });
    }

    let body: { licenseKey?: string } = {};
    try {
        body = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const licenseKey = body.licenseKey;
    if (!licenseKey) {
        return NextResponse.json({ error: 'licenseKey is required' }, { status: 400 });
    }

    return validateKey(licenseKey, true);
}

async function validateKey(licenseKey: string, signedRequest: boolean) {
    try {
        const { data: user, error: userError } = await copytradeSupabase
            .from('ct_users')
            .select('id, email, copytrade_balance')
            .eq('license_key', licenseKey)
            .single();

        if (userError || !user) {
            return NextResponse.json({ error: 'Invalid license key' }, { status: 401 });
        }

        const realBalance = Number(user.copytrade_balance || 0);
        const unlimited = isUnlimitedCopytradeEmail(user.email);
        const isSubscribed = unlimited || realBalance > 0;
        const signalSince = new Date(Date.now() - SIGNAL_WINDOW_MS).toISOString();

        const { data: signals, error: signalsError } = await copytradeSupabase
            .from('ai_signal_store')
            .select('id, pair, type, entry_price, tp, sl, created_at')
            .gte('created_at', signalSince)
            .order('created_at', { ascending: false })
            .limit(10);

        if (signalsError) {
            console.error('[CT Validate] Signal fetch error:', signalsError);
        }

        return NextResponse.json({
            success: true,
            securityMode: signedRequest ? 'signed' : 'legacy-get',
            balance: unlimited ? UNLIMITED_COPYTRADE_BALANCE : realBalance,
            unlimited,
            isSubscribed,
            signals: isSubscribed ? (signals || []) : [],
        });
    } catch (error) {
        console.error('[CT Validate] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
