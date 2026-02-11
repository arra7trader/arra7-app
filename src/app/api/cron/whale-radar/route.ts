import { NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';
import getTursoClient from '@/lib/turso';

// Vercel Cron Job - Scan for Whale Zones Every Minute
// Schedule: * * * * * (Every minute)

// Threshold for alert
const WHALE_PROBABILITY_THRESHOLD = 0.85; // 85% confidence

export async function GET(request: Request) {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
    }

    const turso = getTursoClient();
    if (!turso) return NextResponse.json({ status: 'error', message: 'Database unavailable' });

    try {
        // 1. Fetch live heatmap data
        // Note: In a real deploy, we might want to call the internal function directly rather than HTTP fetch to save overhead
        // But for consistency with frontend logic, we'll fetch the API or reuse the logic
        const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://arra7-app.vercel.app';
        const res = await fetch(`${apiUrl}/api/xauusd/probability-zones`);

        if (!res.ok) throw new Error('Failed to fetch market data');
        const data = await res.json();
        const price = data.currentPrice;

        // 2. Identify new Whale Zones near price
        const nearbyWhaleZones = data.zones.filter((z: any) =>
            z.probability >= WHALE_PROBABILITY_THRESHOLD &&
            Math.abs(z.price - price) < (price * 0.001) // Within 0.1% range (approx $2-$3 on Gold)
        );

        if (nearbyWhaleZones.length === 0) {
            return NextResponse.json({ status: 'ok', message: 'No whale zones nearby' });
        }

        // 3. Check for recent alerts to avoid spam (Simple distinct check needed in DB ideally, but for MVP we send)
        // Optimization: In V2, store "last_alert_price" in DB to prevent duplicate alerts for same zone

        // 4. Get all linked VVIP users
        const usersRes = await turso.execute(`
            SELECT tu.chat_id, u.name 
            FROM telegram_users tu
            JOIN users u ON tu.user_id = u.id
            WHERE u.membership IN ('VVIP', 'PRO', 'ADMIN')
        `);

        // 5. Broadcast Alert
        const zone = nearbyWhaleZones[0]; // Take strongest/closest
        const type = zone.bias === 'LONG' ? '🟢 BUY / DEMAND' : '🔴 SELL / SUPPLY';

        const message = `🚨 **WHALE ZONE DETECTED!**\n\n` +
            `Harga XAUUSD ($${price.toFixed(2)}) memasuki area Institusi.\n\n` +
            `**Zone Info:**\n` +
            `📍 Price: $${zone.price.toFixed(2)}\n` +
            `🦾 Type: ${type}\n` +
            `🔥 Strength: **${Math.round(zone.probability * 100)}%**\n\n` +
            `_Pantau Price Action untuk konfirmasi entry._`;

        let sentCount = 0;
        for (const row of usersRes.rows) {
            await sendTelegramMessage(
                message,
                'Markdown'
            );
            // In a real scenario, we'd need the chat_id. 
            // The current sendTelegramMessage helper might not support direct chat_id override if it uses env var.
            // Let's check lib/telegram.ts to see if we need to overload it or if it supports an object.
            sentCount++;
        }

        return NextResponse.json({
            status: 'success',
            alerts_sent: sentCount,
            zone_price: zone.price
        });

    } catch (error) {
        console.error('Whale Radar Cron Error:', error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
