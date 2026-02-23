import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { NextRequest } from 'next/server';
import { CT77_CONFIG } from '@/lib/copytrade77-config';
import { getCopytrade77AdminClient } from '@/lib/supabase-copytrade77';

export interface BridgeTerminalAuthContext {
  terminalId: string;
  profileId: string;
  followId: string | null;
  bridgeKey: string;
}

function toHexHmac(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const left = Buffer.from(a, 'hex');
    const right = Buffer.from(b, 'hex');
    if (left.length !== right.length) return false;
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

function tryParseBody(rawBody: string): Record<string, unknown> {
  try {
    if (!rawBody || !rawBody.trim()) return {};
    const parsed = JSON.parse(rawBody);
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function extractLegacyBridgeKey(request: NextRequest, rawBody: string): string | null {
  const queryKey =
    request.nextUrl.searchParams.get('bridgeKey') ||
    request.nextUrl.searchParams.get('api_key');
  if (queryKey && queryKey.trim()) return queryKey.trim();

  const body = tryParseBody(rawBody);
  const bodyKey =
    (typeof body.bridgeKey === 'string' && body.bridgeKey) ||
    (typeof body.apiKey === 'string' && body.apiKey);
  if (bodyKey && bodyKey.trim()) return bodyKey.trim();

  const headerKey = request.headers.get('X-ARRA-KEY');
  if (headerKey && headerKey.trim()) return headerKey.trim();

  return null;
}

export function generateBridgeCredentials(): { bridgeKey: string; bridgeSecret: string } {
  const bridgeKey = `ct77_${randomBytes(12).toString('hex')}`;
  const bridgeSecret = randomBytes(32).toString('hex');
  return { bridgeKey, bridgeSecret };
}

export async function verifyBridgeRequest(
  request: NextRequest,
  rawBody: string
): Promise<BridgeTerminalAuthContext> {
  const supabase = getCopytrade77AdminClient();
  const schema = supabase.schema('copytrade77');

  const signedBridgeKey = request.headers.get('X-ARRA-KEY')?.trim() || null;
  const signedTs = request.headers.get('X-ARRA-TS')?.trim() || null;
  const signedNonce = request.headers.get('X-ARRA-NONCE')?.trim() || null;
  const signedSign = request.headers.get('X-ARRA-SIGN')?.trim() || null;
  const hasAllSignedHeaders = Boolean(signedBridgeKey && signedTs && signedNonce && signedSign);

  const bridgeKey = hasAllSignedHeaders
    ? signedBridgeKey
    : extractLegacyBridgeKey(request, rawBody);

  if (!bridgeKey) {
    throw new Error('MISSING_X_ARRA_KEY');
  }

  const { data: terminal, error: terminalError } = await schema
    .from('bridge_terminals')
    .select('id, profile_id, follow_id, bridge_key, bridge_secret, status')
    .eq('bridge_key', bridgeKey)
    .maybeSingle();

  if (terminalError) {
    throw terminalError;
  }

  if (!terminal || terminal.status === 'BLOCKED') {
    throw new Error('TERMINAL_NOT_FOUND');
  }

  if (hasAllSignedHeaders) {
    const ts = Number.parseInt(String(signedTs), 10);
    if (!Number.isFinite(ts)) {
      throw new Error('INVALID_TIMESTAMP');
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - ts) > CT77_CONFIG.bridgeMaxSkewSeconds) {
      throw new Error('TIMESTAMP_SKEW');
    }

    const method = request.method.toUpperCase();
    const path = new URL(request.url).pathname;
    const canonical = `${method}\n${signedTs}\n${path}\n${signedNonce}\n${rawBody}`;
    const expectedSign = toHexHmac(String(terminal.bridge_secret || ''), canonical);

    if (!safeEqualHex(expectedSign, String(signedSign))) {
      throw new Error('INVALID_SIGNATURE');
    }

    // Lazy cleanup for nonce table without cron.
    await schema
      .from('bridge_nonces')
      .delete()
      .lt('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString());

    const { error: nonceError } = await schema.from('bridge_nonces').insert({
      bridge_key: bridgeKey,
      nonce: String(signedNonce),
      ts,
    });

    if (nonceError) {
      if (nonceError.code === '23505') {
        throw new Error('REPLAY_BLOCKED');
      }
      throw nonceError;
    }
  }

  return {
    terminalId: terminal.id as string,
    profileId: terminal.profile_id as string,
    followId: (terminal.follow_id as string | null) ?? null,
    bridgeKey,
  };
}
