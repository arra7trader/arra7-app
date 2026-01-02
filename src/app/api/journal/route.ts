// Trade Journal API Route
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
    getJournalEntries,
    addJournalEntry,
    closeJournalEntry,
    updateJournalNotes,
    deleteJournalEntry,
    getJournalStats
} from '@/lib/journal';

// GET - Fetch journal entries and stats
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        const [entries, stats] = await Promise.all([
            getJournalEntries(session.user.id, limit, offset),
            getJournalStats(session.user.id),
        ]);

        return NextResponse.json({
            status: 'success',
            entries,
            stats,
        });
    } catch (error) {
        console.error('Journal GET error:', error);
        return NextResponse.json({ status: 'error', message: 'Internal server error' }, { status: 500 });
    }
}

// POST - Add new entry
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { symbol, direction, entryPrice, stopLoss, takeProfit, lotSize, notes } = body;

        if (!symbol || !direction || !entryPrice) {
            return NextResponse.json({ status: 'error', message: 'Missing required fields' }, { status: 400 });
        }

        const success = await addJournalEntry({
            userId: session.user.id,
            symbol,
            direction,
            entryPrice,
            stopLoss,
            takeProfit,
            lotSize,
            notes,
            status: 'OPEN',
        });

        if (success) {
            return NextResponse.json({ status: 'success', message: 'Entry added' });
        } else {
            return NextResponse.json({ status: 'error', message: 'Failed to add entry' }, { status: 500 });
        }
    } catch (error) {
        console.error('Journal POST error:', error);
        return NextResponse.json({ status: 'error', message: 'Internal server error' }, { status: 500 });
    }
}

// PUT - Update entry (close trade or update notes)
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id, action, exitPrice, profitLoss, notes } = body;

        if (!id) {
            return NextResponse.json({ status: 'error', message: 'Missing entry ID' }, { status: 400 });
        }

        let success = false;

        if (action === 'close' && exitPrice !== undefined) {
            success = await closeJournalEntry(id, exitPrice, profitLoss || 0);
        } else if (action === 'notes' && notes !== undefined) {
            success = await updateJournalNotes(id, notes);
        } else {
            return NextResponse.json({ status: 'error', message: 'Invalid action' }, { status: 400 });
        }

        if (success) {
            return NextResponse.json({ status: 'success', message: 'Entry updated' });
        } else {
            return NextResponse.json({ status: 'error', message: 'Failed to update entry' }, { status: 500 });
        }
    } catch (error) {
        console.error('Journal PUT error:', error);
        return NextResponse.json({ status: 'error', message: 'Internal server error' }, { status: 500 });
    }
}

// DELETE - Remove entry
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ status: 'error', message: 'Missing entry ID' }, { status: 400 });
        }

        const success = await deleteJournalEntry(parseInt(id), session.user.id);

        if (success) {
            return NextResponse.json({ status: 'success', message: 'Entry deleted' });
        } else {
            return NextResponse.json({ status: 'error', message: 'Failed to delete entry' }, { status: 500 });
        }
    } catch (error) {
        console.error('Journal DELETE error:', error);
        return NextResponse.json({ status: 'error', message: 'Internal server error' }, { status: 500 });
    }
}
