import { NextRequest, NextResponse } from 'next/server';
import { checkTokenSecurity, checkRugcheck, getDefaultSecurity } from '@/lib/crypto-hunter/goplus-security';
import type { ChainType } from '@/lib/crypto-hunter/types';
import { resolveUserOrDevice } from '@/lib/auth-device';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await resolveUserOrDevice(request);
    if (!user.isAdmin && !user.isFullAccess) {
      return NextResponse.json({ success: false, error: 'Crypto Hunter tersedia untuk pemilik akses Website Lifetime atau Full Access.' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const rawChain = searchParams.get('chain') || 'solana';
    const supportedChains: ChainType[] = ['solana', 'base', 'ethereum', 'bsc'];
    if (!supportedChains.includes(rawChain as ChainType)) {
      return NextResponse.json({ success: false, error: 'Unsupported chain' }, { status: 400 });
    }
    const chain = rawChain as ChainType;
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { success: false, error: 'Token address is required' },
        { status: 400 }
      );
    }

    // Run security checks in parallel
    const [securityResult, rugcheckResult] = await Promise.allSettled([
      chain === 'solana' ? Promise.resolve(null) : checkTokenSecurity(chain, address),
      chain === 'solana' ? checkRugcheck(address) : Promise.resolve(null),
    ]);

    const security = securityResult.status === 'fulfilled' ? securityResult.value || getDefaultSecurity() : getDefaultSecurity();
    const rugcheck = rugcheckResult.status === 'fulfilled' ? rugcheckResult.value : null;

    if (rugcheck?.security) Object.assign(security, rugcheck.security);

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
