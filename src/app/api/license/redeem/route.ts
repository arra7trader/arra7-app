import { NextRequest, NextResponse } from 'next/server';
import { redeemLicenseKey } from '@/lib/license';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, deviceId } = body;

    if (!code || !deviceId) {
      return NextResponse.json(
        { status: 'error', message: 'Kode lisensi dan ID perangkat wajib diisi.' },
        { status: 400 }
      );
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    const result = await redeemLicenseKey({
      code,
      deviceId,
      ip,
      userAgent,
    });

    if (!result.success) {
      return NextResponse.json({ status: 'error', message: result.message }, { status: 400 });
    }

    return NextResponse.json({
      status: 'success',
      message: result.message,
      data: {
        tier: result.tier,
        expiresAt: result.expiresAt,
        durationDays: result.durationDays,
      },
    });
  } catch (error: any) {
    console.error('[API_LICENSE_REDEEM] Error:', error);
    return NextResponse.json(
      { status: 'error', message: error?.message || 'Gagal memproses kode lisensi.' },
      { status: 500 }
    );
  }
}
