import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json({
        available: true,
        model: 'ARRA Cronos Market Review',
        status: 'online',
        device: 'Observed Market Review',
        message: 'Pembacaan indikator teknikal dari candle pasar tersedia.',
    });
}
