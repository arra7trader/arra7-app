import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { trades, locale = 'en' } = body;

        if (!trades || !Array.isArray(trades)) {
            return NextResponse.json(
                { error: 'Invalid trades data' },
                { status: 400 }
            );
        }

        // Run analysis with locale
        const analysis = await analyzeTrades(trades, locale);

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

const DIAGNOSIS_MESSAGES = {
    en: {
        revenge: {
            title: 'Revenge Trading Detected',
            desc: (winRate: number, time: number) => `You have a ${winRate.toFixed(1)}% win rate for trades opened within ${time.toFixed(0)} minutes after a loss. This is significantly worse than your overall performance.`,
            prescription: (time: number) => `Implement a mandatory ${Math.ceil(time * 2)} minute cooldown after any losing trade. Use a timer or EA to enforce this rule.`
        },
        session_edge: {
            title: (hour: number) => `Golden Hour: ${hour}:00`,
            desc: (winRate: number, hour: number) => `Your win rate is ${winRate.toFixed(1)}% between ${hour}:00 - ${hour + 1}:00. This is your strongest trading window.`,
            prescription: 'Focus your trading during this hour. Consider increasing position size by 20-30% during this window only.'
        },
        bad_session: {
            title: (hour: number) => `Toxic Hour: ${hour}:00`,
            desc: (winRate: number, hour: number) => `Your win rate drops to ${winRate.toFixed(1)}% between ${hour}:00 - ${hour + 1}:00.`,
            prescription: (hour: number) => `Avoid trading during this hour completely. Set calendar blocks or EA restrictions for ${hour}:00 - ${hour + 1}:00.`
        },
        overtrading: {
            title: 'Overtrading Pattern',
            desc: (avg: number, count: number, profit: number) => `You average ${avg.toFixed(1)} trades per day, with ${count} days exceeding 2x this volume. High-volume days show ${profit < 0 ? 'losses' : 'reduced profits'}.`,
            prescription: (avg: number) => `Set a hard daily limit of ${Math.ceil(avg * 1.5)} trades. Quality over quantity - fewer, better setups.`
        },
        poor_rr: {
            title: 'Poor Risk/Reward Ratio',
            desc: (rr: number) => `Your average R:R is only 1:${rr.toFixed(2)}. Even with good win rate, this makes consistent profitability difficult.`,
            prescription: 'Only take trades with minimum 1:2 R:R. Adjust your TP levels or tighter entry points.'
        },
        strong_rr: {
            title: 'Excellent Risk Management',
            desc: (rr: number) => `Your average R:R is 1:${rr.toFixed(2)}, which is excellent. You're letting winners run.`,
            prescription: 'Maintain this discipline. Your R:R gives you a significant edge.'
        }
    },
    id: {
        revenge: {
            title: 'Terdeteksi Revenge Trading',
            desc: (winRate: number, time: number) => `Win Rate Anda hanya ${winRate.toFixed(1)}% untuk posisi yang dibuka dalam ${time.toFixed(0)} menit setelah loss. Ini merusak performa Anda.`,
            prescription: (time: number) => `Wajib istirahat ${Math.ceil(time * 2)} menit setelah loss (Cooldown). Gunakan timer atau stop trading sejenak agar emosi stabil.`
        },
        session_edge: {
            title: (hour: number) => `Golden Hour: ${hour}:00`,
            desc: (winRate: number, hour: number) => `Win Rate Anda mencapai ${winRate.toFixed(1)}% di jam ${hour}:00 - ${hour + 1}:00. Ini adalah waktu "Hoki" Anda.`,
            prescription: 'Fokus trading hanya di jam ini. Anda bisa pertimbangkan menaikkan lot size 20-30% khusus di jam prime time ini.'
        },
        bad_session: {
            title: (hour: number) => `Jam Keramat (Toxic): ${hour}:00`,
            desc: (winRate: number, hour: number) => `Win Rate Anda hancur ke ${winRate.toFixed(1)}% di jam ${hour}:00 - ${hour + 1}:00.`,
            prescription: (hour: number) => `DILARANG trading di jam ini. Pasang alarm atau blokir akses MT4/MT5 Anda di jam ${hour}:00 - ${hour + 1}:00.`
        },
        overtrading: {
            title: 'Pecandu Trading (Overtrading)',
            desc: (avg: number, count: number, profit: number) => `Rata-rata ${avg.toFixed(1)} trade/hari, tapi ada ${count} hari dimana Anda trade membabi-buta (>2x lipat). Hari-hari itu hasilnya ${profit < 0 ? 'RUGI' : 'profit kecil'}.`,
            prescription: (avg: number) => `Batasi maksimal ${Math.ceil(avg * 1.5)} trade per hari. Cari kualitas, bukan kuantitas.`
        },
        poor_rr: {
            title: 'Risk/Reward Buruk',
            desc: (rr: number) => `Rata-rata R:R Anda cuma 1:${rr.toFixed(2)}. Capek kerja tapi hasil minim. Sekali loss bisa menghapus banyak profit.`,
            prescription: 'Wajib cari setup minimal 1:2. Tipiskan SL atau perlebar TP. Jangan ambil trade "tanggung".'
        },
        strong_rr: {
            title: 'Risk Management Sultan',
            desc: (rr: number) => `Rata-rata R:R Anda 1:${rr.toFixed(2)}. Ini sangat bagus! Anda tipe trader yang "Let Winners Run".`,
            prescription: 'Pertahankan disiplin ini. R:R adalah kunci profit konsisten jangka panjang.'
        }
    }
};

