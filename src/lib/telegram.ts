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

// Updated signature to support direct DMs
export async function sendTelegramMessage(
    message: string,
    parseMode: 'HTML' | 'Markdown' = 'HTML',
    destChatId?: string
): Promise<{
    success: boolean;
    error?: string;
    messageId?: number;
}> {
    const config = getTelegramConfig();

    if (!config) {
        return { success: false, error: 'Telegram not configured' };
    }

    // Use provided destChatId or fall back to env channelId
    const targetChatId = destChatId || config.channelId;

    try {
        const response = await fetch(`${TELEGRAM_API_BASE}${config.botToken}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: targetChatId,
                text: message,
                parse_mode: parseMode,
                disable_web_page_preview: true,
            }),
        });

        const data = await response.json();

        if (data.ok) {
            console.log(`[TELEGRAM] Message sent to ${targetChatId}, ID:`, data.result.message_id);
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

    // ============================================
    // CONTENT SERIES (PART 1 - 4)
    // ============================================

    // Part 1: The Problem / Teaser
    series_part1: `⚠️ <b>STOP! Baca ini sebelum deposit lagi.</b>

90% Trader pemula kehilangan modal dalam 90 hari pertama. Kenapa?
Karena kamu "buta" melawan Institusi/Bandar yang punya data lengkap. 🏦

❌ Kamu pakai indikator lagging (RSI, MACD standard).
❌ Kamu tebak-tebakan support/resistance.
❌ Kamu tidak tahu di mana "Uang Besar" bersembunyi.

<b>Sudah saatnya buka mata.</b> 👀
Bayangkan jika kamu bisa melihat apa yang dilihat Institusi.
Bayangkan jika kamu punya "Asisten AI" yang menganalisa 24/7 untukmu.

Tunggu Part 2 besok. Kita akan bahas solusinya.
#DayTrading #Forex #Saham #SmartMoney #ARRA7Series`,

    // Part 2: The Solution / Introduction
    series_part2: `💡 <b>Trading Level Institusi di Genggamanmu.</b>

Kemarin kita bahas kenapa trader ritel sering kalah.
Jawabannya: <b>Informasi yang Tidak Seimbang.</b>

Memperkenalkan: <b>ARRA7 - AI Trading Intelligence</b> 🔮

Bukan sekadar sinyal. Ini adalah ekosistem trading lengkap yang menggabungkan:
1️⃣ <b>Deep Learning AI (70B Model):</b> Menganalisa sentimen & teknikal secara realtime.
2️⃣ <b>Institutional Data:</b> Order Flow, Liquidity Zones, & Market Profile.
3️⃣ <b>Smart Risk Management:</b> Menghitung Entry/SL/TP yang optimal.

Kami tidak menjanjikan "Cepat Kaya".
Tapi kami menjanjikan <b>Edge (Keunggulan)</b> yang adil melawan pasar.

Siap lihat buktinya? Stay tuned untuk Part 3.
#ARRA7 #AITrading #Fintech #InvestasiCerdas #ARRA7Series`,

    // Part 3: The Proof / Features
    series_part3: `🔥 <b>Fitur yang Bikin Bandar Ketar-ketir?</b>

Di ARRA7, kami membuka "Kartu" para Big Player.
Apa saja senjata rahasiamu nanti?

🗺️ <b>HEATMAP & WHALE TRACKING</b>
Lihat tumpukan limit order (tembok support/resistance asli) secara visual. Jangan mau lagi dijebak fake breakout!

🧠 <b>AI PREDICTION ENGINE</b>
"Bullish 85%"? "Bearish 90%"?
AI kami memberikan probabilitas arah market berdasarkan data historis dan order flow terkini.

📉 <b>AUTOMATED ZONES</b>
Supply & Demand, Order Blocks, Liquidity Voids...
Semua digambar OTOMATIS di chart Anda. Tidak perlu garis-garis manual lagi.

Ribuan trader sudah beralih ke cara cerdas ini.
Kapan giliranmu?

Part 4 (Terakhir): Penawaran Spesial untukmu. 🎁
#TradingFeatures #Heatmap #OrderFlow #ARRA7 #ARRA7Series`,

    // Part 4: The Offer / CTA
    series_part4: `💎 <b>PENAWARAN TERBATAS: Upgrade Skill Tradingmu!</b>

Kamu sudah paham masalahnya. Kamu sudah lihat solusinya.
Sekarang saatnya mengambil tindakan. 🚀

Khusus untuk Subscriber channel ini, dapatkan akses <b>ARRA7 PRO</b> dengan harga promo!

✅ <b>Akses Full AI Analysis</b>
✅ <b>Akses Heatmap & Order Flow</b>
✅ <b>Unlimited Saham & Forex Pairs</b>

💰 <b>Hanya Rp 99.000 / Bulan!</b>
(Harga normal Rp 149.000)

Atau ambil <b>VVIP (Rp 249.000)</b> untuk fitur prioritas & support khusus.

👉 <b>Klaim Promo Sekarang:</b>
https://arra7-app.vercel.app/pricing

Jangan biarkan tradingmu "buta" lagi.
Join the Smart Money. Join ARRA7.

#ARRA7 #PromoTrading #Investasi #SahamIndonesia #ForexSignal`,
};

// Template metadata for admin display
export const TEMPLATE_METADATA: Record<string, { name: string; emoji: string; description: string }> = {
    arra7: { name: 'ARRA7', emoji: '🔮', description: 'AI Trading Analysis - Forex, Crypto, Saham' },
    saham: { name: 'Saham Indonesia', emoji: '📈', description: 'Analisa Saham IDX dengan AI Institusional' },
    bookmap_ai: { name: 'Bookmap X AI', emoji: '🚀', description: 'Promo fitur Heatmap & AI' },

    // Content Series
    series_part1: { name: 'Part 1: The Awakening', emoji: '⚠️', description: 'Why Traders Fail (Teaser)' },
    series_part2: { name: 'Part 2: The Solution', emoji: '💡', description: 'Introducing ARRA7 (Institutional Edge)' },
    series_part3: { name: 'Part 3: The Proof', emoji: '🔥', description: 'Features & Social Proof' },
    series_part4: { name: 'Part 4: The Offer', emoji: '💎', description: 'Special Offer (CTA)' },
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

export async function broadcastSignalToSubscribers(message: string): Promise<{ sent: number; failed: number }> {
    try {
        const { getActiveSubscribers } = await import('./turso');
        const subscribers = await getActiveSubscribers();

        console.log(`[BROADCAST] Found ${subscribers.length} active subscribers.`);

        let sent = 0;
        let failed = 0;

        // Process in chunks to avoid rate limits if list is huge (simple loop for now)
        for (const chatId of subscribers) {
            const result = await sendTelegramMessage(message, 'HTML', chatId);
            if (result.success) {
                sent++;
            } else {
                failed++;
                console.error(`[BROADCAST] Failed to send to ${chatId}: ${result.error}`);
            }
        }

        console.log(`[BROADCAST] Completed. Sent: ${sent}, Failed: ${failed}`);
        return { sent, failed };
    } catch (error) {
        console.error('[BROADCAST] Critical error:', error);
        return { sent: 0, failed: 0 };
    }
}

