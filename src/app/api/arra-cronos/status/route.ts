import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    // The local rule-based scenario engine requires no external model service.
    return NextResponse.json({
        available: true,
        model: 'ARRA Cronos Quant Scenarios',
        status: 'online',
        device: 'Quant Cloud Engine',
        message: 'Mesin skenario teknikal lokal siap digunakan.',
    });
}
