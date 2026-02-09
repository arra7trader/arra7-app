import { NextResponse } from 'next/server';
import { getGlobalStats } from '@/lib/turso';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Cache for 60 seconds

export async function GET() {
    try {
        const stats = await getGlobalStats();
        return NextResponse.json(stats);
    } catch (error) {
        console.error('Stats API error:', error);
        // Return fallback data on error
        return NextResponse.json(
            { users: 125, predictions: 5200, accuracy: 95.2, volume: '1.2M' },
            { status: 500 }
        );
    }
}
