import { NextResponse } from 'next/server';
import { getQuotaStatus } from '@/lib/quota';
import { FOREX_PAIRS, PAIR_CATEGORIES, TIMEFRAMES } from '@/lib/market-data';
import { getMobileUserRecord, resolveMobileUserFromRequest } from '@/lib/mobile-session';
import { getUserMembership } from '@/lib/turso';

function serializeQuota(quota: {
  membership: string;
  dailyLimit: number;
  used: number;
  remaining: number;
  canAnalyze: boolean;
  allowedTimeframes?: readonly string[];
}) {
  return {
    ...quota,
    dailyLimit: quota.dailyLimit === Infinity ? -1 : quota.dailyLimit,
    remaining: quota.remaining === Infinity ? -1 : quota.remaining,
  };
}

export async function GET(request: Request) {
  try {
    const mobileUser = await resolveMobileUserFromRequest(request, {
      allowLegacyGoogleIdToken: true,
    });

    if (!mobileUser?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRecord = await getMobileUserRecord(mobileUser.userId);
    if (!userRecord) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const membership = await getUserMembership(mobileUser.userId);

    let quota = serializeQuota({
      membership: membership.membership || 'BASIC',
      dailyLimit: -1,
      used: 0,
      remaining: -1,
      canAnalyze: true,
      allowedTimeframes: Object.keys(TIMEFRAMES),
    });

    if (process.env.TURSO_DATABASE_URL) {
      const quotaStatus = await getQuotaStatus(mobileUser.userId);
      quota = serializeQuota(quotaStatus);
    }

    const allowedCategoryIds = new Set(['major', 'minor', 'commodities', 'crypto']);
    const categories = PAIR_CATEGORIES
      .filter((category) => allowedCategoryIds.has(category.id))
      .map((category) => ({
        id: category.id,
        name: category.name,
        pairs: category.pairs.map((pairCode) => ({
          value: pairCode,
          label: FOREX_PAIRS[pairCode as keyof typeof FOREX_PAIRS]?.name || pairCode,
        })),
      }));

    const timeframes = Object.entries(TIMEFRAMES).map(([value, config]) => ({
      value,
      label: config.label,
    }));

    return NextResponse.json({
      user: {
        id: userRecord.id,
        name: userRecord.name,
        email: userRecord.email,
        image: userRecord.image,
        tier: membership.membership || 'BASIC',
      },
      quota,
      marketConfig: {
        categories,
        timeframes,
        defaultPair: 'XAUUSD',
        defaultTimeframe: '1h',
      },
    });
  } catch (error) {
    console.error('[MOBILE_BOOTSTRAP] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
