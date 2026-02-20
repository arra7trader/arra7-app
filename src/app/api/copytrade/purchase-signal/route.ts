import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import getTursoClient from '@/lib/turso';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const turso = getTursoClient();
        if (!turso) return NextResponse.json({ error: 'DB error' }, { status: 500 });

        const body = await request.json();
        const { signalId } = body;

        if (!signalId) {
            return NextResponse.json({ error: 'Signal ID is required' }, { status: 400 });
        }

        // Get Buyer User
        const buyerResult = await turso.execute({
            sql: 'SELECT id, koin_balance FROM users WHERE email = ?',
            args: [session.user.email]
        });
        if (buyerResult.rows.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const buyerId = buyerResult.rows[0].id as string;
        const buyerBalance = Number(buyerResult.rows[0].koin_balance || 0);

        // Get Signal & Provider User
        const signalResult = await turso.execute({
            sql: `
                SELECT ps.id, ps.price_koin, ps.provider_id, sp.user_id as provider_user_id
                FROM provider_signals ps
                JOIN signal_providers sp ON ps.provider_id = sp.id
                WHERE ps.id = ?
            `,
            args: [signalId]
        });

        if (signalResult.rows.length === 0) {
            return NextResponse.json({ error: 'Sinyal tidak ditemukan' }, { status: 404 });
        }

        const signal = signalResult.rows[0];
        const priceKoin = Number(signal.price_koin || 0);

        if (priceKoin <= 0) {
            return NextResponse.json({ error: 'Sinyal ini gratis' }, { status: 400 });
        }

        // Check if already purchased
        const purchaseResult = await turso.execute({
            sql: 'SELECT id FROM signal_purchases WHERE user_id = ? AND signal_id = ?',
            args: [buyerId, signalId]
        });

        if (purchaseResult.rows.length > 0) {
            return NextResponse.json({ success: true, message: 'Sudah dibeli' });
        }

        // Prevent self-purchase
        if (buyerId === signal.provider_user_id) {
            return NextResponse.json({ error: 'Tidak bisa membeli sinyal sendiri' }, { status: 400 });
        }

        // Check Koin balance
        if (buyerBalance < priceKoin) {
            return NextResponse.json({ error: 'Saldo Koin tidak mencukupi' }, { status: 400 });
        }

        // Calculate Koin Distribution
        const providerKoin = Math.floor(priceKoin * 0.7); // 70% to provider

        const trxIdUser = nanoid();
        const trxIdProvider = nanoid();

        // Executing Transaction Operations using Turso Batch
        const stmts = [];

        // 1. Deduct Koin from Buyer
        stmts.push({
            sql: `UPDATE users SET koin_balance = koin_balance - ? WHERE id = ?`,
            args: [priceKoin, buyerId]
        });
        // 2. Insert TRX for Buyer
        stmts.push({
            sql: `INSERT INTO trx_coins (id, user_id, type, amount, status, reference_id, description)
                  VALUES (?, ?, 'PAYMENT', ?, 'SUCCESS', ?, ?)`,
            args: [trxIdUser, buyerId, -priceKoin, signalId, `Membuka sinyal berbayar`]
        });

        // 3. Add Koin to Provider
        stmts.push({
            sql: `UPDATE users SET koin_balance = koin_balance + ? WHERE id = ?`,
            args: [providerKoin, signal.provider_user_id as string]
        });
        // 4. Insert TRX for Provider
        stmts.push({
            sql: `INSERT INTO trx_coins (id, user_id, type, amount, status, reference_id, description)
                  VALUES (?, ?, 'EARNING', ?, 'SUCCESS', ?, ?)`,
            args: [trxIdProvider, signal.provider_user_id as string, providerKoin, signalId, `Penjualan sinyal Koin (30% Platfrom Fee dipotong)`]
        });

        // 5. Insert Signal Purchase Record
        stmts.push({
            sql: `INSERT INTO signal_purchases (id, user_id, signal_id, price_paid)
                  VALUES (?, ?, ?, ?)`,
            args: [nanoid(), buyerId, signalId, priceKoin]
        });

        await turso.batch(stmts, 'write');

        return NextResponse.json({
            success: true,
            message: 'Sinyal berhasil dibuka!'
        });

    } catch (error) {
        console.error('[PURCHASE_SIGNAL] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
