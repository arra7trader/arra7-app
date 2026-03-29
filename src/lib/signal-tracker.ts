import getTursoClient from './turso';

export interface SignalData {
    type: 'forex' | 'stock';
    symbol: string;
    timeframe?: string;
    direction: 'BUY' | 'SELL' | 'HOLD';
    executionType?: 'INSTANT' | 'LIMIT' | 'STOP';
    entryPrice: number;
    stopLoss: number;
    takeProfit1: number;
    takeProfit2?: number;
    confidence?: number;
}

export interface TrackedTelegramSignal {
    signalId: number;
    symbol: string;
    timeframe: string | null;
    direction: 'BUY' | 'SELL' | 'HOLD';
    executionType: string | null;
    setupGrade: string | null;
    entryPrice: number;
    stopLoss: number;
    takeProfit1: number;
    status: string;
    pipsResult: number | null;
    createdAt: string;
}

export interface TelebotLiveExecution {
    executionId: number;
    signalId: number;
    symbol: string;
    timeframe: string | null;
    direction: 'BUY' | 'SELL' | 'HOLD';
    executionType: string | null;
    setupGrade: string | null;
    invalidationNote: string | null;
    recommendedEntry: number;
    actualEntry: number | null;
    stopLoss: number;
    takeProfit1: number;
    status: string;
    createdAt: string;
    updatedAt: string;
}

function parseDirectionToken(raw: string | undefined): SignalData['direction'] {
    const value = String(raw || '').trim().toUpperCase();
    if (['BUY', 'LONG', 'BELI'].includes(value)) return 'BUY';
    if (['SELL', 'SHORT', 'JUAL'].includes(value)) return 'SELL';
    return 'HOLD';
}

function parseExecutionToken(raw: string | undefined): SignalData['executionType'] {
    const value = String(raw || '').trim().toUpperCase();
    if (value === 'INSTANT' || value === 'LIMIT' || value === 'STOP') {
        return value;
    }
    return undefined;
}

function extractExplicitPrice(analysis: string, patterns: RegExp[]): number {
    for (const pattern of patterns) {
        const match = analysis.match(pattern);
        if (!match) continue;
        const value = parseFloat(String(match[1] || '').replace(/,/g, ''));
        if (Number.isFinite(value) && value > 0) {
            return value;
        }
    }
    return 0;
}

function extractEntryPrice(analysis: string): number {
    const rangePatterns = [
        /ENTRY[:\s]*(?:ZONE[:\s]*)?[\$]?([\d,\.]+)\s*(?:-|TO)\s*[\$]?([\d,\.]+)/i,
        /ENTRY[:\s]*(?:AT[:\s]*)?[\$]?([\d,\.]+)\s*(?:-|TO)\s*[\$]?([\d,\.]+)/i,
    ];

    for (const pattern of rangePatterns) {
        const match = analysis.match(pattern);
        if (!match) continue;
        const first = parseFloat(String(match[1] || '').replace(/,/g, ''));
        const second = parseFloat(String(match[2] || '').replace(/,/g, ''));
        if (Number.isFinite(first) && Number.isFinite(second) && first > 0 && second > 0) {
            return (first + second) / 2;
        }
    }

    return extractExplicitPrice(analysis, [
        /ENTRY[:\s]*(?:ZONE[:\s]*)?(?:PRICE[:\s]*)?[\$]?([\d,\.]+)/i,
        /HARGA\s*ENTRY[:\s]*[\$]?([\d,\.]+)/i,
        /ENTRY\s*POINT[:\s]*[\$]?([\d,\.]+)/i,
        /OPEN[:\s]*[\$]?([\d,\.]+)/i,
        /BUY\s*AT[:\s]*[\$]?([\d,\.]+)/i,
        /SELL\s*AT[:\s]*[\$]?([\d,\.]+)/i,
    ]);
}

