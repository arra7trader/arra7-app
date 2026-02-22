import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { copytradeSupabase } from '@/lib/supabase-copytrade';

type TopupStatus = 'pending' | 'paid' | 'credited' | 'expired' | 'failed';

function getValue(obj: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
        const value = obj[key];
        if (value !== undefined && value !== null && String(value).trim() !== '') {
            return value;
        }
    }
    return null;
}

function normalizeTopupStatus(statusRaw: unknown): TopupStatus {
    const status = String(statusRaw || '').toLowerCase();
    if (['success', 'paid', 'settlement', 'completed', 'capture'].includes(status)) return 'paid';
    if (['expire', 'expired'].includes(status)) return 'expired';
    if (['failed', 'cancel', 'canceled', 'deny'].includes(status)) return 'failed';
    return 'pending';
}

function parseAmountIdr(payload: Record<string, unknown>) {
    const raw = getValue(payload, ['amount', 'gross_amount', 'paid_amount', 'total_amount']);
    if (raw === null) return null;
    const parsed = Number(String(raw).replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
}

function parseProviderReference(payload: Record<string, unknown>) {
    const ref = getValue(payload, ['reference_id', 'transaction_id', 'invoice_id', 'payment_id']);
    return ref ? String(ref) : null;
}

function parseEventId(payload: Record<string, unknown>) {
    const eventId = getValue(payload, ['event_id', 'id', 'reference_id', 'transaction_id']);
    return eventId ? String(eventId) : null;
}

function parseOrderId(payload: Record<string, unknown>) {
    const orderId = getValue(payload, ['order_id', 'merchant_order_id', 'invoice_number', 'external_id']);
    return orderId ? String(orderId) : null;
}

function verifyWebhookSignature(request: NextRequest, rawBody: string) {
    const secret = process.env.QRIS_ID_WEBHOOK_SECRET;
    if (!secret) {
        return true;
    }

    const signatureHeader =
        request.headers.get('x-qris-signature') ||
        request.headers.get('x-signature') ||
        request.headers.get('x-callback-signature');

    if (!signatureHeader) {
        return false;
    }

    const expected = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

    const a = Buffer.from(expected.toLowerCase(), 'utf8');
    const b = Buffer.from(signatureHeader.toLowerCase(), 'utf8');
    if (a.length !== b.length) {
        return false;
    }
    return crypto.timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.text();
        let payload: Record<string, unknown> = {};
        try {
            payload = JSON.parse(rawBody);
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const signatureValid = verifyWebhookSignature(request, rawBody);
        if (!signatureValid) {
            return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
        }

        const orderId = parseOrderId(payload);
        if (!orderId) {
            return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
        }

        const normalizedStatus = normalizeTopupStatus(
            getValue(payload, ['status', 'transaction_status', 'payment_status']),
        );
        const eventId = parseEventId(payload) || `evt-${orderId}-${Date.now()}`;
        const amountIdr = parseAmountIdr(payload);
        const providerReference = parseProviderReference(payload);

        const { error: eventError } = await copytradeSupabase
            .from('ct_payment_events')
            .insert({
                provider: 'qris.id',
                event_id: eventId,
                order_id: orderId,
                status: normalizedStatus,
                amount_idr: amountIdr,
                signature: request.headers.get('x-qris-signature') || request.headers.get('x-signature') || '',
                payload,
                processed: false,
            });

        if (eventError && eventError.code !== '23505' && eventError.code !== '42P01') {
            return NextResponse.json({ error: eventError.message }, { status: 500 });
        }

        if (eventError?.code === '23505') {
            return NextResponse.json({ success: true, deduplicated: true });
        }

        const { data: topup, error: topupError } = await copytradeSupabase
            .from('ct_topups')
            .select('id, user_id, order_id, email, credits, amount_idr, status')
            .eq('order_id', orderId)
            .single();

        if (topupError?.code === '42P01') {
            return NextResponse.json(
                { error: 'Tabel ct_topups belum tersedia. Jalankan migrasi supabase-copytrade-schema.sql.' },
                { status: 503 },
            );
        }

        if (topupError || !topup) {
            return NextResponse.json({ success: true, ignored: true, reason: 'order_not_found' });
        }

        if (normalizedStatus === 'paid') {
            if (topup.status !== 'credited') {
                const { data: user, error: userError } = await copytradeSupabase
                    .from('ct_users')
                    .select('copytrade_balance, email')
                    .eq('id', topup.user_id)
                    .single();

                if (userError || !user) {
                    return NextResponse.json({ error: userError?.message || 'Bridge user not found' }, { status: 500 });
                }

                const balanceBefore = Number(user.copytrade_balance || 0);
                const creditsToAdd = Number(topup.credits || 0);
                const balanceAfter = balanceBefore + creditsToAdd;

                const { error: balanceError } = await copytradeSupabase
                    .from('ct_users')
                    .update({ copytrade_balance: balanceAfter })
                    .eq('id', topup.user_id);

                if (balanceError) {
                    return NextResponse.json({ error: balanceError.message }, { status: 500 });
                }

                const { error: ledgerError } = await copytradeSupabase
                    .from('ct_ledger')
                    .insert({
                        user_id: topup.user_id,
                        order_id: topup.order_id,
                        entry_type: 'topup_qris',
                        direction: 'credit',
                        amount: creditsToAdd,
                        amount_idr: Number(topup.amount_idr || amountIdr || 0),
                        balance_before: balanceBefore,
                        balance_after: balanceAfter,
                        actor_email: 'qris-webhook',
                        note: `Auto credit from qris.id webhook (${providerReference || '-'})`,
                    });

                if (ledgerError && ledgerError.code !== '23505' && ledgerError.code !== '42P01') {
                    return NextResponse.json({ error: ledgerError.message }, { status: 500 });
                }

                const now = new Date().toISOString();
                const { error: topupUpdateError } = await copytradeSupabase
                    .from('ct_topups')
                    .update({
                        status: 'credited',
                        paid_at: now,
                        credited_at: now,
                        provider_reference: providerReference,
                    })
                    .eq('id', topup.id);

                if (topupUpdateError) {
                    return NextResponse.json({ error: topupUpdateError.message }, { status: 500 });
                }
            }
        } else if (normalizedStatus === 'expired' || normalizedStatus === 'failed') {
            const { error: topupUpdateError } = await copytradeSupabase
                .from('ct_topups')
                .update({
                    status: normalizedStatus,
                    provider_reference: providerReference,
                })
                .eq('id', topup.id)
                .neq('status', 'credited');

            if (topupUpdateError) {
                return NextResponse.json({ error: topupUpdateError.message }, { status: 500 });
            }
        }

        if (!eventError || eventError.code !== '42P01') {
            await copytradeSupabase
                .from('ct_payment_events')
                .update({ processed: true })
                .eq('event_id', eventId)
                .eq('provider', 'qris.id');
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[CT Topup Webhook] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({ status: 'ready', provider: 'qris.id' });
}
