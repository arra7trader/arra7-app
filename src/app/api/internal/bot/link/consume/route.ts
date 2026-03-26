import { NextResponse } from 'next/server';
import {
  attachPrivateBotTelegramChatId,
  findValidPrivateBotLinkCode,
  getPrivateBotMembershipByUserId,
  linkTelegramUser,
  markPrivateBotLinkCodeUsed,
  setUserTelegramChatId,
  upsertPrivateBotMembership
} from '@/lib/turso';

function isAuthorized(request: Request) {
  const token = process.env.ARRA_INTERNAL_TOKEN;
  if (!token) return false;
  return request.headers.get('authorization') === `Bearer ${token}`;
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const code = String(body?.code || '').trim().toUpperCase();
    const chatId = String(body?.chatId || '').trim();
    const username = body?.username ? String(body.username) : undefined;
    const firstName = body?.firstName ? String(body.firstName) : undefined;

    if (!code || !chatId) {
      return NextResponse.json({ ok: false, message: 'Missing code or chatId' }, { status: 400 });
    }

    const linkCode = await findValidPrivateBotLinkCode(code);
    if (!linkCode) {
      return NextResponse.json({ ok: false, message: 'Invalid link code' }, { status: 404 });
    }

    const membership = await getPrivateBotMembershipByUserId(linkCode.userId);
    if (!membership || membership.status !== 'active') {
      return NextResponse.json({ ok: false, message: 'Membership is not active' }, { status: 403 });
    }

    await linkTelegramUser(linkCode.userId, {
      chatId,
      username,
      firstName
    });
    await setUserTelegramChatId(linkCode.userId, chatId);
    await attachPrivateBotTelegramChatId(linkCode.userId, chatId);
    await upsertPrivateBotMembership({
      userId: linkCode.userId,
      status: 'active',
      planCode: membership.planCode,
      expiresAt: membership.expiresAt,
      telegramChatId: chatId
    });
    await markPrivateBotLinkCodeUsed(linkCode.id);

    const refreshed = await getPrivateBotMembershipByUserId(linkCode.userId);
    return NextResponse.json({
      ok: true,
      membership: refreshed
    });
  } catch (error) {
    console.error('[INTERNAL_BOT_LINK_CONSUME] Error:', error);
    return NextResponse.json({ ok: false, message: 'Internal server error' }, { status: 500 });
  }
}
