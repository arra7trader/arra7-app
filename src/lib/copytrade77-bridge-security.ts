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

function getHeaderOrThrow(request: NextRequest, name: string): string {
  const value = request.headers.get(name);
  if (!value || !value.trim()) {
    throw new Error(`MISSING_${name.toUpperCase().replace(/-/g, '_')}`);
  }
  return value.trim();
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
  const bridgeKey = getHeaderOrThrow(request, 'X-ARRA-KEY');
  const tsRaw = getHeaderOrThrow(request, 'X-ARRA-TS');
  const nonce = getHeaderOrThrow(request, 'X-ARRA-NONCE');
  const incomingSign = getHeaderOrThrow(request, 'X-ARRA-SIGN');

  const ts = Number.parseInt(tsRaw, 10);
  if (!Number.isFinite(ts)) {
    throw new Error('INVALID_TIMESTAMP');
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - ts) > CT77_CONFIG.bridgeMaxSkewSeconds) {
    throw new Error('TIMESTAMP_SKEW');
  }

  const supabase = getCopytrade77AdminClient();
  const schema = supabase.schema('copytrade77');

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

  const method = request.method.toUpperCase();
  const path = new URL(request.url).pathname;
  const canonical = `${method}\n${path}\n${tsRaw}\n${nonce}\n${rawBody}`;
  const expectedSign = toHexHmac(String(terminal.bridge_secret || ''), canonical);

  if (!safeEqualHex(expectedSign, incomingSign)) {
    throw new Error('INVALID_SIGNATURE');
  }

  // Lightweight lazy cleanup to keep nonce table bounded without cron.
  await schema
    .from('bridge_nonces')
    .delete()
    .lt('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString());

  const { error: nonceError } = await schema.from('bridge_nonces').insert({
    bridge_key: bridgeKey,
    nonce,
    ts,
  });

  if (nonceError) {
    if (nonceError.code === '23505') {
      throw new Error('REPLAY_BLOCKED');
    }
    throw nonceError;
  }

  return {
    terminalId: terminal.id as string,
    profileId: terminal.profile_id as string,
    followId: (terminal.follow_id as string | null) ?? null,
    bridgeKey,
  };
}
