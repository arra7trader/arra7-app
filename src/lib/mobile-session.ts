import { createHmac, timingSafeEqual } from 'crypto';
import getTursoClient from '@/lib/turso';
import { getUserMembership } from '@/lib/turso';
import { verifyMobileToken } from '@/lib/mobile-auth';

const MOBILE_TOKEN_ISSUER = 'arra7-mobile';
const MOBILE_TOKEN_VERSION = 1;
const MOBILE_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface MobileTokenPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
  iss: string;
  typ: 'mobile_access';
  ver: number;
}

export interface ResolvedMobileUser {
  userId: string;
  email: string;
  authType: 'app_token' | 'legacy_google_token';
}

export interface MobileUserRecord {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

function getMobileTokenSecret(): string {
  const secret = process.env.MOBILE_APP_JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('Missing MOBILE_APP_JWT_SECRET or NEXTAUTH_SECRET');
  }
  return secret;
}

function toBase64Url(value: string | Buffer): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value: string): Buffer {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(normalized + '='.repeat(padding), 'base64');
}

function signPayload(payloadEncoded: string, secret: string): string {
  const signature = createHmac('sha256', secret).update(payloadEncoded).digest();
  return toBase64Url(signature);
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export function createMobileAccessToken(input: {
  userId: string;
  email: string;
  ttlSeconds?: number;
}): { token: string; expiresAt: string } {
  const nowSec = Math.floor(Date.now() / 1000);
  const ttl = input.ttlSeconds ?? MOBILE_TOKEN_TTL_SECONDS;
  const payload: MobileTokenPayload = {
    sub: input.userId,
    email: input.email,
    iat: nowSec,
    exp: nowSec + ttl,
    iss: MOBILE_TOKEN_ISSUER,
    typ: 'mobile_access',
    ver: MOBILE_TOKEN_VERSION,
  };

  const payloadEncoded = toBase64Url(JSON.stringify(payload));
  const signature = signPayload(payloadEncoded, getMobileTokenSecret());

  return {
    token: `${payloadEncoded}.${signature}`,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
  };
}

export function verifyMobileAccessToken(token: string): MobileTokenPayload | null {
  try {
    const [payloadEncoded, signature] = token.split('.');
    if (!payloadEncoded || !signature) return null;

    const expectedSignature = signPayload(payloadEncoded, getMobileTokenSecret());
    if (!safeEqual(signature, expectedSignature)) return null;

    const payloadRaw = fromBase64Url(payloadEncoded).toString('utf8');
    const payload = JSON.parse(payloadRaw) as MobileTokenPayload;
    if (!payload?.sub || !payload?.email || !payload?.exp) return null;
    if (payload.typ !== 'mobile_access' || payload.iss !== MOBILE_TOKEN_ISSUER) return null;
    if (payload.ver !== MOBILE_TOKEN_VERSION) return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

async function getUserIdByEmail(email: string): Promise<string | null> {
  const turso = getTursoClient();
  if (!turso) return null;

  try {
    const res = await turso.execute({
      sql: 'SELECT id FROM users WHERE email = ? LIMIT 1',
      args: [email],
    });
    if (res.rows.length === 0) return null;
    return String(res.rows[0].id || '');
  } catch (error) {
    console.error('[MOBILE_SESSION] getUserIdByEmail error:', error);
    return null;
  }
}

export async function resolveMobileUserFromRequest(
  request: Request,
  options: { allowLegacyGoogleIdToken?: boolean } = {}
): Promise<ResolvedMobileUser | null> {
  const authHeader =
    request.headers.get('authorization') ?? request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const bearerToken = authHeader.slice(7).trim();
  if (!bearerToken) return null;

  const appTokenPayload = verifyMobileAccessToken(bearerToken);
  if (appTokenPayload) {
    return {
      userId: appTokenPayload.sub,
      email: appTokenPayload.email,
      authType: 'app_token',
    };
  }

  if (!options.allowLegacyGoogleIdToken) return null;

  const legacyEmail = await verifyMobileToken(bearerToken);
  if (!legacyEmail) return null;

  const legacyUserId = await getUserIdByEmail(legacyEmail);
  if (!legacyUserId) return null;

  return {
    userId: legacyUserId,
    email: legacyEmail,
    authType: 'legacy_google_token',
  };
}

export async function getMobileUserRecord(userId: string): Promise<MobileUserRecord | null> {
  const turso = getTursoClient();
  if (!turso) return null;

  try {
    const res = await turso.execute({
      sql: 'SELECT id, email, name, image FROM users WHERE id = ? LIMIT 1',
      args: [userId],
    });

    if (res.rows.length === 0) return null;

    return {
      id: String(res.rows[0].id || userId),
      email: String(res.rows[0].email || ''),
      name: res.rows[0].name ? String(res.rows[0].name) : null,
      image: res.rows[0].image ? String(res.rows[0].image) : null,
    };
  } catch (error) {
    console.error('[MOBILE_SESSION] getMobileUserRecord error:', error);
    return null;
  }
}

export async function getMobileTier(userId: string): Promise<string> {
  const membership = await getUserMembership(userId);
  return membership.membership || 'BASIC';
}
