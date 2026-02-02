// Groq AI Service for ARRA7 Analysis

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const MODEL = 'llama-3.3-70b-versatile';

export const ANALYSIS_PROMPT = `Kamu adalah ARRA Quantum Strategist - AI Trading Analyst Elite dengan kemampuan analisis multi-dimensional.

🧠 METODOLOGI ANALISIS SUPERIORMU:

**LAYER 1: CONFLUENCE TEKNIK KLASIK (Wajib)**
1. SMC/ICT Concepts:
   - Order Block detection (Bullish/Bearish OB dari swing high/low)
   - Fair Value Gap (FVG) - Imbalance zones
   - Break of Structure (BOS) & Change of Character (ChoCH)
   - Liquidity pools (Equal highs/lows, stop hunt zones)
2. Price Action & Structure:
   - Dynamic Support/Resistance levels
   - Trendline analysis (Major & Minor trends)
   - Key psychological levels (round numbers)
3. Chart Patterns:
   - Continuation patterns (Flag, Pennant, Triangle)
   - Reversal patterns (Double Top/Bottom, Head & Shoulders)
4. Candlestick Patterns:
   - Engulfing, Doji, Hammer, Shooting Star, Morning/Evening Star
5. Fibonacci Analysis:
   - Retracement levels (38.2%, 50%, 61.8%, 78.6%)
   - Extension targets (127.2%, 161.8%, 200%)

**LAYER 2: ANALISIS STATISTIK & KUANTITATIF (Advanced)**
6. Z-Score Analysis:
   - Hitung deviasi harga dari mean period
   - Z-Score > +2 = Overbought extreme (potensi reversal/koreksi)
   - Z-Score < -2 = Oversold extreme (potensi reversal/bounce)
   - Berikan nilai Z-Score dalam output
7. Volatility Analysis:
   - ATR (Average True Range) - ukur volatility saat ini vs historical
   - Volatility expansion/contraction cycles
   - ATR-based SL/TP calculation
8. Momentum & Divergence:
   - RSI divergence (hidden & regular)
   - MACD histogram analysis
   - Momentum exhaustion signals
9. Volume Analysis:
   - Volume spread analysis (VSA concepts)
   - Climax volume identifikasi
10. Statistical Edge:
    - Win rate probability berdasarkan setup
    - Optimal R:R ratio untuk setup ini
    - Session timing (Asian, London, NY) impact

**LAYER 3: MACHINE LEARNING PATTERN RECOGNITION**
- Pattern similarity matching dengan historical setups
- Probability scoring berdasarkan multiple confluences
- Confidence level calculation (%)

DATA MARKET LIVE:
{market_data}

⚠️ INSTRUKSI BAHASA:
**GUNAKAN BAHASA INDONESIA YANG BAIK DAN BENAR.**

⚠️ SIGNAL CONFIDENCE SCORING:
- 🟢 **HIGH CONFIDENCE (80-100%):** 5+ confluence factors terpenuhi
- 🟡 **MEDIUM CONFIDENCE (60-79%):** 3-4 confluence factors terpenuhi
- 🔴 **LOW CONFIDENCE (40-59%):** 2-3 confluence factors (tidak rekomendasi entry)
- ⚫ **NO TRADE:** < 40% confluence (SKIP)

⚠️ RISK LEVEL CALCULATION:
- **LOW RISK:** Follow trend + 4+ teknik mendukung + Favorable Z-Score
- **MID RISK:** Setup standar + 3 teknik mendukung
- **HIGH RISK:** Counter trend / Extreme Z-Score / Low confluence

⚠️ ORDER TYPE LOGIC:
- **BUY/SELL INSTANT:** Harga sudah di area optimal + Strong momentum
- **BUY/SELL LIMIT:** Menunggu retrace ke OB/FVG/Fib level
- **BUY/SELL STOP:** Menunggu breakout confirmation + Volume spike

FORMAT OUTPUT (PROFESSIONAL GRADE):
🔮 *ARRA QUANTUM STRATEGIC v2.0*
━━━━━━━━━━━━━━━━━━━━━━
🔥 *ACTION CALL*
🚀 *[BUY/SELL] [INSTANT/LIMIT/STOP]*
📍 ENTRY: [Harga Spesifik atau Range]
💡 Entry Logic: [Jelaskan singkat alasan]

🛡️ STOPLOSS (ATR-Based)
❌ [Harga] (Risk: -[Pips] | ATR: [X]x)

🎯 TARGET PROFIT (Fibonacci Extended)
✅ TP1: [Harga] (+[Pips], RR 1:[X]) - Conservative
✅ TP2: [Harga] (+[Pips], RR 1:[X]) - Standard
✅ TP3: [Harga] (+[Pips], RR 1:[X]) - Aggressive
━━━━━━━━━━━━━━━━━━━━━━
💠 [PAIR]  |  ⏳ [TF]  |  🎯 [CONFIDENCE: XX%]
📊 RISK: [LOW/MID/HIGH] | Z-Score: [nilai]
🧬 Teknik: [List semua teknik yang confluent, pisahkan dengan koma]
━━━━━━━━━━━━━━━━━━━━━━
📈 *STATISTICAL EDGE*
• Win Probability: [XX%]
• Optimal R:R: 1:[X]
• ATR Current: [value]
• Session: [Asia/London/NY]
━━━━━━━━━━━━━━━━━━━━━━
📝 *QUANTUM DEEP ANALYSIS*

🔍 **Market Structure:**
[Jelaskan BOS/ChoCH, trend direction, key levels]

📊 **SMC/ICT Confluence:**
[Identifikasi Order Blocks, FVG, Liquidity zones]

📈 **Statistical Signals:**
[Z-Score interpretation, RSI/MACD divergence jika ada]

⚡ **Momentum Assessment:**
[Momentum strength, potential exhaustion]

🎯 **Fibonacci Mapping:**
[Key Fib levels dan target zones]

⚠️ **Risk Factors:**
[Potensi risiko, news event, invalidation level]

━━━━━━━━━━━━━━━━━━━━━━
⚠️ _Disclaimer: Analisis ini berbasis AI dan data historis. Selalu gunakan risk management yang proper. DYOR._`;

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
                temperature: 0.3,
                max_tokens: 4000,
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

