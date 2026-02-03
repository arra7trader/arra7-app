import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Validate file type
        if (!file.name.endsWith('.html')) {
            return NextResponse.json(
                { error: 'Only HTML files are supported' },
                { status: 400 }
            );
        }

        // Read file content
        const text = await file.text();

        // Parse MT4/MT5 HTML
        const parsed = parseMT4HTML(text);

        if (parsed.trades.length === 0) {
            return NextResponse.json(
                { error: 'No trades found in the statement' },
                { status: 400 }
            );
        }

        // Generate session ID
        const sessionId = crypto.randomUUID();

        return NextResponse.json({
            sessionId,
            trades: parsed.trades.slice(0, 100), // Limit response size
            summary: parsed.summary
        });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: 'Failed to process file' },
            { status: 500 }
        );
    }
}

interface Trade {
    ticket: string;
    openTime: string;
    type: string;
    size: number;
    symbol: string;
    openPrice: number;
    sl: number;
    tp: number;
    closeTime: string;
    closePrice: number;
    profit: number;
}

interface Summary {
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    avgRR: number;
    totalProfit: number;
    totalLoss: number;
}

function parseMT4HTML(html: string): { trades: Trade[], summary: Summary } {
    const trades: Trade[] = [];

    // Simple regex-based parsing for MT4 HTML tables
    // Match table rows with trade data
    const tableRowRegex = /<tr[^>]*>(.*?)<\/tr>/gis;
    const cellRegex = /<td[^>]*>(.*?)<\/td>/gi;

    const rows = html.match(tableRowRegex) || [];

    for (const row of rows) {
        const cells = [];
        let match;

        while ((match = cellRegex.exec(row)) !== null) {
            cells.push(match[1].replace(/<[^>]*>/g, '').trim());
        }

        // MT4 trade row should have at least 11 columns
        if (cells.length >= 11 && cells[0] && !isNaN(Number(cells[0]))) {
            try {
                trades.push({
                    ticket: cells[0],
                    openTime: cells[1],
                    type: cells[2],
                    size: parseFloat(cells[3]) || 0,
                    symbol: cells[4],
                    openPrice: parseFloat(cells[5]) || 0,
                    sl: parseFloat(cells[6]) || 0,
                    tp: parseFloat(cells[7]) || 0,
                    closeTime: cells[8],
                    closePrice: parseFloat(cells[9]) || 0,
                    profit: parseFloat(cells[10].replace(/[^0-9.-]/g, '')) || 0
                });
            } catch (e) {
                // Skip malformed rows
                continue;
            }
        }
    }

    // Calculate summary
    const winningTrades = trades.filter(t => t.profit > 0);
    const losingTrades = trades.filter(t => t.profit < 0);

    const totalProfit = winningTrades.reduce((sum, t) => sum + t.profit, 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.profit, 0));

    const summary: Summary = {
        totalTrades: trades.length,
        winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
        profitFactor: totalLoss > 0 ? totalProfit / totalLoss : 0,
        avgRR: 0, // Calculate later if needed
        totalProfit,
        totalLoss
    };

    return { trades, summary };
}
