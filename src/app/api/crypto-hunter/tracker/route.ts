import { NextResponse } from 'next/server';
import { getPersistedCryptoSnapshots } from '@/lib/crypto-hunter/persistent-tracker';
import { resolveUserOrDevice } from '@/lib/auth-device';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await resolveUserOrDevice(request);
    if (!user.isAdmin && !user.isFullAccess) {
      return NextResponse.json({ success: false, error: 'Crypto Hunter tersedia untuk pemilik akses Website Lifetime atau Full Access.' }, { status: 403 });
    }

    const snapshots = await getPersistedCryptoSnapshots();
    return NextResponse.json({ success: true, snapshots });
  } catch (error) {
    console.error('Crypto Hunter tracker fetch error:', error);
    return NextResponse.json({ success: false, snapshots: null }, { status: 500 });
  }
}
