import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';
import { resolveUserOrDevice } from '@/lib/auth-device';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(request: Request) {
    const user = await resolveUserOrDevice(request);
    if (!user.isAdmin && !user.hasArraCronosAccess) {
        return NextResponse.json({ error: 'Source Pine Script tersedia untuk pemilik ARRA Cronos atau Full Access.' }, { status: 403 });
    }

    try {
        const source = await readFile(join(process.cwd(), 'src', 'assets', 'ARRA_Cronos.pine'), 'utf8');
        return new Response(source, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Content-Disposition': 'attachment; filename="ARRA_Cronos.pine"',
                'Cache-Control': 'private, no-store, max-age=0',
            },
        });
    } catch (error) {
        console.error('[ARRA CRONOS PINE] Source unavailable:', error);
        return NextResponse.json({ error: 'Source Pine Script belum tersedia.' }, { status: 503 });
    }
}
