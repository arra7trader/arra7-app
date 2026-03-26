import { NextResponse } from 'next/server';
import { getPrivateBotMembershipByChatId, getPrivateBotMembershipByUserId } from '@/lib/turso';

function isAuthorized(request: Request) {
  const token = process.env.ARRA_INTERNAL_TOKEN;
  if (!token) return false;
  return request.headers.get('authorization') === `Bearer ${token}`;
}

export async function GET(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');
    const userId = searchParams.get('userId');

    let membership = null;
    if (chatId) {
      membership = await getPrivateBotMembershipByChatId(chatId);
    } else if (userId) {
      membership = await getPrivateBotMembershipByUserId(userId);
    }

    return NextResponse.json({
      ok: true,
      membership
    });
  } catch (error) {
    console.error('[INTERNAL_BOT_STATUS] Error:', error);
    return NextResponse.json({ ok: false, message: 'Internal server error' }, { status: 500 });
  }
}