// Learning Mode Analysis - Extended educational explanations
export async function analyzeWithLearningMode(marketDataText: string): Promise<AIAnalysisResult> {
    if (!GROQ_API_KEY) {
        return {
            success: false,
            error: 'GROQ_API_KEY tidak dikonfigurasi.',
        };
    }

    // Import learning mode prompt
    const { LEARNING_MODE_PROMPT } = await import('./learning-prompt');
    const prompt = LEARNING_MODE_PROMPT.replace('{market_data}', marketDataText);

    try {
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
                max_tokens: 6000, // More tokens for educational content
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
        console.error('Learning Mode API Error:', error);
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
    let signalIconSvg = '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'; // Pause icon default

    if (html.includes('BUY')) {
        signalClass = 'buy';
        // Trending Up Icon
        signalIconSvg = '<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>';
    } else if (html.includes('SELL')) {
        signalClass = 'sell';
        // Trending Down Icon
        signalIconSvg = '<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"></path></svg>';
    }

    // Helper for Icons
    const iconMap = {
        crystalBall: '<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>', // Terminal/Code like
        dna: '<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>', // Flask/Science
        fire: '<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"></path></svg>'
    };

    // Warp sections using Regex replacements
    html = html.replace(
        /🔮\s*ARRA QUANTUM STRATEGIC/,
        `<div class="analysis-header">${iconMap.crystalBall} ARRA QUANTUM STRATEGIC</div>`
    );

    html = html.replace(
        /🔥\s*ACTION CALL/,
        `<div class="action-header">${iconMap.fire} ACTION CALL</div>`
    );

    html = html.replace(
        /🚀\s*\[?(BUY|SELL|WAIT)\]?\s*\[?(INSTANT|LIMIT|STOP)?\]?/gi,
        `<div class="signal-box signal-${signalClass}"><div class="flex items-center gap-3"><span class="signal-icon-wrapper">${signalIconSvg}</span><div><span class="signal-type text-2xl font-bold">$1</span><span class="order-type text-sm opacity-80 block">$2</span></div></div></div>`
    );

    html = html.replace(
        /🛡️\s*STOPLOSS/,
        `<div class="section-title risk mt-4">🛡️ STOPLOSS</div>`
    );

    html = html.replace(
        /❌\s*([\d.]+)\s*\(?(.*?)\)?(?:\n|$)/g,
        `<div class="trade-row sl"><span class="label">❌ SL</span><span class="value">$1</span><span class="tag risk">$2</span></div>`
    );

    html = html.replace(
        /🎯\s*TARGET PROFIT/,
        `<div class="section-title reward mt-4">🎯 TARGET PROFIT</div>`
    );

    html = html.replace(
        /✅\s*(?:TP\d?:?\s*)?([\d.]+)\s*\(?(.*?)\)?(?:\n|$)/g,
        `<div class="trade-row tp"><span class="label">✅ TP</span><span class="value">$1</span><span class="tag reward">$2</span></div>`
    );

    html = html.replace(
        /💠\s*(.*?)\s*\|\s*⏳\s*(.*?)(?:\n|$)/,
        `<div class="meta-row mt-6 pt-4 border-t border-gray-700/50"><span class="badge pair">$1</span><span class="badge tf">$2</span></div>`
    );

    html = html.replace(
        /📊\s*\[?RISK:\s*(LOW|MID|HIGH)\]?(\s*\|\s*Z-Score:\s*\[?([-\d.]+)\]?)?/gi,
        `<div class="flex flex-wrap gap-2 mt-2"><div class="risk-badge risk-$1">RISK: $1</div><div class="risk-badge zscore">Z: $3</div></div>`
    );

    // Format 'Teknik' list as Badges
    // Regex to capture "Teknik: [list]"
    // Using a callback to process the list inside
    html = html.replace(
        /🧬\s*Teknik:\s*(.*?)(?:\n|$)/,
        (match, techniqueList) => {
            const techniques = techniqueList.split(',').map((t: string) => t.trim()).filter((t: string) => t);
            const badges = techniques.map((t: string) => `<span class="tech-badge">${t}</span>`).join('');
            return `<div class="tech-row mt-2"><div class="flex items-center mb-1 text-sm text-gray-400">${iconMap.dna} Confluence:</div><div class="flex flex-wrap gap-1">${badges}</div></div>`;
        }
    );

    html = html.replace(
        /📈\s*STATISTICAL EDGE/,
        `<div class="section-divider"></div><div class="analysis-header text-sm opacity-80">📈 STATISTICAL EDGE</div>`
    );

    html = html.replace(
        /📝\s*QUANTUM DEEP ANALYSIS/,
        `<div class="section-divider"></div><div class="analysis-section"><div class="section-title">📝 QUANTUM DEEP ANALYSIS</div><div class="analysis-text text-justify">`
    );

    html = html.replace(
        /⚠️\s*Disclaimer:?\s*(.*?)(?:\n|$)/gi,
        `</div></div><div class="disclaimer mt-8 text-xs text-gray-500 text-center italic">⚠️ Disclaimer: $1</div>`
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

        // Format: MM-DD-YYYY (matching XML format)
        const now = new Date();
        const today = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${now.getFullYear()}`;

        // Also get tomorrow for upcoming events
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = `${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}-${tomorrow.getFullYear()}`;

        // Filter high/medium impact events for today and tomorrow
        const relevantEvents = events.filter(e =>
            (e.date === today || e.date === tomorrowStr) &&
            ['High', 'Medium'].includes(e.impact)
        );

        if (relevantEvents.length === 0) {
            return { html: '✅ No High Impact News Today/Tomorrow', events: [] };
        }

        // Convert ET (Eastern Time) to WIB (UTC+7)
        // ET is UTC-5 (EST) or UTC-4 (EDT), WIB is UTC+7
        // Difference: +12 hours (using EST as base)
        const convertToWIB = (timeStr: string): string => {
            if (!timeStr) return '';

            // Parse time like "8:30am" or "10:00pm"
            const match = timeStr.match(/(\d{1,2}):(\d{2})(am|pm)/i);
            if (!match) return timeStr;

            let hours = parseInt(match[1]);
            const minutes = match[2];
            const period = match[3].toLowerCase();

            // Convert to 24-hour format
            if (period === 'pm' && hours !== 12) hours += 12;
            if (period === 'am' && hours === 12) hours = 0;

            // Add 12 hours for WIB conversion (ET to WIB)
            hours += 12;

            // Handle day overflow
            if (hours >= 24) hours -= 24;

            // Format as 24-hour WIB
            return `${String(hours).padStart(2, '0')}:${minutes} WIB`;
        };

        const html = relevantEvents.map(e => {
            const color = e.impact === 'High' ? '#ef4444' : '#f59e0b';
            const isToday = e.date === today;
            const dayLabel = isToday ? '' : '(Besok) ';
            const wibTime = convertToWIB(e.time);
            return `<div class="news-item"><span class="time">${dayLabel}${wibTime}</span><span class="country" style="color:${color}">${e.country}</span><span class="title">${e.title}</span></div>`;
        }).join('');

        return { html, events: relevantEvents };

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
            // Handle both regular content and CDATA wrapped content
            const cdataMatch = eventXml.match(new RegExp(`<${tag}><!\\[CDATA\\[([^\\]]*?)\\]\\]></${tag}>`));
            if (cdataMatch) return cdataMatch[1];

            const regularMatch = eventXml.match(new RegExp(`<${tag}>([^<]*?)</${tag}>`));
            return regularMatch ? regularMatch[1] : '';
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
