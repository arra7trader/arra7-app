import { NextResponse } from 'next/server';
import { copytradeSupabase } from '@/lib/supabase-copytrade';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const licenseKey = searchParams.get('licenseKey');
    if (!licenseKey) {
        return NextResponse.json({ error: 'licenseKey is required' }, { status: 400 });
    }
    return validateKey(licenseKey);
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { licenseKey } = body;
        if (!licenseKey) {
            return NextResponse.json({ error: 'licenseKey is required' }, { status: 400 });
        }
        return validateKey(licenseKey);
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
}

async function validateKey(licenseKey: string) {
    try {
        // Find user by license key in Supabase (ct_users table)
        const { data: user, error: userError } = await copytradeSupabase
            .from('ct_users')
            .select('id, copytrade_balance')
            .eq('license_key', licenseKey)
            .single();

        if (userError || !user) {
            return NextResponse.json({ error: 'Invalid license key' }, { status: 401 });
        }

        const isSubscribed = user.copytrade_balance > 0;

        // Get signals from the last 5 minutes to prevent EA from opening stale positions
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data: signals, error: signalsError } = await copytradeSupabase
            .from('ai_signal_store')
            .select('*')
            .gte('created_at', fiveMinutesAgo)
            .order('created_at', { ascending: false })
            .limit(10);

        if (signalsError) {
            console.error('[CT Validate] Signal fetch error:', signalsError);
        }

        return NextResponse.json({
            success: true,
            balance: user.copytrade_balance,
            isSubscribed,
            signals: isSubscribed ? (signals || []) : [],
        });
    } catch (error: any) {
        console.error('[CT Validate] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
