// Groq AI Service for ARRA7 Analysis
import { generateTextHybrid } from './ai-provider';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const MODEL = 'llama-3.1-8b-instant';

import { ANALYSIS_PROMPT } from './analysis-prompt';

export interface AIAnalysisResult {
    success: boolean;
    analysis?: string;
    formattedHtml?: string;
    error?: string;
}

interface MLPredictionContext {
    direction: string;
    winrate: number;
    confidence: number;
    isAvailable: boolean;
}

export interface MarketContext {
    multiTimeframe?: string;   // Pre-formatted multi-TF analysis text
    newsEvents?: string;       // High-impact news near current time
    dxyCorrelation?: string;   // DXY data and correlation assessment
}

export async function analyzeWithGroq(marketDataText: string, mlContext?: MLPredictionContext, marketContext?: MarketContext): Promise<AIAnalysisResult> {
    const systemInstruction = ANALYSIS_PROMPT;

    // Build Context String
    let additionalContext = "";

    // 1. ML Context
    if (mlContext && mlContext.isAvailable) {
        additionalContext += `
🤖 **MACHINE LEARNING (LSTM) SIGNAL:**
- **DIRECTION:** ${mlContext.direction}
- **WINRATE:** ${mlContext.winrate}%
- **CONFIDENCE:** ${(mlContext.confidence * 100).toFixed(1)}%
- Use this confirmation to validate your technical analysis.
`;
    }

    // 2. Market Context (Multi-TF, News, DXY)
    if (marketContext) {
        if (marketContext.multiTimeframe) additionalContext += "\n\n" + marketContext.multiTimeframe;
        if (marketContext.newsEvents) additionalContext += "\n\n" + marketContext.newsEvents;
        if (marketContext.dxyCorrelation) additionalContext += "\n\n" + marketContext.dxyCorrelation;
    }

    const userContent = `DATA MARKET LIVE:\n${marketDataText}\n\nADDITIONAL CONTEXT & DATA LAYERS:${additionalContext}`;

    try {
        const { text } = await generateTextHybrid({
            system: systemInstruction,
            messages: [
                { role: 'user', content: userContent }
            ],
            temperature: 0.3,
            maxTokens: 1800,  // Aggressive reduction: prompt ~3000 tokens + output 1800 = ~4800 total (safe margin below 6000 TPM)
        });

        if (!text) {
            throw new Error('No analysis returned from AI');
        }

        return {
            success: true,
            analysis: text,
            formattedHtml: formatAnalysisToHtml(text),
        };

    } catch (error: any) {
        console.error('Hybrid AI Error:', error);
        return {
            success: false,
            error: error.message || 'API Error',
        };
    }
}

