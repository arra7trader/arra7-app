import { NextRequest, NextResponse } from 'next/server';
import { checkTokenSecurity, checkRugcheck } from '@/lib/crypto-hunter/goplus-security';
import type { ChainType } from '@/lib/crypto-hunter/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const chain = (searchParams.get('chain') || 'solana') as ChainType;
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { success: false, error: 'Token address is required' },
        { status: 400 }
      );
    }

    // Run security checks in parallel
    const [securityResult, rugcheckResult] = await Promise.allSettled([
      checkTokenSecurity(chain, address),
      chain === 'solana' ? checkRugcheck(address) : Promise.resolve({ score: 'Unknown', risks: [] }),
    ]);

    const security = securityResult.status === 'fulfilled' ? securityResult.value : null;
    const rugcheck = rugcheckResult.status === 'fulfilled' ? rugcheckResult.value : { score: 'Unknown', risks: [] };

    // Merge rugcheck into security
    if (security && rugcheck.score !== 'Unknown') {
      security.rugcheckScore = rugcheck.score as any;
    }

    return NextResponse.json({
      success: true,
      chain,
      address,
      security,
      rugcheck,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Security check API error:', error);
    return NextResponse.json(
      { success: false, error: 'Security check failed' },
      { status: 500 }
    );
  }
}
