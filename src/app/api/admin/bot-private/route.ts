import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import getTursoClient, { createPrivateBotLinkCode, upsertPrivateBotMembership } from '@/lib/turso';
import { isAdminEmail } from '@/lib/admin-access';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

function generateLinkCode() {
  return randomBytes(4).toString('hex').toUpperCase();
}

async function resolveUserId(turso: ReturnType<typeof getTursoClient>, userId?: string, email?: string) {
  if (!turso) return null;

  if (userId?.trim()) {
    const res = await turso.execute({
      sql: `SELECT id, email, name FROM users WHERE id = ? LIMIT 1`,
      args: [userId.trim()]
    });
    return res.rows[0] || null;
  }

  if (email?.trim()) {
    const res = await turso.execute({
      sql: `SELECT id, email, name FROM users WHERE lower(email) = lower(?) LIMIT 1`,
      args: [email.trim()]
    });
    return res.rows[0] || null;
  }

  return null;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdminEmail(session?.user?.email)) {
      return NextResponse.json({ status: 'error', message: 'Admin only' }, { status: 403 });
    }

    const turso = getTursoClient();
    if (!turso) {
      return NextResponse.json({ status: 'error', message: 'Database not configured' }, { status: 500 });
    }

    const result = await turso.execute(`
      SELECT
        bm.user_id,
        u.email,
        u.name,
        bm.plan_code,
        bm.status,
        bm.telegram_chat_id,
        bm.source,
        bm.invited_at,
        bm.activated_at,
        bm.expires_at
      FROM bot_memberships bm
      JOIN users u ON u.id = bm.user_id
      ORDER BY
        CASE bm.status
          WHEN 'active' THEN 1
          WHEN 'invited' THEN 2
          WHEN 'expired' THEN 3
          ELSE 4
        END,
        bm.id DESC
    `);

    return NextResponse.json({
      status: 'success',
      memberships: result.rows.map((row) => ({
        userId: row.user_id,
        email: row.email,
        name: row.name,
        planCode: row.plan_code,
        status: row.status,
        telegramChatId: row.telegram_chat_id,
        source: row.source,
        invitedAt: row.invited_at,
        activatedAt: row.activated_at,
        expiresAt: row.expires_at
      }))
    });
  } catch (error) {
    console.error('[ADMIN_BOT_PRIVATE] GET error:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to fetch bot memberships' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdminEmail(session?.user?.email)) {
      return NextResponse.json({ status: 'error', message: 'Admin only' }, { status: 403 });
    }

    const turso = getTursoClient();
    if (!turso) {
      return NextResponse.json({ status: 'error', message: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const action = String(body?.action || '').trim();
    const userRow = await resolveUserId(turso, body?.userId, body?.email);

    if (!userRow) {
      return NextResponse.json({ status: 'error', message: 'User tidak ditemukan' }, { status: 404 });
    }

    const userId = String(userRow.id);
    const days = Math.max(1, Math.min(365, Number(body?.days || 30)));
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    if (action === 'invite') {
      const ok = await upsertPrivateBotMembership({
        userId,
        status: 'invited',
        planCode: 'BOT_PRIVATE'
      });
      return NextResponse.json({
        status: ok ? 'success' : 'error',
        message: ok ? 'User berhasil diundang ke bot private.' : 'Gagal membuat invite.'
      });
    }

    if (action === 'activate') {
      const ok = await upsertPrivateBotMembership({
        userId,
        status: 'active',
        planCode: 'BOT_PRIVATE',
        expiresAt
      });
      return NextResponse.json({
        status: ok ? 'success' : 'error',
        message: ok ? `Akses bot aktif ${days} hari.` : 'Gagal mengaktifkan akses.',
        expiresAt
      });
    }

    if (action === 'revoke') {
      const ok = await upsertPrivateBotMembership({
        userId,
        status: 'revoked',
        planCode: 'BOT_PRIVATE'
      });
      return NextResponse.json({
        status: ok ? 'success' : 'error',
        message: ok ? 'Akses bot berhasil dicabut.' : 'Gagal mencabut akses.'
      });
    }

    if (action === 'create_link') {
      const code = generateLinkCode();
      const saved = await createPrivateBotLinkCode(userId, code, 15);
      return NextResponse.json({
        status: saved ? 'success' : 'error',
        message: saved ? 'Link code berhasil dibuat.' : 'Gagal membuat link code.',
        code: saved ? code : null,
        userId
      });
    }

    return NextResponse.json({ status: 'error', message: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[ADMIN_BOT_PRIVATE] POST error:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to update bot private membership' }, { status: 500 });
  }
}
