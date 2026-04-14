import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import getTursoClient, { initDatabase, upsertPrivateBotMembership } from '@/lib/turso';
import { isAdminEmail } from '@/lib/admin-access';
import { getTelebotBonusPageUrl } from '@/lib/telebot-bonus';

export const dynamic = 'force-dynamic';

const TELEBOT_PRO_BONUS_SLOT_KEY = 'TELEBOT';
const TELEBOT_PRO_BONUS_DURATION = '1month';
const TELEBOT_PRO_BONUS_MAX = 50;
const TELEBOT_PRO_BONUS_DAYS = 30;
const TELEBOT_LIFETIME_DURATION = 'lifetime';
const TELEBOT_LIFETIME_MAX = 100;

const TELEBOT_DURATION_OPTIONS: Record<string, { days: number | null; label: string; amountIdr: number }> = {
  '1month': { days: 30, label: '1 Bulan', amountIdr: 175000 },
  'lifetime': { days: null, label: 'Lifetime', amountIdr: 375000 },
};

type MetadataJson = Record<string, unknown>;
type TelebotLifetimePromoMetadata = { grantedAt?: string; source?: string };
type WebsiteProBonusMetadata = { grantedAt?: string; expiresAt?: string; durationDays?: number; source?: string };

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
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('duplicate column name')) {
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

async function fetchStartedTelegramContacts(turso: ReturnType<typeof getTursoClient>) {
  if (!turso) return [];

  const result = await turso.execute(`
    SELECT
      c.chat_id,
      c.username,
      c.first_name,
      c.started_at,
      c.first_seen_at,
      c.last_seen_at,
      c.last_command,
      c.last_message_text,
      bm.user_id,
      COALESCE(u.email, '') AS email,
      COALESCE(u.name, '') AS name,
      bm.status AS telebot_status,
      bm.expires_at AS telebot_expires_at
    FROM telegram_contacts c
    LEFT JOIN bot_memberships bm
      ON bm.telegram_chat_id = c.chat_id
      OR (
        c.username IS NOT NULL
        AND lower(trim(replace(c.username, '@', ''))) = lower(trim(bm.telegram_username))
      )
    LEFT JOIN users u ON u.id = bm.user_id
    WHERE c.started_at IS NOT NULL
    ORDER BY c.started_at DESC, c.last_seen_at DESC
  `);

  return result.rows;
}

function isActiveTelebotStatus(status?: string | null, expiresAt?: string | null) {
  if (String(status || '').toLowerCase() !== 'active') return false;
  if (!expiresAt) return true;
  const expiresTime = new Date(expiresAt).getTime();
  return Number.isFinite(expiresTime) && expiresTime > Date.now();
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

function parseMetadataJson(raw: unknown): MetadataJson {
  if (typeof raw !== 'string' || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function getTelebotLifetimePromoMetadata(metadata: MetadataJson): TelebotLifetimePromoMetadata | null {
  const value = metadata.telebotLifetimePromo;
  if (!value || typeof value !== 'object') return null;
  return value as TelebotLifetimePromoMetadata;
}

function getWebsiteProBonusMetadata(metadata: MetadataJson): WebsiteProBonusMetadata | null {
  const value = metadata.websiteProBonus;
  if (!value || typeof value !== 'object') return null;
  return value as WebsiteProBonusMetadata;
}

async function getTelebotLifetimePromoState(
  turso: ReturnType<typeof getTursoClient>,
  userId: string
): Promise<{ metadata: MetadataJson; alreadyGranted: boolean; remaining: number; max: number; used: number; slotsFull: boolean }> {
  if (!turso) {
    return { metadata: {}, alreadyGranted: false, remaining: 0, max: TELEBOT_LIFETIME_MAX, used: 0, slotsFull: true };
  }

  const membershipResult = await turso.execute({
    sql: `SELECT metadata_json FROM bot_memberships WHERE user_id = ? LIMIT 1`,
    args: [userId]
  });
  const metadata = parseMetadataJson(membershipResult.rows[0]?.metadata_json);
  const telebotLifetimePromo = getTelebotLifetimePromoMetadata(metadata);
  const alreadyGranted = Boolean(telebotLifetimePromo?.grantedAt);

  const slotResult = await turso.execute({
    sql: `SELECT used_count, max_count FROM promo_slots WHERE membership = ? AND duration = ? LIMIT 1`,
    args: ['TELEBOT', TELEBOT_LIFETIME_DURATION]
  });
  const used = Number(slotResult.rows[0]?.used_count || 0);
  const max = Number(slotResult.rows[0]?.max_count || TELEBOT_LIFETIME_MAX);
  const remaining = Math.max(0, max - used);

  return {
    metadata,
    alreadyGranted,
    remaining,
    max,
    used,
    slotsFull: !alreadyGranted && used >= max
  };
}

async function finalizeTelebotLifetimePromoClaim(
  turso: ReturnType<typeof getTursoClient>,
  userId: string,
  metadata: MetadataJson
) {
  if (!turso) return false;

  const nowIso = new Date().toISOString();

  await turso.execute({
    sql: `INSERT INTO promo_slots (membership, duration, used_count, max_count)
          VALUES (?, ?, 1, ?)
          ON CONFLICT(membership, duration)
          DO UPDATE SET used_count = used_count + 1, max_count = excluded.max_count, updated_at = CURRENT_TIMESTAMP`,
    args: ['TELEBOT', TELEBOT_LIFETIME_DURATION, TELEBOT_LIFETIME_MAX]
  });

  const nextMetadata = {
    ...metadata,
    telebotLifetimePromo: {
      grantedAt: nowIso,
      source: 'TELEBOT_LIFETIME_100'
    }
  };

  await turso.execute({
    sql: `UPDATE bot_memberships
          SET metadata_json = ?
          WHERE user_id = ?`,
    args: [JSON.stringify(nextMetadata), userId]
  });

  return true;
}

async function grantTelebotWebsiteProBonus(
  turso: ReturnType<typeof getTursoClient>,
  userId: string
): Promise<{ granted: boolean; expiresAt?: string | null; reason?: string; remaining?: number }> {
  if (!turso) return { granted: false, reason: 'db_unavailable' };

  const userResult = await turso.execute({
    sql: `SELECT membership, membership_expires FROM users WHERE id = ? LIMIT 1`,
    args: [userId]
  });
  const userRow = userResult.rows[0];
  if (!userRow) {
    return { granted: false, reason: 'user_not_found' };
  }

  const currentMembership = String(userRow.membership || 'BASIC').toUpperCase();
  if (currentMembership === 'ADMIN' || currentMembership === 'VVIP') {
    return { granted: false, reason: 'higher_tier' };
  }

  const membershipResult = await turso.execute({
    sql: `SELECT metadata_json FROM bot_memberships WHERE user_id = ? LIMIT 1`,
    args: [userId]
  });
  const metadata = parseMetadataJson(membershipResult.rows[0]?.metadata_json);
  const existingBonus = getWebsiteProBonusMetadata(metadata);
  if (existingBonus?.grantedAt) {
    return {
      granted: false,
      reason: 'already_granted',
      expiresAt: typeof existingBonus.expiresAt === 'string' ? existingBonus.expiresAt : null
    };
  }

  const slotResult = await turso.execute({
    sql: `SELECT used_count, max_count FROM promo_slots WHERE membership = ? AND duration = ? LIMIT 1`,
    args: [TELEBOT_PRO_BONUS_SLOT_KEY, TELEBOT_PRO_BONUS_DURATION]
  });
  const usedCount = Number(slotResult.rows[0]?.used_count || 0);
  const maxCount = Number(slotResult.rows[0]?.max_count || TELEBOT_PRO_BONUS_MAX);
  if (usedCount >= maxCount) {
    return { granted: false, reason: 'slots_full', remaining: 0 };
  }

  const now = new Date();
  const currentExpiryRaw = userRow.membership_expires ? String(userRow.membership_expires) : null;
  const currentExpiry = currentExpiryRaw ? new Date(currentExpiryRaw) : null;
  const baseDate = currentMembership === 'PRO' && currentExpiry && currentExpiry > now ? currentExpiry : now;
  const nextExpiry = new Date(baseDate);
  nextExpiry.setDate(nextExpiry.getDate() + TELEBOT_PRO_BONUS_DAYS);
  const nextExpiryIso = nextExpiry.toISOString();

  await turso.execute({
    sql: `UPDATE users
          SET membership = 'PRO',
              membership_expires = ?
          WHERE id = ?`,
    args: [nextExpiryIso, userId]
  });

  await turso.execute({
    sql: `INSERT INTO promo_slots (membership, duration, used_count, max_count)
          VALUES (?, ?, 1, ?)
          ON CONFLICT(membership, duration)
          DO UPDATE SET used_count = used_count + 1, max_count = excluded.max_count, updated_at = CURRENT_TIMESTAMP`,
    args: [TELEBOT_PRO_BONUS_SLOT_KEY, TELEBOT_PRO_BONUS_DURATION, TELEBOT_PRO_BONUS_MAX]
  });

  const nextMetadata = {
    ...metadata,
    websiteProBonus: {
      grantedAt: now.toISOString(),
      expiresAt: nextExpiryIso,
      durationDays: TELEBOT_PRO_BONUS_DAYS,
      source: 'TELEBOT_LAUNCH_50'
    }
  };

  await turso.execute({
    sql: `UPDATE bot_memberships
          SET metadata_json = ?
          WHERE user_id = ?`,
    args: [JSON.stringify(nextMetadata), userId]
  });

  return {
    granted: true,
    expiresAt: nextExpiryIso,
    remaining: Math.max(0, maxCount - (usedCount + 1))
  };
}

async function backfillActiveTelebotWebsiteProBonuses(
  turso: ReturnType<typeof getTursoClient>
): Promise<{ processed: number; granted: number; skipped: number; exhausted: boolean }> {
  if (!turso) return { processed: 0, granted: 0, skipped: 0, exhausted: false };

  const activeMembers = await turso.execute(`
    SELECT user_id
    FROM bot_memberships
    WHERE plan_code = 'TELEBOT'
      AND status = 'active'
      AND (expires_at IS NULL OR datetime(expires_at) > datetime('now'))
    ORDER BY COALESCE(activated_at, invited_at, expires_at) ASC, id ASC
  `);

  let processed = 0;
  let granted = 0;
  let skipped = 0;
  let exhausted = false;

  for (const row of activeMembers.rows) {
    const userId = String(row.user_id || '');
    if (!userId) continue;
    processed += 1;

    const result = await grantTelebotWebsiteProBonus(turso, userId);
    if (result.granted) {
      granted += 1;
      continue;
    }

    skipped += 1;
    if (result.reason === 'slots_full') {
      exhausted = true;
      break;
    }
  }

  return { processed, granted, skipped, exhausted };
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
    const [rows, paymentRows, startedContacts] = await Promise.all([
      fetchMembershipRows(turso),
      fetchPaymentConfirmationRows(turso),
      fetchStartedTelegramContacts(turso)
    ]);

    const startedTelegramContacts = startedContacts.map((row) => {
      const telebotStatus = row.telebot_status ? String(row.telebot_status) : null;
      const telebotExpiresAt = row.telebot_expires_at ? String(row.telebot_expires_at) : null;
      const active = isActiveTelebotStatus(telebotStatus, telebotExpiresAt);

      return {
        chatId: String(row.chat_id || ''),
        username: row.username ? String(row.username) : null,
        firstName: row.first_name ? String(row.first_name) : null,
        userId: row.user_id ? String(row.user_id) : null,
        email: String(row.email || ''),
        name: String(row.name || ''),
        telebotStatus,
        telebotExpiresAt,
        isActive: active,
        startedAt: row.started_at ? String(row.started_at) : null,
        firstSeenAt: row.first_seen_at ? String(row.first_seen_at) : null,
        lastSeenAt: row.last_seen_at ? String(row.last_seen_at) : null,
        lastCommand: row.last_command ? String(row.last_command) : null,
        lastMessageText: row.last_message_text ? String(row.last_message_text) : null,
      };
    });

    const pendingStartedTelegramContacts = startedTelegramContacts.filter((item) => !item.isActive);

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
      })),
      startedTelegramContacts,
      pendingStartedTelegramContacts,
      startedTelegramSummary: {
        totalStarted: startedTelegramContacts.length,
        pendingActivation: pendingStartedTelegramContacts.length,
        active: startedTelegramContacts.length - pendingStartedTelegramContacts.length,
      }
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
    const requestedDurationCode = String(body?.durationCode || '1month').trim().toLowerCase();
    const durationConfig = TELEBOT_DURATION_OPTIONS[requestedDurationCode] || TELEBOT_DURATION_OPTIONS['1month'];
    const days = durationConfig.days === null
      ? null
      : Math.max(1, Math.min(3650, Number(body?.days || durationConfig.days)));
    const expiresAt = days === null
      ? null
      : new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

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
      const lifetimeState = requestedDurationCode === TELEBOT_LIFETIME_DURATION
        ? await getTelebotLifetimePromoState(turso, userId)
        : null;

      if (lifetimeState?.slotsFull) {
        return NextResponse.json({
          status: 'error',
          message: 'Promo lifetime TELEBOT untuk 100 orang pertama sudah habis.'
        }, { status: 400 });
      }

      const ok = await upsertPrivateBotMembership({
        userId,
        status: 'active',
        planCode: 'TELEBOT',
        expiresAt,
        telegramUsername
      });
      if (ok && lifetimeState && !lifetimeState.alreadyGranted) {
        await finalizeTelebotLifetimePromoClaim(turso, userId, lifetimeState.metadata);
      }
      const bonusResult = ok ? await grantTelebotWebsiteProBonus(turso, userId) : { granted: false, reason: 'activation_failed' as const };
      if (ok) {
        await markLatestPaymentConfirmation(turso, userId, 'approved', `TELEBOT ${durationConfig.label} di-approve admin.`);
      }
      const usernameForMessage = telegramUsername ? `@${telegramUsername}` : 'akun Telegram Anda';
      const expiryLabel = expiresAt
        ? new Date(expiresAt).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
          })
        : 'Lifetime';
      const websiteProLabel = bonusResult.expiresAt
        ? new Date(bonusResult.expiresAt).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
          })
        : null;
      const bonusVideoUrl = getTelebotBonusPageUrl();
      const bonusMessage = bonusResult.granted
        ? ` Bonus akun PRO website 1 bulan juga aktif sampai ${websiteProLabel}.`
        : bonusResult.reason === 'already_granted'
          ? ' Bonus akun PRO website sudah pernah diberikan sebelumnya.'
          : bonusResult.reason === 'higher_tier'
            ? ' Akun website user sudah berada di tier lebih tinggi, jadi bonus PRO tidak perlu ditambahkan.'
            : bonusResult.reason === 'slots_full'
              ? ' Kuota bonus akun PRO 1 bulan untuk 50 user pertama sudah habis.'
              : '';
      return NextResponse.json({
        status: ok ? 'success' : 'error',
        message: ok
          ? requestedDurationCode === TELEBOT_LIFETIME_DURATION
            ? `Akses TELEBOT lifetime berhasil aktif.${bonusMessage}`
            : `Akses TELEBOT aktif ${days} hari.${bonusMessage}`
          : 'Gagal mengaktifkan akses TELEBOT.',
        expiresAt,
        durationCode: requestedDurationCode,
        approvalMessage: ok
          ? [
            'ARRA7 TELEBOT',
            'Private AI Execution Desk',
            '',
            `Halo, akses Anda sudah aktif untuk ${usernameForMessage}.`,
            `Paket aktif: ${durationConfig.label}`,
            `Masa aktif: ${expiryLabel}`,
            bonusResult.granted && websiteProLabel ? `Bonus website: akun PRO aktif sampai ${websiteProLabel}` : null,
            `Bonus edukasi: video eksklusif Sniper Entry tersedia di ${bonusVideoUrl}`,
            bonusResult.reason === 'slots_full' ? 'Bonus akun PRO 1 bulan hanya berlaku untuk 50 user pertama dan saat ini kuotanya sudah habis.' : null,
            '',
            'Mulai dengan 3 langkah berikut:',
            '1. Buka bot dan kirim /start',
            '2. Isi Balance agar risk plan sesuai modal Anda',
            '3. Buka Signal dan pantau Live Status untuk monitoring setup',
            '4. Buka bonus video eksklusif untuk materi Edukasi Sniper Entry',
            '',
            'Selamat datang di private execution desk ARRA7.',
          ].filter(Boolean).join('\n')
          : null
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
      return NextResponse.json({
        status: 'error',
        message: 'TELEBOT tidak lagi memakai link code. Akses bot sekarang mengikuti username Telegram yang sudah di-approve admin.'
      }, { status: 400 });
    }

    if (action === 'delete') {
      const ok = await deleteTelebotAccount(turso, userId);
      return NextResponse.json({
        status: ok ? 'success' : 'error',
        message: ok ? 'Akun TELEBOT berhasil dihapus dan Telegram di-unlink.' : 'Gagal menghapus akun TELEBOT.'
      });
    }

    if (action === 'backfill_bonus') {
      const result = await backfillActiveTelebotWebsiteProBonuses(turso);
      return NextResponse.json({
        status: 'success',
        message: `Backfill bonus PRO selesai. Diproses ${result.processed} member, berhasil grant ${result.granted}, skip ${result.skipped}${result.exhausted ? '. Kuota bonus 50 user pertama sudah habis.' : '.'}`,
        result
      });
    }

    return NextResponse.json({ status: 'error', message: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[ADMIN_BOT_PRIVATE] POST error:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to update TELEBOT membership' }, { status: 500 });
  }
}
