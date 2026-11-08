import {
    buildCronosMTFHistory,
    extractMTFMatrix,
    type CronosMTFHistory,
} from '@/lib/arra-cronos-engine';
import {
    CRONOS_CONFIRMATION_TIMEFRAMES,
    getCronosMarketData,
    type CronosMarketResult,
    type CronosTimeframe,
} from '@/lib/arra-cronos-market';

/** Aggregate higher intervals from the selected history and request a direct
 * feed only when the required MTF window is still too short. */
export async function getCronosAnalysisHistory(
    symbol: string,
    market: CronosMarketResult
): Promise<CronosMTFHistory> {
    const history = buildCronosMTFHistory(market.candles, market.timeframe);
    const matrix = extractMTFMatrix(history);
    const missingTimeframes = CRONOS_CONFIRMATION_TIMEFRAMES[market.timeframe]
        .filter((timeframe) => timeframe !== market.timeframe && !matrix[timeframe].available);
    const results = await Promise.allSettled(
        missingTimeframes.map(async (timeframe) => [timeframe, await getCronosMarketData(symbol, timeframe)] as const)
    );

    for (const result of results) {
        if (result.status === 'fulfilled' && result.value[1].candles.length) {
            history[result.value[0] as CronosTimeframe] = result.value[1].candles;
        }
    }
    return history;
}
