import { NextResponse } from 'next/server';
import { listTrackedDevices } from '@/lib/license';

export async function GET() {
  try {
    const devices = await listTrackedDevices(150);
    return NextResponse.json({ status: 'success', data: devices });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: error?.message || 'Gagal mengambil data perangkat' },
      { status: 500 }
    );
  }
}
