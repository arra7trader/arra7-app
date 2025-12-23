// Groq AI Service for ARRA7 Analysis

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const MODEL = 'llama-3.3-70b-versatile';

export const ANALYSIS_PROMPT = `Kamu adalah ARRA Quantum Strategist.
Tugas: Analisis data market di bawah ini menggunakan "CONFLUENCE" (Pertemuan) dari 5 Teknik Terbaik Dunia:
1. SMC/ICT (Order Block, FVG - Estimasi dari data High/Low)
2. Price Action (Trendline, SnR)
3. Chart Patterns (Analisis pola dari pergerakan harga Open/Close)
4. Candlestick
5. Fibonacci

DATA MARKET LIVE:
{market_data}

⚠️ INSTRUKSI BAHASA:
**GUNAKAN BAHASA INDONESIA YANG BAIK DAN BENAR.**

⚠️ RISK LEVEL:
- **LOW RISK:** 3+ teknik mendukung & follow trend.
- **MID RISK:** Setup standar.
- **HIGH RISK:** Counter trend.

⚠️ ORDER TYPE (Pilih salah satu berdasarkan analisis):
- **BUY INSTANT / SELL INSTANT:** Eksekusi langsung di harga sekarang (harga sudah di area entry optimal)
- **BUY LIMIT / SELL LIMIT:** Tunggu harga retrace ke area yang lebih baik (entry di support/resistance)
- **BUY STOP / SELL STOP:** Tunggu breakout confirmation (entry setelah harga break level tertentu)

FORMAT OUTPUT (Gunakan format yang rapi):
🔮 *ARRA PRO STRATEGIC*
━━━━━━━━━━━━━━━━━━━━━━
💠 [PAIR]  |  ⏳ [TF]
🧬 [Sebutkan Teknik yang digunakan]
📊 [RISK: LOW / MID / HIGH]
━━━━━━━━━━━━━━━━━━━━━━
🔥 *ACTION CALL*
🚀 *[BUY/SELL] [INSTANT/LIMIT/STOP]*
📍 ENTRY : [Harga Spesifik atau Range]
💡 Alasan Order Type: [Jelaskan singkat kenapa memilih INSTANT/LIMIT/STOP]

🛡️ STOPLOSS
❌ [Harga] (Risk: -[Pips/Points] pts)

🎯 TARGET PROFIT
✅ TP1: [Harga] (Reward: +[Pips/Points] pts, RR 1:[Ratio])
✅ TP2: [Harga] (Reward: +[Pips/Points] pts, RR 1:[Ratio])
✅ TP3: [Harga] (Reward: +[Pips/Points] pts, RR 1:[Ratio])
━━━━━━━━━━━━━━━━━━━━━━
📝 *ANALISIS QUANTUM*
[Jelaskan alasan teknikal dalam Bahasa Indonesia]
[Jelaskan konfirmasi dari setiap teknik yang digunakan]
[Jelaskan kenapa Risk Level dipilih]

⚠️ _Disclaimer: DYOR._`;

export interface AIAnalysisResult {
    success: boolean;
    analysis?: string;
    formattedHtml?: string;
    error?: string;
}

