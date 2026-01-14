import { NextResponse } from 'next/server';
import { verifyPendingSignals } from '@/lib/signal-verifier';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        const result = await verifyPendingSignals();

        return NextResponse.json({
            status: 'success',
            data: result
        });
    } catch (error) {
        return NextResponse.json(
            { status: 'error', message: 'Verification failed' },
            { status: 500 }
        );
    }
}
