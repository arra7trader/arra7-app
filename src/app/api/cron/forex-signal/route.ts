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

        // 1.5. MANAGE ACTIVE SIGNALS (Check TP/SL)
        try {
            const { default: getTursoClient } = await import('@/lib/turso');
            const turso = getTursoClient();
            if (turso) {
                const activeSignals = await turso.execute({
                    sql: `SELECT * FROM provider_signals 
                          WHERE provider_id = 'provider_ai_genesis' AND status = 'active'`,
                    args: []
                });

                for (const signal of activeSignals.rows) {
                    const entry = signal.entry_price as number;
                    const sl = signal.stop_loss as number;
                    const tp = signal.take_profit as number;
                    const action = signal.action as string; // 'BUY' or 'SELL'
                    let outcome: 'WIN' | 'LOSS' | 'OPEN' = 'OPEN';
                    let pips = 0;

                    // Support both legacy 'LONG'/'SHORT' and new 'BUY'/'SELL' formats
                    if (action === 'BUY' || action === 'LONG') {
                        if (currentPrice >= tp) { outcome = 'WIN'; pips = (tp - entry) * 10; } // TP Hit
                        else if (currentPrice <= sl) { outcome = 'LOSS'; pips = (sl - entry) * 10; } // SL Hit
                    } else if (action === 'SELL' || action === 'SHORT') {
                        if (currentPrice <= tp) { outcome = 'WIN'; pips = (entry - tp) * 10; } // TP Hit
                        else if (currentPrice >= sl) { outcome = 'LOSS'; pips = (entry - sl) * 10; } // SL Hit
                    }

                    if (outcome !== 'OPEN') {
                        // Close Signal
                        await turso.execute({
                            sql: `UPDATE provider_signals 
                                  SET status = 'closed', result_pips = ?, closed_at = datetime('now') 
                                  WHERE id = ?`,
                            args: [pips, signal.id]
                        });

                        // Update Provider Stats
                        const isWin = outcome === 'WIN';
                        const profitUsd = pips * 1; // Approx $1 per pip for 0.1 lot on XAUUSD (simplified)

                        await turso.execute({
                            sql: `UPDATE provider_statistics 
                                  SET total_trades = total_trades + 1,
                                      winning_trades = winning_trades + ?,
                                      losing_trades = losing_trades + ?,
                                      net_profit_usd = net_profit_usd + ?
                                  WHERE provider_id = 'provider_ai_genesis'`,
                            args: [isWin ? 1 : 0, isWin ? 0 : 1, profitUsd]
                        });
                        console.log(`[ForexSignal] Closed Signal ${signal.id} (${outcome}: ${pips.toFixed(1)} pips)`);
                    }
                }
            }
        } catch (err) {
            console.error('[ForexSignal] Error managing active signals:', err);
        }

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

                    // 5b. Log to PROVIDER_SIGNALS (for Copy Trade System)
                    // AI GENESIS PROVIDER ID: 'provider_ai_genesis'
                    try {
                        const signalId = `sig_ai_${Date.now()}`;
                        await turso.execute({
                            sql: `INSERT INTO provider_signals (
                                    id, provider_id, pair, action, 
                                    entry_price, stop_loss, take_profit, 
                                    commentary, status, timeframe
                                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', '10m')`,
                            args: [
                                signalId,
                                'provider_ai_genesis', // Fixed ID for AI
                                'XAUUSD',
                                setup.action === 'LONG' ? 'BUY' : 'SELL', // Map for Copytrade UI
                                setup.entry,
                                setup.sl,
                                setup.tp,
                                `AI Confidence: ${(prediction.confidence * 100).toFixed(0)}%`,
                            ]
                        });
                        console.log('[ForexSignal] Linked to AI Genesis Provider');
                    } catch (err) {
                        console.error('[ForexSignal] Failed to link provider signal:', err);
                    }
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
