import getTursoClient from './turso';

export interface SignalData {
    type: 'forex' | 'stock';
    symbol: string;
    timeframe?: string;
    direction: 'BUY' | 'SELL' | 'HOLD';
    entryPrice: number;
    stopLoss: number;
    takeProfit1: number;
    takeProfit2?: number;
    confidence?: number;
}

// Save a new signal for tracking
export async function saveSignal(data: SignalData): Promise<boolean> {
    const turso = getTursoClient();
    if (!turso) {
        console.log('[SignalTracker] No Turso client, skipping save');
        return false;
    }

    try {
        console.log('[SignalTracker] Saving signal:', JSON.stringify(data));
        await turso.execute({
            sql: `INSERT INTO ai_signals 
                (type, symbol, timeframe, direction, entry_price, stop_loss, take_profit_1, take_profit_2, confidence, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
            args: [
                data.type,
                data.symbol,
                data.timeframe || null,
                data.direction,
                data.entryPrice,
                data.stopLoss,
                data.takeProfit1,
                data.takeProfit2 || null,
                data.confidence || null,
            ],
        });
        console.log('[SignalTracker] Signal saved successfully');
        return true;
    } catch (error) {
        console.error('[SignalTracker] Save signal error:', error);
        return false;
    }
}

// Parse AI analysis text to extract signal data - IMPROVED VERSION
export function parseSignalFromAnalysis(analysis: string, type: 'forex' | 'stock', symbol: string, timeframe?: string): SignalData | null {
    try {
        console.log('[SignalTracker] Parsing analysis for:', symbol);
        const lowerAnalysis = analysis.toLowerCase();

        // Determine direction - check multiple patterns
        let direction: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';

        // Check for explicit recommendations
        if (lowerAnalysis.includes('rekomendasi: buy') ||
            lowerAnalysis.includes('rekomendasi buy') ||
            lowerAnalysis.includes('recommendation: buy') ||
            lowerAnalysis.includes('aksi: buy') ||
            lowerAnalysis.includes('action: buy')) {
            direction = 'BUY';
        } else if (lowerAnalysis.includes('rekomendasi: sell') ||
            lowerAnalysis.includes('rekomendasi sell') ||
            lowerAnalysis.includes('recommendation: sell') ||
            lowerAnalysis.includes('aksi: sell') ||
            lowerAnalysis.includes('action: sell')) {
            direction = 'SELL';
        }
        // Check for general bullish/bearish sentiment
        else if (lowerAnalysis.includes('buy') || lowerAnalysis.includes('bullish') || lowerAnalysis.includes('long') || lowerAnalysis.includes('beli')) {
            direction = 'BUY';
        } else if (lowerAnalysis.includes('sell') || lowerAnalysis.includes('bearish') || lowerAnalysis.includes('short') || lowerAnalysis.includes('jual')) {
            direction = 'SELL';
        }

        // Extract prices using multiple regex patterns
        const pricePatterns = {
            entry: [
                /entry[:\s]*(?:zone[:\s]*)?(?:price[:\s]*)?[\$]?([\d,\.]+)/i,
                /masuk[:\s]*(?:di[:\s]*)?[\$]?([\d,\.]+)/i,
                /harga\s*entry[:\s]*[\$]?([\d,\.]+)/i,
                /entry\s*point[:\s]*[\$]?([\d,\.]+)/i,
                /open[:\s]*[\$]?([\d,\.]+)/i,
                /buy\s*at[:\s]*[\$]?([\d,\.]+)/i,
                /sell\s*at[:\s]*[\$]?([\d,\.]+)/i,
            ],
            stopLoss: [
                /(?:stop\s*loss|sl)[:\s]*[\$]?([\d,\.]+)/i,
                /stoploss[:\s]*[\$]?([\d,\.]+)/i,
                /sl\s*[:=]\s*[\$]?([\d,\.]+)/i,
                /stop[:\s]*[\$]?([\d,\.]+)/i,
            ],
            takeProfit1: [
                /(?:take\s*profit\s*1?|tp\s*1?)[:\s]*[\$]?([\d,\.]+)/i,
                /takeprofit[:\s]*[\$]?([\d,\.]+)/i,
                /tp[:\s]*[\$]?([\d,\.]+)/i,
                /target\s*1?[:\s]*[\$]?([\d,\.]+)/i,
                /target\s*profit[:\s]*[\$]?([\d,\.]+)/i,
            ],
            takeProfit2: [
                /(?:take\s*profit\s*2|tp\s*2)[:\s]*[\$]?([\d,\.]+)/i,
                /target\s*2[:\s]*[\$]?([\d,\.]+)/i,
            ],
            confidence: [
                /(?:confidence|score|tingkat\s*keyakinan)[:\s]*([\d]+)/i,
                /(\d+)\s*%?\s*(?:confidence|yakin)/i,
            ],
        };

        const parsePrice = (patterns: RegExp[]): number => {
            for (const pattern of patterns) {
                const match = analysis.match(pattern);
                if (match) {
                    const value = parseFloat(match[1].replace(/,/g, ''));
                    if (!isNaN(value) && value > 0) {
                        return value;
                    }
                }
            }
            return 0;
        };

        const entryPrice = parsePrice(pricePatterns.entry);
        const stopLoss = parsePrice(pricePatterns.stopLoss);
        const takeProfit1 = parsePrice(pricePatterns.takeProfit1);
        const takeProfit2 = parsePrice(pricePatterns.takeProfit2);

        let confidence: number | undefined;
        for (const pattern of pricePatterns.confidence) {
            const match = analysis.match(pattern);
            if (match) {
                confidence = parseInt(match[1]);
                break;
            }
        }

        console.log('[SignalTracker] Parsed values:', { direction, entryPrice, stopLoss, takeProfit1, takeProfit2, confidence });

        // RELAXED VALIDATION: Save if we have direction (not HOLD) and at least entry price
        // We can still track signals even without perfect SL/TP parsing
        if (direction !== 'HOLD') {
            // If we have entry but missing SL/TP, estimate them
            let finalEntry = entryPrice;
            let finalSL = stopLoss;
            let finalTP = takeProfit1;

            // Try to extract current price from analysis if entry is 0
            if (finalEntry === 0) {
                const currentPriceMatch = analysis.match(/(?:current|harga\s*sekarang|price)[:\s]*[\$]?([\d,\.]+)/i);
                if (currentPriceMatch) {
                    finalEntry = parseFloat(currentPriceMatch[1].replace(/,/g, ''));
                }
            }

            // If still no entry, try to get any reasonable price mentioned
            if (finalEntry === 0) {
                // For gold, look for typical gold prices
                if (symbol.toUpperCase().includes('XAU') || symbol.toUpperCase().includes('GOLD')) {
                    const goldPriceMatch = analysis.match(/\$?(2[0-9]{3}(?:\.[0-9]+)?)/);
                    if (goldPriceMatch) {
                        finalEntry = parseFloat(goldPriceMatch[1]);
                    }
                }
                // For forex pairs, look for typical forex prices
                else {
                    const forexPriceMatch = analysis.match(/(\d+\.\d{4,5})/);
                    if (forexPriceMatch) {
                        finalEntry = parseFloat(forexPriceMatch[1]);
                    }
                }
            }

            // Estimate SL/TP if missing (using typical risk-reward ratios)
            if (finalEntry > 0 && finalSL === 0) {
                // Default 1% stop loss
                finalSL = direction === 'BUY'
                    ? finalEntry * 0.99
                    : finalEntry * 1.01;
            }

            if (finalEntry > 0 && finalTP === 0) {
                // Default 2% take profit (2:1 R:R)
                finalTP = direction === 'BUY'
                    ? finalEntry * 1.02
                    : finalEntry * 0.98;
            }

            // Only save if we have at least entry price
            if (finalEntry > 0) {
                const signalData: SignalData = {
                    type,
                    symbol,
                    timeframe,
                    direction,
                    entryPrice: finalEntry,
                    stopLoss: finalSL,
                    takeProfit1: finalTP,
                    takeProfit2: takeProfit2 > 0 ? takeProfit2 : undefined,
                    confidence,
                };

                console.log('[SignalTracker] Signal data ready:', JSON.stringify(signalData));
                return signalData;
            }
        }

        console.log('[SignalTracker] Could not parse signal - direction:', direction, 'entry:', entryPrice);
        return null;
    } catch (error) {
        console.error('[SignalTracker] Parse signal error:', error);
        return null;
    }
}

// Force save signal regardless of parsing - useful for ensuring all analyses are tracked
export async function forceSaveSignal(
    type: 'forex' | 'stock',
    symbol: string,
    direction: 'BUY' | 'SELL' | 'HOLD',
    currentPrice: number,
    timeframe?: string,
    confidence?: number
): Promise<boolean> {
    if (direction === 'HOLD') return false;

    // Calculate default SL/TP based on direction
    const slPercent = 0.01; // 1%
    const tpPercent = 0.02; // 2%

    const stopLoss = direction === 'BUY'
        ? currentPrice * (1 - slPercent)
        : currentPrice * (1 + slPercent);

    const takeProfit = direction === 'BUY'
        ? currentPrice * (1 + tpPercent)
        : currentPrice * (1 - tpPercent);

    return saveSignal({
        type,
        symbol,
        timeframe,
        direction,
        entryPrice: currentPrice,
        stopLoss,
        takeProfit1: takeProfit,
        confidence,
    });
}

// Get performance summary for a specific period
export async function getPerformanceSummary(period: 'today' | '7d' | '30d' | 'all' = 'all') {
    const turso = getTursoClient();
    if (!turso) return null;

    try {
        let dateFilter = '';
        if (period === 'today') {
            dateFilter = "AND DATE(created_at) = DATE('now')";
        } else if (period === '7d') {
            dateFilter = "AND created_at >= datetime('now', '-7 days')";
        } else if (period === '30d') {
            dateFilter = "AND created_at >= datetime('now', '-30 days')";
        }

        const result = await turso.execute({
            sql: `SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'TP_HIT' THEN 1 ELSE 0 END) as tp_hit,
                SUM(CASE WHEN status = 'SL_HIT' THEN 1 ELSE 0 END) as sl_hit,
                SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending
            FROM ai_signals WHERE 1=1 ${dateFilter}`,
            args: [],
        });

        const stats = result.rows[0];
        const total = Number(stats.total || 0);
        const tpHit = Number(stats.tp_hit || 0);
        const slHit = Number(stats.sl_hit || 0);
        const pending = Number(stats.pending || 0);
        const completed = tpHit + slHit;
        const winRate = completed > 0 ? ((tpHit / completed) * 100).toFixed(1) : '0';

        return {
            total,
            tpHit,
            slHit,
            pending,
            winRate,
        };
    } catch (error) {
        console.error('Get performance summary error:', error);
        return null;
    }
}

// Generate daily report text for Telegram
export async function generateDailyReport(): Promise<string> {
    const today = await getPerformanceSummary('today');
    const overall = await getPerformanceSummary('all');

    if (!today || !overall) {
        return '❌ Gagal generate report';
    }

    const date = new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const report = `
📊 *ARRA7 AI PERFORMANCE REPORT*
📅 ${date}

━━━━━━━━━━━━━━━━━━━━━━━

📈 *HARI INI*
• Total Signal: ${today.total}
• ✅ TP Hit: ${today.tpHit}
• ❌ SL Hit: ${today.slHit}
• ⏳ Pending: ${today.pending}
• 🎯 Win Rate: ${today.winRate}%

━━━━━━━━━━━━━━━━━━━━━━━

📊 *OVERALL PERFORMANCE*
• Total Signal: ${overall.total}
• ✅ TP Hit: ${overall.tpHit}
• ❌ SL Hit: ${overall.slHit}
• ⏳ Pending: ${overall.pending}
• 🎯 Win Rate: ${overall.winRate}%

━━━━━━━━━━━━━━━━━━━━━━━

🤖 Powered by ARRA7 AI
🌐 arra7-app.vercel.app
    `.trim();

    return report;
}
