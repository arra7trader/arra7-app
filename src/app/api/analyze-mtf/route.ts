// Multi-Timeframe Analysis API Route
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { analyzeMultiTimeframe } from '@/lib/mtf-analysis';
import { ForexPair, FOREX_PAIRS } from '@/lib/market-data';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { pair } = body;

        if (!pair || !(pair in FOREX_PAIRS)) {
            return NextResponse.json({ status: 'error', message: 'Invalid pair' }, { status: 400 });
        }

        const result = await analyzeMultiTimeframe(pair as ForexPair);

        if (result.success) {
            return NextResponse.json({
                status: 'success',
                analyses: result.analyses,
                confluence: result.confluence,
            });
        } else {
            return NextResponse.json({
                status: 'error',
                message: result.error || 'MTF Analysis failed',
            }, { status: 500 });
        }
    } catch (error) {
        console.error('MTF API Error:', error);
        return NextResponse.json({ status: 'error', message: 'Internal server error' }, { status: 500 });
    }
}