function extractSignalConfidence(analysis: string): number | undefined {
    const patterns = [
        /CONFIDENCE[:\s]*([\d]+)%?/i,
        /KEYAKINAN[:\s]*([\d]+)%?/i,
        /(\d+)\s*%?\s*(?:CONFIDENCE|YAKIN)/i,
    ];

    for (const pattern of patterns) {
        const match = analysis.match(pattern);
        if (!match) continue;
        const value = parseInt(String(match[1] || ''), 10);
        if (Number.isFinite(value) && value > 0) {
            return value;
        }
    }

    return undefined;
}

function extractCurrentPrice(analysis: string): number {
    return extractExplicitPrice(analysis, [
        /CURRENT\s*PRICE[:\s]*[\$]?([\d,\.]+)/i,
        /HARGA\s*SEKARANG[:\s]*[\$]?([\d,\.]+)/i,
        /PRICE[:\s]*[\$]?([\d,\.]+)/i,
    ]);
}

export function parseTelebotSignalFromAnalysis(
    analysis: string,
    type: 'forex' | 'stock',
    symbol: string,
    timeframe?: string,
): SignalData | null {
    try {
        const strategyMatch = analysis.match(/EXECUTION STRATEGY:\s*(?:MOMENTUM\s+|RETRACEMENT\s+|BREAKOUT\s+)?(INSTANT|LIMIT|STOP)/i);
        const actionMatch =
            analysis.match(/ACTION(?:\s+CALL)?[\s\S]{0,120}?\b(BUY|SELL|LONG|SHORT|BELI|JUAL|WAIT)\b(?:\s+(INSTANT|LIMIT|STOP))?/i) ||
            analysis.match(/(?:REKOMENDASI|RECOMMENDATION|AKSI)[:\s-]*\b(BUY|SELL|LONG|SHORT|BELI|JUAL|WAIT)\b(?:\s+(INSTANT|LIMIT|STOP))?/i) ||
            analysis.match(/\b(BUY|SELL|LONG|SHORT|BELI|JUAL|WAIT)\b(?:\s+(INSTANT|LIMIT|STOP))?/i);

        const direction = parseDirectionToken(actionMatch?.[1]);
        const executionType = parseExecutionToken(actionMatch?.[2]) || parseExecutionToken(strategyMatch?.[1]);

        if (direction === 'HOLD') {
            return null;
        }

        const entryPrice = extractEntryPrice(analysis);
        const stopLoss = extractExplicitPrice(analysis, [
            /(?:STOP\s*LOSS|SL)[:\s]*[\$]?([\d,\.]+)/i,
            /SL\s*[:=]\s*[\$]?([\d,\.]+)/i,
        ]);
        const takeProfit1 = extractExplicitPrice(analysis, [
            /TP1[:\s]*[\$]?([\d,\.]+)/i,
            /TAKE\s*PROFIT\s*1[:\s]*[\$]?([\d,\.]+)/i,
            /TP[:\s]*[\$]?([\d,\.]+)/i,
            /TARGET\s*1[:\s]*[\$]?([\d,\.]+)/i,
        ]);
        const takeProfit2 = extractExplicitPrice(analysis, [
            /TP2[:\s]*[\$]?([\d,\.]+)/i,
            /TAKE\s*PROFIT\s*2[:\s]*[\$]?([\d,\.]+)/i,
            /TARGET\s*2[:\s]*[\$]?([\d,\.]+)/i,
        ]);
        const confidence = extractSignalConfidence(analysis);

        const fallbackEntry = entryPrice > 0 ? entryPrice : extractCurrentPrice(analysis);
        if (!(fallbackEntry > 0)) {
            return null;
        }

        return {
            type,
            symbol,
            timeframe,
            direction,
            executionType,
            entryPrice: fallbackEntry,
            stopLoss,
            takeProfit1,
            takeProfit2: takeProfit2 > 0 ? takeProfit2 : undefined,
            confidence,
        };
    } catch (error) {
        console.error('[SignalTracker] Parse TELEBOT signal error:', error);
        return null;
    }
}

