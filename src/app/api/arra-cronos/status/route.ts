import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const serviceUrl = process.env.KRONOS_SERVICE_URL?.replace(/\/$/, '');
    if (!serviceUrl || !process.env.KRONOS_SERVICE_TOKEN) {
        return NextResponse.json({
            available: false,
            model: 'ARRA Cronos / Kronos-base',
            status: 'not_configured',
            message: !serviceUrl ? 'URL layanan model belum dikonfigurasi.' : 'Token layanan model belum dikonfigurasi.',
        });
    }

    try {
        const response = await fetch(`${serviceUrl}/health`, { cache: 'no-store', signal: AbortSignal.timeout(5_000) });
        if (!response.ok) throw new Error(`Service returned ${response.status}`);
        const health = await response.json();
        return NextResponse.json({
            available: health.model_loaded === true,
            model: health.model_name || 'ARRA Cronos / Kronos-base',
            status: health.model_loaded === true ? 'online' : 'loading',
            device: health.device || 'unknown',
            message: health.model_loaded === true ? 'Model terhubung.' : 'Model belum siap.',
        });
    } catch {
        return NextResponse.json({
            available: false,
            model: 'ARRA Cronos / Kronos-base',
            status: 'offline',
            message: 'Layanan Kronos tidak dapat dijangkau.',
        });
    }
}
