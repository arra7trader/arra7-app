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
    if (!turso) return false;

    try {
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
        return true;
    } catch (error) {
        console.error('Save signal error:', error);
        return false;
    }
}

// Parse AI analysis text to extract signal data
export function parseSignalFromAnalysis(analysis: string, type: 'forex' | 'stock', symbol: string, timeframe?: string): SignalData | null {
    try {
        // Try to extract structured data from AI response
        const lowerAnalysis = analysis.toLowerCase();

        // Determine direction
        let direction: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
        if (lowerAnalysis.includes('buy') || lowerAnalysis.includes('bullish') || lowerAnalysis.includes('long')) {
            direction = 'BUY';
        } else if (lowerAnalysis.includes('sell') || lowerAnalysis.includes('bearish') || lowerAnalysis.includes('short')) {
            direction = 'SELL';
        }

        // Extract prices using regex patterns
        const entryMatch = analysis.match(/entry[:\s]*(?:zone[:\s]*)?[\$]?([\d,]+\.?\d*)/i);
        const slMatch = analysis.match(/(?:stop\s*loss|sl)[:\s]*[\$]?([\d,]+\.?\d*)/i);
        const tp1Match = analysis.match(/(?:take\s*profit\s*1?|tp\s*1?)[:\s]*[\$]?([\d,]+\.?\d*)/i);
        const tp2Match = analysis.match(/(?:take\s*profit\s*2|tp\s*2)[:\s]*[\$]?([\d,]+\.?\d*)/i);
        const confidenceMatch = analysis.match(/(?:confidence|score)[:\s]*(\d+)/i);

        const parsePrice = (match: RegExpMatchArray | null): number => {
            if (!match) return 0;
            return parseFloat(match[1].replace(',', ''));
        };

        const entryPrice = parsePrice(entryMatch);
        const stopLoss = parsePrice(slMatch);
        const takeProfit1 = parsePrice(tp1Match);
        const takeProfit2 = parsePrice(tp2Match);
        const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : undefined;

        // Only save if we have essential data
        if (direction !== 'HOLD' && entryPrice > 0 && stopLoss > 0 && takeProfit1 > 0) {
            return {
                type,
                symbol,
                timeframe,
                direction,
                entryPrice,
                stopLoss,
                takeProfit1,
                takeProfit2: takeProfit2 > 0 ? takeProfit2 : undefined,
                confidence,
            };
        }

        return null;
    } catch (error) {
        console.error('Parse signal error:', error);
        return null;
    }
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
