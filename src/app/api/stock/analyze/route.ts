import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkStockQuota, useStockQuota } from '@/lib/quota';

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

        // Check stock quota
        const quotaCheck = await checkStockQuota(session.user.id);
        if (!quotaCheck.allowed) {
            return NextResponse.json(
                {
                    status: 'error',
                    message: quotaCheck.message,
                    quotaStatus: quotaCheck.quotaStatus,
                },
                { status: 403 }
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

        // Create institutional-grade prompt for stock analysis
        const prompt = `Kamu adalah ARRA Institutional Analyst - Senior Equity Research Analyst setingkat Goldman Sachs, Morgan Stanley, dan Mandiri Sekuritas.

🧠 METODOLOGI ANALISIS INSTITUTIONAL:

**FUNDAMENTAL ANALYSIS (Institutional Grade)**
1. **Business Model Canvas**
   - Model bisnis dan competitive moat (brand, network effect, cost advantage, switching cost)
   - Market share dan posisi kompetitif dalam industri
   - Revenue streams dan sustainability

2. **Financial Health Check**
   - Profitability: ROE, ROA, Profit Margin trend
   - Leverage: DER, Interest Coverage Ratio
   - Liquidity: Current Ratio, Quick Ratio
   - Efficiency: Asset Turnover, Inventory Days

3. **Valuation Framework (Multi-Method)**
   - P/E Ratio vs Industry Average & Historical
   - P/B Ratio vs Industry Peers
   - EV/EBITDA comparison
   - PEG Ratio (jika growth stock)
   - Dividend Yield analysis (jika applicable)

4. **Growth Analysis**
   - Revenue CAGR (3-5 tahun)
   - Earnings trajectory
   - Expansion plans & CAPEX

5. **Catalyst Identification**
   - Upcoming events (earnings, rights issue, M&A)
   - Sector tailwinds/headwinds
   - Regulatory changes impact

**TECHNICAL ANALYSIS (Smart Money Approach)**
6. **Price Action & Structure**
   - Primary trend identification (Dow Theory)
   - Key support/resistance zones
   - Chart patterns (Accumulation/Distribution)

7. **Momentum & Flow**
   - Foreign flow analysis (net buy/sell)
   - Volume profile (institutional accumulation signs)
   - RSI divergence check

8. **Risk Metrics**
   - Beta (volatility vs IHSG)
   - Maximum drawdown historical
   - Margin of Safety calculation

📊 DATA SAHAM LIVE:
━━━━━━━━━━━━━━━━━━━━━━
📌 Ticker: ${symbol}
🏢 Nama: ${stockData.name}
💰 Harga: Rp ${stockData.currentPrice?.toLocaleString('id-ID')}
📈 Perubahan: ${stockData.change >= 0 ? '+' : ''}${stockData.change?.toFixed(0)} (${stockData.changePercent >= 0 ? '+' : ''}${stockData.changePercent?.toFixed(2)}%)
📊 High 52W: Rp ${stockData.high52Week?.toLocaleString('id-ID')}
📉 Low 52W: Rp ${stockData.low52Week?.toLocaleString('id-ID')}
📦 Volume: ${stockData.volume?.toLocaleString('id-ID')}
🏛️ Market Cap: ${stockData.marketCap ? 'Rp ' + (stockData.marketCap / 1e12).toFixed(2) + 'T' : 'N/A'}

📅 DATA HARGA 10 HARI TERAKHIR:
${stockData.historicalData?.slice(-10).map((d: { date: string; close: number }) => `${d.date}: Rp ${d.close?.toLocaleString('id-ID')}`).join('\n')}

⚠️ INSTRUKSI OUTPUT:
1. Gunakan Bahasa Indonesia yang profesional tapi mudah dipahami
2. Output HARUS simple, terstruktur, dan actionable
3. Fokus pada insight penting, hindari jargon berlebihan
4. Berikan rating/scoring untuk memudahkan keputusan

━━━━━━━━━━━━━━━━━━━━━━
📋 FORMAT OUTPUT (SIMPLE & SUPERIOR):
━━━━━━━━━━━━━━━━━━━━━━

🔮 **ARRA INSTITUTIONAL RESEARCH**
━━━━━━━━━━━━━━━━━━━━━━
📈 **${symbol}** | ${stockData.name}
💰 Rp ${stockData.currentPrice?.toLocaleString('id-ID')} | ${stockData.changePercent >= 0 ? '🟢' : '🔴'} ${stockData.changePercent?.toFixed(2)}%
━━━━━━━━━━━━━━━━━━━━━━

**📊 OVERALL SCORE: [X]/10**
[Beri skor 1-10 dengan justifikasi singkat]

━━━━━━━━━━━━━━━━━━━━━━
**🏢 COMPANY SNAPSHOT**
[2-3 kalimat tentang bisnis utama, posisi pasar, dan competitive advantage. Gunakan pengetahuanmu tentang emiten IDX ini.]

━━━━━━━━━━━━━━━━━━━━━━
**📊 FUNDAMENTAL SCORECARD**

| Metric | Rating | Note |
|--------|--------|------|
| Valuasi | ⭐⭐⭐⭐⭐ | [Murah/Wajar/Mahal] |
| Profitabilitas | ⭐⭐⭐⭐⭐ | [Tinggi/Sedang/Rendah] |
| Kesehatan Finansial | ⭐⭐⭐⭐⭐ | [Sehat/Cukup/Berisiko] |
| Growth Prospect | ⭐⭐⭐⭐⭐ | [Tinggi/Moderat/Rendah] |

**Key Insight:** [1 kalimat insight fundamental terpenting]

━━━━━━━━━━━━━━━━━━━━━━
**📈 TECHNICAL OUTLOOK**

• **Trend:** [🟢 BULLISH / 🟡 SIDEWAYS / 🔴 BEARISH]
• **Support:** Rp [Harga] | Rp [Harga]
• **Resistance:** Rp [Harga] | Rp [Harga]
• **Momentum:** [Strong/Neutral/Weak]
• **Volume Signal:** [Accumulation/Distribution/Normal]

**Key Insight:** [1 kalimat insight teknikal terpenting]

━━━━━━━━━━━━━━━━━━━━━━
**🎯 VERDICT & ACTION**
━━━━━━━━━━━━━━━━━━━━━━

🚀 **[STRONG BUY / BUY / HOLD / SELL / STRONG SELL]**

**Confidence Level:** [HIGH/MEDIUM/LOW]

| Action | Level | Note |
|--------|-------|------|
| 📍 Entry Zone | Rp [X] - Rp [X] | [Kondisi entry] |
| 🛡️ Stop Loss | Rp [X] | -[X]% dari entry |
| 🎯 Target 1 | Rp [X] | +[X]% (3 bulan) |
| 🎯 Target 2 | Rp [X] | +[X]% (6-12 bulan) |

**Risk/Reward Ratio:** 1:[X]

━━━━━━━━━━━━━━━━━━━━━━
**💡 INVESTMENT THESIS**
[2-3 bullet point alasan utama kenapa BELI atau TIDAK BELI. Fokus pada catalyst dan value driver]

━━━━━━━━━━━━━━━━━━━━━━
**⚠️ KEY RISKS**
• [Risk 1 - paling penting]
• [Risk 2]
• [Risk 3]

━━━━━━━━━━━━━━━━━━━━━━
**📌 BOTTOM LINE**
[1 kalimat kesimpulan aksi yang harus dilakukan investor]

━━━━━━━━━━━━━━━━━━━━━━
⚠️ _Disclaimer: Analisis ini bersifat edukatif. Keputusan investasi sepenuhnya tanggung jawab investor. DYOR._`;

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

        // Use quota after successful analysis
        await useStockQuota(session.user.id);

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
