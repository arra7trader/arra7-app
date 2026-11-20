import { NextRequest, NextResponse } from 'next/server';
import { verifyEALicense } from '@/lib/license';
import { EA_FILES_DATA } from '@/lib/ea-files-data';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileKey = searchParams.get('file') || 'dual';
    const licenseKey = searchParams.get('key') || '';

    if (!licenseKey) {
      return NextResponse.json(
        { error: 'Akses terkunci. Parameter kunci lisensi (key) diperlukan.' },
        { status: 403 }
      );
    }

    const verification = await verifyEALicense(licenseKey);
    if (!verification.valid) {
      return NextResponse.json(
        { error: 'Akses ditolak: ' + verification.message },
        { status: 403 }
      );
    }

    const fileMeta = EA_FILES_DATA[fileKey] || EA_FILES_DATA.dual;
    if (!fileMeta || !fileMeta.dataBase64) {
      return NextResponse.json(
        { error: 'File paket tidak ditemukan di database server.' },
        { status: 404 }
      );
    }

    const fileBuffer = Buffer.from(fileMeta.dataBase64, 'base64');

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': fileMeta.mime,
        'Content-Disposition': `attachment; filename="${fileMeta.fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('EA Download Error:', err);
    return NextResponse.json(
      { error: 'Gagal memproses pengunduhan file: ' + err.message },
      { status: 500 }
    );
  }
}
