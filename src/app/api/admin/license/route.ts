import { NextRequest, NextResponse } from 'next/server';
import { listLicenseKeys, createLicenseKeys, resetLicenseKeyDevice, deleteLicenseKey } from '@/lib/license';

export async function GET() {
  try {
    const keys = await listLicenseKeys(250);
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

export async function PATCH(req: NextRequest) {
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

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { status: 'error', message: 'Kode lisensi diperlukan' },
        { status: 400 }
      );
    }

    const result = await deleteLicenseKey(code);
    return NextResponse.json({ status: 'success', message: result.message });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: error?.message || 'Gagal menghapus lisensi' },
      { status: 500 }
    );
  }
}

