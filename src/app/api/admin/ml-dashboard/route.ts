import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMLAccuracyStats, getRecentMLPredictions } from '@/lib/turso';

const ADMIN_EMAILS = ['apmexplore@gmail.com'];

// GET - Admin ML performance dashboard data
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const symbol = searchParams.get('symbol') || 'BTCUSD';
        const days = parseInt(searchParams.get('days') || '7');

        // Get stats from Turso
        const stats = await getMLAccuracyStats(symbol, days);
        const recentPredictions = await getRecentMLPredictions(symbol, 50);

        // Calculate additional metrics
        const totalPredictions = stats.total;
        const accuracy = stats.accuracy;

        // Model performance ranking
        const modelRanking = Object.entries(stats.byModel)
            .map(([model, data]) => ({
                model,
                accuracy: data.accuracy,
                total: data.total,
                correct: data.correct
            }))
            .sort((a, b) => b.accuracy - a.accuracy);

        // Direction performance
        const directionPerformance = {
            UP: stats.byDirection.UP || { total: 0, correct: 0, accuracy: 0 },
            NEUTRAL: stats.byDirection.NEUTRAL || { total: 0, correct: 0, accuracy: 0 },
            DOWN: stats.byDirection.DOWN || { total: 0, correct: 0, accuracy: 0 }
        };

        // Calculate win rate streaks from recent predictions
        let currentStreak = 0;
        let maxStreak = 0;
        let currentStreakType: 'win' | 'loss' | null = null;

        for (const pred of recentPredictions) {
            if (pred.is_correct === undefined || pred.is_correct === null) continue;

            const isWin = pred.is_correct === 1;

            if (currentStreakType === null) {
                currentStreakType = isWin ? 'win' : 'loss';
                currentStreak = 1;
            } else if ((isWin && currentStreakType === 'win') || (!isWin && currentStreakType === 'loss')) {
                currentStreak++;
            } else {
                if (currentStreakType === 'win' && currentStreak > maxStreak) {
                    maxStreak = currentStreak;
                }
                currentStreakType = isWin ? 'win' : 'loss';
                currentStreak = 1;
            }
        }
        if (currentStreakType === 'win' && currentStreak > maxStreak) {
            maxStreak = currentStreak;
        }

        // Confidence analysis
        let avgConfidence = 0;
        let highConfidenceAccuracy = 0;
        let highConfidenceCount = 0;
        let highConfidenceCorrect = 0;

        for (const pred of recentPredictions) {
            if (pred.confidence) {
                avgConfidence += pred.confidence as number;
            }
            if ((pred.confidence as number) > 0.7) {
                highConfidenceCount++;
                if (pred.is_correct === 1) highConfidenceCorrect++;
            }
        }

        if (recentPredictions.length > 0) {
            avgConfidence = avgConfidence / recentPredictions.length;
        }
        if (highConfidenceCount > 0) {
            highConfidenceAccuracy = highConfidenceCorrect / highConfidenceCount;
        }

        return NextResponse.json({
            symbol,
            period: `${days} days`,
            overview: {
                totalPredictions,
                accuracy: Math.round(accuracy * 100),
                avgConfidence: Math.round(avgConfidence * 100),
                maxWinStreak: maxStreak
            },
            modelRanking,
            directionPerformance,
            confidenceAnalysis: {
                avgConfidence: Math.round(avgConfidence * 100),
                highConfidenceAccuracy: Math.round(highConfidenceAccuracy * 100),
                highConfidenceCount
            },
            recentPredictions: recentPredictions.slice(0, 20).map(p => ({
                id: p.id,
                direction: p.direction,
                confidence: Math.round((p.confidence as number) * 100),
                model: p.model_used,
                isCorrect: p.is_correct === 1,
                createdAt: p.created_at
            })),
            generated: new Date().toISOString()
        });

    } catch (error) {
        console.error('Admin ML Dashboard Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
