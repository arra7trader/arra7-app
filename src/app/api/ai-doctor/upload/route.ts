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

        // Parse MT4/MT5 HTML (Universal)
        const parsed = parseMetaTraderHTML(text);

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

import * as cheerio from 'cheerio';

// Universal Parser for MT4 (History) and MT5 (Deals/Orders) using Cheerio
function parseMetaTraderHTML(html: string): { trades: Trade[], summary: Summary } {
    const trades: Trade[] = [];
    const $ = cheerio.load(html);

    // Strategy 1: Find the main table containing trades
    // MT4 usually has a table with 'Ticket', 'Open Time', etc.
    // MT5 might have 'Deals', 'Orders', 'Positions'.

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let tradeRows: any = null;
    const colMap: { [key: string]: number } = {};

    $('table').each((i, table) => {
        if (tradeRows) return; // Stop if found

        // Check header row in this table
        // MT4: First row often 'Ticket', 'Open Time'...
        // MT5: Sometimes header is second row, or first row is 'Orders' title.

        const rows = $(table).find('tr');
        if (rows.length < 2) return;

        rows.each((j, row) => {
            if (tradeRows) return;

            const cells = $(row).find('th, td');
            const cellTexts = cells.map((_, el) => $(el).text().trim().toLowerCase()).get();

            // Check for key headers
            const hasTicket = cellTexts.some(t => t.includes('ticket') || t.includes('deal') || t.includes('order') || t.includes('position'));
            const hasTime = cellTexts.some(t => t.includes('time') || t.includes('waktu') || t.includes('tanggal'));
            const hasType = cellTexts.some(t => t.includes('type') || t.includes('jenis'));
            const hasPrice = cellTexts.some(t => t.includes('price') || t.includes('harga'));

            if (hasTicket && (hasTime || hasType || hasPrice)) {
                // Found Header! Map columns
                cellTexts.forEach((text, index) => {
                    if (text.includes('ticket') || text.includes('deal') || text.includes('order') || text.includes('position')) colMap['ticket'] = index;
                    else if (text.includes('open time') || text === 'time' || text.includes('waktu')) colMap['openTime'] = index;
                    else if (text.includes('type') || text.includes('jenis')) colMap['type'] = index;
                    else if (text.includes('size') || text.includes('volume') || text.includes('lot')) colMap['size'] = index;
                    else if (text.includes('item') || text.includes('symbol')) colMap['symbol'] = index;
                    else if ((text.includes('open') && text.includes('price')) || text === 'price' || text.includes('harga')) {
                        if (colMap['openPrice'] === undefined) colMap['openPrice'] = index;
                    }
                    else if (text.includes('s / l') || text.includes('sl') || text.includes('stop loss')) colMap['sl'] = index;
                    else if (text.includes('t / p') || text.includes('tp') || text.includes('take profit')) colMap['tp'] = index;
                    else if (text.includes('close time')) colMap['closeTime'] = index;
                    else if ((text.includes('close') && text.includes('price')) || text.includes('price')) {
                        // If 'price' appears again after openPrice, it's closePrice
                        if (colMap['openPrice'] !== undefined && index > colMap['openPrice']) colMap['closePrice'] = index;
                    }
                    else if (text.includes('profit') || text.includes('commission') || text.includes('swap')) {
                        // Profit is usually the last one or named explicitly
                        if (text.includes('profit')) colMap['profit'] = index;
                    }
                });

                // Set tradeRows to subsequent rows
                tradeRows = rows.slice(j + 1);
            }
        });
    });

    if (tradeRows) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tradeRows.each((_: any, row: any) => {
            const cells = $(row).find('td');
            if (cells.length === 0) return;

            const getText = (idx: number) => idx !== undefined ? $(cells[idx]).text().trim() : '';
            const getNum = (idx: number) => {
                const text = getText(idx).replace(/\s/g, '').replace(/,/g, ''); // Remove spaces/commas
                return parseFloat(text) || 0;
            };

            // Basic validation
            if (!colMap['ticket']) return;

            const type = getText(colMap['type']).toLowerCase();
            // Filter out balance/credit/cancelled
            if (!type.match(/^(buy|sell)/)) return;

            trades.push({
                ticket: getText(colMap['ticket']),
                openTime: getText(colMap['openTime']),
                type: type,
                size: getNum(colMap['size']),
                symbol: getText(colMap['symbol']),
                openPrice: getNum(colMap['openPrice']),
                sl: getNum(colMap['sl']),
                tp: getNum(colMap['tp']),
                closeTime: getText(colMap['closeTime']),
                closePrice: getNum(colMap['closePrice']),
                profit: getNum(colMap['profit'])
            });
        });
    }

    // FALLBACK: If standard table detection fails (e.g. no <table> tags or strict headers not found)
    if (trades.length === 0) {
        // Try to find ANY <tr> with trade-like data
        $('tr').each((_, row) => {
            const cells = $(row).find('td');
            if (cells.length < 8) return;

            const cellTexts = cells.map((_, el) => $(el).text().trim()).get();

            // Heuristic for trade row: 
            // 1. Ticket (usually number)
            // 2. Date (YYYY.MM.DD)
            // 3. Type (buy/sell)
            // 4. Size (number)
            // 5. Symbol (string)

            const type = cellTexts[2]?.toLowerCase();
            const symbol = cellTexts[4];

            if (type && type.match(/^(buy|sell)/) && symbol && symbol.length < 20) {
                const getNum = (txt: string) => parseFloat(txt.replace(/\s/g, '').replace(/,/g, '')) || 0;

                trades.push({
                    ticket: cellTexts[0],
                    openTime: cellTexts[1],
                    type: type,
                    size: getNum(cellTexts[3]),
                    symbol: symbol,
                    openPrice: getNum(cellTexts[5]),
                    sl: getNum(cellTexts[6]),
                    tp: getNum(cellTexts[7]),
                    closeTime: cellTexts[8],
                    closePrice: getNum(cellTexts[9]),
                    profit: getNum(cellTexts[cellTexts.length - 1]) // Assume profit is last
                });
            }
        });
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
        avgRR: 0,
        totalProfit,
        totalLoss
    };

    return { trades, summary };
}
