import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import getTursoClient from '@/lib/turso';
import { sendTelegramMessage } from '@/lib/telegram';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

// GET /api/copytrade/signals
// - If user is a provider: returns their own posted signals
// - If user is a follower: returns signals from all followed providers
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const turso = getTursoClient();
        if (!turso) return NextResponse.json({ error: 'DB error' }, { status: 500 });

        const { searchParams } = new URL(request.url);
        const mode = searchParams.get('mode') || 'follower'; // 'follower' | 'provider'

        // Get user profile including membership and subscriptions
        const userResult = await turso.execute({
            sql: 'SELECT id, membership, subscription_status, copytrade_access, copytrade_expires FROM users WHERE email = ?',
            args: [session.user.email]
        });
        if (userResult.rows.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        const user = userResult.rows[0];
        const userId = user.id as string;

        // Check Follower/Viewer access logic (VVIP, Pro, active subscription, or old CT token)
        const isVvipOrPro = user.membership === 'VVIP' || user.membership === 'PRO';
        const hasActiveSubscription = user.subscription_status === 'active';
        const ctAccess = user.copytrade_access as string | null;
        const ctExpires = user.copytrade_expires as string | null;
        const hasLegacyCt = ctAccess && ctExpires && new Date(ctExpires) > new Date();

        const canViewSignals = mode === 'provider' || isVvipOrPro || hasActiveSubscription || hasLegacyCt;

        if (!canViewSignals) {
            return NextResponse.json({
                error: 'no_ct_access',
                message: 'Silakan berlangganan Copytrade atau paket PRO/VVIP untuk akses.',
                upgradeUrl: '/pricing'
            }, { status: 403 });
        }


        if (mode === 'provider') {
            // Get this user's provider profile
            const providerResult = await turso.execute({
                sql: 'SELECT id FROM signal_providers WHERE user_id = ? AND is_active = 1',
                args: [userId]
            });
            if (providerResult.rows.length === 0) {
                return NextResponse.json({ signals: [] });
            }
            const providerId = providerResult.rows[0].id as string;

            const signals = await turso.execute({
                sql: `SELECT * FROM provider_signals WHERE provider_id = ? ORDER BY created_at DESC LIMIT 50`,
                args: [providerId]
            });
            return NextResponse.json({ signals: signals.rows });
        }

        // Follower mode: get signals from all active followed providers
        const signals = await turso.execute({
            sql: `SELECT ps.*, sp.display_name as provider_name, sp.broker_name
                  FROM provider_signals ps
                  JOIN signal_providers sp ON ps.provider_id = sp.id
                  WHERE ps.provider_id IN (
                    SELECT provider_id FROM copy_relationships
                    WHERE follower_user_id = ? AND status = 'active'
                  )
                  ORDER BY ps.created_at DESC
                  LIMIT 100`,
            args: [userId]
        });

        return NextResponse.json({ signals: signals.rows });

    } catch (error) {
        console.error('[SIGNALS] GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/copytrade/signals — Provider posts a new signal
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const turso = getTursoClient();
        if (!turso) return NextResponse.json({ error: 'DB error' }, { status: 500 });

        // Get user ID
        const userResult = await turso.execute({
            sql: 'SELECT id FROM users WHERE email = ?',
            args: [session.user.email]
        });
        if (userResult.rows.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        const userId = userResult.rows[0].id as string;

        const providerResult = await turso.execute({
            sql: 'SELECT id, display_name FROM signal_providers WHERE user_id = ? AND is_active = 1 AND is_approved = 1',
            args: [userId]
        });
        if (providerResult.rows.length === 0) {
            return NextResponse.json({ error: 'You are not an active provider' }, { status: 403 });
        }
        const providerId = providerResult.rows[0].id as string;
        const providerName = providerResult.rows[0].display_name as string;


        // Parse body
        const body = await request.json();
        const { pair, action, entryPrice, stopLoss, takeProfit, lotSize, timeframe, commentary } = body;

        if (!pair || !action || !['BUY', 'SELL'].includes(action)) {
            return NextResponse.json({ error: 'pair and action (BUY/SELL) are required' }, { status: 400 });
        }

        const signalId = nanoid();

        await turso.execute({
            sql: `INSERT INTO provider_signals 
                  (id, provider_id, pair, action, entry_price, stop_loss, take_profit, lot_size, timeframe, commentary)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [signalId, providerId, pair.toUpperCase(), action, entryPrice ?? null, stopLoss ?? null, takeProfit ?? null, lotSize ?? 0.1, timeframe ?? '1H', commentary ?? null]
        });

        // Calculate RR ratio for Telegram message
        let rrText = '';
        if (stopLoss && takeProfit && entryPrice) {
            const risk = Math.abs(entryPrice - stopLoss);
            const reward = Math.abs(takeProfit - entryPrice);
            if (risk > 0) {
                const rr = (reward / risk).toFixed(1);
                rrText = `\n📊 <b>RR Ratio:</b> 1:${rr}`;
            }
        }

        // Build Telegram message
        const actionEmoji = action === 'BUY' ? '🟢' : '🔴';
        const pairFormatted = pair.toUpperCase();
        const telegramMsg = `📡 <b>SINYAL BARU dari ${providerName}</b>

${actionEmoji} <b>${action} ${pairFormatted}</b>
${entryPrice ? `📍 <b>Entry:</b> ${entryPrice}` : '📍 <b>Entry:</b> Market Order'}
${stopLoss ? `🛑 <b>Stop Loss:</b> ${stopLoss}` : ''}
${takeProfit ? `🎯 <b>Take Profit:</b> ${takeProfit}` : ''}
${rrText}
⏱ <b>Timeframe:</b> ${timeframe ?? '1H'}
📦 <b>Lot:</b> ${lotSize ?? 0.1}
${commentary ? `\n💬 ${commentary}` : ''}

⚡ <a href="https://arra7-app.vercel.app/copytrade">Lihat di Arra7 Copy Trade</a>`;

        // Send Telegram broadcast
        const tgResult = await sendTelegramMessage(telegramMsg, 'HTML');

        // Mark as notified
        if (tgResult.success) {
            await turso.execute({
                sql: 'UPDATE provider_signals SET notified_at = CURRENT_TIMESTAMP WHERE id = ?',
                args: [signalId]
            });
        }

        return NextResponse.json({
            success: true,
            signalId,
            telegramSent: tgResult.success,
            message: tgResult.success
                ? '✅ Sinyal berhasil diposting dan notifikasi Telegram terkirim!'
                : '⚠️ Sinyal diposting, tapi notifikasi Telegram gagal. Cek konfigurasi bot.'
        });

    } catch (error) {
        console.error('[SIGNALS] POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
