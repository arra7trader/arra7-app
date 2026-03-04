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
import { getCopytrade77AdminClient, isCopytrade77Configured } from '@/lib/supabase-copytrade77';

type ActualTradeOutcome = 'OPEN' | 'TP' | 'SL' | 'MANUAL' | 'ERROR';

interface ActualTradeEntry {
    id: string;
    terminalId: string | null;
    accountLabel: string;
    mt5Login: string | null;
    broker: string | null;
    server: string | null;
    symbol: string;
    side: 'BUY' | 'SELL';
    volumeLots: number;
    entryPrice: number;
    stopLoss: number | null;
    takeProfit: number | null;
    status: string;
    outcome: ActualTradeOutcome;
    closePrice: number | null;
    pipsResult: number | null;
    pnlValue: number | null;
    openedAt: string;
    closedAt: string | null;
}

interface ActualTradeStats {
    total: number;
    open: number;
    tp: number;
    sl: number;
    manual: number;
    error: number;
}

function mapPositionOutcome(statusRaw: unknown): ActualTradeOutcome {
    const status = String(statusRaw || '').toUpperCase();
    if (status === 'CLOSED_TP') return 'TP';
    if (status === 'CLOSED_SL') return 'SL';
    if (status === 'CLOSED_MANUAL') return 'MANUAL';
    if (status === 'CLOSED_ERROR') return 'ERROR';
    return 'OPEN';
}

function parseNumeric(value: unknown): number | null {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
}

async function getActualTradesFromCopytrade(userId: string): Promise<{ trades: ActualTradeEntry[]; stats: ActualTradeStats }> {
    const emptyStats: ActualTradeStats = { total: 0, open: 0, tp: 0, sl: 0, manual: 0, error: 0 };
    if (!isCopytrade77Configured()) {
        return { trades: [], stats: emptyStats };
    }

    try {
        const supabase = getCopytrade77AdminClient().schema('copytrade77');
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('app_user_id', userId)
            .maybeSingle();

        if (profileError) throw profileError;
        if (!profile?.id) return { trades: [], stats: emptyStats };

        const { data: positions, error: positionsError } = await supabase
            .from('positions')
            .select('id,terminal_id,symbol,side,volume_lots,entry_price,stop_loss,take_profit,status,close_price,pips_result,pnl_value,opened_at,closed_at')
            .eq('follower_profile_id', profile.id)
            .order('opened_at', { ascending: false })
            .limit(200);

        if (positionsError) throw positionsError;
        const rows = positions || [];

        const terminalIds = [...new Set(rows.map((row) => String(row.terminal_id || '')).filter(Boolean))];
        const terminalMap = new Map<string, { terminal_label: string; mt5_login: string | null; broker_name: string | null; server_name: string | null }>();

        if (terminalIds.length > 0) {
            const { data: terminals, error: terminalsError } = await supabase
                .from('bridge_terminals')
                .select('id,terminal_label,mt5_login,broker_name,server_name')
                .in('id', terminalIds);

            if (terminalsError) throw terminalsError;
            for (const term of terminals || []) {
                terminalMap.set(String(term.id), {
                    terminal_label: String(term.terminal_label || 'Terminal'),
                    mt5_login: term.mt5_login ? String(term.mt5_login) : null,
                    broker_name: term.broker_name ? String(term.broker_name) : null,
                    server_name: term.server_name ? String(term.server_name) : null,
                });
            }
        }

        const trades: ActualTradeEntry[] = rows.map((row) => {
            const terminalId = row.terminal_id ? String(row.terminal_id) : null;
            const terminal = terminalId ? terminalMap.get(terminalId) : null;
            const outcome = mapPositionOutcome(row.status);
            return {
                id: String(row.id),
                terminalId,
                accountLabel: terminal?.terminal_label || 'Terminal',
                mt5Login: terminal?.mt5_login || null,
                broker: terminal?.broker_name || null,
                server: terminal?.server_name || null,
                symbol: String(row.symbol || '-'),
                side: String(row.side || 'BUY').toUpperCase() === 'SELL' ? 'SELL' : 'BUY',
                volumeLots: Number(row.volume_lots || 0),
                entryPrice: Number(row.entry_price || 0),
                stopLoss: parseNumeric(row.stop_loss),
                takeProfit: parseNumeric(row.take_profit),
                status: String(row.status || 'OPEN'),
                outcome,
                closePrice: parseNumeric(row.close_price),
                pipsResult: parseNumeric(row.pips_result),
                pnlValue: parseNumeric(row.pnl_value),
                openedAt: String(row.opened_at || ''),
                closedAt: row.closed_at ? String(row.closed_at) : null,
            };
        });

        const stats = trades.reduce<ActualTradeStats>((acc, trade) => {
            acc.total += 1;
            if (trade.outcome === 'OPEN') acc.open += 1;
            if (trade.outcome === 'TP') acc.tp += 1;
            if (trade.outcome === 'SL') acc.sl += 1;
            if (trade.outcome === 'MANUAL') acc.manual += 1;
            if (trade.outcome === 'ERROR') acc.error += 1;
            return acc;
        }, { ...emptyStats });

        return { trades, stats };
    } catch (error) {
        console.error('Copytrade actual trades fetch error:', error);
        return { trades: [], stats: emptyStats };
    }
}

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

        const [entries, stats, actual] = await Promise.all([
            getJournalEntries(session.user.id, limit, offset),
            getJournalStats(session.user.id),
            getActualTradesFromCopytrade(session.user.id),
        ]);

        return NextResponse.json({
            status: 'success',
            entries,
            stats,
            actualTrades: actual.trades,
            actualStats: actual.stats,
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
