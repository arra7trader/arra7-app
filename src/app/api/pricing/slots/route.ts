import { NextRequest, NextResponse } from 'next/server';
import getTursoClient from '@/lib/turso';

export const dynamic = 'force-dynamic';

// GET - Fetch current promo slot usage
export async function GET() {
    try {
        const turso = getTursoClient();
        if (!turso) {
            return NextResponse.json(
                { status: 'error', message: 'Database not configured' },
                { status: 503 }
            );
        }

        // Get all promo slot records
        const result = await turso.execute(`
            SELECT membership, duration, used_count, max_count 
            FROM promo_slots
        `);

        // Initialize slot data structure
        const slots: Record<string, Record<string, { used: number; remaining: number; max: number }>> = {
            PRO: {},
            VVIP: {},
        };

        // Populate with existing data
        for (const row of result.rows) {
            const membership = row.membership as string;
            const duration = row.duration as string;
            const used = row.used_count as number;
            const max = row.max_count as number;

            if (!slots[membership]) {
                slots[membership] = {};
            }

            slots[membership][duration] = {
                used,
                remaining: Math.max(0, max - used),
                max,
            };
        }

        // Ensure all duration options exist in response
        const durations = ['3months', '6months', '1year'];
        for (const membership of ['PRO', 'VVIP']) {
            for (const duration of durations) {
                if (!slots[membership][duration]) {
                    slots[membership][duration] = {
                        used: 0,
                        remaining: 15,
                        max: 15,
                    };
                }
            }
        }

        return NextResponse.json({
            status: 'success',
            slots,
        });
    } catch (error: any) {
        console.error('Get promo slots error:', error);
        return NextResponse.json(
            { status: 'error', message: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST - Increment slot usage (called on payment success)
export async function POST(request: NextRequest) {
    try {
        const turso = getTursoClient();
        if (!turso) {
            return NextResponse.json(
                { status: 'error', message: 'Database not configured' },
                { status: 503 }
            );
        }

        const body = await request.json();
        const { membership, duration } = body;

        if (!membership || !duration) {
            return NextResponse.json(
                { status: 'error', message: 'Missing membership or duration' },
                { status: 400 }
            );
        }

        if (!['PRO', 'VVIP'].includes(membership)) {
            return NextResponse.json(
                { status: 'error', message: 'Invalid membership' },
                { status: 400 }
            );
        }

        if (!['3months', '6months', '1year'].includes(duration)) {
            return NextResponse.json(
                { status: 'error', message: 'Invalid duration' },
                { status: 400 }
            );
        }

        // Check current slot usage
        const current = await turso.execute({
            sql: 'SELECT used_count, max_count FROM promo_slots WHERE membership = ? AND duration = ?',
            args: [membership, duration],
        });

        let usedCount = 0;
        let maxCount = 15;

        if (current.rows.length > 0) {
            usedCount = current.rows[0].used_count as number;
            maxCount = current.rows[0].max_count as number;
        }

        // Check if slot available
        if (usedCount >= maxCount) {
            return NextResponse.json(
                { status: 'error', message: 'Promo slots full' },
                { status: 400 }
            );
        }

        // Increment slot usage
        await turso.execute({
            sql: `INSERT INTO promo_slots (membership, duration, used_count, max_count)
                  VALUES (?, ?, 1, 15)
                  ON CONFLICT(membership, duration) 
                  DO UPDATE SET used_count = used_count + 1, updated_at = CURRENT_TIMESTAMP`,
            args: [membership, duration],
        });

        return NextResponse.json({
            status: 'success',
            message: 'Slot usage incremented',
            used: usedCount + 1,
            remaining: maxCount - (usedCount + 1),
        });
    } catch (error: any) {
        console.error('Update promo slots error:', error);
        return NextResponse.json(
            { status: 'error', message: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
