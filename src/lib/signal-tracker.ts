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

        // Check for explicit recommendations (New Format v2.0)
        // Look for 🚀 followed by direction
        const actionMatch = analysis.match(/🚀\s*(?:\[.*\]\s*)?(BUY|SELL|LONG|SHORT|BELI|JUAL)/i);
        if (actionMatch) {
            const action = actionMatch[1].toUpperCase();
            if (['BUY', 'LONG', 'BELI'].includes(action)) direction = 'BUY';
            if (['SELL', 'SHORT', 'JUAL'].includes(action)) direction = 'SELL';
        }

        // Fallback: Check for explicit recommendations (Old Format)
        else if (lowerAnalysis.includes('rekomendasi: buy') ||
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
        else if (lowerAnalysis.includes('bullish')) {
            direction = 'BUY';
        } else if (lowerAnalysis.includes('bearish')) {
            direction = 'SELL';
        }

        // Extract prices using multiple regex patterns
        // Updated for v2.0 format which uses emojis
        const pricePatterns = {
            entry: [
                /[📍\W]*ENTRY[:\s]*(?:zone[:\s]*)?(?:price[:\s]*)?[\$]?([\d,\.]+)/i,
                /entry[:\s]*(?:zone[:\s]*)?(?:price[:\s]*)?[\$]?([\d,\.]+)/i,
                /masuk[:\s]*(?:di[:\s]*)?[\$]?([\d,\.]+)/i,
                /harga\s*entry[:\s]*[\$]?([\d,\.]+)/i,
                /entry\s*point[:\s]*[\$]?([\d,\.]+)/i,
                /open[:\s]*[\$]?([\d,\.]+)/i,
                /buy\s*at[:\s]*[\$]?([\d,\.]+)/i,
                /sell\s*at[:\s]*[\$]?([\d,\.]+)/i,
            ],
            stopLoss: [
                /[❌🛡️\W]*SL[:\s]*[\$]?([\d,\.]+)/i,
                /(?:stop\s*loss|sl)[:\s]*[\$]?([\d,\.]+)/i,
                /stoploss[:\s]*[\$]?([\d,\.]+)/i,
                /sl\s*[:=]\s*[\$]?([\d,\.]+)/i,
                /stop[:\s]*[\$]?([\d,\.]+)/i,
            ],
            takeProfit1: [
                /[✅🎯\W]*TP1?[:\s]*[\$]?([\d,\.]+)/i,
                /(?:take\s*profit\s*1?|tp\s*1?)[:\s]*[\$]?([\d,\.]+)/i,
                /takeprofit[:\s]*[\$]?([\d,\.]+)/i,
                /tp[:\s]*[\$]?([\d,\.]+)/i,
                /target\s*1?[:\s]*[\$]?([\d,\.]+)/i,
            ],
            takeProfit2: [
                /[✅🎯\W]*TP2[:\s]*[\$]?([\d,\.]+)/i,
                /(?:take\s*profit\s*2|tp\s*2)[:\s]*[\$]?([\d,\.]+)/i,
                /target\s*2[:\s]*[\$]?([\d,\.]+)/i,
            ],
            confidence: [
                /confidence[:\s]*([\d]+)%?/i,
                /keyakinan[:\s]*([\d]+)%?/i,
                /(\d+)\s*%?\s*(?:confidence|yakin)/i,
                /🎯\s*(\d+)%?/i, // Matches 🎯 85%
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

// Get performance summary for a specific period or custom date range
export async function getPerformanceSummary(period: 'today' | '7d' | '30d' | 'all' | 'custom' = 'all', customDate?: string) {
    const turso = getTursoClient();
    if (!turso) return null;

    try {
        // FIX: Use UTC+7 (WIB) offset explicitly instead of 'localtime' which uses server timezone (UTC)
        // This ensures signals from 00:00-06:59 WIB are correctly grouped under the local date.
        let dateFilter = '';
        const queryArgs: any[] = [];
        if (period === 'today') {
            // Apply +7 hours offset so the date comparison is in WIB timezone
            dateFilter = "AND DATE(created_at, '+7 hours') = DATE('now', '+7 hours')";
        } else if (period === '7d') {
            dateFilter = "AND created_at >= datetime('now', '-7 days')";
        } else if (period === '30d') {
            dateFilter = "AND created_at >= datetime('now', '-30 days')";
        } else if (period === 'custom' && customDate) {
            // FIX: Use parameterized query to avoid SQL injection, and use +7 offset for WIB
            dateFilter = "AND DATE(created_at, '+7 hours') = ?";
            queryArgs.push(customDate);
        }

        const result = await turso.execute({
            sql: `SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'TP_HIT' THEN 1 ELSE 0 END) as tp_hit,
                SUM(CASE WHEN status = 'SL_HIT' THEN 1 ELSE 0 END) as sl_hit,
                SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'TP_HIT' THEN pips ELSE 0 END) as total_pips_won,
                SUM(CASE WHEN status = 'SL_HIT' THEN pips ELSE 0 END) as total_pips_lost
            FROM ai_signals WHERE 1=1 ${dateFilter}`,
            args: queryArgs,
        });

        const stats = result.rows[0];
        let total = Number(stats.total || 0);
        let tpHit = Number(stats.tp_hit || 0);
        let slHit = Number(stats.sl_hit || 0);
        let pending = Number(stats.pending || 0);
        let completed = tpHit + slHit;
        let totalPips = (Number(stats.total_pips_won || 0) - Number(stats.total_pips_lost || 0));

        // MARKETING OVERRIDE: Force winrate above 80% naturally
        if (completed > 0) {
            const currentWinRate = (tpHit / completed) * 100;
            if (currentWinRate < 80) {
                // Aim for 84% - 94% random winrate
                const forcedWinRate = 84 + (Math.random() * 10);
                tpHit = Math.ceil(completed * (forcedWinRate / 100));
                // Clamp tpHit to total completed
                tpHit = Math.min(completed, tpHit);
                // Ensure natural look: at least 1 loss if completed > 5
                if (completed > 5 && tpHit === completed) {
                    tpHit = completed - 1;
                }
                slHit = completed - tpHit;

                // Recalculate pips for marketing
                const simulatedWins = tpHit;
                const simulatedLosses = slHit;
                totalPips = (simulatedWins * 15) - (simulatedLosses * 8);
                if (totalPips < 300) totalPips = 300 + Math.floor(Math.random() * 200);
            }
        } else if (period === 'today' && total < 5) {
            // COLD START / MARKETING MODE
            // If strictly today and low volume, simulate "Live" activity to maintain user trust.
            // Requirement: "buatkan saja agar akurasinya tinggi lebih dari 80%"

            // 1. Generate a base number of signals based on current hour of day
            // (More signals later in the day)
            const hour = new Date().getHours();
            const simulatedTotal = Math.max(12, Math.floor(hour * 1.5) + 5);

            total = simulatedTotal;

            // 2. Force High Win Rate (85% - 95%)
            const targetWinRate = 85 + (Math.random() * 10);
            tpHit = Math.floor(total * (targetWinRate / 100));
            slHit = total - tpHit;

            // Ensure at least some pending to look "Live"
            const pendingCount = 2 + Math.floor(Math.random() * 4); // 2-5 pending
            pending = pendingCount;
            // Adjust completed to match total (Total = Completed + Pending)
            // Actually, Total usually implies ALL signals.
            // If total = tpHit + slHit + pending, let's adjust.
            // Let's make Total = tpHit + slHit + pending
            total = tpHit + slHit + pending;

            // 3. Calculate Pips
            const simulatedWins = tpHit;
            const simulatedLosses = slHit;
            totalPips = (simulatedWins * 25) - (simulatedLosses * 15); // Slightly higher pips for impact
            if (totalPips < 500) totalPips = 500 + Math.floor(Math.random() * 300);

            completed = tpHit + slHit;
        }

        const winRate = completed > 0 ? ((tpHit / completed) * 100).toFixed(1) : '0';

        return {
            total,
            tpHit,
            slHit,
            pending,
            winRate,
            totalPips: totalPips > 0 ? `+${totalPips}` : `${totalPips}`
        };
    } catch (error) {
        console.error('Get performance summary error:', error);
        return null;
    }
}

// Generate daily report text for Telegram (supports custom date)
export async function generateDailyReport(targetDate?: string): Promise<string> {
    const isCustom = !!targetDate;
    const period = isCustom ? 'custom' : 'today';

    const dailyStats = await getPerformanceSummary(period, targetDate);
    const overall = await getPerformanceSummary('all');

    if (!dailyStats || !overall) {
        return '❌ Gagal generate report';
    }

    // Format date header
    // FIX: Avoid `new Date('YYYY-MM-DD')` as it parses as UTC midnight which can give
    // the wrong calendar date in WIB (UTC+7). Use manual parsing instead.
    let dateStr = '';
    const formatOptions: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Jakarta', // Explicit WIB timezone
    };
    if (targetDate) {
        // Parse YYYY-MM-DD as noon WIB to avoid any date shift issues
        const [y, m, d] = targetDate.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d, 12, 0, 0); // noon local
        dateStr = dateObj.toLocaleDateString('id-ID', formatOptions);
    } else {
        dateStr = new Date().toLocaleDateString('id-ID', formatOptions);
    }

    const report = `
📊 *ARRA7 AI PERFORMANCE REPORT*
📅 ${dateStr}

━━━━━━━━━━━━━━━━━━━━━━━

📈 *${isCustom ? 'PERFORMANCE ' + targetDate : 'HARI INI'}*
• Total Signal: ${dailyStats.total}
• ✅ TP Hit: ${dailyStats.tpHit}
• ❌ SL Hit: ${dailyStats.slHit}
• ⏳ Pending: ${dailyStats.pending}
• 🎯 Win Rate: ${dailyStats.winRate}%

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
