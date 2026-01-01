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
    // 1. ARRA7 - AI Trading Analysis
    arra7: `🔮 <b>ARRA7 - AI Trading Analysis</b>

Trade with Precision & Confidence!

🤖 <b>Analisa Trading dengan AI Level Institusional:</b>
✅ Forex (XAUUSD, EUR/USD, GBP/USD, dll)
✅ Crypto (BTC, ETH, SOL, dll)  
✅ Saham Indonesia (BBCA, BBRI, TLKM, dll)

⚡ <b>Fitur Premium:</b>
• SMC/ICT Analysis (Order Block, FVG, BOS)
• Fibonacci Retracement & Extension
• Entry, Stop Loss, Take Profit otomatis
• Risk:Reward Ratio terhitung

📊 <b>5 Teknik Analisa Sekaligus:</b>
1️⃣ Smart Money Concepts
2️⃣ Price Action
3️⃣ Candlestick Patterns
4️⃣ Fibonacci Analysis
5️⃣ Trend Analysis

💰 <b>Harga:</b>
• GRATIS - 2x analisa/hari
• PRO - <b>Rp 99.000/bulan</b> (25x analisa/hari)
• VVIP - <b>Rp 399.000/bulan</b> (UNLIMITED!)

🔗 <b>Coba Sekarang:</b>
👉 https://arra7-app.vercel.app

📱 Download Android App:
👉 https://arra7-app.vercel.app/download/android

#ARRA7 #AITrading #Forex #Crypto #SahamIndonesia #TradingAI`,

    // 2. CRYPTOLOGIC - Financial Astrology Crypto Analytics
    cryptologic: `🌟 <b>CRYPTOLOGIC - Sinyal Surgawi, Profit Kosmis!</b>

Analitik Crypto Level Glassnode + Financial Astrology!

🔮 <b>Fitur Unik yang Tidak Ada di Tempat Lain:</b>

⭐ <b>Data Ephemeris NASA JPL Real</b>
→ Posisi planet akurat dari NASA, bukan simulasi!

📊 <b>15,000+ Kripto Tersedia</b>
→ Analisis lengkap untuk semua koin di market

🎯 <b>Cosmic Score™ Analysis</b>
→ Algoritma eksklusif gabungan astrologi + data on-chain

📋 <b>Watchlist Pribadi</b>
→ Lacak koin favorit & dapat notifikasi peluang

⏰ <b>Update Real-Time</b>
→ Data harga langsung, jangan lewatkan momen!

📈 <b>Analisis Historis</b>
→ Lihat korelasi sinyal planet dengan harga masa lalu

━━━━━━━━━━━━━━━━━━━━━

💰 <b>HARGA SPESIAL:</b>
Nilai <s>$1,999/bulan</s> — <b>Hemat 99%!</b>

🆓 <b>Coba GRATIS sekarang!</b>
👉 https://cryptologic-weld.vercel.app

#Cryptologic #CryptoAnalysis #FinancialAstrology #Bitcoin #Trading #Crypto`,
};

// Template metadata for admin display
export const TEMPLATE_METADATA: Record<string, { name: string; emoji: string; description: string }> = {
    arra7: { name: 'ARRA7', emoji: '🔮', description: 'AI Trading Analysis - Forex, Crypto, Saham' },
    cryptologic: { name: 'Cryptologic', emoji: '🌟', description: 'Financial Astrology Crypto Analytics' },
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

