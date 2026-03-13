import { NextResponse } from 'next/server';
import { sendTelegramMessage, getTodaysTemplate, isTelegramConfigured, TEMPLATE_METADATA } from '@/lib/telegram';
import getTursoClient from '@/lib/turso';

// Vercel Cron Job - Auto-post to Telegram daily (every 24 hours)
// Schedule: 0 8 * * * (at 8:00 AM every day)

// Helper to get auto-post status from database
async function isAutoPostEnabled(): Promise<boolean> {
    const turso = getTursoClient();
    if (!turso) return false;

    try {
        const result = await turso.execute({
            sql: "SELECT value FROM settings WHERE key = 'telegram_auto_post_enabled'",
            args: [],
        });
        if (result.rows.length > 0) {
            return result.rows[0].value === 'true';
        }
        return false;
    } catch {
        return false;
    }
}

export async function GET(request: Request) {
    // Verify cron secret for security (optional but recommended)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // If CRON_SECRET is set, verify it
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        console.log('[CRON] Unauthorized request - invalid or missing CRON_SECRET');
        return NextResponse.json(
            { status: 'error', message: 'Unauthorized' },
            { status: 401 }
        );
    }

    // Check if Telegram is configured
    if (!isTelegramConfigured()) {
        console.log('[CRON] Telegram not configured');
        return NextResponse.json({
            status: 'error',
            message: 'Telegram not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID.',
        });
    }

    // Check if auto-posting is enabled
    const autoPostEnabled = await isAutoPostEnabled();
    if (!autoPostEnabled) {
        console.log('[CRON] Auto-posting is disabled, skipping');
        return NextResponse.json({
            status: 'skipped',
            message: 'Auto-posting is disabled. Enable it from admin panel.',
            timestamp: new Date().toISOString(),
        });
    }

    try {
        // Get today's template (changes every 24 hours)
        const { key, message, dayName } = getTodaysTemplate();
        const metadata = TEMPLATE_METADATA[key];

        console.log(`[CRON] Sending daily template: ${key} (${metadata?.name || dayName})`);

        // Send to Telegram
        const result = await sendTelegramMessage(message);

        if (result.success) {
            console.log(`[CRON] Successfully sent: ${key}, messageId: ${result.messageId}`);
            return NextResponse.json({
                status: 'success',
                message: `Template "${metadata?.name || dayName}" sent successfully`,
                templateKey: key,
                dayName: dayName,
                messageId: result.messageId,
                timestamp: new Date().toISOString(),
            });
        } else {
            console.error(`[CRON] Failed to send: ${result.error}`);
            return NextResponse.json({
                status: 'error',
                message: result.error || 'Failed to send message',
                templateKey: key,
            });
        }
    } catch (error) {
        console.error('[CRON] Error:', error);
        return NextResponse.json({
            status: 'error',
            message: 'Internal server error',
        });
    }
}
