import { NextResponse } from 'next/server';
import { sendTelegramMessage, getRotatingTemplate, isTelegramConfigured, TEMPLATE_METADATA } from '@/lib/telegram';

// Vercel Cron Job - Auto-post to Telegram every 5 hours
// Schedule: 0 */5 * * * (at minute 0 past every 5th hour)

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

    try {
        // Get the rotating template
        const { key, message } = getRotatingTemplate();
        const metadata = TEMPLATE_METADATA[key];

        console.log(`[CRON] Sending template: ${key} (${metadata?.name || 'Unknown'})`);

        // Send to Telegram
        const result = await sendTelegramMessage(message);

        if (result.success) {
            console.log(`[CRON] Successfully sent: ${key}, messageId: ${result.messageId}`);
            return NextResponse.json({
                status: 'success',
                message: `Template "${metadata?.name || key}" sent successfully`,
                templateKey: key,
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