async function analyzeTrades(trades: Trade[], locale: string = 'en') {
    const criticalFlaws: Diagnosis[] = [];
    const strengths: Diagnosis[] = [];
    const recommendations: any[] = [];

    // Fallback to English if locale not found
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msgs = (DIAGNOSIS_MESSAGES as any)[locale] || DIAGNOSIS_MESSAGES.en;

    // 1. Revenge Trading Detection
    const revengeAnalysis = detectRevengeTrading(trades);
    if (revengeAnalysis.detected && revengeAnalysis.winRate < 50) {
        criticalFlaws.push({
            type: 'revenge_trading',
            title: msgs.revenge.title,
            severity: revengeAnalysis.severity,
            description: msgs.revenge.desc(revengeAnalysis.winRate, revengeAnalysis.avgTimeAfterLoss),
            prescription: msgs.revenge.prescription(revengeAnalysis.avgTimeAfterLoss),
            count: revengeAnalysis.count
        });
    }

    // 2. Session Performance Analysis
    const sessionAnalysis = analyzeSessionPerformance(trades);
    if (sessionAnalysis.bestHour !== null) {
        strengths.push({
            type: 'session_edge',
            title: msgs.session_edge.title(sessionAnalysis.bestHour),
            description: msgs.session_edge.desc(sessionAnalysis.bestWinRate, sessionAnalysis.bestHour),
            prescription: msgs.session_edge.prescription,
            winRate: sessionAnalysis.bestWinRate
        });
    }

    if (sessionAnalysis.worstHour !== null && sessionAnalysis.worstWinRate < 40) {
        criticalFlaws.push({
            type: 'bad_session',
            title: msgs.bad_session.title(sessionAnalysis.worstHour),
            severity: 'medium',
            description: msgs.bad_session.desc(sessionAnalysis.worstWinRate, sessionAnalysis.worstHour),
            prescription: msgs.bad_session.prescription(sessionAnalysis.worstHour),
            winRate: sessionAnalysis.worstWinRate
        });
    }

    // 3. Overtrading Detection
    const overtradingAnalysis = detectOvertrading(trades);
    if (overtradingAnalysis.detected) {
        criticalFlaws.push({
            type: 'overtrading',
            title: msgs.overtrading.title,
            severity: 'medium',
            description: msgs.overtrading.desc(overtradingAnalysis.avgTradesPerDay, overtradingAnalysis.highVolumeDays.length, overtradingAnalysis.highVolumeProfit),
            prescription: msgs.overtrading.prescription(overtradingAnalysis.avgTradesPerDay),
            avgTradesPerDay: overtradingAnalysis.avgTradesPerDay
        });
    }

    // 4. Risk/Reward Analysis
    const rrAnalysis = analyzeRiskReward(trades);
    if (rrAnalysis.avgRR < 1.5) {
        criticalFlaws.push({
            type: 'poor_rr',
            title: msgs.poor_rr.title,
            severity: 'high',
            description: msgs.poor_rr.desc(rrAnalysis.avgRR),
            prescription: msgs.poor_rr.prescription,
            avgRR: rrAnalysis.avgRR
        });
    } else if (rrAnalysis.avgRR > 2.5) {
        strengths.push({
            type: 'strong_rr',
            title: msgs.strong_rr.title,
            description: msgs.strong_rr.desc(rrAnalysis.avgRR),
            prescription: msgs.strong_rr.prescription,
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
            severity: (winRate < 40 ? 'high' : 'medium') as 'high' | 'medium',
            avgTimeAfterLoss: avgTime
        };
    }

    return { detected: false, count: 0, winRate: 0, severity: 'low' as const, avgTimeAfterLoss: 0 };
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
