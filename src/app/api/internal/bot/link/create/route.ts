import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { createPrivateBotLinkCode, getPrivateBotMembershipByUserId } from '@/lib/turso';

function isAuthorized(request: Request) {
  const token = process.env.ARRA_INTERNAL_TOKEN;
  if (!token) return false;
  return request.headers.get('authorization') === `Bearer ${token}`;
}

function generateLinkCode() {
  return randomBytes(4).toString('hex').toUpperCase();
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const userId = String(body?.userId || '').trim();
    const ttlMinutes = Number(body?.ttlMinutes || 15);

    if (!userId) {
      return NextResponse.json({ ok: false, message: 'Missing userId' }, { status: 400 });
    }

    const membership = await getPrivateBotMembershipByUserId(userId);
    if (!membership || membership.status !== 'active') {
      return NextResponse.json({ ok: false, message: 'Membership is not active' }, { status: 403 });
    }

    const code = generateLinkCode();
    const saved = await createPrivateBotLinkCode(userId, code, ttlMinutes);
    if (!saved) {
      return NextResponse.json({ ok: false, message: 'Failed to create code' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      code,
      expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString()
    });
  } catch (error) {
    console.error('[INTERNAL_BOT_LINK_CREATE] Error:', error);
    return NextResponse.json({ ok: false, message: 'Internal server error' }, { status: 500 });
  }
}
