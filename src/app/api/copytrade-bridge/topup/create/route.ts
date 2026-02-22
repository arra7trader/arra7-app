import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { copytradeSupabase } from '@/lib/supabase-copytrade';
import { getCtTopupPlan } from '@/lib/copytrade-topup-plans';

function generateOrderId() {
    const token = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `CTTOP-${Date.now()}-${token}`;
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const planId = String(body?.planId || '').toUpperCase();
        const plan = getCtTopupPlan(planId);
        if (!plan) {
            return NextResponse.json({ error: 'Plan topup tidak valid' }, { status: 400 });
        }

        const email = session.user.email.toLowerCase();
        const name = session.user.name || '';

        const { data: existingUser, error: userError } = await copytradeSupabase
            .from('ct_users')
            .select('id')
            .eq('email', email)
            .single();
        let ctUser = existingUser;

        if (userError && userError.code !== 'PGRST116') {
            return NextResponse.json({ error: userError.message }, { status: 500 });
        }

        if (!ctUser) {
            const { data: createdUser, error: createUserError } = await copytradeSupabase
                .from('ct_users')
                .insert({ email, name })
                .select('id')
                .single();

            if (createUserError || !createdUser) {
                return NextResponse.json({ error: createUserError?.message || 'Gagal membuat akun bridge user' }, { status: 500 });
            }
            ctUser = createdUser;
        }

        const orderId = generateOrderId();
        const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

        const qrisImageUrl = process.env.CT_QRIS_IMAGE_URL || '/qris-payment.jpg';
        const merchantName = process.env.CT_QRIS_MERCHANT_NAME || 'ARRA7 FULLSTACK DEVELOPER';
        const nmid = process.env.CT_QRIS_NMID || 'ID1025468752486';

        const { error: topupError } = await copytradeSupabase
            .from('ct_topups')
            .insert({
                order_id: orderId,
                user_id: ctUser.id,
                email,
                plan_id: plan.id,
                credits: plan.credits,
                amount_idr: plan.price,
                status: 'pending',
                payment_provider: 'qris.id',
                qris_image_url: qrisImageUrl,
                expires_at: expiresAt,
            });

        if (topupError) {
            if (topupError.code === '42P01') {
                return NextResponse.json(
                    { error: 'Tabel ct_topups belum tersedia. Jalankan migrasi supabase-copytrade-schema.sql terlebih dahulu.' },
                    { status: 503 },
                );
            }
            return NextResponse.json({ error: topupError.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            order: {
                orderId,
                planId: plan.id,
                credits: plan.credits,
                amountIdr: plan.price,
                amountLabel: plan.priceLabel,
                status: 'pending',
                expiresAt,
                paymentProvider: 'qris.id',
                qrisImageUrl,
                merchantName,
                nmid,
            },
        });
    } catch (error) {
        console.error('[CT Topup Create] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
