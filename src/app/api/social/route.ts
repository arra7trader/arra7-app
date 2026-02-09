// Social Feed API Route
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSocialFeed, addToSocialFeed, likeSignal, getTrendingPairs } from '@/lib/social';

// GET - Fetch social feed and trending pairs
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = parseInt(searchParams.get('offset') || '0');

        const [feed, trending] = await Promise.all([
            getSocialFeed(limit, offset),
            getTrendingPairs(),
        ]);

        return NextResponse.json({
            status: 'success',
            feed,
            trending,
        });
    } catch (error) {
        console.error('Social GET error:', error);
        return NextResponse.json({ status: 'error', message: 'Internal server error' }, { status: 500 });
    }
}

// POST - Add to feed or like a signal
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { action } = body;

        if (action === 'like') {
            const { signalId } = body;
            if (!signalId) {
                return NextResponse.json({ status: 'error', message: 'Missing signal ID' }, { status: 400 });
            }
            const success = await likeSignal(signalId);
            if (success) {
                return NextResponse.json({ status: 'success', message: 'Signal liked' });
            }
        } else if (action === 'add') {
            const { symbol, timeframe, direction, confidence, entryPrice, stopLoss, takeProfit, analysisSummary } = body;
            if (!symbol) {
                return NextResponse.json({ status: 'error', message: 'Missing symbol' }, { status: 400 });
            }
            const success = await addToSocialFeed(
                session.user.id,
                symbol,
                timeframe,
                direction,
                confidence,
                entryPrice,
                stopLoss,
                takeProfit,
                analysisSummary
            );
            if (success) {
                return NextResponse.json({ status: 'success', message: 'Added to feed' });
            }
        }

        return NextResponse.json({ status: 'error', message: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Social POST error:', error);
        return NextResponse.json({ status: 'error', message: 'Internal server error' }, { status: 500 });
    }
}
