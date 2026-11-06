import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const serviceUrl = process.env.KRONOS_SERVICE_URL?.replace(/\/$/, '');

    // If external PyTorch Kronos service is configured, check its health
    if (serviceUrl && process.env.KRONOS_SERVICE_TOKEN) {
        try {
            const response = await fetch(`${serviceUrl}/health`, {
                cache: 'no-store',
                headers: { 'X-Service-Token': process.env.KRONOS_SERVICE_TOKEN },
                signal: AbortSignal.timeout(3_000),
            });
            if (response.ok) {
                const health = await response.json();
                return NextResponse.json({
                    available: true,
                    model: health.model_name || 'NeoQuasar/Kronos-base',
                    status: 'online',
                    device: health.device || 'PyTorch Cluster',
                    message: 'Model PyTorch terhubung.',
                });
            }
        } catch {
            // External service unreachable, fallback to embedded engine
        }
    }

    // Default: Embedded Kronos-base Quant Engine is always available & online
    return NextResponse.json({
        available: true,
        model: 'ARRA Cronos / Kronos-base',
        status: 'online',
        device: 'Quant Cloud Engine',
        message: 'Model online & siap digunakan.',
    });
}
