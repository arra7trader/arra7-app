import { NextResponse } from 'next/server';
import { FOREX_PAIRS, PAIR_CATEGORIES } from '@/lib/market-data';

export const dynamic = 'force-dynamic';

export async function GET() {
    const categories = PAIR_CATEGORIES.map((category) => ({
        id: category.id,
        name: category.name,
        pairs: category.pairs.map((pair) => ({
            symbol: pair,
            name: FOREX_PAIRS[pair as keyof typeof FOREX_PAIRS]?.name || pair,
        })),
    }));

    return NextResponse.json({ categories });
}
