import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendTelegramMessage, MARKETING_TEMPLATES, isTelegramConfigured, TEMPLATE_METADATA } from '@/lib/telegram';
import getTursoClient from '@/lib/turso';

const ADMIN_EMAILS = ['apmexplore@gmail.com'];

function isAdmin(email: string): boolean {
    return ADMIN_EMAILS.includes(email);
}

// Helper to get auto-post status from database
async function getAutoPostStatus(): Promise<boolean> {
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

// Helper to set auto-post status in database
async function setAutoPostStatus(enabled: boolean): Promise<boolean> {
    const turso = getTursoClient();
    if (!turso) return false;

    try {
        // Upsert the setting
        await turso.execute({
            sql: `INSERT INTO settings (key, value) VALUES ('telegram_auto_post_enabled', ?)
                  ON CONFLICT(key) DO UPDATE SET value = ?`,
            args: [enabled ? 'true' : 'false', enabled ? 'true' : 'false'],
        });
        return true;
    } catch (error) {
        console.error('[TELEGRAM] Failed to set auto-post status:', error);
        return false;
    }
}

// GET - Check Telegram config status and auto-post state
export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email || !isAdmin(session.user.email)) {
        return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 403 });
    }

    const autoPostEnabled = await getAutoPostStatus();

    return NextResponse.json({
        status: 'success',
        configured: isTelegramConfigured(),
        autoPostEnabled,
        templates: Object.keys(MARKETING_TEMPLATES),
        templateMetadata: TEMPLATE_METADATA,
    });
}

// POST - Send message or toggle auto-post
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email || !isAdmin(session.user.email)) {
            return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { action, template, customMessage } = body;

        // Handle auto-post toggle actions
        if (action === 'start_auto_post') {
            const success = await setAutoPostStatus(true);
            return NextResponse.json({
                status: success ? 'success' : 'error',
                message: success ? 'Auto-posting started!' : 'Failed to start auto-posting',
                autoPostEnabled: success,
            });
        }

        if (action === 'stop_auto_post') {
            const success = await setAutoPostStatus(false);
            return NextResponse.json({
                status: success ? 'success' : 'error',
                message: success ? 'Auto-posting stopped.' : 'Failed to stop auto-posting',
                autoPostEnabled: false,
            });
        }

        // Handle sending message (existing logic)
        let message = customMessage;

        // Use template if specified
        if (template && !customMessage) {
            const templateContent = MARKETING_TEMPLATES[template as keyof typeof MARKETING_TEMPLATES];
            if (typeof templateContent === 'string') {
                message = templateContent;
            } else {
                return NextResponse.json({ status: 'error', message: 'Invalid template' }, { status: 400 });
            }
        }

        if (!message) {
            return NextResponse.json({ status: 'error', message: 'No message provided' }, { status: 400 });
        }

        console.log('[ADMIN] Sending Telegram message, template:', template || 'custom');

        const result = await sendTelegramMessage(message);

        if (result.success) {
            return NextResponse.json({
                status: 'success',
                message: 'Message sent to Telegram channel',
                messageId: result.messageId,
            });
        } else {
            return NextResponse.json({
                status: 'error',
                message: result.error || 'Failed to send message',
            }, { status: 500 });
        }

    } catch (error) {
        console.error('[ADMIN] Telegram send error:', error);
        return NextResponse.json({ status: 'error', message: 'Internal server error' }, { status: 500 });
    }
}

// Export auto-post status check for cron job
export { getAutoPostStatus };
