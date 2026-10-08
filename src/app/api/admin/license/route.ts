import { NextRequest, NextResponse } from 'next/server';
import { listLicenseKeys, createLicenseKeys } from '@/lib/license';

export async function GET() {
  try {
    const keys = await listLicenseKeys(150);
    return NextResponse.json({ status: 'success', data: keys });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: error?.message || 'Gagal mengambil daftar lisensi' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tier = 'VVIP', durationDays = 30, count = 1, notes } = body;

    const validTier = tier === 'PRO' ? 'PRO' : 'VVIP';
    const validDays = Number(durationDays) || 30;
    const validCount = Math.min(Math.max(Number(count) || 1, 1), 50);

    const createdCodes = await createLicenseKeys({
      tier: validTier,
      durationDays: validDays,
      count: validCount,
      notes: notes || undefined,
    });

    return NextResponse.json({
      status: 'success',
      message: `Berhasil membuat ${createdCodes.length} kode lisensi ${validTier}.`,
      data: createdCodes,
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: error?.message || 'Gagal membuat kode lisensi' },
      { status: 500 }
    );
  }
}
