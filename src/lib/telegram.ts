// Telegram Bot API utility for sending marketing messages
// Uses environment variables for security

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

function getTelegramConfig() {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const channelId = process.env.TELEGRAM_CHANNEL_ID;

    if (!botToken || !channelId) {
        console.warn('[TELEGRAM] Bot token or channel ID not configured');
        return null;
    }

    return { botToken, channelId };
}

export async function sendTelegramMessage(message: string, parseMode: 'HTML' | 'Markdown' = 'HTML'): Promise<{
    success: boolean;
    error?: string;
    messageId?: number;
}> {
    const config = getTelegramConfig();

    if (!config) {
        return { success: false, error: 'Telegram not configured' };
    }

    try {
        const response = await fetch(`${TELEGRAM_API_BASE}${config.botToken}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: config.channelId,
                text: message,
                parse_mode: parseMode,
                disable_web_page_preview: false,
            }),
        });

        const data = await response.json();

        if (data.ok) {
            console.log('[TELEGRAM] Message sent successfully, ID:', data.result.message_id);
            return { success: true, messageId: data.result.message_id };
        } else {
            console.error('[TELEGRAM] Failed to send message:', data.description);
            return { success: false, error: data.description };
        }
    } catch (error) {
        console.error('[TELEGRAM] Error sending message:', error);
        return { success: false, error: 'Network error' };
    }
}

// ============================================
// 2 FOCUSED MARKETING TEMPLATES FOR AUTO-POSTING
// ============================================

export const MARKETING_TEMPLATES: Record<string, string> = {
    // 1. ARRA7 - AI Trading Analysis (Updated)
    arra7: `🔮 <b>ARRA7 - AI Trading Analysis</b>

Analisa Trading dengan AI & Akurasi Tinggi!

🤖 <b>Platform Analisa AI Level Institusional:</b>
✅ Forex (XAUUSD, EUR/USD, GBP/JPY, dll)
✅ Crypto (BTC, ETH, SOL, XRP, dll)  
✅ Saham Indonesia (BBCA, BBRI, TLKM, ANTM, dll)

⚡ <b>Fitur Unggulan:</b>
• AI Quantum Strategist - LLM 70B parameter
• Entry Zone, Stop Loss, Take Profit otomatis
• Investment Thesis lengkap
• Analisa Fundamental & Teknikal

📊 <b>Cara Kerjanya (3 Langkah!):</b>
1️⃣ Pilih Pair/Saham
2️⃣ Klik Analisa
3️⃣ Trading dengan percaya diri!

💰 <b>Harga:</b>
• GRATIS - 2x analisa/hari
• PRO - <b>Rp 99.000/bulan</b> (25x/hari)
• VVIP - <b>Rp 399.000/bulan</b> (UNLIMITED!)

🔥 <b>PROMO TAHUN BARU - Diskon hingga 50%!</b>

🔗 <b>Coba Sekarang (GRATIS!):</b>
👉 https://arra7-app.vercel.app

🚀 <b>Coming Soon: DOM ARRA</b>
Depth of Market + AI Order Flow Analysis

#ARRA7 #AITrading #Forex #Crypto #SahamIndonesia`,

    // 2. ARRA7 Saham Indonesia Focus
    saham: `📈 <b>ANALISA SAHAM INDONESIA dengan AI</b>

Analisa setingkat Mandiri Sekuritas & Morgan Stanley!

🏢 <b>ARRA Institutional Research:</b>
• Fundamental Scorecard (Valuasi, Profitabilitas, Growth)
• Technical Outlook (Support, Resistance, Trend)
• Investment Thesis lengkap
• Key Risks identification
• Overall Score 1-10

📊 <b>Contoh Emiten Populer:</b>
BBCA | BBRI | BMRI | TLKM | ANTM
ASII | UNVR | ICBP | GOTO | BREN

💡 <b>Yang Kamu Dapat:</b>
✅ Verdict: BUY / HOLD / SELL
✅ Entry Zone & Target Price
✅ Stop Loss recommendation
✅ Risk/Reward Ratio

💰 <b>Harga Spesial:</b>
• GRATIS - 2x analisa/hari
• PRO - Rp 99.000/bulan (unlimited emiten!)
• VVIP - Rp 399.000/bulan (ALL ACCESS)

🔗 <b>Mulai Analisa Saham:</b>
👉 https://arra7-app.vercel.app

#SahamIndonesia #IDXAnalysis #IHSG #InvestasiSaham #ARRA7`,

    // 3. Bookmap X AI (Short & Cool)
    bookmap_ai: `🚀 <b>Next Level Trading!</b>

Mau lihat Whale sembunyi di mana? 👀
Analisa market jadi makin transparan dengan <b>Bookmap Heatmap</b> & <b>AI Prediction</b> di ARRA7.

✅ <b>Real-time Order Flow</b> - Liat tembok buy/sell asli.
✅ <b>AI Signal</b> - Akurasi tinggi, bukan tebak-tebakan.
✅ <b>Download APK</b> - Trading pro dalam genggaman.

🔥 <b>Upgrade ke PRO sekarang!</b>
Coba fitur premium tanpa ribet.

🔗 <b>Download:</b> https://arra7-app.vercel.app/download/android
#ARRA7 #TradingSmart #Bookmap #AITrading`,
};

// Template metadata for admin display
export const TEMPLATE_METADATA: Record<string, { name: string; emoji: string; description: string }> = {
    arra7: { name: 'ARRA7', emoji: '🔮', description: 'AI Trading Analysis - Forex, Crypto, Saham' },
    saham: { name: 'Saham Indonesia', emoji: '📈', description: 'Analisa Saham IDX dengan AI Institusional' },
    bookmap_ai: { name: 'Bookmap X AI', emoji: '🚀', description: 'Promo fitur Heatmap & AI' },
};

// Get all template keys for iteration
export function getAllTemplateKeys(): string[] {
    return Object.keys(MARKETING_TEMPLATES);
}

// Get rotating template based on current hour
// Changes every 5 hours, alternates between 2 templates
export function getRotatingTemplate(): { key: string; message: string } {
    const keys = getAllTemplateKeys();
    const now = new Date();

    // Calculate rotation index: changes every 5 hours
    const hoursSinceEpoch = Math.floor(now.getTime() / (1000 * 60 * 60));
    const rotationIndex = Math.floor(hoursSinceEpoch / 5) % keys.length;

    const key = keys[rotationIndex];
    return {
        key,
        message: MARKETING_TEMPLATES[key],
    };
}

// Get specific template by key
export function getTemplateByKey(key: string): string | null {
    return MARKETING_TEMPLATES[key] || null;
}

export function isTelegramConfigured(): boolean {
    return !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHANNEL_ID);
}

