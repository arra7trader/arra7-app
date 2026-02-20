import { NextRequest, NextResponse } from 'next/server';
import { getBrokerPrice } from '@/lib/market-data';
import { getPredictor } from '@/lib/smart-predictor';

export const maxDuration = 60; // Allow 1 minute timeout for cron

export async function GET(request: NextRequest) {
    try {
        // Authenticate Cron Job (Vercel CRON_SECRET)
        const authHeader = request.headers.get('authorization');
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Fetch Real-Time Data (XAUUSD)
        // Try Swissquote first (primary), then OANDA
        let marketData;
        try {
            marketData = await getBrokerPrice('XAUUSD', '5m', 'swissquote');
        } catch (e) {
            console.warn('[ForexSignal] Swissquote failed, trying OANDA/Yahoo...');
            try {
                marketData = await getBrokerPrice('XAUUSD', '5m', 'oanda');
            } catch (e2) {
                // Final fallback if configured
                console.error('[ForexSignal] All feeds failed');
                return NextResponse.json({ error: 'Market data unavailable' }, { status: 503 });
            }
        }

        if (!marketData || marketData.is_simulated) {
            return NextResponse.json({ error: 'Real-time data required' }, { status: 400 });
        }

        const currentPrice = marketData.current_price;
        // Convert Candles to PriceHistory format
        const priceHistory = marketData.candles.map(c => ({
            price: c.close,
            timestamp: new Date(c.time).getTime(),
            volume: c.volume
        }));

        // 2. Generate Prediction
        const predictor = getPredictor('XAUUSD', 10);
        const prediction = predictor.predictForex(currentPrice, priceHistory);

        console.log(`[ForexSignal] XAUUSD: ${prediction.direction} (${prediction.confidence})`);

        // 3. Evaluate for Broadcast
        // Criteria: High Confidence (>0.75) AND Clear Direction (UP/DOWN)
        if (prediction.confidence > 0.75 && prediction.direction !== 'NEUTRAL') {
            const setup = prediction.tradeSetup;
            if (setup) {
                // Check if signal already sent recently (Duplicate Check)
                const { default: getTursoClient } = await import('@/lib/turso');
                const turso = getTursoClient();

                if (turso) {
                    const recentSignals = await turso.execute({
                        sql: `SELECT * FROM ai_signals 
                              WHERE symbol = ? AND created_at > datetime('now', '-60 minutes') 
                              ORDER BY created_at DESC LIMIT 1`,
                        args: ['XAUUSD']
                    });

                    if (recentSignals.rows.length > 0) {
                        const lastSignal = recentSignals.rows[0];
                        // If same direction, skip (don't spam)
                        if (lastSignal.direction === prediction.direction) {
                            console.log('[ForexSignal] Skipping duplicate signal (sent recently)');
                            return NextResponse.json({ success: true, message: 'Duplicate signal skipped' });
                        }
                    }
                }

                // Formatting Message
                const actionEmoji = setup.action === 'LONG' ? '🟢 BUY' : '🔴 SELL';
                const message = `
**🔔 AI GENESIS SIGNAL**

**Pair:** XAUUSD (Gold)
**Action:** ${actionEmoji} NOW
**Entry:** ${setup.entry}
**TP:** ${setup.tp}
**SL:** ${setup.sl}

**Confidence:** ${(prediction.confidence * 100).toFixed(0)}%
**Analysis:**
${prediction.signals.filter(s => s.signal !== 0).map(s => `- ${s.name}: ${s.signal > 0 ? 'Bullish' : 'Bearish'}`).join('\n')}

_DYOR. Money Management Recommended._
`.trim();

                // 4. Broadcast
                const { broadcastSignalToSubscribers } = await import('@/lib/telegram');
                const stats = await broadcastSignalToSubscribers(message);

                // 5. Log to DB
                if (turso) {
                    await turso.execute({
                        sql: `INSERT INTO ai_signals (type, symbol, timeframe, direction, entry_price, stop_loss, take_profit_1, confidence, status)
                              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
                        args: [
                            'FOREX',
                            'XAUUSD',
                            '10m', // horizon
                            prediction.direction,
                            setup.entry,
                            setup.sl,
                            setup.tp,
                            Math.floor(prediction.confidence * 100)
                        ]
                    });
                }

                return NextResponse.json({
                    success: true,
                    signal: setup,
                    broadcast: stats
                });
            }
        }

        return NextResponse.json({
            success: true,
            message: 'No high-confidence signal generated',
            prediction: {
                direction: prediction.direction,
                confidence: prediction.confidence
            }
        });

    } catch (error) {
        console.error('[ForexSignal] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
