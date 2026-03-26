import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import {
  getPrivateBotMembershipByTelegramUsername,
  getPrivateBotMembershipByUserId,
  initDatabase,
  upsertPrivateBotMembership
} from '@/lib/turso';

export const dynamic = 'force-dynamic';

function normalizeTelegramUsername(username?: string | null): string | null {
  const value = String(username || '').trim().replace(/^@+/, '').toLowerCase();
  return value || null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const telegramUsername = normalizeTelegramUsername(body?.telegramUsername);

    if (!telegramUsername) {
      return NextResponse.json(
        { ok: false, message: 'Username Telegram wajib diisi.' },
        { status: 400 }
      );
    }

    await initDatabase();

    const existingByUsername = await getPrivateBotMembershipByTelegramUsername(telegramUsername);
    if (existingByUsername && existingByUsername.userId !== userId) {
      return NextResponse.json(
        { ok: false, message: 'Username Telegram ini sudah dipakai akun lain.' },
        { status: 409 }
      );
    }

    const currentMembership = await getPrivateBotMembershipByUserId(userId);
    const ok = await upsertPrivateBotMembership({
      userId,
      planCode: 'TELEBOT',
      status: currentMembership?.status || 'invited',
      expiresAt: currentMembership?.expiresAt || null,
      telegramUsername,
      telegramChatId: currentMembership?.telegramChatId || null
    });

    if (!ok) {
      return NextResponse.json(
        { ok: false, message: 'Gagal menyimpan username Telegram.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'Username Telegram berhasil disimpan.',
      membershipStatus: currentMembership?.status || 'invited',
      telegramUsername
    });
  } catch (error) {
    console.error('[USER_TELEBOT_PROFILE] POST error:', error);
    return NextResponse.json(
      { ok: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
