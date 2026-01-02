// Multi-Timeframe Analysis (MTF) - Analyze across multiple timeframes for confluence
import { getMarketData, formatMarketDataForAI, ForexPair, Timeframe } from './market-data';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const MODEL = 'llama-3.3-70b-versatile';

export interface MTFAnalysisResult {
    success: boolean;
    analyses: {
        timeframe: string;
        direction: 'BUY' | 'SELL' | 'NEUTRAL';
        confidence: number;
        keyLevels: {
            support: number;
            resistance: number;
        };
        summary: string;
    }[];
    confluence: {
        score: number;
        direction: 'BULLISH' | 'BEARISH' | 'MIXED';
        agreement: number; // percentage of TFs agreeing
        recommendation: string;
    };
    error?: string;
}

const MTF_PROMPT = `Kamu adalah MTF (Multi-Timeframe) Analyst. Analisa data berikut dengan fokus pada CONFLUENCE antar timeframe.

DATA MARKET:
{market_data}

OUTPUT FORMAT (JSON ONLY, NO MARKDOWN):
{
  "direction": "BUY" atau "SELL" atau "NEUTRAL",
  "confidence": 0-100,
  "support": angka,
  "resistance": angka,
  "summary": "penjelasan singkat 1 kalimat"
}

Berikan HANYA JSON, tanpa penjelasan tambahan.`;

export async function analyzeMultiTimeframe(pair: ForexPair): Promise<MTFAnalysisResult> {
    const timeframes: Timeframe[] = ['15m', '1h', '4h'];
    const analyses: MTFAnalysisResult['analyses'] = [];

    try {
        // Fetch and analyze each timeframe
        for (const tf of timeframes) {
            const marketData = await getMarketData(pair, tf);
            const formattedData = formatMarketDataForAI(marketData, tf);
            const prompt = MTF_PROMPT.replace('{market_data}', formattedData);

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                },
                body: JSON.stringify({
                    model: MODEL,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.2,
                    max_tokens: 500,
                }),
            });

            if (!response.ok) continue;

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content || '';

            try {
                // Extract JSON from response
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    analyses.push({
                        timeframe: tf,
                        direction: parsed.direction || 'NEUTRAL',
                        confidence: parsed.confidence || 50,
                        keyLevels: {
                            support: parsed.support || marketData.low,
                            resistance: parsed.resistance || marketData.high,
                        },
                        summary: parsed.summary || 'Analysis completed',
                    });
                }
            } catch (parseError) {
                // If can't parse, add basic analysis
                analyses.push({
                    timeframe: tf,
                    direction: 'NEUTRAL',
                    confidence: 50,
                    keyLevels: {
                        support: marketData.low,
                        resistance: marketData.high,
                    },
                    summary: 'Could not parse analysis',
                });
            }
        }

        // Calculate confluence
        const buyCount = analyses.filter(a => a.direction === 'BUY').length;
        const sellCount = analyses.filter(a => a.direction === 'SELL').length;
        const totalAnalyses = analyses.length;

        let confluenceDirection: 'BULLISH' | 'BEARISH' | 'MIXED' = 'MIXED';
        let agreement = 0;

        if (buyCount > sellCount && buyCount >= 2) {
            confluenceDirection = 'BULLISH';
            agreement = (buyCount / totalAnalyses) * 100;
        } else if (sellCount > buyCount && sellCount >= 2) {
            confluenceDirection = 'BEARISH';
            agreement = (sellCount / totalAnalyses) * 100;
        } else {
            agreement = 33; // No clear direction
        }

        const avgConfidence = analyses.reduce((sum, a) => sum + a.confidence, 0) / totalAnalyses;
        const confluenceScore = Math.round((agreement + avgConfidence) / 2);

        let recommendation = '';
        if (confluenceScore >= 70) {
            recommendation = `Strong ${confluenceDirection} confluence! ${Math.round(agreement)}% of timeframes agree.`;
        } else if (confluenceScore >= 50) {
            recommendation = `Moderate ${confluenceDirection} bias. Consider waiting for more confirmation.`;
        } else {
            recommendation = 'Mixed signals. Higher timeframes show no clear direction. Avoid trading or wait.';
        }

        return {
            success: true,
            analyses,
            confluence: {
                score: confluenceScore,
                direction: confluenceDirection,
                agreement: Math.round(agreement),
                recommendation,
            },
        };
    } catch (error) {
        console.error('MTF Analysis Error:', error);
        return {
            success: false,
            analyses: [],
            confluence: {
                score: 0,
                direction: 'MIXED',
                agreement: 0,
                recommendation: 'Analysis failed',
            },
            error: error instanceof Error ? error.message : 'MTF Analysis Error',
        };
    }
}
