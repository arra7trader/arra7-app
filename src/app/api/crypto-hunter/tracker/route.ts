import { NextResponse } from 'next/server';
import { getPersistedCryptoSnapshots } from '@/lib/crypto-hunter/persistent-tracker';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const snapshots = await getPersistedCryptoSnapshots();
    return NextResponse.json({ success: true, snapshots });
  } catch (error) {
    console.error('Crypto Hunter tracker fetch error:', error);
    return NextResponse.json({ success: false, snapshots: null }, { status: 500 });
  }
}
