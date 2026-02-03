import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { trades } = body;

        if (!trades || !Array.isArray(trades)) {
            return NextResponse.json(
                { error: 'Invalid trades data' },
                { status: 400 }
            );
        }

        // Run analysis
        const analysis = await analyzeTrades(trades);

        return NextResponse.json(analysis);

    } catch (error) {
        console.error('Analysis error:', error);
        return NextResponse.json(
            { error: 'Failed to analyze trades' },
            { status: 500 }
        );
    }
}

interface Trade {
    ticket: string;
    openTime: string;
    closeTime: string;
    profit: number;
    type: string;
    symbol: string;
    size: number;
}

interface Diagnosis {
    type: string;
    title: string;
    severity?: 'low' | 'medium' | 'high';
    description: string;
    prescription: string;
    count?: number;
    winRate?: number;
    avgTradesPerDay?: number;
    avgRR?: number;
}

async function analyzeTrades(trades: Trade[]) {
    const criticalFlaws: Diagnosis[] = [];
    const strengths: Diagnosis[] = [];
    const recommendations: any[] = [];

    // 1. Revenge Trading Detection
    const revengeAnalysis = detectRevengeTrading(trades);
    if (revengeAnalysis.detected && revengeAnalysis.winRate < 50) {
        criticalFlaws.push({
            type: 'revenge_trading',
            title: 'Revenge Trading',
            severity: revengeAnalysis.severity,
            description: `You have a ${revengeAnalysis.winRate.toFixed(1)}% win rate for trades opened within ${revengeAnalysis.avgTimeAfterLoss.toFixed(0)} minutes after a loss. This is significantly worse than your overall performance.`,
            prescription: `Implement a mandatory ${Math.ceil(revengeAnalysis.avgTimeAfterLoss * 2)} minute cooldown after any losing trade. Use a timer or EA to enforce this rule.`,
            count: revengeAnalysis.count
        });
    }

    // 2. Session Performance Analysis
    const sessionAnalysis = analyzeSessionPerformance(trades);
    if (sessionAnalysis.bestHour !== null) {
        strengths.push({
            type: 'session_edge',
            title: `Golden Hour: ${sessionAnalysis.bestHour}:00`,
            description: `Your win rate is ${sessionAnalysis.bestWinRate.toFixed(1)}% between ${sessionAnalysis.bestHour}:00 - ${sessionAnalysis.bestHour + 1}:00. This is your strongest trading window.`,
            prescription: `Focus your trading during this hour. Consider increasing position size by 20-30% during this window only.`,
            winRate: sessionAnalysis.bestWinRate
        });
    }

    if (sessionAnalysis.worstHour !== null && sessionAnalysis.worstWinRate < 40) {
        criticalFlaws.push({
            type: 'bad_session',
            title: `Toxic Hour: ${sessionAnalysis.worstHour}:00`,
            severity: 'medium',
            description: `Your win rate drops to ${sessionAnalysis.worstWinRate.toFixed(1)}% between ${sessionAnalysis.worstHour}:00 - ${sessionAnalysis.worstHour + 1}:00.`,
            prescription: `Avoid trading during this hour completely. Set calendar blocks or EA restrictions for ${sessionAnalysis.worstHour}:00 - ${sessionAnalysis.worstHour + 1}:00.`,
            winRate: sessionAnalysis.worstWinRate
        });
    }

    // 3. Overtrading Detection
    const overtradingAnalysis = detectOvertrading(trades);
    if (overtradingAnalysis.detected) {
        criticalFlaws.push({
            type: 'overtrading',
            title: 'Overtrading Pattern',
            severity: 'medium',
            description: `You average ${overtradingAnalysis.avgTradesPerDay.toFixed(1)} trades per day, with ${overtradingAnalysis.highVolumeDays.length} days exceeding 2x this volume. High-volume days show ${overtradingAnalysis.highVolumeProfit < 0 ? 'losses' : 'reduced profits'}.`,
            prescription: `Set a hard daily limit of ${Math.ceil(overtradingAnalysis.avgTradesPerDay * 1.5)} trades. Quality over quantity - fewer, better setups.`,
            avgTradesPerDay: overtradingAnalysis.avgTradesPerDay
        });
    }

    // 4. Risk/Reward Analysis
    const rrAnalysis = analyzeRiskReward(trades);
    if (rrAnalysis.avgRR < 1.5) {
        criticalFlaws.push({
            type: 'poor_rr',
            title: 'Poor Risk/Reward Ratio',
            severity: 'high',
            description: `Your average R:R is only 1:${rrAnalysis.avgRR.toFixed(2)}. Even with good win rate, this makes consistent profitability difficult.`,
            prescription: `Only take trades with minimum 1:2 R:R. Adjust your TP levels or tighter entry points.`,
            avgRR: rrAnalysis.avgRR
        });
    } else if (rrAnalysis.avgRR > 2.5) {
        strengths.push({
            type: 'strong_rr',
            title: 'Excellent Risk Management',
            description: `Your average R:R is 1:${rrAnalysis.avgRR.toFixed(2)}, which is excellent. You're letting winners run.`,
            prescription: `Maintain this discipline. Your R:R gives you a significant edge.`,
            avgRR: rrAnalysis.avgRR
        });
    }

    return {
        criticalFlaws,
        strengths,
        recommendations,
        charts: {
            hourlyPerformance: sessionAnalysis.hourlyStats,
            dailyVolume: overtradingAnalysis.dailyStats
        }
    };
}

