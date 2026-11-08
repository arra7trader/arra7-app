import { NextResponse } from 'next/server';
import { resolveUserOrDevice } from '@/lib/auth-device';
import { getArraMarketObservations } from '@/lib/arra-market-observations';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
    try {
        const user = await resolveUserOrDevice(request);
        if (!user.isAdmin && user.membership !== 'PRO' && user.membership !== 'VVIP') {
            return NextResponse.json({ error: 'Riwayat analisis tersedia untuk member ARRA.' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const symbol = (searchParams.get('symbol') || 'BTCUSD').toUpperCase();
        if (!['BTCUSD', 'XAUUSD'].includes(symbol)) {
            return NextResponse.json({ error: 'Instrumen riwayat tidak didukung.' }, { status: 400 });
        }

        const observations = await getArraMarketObservations(symbol, 30);
        if (!observations) {
            return NextResponse.json({ error: 'Database riwayat analisis belum tersedia.' }, { status: 503 });
        }

        return NextResponse.json({
            success: true,
            symbol,
            observations,
            mode: 'observasi pasar nyata; tanpa simulasi atau eksekusi broker',
        }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
    } catch (error) {
        console.error('[ARRA GROK OBSERVATIONS] Read failed:', error);
        return NextResponse.json({ error: 'Riwayat analisis gagal dimuat.' }, { status: 503 });
    }
}
