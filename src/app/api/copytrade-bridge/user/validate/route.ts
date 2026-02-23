import { NextRequest, NextResponse } from 'next/server';
import { copytradeSupabase } from '@/lib/supabase-copytrade';
import { consumeRateLimit, getRequestIp, verifyBridgeSignature } from '@/lib/copytrade-bridge-security';
import { isUnlimitedCopytradeEmail, UNLIMITED_COPYTRADE_BALANCE } from '@/lib/copytrade-unlimited';
import { COPYTRADE_CREDITS_PER_SIGNAL } from '@/lib/copytrade-credit';
import { normalizeBridgeOrderType, normalizeBridgePair } from '@/lib/copytrade-bridge-order-type';

const parsedSignalWindowMinutes = Number(process.env.CT_BRIDGE_SIGNAL_WINDOW_MINUTES);
const SIGNAL_WINDOW_MINUTES =
    Number.isFinite(parsedSignalWindowMinutes) && parsedSignalWindowMinutes > 0
        ? Math.max(5, parsedSignalWindowMinutes)
        : 180;
const SIGNAL_WINDOW_MS = SIGNAL_WINDOW_MINUTES * 60 * 1000;

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
        const isSubscribed = unlimited || realBalance >= COPYTRADE_CREDITS_PER_SIGNAL;
        const signalSince = new Date(Date.now() - SIGNAL_WINDOW_MS).toISOString();

        const { data: signals, error: signalsError } = await copytradeSupabase
            .from('ai_signal_store')
            .select('id, pair, type, entry_price, tp, sl, created_at')
            .gte('created_at', signalSince)
            .gt('entry_price', 0)
            .gt('tp', 0)
            .gt('sl', 0)
            .order('created_at', { ascending: false })
            .limit(10);

        if (signalsError) {
            console.error('[CT Validate] Signal fetch error:', signalsError);
        }

        const normalizedSignals = (signals || [])
            .map((signal) => {
                const normalizedType = normalizeBridgeOrderType(signal.type);
                if (!normalizedType) {
                    return null;
                }

                return {
                    ...signal,
                    pair: normalizeBridgePair(signal.pair),
                    type: normalizedType,
                };
            })
            .filter((signal): signal is NonNullable<typeof signal> => {
                if (!signal || !signal.pair) return false;
                return Number(signal.entry_price) > 0 && Number(signal.tp) > 0 && Number(signal.sl) > 0;
            });

        return NextResponse.json({
            success: true,
            securityMode: signedRequest ? 'signed' : 'legacy-get',
            signalWindowMinutes: SIGNAL_WINDOW_MINUTES,
            balance: unlimited ? UNLIMITED_COPYTRADE_BALANCE : realBalance,
            unlimited,
            requiredCredits: COPYTRADE_CREDITS_PER_SIGNAL,
            isSubscribed,
            signals: isSubscribed ? normalizedSignals : [],
        });
    } catch (error) {
        console.error('[CT Validate] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
