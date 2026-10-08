import { NextRequest, NextResponse } from 'next/server';
import { getDeviceStatus } from '@/lib/license';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get('deviceId');

    if (!deviceId) {
      return NextResponse.json(
        { status: 'error', message: 'Parameter deviceId diperlukan.' },
        { status: 400 }
      );
    }

    const status = await getDeviceStatus(deviceId);

    return NextResponse.json({
      status: 'success',
      data: status,
    });
  } catch (error: any) {
    console.error('[API_LICENSE_STATUS] Error:', error);
    return NextResponse.json(
      { status: 'error', message: error?.message || 'Gagal memeriksa status lisensi.' },
      { status: 500 }
    );
  }
}
