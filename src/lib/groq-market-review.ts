import type { CronosMarketCandle, CronosTimeframe } from '@/lib/arra-cronos-market';
import type { CronosMTFBias, CronosQuantMetrics } from '@/lib/arra-cronos-engine';
import { getCompletedCronosCandles } from '@/lib/arra-cronos-engine';

export async function reviewCronosSetup(input: {
    symbol: string;
    timeframe: CronosTimeframe;
    currentPrice: number;
    marketSource: string;
    quoteAgeSeconds: number;
    candles: CronosMarketCandle[];
    metrics: CronosQuantMetrics;
    mtfMatrix: Record<CronosTimeframe, CronosMTFBias>;
    action: 'BUY' | 'SELL' | 'WAIT';
}) {
    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (!apiKey) throw new Error('Groq belum dikonfigurasi pada environment server.');

    const model = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';
    const candles = getCompletedCronosCandles(input.candles, input.timeframe).slice(-32).map((candle) => ({
        time: candle.time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
    }));
    const context = {
        symbol: input.symbol,
        timeframe: input.timeframe,
        currentPrice: input.currentPrice,
        marketSource: input.marketSource,
        quoteAgeSeconds: input.quoteAgeSeconds,
        actionFromQuantEngine: input.action,
        metrics: input.metrics,
        availableTimeframeReadings: Object.values(input.mtfMatrix)
            .filter((reading) => reading.available)
            .map(({ timeframe, direction, changePercent, label }) => ({ timeframe, direction, changePercent, label })),
        recentCandles: candles,
    };

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model,
            temperature: 0.1,
            max_tokens: 420,
            messages: [
                {
                    role: 'system',
                    content: [
                        'Anda adalah reviewer sekunder untuk ringkasan analisis teknikal pasar, bukan pembuat sinyal.',
                        'Gunakan hanya angka yang tersedia pada data input. Jangan menciptakan harga, berita, indikator, atau probabilitas.',
                        'Jangan mengubah BUY, SELL, atau WAIT dari mesin kuantitatif; jelaskan bila datanya saling bertentangan.',
                        'Jangan menyebut alignment score sebagai peluang menang atau confidence probabilitas.',
                        'Jangan menjanjikan keuntungan dan jangan membuat atau mengirim order broker.',
                        'Jawab dalam Bahasa Indonesia dengan ringkas: keselarasan tren, risiko/kontradiksi, kondisi yang membatalkan analisis, dan keterbatasan data.',
                        'Jika feed bukan live atau sudah usang, sebutkan dan jangan mendukung entry.',
                    ].join(' '),
                },
                {
                    role: 'user',
                    content: `Tinjau snapshot ini sebagai opini sekunder. Jangan membuat sinyal baru.\n${JSON.stringify(context)}`,
                },
            ],
        }),
        cache: 'no-store',
        signal: AbortSignal.timeout(20_000),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = typeof payload?.error?.message === 'string'
            ? payload.error.message
            : `Permintaan review Groq gagal (${response.status}).`;
        throw new Error(message);
    }

    const review = payload?.choices?.[0]?.message?.content;
    if (typeof review !== 'string' || !review.trim()) {
        throw new Error('Groq tidak mengembalikan ulasan analisis.');
    }

    return { model: payload.model || model, review: review.trim() };
}
