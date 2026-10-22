import { NextRequest, NextResponse } from 'next/server';
import { resetLicenseKeyDevice } from '@/lib/license';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { status: 'error', message: 'Kode lisensi wajib diisi' },
        { status: 400 }
      );
    }

    const result = await resetLicenseKeyDevice(code);
    if (!result.success) {
      return NextResponse.json({ status: 'error', message: result.message }, { status: 400 });
    }

    return NextResponse.json({
      status: 'success',
      message: result.message,
      data: { oldDeviceId: result.oldDeviceId },
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: error?.message || 'Gagal mereset perangkat lisensi' },
      { status: 500 }
    );
  }
}
