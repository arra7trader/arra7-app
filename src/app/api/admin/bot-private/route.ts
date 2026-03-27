import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import getTursoClient, { createPrivateBotLinkCode, initDatabase, upsertPrivateBotMembership } from '@/lib/turso';
import { isAdminEmail } from '@/lib/admin-access';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

function generateLinkCode() {
  return randomBytes(4).toString('hex').toUpperCase();
}

async function ensureBotPrivateSchema(turso: ReturnType<typeof getTursoClient>) {
  if (!turso) return;

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS bot_memberships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE,
      plan_code TEXT NOT NULL DEFAULT 'TELEBOT',
      status TEXT NOT NULL DEFAULT 'invited',
      source TEXT NOT NULL DEFAULT 'ARRA7',
      telegram_username TEXT,
      telegram_chat_id TEXT,
      invited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      activated_at DATETIME,
      expires_at DATETIME,
      metadata_json TEXT
    )
  `);

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS bot_link_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      code_hash TEXT NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      used_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await turso.execute(`CREATE INDEX IF NOT EXISTS idx_bot_memberships_status ON bot_memberships(status)`);
  await turso.execute(`CREATE INDEX IF NOT EXISTS idx_bot_memberships_telegram_chat_id ON bot_memberships(telegram_chat_id)`);

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS telebot_payment_confirmations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      email TEXT,
      display_name TEXT,
      plan_code TEXT NOT NULL DEFAULT 'TELEBOT',
      duration_code TEXT NOT NULL DEFAULT '1month',
      amount_idr INTEGER NOT NULL DEFAULT 175000,
      telegram_username TEXT,
      payment_channel TEXT NOT NULL DEFAULT 'QRIS_MANUAL',
      status TEXT NOT NULL DEFAULT 'submitted',
      admin_note TEXT,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      verified_at DATETIME
    )
  `);

  await turso.execute(`CREATE INDEX IF NOT EXISTS idx_telebot_payment_confirmations_user_id ON telebot_payment_confirmations(user_id)`);
  await turso.execute(`CREATE INDEX IF NOT EXISTS idx_telebot_payment_confirmations_status ON telebot_payment_confirmations(status)`);

  try {
    await turso.execute(`ALTER TABLE bot_memberships ADD COLUMN telegram_username TEXT`);
  } catch (error: any) {
    if (!String(error?.message || '').includes('duplicate column name')) {
      console.error('[ADMIN_BOT_PRIVATE] Failed to add telegram_username column:', error);
    }
  }

  try {
    await turso.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_bot_memberships_telegram_username ON bot_memberships(telegram_username)`);
  } catch (error) {
    console.error('[ADMIN_BOT_PRIVATE] Failed to ensure telegram_username index:', error);
  }
}

async function fetchMembershipRows(turso: ReturnType<typeof getTursoClient>) {
  if (!turso) return [];

  try {
    const result = await turso.execute(`
      SELECT
        bm.user_id,
        COALESCE(u.email, '') AS email,
        COALESCE(u.name, '') AS name,
        bm.plan_code,
        bm.status,
        bm.telegram_username,
        bm.telegram_chat_id,
        bm.source,
        bm.invited_at,
        bm.activated_at,
        bm.expires_at
      FROM bot_memberships bm
      LEFT JOIN users u ON u.id = bm.user_id
      ORDER BY
        CASE bm.status
          WHEN 'active' THEN 1
          WHEN 'invited' THEN 2
          WHEN 'expired' THEN 3
          ELSE 4
        END,
        bm.id DESC
    `);
    return result.rows;
  } catch (primaryError) {
    console.error('[ADMIN_BOT_PRIVATE] Primary membership query failed, using fallback:', primaryError);
    const fallback = await turso.execute(`
      SELECT
        user_id,
        '' AS email,
        '' AS name,
        plan_code,
        status,
        telegram_username,
        telegram_chat_id,
        source,
        invited_at,
        activated_at,
        expires_at
      FROM bot_memberships
      ORDER BY id DESC
    `);
    return fallback.rows;
  }
}

async function syncExpiredMemberships(turso: ReturnType<typeof getTursoClient>) {
  if (!turso) return;

  await turso.execute(`
    UPDATE bot_memberships
    SET status = 'expired'
    WHERE status = 'active'
      AND expires_at IS NOT NULL
      AND datetime(expires_at) <= datetime('now')
  `);
}

async function fetchPaymentConfirmationRows(turso: ReturnType<typeof getTursoClient>) {
  if (!turso) return [];

  const result = await turso.execute(`
    SELECT
      id,
      user_id,
      COALESCE(email, '') AS email,
      COALESCE(display_name, '') AS display_name,
      plan_code,
      duration_code,
      amount_idr,
      telegram_username,
      payment_channel,
      status,
      admin_note,
      submitted_at,
      verified_at
    FROM telebot_payment_confirmations
    ORDER BY id DESC
    LIMIT 100
  `);

  return result.rows;
}

async function markLatestPaymentConfirmation(
  turso: ReturnType<typeof getTursoClient>,
  userId: string,
  status: 'approved' | 'rejected',
  adminNote?: string | null
) {
  if (!turso) return;

  await turso.execute({
    sql: `UPDATE telebot_payment_confirmations
          SET status = ?,
              admin_note = COALESCE(?, admin_note),
              verified_at = CURRENT_TIMESTAMP
          WHERE id = (
            SELECT id
            FROM telebot_payment_confirmations
            WHERE user_id = ?
              AND status = 'submitted'
            ORDER BY id DESC
            LIMIT 1
          )`,
    args: [status, adminNote ?? null, userId]
  });
}

async function deleteTelebotAccount(turso: ReturnType<typeof getTursoClient>, userId: string) {
  if (!turso) return false;

  try {
    await turso.execute({
      sql: `DELETE FROM bot_memberships WHERE user_id = ?`,
      args: [userId]
    });

    await turso.execute({
      sql: `DELETE FROM bot_link_codes WHERE user_id = ?`,
      args: [userId]
    });

    await turso.execute({
      sql: `DELETE FROM telebot_payment_confirmations WHERE user_id = ?`,
      args: [userId]
    });

    await turso.execute({
      sql: `DELETE FROM telegram_users WHERE user_id = ?`,
      args: [userId]
    });

    await turso.execute({
      sql: `UPDATE users SET telegram_chat_id = NULL WHERE id = ?`,
      args: [userId]
    });

    return true;
  } catch (error) {
    console.error('[ADMIN_BOT_PRIVATE] deleteTelebotAccount error:', error);
    return false;
  }
}

async function resolveUserId(
  turso: ReturnType<typeof getTursoClient>,
  userId?: string,
  email?: string,
  telegramUsername?: string | null
) {
  if (!turso) return null;

  const normalizedTelegramUsername = normalizeTelegramUsername(telegramUsername);

  if (normalizedTelegramUsername) {
    const fromMembership = await turso.execute({
      sql: `SELECT u.id, u.email, u.name
            FROM bot_memberships bm
            LEFT JOIN users u ON u.id = bm.user_id
            WHERE lower(trim(bm.telegram_username)) = ?
            LIMIT 1`,
      args: [normalizedTelegramUsername]
    });
    if (fromMembership.rows[0]) {
      return fromMembership.rows[0];
    }

    const fromPaymentConfirmation = await turso.execute({
      sql: `SELECT u.id, u.email, u.name
            FROM telebot_payment_confirmations pc
            LEFT JOIN users u ON u.id = pc.user_id
            WHERE lower(trim(pc.telegram_username)) = ?
            ORDER BY pc.id DESC
            LIMIT 1`,
      args: [normalizedTelegramUsername]
    });
    if (fromPaymentConfirmation.rows[0]) {
      return fromPaymentConfirmation.rows[0];
    }
  }

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

function normalizeTelegramUsername(username?: string | null) {
  const value = String(username || '').trim().replace(/^@+/, '').toLowerCase();
  return value || null;
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

    await initDatabase();
    await ensureBotPrivateSchema(turso);
    await syncExpiredMemberships(turso);
    const [rows, paymentRows] = await Promise.all([
      fetchMembershipRows(turso),
      fetchPaymentConfirmationRows(turso)
    ]);

    return NextResponse.json({
      status: 'success',
      memberships: rows.map((row) => ({
        userId: row.user_id,
        email: row.email,
        name: row.name,
        planCode: row.plan_code,
        status: row.status,
        telegramUsername: row.telegram_username,
        telegramChatId: row.telegram_chat_id,
        source: row.source,
        invitedAt: row.invited_at,
        activatedAt: row.activated_at,
        expiresAt: row.expires_at
      })),
      paymentConfirmations: paymentRows.map((row) => ({
        id: Number(row.id),
        userId: String(row.user_id),
        email: String(row.email || ''),
        displayName: String(row.display_name || ''),
        planCode: String(row.plan_code || 'TELEBOT'),
        durationCode: String(row.duration_code || '1month'),
        amountIdr: Number(row.amount_idr || 0),
        telegramUsername: row.telegram_username ? String(row.telegram_username) : null,
        paymentChannel: String(row.payment_channel || 'QRIS_MANUAL'),
        status: String(row.status || 'submitted'),
        adminNote: row.admin_note ? String(row.admin_note) : null,
        submittedAt: row.submitted_at ? String(row.submitted_at) : null,
        verifiedAt: row.verified_at ? String(row.verified_at) : null
      }))
    });
  } catch (error) {
    console.error('[ADMIN_BOT_PRIVATE] GET error:', error);
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? `Failed to fetch bot memberships: ${error.message}` : 'Failed to fetch bot memberships'
    }, { status: 500 });
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

    await initDatabase();
    await ensureBotPrivateSchema(turso);

    const body = await request.json();
    const action = String(body?.action || '').trim();
    const telegramUsername = normalizeTelegramUsername(body?.telegramUsername);
    const userRow = await resolveUserId(turso, body?.userId, body?.email, telegramUsername);

    if (!userRow) {
      return NextResponse.json({ status: 'error', message: 'User tidak ditemukan dari username Telegram ini.' }, { status: 404 });
    }

    const userId = String(userRow.id);
    const days = Math.max(1, Math.min(365, Number(body?.days || 30)));
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    if (action === 'invite') {
      const ok = await upsertPrivateBotMembership({
        userId,
        status: 'invited',
        planCode: 'TELEBOT',
        telegramUsername
      });
      return NextResponse.json({
        status: ok ? 'success' : 'error',
        message: ok ? 'User TELEBOT berhasil ditandai pending approval.' : 'Gagal membuat status pending.'
      });
    }

    if (action === 'activate') {
      const ok = await upsertPrivateBotMembership({
        userId,
        status: 'active',
        planCode: 'TELEBOT',
        expiresAt,
        telegramUsername
      });
      if (ok) {
        await markLatestPaymentConfirmation(turso, userId, 'approved', 'TELEBOT di-approve admin.');
      }
      return NextResponse.json({
        status: ok ? 'success' : 'error',
        message: ok ? `Akses TELEBOT aktif ${days} hari.` : 'Gagal mengaktifkan akses TELEBOT.',
        expiresAt
      });
    }

    if (action === 'deactivate' || action === 'revoke') {
      const ok = await upsertPrivateBotMembership({
        userId,
        status: 'revoked',
        planCode: 'TELEBOT',
        telegramUsername
      });
      if (ok) {
        await markLatestPaymentConfirmation(turso, userId, 'rejected', 'Akses TELEBOT dicabut admin.');
      }
      return NextResponse.json({
        status: ok ? 'success' : 'error',
        message: ok ? 'Akses TELEBOT berhasil dicabut.' : 'Gagal mencabut akses TELEBOT.'
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

    if (action === 'delete') {
      const ok = await deleteTelebotAccount(turso, userId);
      return NextResponse.json({
        status: ok ? 'success' : 'error',
        message: ok ? 'Akun TELEBOT berhasil dihapus dan Telegram di-unlink.' : 'Gagal menghapus akun TELEBOT.'
      });
    }

    return NextResponse.json({ status: 'error', message: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[ADMIN_BOT_PRIVATE] POST error:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to update TELEBOT membership' }, { status: 500 });
  }
}
