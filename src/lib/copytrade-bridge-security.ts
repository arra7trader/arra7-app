import crypto from 'crypto';
import type { NextRequest } from 'next/server';

type RateBucket = { count: number; resetAt: number };

const rateBuckets = new Map<string, RateBucket>();
const nonceStore = new Map<string, number>();

function pruneCaches(now: number) {
    for (const [key, bucket] of rateBuckets.entries()) {
        if (bucket.resetAt <= now) {
            rateBuckets.delete(key);
        }
    }

    for (const [nonce, expiresAt] of nonceStore.entries()) {
        if (expiresAt <= now) {
            nonceStore.delete(nonce);
        }
    }
}

export function getRequestIp(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0]?.trim() || 'unknown';
    }
    return request.headers.get('x-real-ip') || 'unknown';
}

export function consumeRateLimit(key: string, maxRequests: number, windowMs: number) {
    const now = Date.now();
    pruneCaches(now);

    const bucket = rateBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
        rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remaining: maxRequests - 1 };
    }

    if (bucket.count >= maxRequests) {
        return { allowed: false, remaining: 0 };
    }

    bucket.count += 1;
    rateBuckets.set(key, bucket);
    return { allowed: true, remaining: Math.max(0, maxRequests - bucket.count) };
}

export function verifyBridgeSignature(request: NextRequest, rawBody: string) {
    const secret = process.env.CT_BRIDGE_EA_SECRET;
    if (!secret) {
        return { ok: true, mode: 'disabled' as const };
    }

    const signature = request.headers.get('x-ct-signature') || '';
    const timestamp = request.headers.get('x-ct-timestamp') || '';
    const nonce = request.headers.get('x-ct-nonce') || '';

    if (!signature || !timestamp || !nonce) {
        return { ok: false, reason: 'Missing bridge security headers' };
    }

    const timestampMs = Number(timestamp);
    if (!Number.isFinite(timestampMs)) {
        return { ok: false, reason: 'Invalid bridge timestamp' };
    }

    const now = Date.now();
    const maxSkewMs = 5 * 60 * 1000;
    if (Math.abs(now - timestampMs) > maxSkewMs) {
        return { ok: false, reason: 'Bridge timestamp out of range' };
    }

    pruneCaches(now);
    if (nonceStore.has(nonce)) {
        return { ok: false, reason: 'Replay detected (nonce already used)' };
    }

    const payload = `${timestamp}.${nonce}.${rawBody}`;
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    const a = Buffer.from(expected.toLowerCase(), 'utf8');
    const b = Buffer.from(signature.toLowerCase(), 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return { ok: false, reason: 'Invalid bridge signature' };
    }

    nonceStore.set(nonce, now + maxSkewMs);
    return { ok: true, mode: 'enabled' as const };
}
