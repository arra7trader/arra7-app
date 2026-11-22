import { NextRequest, NextResponse } from 'next/server';
import { compileIndicator } from '@/lib/indicator-maker/compiler';
import { checkRateLimit, recordGeneration, getEarlyBirdStats } from '@/lib/indicator-maker/rate-limiter';
import { PlatformTarget } from '@/lib/indicator-maker/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      platform, 
      techniqueIds, 
      customName = 'PICA Institutional Indicator', 
      licenseCode = '' 
    } = body;

    // Platform validation
    if (platform !== 'tradingview' && platform !== 'mt5') {
      return NextResponse.json(
        { status: 'error', message: 'Platform target harus "tradingview" atau "mt5"' },
        { status: 400 }
      );
    }

    // Techniques validation
    if (!Array.isArray(techniqueIds) || techniqueIds.length === 0) {
      return NextResponse.json(
        { status: 'error', message: 'Pilih minimal 1 teknik formula institusi' },
        { status: 400 }
      );
    }

    // Maximum 5 combos enforced
    if (techniqueIds.length > 5) {
      return NextResponse.json(
        { status: 'error', message: 'Maksimal 5 teknik dapat dikombinasikan untuk mencegah lagging dan over-filtering' },
        { status: 400 }
      );
    }

    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                     request.headers.get('x-real-ip') || 
                     'anonymous-client';

    // Rate Limit Check (1 hour cooldown + 5 per day)
    const limitCheck = await checkRateLimit(clientIp, licenseCode);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          status: 'error',
          code: 'RATE_LIMIT_EXCEEDED',
          message: limitCheck.reason,
          cooldownRemainingSeconds: limitCheck.cooldownRemainingSeconds,
          dailyRemaining: limitCheck.dailyRemaining,
          nextAvailableAt: limitCheck.nextAvailableAt
        },
        { status: 429 }
      );
    }

    // Compile Single Platform Target
    const compilation = compileIndicator({
      platform: platform as PlatformTarget,
      techniqueIds,
      customName,
      licenseCode: licenseCode || 'COMMUNITY-USER'
    });

    // Record usage
    await recordGeneration(clientIp, licenseCode);

    // Get fresh stats
    const [freshLimit, earlyBird] = await Promise.all([
      checkRateLimit(clientIp, licenseCode),
      getEarlyBirdStats()
    ]);

    return NextResponse.json({
      status: 'success',
      data: {
        platform: compilation.platform,
        filename: compilation.filename,
        code: compilation.code,
        techniqueNames: compilation.techniqueNames,
        generatedAt: new Date().toISOString(),
        dailyRemaining: freshLimit.dailyRemaining,
        cooldownRemainingSeconds: freshLimit.cooldownRemainingSeconds,
        earlyBird
      }
    });

  } catch (error: any) {
    console.error('Indicator generation error:', error);
    return NextResponse.json(
      { status: 'error', message: error.message || 'Gagal merakit indikator' },
      { status: 500 }
    );
  }
}