export async function analyzeWithGroq(marketDataText: string): Promise<AIAnalysisResult> {
    if (!GROQ_API_KEY) {
        return {
            success: false,
            error: 'GROQ_API_KEY tidak dikonfigurasi. Silakan tambahkan ke environment variables.',
        };
    }

    const prompt = ANALYSIS_PROMPT.replace('{market_data}', marketDataText);

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: 'user', content: prompt }
                ],
                temperature: 0.5,
                max_tokens: 2000,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API Error: ${response.status}`);
        }

        const data = await response.json();
        const analysisText = data.choices?.[0]?.message?.content;

        if (!analysisText) {
            throw new Error('No analysis returned from AI');
        }

        return {
            success: true,
            analysis: analysisText,
            formattedHtml: formatAnalysisToHtml(analysisText),
        };

    } catch (error) {
        console.error('Groq API Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'API Error',
        };
    }
}

function formatAnalysisToHtml(text: string): string {
    let html = text;

    // Clean markdown
    html = html.replace(/\*\*/g, '');
    html = html.replace(/\*/g, '');
    html = html.replace(/`/g, '');
    html = html.replace(/_/g, '');

    // Detect signal type
    let signalClass = 'neutral';
    let signalIcon = 'pause';
    if (html.includes('BUY')) {
        signalClass = 'buy';
        signalIcon = 'trending_up';
    } else if (html.includes('SELL')) {
        signalClass = 'sell';
        signalIcon = 'trending_down';
    }

    // Wrap sections
    html = html.replace(
        /🔮\s*ARRA PRO STRATEGIC/,
        `<div class="analysis-header"><span class="icon">🔮</span> ARRA PRO STRATEGIC</div>`
    );

    html = html.replace(
        /💠\s*(.*?)\s*\|\s*⏳\s*(.*?)(?:\n|$)/,
        `<div class="meta-row"><span class="badge pair">$1</span><span class="badge tf">$2</span></div>`
    );

    html = html.replace(
        /🧬\s*(.*?)(?:\n|$)/,
        `<div class="tech-row"><span class="icon">🧬</span> $1</div>`
    );

    html = html.replace(
        /📊\s*\[?RISK:\s*(LOW|MID|HIGH)\]?/gi,
        `<div class="risk-badge risk-$1">RISK: $1</div>`
    );

    html = html.replace(
        /🔥\s*ACTION CALL/,
        `<div class="section-divider"></div><div class="action-header"><span class="icon">🔥</span> ACTION CALL</div>`
    );

    html = html.replace(
        /🚀\s*\[?(BUY|SELL|WAIT)\]?\s*\[?(INSTANT|LIMIT|STOP)?\]?/gi,
        `<div class="signal-box signal-${signalClass}"><span class="signal-type">$1</span><span class="order-type">$2</span><span class="material-icons signal-icon">${signalIcon}</span></div>`
    );

    html = html.replace(
        /📍\s*ENTRY\s*:\s*(.*?)(?:\n|$)/,
        `<div class="trade-row"><span class="label">📍 ENTRY ZONE</span><span class="value entry">$1</span></div>`
    );

    html = html.replace(
        /💡\s*Alasan Order Type:\s*(.*?)(?:\n|$)/,
        `<div class="order-reason"><span class="label">💡 Order Type</span><span class="text">$1</span></div>`
    );

    html = html.replace(
        /🛡️\s*STOPLOSS/,
        `<div class="section-title risk">🛡️ STOPLOSS</div>`
    );

    html = html.replace(
        /❌\s*([\d.]+)\s*\(?(.*?)\)?(?:\n|$)/g,
        `<div class="trade-row sl"><span class="label">❌ SL</span><span class="value">$1</span><span class="tag risk">$2</span></div>`
    );

    html = html.replace(
        /🎯\s*TARGET PROFIT/,
        `<div class="section-title reward">🎯 TARGET PROFIT</div>`
    );

    html = html.replace(
        /✅\s*(?:TP\d?:?\s*)?([\d.]+)\s*\(?(.*?)\)?(?:\n|$)/g,
        `<div class="trade-row tp"><span class="label">✅ TP</span><span class="value">$1</span><span class="tag reward">$2</span></div>`
    );

    html = html.replace(
        /📝\s*ANALISIS QUANTUM/,
        `<div class="section-divider"></div><div class="analysis-section"><div class="section-title">📝 ANALISIS QUANTUM</div><div class="analysis-text">`
    );

    html = html.replace(
        /⚠️\s*Disclaimer:?\s*(.*?)(?:\n|$)/gi,
        `</div></div><div class="disclaimer">⚠️ Disclaimer: $1</div>`
    );

    // Replace line separators
    html = html.replace(/━+/g, '');
    html = html.replace(/\n/g, '<br>');

    return `<div class="analysis-container signal-${signalClass}">${html}</div>`;
}

// News fetching
export async function getForexNews(): Promise<{ html: string; events: NewsEvent[] }> {
    try {
        const response = await fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.xml', {
            next: { revalidate: 3600 }, // Cache for 1 hour
        });

        if (!response.ok) {
            throw new Error('Failed to fetch news');
        }

        const xmlText = await response.text();
        const events = parseForexFactoryXml(xmlText);

        const today = new Date().toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
        }).replace(/\//g, '-');

        const todayEvents = events.filter(e =>
            e.date === today && ['High', 'Medium'].includes(e.impact)
        );

        if (todayEvents.length === 0) {
            return { html: '✅ No High Impact News Today', events: [] };
        }

        const html = todayEvents.map(e => {
            const color = e.impact === 'High' ? '#ef4444' : '#f59e0b';
            return `<div class="news-item"><span class="time">${e.time}</span><span class="country" style="color:${color}">${e.country}</span><span class="title">${e.title}</span></div>`;
        }).join('');

        return { html, events: todayEvents };

    } catch (error) {
        console.error('News fetch error:', error);
        return { html: '❌ Unable to load news', events: [] };
    }
}

interface NewsEvent {
    date: string;
    time: string;
    country: string;
    title: string;
    impact: string;
}

function parseForexFactoryXml(xml: string): NewsEvent[] {
    const events: NewsEvent[] = [];
    const eventRegex = /<event>([\s\S]*?)<\/event>/g;

    let match;
    while ((match = eventRegex.exec(xml)) !== null) {
        const eventXml = match[1];

        const getTag = (tag: string) => {
            const tagMatch = eventXml.match(new RegExp(`<${tag}>(.*?)</${tag}>`));
            return tagMatch ? tagMatch[1] : '';
        };

        events.push({
            date: getTag('date'),
            time: getTag('time'),
            country: getTag('country'),
            title: getTag('title'),
            impact: getTag('impact'),
        });
    }

    return events;
}
