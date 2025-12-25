import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendTelegramMessage, MARKETING_TEMPLATES, isTelegramConfigured } from '@/lib/telegram';

const ADMIN_EMAILS = ['apmexplore@gmail.com'];

function isAdmin(email: string): boolean {
    return ADMIN_EMAILS.includes(email);
}

// GET - Check Telegram config status
export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email || !isAdmin(session.user.email)) {
        return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({
        status: 'success',
        configured: isTelegramConfigured(),
        templates: Object.keys(MARKETING_TEMPLATES).filter(k => typeof MARKETING_TEMPLATES[k as keyof typeof MARKETING_TEMPLATES] === 'string'),
    });
}

// POST - Send message to Telegram channel
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email || !isAdmin(session.user.email)) {
            return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { template, customMessage } = body;

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
