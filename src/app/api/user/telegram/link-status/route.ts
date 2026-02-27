import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserMembership, getUserSubscription } from '@/lib/turso';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { membership, expiresAt } = await getUserMembership(userId);
    const subscription = await getUserSubscription(userId);
    const telegramChatId = subscription.telegramChatId || null;
    const isVvipActive = membership === 'VVIP';

    return NextResponse.json({
      ok: true,
      membership,
      isVvipActive,
      membershipExpiresAt: expiresAt ? expiresAt.toISOString() : null,
      linked: !!telegramChatId,
      telegramChatId,
      botUsername: process.env.TELEGRAM_BOT_USERNAME || 'arra7trader_bot',
    });
  } catch (error) {
    console.error('[TELEGRAM_LINK_STATUS] GET error:', error);
    return NextResponse.json(
      { ok: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
