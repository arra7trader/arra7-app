import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const MODEL = 'llama-3.3-70b-versatile';

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { status: 'error', message: 'Silakan login terlebih dahulu' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { symbol, stockData } = body;

        if (!symbol || !stockData) {
            return NextResponse.json(
                { status: 'error', message: 'Invalid request' },
                { status: 400 }
            );
        }

        // Create prompt for stock analysis
        const prompt = `Kamu adalah ARRA Stock Analyst - AI Analis Saham Indonesia yang ahli dalam analisis fundamental dan teknikal.

📊 DATA SAHAM:
- Kode Saham: ${symbol}
- Nama Perusahaan: ${stockData.name}
- Harga Saat Ini: Rp ${stockData.currentPrice?.toLocaleString('id-ID')}
- Perubahan: ${stockData.change >= 0 ? '+' : ''}${stockData.change?.toFixed(0)} (${stockData.changePercent >= 0 ? '+' : ''}${stockData.changePercent?.toFixed(2)}%)
- Harga Tertinggi 52 Minggu: Rp ${stockData.high52Week?.toLocaleString('id-ID')}
- Harga Terendah 52 Minggu: Rp ${stockData.low52Week?.toLocaleString('id-ID')}
- Volume: ${stockData.volume?.toLocaleString('id-ID')}
- Market Cap: ${stockData.marketCap ? 'Rp ' + (stockData.marketCap / 1e12).toFixed(2) + ' Triliun' : 'N/A'}

DATA HISTORIS (30 Hari Terakhir):
${stockData.historicalData?.slice(-10).map((d: { date: string; close: number }) => `${d.date}: Rp ${d.close?.toLocaleString('id-ID')}`).join('\n')}

⚠️ INSTRUKSI:
1. Gunakan Bahasa Indonesia yang baik dan benar
2. Berikan analisis yang komprehensif dan actionable
3. Fokus pada fundamental dan teknikal

FORMAT OUTPUT:
🔮 *ARRA STOCK ANALYSIS*
━━━━━━━━━━━━━━━━━━━━━━
📈 ${symbol} - ${stockData.name}
💰 Harga: Rp ${stockData.currentPrice?.toLocaleString('id-ID')}
📊 Perubahan: ${stockData.changePercent >= 0 ? '🟢' : '🔴'} ${stockData.changePercent?.toFixed(2)}%
━━━━━━━━━━━━━━━━━━━━━━

🏢 *PROFIL PERUSAHAAN*
[Jelaskan secara singkat tentang perusahaan ini, bidang usahanya, dan posisinya di industri. Gunakan pengetahuanmu tentang emiten IDX.]

📊 *ANALISIS FUNDAMENTAL*
[Analisis valuasi berdasarkan price level, market cap, dan perbandingan dengan peers]
• Valuasi: [Murah/Wajar/Mahal]
• Prospek Bisnis: [Baik/Netral/Buruk]
• Kinerja Keuangan: [Stabil/Volatile]

📈 *ANALISIS TEKNIKAL*
[Berdasarkan data harga historis]
• Trend: [Bullish/Bearish/Sideways]
• Support Level: [Harga]
• Resistance Level: [Harga]
• RSI Estimate: [Overbought/Neutral/Oversold]

🎯 *REKOMENDASI*
━━━━━━━━━━━━━━━━━━━━━━
🚀 [BUY / HOLD / SELL]

📍 Entry Zone: Rp [Harga] - Rp [Harga]
🛡️ Stop Loss: Rp [Harga] (-[X]%)
🎯 Target 1: Rp [Harga] (+[X]%)
🎯 Target 2: Rp [Harga] (+[X]%)

💡 *Alasan Rekomendasi:*
[Jelaskan alasan singkat kenapa BUY/HOLD/SELL]

⚠️ *Risiko:*
[Sebutkan 2-3 risiko utama]

━━━━━━━━━━━━━━━━━━━━━━
⚠️ _Disclaimer: Analisis ini bersifat edukatif dan bukan ajakan investasi. Selalu lakukan riset mandiri (DYOR) dan sesuaikan dengan profil risiko Anda._`;

        // Call Groq API
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 3000,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API Error: ${response.status}`);
        }

        const data = await response.json();
        const analysis = data.choices?.[0]?.message?.content;

        if (!analysis) {
            throw new Error('No analysis returned from AI');
        }

        return NextResponse.json({
            status: 'success',
            analysis,
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error('Stock analysis error:', error);
        return NextResponse.json(
            { status: 'error', message: error instanceof Error ? error.message : 'Analysis failed' },
            { status: 500 }
        );
    }
}
