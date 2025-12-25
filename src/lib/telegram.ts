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

// Pre-defined marketing message templates
export const MARKETING_TEMPLATES = {
    christmasPromo: `🎅🎄❄️ <b>MERRY CHRISTMAS!</b> ❄️🎄🎅

🚨 <b>PROMO NATAL TERBATAS!</b> 🚨

Analisa Trading dengan AI ARRA7 sekarang cuma <b>Rp 99K</b> saja! (Hemat 200K!)

╔══════════════════════════════════════╗
║    🎁 <b>PAKET PRO - SPESIAL NATAL</b> 🎁    ║
╠══════════════════════════════════════╣
║  <s>Rp 299.000</s>                       ║
║  ✅ <b>Rp 99.000 ONLY!</b>                  ║
║                                      ║
║  💰 <b>HEMAT 200 RIBU!</b> 💰               ║
╚══════════════════════════════════════╝

✨ <b>APA YANG KAMU DAPAT?</b>

✅ 25x Analisa Forex per hari
✅ 25x Analisa Saham IDX per hari  
✅ Semua Timeframe (M1 - Monthly)
✅ Akses Semua Pairs + Crypto + Gold
✅ Economic Calendar

🤖 AI kami akan kasih kamu:
📍 Entry Point yang tepat
🎯 Take Profit 1, 2, 3
🛡️ Stop Loss yang aman
📊 Risk:Reward Ratio

⏰ <b>PROMO BERAKHIR:</b>
📅 26 Desember 2025
🕐 Pukul 23:59 WIB

⚠️ <b>HANYA 1 HARI LAGI!</b> ⚠️

🔗 <b>AMBIL PROMO SEKARANG:</b>
👉 https://arra7-app.vercel.app/pricing

Jangan sampai kelewatan! Harga normal Rp 299K kembali setelah promo habis!

🎄 Selamat Natal & Happy Trading! 🎄

#ARRA7 #ForexTrading #SahamIndonesia #PromoNatal #TradingAI`,

    welcomeMessage: `👋 <b>Selamat Datang di ARRA7!</b>

🤖 AI Trading Assistant yang membantu Anda menganalisa:
📈 Forex (Gold, EUR/USD, GBP/USD, dll)
📊 Saham Indonesia (IDX)

✨ <b>Fitur Unggulan:</b>
• SMC/ICT Concepts Analysis
• Price Action & Chart Patterns
• Candlestick Pattern Recognition
• Fibonacci Analysis
• Risk Management Calculator

🆓 Coba GRATIS sekarang!
👉 https://arra7-app.vercel.app

#ARRA7 #ForexTrading #SahamIDX`,

    dailyMotivation: `☀️ <b>Good Morning, Traders!</b>

📊 Market sudah buka!

Jangan lupa:
✅ Check your analysis
✅ Set your risk properly
✅ Stick to your plan

🎯 "The goal of a successful trader is to make the best trades. Money is secondary."

💪 Happy Trading!

#ARRA7 #TradingTips`,

    newUserJoined: (userName: string) => `🎉 <b>Welcome New Member!</b>

Selamat datang <b>${userName}</b> di komunitas ARRA7! 👋

Semoga trading-mu makin profit! 📈

#ARRA7 #NewMember`,
};

export function isTelegramConfigured(): boolean {
    return !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHANNEL_ID);
}