function detectRevengeTrading(trades: Trade[]) {
    const revengeTrades = [];

    for (let i = 1; i < trades.length; i++) {
        const prevTrade = trades[i - 1];
        const currTrade = trades[i];

        if (prevTrade.profit < 0) {
            try {
                const prevClose = new Date(prevTrade.closeTime.replace(/\./g, '-'));
                const currOpen = new Date(currTrade.openTime.replace(/\./g, '-'));

                const timeDiffMinutes = (currOpen.getTime() - prevClose.getTime()) / (1000 * 60);

                if (timeDiffMinutes < 30 && timeDiffMinutes >= 0) {
                    revengeTrades.push({
                        trade: currTrade,
                        minutesAfterLoss: timeDiffMinutes,
                        prevLoss: prevTrade.profit
                    });
                }
            } catch (e) {
                continue;
            }
        }
    }

    if (revengeTrades.length > 0) {
        const revengeWins = revengeTrades.filter(rt => rt.trade.profit > 0).length;
        const winRate = (revengeWins / revengeTrades.length) * 100;
        const avgTime = revengeTrades.reduce((sum, rt) => sum + rt.minutesAfterLoss, 0) / revengeTrades.length;

        return {
            detected: true,
            count: revengeTrades.length,
            winRate,
            severity: winRate < 40 ? 'high' : 'medium',
            avgTimeAfterLoss: avgTime
        };
    }

    return { detected: false, count: 0, winRate: 0, severity: 'low', avgTimeAfterLoss: 0 };
}

function analyzeSessionPerformance(trades: Trade[]) {
    const hourlyStats: Record<number, { trades: Trade[], wins: number, losses: number, profit: number }> = {};

    for (const trade of trades) {
        try {
            const openTime = new Date(trade.openTime.replace(/\./g, '-'));
            const hour = openTime.getHours();

            if (!hourlyStats[hour]) {
                hourlyStats[hour] = { trades: [], wins: 0, losses: 0, profit: 0 };
            }

            hourlyStats[hour].trades.push(trade);
            hourlyStats[hour].profit += trade.profit;

            if (trade.profit > 0) {
                hourlyStats[hour].wins++;
            } else {
                hourlyStats[hour].losses++;
            }
        } catch (e) {
            continue;
        }
    }

    let bestHour = null;
    let worstHour = null;
    let bestWinRate = 0;
    let worstWinRate = 100;

    for (const [hourStr, stats] of Object.entries(hourlyStats)) {
        const hour = parseInt(hourStr);
        const total = stats.trades.length;

        if (total >= 5) { // Minimum 5 trades for significance
            const winRate = (stats.wins / total) * 100;

            if (winRate > bestWinRate) {
                bestWinRate = winRate;
                bestHour = hour;
            }

            if (winRate < worstWinRate) {
                worstWinRate = winRate;
                worstHour = hour;
            }
        }
    }

    return {
        hourlyStats,
        bestHour,
        bestWinRate,
        worstHour,
        worstWinRate
    };
}

function detectOvertrading(trades: Trade[]) {
    const dailyStats: Record<string, Trade[]> = {};

    for (const trade of trades) {
        try {
            const openTime = new Date(trade.openTime.replace(/\./g, '-'));
            const dateKey = openTime.toISOString().split('T')[0];

            if (!dailyStats[dateKey]) {
                dailyStats[dateKey] = [];
            }

            dailyStats[dateKey].push(trade);
        } catch (e) {
            continue;
        }
    }

    const tradeCounts = Object.values(dailyStats).map(dayTrades => dayTrades.length);
    const avgTradesPerDay = tradeCounts.reduce((sum, count) => sum + count, 0) / tradeCounts.length;

    const highVolumeDays = [];
    let highVolumeProfit = 0;

    for (const [date, dayTrades] of Object.entries(dailyStats)) {
        if (dayTrades.length > avgTradesPerDay * 2) {
            const profit = dayTrades.reduce((sum, t) => sum + t.profit, 0);
            highVolumeProfit += profit;
            highVolumeDays.push({
                date,
                trades: dayTrades.length,
                profit
            });
        }
    }

    return {
        avgTradesPerDay,
        highVolumeDays,
        highVolumeProfit,
        dailyStats,
        detected: highVolumeDays.length > 0
    };
}

function analyzeRiskReward(trades: Trade[]) {
    // This is simplified - in real implementation, you'd calculate from SL/TP
    const profitableTrades = trades.filter(t => t.profit > 0);
    const losingTrades = trades.filter(t => t.profit < 0);

    if (losingTrades.length === 0) return { avgRR: 0 };

    const avgWin = profitableTrades.reduce((sum, t) => sum + t.profit, 0) / profitableTrades.length;
    const avgLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.profit, 0) / losingTrades.length);

    const avgRR = avgLoss > 0 ? avgWin / avgLoss : 0;

    return { avgRR };
}
