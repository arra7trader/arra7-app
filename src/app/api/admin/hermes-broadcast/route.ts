import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminEmail } from '@/lib/admin-access';
import { sendTelegramMessage } from '@/lib/telegram';
import { 
    HERMES_LAUNCH_BROADCAST, 
    HERMES_REMINDER_BROADCAST, 
    HERMES_SCARCITY_BROADCAST 
} from '@/lib/hermes-broadcast-templates';

export const dynamic = 'force-dynamic';

const TEMPLATES: Record<string, string> = {
    launch: HERMES_LAUNCH_BROADCAST,
    reminder: HERMES_REMINDER_BROADCAST,
    scarcity: HERMES_SCARCITY_BROADCAST,
};

// POST - Send Hermes broadcast to Telegram channel
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email || !isAdminEmail(session.user.email)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { template, customMessage, channelId } = body;

        // Use template or custom message
        const message = template 
            ? TEMPLATES[template] 
            : customMessage;

        if (!message) {
            return NextResponse.json({ 
                error: 'Invalid template or missing customMessage',
                availableTemplates: Object.keys(TEMPLATES),
            }, { status: 400 });
        }

        // Send to specified channel or default
        const targetChannel = channelId || process.env.TELEGRAM_CHANNEL_ID;
        
        const result = await sendTelegramMessage(
            message, 
            'HTML', 
            targetChannel,
            {
                replyMarkup: {
                    inline_keyboard: [[
                        { text: '🧠 Lihat Detail HERMES', url: 'https://pica.my.id/hermes-mentor' },
                    ], [
                        { text: '💬 Order Sekarang', url: 'https://t.me/arra7trader' },
                    ]],
                },
            }
        );

        return NextResponse.json({
            status: result.success ? 'success' : 'error',
            messageId: result.messageId,
            error: result.error,
            template: template || 'custom',
        });
    } catch (error: any) {
        console.error('Hermes broadcast error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// GET - Preview templates
export async function GET() {
    return NextResponse.json({
        templates: Object.entries(TEMPLATES).map(([key, msg]) => ({
            key,
            preview: msg.substring(0, 200) + '...',
            length: msg.length,
        })),
    });
}