// Learning Mode Analysis - Extended educational explanations
export async function analyzeWithLearningMode(marketDataText: string, mlContext?: MLPredictionContext, marketContext?: MarketContext): Promise<AIAnalysisResult> {
    const { LEARNING_MODE_PROMPT } = await import('./learning-prompt');
    const systemInstruction = LEARNING_MODE_PROMPT;

    // Build Context String
    let additionalContext = "";

    // 1. ML Context
    if (mlContext && mlContext.isAvailable) {
        additionalContext += `
🤖 **MACHINE LEARNING (LSTM) SIGNAL:**
- **DIRECTION:** ${mlContext.direction}
- **WINRATE:** ${mlContext.winrate}%
- **CONFIDENCE:** ${(mlContext.confidence * 100).toFixed(1)}%
- Jelaskan hubungan signal LSTM ini dengan analisa teknikal manual.
`;
    }

    // 2. Market Context
    if (marketContext) {
        if (marketContext.multiTimeframe) additionalContext += "\n\n" + marketContext.multiTimeframe;
        if (marketContext.newsEvents) additionalContext += "\n\n" + marketContext.newsEvents;
        if (marketContext.dxyCorrelation) additionalContext += "\n\n" + marketContext.dxyCorrelation;
    }

    const userContent = `DATA MARKET LIVE:\n${marketDataText}\n\nADDITIONAL CONTEXT & DATA LAYERS:${additionalContext}`;

    try {
        const { text } = await generateTextHybrid({
            system: systemInstruction,
            messages: [{ role: 'user', content: userContent }],
            temperature: 0.3,
            maxTokens: 2200,  // Aggressive reduction: Large prompt (~3500 tokens with learning mode) + output 2200 = ~5700 total (safe below 6000 TPM)
        });

        if (!text) {
            throw new Error('No analysis returned from AI');
        }

        return {
            success: true,
            analysis: text,
            formattedHtml: formatAnalysisToHtml(text),
        };

    } catch (error: any) {
        console.error('Learning Mode AI Error:', error);
        return {
            success: false,
            error: error.message || 'API Error',
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

    // 2.5 STRATEGY TAG (New)
    html = html.replace(
        /⚡\s*EXECUTION STRATEGY:\s*(.*?)(?:\n|$)/,
        `<div class="mb-4">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 text-xs font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                STRATEGY: $1
            </span>
         </div>
         <div class="mb-2">
            <!-- Dynamic Status Injection Placeholder -->
         </div>`
    );

    // 3. SIGNAL BOX (The Main Event)
    // Uses dynamic classes based on signalColor (green/red)
    // 3. SIGNAL BOX (The Main Event)
    // Robust Regex: Matches "🚀 ... BUY ... INSTANT" in any order/format
    html = html.replace(
        /🚀\s*(?:[:*\[\]\s]*)(BUY|SELL|WAIT)(?:[:*\[\]\s-]*)(INSTANT|LIMIT|STOP)?/gi,
        (match, action, orderType) => {
            const type = orderType || 'EXECUTION'; // Fallback if undefined
            let signalClass = 'neutral';
            let signalColor = 'gray';

            if (action.toUpperCase() === 'BUY') {
                signalClass = 'buy';
                signalColor = 'green';
            } else if (action.toUpperCase() === 'SELL') {
                signalClass = 'sell';
                signalColor = 'red';
            }

            // Re-define icon based on captured action logic if needed, or use generic
            let icon = '<svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>';
            if (signalColor === 'green') icon = '<svg class="w-8 h-8 text-green-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>';
            if (signalColor === 'red') icon = '<svg class="w-8 h-8 text-red-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"></path></svg>';

            return `<div class="relative overflow-hidden rounded-xl bg-gray-800/50 border border-${signalColor}-500/30 p-6 mb-4 shadow-lg group">
                <div class="absolute inset-0 bg-${signalColor}-500/5 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-5">
                        <div class="p-4 rounded-full bg-${signalColor}-500/10 border border-${signalColor}-500/20 shadow-inner shadow-${signalColor}-500/20">
                            ${icon}
                        </div>
                        <div>
                            <div class="text-4xl font-black text-${signalColor}-400 tracking-tighter leading-none filter drop-shadow-lg">${action.toUpperCase()}</div>
                            <div class="text-xs font-mono text-${signalColor}-300/70 uppercase tracking-widest mt-1">${type} ORDER</div>
                        </div>
                    </div>
                     <div class="hidden sm:block">
                         <span class="px-3 py-1 rounded-full text-xs font-bold bg-${signalColor}-500/20 text-${signalColor}-400 border border-${signalColor}-500/30 shadow-[0_0_10px_rgba(0,0,0,0.2)]">
                            ACTIVE SIGNAL
                         </span>
                    </div>
                </div>
             </div>`;
        }
    );

    // 4. ENTRY ZONE
    // Make it POP! Gradient background + White text
    html = html.replace(
        /📍\s*ENTRY\s*(?:\:|\*+)?\s*(.*?)(?:\n|$)/i,
        `<div class="grid grid-cols-1 gap-4 mb-4">
            <div class="relative overflow-hidden rounded-xl bg-gradient-to-r from-gray-800 to-gray-900 border border-blue-500/30 p-4 shadow-lg">
                 <div class="absolute top-0 right-0 p-2 opacity-10">
                    <svg class="w-16 h-16 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 19h20L12 2zm0 3.8L18.4 17H5.6L12 5.8z"/></svg> 
                 </div>
                <div class="relative z-10">
                    <div class="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">🎯 Entry Zone</div>
                    <div class="text-2xl font-mono font-black text-white tracking-tight">$1</div>
                </div>
            </div>`
    );

    // 5. ENTRY LOGIC
    html = html.replace(
        /💡\s*Entry Logic\s*(?:\:|\*+)?\s*(.*?)(?:\n|$)/i,
        `<div class="bg-gray-800/40 rounded-lg p-4 border border-gray-700/50">
            <div class="text-xs text-gray-500 mb-2 uppercase tracking-wider font-bold">Logic & Reasoning</div>
            <div class="text-sm text-gray-300 leading-relaxed italic border-l-2 border-gray-600 pl-3">$1</div>
        </div>
        </div>` // Closing grid
    );

    // 6. STOPLOSS - Beautiful Card Design
    html = html.replace(
        /🛡️\s*STOP LOSS STRATEGY[\s\S]*?❌\s*(?:SL:?\s*)?([0-9.]+)[\s\S]*?(?=🎯\s*TAKE PROFIT|━━━|$)/i,
        (match, slPrice) => {
            // Extract details from the match
            const details = match.replace(/🛡️\s*STOP LOSS STRATEGY/i, '').replace(/❌\s*(?:SL:?\s*)?[0-9.]+/, '').trim();

            return `<div class="mt-6 mb-4">
                <div class="flex items-center gap-2 mb-3">
                    ${iconMap.risk}
                    <span class="text-xs font-bold text-red-400 uppercase tracking-widest">Stop Loss Strategy</span>
                </div>
                <div class="relative overflow-hidden rounded-xl bg-gradient-to-r from-red-950/40 to-gray-900 border border-red-500/30 p-4 shadow-lg">
                    <div class="absolute top-0 right-0 p-2 opacity-10">
                        <svg class="w-16 h-16 text-red-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                    </div>
                    <div class="relative z-10">
                        <div class="text-xs font-bold text-red-400 uppercase tracking-widest mb-1">🛡️ Stop Loss</div>
                        <div class="text-3xl font-mono font-black text-red-500 tracking-tight mb-2">${slPrice}</div>
                        <div class="text-xs text-gray-300 leading-relaxed space-y-1 border-l-2 border-red-500/30 pl-3">
                            ${details.replace(/🔴|🧠|📐|📏|✅|🎯|◆/g, '').replace(/Method:|Logic:|Distance:|Validation:|Placement Detail:/gi, '<br><strong>$&</strong>').trim()}
                        </div>
                    </div>
                </div>
            </div>`;
        }
    );

    // 8. TAKE PROFIT - Beautiful Card Design per TP
    html = html.replace(
        /🎯\s*TAKE PROFIT TARGETS[\s\S]*?(?=💡\s*\*\*TP Strategy|━━━)/i,
        (match) => {
            let output = `<div class="mt-6 mb-4">
                <div class="flex items-center gap-2 mb-3">
                    ${iconMap.target}
                    <span class="text-xs font-bold text-emerald-400 uppercase tracking-widest">Take Profit Targets</span>
                </div>
                <div class="grid grid-cols-1 gap-3">`;

            // Extract TP1, TP2, TP3 - more flexible pattern
            const tpRegex = /✅\s*TP(\d):\s*([0-9.]+)\s*\((.*?)\)[\s\S]*?(?:🧠|Method:)\s*(.*?)[\s\S]*?(?:📊|Logic:)\s*(.*?)(?=\s*✅\s*TP|💡|━━━|$)/gi;
            let tpMatch;

            while ((tpMatch = tpRegex.exec(match)) !== null) {
                const [, tpNum, price, stats, method, logic] = tpMatch;
                const label = tpNum === '1' ? 'Conservative' : tpNum === '2' ? 'Standard' : 'Aggressive';

                // Clean up method and logic from emojis and extra whitespace
                const cleanMethod = method.replace(/[◆🧠📊🔴📐📏✅🎯]/g, '').trim();
                const cleanLogic = logic.replace(/[◆🧠📊🔴📐📏✅🎯]/g, '').trim();

                output += `
                    <div class="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-950/40 to-gray-900 border border-emerald-500/30 p-4 shadow-lg hover:border-emerald-400/50 transition-all group">
                        <div class="absolute top-0 right-0 p-2 opacity-5">
                            <svg class="w-16 h-16 text-emerald-400" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
                        </div>
                        <div class="relative z-10">
                            <div class="flex justify-between items-start mb-2">
                                <div>
                                    <div class="text-xs font-bold text-emerald-400 uppercase tracking-widest">✅ TP${tpNum} - ${label}</div>
                                    <div class="text-3xl font-mono font-black text-emerald-500 tracking-tight">${price}</div>
                                </div>
                                <div class="text-right">
                                    <div class="text-xs text-emerald-300/70 font-mono">${stats.trim()}</div>
                                </div>
                            </div>
                            ${cleanMethod || cleanLogic ? `<div class="text-xs text-gray-300 leading-relaxed space-y-1 border-l-2 border-emerald-500/30 pl-3 mt-2">
                                ${cleanMethod ? `<div><span class="text-emerald-400 font-semibold">Method:</span> ${cleanMethod}</div>` : ''}
                                ${cleanLogic ? `<div><span class="text-emerald-400 font-semibold">Logic:</span> ${cleanLogic}</div>` : ''}
                            </div>` : ''}
                        </div>
                    </div>`;
            }

            output += `</div></div>`;
            return output;
        }
    );
    // Wrap TPs in a grid container. Regex matching all TPs is tricky, so we inject the wrapper before/after via predictable markers? 
    // Instead, let's assume the TPs appear sequentially. 
    // We can wrap the whole TP block during final composition if needed, but styling them as block elements with margin is safer for simple regex replacer.
    // *Self-correction*: The previous regex replaced EACH line. To make a grid, we need a parent wrapper.
    // Since this is line-by-line replacement, we'll style them as "margin-bottom-2" blocks. 
    // Or, we can use a clever trick: Replace the "TARGET PROFIT" title closer with an opening <div class="grid gap-2"> and close it before the next section.
    // Let's stick to independent stylized rows for safety, but make them look like cards.

    // 10.5 STATUS / POSITION MANAGEMENT (New)
    // Matches: "ACTION: HOLD" or "SARAN: CLOSE NOW" etc.
    // Prompt instruction: "Jika ..., berikan saran: **"CLOSE NOW"**"
    html = html.replace(
        /(?:SARAN|STATUS|ADVICE|ACTION):\s*\*\*?"?(CLOSE NOW|HOLD|CUT LOSS|WAIT)"?\*\*?/gi,
        (match, status) => {
            let color = 'gray';
            let icon = '';
            const text = status.toUpperCase();

            if (text.includes('CLOSE')) {
                color = 'blue';
                icon = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>';
            } else if (text.includes('HOLD')) {
                color = 'green';
                icon = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>';
            } else if (text.includes('CUT')) {
                color = 'red';
                icon = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z"></path></svg>';
            }

            return `<div class="bg-${color}-500/10 border border-${color}-500/30 rounded-lg p-3 my-4 flex items-center justify-between shadow-lg animate-pulse">
                <div class="flex items-center gap-3">
                    <div class="p-2 bg-${color}-500/20 rounded-full text-${color}-400">
                        ${icon}
                    </div>
                    <div>
                        <div class="text-[10px] text-${color}-300 uppercase font-bold tracking-wider">Recommended Action</div>
                        <div class="text-xl font-black text-${color}-400 tracking-tight">${text}</div>
                    </div>
                </div>
                <div class="text-${color}-500/50">
                    <svg class="w-8 h-8 opacity-20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm1-4.3c-.48 0-.91-.2-1.22-.53-.31-.34-.53-.78-.53-1.27 0-.49.22-.93.53-1.27.31-.33.74-.53 1.22-.53s.91.2 1.22.53c.31.34.53.78.53 1.27 0 .49-.22.93-.53 1.27-.31.33-.74.53-1.22.53z"/></svg>
                </div>
            </div>`;
        }
    );

    // 10. META INFO (Pair, TF, Confidence)
    html = html.replace(
        /💠\s*([A-Z0-9/.]+)\s*\|\s*⏳\s*([A-Z0-9]+)\s*\|\s*🎯\s*(?:CONFIDENCE:\s*)?(\d+)%/i,
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
            const techniques = techniqueList.split(/,/).map((t: string) => t.trim()).filter((t: string) => t);
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
