import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import getTursoClient, { initDatabase } from '@/lib/turso';

export const dynamic = 'force-dynamic';

function normalizeTelegramUsername(username?: string | null): string | null {
  const value = String(username || '').trim().replace(/^@+/, '').toLowerCase();
  return value || null;
}

const TELEBOT_PAYMENT_OPTIONS: Record<string, number> = {
  '1month': 175000,
  'lifetime': 375000,
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const planCode = String(body?.planCode || 'TELEBOT').trim().toUpperCase();
    const durationCode = String(body?.durationCode || '1month').trim().toLowerCase();
    const telegramUsername = normalizeTelegramUsername(body?.telegramUsername);

    if (planCode !== 'TELEBOT') {
      return NextResponse.json(
        { ok: false, message: 'Plan code tidak valid.' },
        { status: 400 }
      );
    }

    const expectedAmount = TELEBOT_PAYMENT_OPTIONS[durationCode];
    if (!expectedAmount) {
      return NextResponse.json(
        { ok: false, message: 'Durasi TELEBOT tidak valid.' },
        { status: 400 }
      );
    }

    await initDatabase();
    const turso = getTursoClient();
    if (!turso) {
      return NextResponse.json(
        { ok: false, message: 'Database not configured' },
        { status: 500 }
      );
    }

    await turso.execute({
      sql: `INSERT INTO telebot_payment_confirmations (
              user_id,
              email,
              display_name,
              plan_code,
              duration_code,
              amount_idr,
              telegram_username,
              payment_channel,
              status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'QRIS_MANUAL', 'submitted')`,
      args: [
        userId,
        session.user.email || null,
        session.user.name || null,
        planCode,
        durationCode,
        expectedAmount,
        telegramUsername
      ]
    });

    return NextResponse.json({
      ok: true,
      message: 'Konfirmasi pembayaran TELEBOT berhasil disimpan.'
    });
  } catch (error) {
    console.error('[USER_TELEBOT_PAYMENT_CONFIRMATION] POST error:', error);
    return NextResponse.json(
      { ok: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
