import { NextRequest, NextResponse } from 'next/server';
import { verifyEALicense } from '@/lib/license';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getBasePath(): string {
  const candidates = [
    path.join(process.cwd(), 'protected-downloads', 'ea-pica-gold'),
    path.join(process.cwd(), 'arra-cronos-preview', 'protected-downloads', 'ea-pica-gold'),
    'e:\\ARRA 7 WEB 1\\arra-cronos-preview\\protected-downloads\\ea-pica-gold',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

const FILE_MAP: Record<string, { fileName: string; mime: string; subPath?: string }> = {
  dual: {
    fileName: 'PICA_Neural_Gold_Dual_Package_M1_M5.zip',
    mime: 'application/zip',
  },
  m1: {
    fileName: 'PICA_Neural_Gold_M1_Package.zip',
    mime: 'application/zip',
  },
  m5: {
    fileName: 'PICA_Neural_Gold_M5_Package.zip',
    mime: 'application/zip',
  },
  'm1-ex5': {
    fileName: 'PICA_Neural_Gold_M1_MT5.ex5',
    mime: 'application/octet-stream',
    subPath: 'files',
  },
  'm5-ex5': {
    fileName: 'PICA_Neural_Gold_M5_MT5.ex5',
    mime: 'application/octet-stream',
    subPath: 'files',
  },
  'm1-onnx': {
    fileName: 'PICA_Neural_Gold_M1.onnx',
    mime: 'application/octet-stream',
    subPath: 'files',
  },
  'm5-onnx': {
    fileName: 'PICA_Neural_Gold_M5.onnx',
    mime: 'application/octet-stream',
    subPath: 'files',
  },
};

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

    const fileMeta = FILE_MAP[fileKey] || FILE_MAP.dual;
    const basePath = getBasePath();
    const filePath = fileMeta.subPath
      ? path.join(basePath, fileMeta.subPath, fileMeta.fileName)
      : path.join(basePath, fileMeta.fileName);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'File paket tidak ditemukan di server.' },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(filePath);

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
