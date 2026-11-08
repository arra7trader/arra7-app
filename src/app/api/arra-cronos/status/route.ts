import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json({
        available: true,
        model: 'ARRA Cronos Quant Forecast',
        status: 'online',
        device: 'Observed Market Review',
        message: 'Jalur forecast dan level setup teknikal tersedia dari data candle pasar.',
    });
}