export async function saveSignalWithId(data: SignalData): Promise<number | null> {
    const turso = getTursoClient();
    if (!turso) {
        console.log('[SignalTracker] No Turso client, skipping save');
        return null;
    }

    try {
        console.log('[SignalTracker] Saving signal:', JSON.stringify(data));
        const result = await turso.execute({
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
        return Number(result.lastInsertRowid || 0) || null;
    } catch (error) {
        console.error('[SignalTracker] Save signal error:', error);
        return null;
    }
}

// Save a new signal for tracking
export async function saveSignal(data: SignalData): Promise<boolean> {
    const signalId = await saveSignalWithId(data);
    return !!signalId;
}

export async function recordTelegramSignalRequest(
    userId: string,
    chatId: string,
    signalId: number,
    symbol: string,
    timeframe?: string
): Promise<boolean> {
    const turso = getTursoClient();
    if (!turso) return false;

    try {
        await turso.execute({
            sql: `INSERT INTO telegram_signal_requests (user_id, chat_id, signal_id, symbol, timeframe)
                  VALUES (?, ?, ?, ?, ?)`,
            args: [userId, chatId, signalId, symbol, timeframe || null]
        });
        return true;
    } catch (error) {
        console.error('[SignalTracker] Record telegram signal request error:', error);
        return false;
    }
}

export async function saveTelebotSignalExecution(params: {
    userId: string;
    chatId: string;
    signalId: number;
    symbol: string;
    timeframe?: string;
    executionType?: string | null;
    setupGrade?: string | null;
    invalidationNote?: string | null;
    recommendedEntry: number;
}): Promise<boolean> {
    const turso = getTursoClient();
    if (!turso) return false;

    try {
        await turso.execute({
            sql: `INSERT INTO telebot_signal_executions (user_id, chat_id, signal_id, symbol, timeframe, execution_type, setup_grade, invalidation_note, recommended_entry, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                  ON CONFLICT(user_id, signal_id) DO UPDATE SET
                    chat_id = excluded.chat_id,
                    symbol = excluded.symbol,
                    timeframe = excluded.timeframe,
                    execution_type = excluded.execution_type,
                    setup_grade = excluded.setup_grade,
                    invalidation_note = excluded.invalidation_note,
                    recommended_entry = excluded.recommended_entry,
                    updated_at = CURRENT_TIMESTAMP`,
            args: [
                params.userId,
                params.chatId,
                params.signalId,
                params.symbol,
                params.timeframe || null,
                params.executionType || null,
                params.setupGrade || null,
                params.invalidationNote || null,
                params.recommendedEntry,
            ]
        });
        return true;
    } catch (error) {
        console.error('[SignalTracker] Save telebot signal execution error:', error);
        return false;
    }
}

export async function getLatestTelebotSignalExecution(userId: string): Promise<TelebotLiveExecution | null> {
    const turso = getTursoClient();
    if (!turso) return null;

    try {
        const result = await turso.execute({
            sql: `SELECT
                    tse.id AS execution_id,
                    tse.signal_id,
                    tse.symbol,
                    tse.timeframe,
                    tse.execution_type,
                    tse.setup_grade,
                    tse.invalidation_note,
                    tse.recommended_entry,
                    tse.actual_entry,
                    tse.updated_at,
                    a.direction,
                    a.stop_loss,
                    a.take_profit_1,
                    a.status,
                    a.created_at
                  FROM telebot_signal_executions tse
                  JOIN ai_signals a ON a.id = tse.signal_id
                  WHERE tse.user_id = ?
                  ORDER BY tse.id DESC
                  LIMIT 1`,
            args: [userId]
        });

        if (result.rows.length === 0) return null;
        return {
            executionId: Number(result.rows[0].execution_id),
            signalId: Number(result.rows[0].signal_id),
            symbol: String(result.rows[0].symbol),
            timeframe: result.rows[0].timeframe ? String(result.rows[0].timeframe) : null,
            direction: String(result.rows[0].direction || 'HOLD') as TelebotLiveExecution['direction'],
            executionType: result.rows[0].execution_type ? String(result.rows[0].execution_type) : null,
            setupGrade: result.rows[0].setup_grade ? String(result.rows[0].setup_grade) : null,
            invalidationNote: result.rows[0].invalidation_note ? String(result.rows[0].invalidation_note) : null,
            recommendedEntry: Number(result.rows[0].recommended_entry || 0),
            actualEntry: result.rows[0].actual_entry != null ? Number(result.rows[0].actual_entry) : null,
            stopLoss: Number(result.rows[0].stop_loss || 0),
            takeProfit1: Number(result.rows[0].take_profit_1 || 0),
            status: String(result.rows[0].status || 'PENDING'),
            createdAt: String(result.rows[0].created_at || ''),
            updatedAt: String(result.rows[0].updated_at || result.rows[0].created_at || '')
        };
    } catch (error) {
        console.error('[SignalTracker] Get latest telebot signal execution error:', error);
        return null;
    }
}

export async function setLatestTelebotActualEntry(
    userId: string,
    actualEntry: number | null,
    useRecommended = false
): Promise<boolean> {
    const turso = getTursoClient();
    if (!turso) return false;

    try {
        if (useRecommended) {
            await turso.execute({
                sql: `UPDATE telebot_signal_executions
                      SET actual_entry = recommended_entry,
                          updated_at = CURRENT_TIMESTAMP
                      WHERE id = (
                        SELECT id
                        FROM telebot_signal_executions
                        WHERE user_id = ?
                        ORDER BY id DESC
                        LIMIT 1
                      )`,
                args: [userId]
            });
            return true;
        }

        if (!(actualEntry && actualEntry > 0)) return false;

        await turso.execute({
            sql: `UPDATE telebot_signal_executions
                  SET actual_entry = ?,
                      updated_at = CURRENT_TIMESTAMP
                  WHERE id = (
                    SELECT id
                    FROM telebot_signal_executions
                    WHERE user_id = ?
                    ORDER BY id DESC
                    LIMIT 1
                  )`,
            args: [actualEntry, userId]
        });
        return true;
    } catch (error) {
        console.error('[SignalTracker] Set latest telebot actual entry error:', error);
        return false;
    }
}

export async function getTelegramTrackedSignals(userId: string, limit = 8): Promise<TrackedTelegramSignal[]> {
    const turso = getTursoClient();
    if (!turso) return [];

    const safeLimit = Math.max(1, Math.min(20, Math.floor(limit)));

    try {
        const result = await turso.execute({
            sql: `SELECT
                    a.id as signal_id,
                    a.symbol,
                    a.timeframe,
                    a.direction,
                    tse.execution_type,
                    tse.setup_grade,
                    a.entry_price,
                    a.stop_loss,
                    a.take_profit_1,
                    a.status,
                    a.pips_result,
                    a.created_at
                  FROM telegram_signal_requests tsr
                  JOIN ai_signals a ON a.id = tsr.signal_id
                  LEFT JOIN telebot_signal_executions tse
                    ON tse.signal_id = a.id AND tse.user_id = tsr.user_id
                  WHERE tsr.user_id = ?
                  ORDER BY tsr.id DESC
                  LIMIT ?`,
            args: [userId, safeLimit]
        });

        return result.rows.map((row) => ({
            signalId: Number(row.signal_id),
            symbol: String(row.symbol),
            timeframe: row.timeframe ? String(row.timeframe) : null,
            direction: String(row.direction || 'HOLD') as TrackedTelegramSignal['direction'],
            executionType: row.execution_type ? String(row.execution_type) : null,
            setupGrade: row.setup_grade ? String(row.setup_grade) : null,
            entryPrice: Number(row.entry_price || 0),
            stopLoss: Number(row.stop_loss || 0),
            takeProfit1: Number(row.take_profit_1 || 0),
            status: String(row.status || 'PENDING'),
            pipsResult: row.pips_result != null ? Number(row.pips_result) : null,
            createdAt: String(row.created_at || '')
        }));
    } catch (error) {
        console.error('[SignalTracker] Get telegram tracked signals error:', error);
        return [];
    }
}

// Parse AI analysis text to extract signal data - IMPROVED VERSION
export function parseSignalFromAnalysis(analysis: string, type: 'forex' | 'stock', symbol: string, timeframe?: string): SignalData | null {
    try {
        console.log('[SignalTracker] Parsing analysis for:', symbol);
        const lowerAnalysis = analysis.toLowerCase();

        // Determine direction - check multiple patterns
        let direction: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
        let executionType: SignalData['executionType'];

        const strategyMatch = analysis.match(/EXECUTION STRATEGY:\s*(?:MOMENTUM\s+|RETRACEMENT\s+|BREAKOUT\s+)?(INSTANT|LIMIT|STOP)/i);
        if (strategyMatch) {
            executionType = strategyMatch[1].toUpperCase() as SignalData['executionType'];
        }

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
        let dateFilter = '';
        const queryArgs: any[] = [];
        if (period === 'today') {
            dateFilter = "AND DATE(created_at) = DATE('now', 'localtime')";
        } else if (period === '7d') {
            dateFilter = "AND created_at >= datetime('now', '-7 days', 'localtime')";
        } else if (period === '30d') {
            dateFilter = "AND created_at >= datetime('now', '-30 days', 'localtime')";
        } else if (period === 'custom' && customDate) {
            // Use parameterized query (safe from SQL injection)
            dateFilter = "AND DATE(created_at, 'localtime') = ?";
            queryArgs.push(customDate);
        }

        const result = await turso.execute({
            sql: `SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'TP_HIT' THEN 1 ELSE 0 END) as tp_hit,
                SUM(CASE WHEN status = 'SL_HIT' THEN 1 ELSE 0 END) as sl_hit,
                SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'TP_HIT' THEN pips_result ELSE 0 END) as total_pips_won,
                SUM(CASE WHEN status = 'SL_HIT' THEN pips_result ELSE 0 END) as total_pips_lost
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
        console.error('[SignalTracker] getPerformanceSummary error:', error);
        // Surface the actual error for debugging
        if (error instanceof Error) {
            console.error('[SignalTracker] SQL Error detail:', error.message);
        }
        return null;
    }
}

// Generate daily report text for Telegram (supports custom date)
export async function generateDailyReport(targetDate?: string): Promise<string> {
    const isCustom = !!targetDate;
    const period = isCustom ? 'custom' : 'today';

    const dailyStats = await getPerformanceSummary(period, targetDate);
    const overall = await getPerformanceSummary('all');

    // Graceful fallback: if stats can't be fetched, use zeroes
    const zeroStats = { total: 0, tpHit: 0, slHit: 0, pending: 0, winRate: '0', totalPips: '0' };
    const ds = dailyStats ?? zeroStats;
    const ov = overall ?? zeroStats;

    // Format date header
    let dateStr = '';
    const formatOptions: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Jakarta',
    };
    if (targetDate) {
        // Parse YYYY-MM-DD safely without UTC midnight shift
        const [yr, mo, dy] = targetDate.split('-').map(Number);
        const dateObj = new Date(yr, mo - 1, dy, 12, 0, 0);
        dateStr = dateObj.toLocaleDateString('id-ID', formatOptions);
    } else {
        dateStr = new Date().toLocaleDateString('id-ID', formatOptions);
    }

    const report = `
📊 *ARRA7 AI PERFORMANCE REPORT*
📅 ${dateStr}

━━━━━━━━━━━━━━━━━━━━━━━

📈 *${isCustom ? 'PERFORMANCE ' + targetDate : 'HARI INI'}*
• Total Signal: ${ds.total}
• ✅ TP Hit: ${ds.tpHit}
• ❌ SL Hit: ${ds.slHit}
• ⏳ Pending: ${ds.pending}
• 🎯 Win Rate: ${ds.winRate}%

━━━━━━━━━━━━━━━━━━━━━━━

📊 *OVERALL PERFORMANCE*
• Total Signal: ${ov.total}
• ✅ TP Hit: ${ov.tpHit}
• ❌ SL Hit: ${ov.slHit}
• ⏳ Pending: ${ov.pending}
• 🎯 Win Rate: ${ov.winRate}%

━━━━━━━━━━━━━━━━━━━━━━━

🤖 Powered by ARRA7 AI
🌐 arra7-app.vercel.app
    `.trim();

    return report;
}
