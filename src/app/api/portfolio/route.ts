// Portfolio API Route
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
    getPositionsWithLivePrices,
    addPosition,
    closePosition,
    deletePosition,
    getPortfolioSummary
} from '@/lib/portfolio';

// GET - Fetch positions with live prices
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
        }

        const [positions, summary] = await Promise.all([
            getPositionsWithLivePrices(session.user.id),
            getPortfolioSummary(session.user.id),
        ]);

        return NextResponse.json({
            status: 'success',
            positions,
            summary,
        });
    } catch (error) {
        console.error('Portfolio GET error:', error);
        return NextResponse.json({ status: 'error', message: 'Internal server error' }, { status: 500 });
    }
}

// POST - Add new position
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { symbol, direction, entryPrice, lotSize, stopLoss, takeProfit } = body;

        if (!symbol || !direction || !entryPrice || !lotSize) {
            return NextResponse.json({ status: 'error', message: 'Missing required fields' }, { status: 400 });
        }

        const success = await addPosition({
            userId: session.user.id,
            symbol,
            direction,
            entryPrice,
            lotSize,
            stopLoss,
            takeProfit,
            status: 'OPEN',
        });

        if (success) {
            return NextResponse.json({ status: 'success', message: 'Position added' });
        } else {
            return NextResponse.json({ status: 'error', message: 'Failed to add position' }, { status: 500 });
        }
    } catch (error) {
        console.error('Portfolio POST error:', error);
        return NextResponse.json({ status: 'error', message: 'Internal server error' }, { status: 500 });
    }
}

// PUT - Close position
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id, exitPrice, profitLoss } = body;

        if (!id || exitPrice === undefined) {
            return NextResponse.json({ status: 'error', message: 'Missing required fields' }, { status: 400 });
        }

        const success = await closePosition(id, exitPrice, profitLoss || 0);

        if (success) {
            return NextResponse.json({ status: 'success', message: 'Position closed' });
        } else {
            return NextResponse.json({ status: 'error', message: 'Failed to close position' }, { status: 500 });
        }
    } catch (error) {
        console.error('Portfolio PUT error:', error);
        return NextResponse.json({ status: 'error', message: 'Internal server error' }, { status: 500 });
    }
}

// DELETE - Remove position
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ status: 'error', message: 'Missing position ID' }, { status: 400 });
        }

        const success = await deletePosition(parseInt(id), session.user.id);

        if (success) {
            return NextResponse.json({ status: 'success', message: 'Position deleted' });
        } else {
            return NextResponse.json({ status: 'error', message: 'Failed to delete position' }, { status: 500 });
        }
    } catch (error) {
        console.error('Portfolio DELETE error:', error);
        return NextResponse.json({ status: 'error', message: 'Internal server error' }, { status: 500 });
    }
}
