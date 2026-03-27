import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { randomBytes } from 'crypto';
import { authOptions } from '@/lib/auth';
import {
  createPrivateBotLinkCode,
  getPrivateBotMembershipByUserId,
} from '@/lib/turso';

function getTtlMinutes(): number {
  const value = Number(process.env.TELEGRAM_LINK_CODE_TTL_MINUTES ?? 10);
  if (!Number.isFinite(value) || value <= 0) return 10;
  return Math.max(5, Math.min(30, Math.floor(value)));
}

function generateLinkCode(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

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

    const ttlMinutes = getTtlMinutes();
    let code = '';
    let saved = false;

    for (let i = 0; i < 3; i++) {
      code = generateLinkCode();
      saved = await createPrivateBotLinkCode(userId, code, ttlMinutes);
      if (saved) break;
    }

    if (!saved || !code) {
      return NextResponse.json(
        { ok: false, message: 'Gagal membuat kode link. Coba lagi.' },
        { status: 500 }
      );
    }

    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
    return NextResponse.json({
      ok: true,
      code,
      expiresAt,
      botUsername: process.env.TELEGRAM_BOT_USERNAME || 'arra7trader_bot',
      command: `/link ${code}`,
    });
  } catch (error) {
    console.error('[TELEGRAM_LINK_CODE] POST error:', error);
    return NextResponse.json(
      { ok: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
