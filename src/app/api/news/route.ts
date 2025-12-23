import { NextResponse } from 'next/server';
import { getForexNews } from '@/lib/groq-ai';

export async function GET() {
    try {
        const newsData = await getForexNews();

        return NextResponse.json({
            status: 'success',
            html: newsData.html,
            events: newsData.events,
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error('News API Error:', error);
        return NextResponse.json(
            { status: 'error', message: 'Failed to fetch news' },
            { status: 500 }
        );
    }
}
