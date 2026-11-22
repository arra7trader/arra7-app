import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getEarlyBirdStats, ADMIN_PASSKEYS } from '@/lib/indicator-maker/rate-limiter';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const license = searchParams.get('license') || '';
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                     request.headers.get('x-real-ip') || 
                     'anonymous-client';

    const [rateLimit, earlyBird] = await Promise.all([
      checkRateLimit(clientIp, license),
      getEarlyBirdStats()
    ]);

    return NextResponse.json({
      status: 'success',
      rateLimit,
      earlyBird,
      isPasskeyValid: ADMIN_PASSKEYS.has(license.trim().toUpperCase())
    });
  } catch (error: any) {
    console.error('Indicator maker verify error:', error);
    return NextResponse.json(
      { status: 'error', message: error.message || 'Internal error' },
      { status: 500 }
    );
  }
}
