// Social Trading Feed Library - Anonymized analysis sharing
import getTursoClient from './turso';
import crypto from 'crypto';

export interface SocialFeedItem {
    id?: number;
    userHash: string;
    symbol: string;
    timeframe?: string;
    direction?: string;
    confidence?: number;
    entryPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
    analysisSummary?: string;
    likes: number;
    createdAt?: string;
}

export interface TrendingPair {
    symbol: string;
    count: number;
    direction: 'BULLISH' | 'BEARISH' | 'MIXED';
    avgConfidence: number;
}

// Generate anonymous user hash
export function generateUserHash(userId: string): string {
    const today = new Date().toISOString().split('T')[0]; // Daily rotation
    return crypto.createHash('sha256').update(`${userId}-${today}`).digest('hex').substring(0, 8);
}

// Get recent social feed items
export async function getSocialFeed(limit = 20, offset = 0): Promise<SocialFeedItem[]> {
    const turso = getTursoClient();
    if (!turso) return [];

    try {
        const result = await turso.execute({
            sql: `SELECT * FROM social_feed ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            args: [limit, offset],
        });

        return result.rows.map(row => ({
            id: row.id as number,
            userHash: row.user_hash as string,
            symbol: row.symbol as string,
            timeframe: row.timeframe as string | undefined,
            direction: row.direction as string | undefined,
            confidence: row.confidence as number | undefined,
            entryPrice: row.entry_price as number | undefined,
            stopLoss: row.stop_loss as number | undefined,
            takeProfit: row.take_profit as number | undefined,
            analysisSummary: row.analysis_summary as string | undefined,
            likes: (row.likes as number) || 0,
            createdAt: row.created_at as string,
        }));
    } catch (error) {
        console.error('Get social feed error:', error);
        return [];
    }
}

// Add analysis to social feed
export async function addToSocialFeed(
    userId: string,
    symbol: string,
    timeframe: string,
    direction: string,
    confidence: number,
    entryPrice?: number,
    stopLoss?: number,
    takeProfit?: number,
    analysisSummary?: string
): Promise<boolean> {
    const turso = getTursoClient();
    if (!turso) return false;

    const userHash = generateUserHash(userId);

    try {
        await turso.execute({
            sql: `INSERT INTO social_feed (user_hash, symbol, timeframe, direction, confidence, entry_price, stop_loss, take_profit, analysis_summary)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                userHash,
                symbol,
                timeframe,
                direction,
                confidence,
                entryPrice || null,
                stopLoss || null,
                takeProfit || null,
                analysisSummary || null,
            ],
        });
        return true;
    } catch (error) {
        console.error('Add to social feed error:', error);
        return false;
    }
}

// Like a signal
export async function likeSignal(signalId: number): Promise<boolean> {
    const turso = getTursoClient();
    if (!turso) return false;

    try {
        await turso.execute({
            sql: `UPDATE social_feed SET likes = likes + 1 WHERE id = ?`,
            args: [signalId],
        });
        return true;
    } catch (error) {
        console.error('Like signal error:', error);
        return false;
    }
}

// Get trending pairs (most analyzed in last 24h)
export async function getTrendingPairs(): Promise<TrendingPair[]> {
    const turso = getTursoClient();
    if (!turso) return [];

    try {
        const result = await turso.execute({
            sql: `SELECT 
                    symbol,
                    COUNT(*) as count,
                    SUM(CASE WHEN direction = 'BUY' THEN 1 ELSE 0 END) as buy_count,
                    SUM(CASE WHEN direction = 'SELL' THEN 1 ELSE 0 END) as sell_count,
                    AVG(confidence) as avg_confidence
                  FROM social_feed 
                  WHERE created_at >= datetime('now', '-24 hours')
                  GROUP BY symbol
                  ORDER BY count DESC
                  LIMIT 10`,
            args: [],
        });

        return result.rows.map(row => {
            const buyCount = Number(row.buy_count) || 0;
            const sellCount = Number(row.sell_count) || 0;
            let direction: 'BULLISH' | 'BEARISH' | 'MIXED' = 'MIXED';
            if (buyCount > sellCount * 1.5) direction = 'BULLISH';
            else if (sellCount > buyCount * 1.5) direction = 'BEARISH';

            return {
                symbol: row.symbol as string,
                count: Number(row.count) || 0,
                direction,
                avgConfidence: Number(row.avg_confidence) || 0,
            };
        });
    } catch (error) {
        console.error('Get trending pairs error:', error);
        return [];
    }
}

// Parse signal data from AI analysis text
export function parseSignalFromAnalysis(analysisText: string): {
    direction: 'BUY' | 'SELL' | null;
    confidence: number;
    summary: string;
} {
    const lowerText = analysisText.toLowerCase();

    // Detect direction
    let direction: 'BUY' | 'SELL' | null = null;
    if (lowerText.includes('buy') || lowerText.includes('bullish') || lowerText.includes('beli')) {
        direction = 'BUY';
    } else if (lowerText.includes('sell') || lowerText.includes('bearish') || lowerText.includes('jual')) {
        direction = 'SELL';
    }

    // Extract confidence (look for patterns like "80%", "Confidence: 75%")
    const confidenceMatch = analysisText.match(/(\d{2,3})%/);
    const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 50;

    // Create short summary (first 150 chars, cleaned)
    const summary = analysisText
        .replace(/[🔮📊💱🎯⚠️━─●○◆►]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 150) + '...';

    return { direction, confidence, summary };
}
