import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPrivateBotMembershipByUserId } from '@/lib/turso';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }

    const privateBot = await getPrivateBotMembershipByUserId(userId);
    const privateBotActive =
      !!privateBot &&
      privateBot.status === 'active' &&
      (!privateBot.expiresAt || new Date(privateBot.expiresAt).getTime() > Date.now());

    if (!privateBotActive) {
      return NextResponse.json(
        { ok: false, message: 'Fitur Telegram bot hanya untuk member TELEBOT aktif.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ok: false,
      botUsername: process.env.TELEGRAM_BOT_USERNAME || 'arra7trader_bot',
      message: 'TELEBOT tidak lagi memakai kode link. Akses bot sekarang otomatis mengikuti username Telegram yang sudah di-approve admin.',
    });
  } catch (error) {
    console.error('[TELEGRAM_LINK_CODE] POST error:', error);
    return NextResponse.json(
      { ok: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
