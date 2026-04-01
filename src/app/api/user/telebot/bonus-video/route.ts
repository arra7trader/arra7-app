import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTelebotBonusVideoConfig, hasActiveTelebotAccess } from '@/lib/telebot-bonus';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  const allowed = await hasActiveTelebotAccess(userId);
  if (!allowed) {
    return NextResponse.json({ status: 'error', message: 'Akses video eksklusif hanya untuk member TELEBOT aktif.' }, { status: 403 });
  }

  const config = getTelebotBonusVideoConfig();

  if (config.externalUrl) {
    return NextResponse.json(
      {
        status: 'ok',
        mode: 'embedded',
        message: 'Video bonus TELEBOT hanya diakses dari halaman website ARRA.',
        pageUrl: '/telebot-bonus',
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, no-store, max-age=0',
        },
      }
    );
  }

  if (!config.localFileExists) {
    return NextResponse.json(
      { status: 'error', message: 'Video eksklusif sedang disiapkan admin. Coba lagi sebentar.' },
      { status: 503 }
    );
  }

  const stat = fs.statSync(config.filePath);
  const fileSize = stat.size;
  const range = request.headers.get('range');
  const contentType = 'video/mp4';
  const fileName = path.basename(config.filePath);

  if (range) {
    const matches = /bytes=(\d*)-(\d*)/.exec(range);
    const start = matches?.[1] ? Number(matches[1]) : 0;
    const end = matches?.[2] ? Number(matches[2]) : fileSize - 1;
    const safeStart = Number.isFinite(start) ? Math.max(0, start) : 0;
    const safeEnd = Number.isFinite(end) ? Math.min(end, fileSize - 1) : fileSize - 1;

    if (safeStart > safeEnd || safeStart >= fileSize) {
      return new NextResponse(null, {
        status: 416,
        headers: {
          'Content-Range': `bytes */${fileSize}`,
        },
      });
    }

    const chunkSize = safeEnd - safeStart + 1;
    const stream = fs.createReadStream(config.filePath, { start: safeStart, end: safeEnd });

    return new NextResponse(stream as unknown as BodyInit, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${safeStart}-${safeEnd}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(chunkSize),
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'private, no-store, max-age=0',
      },
    });
  }

  const stream = fs.createReadStream(config.filePath);
  return new NextResponse(stream as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Length': String(fileSize),
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${fileName}"`,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, no-store, max-age=0',
    },
  });
}
