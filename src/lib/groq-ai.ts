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
    let signalColor = 'gray'; // Tailwind color base
    let signalIconSvg = '<svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';

    if (html.includes('BUY')) {
        signalClass = 'buy';
        signalColor = 'green';
        signalIconSvg = '<svg class="w-8 h-8 text-green-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>';
    } else if (html.includes('SELL')) {
        signalClass = 'sell';
        signalColor = 'red';
        signalIconSvg = '<svg class="w-8 h-8 text-red-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"></path></svg>';
    }

    // Helper for Icons (Professional & Sleek)
    const iconMap = {
        crystalBall: '<svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>',
        fire: '<svg class="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>', // Lightning Bolt for Action
        dna: '<svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>',
        risk: '<svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>',
        target: '<svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
    };

    // --- SECTION REPLACEMENTS ---

    // 1. HEADER (Quantum Strategic)
    html = html.replace(
        /🔮\s*ARRA QUANTUM STRATEGIC v2.0/,
        `<div class="flex items-center gap-2 mb-4 border-b border-gray-700/50 pb-3">
            ${iconMap.crystalBall}
            <span class="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent tracking-wide">ARRA QUANTUM STRATEGIC v2.0</span>
         </div>`
    );

    // 2. ACTION CALL Header
    html = html.replace(
        /🔥\s*ACTION CALL/,
        `<div class="flex items-center gap-2 mb-3 mt-2">
            ${iconMap.fire}
            <span class="text-sm font-semibold text-gray-300 uppercase tracking-widest">Action Call</span>
         </div>`
    );

    // 3. SIGNAL BOX (The Main Event)
    // Uses dynamic classes based on signalColor (green/red)
    html = html.replace(
        /🚀\s*\[?(BUY|SELL|WAIT)\]?\s*\[?(INSTANT|LIMIT|STOP)?\]?/gi,
        `<div class="relative overflow-hidden rounded-xl bg-gray-800/50 border border-${signalColor}-500/30 p-4 mb-4 shadow-lg group">
            <div class="absolute inset-0 bg-${signalColor}-500/5 opacity-0 group-hover:opacity-10 transition-opacity"></div>
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <div class="p-3 rounded-full bg-${signalColor}-500/10 border border-${signalColor}-500/20 shadow-inner shadow-${signalColor}-500/20">
                        ${signalIconSvg}
                    </div>
                    <div>
                        <div class="text-3xl font-black text-${signalColor}-400 tracking-tight leading-none">$1</div>
                        <div class="text-xs font-mono text-${signalColor}-300/70 uppercase tracking-wider mt-1">$2 ORDER</div>
                    </div>
                </div>
                <div class="hidden sm:block">
                     <span class="px-3 py-1 rounded-full text-xs font-medium bg-${signalColor}-500/10 text-${signalColor}-400 border border-${signalColor}-500/20 animate-pulse">
                        ACTIVE SIGNAL
                     </span>
                </div>
            </div>
         </div>`
    );

    // 4. ENTRY ZONE
    html = html.replace(
        /📍\s*ENTRY\s*:\s*(.*?)(?:\n|$)/,
        `<div class="grid grid-cols-1 gap-4 mb-4">
            <div class="bg-gray-800/30 rounded-lg p-3 border border-gray-700/50">
                <div class="text-xs text-gray-500 mb-1 uppercase tracking-wider">Entry Zone</div>
                <div class="text-lg font-mono font-semibold text-white">$1</div>
            </div>`
    );

    // 5. ENTRY LOGIC (Close the grid div opened above)
    html = html.replace(
        /💡\s*Entry Logic:\s*(.*?)(?:\n|$)/,
        `<div class="bg-gray-800/30 rounded-lg p-3 border border-gray-700/50">
            <div class="text-xs text-gray-500 mb-1 uppercase tracking-wider">Logic</div>
            <div class="text-sm text-gray-300 leading-relaxed">$1</div>
        </div>
        </div>` // Closing grid
    );

    // 6. STOPLOSS Title
    html = html.replace(
        /🛡️\s*STOPLOSS/,
        `<div class="flex items-center gap-2 mt-6 mb-2">
            ${iconMap.risk}
            <span class="text-xs font-bold text-red-400 uppercase tracking-widest">Risk Management (SL)</span>
         </div>`
    );

    // 7. STOPLOSS Value
    html = html.replace(
        /❌\s*([\d.]+)\s*\(?(.*?)\)?(?:\n|$)/g,
        `<div class="bg-red-500/5 border border-red-500/10 rounded-lg p-3 flex justify-between items-center mb-4 hover:bg-red-500/10 transition-colors">
            <div>
                <span class="text-2xl font-mono font-bold text-red-500">$1</span>
            </div>
            <div class="text-right">
                <div class="text-xs text-red-400/70 font-mono">$2</div>
            </div>
         </div>`
    );

    // 8. TARGET PROFIT Title
    html = html.replace(
        /🎯\s*TARGET PROFIT/,
        `<div class="flex items-center gap-2 mt-6 mb-2">
            ${iconMap.target}
            <span class="text-xs font-bold text-emerald-400 uppercase tracking-widest">Profit Targets (TP)</span>
         </div>`
    );

    // 9. TARGET PROFIT Values (Grid Layout)
    html = html.replace(
        /✅\s*(?:TP\d?:?\s*)?([\d.]+)\s*\(?(.*?)\)? - (.*?)(?:\n|$)/g,
        `<div class="relative group bg-gray-800/30 border border-gray-700/50 rounded-lg p-3 hover:border-emerald-500/30 transition-all">
            <div class="flex justify-between items-start mb-1">
                <span class="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">$3</span>
                <span class="text-[10px] text-gray-500 font-mono">$2</span>
            </div>
            <div class="text-xl font-mono font-bold text-white group-hover:text-emerald-400 transition-colors">$1</div>
         </div>`
    );
    // Wrap TPs in a grid container. Regex matching all TPs is tricky, so we inject the wrapper before/after via predictable markers? 
    // Instead, let's assume the TPs appear sequentially. 
    // We can wrap the whole TP block during final composition if needed, but styling them as block elements with margin is safer for simple regex replacer.
    // *Self-correction*: The previous regex replaced EACH line. To make a grid, we need a parent wrapper.
    // Since this is line-by-line replacement, we'll style them as "margin-bottom-2" blocks. 
    // Or, we can use a clever trick: Replace the "TARGET PROFIT" title closer with an opening <div class="grid gap-2"> and close it before the next section.
    // Let's stick to independent stylized rows for safety, but make them look like cards.

    // 10. META INFO (Pair, TF)
    // We already moved Action Call to top. Where is Meta now? In Prompy it is after targets.
    html = html.replace(
        /💠\s*(.*?)\s*\|\s*⏳\s*(.*?)\s*\|\s*🎯\s*\[CONFIDENCE: (.*?)%\](?:\n|$)/,
        `<div class="grid grid-cols-3 gap-2 mt-6 py-4 border-y border-gray-700/50">
            <div class="text-center">
                <div class="text-[10px] text-gray-500 uppercase">Pair</div>
                <div class="font-bold text-blue-400">$1</div>
            </div>
            <div class="text-center border-l border-gray-700/50">
                <div class="text-[10px] text-gray-500 uppercase">Timeframe</div>
                <div class="font-bold text-white">$2</div>
            </div>
            <div class="text-center border-l border-gray-700/50">
                <div class="text-[10px] text-gray-500 uppercase">Confidence</div>
                <div class="font-bold text-purple-400">$3%</div>
            </div>
         </div>`
    );

    // 11. RISK & Z-SCORE
    // 📊 RISK: [LOW/MID/HIGH] | Z-Score: [nilai]
    html = html.replace(
        /📊\s*RISK:\s*(LOW|MID|HIGH)\s*\|\s*Z-Score:\s*\[?([-\d.]+)\]?/gi,
        `<div class="flex justify-between items-center mt-3 px-2">
            <div class="flex items-center gap-2">
                <span class="text-xs text-gray-500">Risk Profile:</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-700 text-white uppercase risk-$1">$1</span>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-xs text-gray-500">Z-Score:</span>
                <span class="font-mono text-xs text-yellow-500">$2</span>
            </div>
         </div>`
    );

    // 12. TECHNIQUES LIST (Badges)
    // 🧬 Teknik: ...
    html = html.replace(
        /🧬\s*Teknik:\s*(.*?)(?:\n|$)/,
        (match, techniqueList) => {
            // Handle comma or space separation more robustly
            // If no commas, try splitting by known keywords or just render as is?
            // Prompt says "pisahkan dengan koma". Assuming it does.
            let techniques = techniqueList.split(/,/).map((t: string) => t.trim()).filter((t: string) => t);
            if (techniques.length === 1 && techniqueList.length > 20) {
                // Maybe it didn't split well? Try splitting by uppercase words? Nah, risky.
                // Just assume it's one long explanation if no commas.
            }

            const badges = techniques.map((t: string) =>
                `<span class="px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-medium whitespace-nowrap">${t}</span>`
            ).join('');

            return `<div class="mt-4">
                <div class="flex items-center gap-2 mb-2">
                    ${iconMap.dna}
                    <span class="text-xs font-bold text-gray-400 uppercase">Confluence Factors</span>
                </div>
                <div class="flex flex-wrap gap-2">${badges}</div>
             </div>`;
        }
    );

    // 13. STATISTICAL EDGE
    html = html.replace(
        /📈\s*STATISTICAL EDGE/,
        `<div class="mt-6 pt-4 border-t border-gray-700/50">
            <div class="text-xs font-bold text-gray-400 uppercase mb-3 text-center tracking-widest">Statistical Edge</div>`
    );
    // Items
    // • Win Probability: [XX%]
    // Map bullets to a grid? Regex replace bullets with divs?
    // We can do a global replace for bullet lines inside this logical block.
    // Simpler: Just style the bullets nicely.
    html = html.replace(
        /•\s*(.*?):\s*(.*?)(?:\n|$)/g,
        `<div class="flex justify-between items-center mb-1 text-sm"><span class="text-gray-500">$1</span><span class="text-white font-medium">$2</span></div>`
    );
    // Close the div opened in EDGE title? 
    // Wait, regex replace doesn't know context. 
    // We'll wrap the whole Edge section logic or just let the divs flow. 
    // Add a closing div before the next section starts.
    html = html.replace(
        /(📝\s*QUANTUM DEEP ANALYSIS)/,
        `</div>$1` // Close Statistical Edge container before Analysis start
    );


    // 14. DEEP ANALYSIS
    html = html.replace(
        /📝\s*QUANTUM DEEP ANALYSIS/,
        `<div class="mt-6 bg-black/20 rounded-xl p-4 border border-gray-700/30">
            <h3 class="text-sm font-bold text-white mb-3 flex items-center gap-2">
                📝 QUANTUM DEEP ANALYSIS
            </h3>
            <div class="space-y-4 text-sm text-gray-400 leading-relaxed text-justify">`
    );

    // Bold headers in analysis: 🔍 **Market Structure:**
    html = html.replace(
        /🔍\s*(.*?):/g,
        `<div class="font-semibold text-blue-300 mb-1 mt-2">$1</div>`
    );
    // Other headers
    html = html.replace(
        /[📊⚡🎯⚠️]\s*(.*?):/g,
        `<div class="font-semibold text-gray-200 mb-1 mt-3">$1</div>`
    );

    // 15. DISCLAIMER
    html = html.replace(
        /⚠️\s*Disclaimer:?\s*(.*?)(?:\n|$)/gi,
        `</div> <!-- Close analysis text -->
         </div> <!-- Close analysis container -->
         <div class="mt-6 text-[10px] text-gray-600 text-center italic border-t border-gray-800 pt-4">
            ⚠️ Disclaimer: $1
         </div>`
    );

    // Cleanup
    html = html.replace(/━+/g, '');
    html = html.replace(/\n\s*\n/g, ''); // Remove empty double lines
    // Preserve some breaks if needed, or rely on div spacing.
    html = html.replace(/\n/g, '');

    // Final Container Wrap
    // bg-[#161b22] is a dark GitHub-like shade. backdrop-blur for glass effect.
    return `<div class="analysis-card font-sans antialiased text-gray-300 bg-[#0F1115] rounded-2xl border border-gray-800 p-5 shadow-2xl relative overflow-hidden">
                <div class="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-500/10 rounded-full blur-xl pointer-events-none"></div>
                <div class="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-purple-500/10 rounded-full blur-xl pointer-events-none"></div>
                <div class="relative z-10 w-full">
                    ${html}
                </div>
            </div>`;
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
