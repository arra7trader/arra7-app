import { NextRequest, NextResponse } from 'next/server';
import { trackDeviceActivity } from '@/lib/license';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { deviceId, path, action, meta } = body;

    if (!deviceId) {
      return NextResponse.json({ status: 'error', message: 'Missing deviceId' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;
    const country = req.headers.get('x-vercel-ip-country') || undefined;
    const city = req.headers.get('x-vercel-ip-city') || undefined;

    // Track asynchronously without blocking response
    trackDeviceActivity({
      deviceId,
      path: path || '/',
      action: action || 'PAGE_VIEW',
      meta,
      ip,
      userAgent,
      country,
      city,
    }).catch(err => console.error('[TRACKING_BACKGROUND_ERR]', err));

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
