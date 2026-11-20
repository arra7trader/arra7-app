import { NextRequest, NextResponse } from 'next/server';
import { verifyEALicense } from '@/lib/license';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ valid: false, message: 'Kode lisensi harus diisi.' }, { status: 400 });
    }

    const result = await verifyEALicense(code);
    return NextResponse.json(result, { status: result.valid ? 200 : 403 });
  } catch (err: any) {
    console.error('EA Verify Error:', err);
    return NextResponse.json({ valid: false, message: 'Terjadi kesalahan sistem validasi lisensi.' }, { status: 500 });
  }
}
